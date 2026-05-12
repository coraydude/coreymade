"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Renderer,
  Camera,
  Plane,
  Program,
  Mesh,
  Texture,
  Transform,
} from "ogl";
import gsap from "gsap";
import { useTitle } from "./TitleProvider";
import { PROJECTS } from "@/lib/projects";

const COPIES = 2;
const NUM_CARDS = COPIES * PROJECTS.length;

declare global {
  interface Window {
    __circleState?: {
      offset: number;
      activeSlug?: string;
    };
  }
}

function resolveIntendedSlug(): string | null {
  if (typeof window === "undefined") return null;
  if (window.__returnSlug) return window.__returnSlug;
  if (window.__circleState?.activeSlug) return window.__circleState.activeSlug;
  return null;
}

function getInitialActiveIdx(): number {
  const slug = resolveIntendedSlug();
  if (!slug) return 0;
  const idx = PROJECTS.findIndex((p) => p.slug === slug);
  return idx >= 0 ? idx : 0;
}

const resolveSrc = (src: string) =>
  src.startsWith("/") || src.startsWith("data:")
    ? src
    : `/_next/image?url=${encodeURIComponent(src)}&w=1920&q=75`;

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
uniform float uOpacity;

varying vec2 vUv;

void main() {
  vec2 mapped = vUv * uUvTransform.xy + uUvTransform.zw;
  vec4 c = texture2D(tMap, mapped);
  gl_FragColor = vec4(c.rgb, c.a * uOpacity);
}
`;

export default function CircleCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveCounterRef = useRef<HTMLSpanElement>(null);
  const [activeIdx, setActiveIdx] = useState(getInitialActiveIdx);
  const activeIdxRef = useRef(activeIdx);
  const { setActiveProjectSlug } = useTitle();
  const router = useRouter();

  useEffect(() => {
    activeIdxRef.current = activeIdx;
    setActiveProjectSlug(PROJECTS[activeIdx]?.slug ?? null);
  }, [activeIdx, setActiveProjectSlug]);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const renderer = new Renderer({
      canvas,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      alpha: true,
      premultipliedAlpha: false,
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, {
      fov: 45,
      near: 1,
      far: 10000,
    });

    const scene = new Transform();
    const geometry = new Plane(gl, {
      width: 1,
      height: 1,
      widthSegments: 50,
      heightSegments: 50,
    });

    const imageAspects = new Array<number>(PROJECTS.length).fill(1);
    const textures = PROJECTS.map((p, i) => {
      const tex = new Texture(gl, {
        generateMipmaps: false,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
      });
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        imageAspects[i] = img.naturalWidth / img.naturalHeight;
        tex.image = img;
        tex.needsUpdate = true;
      };
      img.src = resolveSrc(p.image);
      return tex;
    });

    type CardState = {
      mesh: Mesh;
      program: Program;
      projectIdx: number;
      curlTop: number;
      curlBot: number;
      screenX: number;
      screenY: number;
      screenW: number;
      screenH: number;
      visible: boolean;
    };

    const cards: CardState[] = [];
    for (let i = 0; i < NUM_CARDS; i++) {
      const projectIdx = i % PROJECTS.length;
      const program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          tMap: { value: textures[projectIdx] },
          uImageCurl: { value: [0, 0] },
          uUvTransform: { value: [1, 1, 0, 0] },
          uOpacity: { value: 1 },
        },
        transparent: true,
      });
      const mesh = new Mesh(gl, { geometry, program });
      mesh.setParent(scene);
      cards.push({
        mesh,
        program,
        projectIdx,
        curlTop: 0,
        curlBot: 0,
        screenX: 0,
        screenY: 0,
        screenW: 0,
        screenH: 0,
        visible: true,
      });
    }

    let vw = 0;
    let vh = 0;
    let cardW = 0;
    let cardH = 0;
    let cx = 0;
    let cy = 0;
    let radius = 0;
    let camZ = 0;
    const angleStep = (2 * Math.PI) / NUM_CARDS;
    const baseAngle = -Math.PI / 2;

    const resize = () => {
      vw = section.clientWidth;
      vh = section.clientHeight;
      renderer.setSize(vw, vh);

      cardH = Math.min(vh * 0.42, vw * 0.22);
      cardW = cardH * 1.5;

      cx = vw / 2;
      cy = vh * 2.0;
      radius = cy - vh * 0.5;

      camZ = vh / (2 * Math.tan((45 * Math.PI) / 360));
      camera.perspective({ aspect: vw / vh });
      camera.position.set(0, 0, camZ);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(section);

    let offset = 0;
    let targetOffset = 0;
    let velocity = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartOffset = 0;
    let dragLastX = 0;
    let dragLastTime = 0;
    let dragVelocity = 0;
    let pointerCaptured = false;
    let suppressClickUntil = 0;
    const DRAG_THRESHOLD = 5;

    const saved = window.__circleState;
    if (saved) {
      offset = saved.offset;
      targetOffset = saved.offset;
      delete window.__circleState;
    }
    const returnSlug = window.__returnSlug;
    if (returnSlug) {
      delete window.__returnSlug;
      const projectIdx = PROJECTS.findIndex((p) => p.slug === returnSlug);
      if (projectIdx >= 0 && !saved) {
        offset = -projectIdx * angleStep;
        targetOffset = offset;
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartOffset = targetOffset;
      dragLastX = e.clientX;
      dragLastTime = performance.now();
      dragVelocity = 0;
      pointerCaptured = false;
      velocity = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dxp = e.clientX - dragStartX;
      const dyp = e.clientY - dragStartY;
      const distMoved = Math.sqrt(dxp * dxp + dyp * dyp);

      if (!pointerCaptured && distMoved > DRAG_THRESHOLD) {
        try {
          section.setPointerCapture(e.pointerId);
          pointerCaptured = true;
        } catch {}
      }

      if (pointerCaptured) {
        const r = Math.max(radius, 100);
        targetOffset = dragStartOffset - dxp / r;

        const now = performance.now();
        const dt = Math.max((now - dragLastTime) / 1000, 0.001);
        const dx = e.clientX - dragLastX;
        dragVelocity = -dx / r / dt;
        dragLastX = e.clientX;
        dragLastTime = now;
      }
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      const moved = Math.abs(targetOffset - dragStartOffset);
      if (moved > 0.01) {
        suppressClickUntil = performance.now() + 250;
        velocity = dragVelocity;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerCaptured) {
        try {
          section.releasePointerCapture(e.pointerId);
        } catch {}
        pointerCaptured = false;
      }
      endDrag();
    };

    const onPointerLeave = () => {
      if (isDragging) endDrag();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      targetOffset += delta / Math.max(radius, 100);
      velocity = 0;
    };

    const navigateToActive = () => {
      if (performance.now() < suppressClickUntil) return;
      const idx = activeIdxRef.current;
      const slug = PROJECTS[idx]?.slug;
      if (!slug) return;
      gsap.to(canvas, {
        opacity: 0,
        y: 30,
        duration: 0.45,
        ease: "power2.in",
        onComplete: () => router.push(`/work/${slug}`),
      });
    };

    const onClick = (e: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const r = section.getBoundingClientRect();
      const cxClick = e.clientX - r.left;
      const cyClick = e.clientY - r.top;
      let hit = -1;
      let hitDist = Infinity;
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        if (!c.visible) continue;
        const dx = cxClick - c.screenX;
        const dy = cyClick - c.screenY;
        if (
          Math.abs(dx) < c.screenW / 2 &&
          Math.abs(dy) < c.screenH / 2
        ) {
          const d = dx * dx + dy * dy;
          if (d < hitDist) {
            hitDist = d;
            hit = i;
          }
        }
      }
      if (hit < 0) return;
      const projectIdx = hit % PROJECTS.length;
      if (projectIdx === activeIdxRef.current) {
        navigateToActive();
      } else {
        const targetCardAngle = baseAngle + hit * angleStep;
        const desiredOffset = -hit * angleStep;
        targetOffset = desiredOffset;
        void targetCardAngle;
      }
    };

    section.addEventListener("wheel", onWheel, { passive: false });
    section.addEventListener("pointerdown", onPointerDown);
    section.addEventListener("pointermove", onPointerMove);
    section.addEventListener("pointerup", onPointerUp);
    section.addEventListener("pointercancel", onPointerUp);
    section.addEventListener("pointerleave", onPointerLeave);
    section.addEventListener("click", onClick);

    let rafId = 0;
    let lastTime = 0;
    let lastBestProjectIdx = -1;
    let debounceTimer: number | null = null;

    const tick = (t: number) => {
      const dt = lastTime > 0 ? Math.min((t - lastTime) / 1000, 0.1) : 1 / 60;
      lastTime = t;

      if (!isDragging) {
        targetOffset += velocity * dt;
        velocity *= Math.exp(-2.5 * dt);
        if (Math.abs(velocity) < 0.0005) velocity = 0;

        if (Math.abs(velocity) < 0.05) {
          const snap = Math.round(targetOffset / angleStep) * angleStep;
          const snapAlpha = 1 - Math.exp(-6 * dt);
          targetOffset += (snap - targetOffset) * snapAlpha;
        }
      }

      const moveAlpha = 1 - Math.exp(-9 * dt);
      offset += (targetOffset - offset) * moveAlpha;

      let bestDist = Infinity;
      let bestProjectIdx = 0;

      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        const angle = baseAngle + i * angleStep + offset;

        let signed = (angle - baseAngle) % (2 * Math.PI);
        if (signed > Math.PI) signed -= 2 * Math.PI;
        if (signed < -Math.PI) signed += 2 * Math.PI;
        const diffFromTop = Math.abs(signed);

        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        const rotZ = angle + Math.PI / 2;

        const scaleFalloff = Math.min(diffFromTop / (Math.PI * 0.55), 1);
        const cardScale = 1 - scaleFalloff * 0.4;

        const fadeT = Math.min(diffFromTop / (Math.PI * 0.7), 1);
        const opacity = diffFromTop > Math.PI * 0.85 ? 0 : 1 - fadeT * 0.5;

        const wx = x - vw / 2;
        const wy = vh / 2 - y;
        c.mesh.position.set(wx, wy, -i);
        c.mesh.rotation.z = -rotZ;
        c.mesh.scale.set(cardW * cardScale, cardH * cardScale, cardH * cardScale);

        c.screenX = x;
        c.screenY = y;
        c.screenW = cardW * cardScale;
        c.screenH = cardH * cardScale;
        c.visible = opacity > 0.01;

        const curlRange = Math.PI / 3;
        const progress = Math.min(diffFromTop / curlRange, 1);
        const eased = progress * progress * (3 - 2 * progress);
        const maxCurl = 0.65;
        const curlTopTarget = signed > 0 ? eased * maxCurl : 0;
        const curlBotTarget = signed < 0 ? eased * maxCurl : 0;

        const curlAlpha = 1 - Math.exp(-7 * dt);
        c.curlTop += (curlTopTarget - c.curlTop) * curlAlpha;
        c.curlBot += (curlBotTarget - c.curlBot) * curlAlpha;

        c.program.uniforms.uImageCurl.value[0] = c.curlTop;
        c.program.uniforms.uImageCurl.value[1] = c.curlBot;
        c.program.uniforms.uOpacity.value = opacity;

        const cardAspect = cardW / cardH;
        const imgAspect = imageAspects[c.projectIdx];
        const ratio = imgAspect / cardAspect;
        const uv = c.program.uniforms.uUvTransform.value as number[];
        if (ratio > 1) {
          uv[0] = 1 / ratio;
          uv[1] = 1;
          uv[2] = (1 - 1 / ratio) * 0.5;
          uv[3] = 0;
        } else {
          uv[0] = 1;
          uv[1] = ratio;
          uv[2] = 0;
          uv[3] = (1 - ratio) * 0.5;
        }

        if (diffFromTop < bestDist) {
          bestDist = diffFromTop;
          bestProjectIdx = i % PROJECTS.length;
        }
      }

      if (liveCounterRef.current) {
        liveCounterRef.current.textContent = `${String(bestProjectIdx + 1).padStart(2, "0")} / ${String(PROJECTS.length).padStart(2, "0")}`;
      }

      if (bestProjectIdx !== lastBestProjectIdx) {
        lastBestProjectIdx = bestProjectIdx;
        if (debounceTimer !== null) window.clearTimeout(debounceTimer);
        const settled = bestProjectIdx;
        debounceTimer = window.setTimeout(() => {
          setActiveIdx((prev) => (prev !== settled ? settled : prev));
        }, 180);
      }

      renderer.render({ scene, camera });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      section.removeEventListener("wheel", onWheel);
      section.removeEventListener("pointerdown", onPointerDown);
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerup", onPointerUp);
      section.removeEventListener("pointercancel", onPointerUp);
      section.removeEventListener("pointerleave", onPointerLeave);
      section.removeEventListener("click", onClick);
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      window.__circleState = {
        offset,
        activeSlug: PROJECTS[activeIdxRef.current]?.slug,
      };
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [router]);

  return (
    <section
      ref={sectionRef}
      data-cursor="Drag"
      data-lenis-prevent
      className="relative w-full h-[100svh] border-t border-rule overflow-hidden select-none touch-none"
    >
      <canvas
        ref={canvasRef}
        data-carousel-fade
        className="absolute inset-0 w-full h-full"
      />

      <div className="absolute top-24 left-6 md:left-10 right-6 md:right-10 flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] text-muted pointer-events-none z-10">
        <span>On loop — Selected work</span>
        <span className="hidden md:inline">Drag or scroll to rotate</span>
      </div>

      <div className="absolute bottom-7 left-6 md:left-10 right-6 md:right-10 flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] text-muted pointer-events-none z-10">
        <span ref={liveCounterRef}>
          {String(activeIdx + 1).padStart(2, "0")} /{" "}
          {String(PROJECTS.length).padStart(2, "0")}
        </span>
        <span>{PROJECTS[activeIdx]?.category}</span>
      </div>
    </section>
  );
}
