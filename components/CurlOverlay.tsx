"use client";

import { useEffect, useRef } from "react";
import { Renderer, Camera, Plane, Program, Mesh, Texture } from "ogl";

type Props = {
  getActiveRect: () => DOMRect | null;
  getImageSrc: () => string | null;
  preloadSrcs?: string[];
};

const VERT = /* glsl */ `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uCurlTop;
uniform float uCurlBottom;

varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 p = position;

  float rTop = 1.5 - 1.45 * clamp(uCurlTop, 0.0, 1.0);
  float rBot = 1.5 - 1.45 * clamp(uCurlBottom, 0.0, 1.0);

  float topMask = step(0.0, p.y);
  float botMask = 1.0 - topMask;

  float sTop = p.y;
  float sBot = -p.y;
  float aTop = sTop / rTop;
  float aBot = sBot / rBot;

  float yTop = rTop * sin(aTop);
  float zTop = rTop * (1.0 - cos(aTop));
  float yBot = -rBot * sin(aBot);
  float zBot = -rBot * (1.0 - cos(aBot));

  float useTop = topMask * step(0.0005, uCurlTop);
  float useBot = botMask * step(0.0005, uCurlBottom);
  float keep = 1.0 - useTop - useBot;

  vec3 transformed = vec3(
    p.x,
    useTop * yTop + useBot * yBot + keep * p.y,
    useTop * zTop + useBot * zBot
  );

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;

uniform sampler2D tMap;
uniform vec4 uUvTransform;

varying vec2 vUv;

void main() {
  vec2 mapped = vUv * uUvTransform.xy + uUvTransform.zw;
  gl_FragColor = texture2D(tMap, mapped);
}
`;

export default function CurlOverlay({
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

    const CAM_FOV = 30;
    const CAM_Z = 1 / (2 * Math.tan((CAM_FOV * Math.PI) / 360));
    const camera = new Camera(gl, {
      fov: CAM_FOV,
      near: 0.01,
      far: 10,
      aspect: 1,
    });
    camera.position.z = CAM_Z;

    const geometry = new Plane(gl, {
      width: 1,
      height: 1,
      widthSegments: 50,
      heightSegments: 50,
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
        uCurlTop: { value: 0 },
        uCurlBottom: { value: 0 },
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

    const resolveSrc = (src: string) =>
      src.startsWith("/") || src.startsWith("data:")
        ? src
        : `/_next/image?url=${encodeURIComponent(src)}&w=1920&q=75`;

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
        img.decoding = "async";
        img.onload = () => {
          imageCache.set(src, img);
          pending.delete(src);
          resolve(img);
        };
        img.onerror = () => {
          pending.delete(src);
          reject(new Error("image load failed"));
        };
        img.src = resolveSrc(src);
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

    let curlTopTarget = 0;
    let curlBotTarget = 0;
    let curlTopCurrent = 0;
    let curlBotCurrent = 0;
    let activeRect: DOMRect | null = null;

    const onPointerMove = (e: PointerEvent) => {
      if (!activeRect) {
        curlTopTarget = 0;
        curlBotTarget = 0;
        return;
      }
      const x = e.clientX - activeRect.left;
      const y = e.clientY - activeRect.top;
      const inside =
        x >= 0 && y >= 0 && x <= activeRect.width && y <= activeRect.height;
      if (!inside) {
        curlTopTarget = 0;
        curlBotTarget = 0;
        return;
      }
      const yNorm = y / activeRect.height;
      const distFromCenter = Math.abs(yNorm - 0.5) * 2;
      const maxCurl = 0.6;
      if (yNorm < 0.5) {
        curlTopTarget = distFromCenter * maxCurl;
        curlBotTarget = 0;
      } else {
        curlTopTarget = 0;
        curlBotTarget = distFromCenter * maxCurl;
      }
    };
    const onPointerLeaveWindow = () => {
      curlTopTarget = 0;
      curlBotTarget = 0;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeaveWindow);

    let rafId = 0;
    const tick = () => {
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

        curlTopCurrent += (curlTopTarget - curlTopCurrent) * 0.08;
        curlBotCurrent += (curlBotTarget - curlBotCurrent) * 0.08;

        const aspect = activeRect.width / activeRect.height;
        camera.perspective({ aspect });
        mesh.scale.x = aspect;

        program.uniforms.uCurlTop.value = curlTopCurrent;
        program.uniforms.uCurlBottom.value = curlBotCurrent;
        updateUvTransform(aspect);

        try {
          renderer.render({ scene: mesh, camera });
        } catch (err) {
          console.error("CurlOverlay render error", err);
        }
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeaveWindow);
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
        background: "transparent",
        transition: "opacity 0.2s ease",
      }}
    />
  );
}
