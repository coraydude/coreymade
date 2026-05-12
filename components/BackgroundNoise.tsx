"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Fullscreen WebGL pass that renders a low-amplitude noise field and warps
// the noise UV around the cursor with a gaussian falloff. Reads as heat
// shimmer / a soft rip in the surface that follows your mouse. Sits at z-6
// with `mix-blend-mode: overlay` so it tints whatever is underneath (body
// bg + carousel cards) without obscuring text on top.

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec2  uResolution;
  uniform vec2  uMouse;       // normalized 0..1, y=0 at bottom
  uniform float uTime;
  uniform float uIntensity;   // global multiplier (0..1)
  varying vec2  vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),                 hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec2 uv = vUv;

    // Aspect-corrected distance from cursor — keeps the falloff circular
    // regardless of viewport aspect ratio.
    float aspect = uResolution.x / max(uResolution.y, 0.0001);
    vec2 duv = uv - uMouse;
    duv.x *= aspect;
    float d = length(duv);
    float g = exp(-d * d * 6.0);  // wider gaussian — cursor influence reaches further

    // Radial warp: push noise UVs outward from cursor as the focus rises.
    vec2 dir = duv / max(length(duv), 1e-5);
    vec2 warpedUV = uv + dir * g * 0.05;

    // Two octaves of slowly drifting value noise — lower frequency so the
    // shapes read at a glance.
    float n  = vnoise(warpedUV *  3.5 + uTime * 0.04);
    n += vnoise(warpedUV *  9.0 - uTime * 0.06) * 0.5;
    n /= 1.5;

    // Final grayscale value — centered around 0.5 so overlay blend stays
    // additive/multiplicative. Amplitudes cranked: ambient noise reaches
    // ±0.15 around 0.5, cursor halo lifts brightness by up to 0.35.
    float v = 0.5 + (n - 0.5) * 0.30 * uIntensity + g * 0.35 * uIntensity;

    gl_FragColor = vec4(v, v, v, 1.0);
  }
`;

export default function BackgroundNoise() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = hostRef.current;
    if (!host) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    // Mobile / touch: keep the noise but disable cursor focus (gaussian
    // centered at 0.5 looks weird without a moving cursor).
    const cursorFollows = fine;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);

    const canvas = renderer.domElement;
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.display = "block";
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0 },
        uIntensity: { value: 1 },
      },
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      renderer.setSize(w, h, false);
      (material.uniforms.uResolution.value as THREE.Vector2).set(w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    const target = { x: 0.5, y: 0.5 };
    const current = { x: 0.5, y: 0.5 };

    const onMove = (e: PointerEvent) => {
      if (!cursorFollows) return;
      target.x = e.clientX / w;
      target.y = 1.0 - e.clientY / h;
    };
    window.addEventListener("pointermove", onMove);

    // Pause rendering when the tab is hidden — saves CPU/GPU.
    let visible = true;
    const onVis = () => {
      visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVis);

    let raf = 0;
    const tick = (now: number) => {
      if (visible) {
        current.x += (target.x - current.x) * 0.08;
        current.y += (target.y - current.y) * 0.08;
        (material.uniforms.uMouse.value as THREE.Vector2).set(
          current.x,
          current.y
        );
        material.uniforms.uTime.value = now * 0.001;
        renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      try {
        host.removeChild(canvas);
      } catch {}
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1, mixBlendMode: "overlay" }}
    />
  );
}
