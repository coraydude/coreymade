"use client";

import { useEffect } from "react";
import * as THREE from "three";
import {
  awaitPreloadedImage,
  getPreloadedImage,
} from "@/lib/imagePreload";

// Persistent WebGL host for the case-study image stacks. Mounted at the
// layout level so the renderer, canvas, scene, geometry, and rAF tick
// are created exactly once for the lifetime of the app — no shader
// recompile, no GL context churn, no main-thread blocking on every
// case-page mount.
//
// CaseStudyImagesGL becomes a thin client: it renders the per-page slot
// divs and calls `caseGLSetSlots()` to register them with this host.
// Going home (or anywhere off /work/*) clears the slot list, the tick
// skips rendering, and the canvas sits transparent in the background
// until the next case page.

const VERT = /* glsl */ `
  uniform float uVelocity;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 newPos = position;

    float vel = clamp(uVelocity, -1.0, 1.0);
    float velMag = abs(vel);
    float xProfile = 1.0 - position.x * position.x * 4.0;
    newPos.y += vel * xProfile * 0.05;
    newPos.z += velMag * 0.02;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2  uTexSize;
  uniform vec2  uMeshSize;
  uniform float uLoaded;
  varying vec2 vUv;

  void main() {
    float meshA = uMeshSize.x / max(uMeshSize.y, 0.0001);
    float texA  = uTexSize.x  / max(uTexSize.y, 0.0001);
    vec2 ratio  = vec2(min(meshA / texA, 1.0), min(texA / meshA, 1.0));
    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
    vec4 texel = texture2D(uMap, uv);
    gl_FragColor = linearToOutputTexel(vec4(texel.rgb, texel.a * uLoaded));
  }
`;

type Slot = {
  dom: HTMLDivElement;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
  texture: THREE.Texture;
  loaded: number;
  loadedTarget: number;
};

type GLState = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  geometry: THREE.PlaneGeometry;
  canvas: HTMLCanvasElement;
  slots: Slot[];
  vw: number;
  vh: number;
};

// Module-level singleton state. There is exactly one CaseGLHost instance
// (mounted in the layout) which initializes this and tears it down on
// app unmount.
let _state: GLState | null = null;
// Signals the rAF tick that slot DOM rects need re-measuring. Set by
// buildSlots (new slot list), the resize handler (viewport changed),
// and scroll detection (positions shifted). Lets us skip the per-frame
// getBoundingClientRect storm on otherwise-static frames.
let _needRectUpdate = true;
// If a CaseStudyImagesGL mounts before the host's useEffect has run, we
// hold onto its registration request and apply it once init completes.
let _pending: { srcs: string[]; slotDoms: (HTMLDivElement | null)[] } | null =
  null;
// Pending texImage2D uploads — processed at most one per frame in tick()
// so a case page with many full-bleed images never blows a single frame
// budget on compound GPU uploads.
type PendingUpload = {
  slot: Slot;
  img: HTMLImageElement;
};
let _uploadQueue: PendingUpload[] = [];

