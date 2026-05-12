"use client";

import { useEffect, useRef } from "react";
import { Renderer, Camera, Plane, Program, Mesh, Texture } from "ogl";

type Props = {
  getActiveRect: () => DOMRect | null;
  getImageSrc: () => string | null;
  preloadSrcs?: string[];
};

const VERT = /* glsl */ `
  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform vec2  uMouse;
  uniform float uStrength;
  uniform float uTime;
  uniform float uAspect;

  varying vec2  vUv;
  varying float vDisp;

  void main() {
    vUv = uv;
    vec3 p = position;

    vec2 vp = vec2(p.x * uAspect, p.y);
    vec2 mp = vec2(uMouse.x * uAspect, uMouse.y);
    float d = length(mp - vp);

    float falloff = exp(-d * 3.4);

    vec2 pull = (uMouse - p.xy) * falloff * uStrength * 0.22;
    p.xy += pull;

    float pop = falloff * uStrength * 0.10;
    p.z += pop;

    float breathe = sin(uTime * 1.1 + p.x * 3.0 + p.y * 2.2) * 0.0025;
    p.z += breathe;

    vDisp = falloff * uStrength;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform float     uStrength;
  uniform vec4      uUvTransform;
  varying vec2      vUv;
  varying float     vDisp;

  vec2 mapUv(vec2 uv) {
    return uv * uUvTransform.xy + uUvTransform.zw;
  }

  void main() {
    vec2 centered = vUv - 0.5;
    float aberration = 0.004 * uStrength + 0.010 * vDisp;
    vec2 off = centered * aberration;

    float r = texture2D(tMap, mapUv(vUv + off)).r;
    float g = texture2D(tMap, mapUv(vUv)).g;
    float b = texture2D(tMap, mapUv(vUv - off)).b;

    float lift = vDisp * 0.06;
    vec3 color = vec3(r, g, b) + lift;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function MagneticWarpLayer({
  getActiveRect,
  getImageSrc,
  preloadSrcs,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const getActiveRectRef = useRef(getActiveRect);
  const getImageSrcRef = useRef(getImageSrc);
  const preloadSrcsRef = useRef(preloadSrcs);

  useEffect(() => {
    getActiveRectRef.current = getActiveRect;
  }, [getActiveRect]);

  useEffect(() => {
    getImageSrcRef.current = getImageSrc;
  }, [getImageSrc]);

  useEffect(() => {
    preloadSrcsRef.current = preloadSrcs;
  }, [preloadSrcs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new Renderer({
      canvas,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      alpha: true,
      premultipliedAlpha: false,
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, {
      left: -0.5,
      right: 0.5,
      top: 0.5,
      bottom: -0.5,
      near: 0.1,
      far: 10,
    });
    camera.position.z = 1;

    const geometry = new Plane(gl, {
      width: 1,
      height: 1,
      widthSegments: 64,
      heightSegments: 64,
    });

    const texture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        tMap: { value: texture },
        uMouse: { value: [0, 0] },
        uStrength: { value: 0 },
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uUvTransform: { value: [1, 1, 0, 0] },
      },
      transparent: true,
    });

    const mesh = new Mesh(gl, { geometry, program });

    const imageCache = new Map<string, HTMLImageElement>();
    const pending = new Set<string>();
    let currentSrc: string | null = null;
    let imageAspect = 1;
    let textureReady = false;

    const fetchImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        if (imageCache.has(src)) {
          resolve(imageCache.get(src)!);
          return;
        }
        if (pending.has(src)) {
          const poll = setInterval(() => {
            if (imageCache.has(src)) {
              clearInterval(poll);
              resolve(imageCache.get(src)!);
            }
          }, 60);
          return;
        }
        pending.add(src);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imageCache.set(src, img);
          pending.delete(src);
          resolve(img);
        };
        img.onerror = () => {
          pending.delete(src);
          reject(new Error("image load failed"));
        };
        img.src = src;
      });

    preloadSrcsRef.current?.forEach((s) => {
      fetchImage(s).catch(() => {});
    });

    const useImage = (src: string) => {
      if (src === currentSrc) return;
      currentSrc = src;
      const cached = imageCache.get(src);
      if (cached) {
        imageAspect = cached.naturalWidth / cached.naturalHeight;
        texture.image = cached;
        texture.needsUpdate = true;
        textureReady = true;
      } else {
        textureReady = false;
        fetchImage(src).then((img) => {
          if (currentSrc !== src) return;
          imageAspect = img.naturalWidth / img.naturalHeight;
          texture.image = img;
          texture.needsUpdate = true;
          textureReady = true;
        });
      }
    };

    const updateUvTransform = (cardAspect: number) => {
      const ratio = imageAspect / cardAspect;
      let sx: number, sy: number, ox: number, oy: number;
      if (ratio > 1) {
        sx = 1 / ratio;
        sy = 1;
        ox = (1 - sx) * 0.5;
        oy = 0;
      } else {
        sx = 1;
        sy = ratio;
        ox = 0;
        oy = (1 - sy) * 0.5;
      }
      program.uniforms.uUvTransform.value = [sx, sy, ox, oy];
    };

    const mouseTarget: [number, number] = [0, 0];
    const mouseCurrent: [number, number] = [0, 0];
    let strengthTarget = 0;
    let strengthCurrent = 0;
    let activeRect: DOMRect | null = null;

    const onPointerMove = (e: PointerEvent) => {
      if (!activeRect) {
        strengthTarget = 0;
        return;
      }
      const x = e.clientX - activeRect.left;
      const y = e.clientY - activeRect.top;
      const PADDING = 80;
      const inside =
        x >= -PADDING &&
        y >= -PADDING &&
        x <= activeRect.width + PADDING &&
        y <= activeRect.height + PADDING;
      if (inside) {
        mouseTarget[0] = x / activeRect.width - 0.5;
        mouseTarget[1] = -(y / activeRect.height - 0.5);
        strengthTarget = 1;
      } else {
        strengthTarget = 0;
      }
    };

    const onPointerLeave = () => {
      strengthTarget = 0;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    let rafId = 0;
    const tick = (t: number) => {
      activeRect = getActiveRectRef.current();
      const src = getImageSrcRef.current();
      if (src) useImage(src);
      const visible = !!(activeRect && src && textureReady);

      canvas.style.opacity = visible ? "1" : "0";

      if (visible && activeRect) {
        canvas.style.left = `${activeRect.left}px`;
        canvas.style.top = `${activeRect.top}px`;
        canvas.style.width = `${activeRect.width}px`;
        canvas.style.height = `${activeRect.height}px`;
        renderer.setSize(activeRect.width, activeRect.height);

        mouseCurrent[0] += (mouseTarget[0] - mouseCurrent[0]) * 0.11;
        mouseCurrent[1] += (mouseTarget[1] - mouseCurrent[1]) * 0.11;
        strengthCurrent += (strengthTarget - strengthCurrent) * 0.07;

        const aspect = activeRect.width / activeRect.height;
        program.uniforms.uMouse.value = mouseCurrent;
        program.uniforms.uStrength.value = strengthCurrent;
        program.uniforms.uTime.value = t / 1000;
        program.uniforms.uAspect.value = aspect;
        updateUvTransform(aspect);

        renderer.render({ scene: mesh, camera });
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed pointer-events-none"
      style={{
        zIndex: 5,
        opacity: 0,
        transition: "opacity 0.18s ease",
      }}
    />
  );
}
