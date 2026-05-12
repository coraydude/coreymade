"use client";

import { useEffect, useRef } from "react";
import { Renderer, Camera, Plane, Program, Mesh, Texture } from "ogl";

type Props = {
  src: string;
};

const VERT = /* glsl */ `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uImageCurl;

varying vec2 vUv;

vec2 curlPlane(float s, float r) {
  float angle = s / r;
  return vec2(r * sin(angle), r * (1.0 - cos(angle)));
}

void main() {
  vUv = uv;
  vec3 p = position;

  float curlTop = clamp(uImageCurl.x, 0.0, 1.0);
  float curlBot = clamp(uImageCurl.y, 0.0, 1.0);

  float rTop = max(5.0 - 5.0 * curlTop, 0.001);
  float rBot = max(5.0 - 5.0 * curlBot, 0.001);

  vec2 topCurled = curlPlane(p.y, rTop);
  vec2 botCurled = curlPlane(-p.y, rBot);

  float topMask = step(0.0, p.y);
  float botMask = 1.0 - topMask;

  float yFinal = topMask * topCurled.x + botMask * (-botCurled.x);
  float zFinal = topMask * topCurled.y + botMask * (-botCurled.y);

  vec3 transformed = vec3(p.x, yFinal, zFinal);
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

const resolveSrc = (src: string) =>
  src.startsWith("/") || src.startsWith("data:")
    ? src
    : `/_next/image?url=${encodeURIComponent(src)}&w=1920&q=75`;

export default function CurlCard({ src }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

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
        uImageCurl: { value: [0, 0] },
        uUvTransform: { value: [1, 1, 0, 0] },
      },
      transparent: true,
    });

    const mesh = new Mesh(gl, { geometry, program });

    let imageAspect = 1;
    let textureReady = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      imageAspect = img.naturalWidth / img.naturalHeight;
      texture.image = img;
      texture.needsUpdate = true;
      textureReady = true;
      if (container) container.dataset.curlState = "ready";
    };
    img.onerror = () => {
      console.error("CurlCard image failed", src);
      if (container) container.dataset.curlState = "image-error";
    };
    img.src = resolveSrc(src);

    if (program.uniformLocations) {
      if (container) container.dataset.curlShader = "ok";
    } else {
      console.error("CurlCard shader failed to link for", src);
      if (container) container.dataset.curlShader = "fail";
    }

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

    let curlTopCurrent = 0;
    let curlBotCurrent = 0;
    let lastW = 0;
    let lastH = 0;

    const CANVAS_OVERSIZE = 1.3;
    const MESH_FILL = 1 / CANVAS_OVERSIZE;

    const readCurl = () => {
      const cs = getComputedStyle(container);
      const topVal = parseFloat(cs.getPropertyValue("--curl-top")) || 0;
      const botVal = parseFloat(cs.getPropertyValue("--curl-bot")) || 0;
      return [topVal, botVal] as const;
    };

    let rafId = 0;
    const tick = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      if (w > 0 && h > 0 && (w !== lastW || h !== lastH)) {
        renderer.setSize(w * CANVAS_OVERSIZE, h * CANVAS_OVERSIZE);
        lastW = w;
        lastH = h;
      }

      if (w > 0 && h > 0 && textureReady) {
        const aspect = w / h;
        camera.perspective({ aspect });
        mesh.scale.x = aspect * MESH_FILL;
        mesh.scale.y = MESH_FILL;
        updateUvTransform(aspect);

        const [curlTopTarget, curlBotTarget] = readCurl();

        const smoothing = 0.06;
        curlTopCurrent += (curlTopTarget - curlTopCurrent) * smoothing;
        curlBotCurrent += (curlBotTarget - curlBotCurrent) * smoothing;

        program.uniforms.uImageCurl.value = [curlTopCurrent, curlBotCurrent];

        try {
          renderer.render({ scene: mesh, camera });
        } catch {
          /* swallow */
        }
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute pointer-events-none"
        style={{
          top: "-15%",
          left: "-15%",
          width: "130%",
          height: "130%",
          background: "transparent",
        }}
      />
    </div>
  );
}
