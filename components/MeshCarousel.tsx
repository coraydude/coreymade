"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as THREE from "three";
import gsap from "gsap";
import SplitType from "split-type";
import { PROJECTS } from "@/lib/projects";
import {
  awaitPreloadedImage,
  preloadAllSiteImages,
} from "@/lib/imagePreload";
import { useTitle } from "./TitleProvider";

// Three.js ShaderMaterial auto-prepends: precision, `attribute vec3 position`,
// `attribute vec3 normal`, `attribute vec2 uv`, and the matrix uniforms
// (`modelMatrix`, `viewMatrix`, `projectionMatrix`, `normalMatrix`,
// `modelViewMatrix`, `cameraPosition`). Don't redeclare them.
const VERT = /* glsl */ `
  // Scroll velocity (target - progress in card-index units). Drives a
  // per-vertex mesh displacement during scroll.
  uniform float uVelocity;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 newPos = position;

    // Velocity-driven MESH displacement.
    //
    //   • Horizontal bulge — the centerline of the card pulls in the
    //     scroll direction, while the top/bottom edges lag behind. The
    //     parabola (1 - 4y²) peaks at the vertical center and drops to
    //     zero at y = ±0.5 (top/bottom of the card).
    //
    //   • Z push — magnitude-only forward push during scroll, so cards
    //     visibly bloat toward the viewer while in motion regardless of
    //     direction.
    //
    // uVelocity is 0 at rest, so the mesh sits flat unless something
    // is actually moving.
    float vel = clamp(uVelocity, -1.0, 1.0);
    float velMag = abs(vel);
    float yProfile = 1.0 - position.y * position.y * 4.0;
    newPos.x += vel * yProfile * 0.10;
    newPos.z += velMag * 0.08;

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

    // linearToOutputTexel is injected by Three.js based on the
    // renderer's outputColorSpace (SRGBColorSpace here). Built-in
    // materials call it for you; ShaderMaterial does not, so without
    // this the linear texture samples display ~gamma-2.2 darker than
    // the source.
    gl_FragColor = linearToOutputTexel(
      vec4(texel.rgb, texel.a * uAlpha * uLoaded)
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
  // Per-card intro appearance — tweened from 0 to 1 with stagger so the
  // cards pop into the stack one by one before they spread.
  appear: number;
};

const COPIES = 3;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mod = (a: number, n: number) => ((a % n) + n) % n;

export default function MeshCarousel() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const containerRef = useRef<HTMLDivElement>(null);
  const { setActiveProjectSlug } = useTitle();

  // First-mount focused project. We used to read window.__returnSlug
  // because MeshCarousel re-mounted on every home visit; with the
  // component now living in the layout this is only consulted once and
  // internal state (progress) carries the active card across routes.
  const [initialIdx] = useState<number>(() => 0);
  const [activeIdx, setActiveIdx] = useState(initialIdx);
  const activeIdxRef = useRef(initialIdx);
  const titleRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  // Animation hooks set up inside the main useEffect's closure (so they
  // can touch titleSplit, typeRef, counterRef, navigating, etc.) and
  // called from the isHome effect when the route changes between home
  // and elsewhere.
  const playEnterRef = useRef<(() => void) | null>(null);
  const playExitRef = useRef<((onComplete?: () => void) => void) | null>(
    null
  );
  // Skip the first run of the pathname effect — initial mount is owned
  // by entranceTl inside the main useEffect.
  const mountedRef = useRef(false);
  // Mirror of `isHome` accessible from inside the long-lived rAF tick.
  // Lets us skip renderer.render() calls when the carousel is not on
  // screen — saves a 21-mesh GPU draw every frame while the user is on
  // a case study or About / Contact.
  const isHomeRef = useRef(true);
  useEffect(() => {
    isHomeRef.current = isHome;
  }, [isHome]);

  // Set mount-time opacities BEFORE first paint. Subsequent changes are
  // gsap-driven via playEnter / playExit. Without this, the carousel +
  // counter would briefly paint at CSS-default opacity 1 when a user
  // lands directly on /work/foo.
  //
  // Note: we DON'T use display:none for off-home — iOS Safari (and some
  // Android browsers) reclaim the WebGL context when a canvas is
  // display:none, and returning home then shows a dead canvas. Since
  // CaseGLHost is gone there's only one persistent WebGL canvas left,
  // and compositing it at opacity 0 costs sub-1ms/frame (per trace).
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container) container.style.opacity = isHome ? "1" : "0";
    // Counter row always starts hidden. On home initial mount the entrance
    // timeline (main useEffect) fades it to 1; on non-home it stays hidden
    // until a playEnter raises it.
    const counterRow = counterRef.current?.parentElement;
    if (counterRow) counterRow.style.opacity = "0";
    // Run once at mount; subsequent transitions handled by playEnter/playExit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setActiveProjectSlug(PROJECTS[activeIdx]?.slug ?? null);
  }, [activeIdx, setActiveProjectSlug]);

  // Route-driven exit / re-enter. Initial mount is handled by the main
  // useEffect's entranceTl below, so the first run of this effect is
  // skipped via mountedRef.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (isHome) {
      playEnterRef.current?.();
    } else {
      playExitRef.current?.();
    }
  }, [isHome]);

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
    // Cap at 2× on every device. Mobile retina (typically devicePixelRatio
    // 2–3) renders sharp without paying the full 3× shader cost; desktop
    // hi-DPI displays clamp at 2 for the same reason.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
    // curve, much lower on mobile (the velocity bend doesn't need that many segments
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
      // Card geometry — slightly landscape (width = 1.08 * height).
      //   • Mobile (< 768px): card width is the driver — fits ~1.3 cards
      //     across so neighbors peek in. Tight 15% gap.
      //   • Desktop: height-limited card, generous 65% gap, so 2–3 are
      //     visible with breathing room.
      // Landscape card aspect (width = 1.4 × height ≈ 7:5). Cards sit
      // tight against each other — slot ≈ 1.1× card width on desktop,
      // ≈ 1.05× on mobile — so neighbors stay close instead of floating
      // apart with big gaps.
      const ASPECT = 1.4;
      const isMobile = w < 768;
      let cardWpx: number;
      let cardHpx: number;
      let slotPx: number;
      if (isMobile) {
        cardWpx = w * 0.78;
        cardHpx = Math.min(cardWpx / ASPECT, h * 0.7);
        cardWpx = cardHpx * ASPECT;
        slotPx = cardWpx * 1.05;
      } else {
        cardHpx = Math.min(h * 0.48, w);
        cardWpx = cardHpx * ASPECT;
        slotPx = cardWpx * 1.1;
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
      updateBand();
    };

    // Vertical band (in CSS pixels) that contains the cards. Recomputed
    // only on resize via updateBand() so onContainerMove (fires 100+/s
    // during pointer movement) doesn't redo the math on every event.
    let bandTop = 0;
    let bandBottom = 0;
    let lastInBand: boolean | null = null;
    const updateBand = () => {
      const cardHpx =
        viewport.cardHWorld / Math.max(viewport.worldPerPx, 0.0001);
      bandTop = (viewport.h - cardHpx) / 2;
      bandBottom = bandTop + cardHpx;
    };
    computeViewport();

    const slots: Slot[] = [];
    for (let k = 0; k < TOTAL; k++) {
      const projectIdx = k % N;

      const texture = new THREE.Texture();
      // Mipmaps + trilinear filtering. Without these, downscaling a
      // 1400px source to a ~600px card on screen aliases hard because
      // bilinear only samples 4 texels per output pixel and misses
      // everything in between — looks blurry / shimmery. Trilinear
      // picks the right pre-downscaled mipmap level and blends.
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      // Anisotropic filtering for oblique angles (helps even on flat
      // cards when the mesh is bent by the velocity displacement).
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
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
          uAlpha: { value: 1 },
          uLoaded: { value: 0 },
          uVelocity: { value: 0 },
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
        appear: 0,
      });
    }

    // Pull covers through the shared preload cache so we don't refetch
    // or re-decode the same URL the loader is already working on.
    //
    // CRITICAL: defer the texture assignment into a queue that the tick
    // loop drains one-per-frame. If all six cover promises resolve in
    // the same microtask (they do — they all came from one shared
    // preload pass), assigning `texture.needsUpdate = true` on every
    // slot synchronously causes the *next* renderer.render() to upload
    // all six textures in one frame. Perf trace caught that as a
    // 1.2-second tick at route-change time.
    type CoverUpload = { projectIdx: number; img: HTMLImageElement };
    const coverUploadQueue: CoverUpload[] = [];
    PROJECTS.forEach((p, i) => {
      awaitPreloadedImage(p.image).then((img) => {
        if (img) coverUploadQueue.push({ projectIdx: i, img });
      });
    });
    // Drains one cover into its slots per call (used by the tick loop).
    const drainCoverUpload = () => {
      const next = coverUploadQueue.shift();
      if (!next) return;
      slots.forEach((s) => {
        if (s.projectIdx === next.projectIdx) {
          s.texture.image = next.img;
          s.texture.needsUpdate = true;
          (s.material.uniforms.uTexSize.value as THREE.Vector2).set(
            next.img.naturalWidth,
            next.img.naturalHeight
          );
          s.loadedTarget = 1;
        }
      });
    };

    // Drag state — progress in card-index units, velocity is the *gap*
    // between target and current (not a derivative).
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
      // Don't accept drag until the cards finish spreading from the
      // intro stack — otherwise dragging silently mutates `progress`
      // while x is multiplied by spreadProgress=0 (cards locked at
      // center) and snaps into a wrong position when intro completes.
      if (intro.spreadProgress < 1) return;
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
            // Run the home exit anim, then navigate. router.push fires
            // from the chars-sink onComplete so the case page only
            // starts mounting (and PersistentTitle's chars-rise only
            // starts) after the home title has finished sinking. The
            // isHome effect will see `navigating === true` and bail
            // instead of triggering a second playExit.
            playExit(() => router.push(`/work/${slug}`));
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
      // Skip during intro spread — see onPointerDown for the reasoning.
      if (intro.spreadProgress < 1) return;
      const delta =
        Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      targetProgress += delta / viewport.slotPx;
      wheelLastAt = performance.now();
    };

    const onLeave = () => {
      hoverIdx = -1;
    };

    // Toggle the "Drag" cursor label on the container based on whether
    // the pointer is inside the vertical band that contains the cards.
    // Cursor scoping only — drag and wheel both work anywhere on the
    // viewport.
    const onContainerMove = (e: PointerEvent) => {
      const inBand = e.clientY >= bandTop && e.clientY <= bandBottom;
      if (inBand !== lastInBand) {
        if (inBand) container.setAttribute("data-cursor", "Drag");
        else container.removeAttribute("data-cursor");
        lastInBand = inBand;
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onContainerMove);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    canvas.addEventListener("pointerleave", onLeave);

    const onResize = () => computeViewport();
    window.addEventListener("resize", onResize);

    container.style.cursor = "grab";

    // Intro state.
    //   • Each slot has its own `appear` (0 → 1) that pops the card into
    //     the stack — staggered by entranceTl below so cards land one
    //     after another on top of each other.
    //   • `intro.spreadProgress` (0 → 1) drives the second phase: cards
    //     fan out from the stack to their carousel slots and grow to
    //     full size.
    // Both are skipped on subsequent home visits within the session.
    const STACK_SCALE = 0.25; // cards are 25% of full size while stacked
    const introSeen =
      typeof window !== "undefined" &&
      sessionStorage.getItem("carousel-intro-seen");
    const intro = { spreadProgress: introSeen ? 1 : 0 };
    if (typeof window !== "undefined") {
      sessionStorage.setItem("carousel-intro-seen", "1");
    }
    if (introSeen) {
      slots.forEach((s) => {
        s.appear = 1;
      });
    }

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

      // Nbsp keeps multi-word titles ("Letter Clash") readable —
      // SplitType wraps each char in an inline-block span and a regular
      // space inside an inline-block collapses to zero width.
      el.textContent = newText.replace(/ /g, " ");
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
    // Track last frame's card world size — uMeshSize is identical across
    // all slots and only changes on resize, so we skip the per-slot
    // Vector2.set() unless the value actually moved.
    let lastCardWWorld = -1;
    let lastCardHWorld = -1;
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
      titleEl.textContent = (PROJECTS[initialIdx]?.title ?? "").replace(
        / /g,
        " "
      );
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
    // Container starts at full opacity so the home page is immediately
    // populated when returning from a case study — otherwise WebGL init
    // (~30–50ms blocking) plus a 650ms fade leaves the user staring at
    // the body bg ("flash") right after BackToWork. Card entry is now
    // owned by the per-slot intro animation (first visit) or the
    // texture-fade shader (subsequent visits).

    const entranceTl = gsap.timeline({
      onComplete: () => {
        entering = false;
      },
    });
    // Intro choreography:
    //
    // First visit (!introSeen) is the "loader":
    //   1. Stack build — cards pop in one by one on top of each other.
    //      ONLY the stack is visible. No nav, no project title, no type,
    //      no counter row — the loading state is just cards stacking.
    //   2. Pause on the stacked state until every image has decoded.
    //   3. Spread + reveal the framing — cards fan out, title/type/
    //      counter fade in, nav drops down.
    //
    // Subsequent home visits (introSeen) skip the stack/spread and just
    // fade the framing in (chars rise + type + counter), since the cards
    // are already in place from the previous visit.
    const animateFraming = (position: string | number) => {
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
          position
        );
      }
      if (typeRef.current) {
        entranceTl.to(
          typeRef.current,
          { opacity: 0.5, duration: 0.4, ease: "expo.out" },
          position
        );
      }
      if (counterRow) {
        entranceTl.to(
          counterRow,
          { opacity: 1, duration: 0.4, ease: "expo.out" },
          position
        );
      }
    };
    if (!introSeen) {
      // Kick off real preloads (covers + every case-study image) the
      // moment the carousel mounts. Returns a single promise that
      // resolves once they're decoded — or a hard timeout fires so a
      // slow network can never trap the user on the loader.
      const preloadDone = preloadAllSiteImages();
      entranceTl.to(
        slots,
        {
          appear: 1,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.13,
        },
        0
      );
      // After the stack settles, hold on the stacked state until every
      // image has decoded. The animation looks identical when content is
      // already cached (preload races ahead of stack), but on a cold load
      // the user waits here instead of getting a janky case page later.
      entranceTl.addPause(">+0.35", () => {
        preloadDone.then(() => {
          if (entranceTl.paused()) entranceTl.resume();
        });
      });
      entranceTl.to(
        intro,
        {
          spreadProgress: 1,
          duration: 1.5,
          ease: "expo.inOut",
          onStart: () => {
            // Fade + slide the nav down as the cards start spreading.
            // The `intro-pending` class is set pre-paint by the inline
            // THEME_INIT_SCRIPT in app/layout.tsx; removing it triggers
            // the CSS transition on [data-nav] (opacity + transform).
            document.documentElement.classList.remove("intro-pending");
          },
        }
      );
      // Project title chars + type + counter come in AFTER the cards
      // have fully spread — they're the last beat of the intro, not
      // part of the spread itself.
      animateFraming(">+0.1");
    } else {
      // Intro already seen this session — cards are already in place,
      // so the framing just fades in on its own.
      animateFraming(0);
      document.documentElement.classList.remove("intro-pending");
    }

    // Exit / enter choreography for pathname changes. Both functions
    // operate on closure-scoped state (titleSplit, navigating) and are
    // exposed via refs so the isHome useEffect below can call them.
    const playExit = (onComplete?: () => void) => {
      // Already exiting (e.g. click handler started it before the
      // [isHome] effect fired) — bail so we don't restart the anim.
      if (navigating) return;
      navigating = true;
      entranceTl.kill();
      if (titleTween) titleTween.kill();
      // Defensive reset of chars/type in case fadeOutTitle was mid-flight.
      if (titleSplit?.chars && titleSplit.chars.length > 0) {
        gsap.set(titleSplit.chars, { opacity: 1, y: 0, scaleY: 1 });
      }
      if (typeRef.current) {
        gsap.killTweensOf(typeRef.current);
        gsap.set(typeRef.current, { opacity: 0.5 });
      }

      const fadeTargets: HTMLElement[] = [];
      if (container) fadeTargets.push(container);
      if (counterRef.current?.parentElement)
        fadeTargets.push(counterRef.current.parentElement);

      const runCharsSink = () => {
        if (titleSplit?.chars && titleSplit.chars.length > 0) {
          titleTween = gsap.to(titleSplit.chars, {
            y: 30,
            scaleY: 0,
            duration: 0.35,
            ease: "power3.in",
            stagger: { from: "edges", axis: "x", amount: 0.06 },
            transformOrigin: "bottom center",
            onComplete: () => onComplete?.(),
          });
        } else {
          onComplete?.();
        }
      };

      // Staged exit: carousel + counter fade out FIRST, then chars sink.
      // We deliberately do NOT set display:none on the container after
      // the fade — iOS Safari can reclaim the WebGL context when the
      // canvas is display:none, so returning to home would show a dead
      // carousel. With only one persistent WebGL canvas in the app, the
      // compositing cost of an opacity:0 layer is sub-1ms/frame.
      if (fadeTargets.length > 0) {
        gsap.killTweensOf(fadeTargets);
        gsap.to(fadeTargets, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.inOut",
          onComplete: runCharsSink,
        });
      } else {
        runCharsSink();
      }
    };

    const playEnter = () => {
      // If a stale entrance timeline is still running (e.g. user landed
      // on /work/foo first, then bounced to home within ~2s), kill it
      // before staging the per-route enter — otherwise the timeline's
      // chars-rise will fight playEnter's chars-rise.
      entranceTl.kill();
      if (titleTween) titleTween.kill();

      const fadeTargets: HTMLElement[] = [];
      if (container) fadeTargets.push(container);
      if (counterRef.current?.parentElement)
        fadeTargets.push(counterRef.current.parentElement);

      // Force opacity to 0 before the fade-in tween starts, so any
      // missed inline-style write (gsap clearProps, a stray React
      // reconcile, etc.) can't snap the canvas to a non-zero opacity
      // and show as a flash before the smooth fade kicks in.
      gsap.killTweensOf(fadeTargets);
      gsap.set(fadeTargets, { opacity: 0 });

      // Pre-stage: chars start sunk so the rise is the *second* beat,
      // visible only after the carousel has finished fading in.
      if (titleSplit?.chars && titleSplit.chars.length > 0) {
        gsap.set(titleSplit.chars, {
          y: 30,
          scaleY: 0,
          transformOrigin: "bottom center",
        });
      }
      // Type label starts hidden too — fades in alongside chars rise.
      if (typeRef.current) {
        gsap.killTweensOf(typeRef.current);
        gsap.set(typeRef.current, { opacity: 0 });
      }

      const runCharsRise = () => {
        if (titleSplit?.chars && titleSplit.chars.length > 0) {
          titleTween = gsap.to(titleSplit.chars, {
            y: 0,
            scaleY: 1,
            duration: 0.55,
            stagger: { from: "center", axis: "x", amount: 0.08 },
            ease: "expo.out",
            onComplete: () => {
              navigating = false;
            },
          });
        } else {
          navigating = false;
        }
        if (typeRef.current) {
          gsap.killTweensOf(typeRef.current);
          gsap.to(typeRef.current, {
            opacity: 0.5,
            duration: 0.4,
            ease: "expo.out",
          });
        }
      };

      // Staged enter: carousel + counter fade in FIRST, then chars rise.
      // killTweensOf was already called above, before the gsap.set
      // that primed opacity:0 — no need to repeat it here.
      if (fadeTargets.length > 0) {
        gsap.to(fadeTargets, {
          opacity: 1,
          duration: 0.4,
          ease: "power2.inOut",
          onComplete: runCharsRise,
        });
      } else {
        runCharsRise();
      }
    };

    playExitRef.current = playExit;
    playEnterRef.current = playEnter;

    const tick = (now: number) => {
      // Hard bail when off-home. The renderer was already skipped below,
      // but the slot loop, hover hit-test, settle detection, and title
      // swap logic all still ran every frame on case pages — pure waste
      // (and main-thread time stolen from scroll). Keeping the rAF alive
      // so the next route change picks back up where we left off.
      if (!isHomeRef.current) {
        last = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      // At most one cover texImage2D per frame. See comment on
      // coverUploadQueue above — batching six 13MB uploads into a
      // single frame is what produced the 1.2s mega-tick.
      drainCoverUpload();
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const cardWWorld = viewport.cardWWorld;
      const cardHWorld = viewport.cardHWorld;
      const slotWorld = viewport.slotWorld;
      const meshSizeDirty =
        cardWWorld !== lastCardWWorld || cardHWorld !== lastCardHWorld;

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

      hoverIdx = -1;
      const worldPointerX = (pointerNDC.x * viewport.worldW) / 2;
      const worldPointerY = (pointerNDC.y * viewport.worldH) / 2;

      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const rel = s.slotIdx - progress;
        const wrapped = mod(rel + TOTAL / 2, TOTAL) - TOTAL / 2;

        // Intro composition:
        //   • x position lerps from 0 (stack at center) to full slot
        //     offset as intro.spreadProgress goes 0 → 1.
        //   • Scale combines two things: s.appear pops the card into
        //     existence (0 → 1 during stack build), and the spread
        //     phase grows the card from STACK_SCALE to full size.
        const x = wrapped * slotWorld * intro.spreadProgress;
        s.mesh.position.set(x, 0, 0);
        const scaleMult =
          s.appear *
          (STACK_SCALE + (1 - STACK_SCALE) * intro.spreadProgress);
        s.mesh.scale.set(cardWWorld * scaleMult, cardHWorld * scaleMult, 1);

        const u = s.material.uniforms;
        u.uVelocity.value = velocity;
        if (meshSizeDirty) {
          (u.uMeshSize.value as THREE.Vector2).set(cardWWorld, cardHWorld);
        }

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

      if (meshSizeDirty) {
        lastCardWWorld = cardWWorld;
        lastCardHWorld = cardHWorld;
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
        } else if (!isSettled && isShown && !isDown) {
          // Don't fadeOutTitle while pointer is engaged. Otherwise a
          // click triggers fadeOutTitle (because isSettled is false
          // whenever isDown is true), sets currentTitleIdx to -1, and
          // on home return the tick runs swapTitle once playEnter is
          // done — producing a second rise animation right after the
          // first one. Wait until the pointer is actually up before
          // fading.
          fadeOutTitle();
          currentTitleIdx = -1;
        }
      }

      // Skip the GPU draw when the carousel isn't visible. The canvas
      // keeps its last frame, the container fades via CSS opacity, and
      // we don't compete for GPU time with the case page's WebGL canvas
      // or the rest of the page mount.
      if (isHomeRef.current) {
        renderer.render(scene, camera);
      }
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
      container.removeEventListener("pointermove", onContainerMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerleave", onLeave);

      if (titleTween) titleTween.kill();
      if (titleSplit) titleSplit.revert();
      playEnterRef.current = null;
      playExitRef.current = null;

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
        data-lenis-prevent
        className="fixed inset-0 select-none"
        style={{
          zIndex: 5,
          touchAction: "none",
          // Opacity is gsap-controlled (playEnter/playExit) — see the
          // useLayoutEffect below for the mount-time initial value.
          // pointerEvents stays React-driven so the canvas can never
          // intercept clicks during a navigation.
          pointerEvents: isHome ? "auto" : "none",
        }}
      />

      <div
        className="fixed top-24 left-6 md:left-10 right-6 md:right-10 flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] text-muted pointer-events-none z-20"
      >
        <span>Selected work — drag to flick</span>
        <span ref={counterRef}>
          {`01 / ${String(PROJECTS.length).padStart(2, "0")}`}
        </span>
      </div>

      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-[32px] flex flex-col items-center text-center pointer-events-none z-20"
        style={{
          // Wrapper visibility snaps with the route (no CSS fade) — the
          // visible enter/exit animation lives on the chars inside.
          opacity: isHome ? 1 : 0,
          transition: "opacity 0ms",
        }}
      >
        {/* Title content is set imperatively in the main useEffect
            (textContent + SplitType). Leaving the JSX empty keeps
            React out of the chars' children — its reconciler can't
            destroy the .char spans on re-render. */}
        <div
          ref={titleRef}
          style={{
            // Responsive size so longer titles ("Bloomfire", "Capacity")
            // don't overflow a 375px viewport at the desktop 5rem.
            fontSize: "clamp(2.5rem, 11vw, 5rem)",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            fontFamily: "var(--font-display), system-ui, sans-serif",
            color: "currentColor",
            // Tight line-height to crop the empty space below the caps
            // (Anton's metrics are a bit looser than SCHABO's were).
            lineHeight: 0.9,
            whiteSpace: "nowrap",
          }}
        />
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
        />
      </div>
    </>
  );
}
