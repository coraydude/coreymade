"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import CarouselCardLink from "./CarouselCardLink";
import MagneticWarpLayer from "./MagneticWarpLayer";
import { useTitle } from "./TitleProvider";
import { PROJECTS } from "@/lib/projects";

const TRIPLED = [...PROJECTS, ...PROJECTS, ...PROJECTS];
const N_CARDS = TRIPLED.length;
const ANGLE_STEP = 360 / N_CARDS;

declare global {
  interface Window {
    __carouselState?: {
      currentX: number;
      targetX: number;
      activeSlug?: string;
    };
    __returnSlug?: string;
  }
}

function resolveIntendedSlug(): string | null {
  if (typeof window === "undefined") return null;
  if (window.__returnSlug) return window.__returnSlug;
  if (window.__carouselState?.activeSlug) {
    return window.__carouselState.activeSlug;
  }
  return null;
}

function getInitialActiveIdx(): number {
  const slug = resolveIntendedSlug();
  if (!slug) return 0;
  const idx = PROJECTS.findIndex((p) => p.slug === slug);
  return idx >= 0 ? idx : 0;
}

export default function ProjectCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const carouselAreaRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const debounceTimerRef = useRef<number | null>(null);
  const liveCounterRef = useRef<HTMLSpanElement>(null);
  const activeWarpCardRef = useRef<HTMLDivElement | null>(null);
  const activeWarpSrcRef = useRef<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(getInitialActiveIdx);
  const activeIdxRef = useRef(activeIdx);
  const { setActiveProjectSlug } = useTitle();

  const getActiveWarpRect = useCallback(
    () => activeWarpCardRef.current?.getBoundingClientRect() ?? null,
    []
  );
  const getActiveWarpSrc = useCallback(
    () => activeWarpSrcRef.current,
    []
  );

  useEffect(() => {
    activeIdxRef.current = activeIdx;
    setActiveProjectSlug(PROJECTS[activeIdx]?.slug ?? null);
  }, [activeIdx, setActiveProjectSlug]);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const carouselArea = carouselAreaRef.current;
    if (!section || !track || !carouselArea) return;

    let cardWidth = 0;
    let cardHeight = 0;
    let radius = 0;

    let targetX = 0;
    let currentX = 0;
    let velocity = 0;
    let isDragging = false;
    let dragStartPointerX = 0;
    let dragStartTargetX = 0;
    let dragMoved = 0;
    let lastPointerX = 0;
    let lastPointerTime = 0;
    let suppressClickUntil = 0;
    let lastBestRealIdx = -1;
    let pointerCaptured = false;
    const DRAG_THRESHOLD = 5;

    let prevCurrentX = NaN;
    let titleVisible = true;
    let lastMovingAt = 0;
    let wheelEnergy = 0;

    const measure = () => {
      const rect = carouselArea.getBoundingClientRect();
      const areaH = rect.height;
      const areaW = rect.width;
      cardWidth = Math.max(180, Math.min(areaW * 0.18, 300));
      cardHeight = cardWidth * 1.33;
      if (cardHeight > areaH * 0.86) {
        cardHeight = areaH * 0.86;
        cardWidth = cardHeight / 1.33;
      }
      const angleRad = Math.PI / N_CARDS;
      radius = (cardWidth / (2 * Math.tan(angleRad))) * 1.1;

      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardHeight}px`;
        card.style.left = `${-cardWidth / 2}px`;
        card.style.top = `${-cardHeight / 2}px`;
        card.style.transform = `rotateY(${i * ANGLE_STEP}deg) translateZ(${radius}px)`;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(carouselArea);

    const savedState = window.__carouselState;
    if (savedState && cardWidth > 0) {
      currentX = savedState.currentX;
      targetX = savedState.targetX;
      delete window.__carouselState;
      const angleNow = -(currentX / cardWidth) * ANGLE_STEP;
      track.style.transform = `rotateY(${angleNow.toFixed(3)}deg)`;
    }

    const returnSlug = window.__returnSlug;
    const isReturn = !!returnSlug || !!savedState;
    if (returnSlug) {
      delete window.__returnSlug;
      if (!savedState && cardWidth > 0) {
        const projectIdx = PROJECTS.findIndex(
          (p) => p.slug === returnSlug
        );
        if (projectIdx >= 0) {
          targetX = projectIdx * cardWidth;
          currentX = projectIdx * cardWidth;
          const angleNow = -(currentX / cardWidth) * ANGLE_STEP;
          track.style.transform = `rotateX(14deg) rotateY(${angleNow.toFixed(3)}deg)`;
        }
      }
    }

    if (isReturn) {
      const fadeEl = carouselAreaRef.current;
      if (fadeEl) {
        fadeEl.style.opacity = "0";
        fadeEl.style.transform = "translateY(40px)";
        gsap.to(fadeEl, {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power3.out",
          delay: 0.65,
        });
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      targetX -= delta;
      velocity = 0;
      wheelEnergy = Math.min(wheelEnergy + Math.abs(delta), 1500);
    };

    const onPointerLeave = () => {
      if (isDragging) endDrag();
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStartPointerX = e.clientX;
      dragStartTargetX = targetX;
      dragMoved = 0;
      lastPointerX = e.clientX;
      lastPointerTime = performance.now();
      velocity = 0;
      pointerCaptured = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartPointerX;
      dragMoved = Math.max(dragMoved, Math.abs(dx));

      if (!pointerCaptured && Math.abs(dx) > DRAG_THRESHOLD) {
        try {
          section.setPointerCapture(e.pointerId);
          pointerCaptured = true;
        } catch {}
      }

      if (pointerCaptured) {
        targetX = dragStartTargetX + dx;
        const now = performance.now();
        const dt = Math.max(now - lastPointerTime, 1);
        velocity = ((e.clientX - lastPointerX) / dt) * 16;
        lastPointerX = e.clientX;
        lastPointerTime = now;
      }
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      if (dragMoved > DRAG_THRESHOLD) suppressClickUntil = performance.now() + 250;
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

    const onClickCapture = (e: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    section.addEventListener("wheel", onWheel, { passive: false });
    section.addEventListener("pointerleave", onPointerLeave);
    section.addEventListener("pointerdown", onPointerDown);
    section.addEventListener("pointermove", onPointerMove);
    section.addEventListener("pointerup", onPointerUp);
    section.addEventListener("pointercancel", onPointerUp);
    section.addEventListener("click", onClickCapture, true);

    let rafId = 0;
    const tick = () => {
      if (cardWidth > 0) {
        if (!isDragging && Math.abs(velocity) > 0.05) {
          targetX += velocity;
          velocity *= 0.85;
        } else if (!isDragging) {
          velocity = 0;
        }

        if (!isDragging && Math.abs(velocity) < 0.5) {
          const snap = Math.round(targetX / cardWidth) * cardWidth;
          targetX += (snap - targetX) * 0.14;
        }

        currentX += (targetX - currentX) * 0.18;

        const currentAngle = -(currentX / cardWidth) * ANGLE_STEP;
        track.style.transform = `rotateX(14deg) rotateY(${currentAngle.toFixed(3)}deg)`;

        let bestDist = Infinity;
        let bestRealIdx = 0;
        let bestI = 0;
        for (let i = 0; i < cardRefs.current.length; i++) {
          const card = cardRefs.current[i];
          if (!card) continue;
          let effective = (currentAngle + i * ANGLE_STEP) % 360;
          if (effective > 180) effective -= 360;
          if (effective < -180) effective += 360;
          const distFromFront = Math.abs(effective);

          if (distFromFront > 95) {
            card.style.opacity = "0";
            card.style.pointerEvents = "none";
            card.style.setProperty("--card-gray", "1");
            card.style.setProperty("--card-dim", "1");
          } else {
            card.style.opacity = "1";
            card.style.pointerEvents = distFromFront < 30 ? "auto" : "none";
            const t = Math.min(distFromFront / 18, 1);
            card.style.setProperty("--card-gray", t.toFixed(3));
            card.style.setProperty("--card-dim", (1 - t * 0.8).toFixed(3));
          }

          if (distFromFront < bestDist) {
            bestDist = distFromFront;
            bestRealIdx = i % PROJECTS.length;
            bestI = i;
          }
        }

        if (bestDist < 8) {
          activeWarpCardRef.current = cardRefs.current[bestI] ?? null;
          activeWarpSrcRef.current = PROJECTS[bestRealIdx]?.image ?? null;
        } else {
          activeWarpCardRef.current = null;
        }

        if (liveCounterRef.current) {
          liveCounterRef.current.textContent = `${String(bestRealIdx + 1).padStart(2, "0")} / ${String(PROJECTS.length).padStart(2, "0")}`;
        }

        const isFirstFrame = Number.isNaN(prevCurrentX);
        const deltaThisFrame = isFirstFrame
          ? 0
          : Math.abs(currentX - prevCurrentX);
        prevCurrentX = currentX;
        wheelEnergy *= 0.88;
        const isFastScroll =
          wheelEnergy > 300 || Math.abs(velocity) > 30;
        const isAnyMotion =
          isDragging || Math.abs(velocity) > 0.1 || deltaThisFrame > 0.3;
        const now = performance.now();
        const titleEl = document.querySelector<HTMLElement>(
          "[data-persistent-title]"
        );
        if (isFastScroll) {
          lastMovingAt = now;
          if (titleVisible && titleEl) {
            titleVisible = false;
            gsap.killTweensOf(titleEl);
            gsap.to(titleEl, {
              opacity: 0,
              duration: 0.22,
              ease: "power2.out",
            });
          }
        } else if (isAnyMotion) {
          lastMovingAt = now;
        } else if (
          !titleVisible &&
          titleEl &&
          now - lastMovingAt > 180
        ) {
          titleVisible = true;
          gsap.killTweensOf(titleEl);
          gsap.to(titleEl, {
            opacity: 1,
            duration: 0.45,
            ease: "power2.out",
          });
        }

        if (bestRealIdx !== lastBestRealIdx) {
          lastBestRealIdx = bestRealIdx;
          if (debounceTimerRef.current !== null) {
            window.clearTimeout(debounceTimerRef.current);
          }
          const settledIdx = bestRealIdx;
          debounceTimerRef.current = window.setTimeout(() => {
            setActiveIdx((prev) => (prev !== settledIdx ? settledIdx : prev));
          }, 160);
        }
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      section.removeEventListener("wheel", onWheel);
      section.removeEventListener("pointerleave", onPointerLeave);
      section.removeEventListener("pointerdown", onPointerDown);
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerup", onPointerUp);
      section.removeEventListener("pointercancel", onPointerUp);
      section.removeEventListener("click", onClickCapture, true);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      if (cardWidth > 0) {
        window.__carouselState = {
          currentX,
          targetX,
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
      className="relative w-full h-[100svh] border-t border-rule select-none touch-pan-y overflow-hidden flex flex-col"
    >
        <div className="px-6 md:px-10 pt-7 pb-3 flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] text-muted pointer-events-none">
          <span>On loop — Selected work</span>
          <span className="hidden md:inline">Drag or scroll to discover</span>
        </div>

        <div className="flex-[0_0_30%]" />

        <div
          ref={carouselAreaRef}
          data-carousel-fade
          className="flex-1 relative"
          style={{ perspective: "2400px", willChange: "opacity, transform" }}
        >
          <div
            ref={trackRef}
            className="absolute will-change-transform"
            style={{
              left: "50%",
              top: "calc(50% + 200px)",
              width: 0,
              height: 0,
              transformStyle: "preserve-3d",
            }}
          >
            {TRIPLED.map((p, i) => (
              <div
                key={i}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="absolute will-change-transform"
                style={{
                  opacity: 0,
                  backfaceVisibility: "hidden",
                }}
              >
                <CarouselCardLink
                  href={`/work/${p.slug}`}
                  data-cursor="View Project"
                  className="block absolute inset-0 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
                  draggable={false}
                  onMouseEnter={(e) => {
                    const t = e.currentTarget;
                    gsap.killTweensOf(t, "--spot-r");
                    gsap.to(t, {
                      "--spot-r": "180px",
                      duration: 0.7,
                      ease: "expo.out",
                    });
                  }}
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - r.left;
                    const y = e.clientY - r.top;
                    e.currentTarget.style.setProperty("--spot-x", `${x}px`);
                    e.currentTarget.style.setProperty("--spot-y", `${y}px`);
                  }}
                  onMouseLeave={(e) => {
                    const t = e.currentTarget;
                    gsap.killTweensOf(t, "--spot-r");
                    gsap.to(t, {
                      "--spot-r": "0px",
                      duration: 0.55,
                      ease: "expo.in",
                    });
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      filter: "grayscale(var(--card-gray, 1))",
                      opacity: "var(--card-dim, 0.5)",
                      transition: "filter 0.3s linear, opacity 0.3s linear",
                    }}
                  >
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      sizes="40vw"
                      className="object-cover pointer-events-none"
                      draggable={false}
                    />
                  </div>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      WebkitMaskImage:
                        "radial-gradient(circle var(--spot-r, 0px) at var(--spot-x, 50%) var(--spot-y, 50%), #000 0%, #000 55%, transparent 100%)",
                      maskImage:
                        "radial-gradient(circle var(--spot-r, 0px) at var(--spot-x, 50%) var(--spot-y, 50%), #000 0%, #000 55%, transparent 100%)",
                    }}
                  >
                    <Image
                      src={p.image}
                      alt=""
                      fill
                      sizes="40vw"
                      className="object-cover pointer-events-none"
                      draggable={false}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
                </CarouselCardLink>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 md:px-10 pt-3 pb-7 flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] text-muted pointer-events-none">
          <span ref={liveCounterRef}>
            {String(activeIdx + 1).padStart(2, "0")} /{" "}
            {String(PROJECTS.length).padStart(2, "0")}
          </span>
          <span>{PROJECTS[activeIdx]?.category}</span>
        </div>

        <MagneticWarpLayer
          getActiveRect={getActiveWarpRect}
          getImageSrc={getActiveWarpSrc}
          preloadSrcs={PROJECTS.map((p) => p.image)}
        />
    </section>
  );
}
