"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import CarouselCardLink from "./CarouselCardLink";
import { useTitle } from "./TitleProvider";
import { PROJECTS } from "@/lib/projects";

const COPIES = 3;
const CARDS = Array.from(
  { length: COPIES * PROJECTS.length },
  (_, i) => ({ project: PROJECTS[i % PROJECTS.length], i })
);
const ANGLE_DEG = 22;

declare global {
  interface Window {
    __diagonalState?: {
      offset: number;
      activeSlug?: string;
    };
  }
}

function resolveIntendedSlug(): string | null {
  if (typeof window === "undefined") return null;
  if (window.__returnSlug) return window.__returnSlug;
  if (window.__diagonalState?.activeSlug) return window.__diagonalState.activeSlug;
  return null;
}

function getInitialActiveIdx(): number {
  const slug = resolveIntendedSlug();
  if (!slug) return 0;
  const idx = PROJECTS.findIndex((p) => p.slug === slug);
  return idx >= 0 ? idx : 0;
}

const FILTER_ID = "diagonal-displace";
const BULGE_ID = "diagonal-bulge";

export default function DiagonalCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardImageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const liveCounterRef = useRef<HTMLSpanElement>(null);
  const dispMapRef = useRef<SVGFEDisplacementMapElement>(null);
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const bulgeTurbRef = useRef<SVGFETurbulenceElement>(null);
  const bulgeMapRef = useRef<SVGFEDisplacementMapElement>(null);
  const activeCardElRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(getInitialActiveIdx);
  const activeIdxRef = useRef(activeIdx);
  const debounceTimerRef = useRef<number | null>(null);
  const { setActiveProjectSlug } = useTitle();

  useEffect(() => {
    activeIdxRef.current = activeIdx;
    setActiveProjectSlug(PROJECTS[activeIdx]?.slug ?? null);
  }, [activeIdx, setActiveProjectSlug]);


  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    let cardW = 0;
    let cardH = 0;
    let spacing = 0;
    let cycle = 0;
    let centerX = 0;
    let centerY = 0;
    let dx = 0;
    let dy = 0;

    let offset = 0;
    let targetOffset = 0;
    let velocity = 0;
    let isDragging = false;
    let dragStartPointer: [number, number] = [0, 0];
    let dragStartOffset = 0;
    let pointerCaptured = false;
    let suppressClickUntil = 0;
    let lastBestProjectIdx = -1;
    const DRAG_THRESHOLD = 5;

    const measure = () => {
      const rect = section.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      centerX = W / 2;
      centerY = H / 2;

      const maxCardH = H * 0.62;
      const maxCardW = W * 0.34;
      cardH = Math.min(maxCardH, (maxCardW * 4) / 3);
      cardW = (cardH * 3) / 4;

      spacing = cardH * 0.92;
      cycle = CARDS.length * spacing;

      const rad = (ANGLE_DEG * Math.PI) / 180;
      dx = -Math.cos(rad);
      dy = Math.sin(rad);

      cardRefs.current.forEach((card) => {
        if (!card) return;
        card.style.width = `${cardW}px`;
        card.style.height = `${cardH}px`;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(section);

    const saved = window.__diagonalState;
    if (saved) {
      offset = saved.offset;
      targetOffset = saved.offset;
      delete window.__diagonalState;
    }

    const returnSlug = window.__returnSlug;
    if (returnSlug) {
      delete window.__returnSlug;
      const projectIdx = PROJECTS.findIndex((p) => p.slug === returnSlug);
      if (projectIdx >= 0 && !saved) {
        offset = -projectIdx * spacing;
        targetOffset = offset;
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStartPointer = [e.clientX, e.clientY];
      dragStartOffset = targetOffset;
      pointerCaptured = false;
      velocity = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dxp = e.clientX - dragStartPointer[0];
      const dyp = e.clientY - dragStartPointer[1];
      const distMoved = Math.sqrt(dxp * dxp + dyp * dyp);

      if (!pointerCaptured && distMoved > DRAG_THRESHOLD) {
        try {
          section.setPointerCapture(e.pointerId);
          pointerCaptured = true;
        } catch {}
      }

      if (pointerCaptured) {
        const along = dxp * dx + dyp * dy;
        const now = performance.now();
        const prevTarget = targetOffset;
        targetOffset = dragStartOffset + along;
        velocity = (targetOffset - prevTarget) * 0.5;
        void now;
      }
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      const moved = Math.abs(targetOffset - dragStartOffset);
      if (moved > DRAG_THRESHOLD) suppressClickUntil = performance.now() + 250;
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
      targetOffset += delta;
      velocity = 0;
    };

    const onClickCapture = (e: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    section.addEventListener("wheel", onWheel, { passive: false });
    section.addEventListener("pointerdown", onPointerDown);
    section.addEventListener("pointermove", onPointerMove);
    section.addEventListener("pointerup", onPointerUp);
    section.addEventListener("pointercancel", onPointerUp);
    section.addEventListener("pointerleave", onPointerLeave);
    section.addEventListener("click", onClickCapture, true);

    let rafId = 0;
    let prevOffset = 0;
    let displacementCurrent = 0;
    let turbPanX = 0;
    let turbPanY = 0;
    let prevBulgeI = -1;

    const baseFilter = `grayscale(var(--card-gray, 1)) url(#${FILTER_ID})`;
    const bulgeFilter = `grayscale(var(--card-gray, 1)) url(#${FILTER_ID}) url(#${BULGE_ID})`;

    let bulgeScaleTarget = 0;
    let bulgeScaleCurrent = 0;
    let bulgePhase = 0;

    const onCardPointerMove = (e: PointerEvent) => {
      const active = activeCardElRef.current;
      if (!active) {
        bulgeScaleTarget = 0;
        return;
      }
      const rect = active.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      bulgeScaleTarget = inside ? 18 : 0;
    };
    const onCardPointerLeave = () => {
      bulgeScaleTarget = 0;
    };

    section.addEventListener("pointermove", onCardPointerMove);
    section.addEventListener("pointerleave", onCardPointerLeave);
    const tick = () => {
      if (cycle > 0) {
        if (!isDragging && Math.abs(velocity) > 0.05) {
          targetOffset += velocity;
          velocity *= 0.9;
        }

        if (!isDragging && Math.abs(velocity) < 0.5) {
          const snap = Math.round(targetOffset / spacing) * spacing;
          targetOffset += (snap - targetOffset) * 0.12;
        }

        offset += (targetOffset - offset) * 0.14;

        const displayedVel = Math.abs(offset - prevOffset);
        prevOffset = offset;
        const targetDisp = Math.min(displayedVel * 1.2, 60);
        displacementCurrent += (targetDisp - displacementCurrent) * 0.18;
        if (dispMapRef.current) {
          dispMapRef.current.setAttribute(
            "scale",
            displacementCurrent.toFixed(1)
          );
        }
        void turbPanX;
        void turbPanY;
        void turbRef;

        let bestDist = Infinity;
        let bestI = 0;
        let bestProjectIdx = 0;

        for (let i = 0; i < cardRefs.current.length; i++) {
          const card = cardRefs.current[i];
          if (!card) continue;

          let t = i * spacing + offset;
          t = ((t % cycle) + cycle) % cycle;
          if (t > cycle / 2) t -= cycle;

          const x = centerX + t * dx;
          const y = centerY + t * dy;

          const dist = Math.abs(t);
          const scaleFalloff = Math.min(dist / (spacing * 1.4), 1);
          const scale = 1 - scaleFalloff * 0.35;

          card.style.transform = `translate3d(${(x - cardW / 2).toFixed(2)}px, ${(y - cardH / 2).toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
          card.style.transformOrigin = "center center";

          if (dist < bestDist) {
            bestDist = dist;
            bestI = i;
            bestProjectIdx = i % PROJECTS.length;
            activeCardElRef.current = card;
          }

          const fadeT = Math.min(dist / (cardH * 1.4), 1);
          const opacity = 1 - fadeT * 0.7;
          card.style.opacity = opacity.toFixed(3);
          card.style.zIndex = String(1000 - Math.round(dist / 4));
          card.style.setProperty("--card-gray", fadeT.toFixed(3));
          card.style.setProperty("--card-dim", (1 - fadeT * 0.55).toFixed(3));
        }

        void bestI;

        bulgeScaleCurrent += (bulgeScaleTarget - bulgeScaleCurrent) * 0.15;
        if (bulgeMapRef.current) {
          bulgeMapRef.current.setAttribute(
            "scale",
            bulgeScaleCurrent.toFixed(1)
          );
        }
        void bulgePhase;

        const lockedI = bestDist < cardH * 0.45 ? bestI : -1;
        if (lockedI !== prevBulgeI) {
          if (prevBulgeI >= 0) {
            const prev = cardImageRefs.current[prevBulgeI];
            if (prev) prev.style.filter = baseFilter;
          }
          if (lockedI >= 0) {
            const next = cardImageRefs.current[lockedI];
            if (next) next.style.filter = bulgeFilter;
          }
          prevBulgeI = lockedI;
        }

        if (liveCounterRef.current) {
          liveCounterRef.current.textContent = `${String(bestProjectIdx + 1).padStart(2, "0")} / ${String(PROJECTS.length).padStart(2, "0")}`;
        }

        if (bestProjectIdx !== lastBestProjectIdx) {
          lastBestProjectIdx = bestProjectIdx;
          if (debounceTimerRef.current !== null) {
            window.clearTimeout(debounceTimerRef.current);
          }
          const settled = bestProjectIdx;
          debounceTimerRef.current = window.setTimeout(() => {
            setActiveIdx((prev) => (prev !== settled ? settled : prev));
          }, 180);
        }
      }
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
      section.removeEventListener("pointermove", onCardPointerMove);
      section.removeEventListener("pointerleave", onCardPointerLeave);
      section.removeEventListener("click", onClickCapture, true);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      if (cycle > 0) {
        window.__diagonalState = {
          offset,
          activeSlug: PROJECTS[activeIdxRef.current]?.slug,
        };
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-cursor="Drag"
      data-lenis-prevent
      className="relative w-full h-[100svh] border-t border-rule overflow-hidden select-none touch-none"
    >
      <svg
        aria-hidden="true"
        className="absolute w-0 h-0 pointer-events-none"
        style={{ position: "absolute" }}
      >
        <defs>
          <filter
            id={FILTER_ID}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="1"
              seed="3"
              result="turb"
            />
            <feDisplacementMap
              ref={dispMapRef}
              in="SourceGraphic"
              in2="turb"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter
            id={BULGE_ID}
            x="-15%"
            y="-15%"
            width="130%"
            height="130%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={bulgeTurbRef}
              type="fractalNoise"
              baseFrequency="0.006 0.008"
              numOctaves="1"
              seed="7"
              result="bulgeTurb"
            />
            <feDisplacementMap
              ref={bulgeMapRef}
              in="SourceGraphic"
              in2="bulgeTurb"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div className="absolute top-24 left-6 md:left-10 right-6 md:right-10 flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] text-muted pointer-events-none z-10">
        <span>On loop — Selected work</span>
        <span className="hidden md:inline">Drag or scroll to explore</span>
      </div>

      <div
        ref={trackRef}
        data-carousel-fade
        className="absolute inset-0"
        style={{ willChange: "opacity, transform" }}
      >
        {CARDS.map(({ project: p }, i) => (
          <div
            key={i}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="absolute top-0 left-0 will-change-transform"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CarouselCardLink
              href={`/work/${p.slug}`}
              data-cursor="View Project"
              className="block absolute inset-0 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
              draggable={false}
            >
              <div
                ref={(el) => {
                  cardImageRefs.current[i] = el;
                }}
                className="absolute inset-0"
                style={{
                  filter: `grayscale(var(--card-gray, 1)) url(#${FILTER_ID})`,
                  opacity: "var(--card-dim, 0.5)",
                  transition: "opacity 0.25s linear",
                }}
              >
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="35vw"
                  className="object-cover pointer-events-none"
                  draggable={false}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35 pointer-events-none" />
            </CarouselCardLink>
          </div>
        ))}
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