function buildSlots(
  state: GLState,
  srcs: string[],
  slotDoms: (HTMLDivElement | null)[]
) {
  state.slots.forEach((s) => {
    state.scene.remove(s.mesh);
    s.material.dispose();
    s.texture.dispose();
  });
  state.slots = [];
  // Drop any uploads queued for the previous slot list.
  _uploadQueue = [];
  // New slot list → cached rects are stale; force re-measure next tick.
  _needRectUpdate = true;

  // Empty-srcs path: the user left every case page. We need to draw the
  // (now empty) scene exactly once to clear the framebuffer — otherwise
  // the canvas holds the last case page's frame and that ghost becomes
  // visible if anything later resets the canvas opacity. We also leave
  // the canvas opacity alone here so the exit fade (BackToWork /
  // NextProjectFooter set opacity:0) stays in effect.
  if (srcs.length === 0) {
    state.renderer.render(state.scene, state.camera);
    return;
  }

  // Slots are being rebuilt → un-fade the canvas (it may have been
  // faded to 0 by the previous page's exit animation).
  state.canvas.style.opacity = "1";

  srcs.forEach((src, i) => {
    const dom = slotDoms[i];
    if (!dom) return;

    const texture = new THREE.Texture();
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      uniforms: {
        uMap: { value: texture },
        uTexSize: { value: new THREE.Vector2(1, 1) },
        uMeshSize: { value: new THREE.Vector2(1, 1) },
        uVelocity: { value: 0 },
        uLoaded: { value: 0 },
      },
    });

    const mesh = new THREE.Mesh(state.geometry, material);
    mesh.position.set(-100000, 0, 0);
    state.scene.add(mesh);

    const slot: Slot = {
      dom,
      mesh,
      material,
      texture,
      loaded: 0,
      loadedTarget: 0,
    };
    state.slots.push(slot);

    // Queue the upload instead of running it inline. The tick loop
    // processes at most one queued upload per frame so a Dutchie-sized
    // stack (12+ full-bleed textures) never blasts all texImage2D calls
    // into a single render frame.
    const enqueue = (readyImg: HTMLImageElement) => {
      _uploadQueue.push({ slot, img: readyImg });
    };
    // Fast path: the loader already decoded this URL → grab the same
    // Image instance, skipping a redundant fetch + decode pair.
    const cached = getPreloadedImage(src);
    if (cached) {
      enqueue(cached);
    } else {
      // Cold path (preload incomplete or skipped): wait on the shared
      // promise — awaitPreloadedImage() registers the URL with the
      // preload cache so we don't double-fetch.
      awaitPreloadedImage(src).then((readyImg) => {
        if (readyImg) enqueue(readyImg);
      });
    }
  });
}

// Called by CaseStudyImagesGL whenever its srcs change (and on mount /
// unmount). Empty srcs clears the canvas.
export function caseGLSetSlots(
  srcs: string[],
  slotDoms: (HTMLDivElement | null)[]
) {
  if (!_state) {
    _pending = { srcs, slotDoms };
    return;
  }
  buildSlots(_state, srcs, slotDoms);
}

