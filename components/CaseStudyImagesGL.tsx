"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  srcs: string[];
  alt?: string;
};

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
  state.canvas.style.opacity = "1";

  const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const resolveImageSrc = (src: string) =>
    src.startsWith("http") ? src : `${BASE_PATH}${src}`;

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

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      texture.image = img;
      texture.needsUpdate = true;
      (material.uniforms.uTexSize.value as THREE.Vector2).set(
        img.naturalWidth,
        img.naturalHeight
      );
      slot.loadedTarget = 1;
    };
    img.src = resolveImageSrc(src);
  });
}

export default function CaseStudyImagesGL({ srcs, alt }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const glRef = useRef<GLState | null>(null);
  // Always points at the latest srcs prop — used by the deferred init so
  // it can build the right slots even if the component re-rendered with
  // a different project before init landed.
  const srcsRef = useRef(srcs);
  srcsRef.current = srcs;

  // Setup once, deferred ~250ms after mount so the WebGL renderer
  // creation + shader compile (~30–50ms blocking) doesn't land on the
  // same frame as PersistentTitle's char-rise animation. Without the
  // defer, GSAP has to jump that animation forward by a frame's worth of
  // blocked progress, which reads as jank at the start.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const initTimer = window.setTimeout(() => {
      if (cancelled) return;
      cleanup = init();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(initTimer);
      cleanup?.();
    };

    function init(): () => void {
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
      glRef.current = state;

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

      const onResize = () => computeViewport();
      window.addEventListener("resize", onResize);

      const tick = () => {
        const now = performance.now();
        const dt = Math.min((now - lastT) / 1000, 1 / 30);
        lastT = now;

        const sy = window.scrollY;
        const delta = sy - lastScrollY;
        lastScrollY = sy;
        const target = delta / 80;
        scrollVel += (target - scrollVel) * Math.min(0.25, dt * 12);

        for (const slot of state.slots) {
          const r = slot.dom.getBoundingClientRect();
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

        renderer.render(scene, camera);
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);

      // Build the slots for the currently-mounted project. The [srcs]
      // effect below will rebuild them if srcs has changed during the
      // 250ms defer.
      buildSlots(state, srcsRef.current, slotRefs.current);

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
        glRef.current = null;
      };
    }
  }, []);

  // Swap textured planes when srcs change. No-op until the deferred
  // setup has run (in which case the init itself builds the first
  // slots).
  useEffect(() => {
    const state = glRef.current;
    if (!state) return;
    buildSlots(state, srcs, slotRefs.current);
  }, [srcs]);

  return (
    <div ref={wrapRef} className="px-6 md:px-10 space-y-6 md:space-y-10">
      {srcs.map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            slotRefs.current[i] = el;
          }}
          aria-label={alt ? `${alt} — image ${i + 1}` : undefined}
          className="relative w-full max-w-[1600px] mx-auto"
          style={{ aspectRatio: "16 / 9" }}
        />
      ))}
    </div>
  );
}
