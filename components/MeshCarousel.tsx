"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import gsap from "gsap";
import SplitType from "split-type";
import { PROJECTS } from "@/lib/projects";
import { useTitle } from "./TitleProvider";

// Three.js ShaderMaterial auto-prepends: precision, `attribute vec3 position`,
// `attribute vec3 normal`, `attribute vec2 uv`, and the matrix uniforms
// (`modelMatrix`, `viewMatrix`, `projectionMatrix`, `normalMatrix`,
// `modelViewMatrix`, `cameraPosition`). Don't redeclare them.
const VERT = /* glsl */ `
  // Signed drag velocity (decays to 0 the instant you let go). Positive =
  // drag right, negative = drag left. Bend depth follows magnitude, bend
  // direction follows sign.
  uniform float uBend;
  uniform float uIndex;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying float vCenter;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // First pass: where does this vertex land in NDC, so the whole row
    // curves together (gaussian peaks at screen-X = 0).
    vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec3 ndc = clipPos.xyz / max(abs(clipPos.w), 0.0001);

    // Horizontal cylinder (rolling pin) — gaussian on X only, so the bend
    // is uniform top-to-bottom and falls off horizontally toward the edges.
    float k = ndc.x * 1.8;
    float g = exp(-k * k);
    vCenter = g;

    vec3 newPos = position;
    newPos.z += g * uBend * 1.2;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2  uTexSize;
  uniform vec2  uMeshSize;
  uniform float uAlpha;
  uniform float uLoaded;

  varying vec2  vUv;
  varying float vCenter;

  float rectMask(vec2 st, float aa) {
    vec2 size = vec2(1.0) - vec2(aa);
    size = vec2(0.5) - size * 0.5;
    vec2 m = vec2(smoothstep(size.x - aa, size.x, st.x),
                  smoothstep(size.y - aa, size.y, st.y));
    m *= vec2(smoothstep(size.x - aa, size.x, 1.0 - st.x),
              smoothstep(size.y - aa, size.y, 1.0 - st.y));
    return m.x * m.y;
  }

  void main() {
    // object-fit: cover for the image inside its quad.
    float meshA = uMeshSize.x / max(uMeshSize.y, 0.0001);
    float texA  = uTexSize.x  / max(uTexSize.y, 0.0001);
    vec2 ratio  = vec2(min(meshA / texA, 1.0), min(texA / meshA, 1.0));
    vec2 baseUV = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    vec4 texel = texture2D(uMap, baseUV);

    float rect = rectMask(vUv, 0.008);
    // linearToOutputTexel is injected by Three.js based on the
    // renderer's outputColorSpace (SRGBColorSpace here). Built-in
    // materials call it for you; ShaderMaterial does not, so without
    // this the linear texture samples display ~gamma-2.2 darker than
    // the source.
    gl_FragColor = linearToOutputTexel(
      vec4(texel.rgb, texel.a * rect * uAlpha * uLoaded)
    );
  }
`;

type Slot = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
  texture: THREE.Texture;
  loaded: number;
  loadedTarget: number;
  projectIdx: number;
  slotIdx: number;
};

const COPIES = 3;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mod = (a: number, n: number) => ((a % n) + n) % n;