export default function CaseGLHost() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (_state) return; // Already initialized (shouldn't happen but safe).

    const isMobileGpu = window.innerWidth < 768;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobileGpu,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvas = renderer.domElement;
    canvas.dataset.caseGl = "1";
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100svh";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "3";
    document.body.appendChild(canvas);

    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(
      1,
      1,
      isMobileGpu ? 16 : 32,
      isMobileGpu ? 12 : 24
    );

    const state: GLState = {
      renderer,
      scene,
      camera,
      geometry,
      canvas,
      slots: [],
      vw: 0,
      vh: 0,
    };
    _state = state;

    // Pre-warm the shader program. Three.js caches compiled programs by
    // shader source, so as long as the warmup material uses the same
    // VERT/FRAG strings as the per-slot materials, all subsequent
    // materials reuse the cached program. Without this, the FIRST case
    // page visit pays a ~50–200ms compile stall on first render —
    // visible as jank during the entrance animations.
    const warmupTexture = new THREE.Texture();
    warmupTexture.needsUpdate = true;
    const warmupMaterial = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      uniforms: {
        uMap: { value: warmupTexture },
        uTexSize: { value: new THREE.Vector2(1, 1) },
        uMeshSize: { value: new THREE.Vector2(1, 1) },
        uVelocity: { value: 0 },
        uLoaded: { value: 0 },
      },
    });
    const warmupMesh = new THREE.Mesh(geometry, warmupMaterial);
    // Position off-screen and at zero scale so even if a stray render
    // includes this mesh, it can't show up on screen.
    warmupMesh.position.set(-99999, 0, 0);
    warmupMesh.scale.set(0, 0, 0);
    scene.add(warmupMesh);
    // renderer.compile walks the scene and compiles every material's
    // program without actually drawing — the program enters Three's
    // cache so per-slot materials sharing the same shader source skip
    // compilation entirely. Dispose immediately; we only needed the
    // program in the cache.
    renderer.compile(scene, camera);
    scene.remove(warmupMesh);
    warmupMaterial.dispose();
    warmupTexture.dispose();

    const computeViewport = () => {
      state.vw = window.innerWidth;
      state.vh = window.innerHeight;
      renderer.setSize(state.vw, state.vh, false);
      camera.left = -state.vw / 2;
      camera.right = state.vw / 2;
      camera.top = state.vh / 2;
      camera.bottom = -state.vh / 2;
      camera.updateProjectionMatrix();
    };
    computeViewport();

    let lastScrollY = window.scrollY;
    let scrollVel = 0;
    let lastT = performance.now();
    let rafId = 0;

    const onResize = () => {
      computeViewport();
      // Viewport changed → slot positions/sizes likely shifted.
      _needRectUpdate = true;
    };
    window.addEventListener("resize", onResize);

    // Rect cache: re-populated only when _needRectUpdate is set (scroll,
    // resize, or slot rebuild). Avoids N getBoundingClientRect() forced
    // layouts per frame on otherwise-idle frames.
    let cachedRects: DOMRect[] = [];

    const tick = () => {
      // Hard bail when there are no slots (user is on home / about /
      // anywhere off /work/*). Skipping the body avoids the scroll
      // poll, scroll-vel ease, and any incidental work. Keep the rAF
      // alive so the next case page picks back up instantly.
      if (state.slots.length === 0 && _uploadQueue.length === 0) {
        lastT = performance.now();
        rafId = requestAnimationFrame(tick);
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 1 / 30);
      lastT = now;

      const sy = window.scrollY;
      const delta = sy - lastScrollY;
      if (delta !== 0) {
        _needRectUpdate = true;
        lastScrollY = sy;
      }
      const target = delta / 80;
      scrollVel += (target - scrollVel) * Math.min(0.25, dt * 12);

      if (_needRectUpdate) {
        cachedRects = state.slots.map((s) => s.dom.getBoundingClientRect());
        _needRectUpdate = false;
      }

      // Drain at most one texImage2D upload per frame. Spreads the GPU
      // upload cost (multiple MB per full-bleed image) across frames so
      // no single frame blows past 16ms during case-page mount.
      if (_uploadQueue.length > 0) {
        const next = _uploadQueue.shift();
        if (next && state.slots.includes(next.slot)) {
          const { slot, img } = next;
          slot.texture.image = img;
          slot.texture.needsUpdate = true;
          (slot.material.uniforms.uTexSize.value as THREE.Vector2).set(
            img.naturalWidth,
            img.naturalHeight
          );
          slot.loadedTarget = 1;
        }
      }

      for (let i = 0; i < state.slots.length; i++) {
        const slot = state.slots[i];
        const r = cachedRects[i];
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        slot.mesh.position.x = cx - state.vw / 2;
        slot.mesh.position.y = state.vh / 2 - cy;
        slot.mesh.scale.set(r.width, r.height, 1);
        (slot.material.uniforms.uMeshSize.value as THREE.Vector2).set(
          r.width,
          r.height
        );
        slot.material.uniforms.uVelocity.value = scrollVel;
        slot.loaded += (slot.loadedTarget - slot.loaded) * 0.12;
        slot.material.uniforms.uLoaded.value = slot.loaded;
      }

      // Skip the GPU draw when there are no slots to render — saves
      // a clear + present every frame while the user isn't on a case
      // study page.
      if (state.slots.length > 0) {
        renderer.render(scene, camera);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // Apply any registration that came in before this host's effect ran.
    if (_pending) {
      buildSlots(state, _pending.srcs, _pending.slotDoms);
      _pending = null;
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      state.slots.forEach((s) => {
        s.material.dispose();
        s.texture.dispose();
      });
      geometry.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      _state = null;
    };
  }, []);

  return null;
}
