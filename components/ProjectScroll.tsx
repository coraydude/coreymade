"use client";

import { MouseEvent as ReactMouseEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useTitle } from "./TitleProvider";
import { PROJECTS } from "@/lib/projects";

const COPIES = 3;
const NUM_CARDS = COPIES * PROJECTS.length;
const STEP_DEG = 360 / NUM_CARDS;

const RADIUS_VW = 76;
const PERSPECTIVE_PX = 2000;

function getInitialIdx(): number {
  if (typeof window === "undefined") return 0;
  const slug = window.__returnSlug;
  if (!slug) return 0;
  const idx = PROJECTS.findIndex((p) => p.slug === slug);
  return idx >= 0 ? idx : 0;
}

type LenisShape = {
  scroll: number;
  scrollTo: (
    t: number,
    o?: {
      duration?: number;
      easing?: (t: number) => number;
      immediate?: boolean;
      lock?: boolean;
    }
  ) => void;
  options?: { infinite?: boolean };
  virtualScroll?: {
    options?: { wheelMultiplier?: number; touchMultiplier?: number };
  };
};

export default function ProjectScroll() {
  const router = useRouter();
  const { setActiveProjectSlug } = useTitle();
  const [activeIdx, setActiveIdx] = useState(getInitialIdx);
  const [wasReturning] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!window.__returnSlug;
  });
  const liveCounterRef = useRef<HTMLSpanElement>(null);
  const liveCategoryRef = useRef<HTMLSpanElement>(null);
  const cylinderRef = useRef<HTMLDivElement>(null);
  const imgWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dispMapRef = useRef<SVGFEDisplacementMapElement>(null);
  const isNavigatingRef = useRef(false);

  const handleCardClick = (
    e: ReactMouseEvent<HTMLAnchorElement>,
    cardIdx: number,
    slug: string
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
      return;
    e.preventDefault();
    if (isNavigatingRef.current) return;

    const lenis = (window as unknown as { __lenis?: LenisShape }).__lenis;
    const vh = window.innerHeight;

    const doFadeAndNavigate = () => {
      const fadeEl = document.querySelector<HTMLElement>(
        "[data-carousel-fade]"
      );
      if (fadeEl) {
        gsap.to(fadeEl, {
          opacity: 0,
          y: 40,
          duration: 0.4,
          ease: "power2.in",
          onComplete: () => router.push(`/work/${slug}`),
        });
      } else {
        router.push(`/work/${slug}`);
      }
    };

    if (!lenis) {
      isNavigatingRef.current = true;
      doFadeAndNavigate();
      return;
    }

    const currentStep = lenis.scroll / vh;
    let diff = cardIdx - currentStep;
    diff =
      ((diff % NUM_CARDS) + NUM_CARDS * 1.5) % NUM_CARDS - NUM_CARDS / 2;

    isNavigatingRef.current = true;

    if (Math.abs(diff) < 0.5) {
      doFadeAndNavigate();
      return;
    }

    const targetScrollY = lenis.scroll + diff * vh;
    lenis.scrollTo(targetScrollY, {
      duration: 0.65,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });
    window.setTimeout(doFadeAndNavigate, 680);
  };

  useLayoutEffect(() => {
    if (!wasReturning) return;
    const fadeEl = document.querySelector<HTMLElement>(
      "[data-carousel-fade]"
    );
    if (!fadeEl) return;
    gsap.set(fadeEl, { opacity: 0, y: 40 });
    gsap.to(fadeEl, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power3.out",
      delay: 0.05,
    });
  }, [wasReturning]);

  useEffect(() => {
    setActiveProjectSlug(PROJECTS[activeIdx]?.slug ?? null);
  }, [activeIdx, setActiveProjectSlug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const lenis = (window as unknown as { __lenis?: LenisShape }).__lenis;

    const vs = lenis?.virtualScroll?.options;
    const prevWheel = vs?.wheelMultiplier ?? 1;
    const prevTouch = vs?.touchMultiplier ?? 1;
    const prevInfinite = lenis?.options?.infinite ?? false;

    if (lenis?.options) lenis.options.infinite = true;
    if (vs) {
      vs.wheelMultiplier = 0.4;
      vs.touchMultiplier = 0.55;
    }

    const slug = window.__returnSlug;
    if (slug) {
      delete window.__returnSlug;
      const idx = PROJECTS.findIndex((p) => p.slug === slug);
      if (idx >= 0 && lenis?.scrollTo) {
        lenis.scrollTo(idx * window.innerHeight, { immediate: true });
      }
    }

    let snapTimer: number | null = null;
    const scheduleSnap = () => {
      if (snapTimer !== null) window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        if (!lenis) return;
        const vh = window.innerHeight;
        const currentY = lenis.scroll;
        const snapY = Math.round(currentY / vh) * vh;
        if (Math.abs(snapY - currentY) > 1) {
          lenis.scrollTo(snapY, {
            duration: 1.1,
            easing: (t: number) => 1 - Math.pow(1 - t, 4),
          });
        }
      }, 180);
    };

    window.addEventListener("wheel", scheduleSnap, { passive: true });
    window.addEventListener("touchmove", scheduleSnap, { passive: true });

    return () => {
      window.removeEventListener("wheel", scheduleSnap);
      window.removeEventListener("touchmove", scheduleSnap);
      if (snapTimer !== null) window.clearTimeout(snapTimer);
      if (lenis?.options) lenis.options.infinite = prevInfinite;
      if (vs) {
        vs.wheelMultiplier = prevWheel;
        vs.touchMultiplier = prevTouch;
      }
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastBestIdx = -1;
    let debounceTimer: number | null = null;
    let prevScroll = 0;
    let prevTime = 0;
    let smoothedVel = 0;
    let smoothedStretch = 0;

    const tick = (now: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const lenis = (window as unknown as { __lenis?: { scroll: number } })
        .__lenis;
      const scrollY =
        typeof lenis?.scroll === "number" ? lenis.scroll : window.scrollY;

      const dt = prevTime > 0 ? Math.max((now - prevTime) / 1000, 1 / 120) : 1 / 60;
      const rawVel = prevTime > 0 ? (scrollY - prevScroll) / dt : 0;
      prevScroll = scrollY;
      prevTime = now;

      const velAlpha = 1 - Math.exp(-20 * dt);
      smoothedVel += (rawVel - smoothedVel) * velAlpha;

      const normVel = smoothedVel / vh;
      const stretchTarget = Math.min(Math.abs(normVel) * 0.25, 0.3);
      const stretchAlpha = 1 - Math.exp(-14 * dt);
      smoothedStretch += (stretchTarget - smoothedStretch) * stretchAlpha;

      const imgTransform = "scale(1.05, 1.05)";
      for (let i = 0; i < imgWrapRefs.current.length; i++) {
        const w = imgWrapRefs.current[i];
        if (w) w.style.transform = imgTransform;
      }

      if (dispMapRef.current) {
        const dispScale = smoothedStretch * 220;
        dispMapRef.current.setAttribute("scale", dispScale.toFixed(2));
      }

      const rotation = -(scrollY / vh) * STEP_DEG;
      const radiusPx = vw * (RADIUS_VW / 100);

      if (cylinderRef.current) {
        cylinderRef.current.style.transform = `translateZ(${-radiusPx}px) rotateY(${rotation}deg)`;
      }

      const step = Math.round(scrollY / vh);
      const bestIdx =
        (((step % NUM_CARDS) + NUM_CARDS) % NUM_CARDS) % PROJECTS.length;

      if (liveCounterRef.current) {
        liveCounterRef.current.textContent = `${String(bestIdx + 1).padStart(
          2,
          "0"
        )} / ${String(PROJECTS.length).padStart(2, "0")}`;
      }
      if (liveCategoryRef.current) {
        liveCategoryRef.current.textContent =
          PROJECTS[bestIdx]?.category ?? "";
      }

      if (bestIdx !== lastBestIdx) {
        lastBestIdx = bestIdx;
        if (debounceTimer !== null) window.clearTimeout(debounceTimer);
        const settled = bestIdx;
        debounceTimer = window.setTimeout(() => {
          setActiveIdx((prev) => (prev !== settled ? settled : prev));
        }, 80);
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    };
  }, []);

  return (
    <>
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        style={{ position: "absolute", pointerEvents: "none" }}
      >
        <defs>
          <filter
            id="carousel-displace"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves={2}
              seed={3}
              result="noise"
            />
            <feDisplacementMap
              ref={dispMapRef}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div className="fixed top-24 left-6 md:left-10 right-6 md:right-10 flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] text-muted pointer-events-none z-20">
        <span>On loop — Selected work</span>
        <span className="hidden md:inline">Scroll to rotate</span>
      </div>

      <div className="fixed bottom-7 left-6 md:left-10 right-6 md:right-10 flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] text-muted pointer-events-none z-20">
        <span ref={liveCounterRef}>
          {String(activeIdx + 1).padStart(2, "0")} /{" "}
          {String(PROJECTS.length).padStart(2, "0")}
        </span>
        <span ref={liveCategoryRef}>{PROJECTS[activeIdx]?.category}</span>
      </div>

      <nav
        aria-label="Projects"
        className="fixed top-1/2 right-6 md:right-10 -translate-y-1/2 z-20 flex flex-col gap-1"
        style={{ lineHeight: 1.5 }}
      >
        {PROJECTS.map((p, i) => {
          const isActive = i === activeIdx;
          return (
            <a
              key={p.slug}
              href={`/work/${p.slug}`}
              data-cursor="View"
              onMouseEnter={() => {
                const lenis = (window as unknown as { __lenis?: LenisShape })
                  .__lenis;
                if (!lenis) return;
                const vh = window.innerHeight;
                const currentStep = lenis.scroll / vh;
                let diff = i - currentStep;
                diff =
                  ((diff % PROJECTS.length) + PROJECTS.length * 1.5) %
                    PROJECTS.length -
                  PROJECTS.length / 2;
                const targetScrollY = lenis.scroll + diff * vh;
                lenis.scrollTo(targetScrollY, {
                  duration: 0.6,
                  easing: (t: number) => 1 - Math.pow(1 - t, 3),
                });
              }}
              onClick={(e) => handleCardClick(e, i, p.slug)}
              className="block text-right no-underline cursor-pointer"
              style={{
                fontSize: "13px",
                color: "currentColor",
                opacity: isActive ? 1 : 0.45,
                fontWeight: isActive ? 600 : 400,
                transform: isActive ? "translateX(-6px)" : "translateX(0)",
                transition:
                  "opacity .2s ease, transform .2s cubic-bezier(.215,.61,.355,1), font-weight .2s ease",
                letterSpacing: "0.02em",
              }}
            >
              {p.title}
            </a>
          );
        })}
      </nav>

      <div
        data-carousel-fade
        className="fixed inset-0 overflow-hidden"
        style={{
          zIndex: 5,
          perspective: `${PERSPECTIVE_PX}px`,
          perspectiveOrigin: "center",
        }}
      >
        <div
          ref={cylinderRef}
          className="absolute left-1/2 top-[calc(50%+11vw+16px)] md:top-[calc(50%+7vw+16px)]"
          style={{
            transformStyle: "preserve-3d",
            willChange: "transform",
          }}
        >
          {Array.from({ length: NUM_CARDS }).map((_, i) => {
            const p = PROJECTS[i % PROJECTS.length];
            const cardAngle = i * STEP_DEG;
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  width: "36vw",
                  height: "20.25vw",
                  marginLeft: "-18vw",
                  marginTop: "-10.125vw",
                  backfaceVisibility: "hidden",
                  transform: `rotateY(${cardAngle}deg) translateZ(${RADIUS_VW}vw)`,
                }}
              >
                <a
                  href={`/work/${p.slug}`}
                  onClick={(e) => handleCardClick(e, i, p.slug)}
                  data-cursor="View"
                  className="block w-full h-full"
                >
                  <div className="relative w-full h-full overflow-hidden">
                    <div
                      ref={(el) => {
                        imgWrapRefs.current[i] = el;
                      }}
                      className="absolute inset-0"
                      style={{
                        willChange: "transform",
                        filter: "url(#carousel-displace)",
                      }}
                    >
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        sizes="36vw"
                        className="object-cover"
                        priority={i < PROJECTS.length}
                      />
                    </div>
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative">
        {Array.from({ length: NUM_CARDS + 1 }).map((_, i) => (
          <section key={i} className="h-svh w-full" data-section-idx={i} />
        ))}
      </div>
    </>
  );
}