export default function MeshCarousel() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { setActiveProjectSlug } = useTitle();

  // If we just navigated back from a case page, start the carousel
  // centered on that project so the reverse-morphed title lands on the
  // same project text. Read once on mount via useState initializer.
  const [initialIdx] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const slug = window.__returnSlug;
    if (!slug) return 0;
    const idx = PROJECTS.findIndex((p) => p.slug === slug);
    return idx >= 0 ? idx : 0;
  });
  const initial = PROJECTS[initialIdx] ?? PROJECTS[0];

  const [activeIdx, setActiveIdx] = useState(initialIdx);
  const activeIdxRef = useRef(initialIdx);
  const titleRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setActiveProjectSlug(PROJECTS[activeIdx]?.slug ?? null);
  }, [activeIdx, setActiveProjectSlug]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof window === "undefined") return;

    const N = PROJECTS.length;
    const TOTAL = N * COPIES;

    // Mobile-class device gate — used to scale GPU cost (DPR, tessellation)
    // so the carousel doesn't drop frames on phone GPUs.
    const isMobileGpu = window.innerWidth < 768;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobileGpu, // antialias is expensive — drop on mobile
      // premultipliedAlpha:false matches how the fragment shader outputs
      // color (un-pre-multiplied) — otherwise CSS compositing darkens
      // edge / fade pixels because RGB is interpreted as already
      // multiplied by alpha.
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(
      isMobileGpu ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setClearColor(0x000000, 0);
    // Explicit sRGB output — default in r152+ but set it loudly so any
    // future Three.js bump doesn't silently change the pipeline and
    // double-darken the textures (sRGB sampled, output as if linear).
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvas = renderer.domElement;
    container.appendChild(canvas);
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    const scene = new THREE.Scene();

    // Mesh tessellation — high enough on desktop for a smooth gaussian
    // curve, much lower on mobile (the bend doesn't need that many segments
    // to read fine, and 48×64 × N meshes blows vertex budgets on phones).
    const geometry = new THREE.PlaneGeometry(
      1,
      1,
      isMobileGpu ? 16 : 48,
      isMobileGpu ? 20 : 64
    );

    // Viewport + derived layout numbers, all in a single shared object so
    // hot-path code (tick, pointer events) can read them without recomputing.
    // Refreshed only on resize.
    let viewport = {
      w: 0,
      h: 0,
      worldH: 0,
      worldW: 0,
      worldPerPx: 0,
      cardWWorld: 0,
      cardHWorld: 0,
      slotWorld: 0,
      slotPx: 0,
    };
    const computeViewport = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const fov = (camera.fov * Math.PI) / 180;
      const worldH = 2 * Math.tan(fov / 2) * camera.position.z;
      const worldW = worldH * (w / h);
      const worldPerPx = worldH / h;
      // Card geometry (portrait 3:4).
      //   • Mobile (< 768px): card width is the driver — fits ~1.3 cards
      //     across so neighbors peek in. Tight 15% gap, taller card.
      //   • Desktop: height-limited card, generous 65% gap, smaller card
      //     so 2–3 are visible with breathing room.
      const ASPECT = 3 / 4;
      const isMobile = w < 768;
      let cardWpx: number;
      let cardHpx: number;
      let slotPx: number;
      if (isMobile) {
        cardWpx = w * 0.7;
        cardHpx = Math.min(cardWpx / ASPECT, h * 0.7);
        // Re-derive width from the (possibly capped) height so the 3:4
        // aspect stays exact.
        cardWpx = cardHpx * ASPECT;
        slotPx = cardWpx * 1.15;
      } else {
        cardHpx = Math.min(h * 0.48, w);
        cardWpx = cardHpx * ASPECT;
        slotPx = cardWpx * 1.65;
      }
      viewport = {
        w,
        h,
        worldH,
        worldW,
        worldPerPx,
        cardWWorld: cardWpx * worldPerPx,
        cardHWorld: cardHpx * worldPerPx,
        slotWorld: slotPx * worldPerPx,
        slotPx,
      };
    };
    computeViewport();

    const slots: Slot[] = [];
    for (let k = 0; k < TOTAL; k++) {
      const projectIdx = k % N;

      const texture = new THREE.Texture();
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      // Texture stored as sRGB on the GPU → sampling auto-converts to
      // linear in the shader. Pair with the explicit linearToOutputTexel
      // call in the fragment shader so the output gets re-encoded to
      // sRGB. Without that call, ShaderMaterial outputs linear values
      // directly and the image displays double-darkened.
      texture.colorSpace = THREE.SRGBColorSpace;

      const material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uMap: { value: texture },
          uTexSize: { value: new THREE.Vector2(1, 1) },
          uMeshSize: { value: new THREE.Vector2(1, 1) },
          uBend: { value: 0 },
          uIndex: { value: k },
          uAlpha: { value: 1 },
          uLoaded: { value: 0 },
        },
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      slots.push({
        mesh,
        material,
        texture,
        loaded: 0,
        loadedTarget: 0,
        projectIdx,
        slotIdx: k,
      });
    }

    // Next.js basePath isn't applied to raw `new Image()` requests, so
    // we prefix local URLs (those starting with "/") manually. External
    // URLs (http/https) are used as-is.
    const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const resolveImageSrc = (src: string) =>
      src.startsWith("http") ? src : `${BASE_PATH}${src}`;

    PROJECTS.forEach((p, i) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = resolveImageSrc(p.image);
      img.onload = () => {
        slots.forEach((s) => {
          if (s.projectIdx === i) {
            s.texture.image = img;
            s.texture.needsUpdate = true;
            (s.material.uniforms.uTexSize.value as THREE.Vector2).set(
              img.naturalWidth,
              img.naturalHeight
            );
            s.loadedTarget = 1;
          }
        });
      };
    });

    // Drag state — progress in card-index units, velocity is the *gap*
    // between target and current (not a derivative). `initialIdx` was
    // computed at mount time from window.__returnSlug; clear it here so
    // the next mount starts fresh.
    if (window.__returnSlug) delete window.__returnSlug;
    let progress = initialIdx;
    let targetProgress = initialIdx;
    let velocity = 0;
    let isDown = false;
    let downX = 0;
    let downY = 0;
    let downAt = 0;
    let dragStartTarget = 0;
    const pointerNDC = { x: 0, y: 0 };
    let hoverIdx = -1;
    let hoverWrapped = 0;
    let releasedAt = -Infinity;
    let wheelLastAt = -Infinity;

    // Velocity samples for an inertial swipe throw. We record the last ~5
    // pointer positions over a 100ms window so we know the *real* finger
    // velocity at the moment of release, not just the cumulative drag
    // delta (which feels dead for quick mobile flicks).
    const recentMoves: { x: number; t: number }[] = [];
    const VELOCITY_WINDOW_MS = 100;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      isDown = true;
      downX = e.clientX;
      downY = e.clientY;
      downAt = performance.now();
      dragStartTarget = targetProgress;
      recentMoves.length = 0;
      recentMoves.push({ x: e.clientX, t: downAt });
      canvas.setPointerCapture?.(e.pointerId);
      container.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      // Canvas is `position: absolute; inset: 0` inside a fixed-inset
      // container, so its rect is always the full viewport — no need to
      // call getBoundingClientRect() (it forces synchronous layout).
      pointerNDC.x = (e.clientX / viewport.w) * 2 - 1;
      pointerNDC.y = -((e.clientY / viewport.h) * 2 - 1);
      if (isDown) {
        const dx = e.clientX - downX;
        targetProgress = dragStartTarget - dx / viewport.slotPx;
        // Stash for velocity calc on release; drop samples older than
        // VELOCITY_WINDOW_MS so direction changes don't contaminate.
        const now = performance.now();
        recentMoves.push({ x: e.clientX, t: now });
        while (
          recentMoves.length > 1 &&
          now - recentMoves[0].t > VELOCITY_WINDOW_MS
        ) {
          recentMoves.shift();
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDown) return;
      const dt = performance.now() - downAt;
      const dx = Math.abs(e.clientX - downX);
      const dy = Math.abs(e.clientY - downY);
      const wasClick = dt < 240 && dx < 6 && dy < 6;
      isDown = false;
      releasedAt = performance.now();
      container.style.cursor = "grab";
      if (wasClick) {
        if (hoverIdx >= 0 && Math.abs(hoverWrapped) > 0.5) {
          targetProgress = Math.round(progress + hoverWrapped);
        } else {
          const focused = mod(Math.round(progress), N);
          const slug = PROJECTS[focused]?.slug;
          if (slug) {
            // Outgoing transition (home → case):
            //   • Title chars sink down + fade (stagger from edges).
            //   • Category fades alongside.
            //   • Carousel canvas + counter chrome fade.
            //   • Navigate after the title chars have left.
            // The case page's PersistentTitle then animates its big chars
            // up from below on mount (mirror image, completing the loop).
            navigating = true;
            entranceTl.kill();
            if (titleTween) titleTween.kill();

            if (titleSplit?.chars && titleSplit.chars.length > 0) {
              titleTween = gsap.to(titleSplit.chars, {
                y: 20,
                scaleY: 0,
                duration: 0.35,
                ease: "power3.in",
                stagger: { from: "edges", axis: "x", amount: 0.06 },
                transformOrigin: "bottom center",
              });
            }
            if (typeRef.current) {
              gsap.killTweensOf(typeRef.current);
              gsap.to(typeRef.current, {
                opacity: 0,
                duration: 0.3,
                ease: "power3.in",
              });
            }
            if (counterRef.current?.parentElement) {
              gsap.to(counterRef.current.parentElement, {
                opacity: 0,
                duration: 0.3,
                ease: "power3.in",
              });
            }
            gsap.to(container, {
              opacity: 0,
              duration: 0.4,
              ease: "power3.in",
            });

            window.setTimeout(() => router.push(`/work/${slug}`), 450);
          }
        }
      } else {
        // Inertial throw based on REAL finger velocity at release.
        // Sample the px/sec over the last ~100ms of pointermove events,
        // project ~350ms of natural decay, then snap to the nearest card.
        // This makes quick mobile flicks actually carry between cards
        // instead of relying on the cumulative drag delta (which is small
        // for fast short flicks and was effectively dead before).
        let throwCards = 0;
        if (recentMoves.length >= 2) {
          const first = recentMoves[0];
          const last = recentMoves[recentMoves.length - 1];
          const dtSec = (last.t - first.t) / 1000;
          if (dtSec > 0) {
            const pxPerSec = (last.x - first.x) / dtSec;
            // Projection horizon: ~350ms of finger inertia. Negative because
            // dragging right (positive dx) should DECREASE progress (cards
            // move left visually with finger).
            throwCards = -(pxPerSec * 0.35) / viewport.slotPx;
          }
        }
        targetProgress = Math.round(targetProgress + throwCards);
        recentMoves.length = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      const delta =
        Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      targetProgress += delta / viewport.slotPx;
      wheelLastAt = performance.now();
    };

    const onLeave = () => {
      hoverIdx = -1;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    canvas.addEventListener("pointerleave", onLeave);

    const onResize = () => computeViewport();
    window.addEventListener("resize", onResize);

    container.style.cursor = "grab";

    // Per-char title swap, gated by "settled" state:
    //   • While the carousel is moving, fade the current chars out.
    //   • Only when the focused card has nearly stopped at center do we
    //     swap to the new title and animate chars in.
    let titleSplit: SplitType | null = null;
    let titleTween: gsap.core.Tween | null = null;

    const fadeOutTitle = () => {
      if (titleTween) titleTween.kill();
      if (titleSplit?.chars && titleSplit.chars.length > 0) {
        titleTween = gsap.to(titleSplit.chars, {
          opacity: 0,
          y: -6,
          duration: 0.12,
          ease: "power2.in",
          stagger: { from: "edges", axis: "x", amount: 0.03 },
        });
      }
      // Category fades together with the title.
      if (typeRef.current) {
        gsap.killTweensOf(typeRef.current);
        gsap.to(typeRef.current, {
          opacity: 0,
          duration: 0.12,
          ease: "power2.in",
        });
      }
    };

    const swapTitle = (newText: string, newCategory: string) => {
      const el = titleRef.current;
      if (!el) return;

      if (titleTween) titleTween.kill();
      if (titleSplit) {
        titleSplit.revert();
        titleSplit = null;
      }

      el.textContent = newText;
      titleSplit = new SplitType(el, { types: "chars" });
      const chars = titleSplit.chars;
      if (!chars || chars.length === 0) return;

      gsap.set(chars, {
        scaleY: 0,
        y: 10,
        transformOrigin: "bottom center",
        opacity: 1,
      });
      titleTween = gsap.to(chars, {
        scaleY: 1,
        y: 0,
        duration: 0.35,
        stagger: { from: "center", axis: "x", amount: 0.04 },
        ease: "expo.out",
      });

      // Swap category text and fade it in just behind the title chars.
      if (typeRef.current) {
        typeRef.current.textContent = newCategory;
        gsap.killTweensOf(typeRef.current);
        gsap.fromTo(
          typeRef.current,
          { opacity: 0 },
          {
            opacity: 0.5,
            duration: 0.35,
            ease: "expo.out",
            delay: 0.06,
          }
        );
      }
    };

    // Hysteresis on the "settled" detection so the title doesn't flicker
    // at the threshold edge. Strict to *enter* (must really be parked) but
    // loose to *stay* (small wobble doesn't un-settle).
    let currentTitleIdx = -1; // -1 = no title shown
    let navigating = false; // while true, tick() leaves the title alone
    let entering = true; // while true, tick() leaves the title alone
    const ENTER_DIST = 0.04;
    const ENTER_VEL = 0.006;
    const LEAVE_DIST = 0.18;
    const LEAVE_VEL = 0.022;

    let raf = 0;
    let last = performance.now();
    let lastLiveIdx = -1;
    const SNAP_VELOCITY = 0.0008;

    // ────────────────────────────────────────────────────────────────────
    // Home-page entrance sequence:
    //   1. Cards (the canvas container) fade in and slide up.
    //   2. Project title chars rise from below + project type fades in
    //      simultaneously, after the cards have landed.
    // The tick loop's title-swap logic stays gated (`entering`) until this
    // is done so it doesn't fight the entrance timeline.
    // ────────────────────────────────────────────────────────────────────
    const counterRow = counterRef.current?.parentElement ?? null;
    const titleEl = titleRef.current;

    // Set the initial project title char layout up-front so the entrance
    // timeline has chars to animate (matches what swapTitle would build).
    if (titleEl) {
      titleEl.textContent = PROJECTS[initialIdx]?.title ?? "";
      titleSplit = new SplitType(titleEl, { types: "chars" });
      if (titleSplit.chars && titleSplit.chars.length > 0) {
        gsap.set(titleSplit.chars, {
          scaleY: 0,
          y: 10,
          opacity: 1,
          transformOrigin: "bottom center",
        });
      }
      // Tell the tick loop we already own this idx so it doesn't try to
      // re-swap once `entering` flips false.
      currentTitleIdx = initialIdx;
    }
    if (typeRef.current) {
      typeRef.current.textContent =
        PROJECTS[initialIdx]?.category ?? "";
      gsap.set(typeRef.current, { opacity: 0 });
    }
    if (counterRow) gsap.set(counterRow, { opacity: 0 });
    gsap.set(container, { opacity: 0, y: 40 });

    const entranceTl = gsap.timeline({
      onComplete: () => {
        entering = false;
      },
    });
    entranceTl.to(container, {
      opacity: 1,
      y: 0,
      duration: 0.65,
      ease: "expo.out",
    });
    if (counterRow) {
      entranceTl.to(
        counterRow,
        { opacity: 1, duration: 0.4, ease: "expo.out" },
        "-=0.25"
      );
    }
    if (titleSplit?.chars && titleSplit.chars.length > 0) {
      entranceTl.to(
        titleSplit.chars,
        {
          scaleY: 1,
          y: 0,
          duration: 0.55,
          stagger: { from: "center", axis: "x", amount: 0.08 },
          ease: "expo.out",
        },
        ">"
      );
    }
    if (typeRef.current) {
      entranceTl.to(
        typeRef.current,
        { opacity: 0.5, duration: 0.4, ease: "expo.out" },
        "<"
      );
    }

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const cardWWorld = viewport.cardWWorld;
      const cardHWorld = viewport.cardHWorld;
      const slotWorld = viewport.slotWorld;

      velocity = targetProgress - progress;

      if (isDown) {
        progress = targetProgress;
      } else {
        const idleForSnap =
          now - releasedAt > 160 && now - wheelLastAt > 220;
        if (Math.abs(velocity) < SNAP_VELOCITY && idleForSnap) {
          targetProgress = Math.round(progress);
          progress += (targetProgress - progress) * 0.1;
        } else if (Math.abs(velocity) < 0.01) {
          progress += velocity * 0.1;
        } else {
          progress += velocity * 0.09;
        }
      }

      // Constant rolling-pin — bend is always-on, not tied to drag velocity.
      // Smaller on mobile so the perspective magnification doesn't push the
      // centered card past the viewport edges.
      const bend = viewport.w < 768 ? 0.55 : 1.0;

      hoverIdx = -1;
      const worldPointerX = (pointerNDC.x * viewport.worldW) / 2;
      const worldPointerY = (pointerNDC.y * viewport.worldH) / 2;

      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const rel = s.slotIdx - progress;
        const wrapped = mod(rel + TOTAL / 2, TOTAL) - TOTAL / 2;

        const x = wrapped * slotWorld;
        s.mesh.position.set(x, 0, 0);
        s.mesh.scale.set(cardWWorld, cardHWorld, 1);

        const u = s.material.uniforms;
        u.uBend.value = bend;
        (u.uMeshSize.value as THREE.Vector2).set(cardWWorld, cardHWorld);

        s.loaded = lerp(s.loaded, s.loadedTarget, 1 - Math.exp(-7 * dt));
        u.uLoaded.value = s.loaded;

        const halfW = cardWWorld / 2;
        const halfH = cardHWorld / 2;
        if (
          worldPointerX > x - halfW &&
          worldPointerX < x + halfW &&
          worldPointerY > -halfH &&
          worldPointerY < halfH
        ) {
          hoverIdx = s.projectIdx;
          hoverWrapped = wrapped;
        }
      }

      const liveIdx = mod(Math.round(progress), N);
      if (liveIdx !== lastLiveIdx) {
        lastLiveIdx = liveIdx;
        const p = PROJECTS[liveIdx];
        // Category text is swapped in/out via swapTitle/fadeOutTitle so it
        // stays in lockstep with the title — don't touch it here.
        if (counterRef.current)
          counterRef.current.textContent = `${String(liveIdx + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}`;
        if (activeIdxRef.current !== liveIdx) {
          activeIdxRef.current = liveIdx;
          setActiveIdx(liveIdx);
        }
      }

      // Title: fade out while moving, swap in only once almost settled.
      // Never count "settled" during an active drag — velocity is 0 then
      // (progress = targetProgress), which would otherwise spuriously trip
      // the threshold every time the cursor hovers near an integer.
      // Skip entirely while navigating or while the entrance timeline is
      // still in flight — neither should be disturbed by the tick loop.
      if (!navigating && !entering) {
        const distToInt = Math.abs(progress - Math.round(progress));
        const isShown = currentTitleIdx !== -1;
        const isSettled =
          !isDown &&
          (isShown
            ? distToInt < LEAVE_DIST && Math.abs(velocity) < LEAVE_VEL
            : distToInt < ENTER_DIST && Math.abs(velocity) < ENTER_VEL);

        if (isSettled && currentTitleIdx !== liveIdx) {
          const p = PROJECTS[liveIdx];
          swapTitle(p.title, p.category);
          currentTitleIdx = liveIdx;
        } else if (!isSettled && isShown) {
          fadeOutTitle();
          currentTitleIdx = -1;
        }
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerleave", onLeave);

      if (titleTween) titleTween.kill();
      if (titleSplit) titleSplit.revert();

      slots.forEach((s) => {
        s.texture.dispose();
        s.material.dispose();
      });
      geometry.dispose();
      renderer.dispose();
      try {
        container.removeChild(canvas);
      } catch {}
    };
  }, [router, setActiveProjectSlug, initialIdx]);

  return (
    <>
      <div
        ref={containerRef}
        data-carousel-fade
        data-cursor="Drag"
        data-lenis-prevent
        className="fixed inset-0 select-none"
        style={{ zIndex: 5, touchAction: "none" }}
      />

      <div className="fixed top-24 left-6 md:left-10 right-6 md:right-10 flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] text-muted pointer-events-none z-20">
        <span>Selected work — drag to flick</span>
        <span ref={counterRef}>
          {`01 / ${String(PROJECTS.length).padStart(2, "0")}`}
        </span>
      </div>

      <div className="fixed left-1/2 -translate-x-1/2 bottom-[32px] flex flex-col items-center text-center pointer-events-none z-20">
        <div
          ref={titleRef}
          style={{
            fontSize: "5rem",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            fontFamily: "var(--font-display), system-ui, sans-serif",
            color: "currentColor",
            // SCHABO's glyphs only fill ~75% of the line box — crop the
            // empty space below the caps so the 12px gap to the subtitle
            // actually measures 12px from the bottom of the letters.
            lineHeight: 0.78,
          }}
        >
          {initial.title}
        </div>
        <span
          ref={typeRef}
          className="mt-[12px]"
          style={{
            fontSize: "11px",
            opacity: 0.5,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
          }}
        >
          {initial.category}
        </span>
      </div>
    </>
  );
}
