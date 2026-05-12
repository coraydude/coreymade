"use client";

import { useCallback, useEffect, useRef, useState, MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import MagneticWarpLayer from "./MagneticWarpLayer";
import { useTitle } from "./TitleProvider";
import { PROJECTS } from "@/lib/projects";

declare global {
  interface Window {
    __indexReturnSlug?: string;
  }
}

function getInitialFocusedIdx(): number {
  if (typeof window === "undefined") return 0;
  const slug = window.__returnSlug || window.__indexReturnSlug;
  if (!slug) return 0;
  const idx = PROJECTS.findIndex((p) => p.slug === slug);
  return idx >= 0 ? idx : 0;
}

export default function ProjectIndex() {
  const sectionRef = useRef<HTMLElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const focusedIdxRef = useRef<number>(getInitialFocusedIdx());
  const [focusedIdx, setFocusedIdx] = useState<number>(getInitialFocusedIdx);
  const [hovering, setHovering] = useState(false);
  const { setActiveProjectSlug } = useTitle();
  const router = useRouter();

  useEffect(() => {
    focusedIdxRef.current = focusedIdx;
    setActiveProjectSlug(PROJECTS[focusedIdx]?.slug ?? null);
  }, [focusedIdx, setActiveProjectSlug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__returnSlug) {
      const idx = PROJECTS.findIndex((p) => p.slug === window.__returnSlug);
      if (idx >= 0) setFocusedIdx(idx);
      delete window.__returnSlug;
    }
  }, []);

  useEffect(() => {
    const fadeEl = document.querySelector<HTMLElement>("[data-carousel-fade]");
    if (!fadeEl) return;
    gsap.fromTo(
      fadeEl,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        delay: 0.15,
      }
    );
  }, []);

  useEffect(() => {
    const pt = document.querySelector<HTMLElement>("[data-persistent-title]");
    if (!pt) return;
    gsap.killTweensOf(pt, "opacity");
    gsap.to(pt, { opacity: 0, duration: 0.3, ease: "power2.out" });
    return () => {
      const ptOut = document.querySelector<HTMLElement>("[data-persistent-title]");
      if (!ptOut) return;
      gsap.killTweensOf(ptOut, "opacity");
      gsap.to(ptOut, { opacity: 1, duration: 0.35, ease: "power2.out" });
    };
  }, []);

  useEffect(() => {
    const indicator = indicatorRef.current;
    const row = rowRefs.current[focusedIdx];
    if (!indicator || !row) return;
    const parent = row.offsetParent as HTMLElement | null;
    if (!parent) return;
    const rowRect = row.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const top = rowRect.top - parentRect.top;
    const height = rowRect.height;
    gsap.to(indicator, {
      top,
      height,
      duration: 0.55,
      ease: "expo.out",
    });
  }, [focusedIdx]);

  const getPreviewRect = useCallback(
    () => previewBoxRef.current?.getBoundingClientRect() ?? null,
    []
  );
  const getPreviewSrc = useCallback(
    () => PROJECTS[focusedIdxRef.current]?.image ?? null,
    []
  );

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setActiveProjectSlug(slug);
    const fadeEl = document.querySelector<HTMLElement>("[data-carousel-fade]");
    if (fadeEl) {
      gsap.to(fadeEl, {
        opacity: 0,
        y: 30,
        duration: 0.45,
        ease: "power2.in",
        onComplete: () => router.push(`/work/${slug}`),
      });
    } else {
      router.push(`/work/${slug}`);
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[100svh] border-t border-rule pt-28 pb-20"
    >
      <div className="px-6 md:px-10 flex items-baseline justify-between text-[12px] uppercase tracking-[0.18em] text-muted mb-10">
        <span>On loop — Selected work</span>
        <span>
          {String(focusedIdx + 1).padStart(2, "0")} /{" "}
          {String(PROJECTS.length).padStart(2, "0")}
        </span>
      </div>

      <div
        data-carousel-fade
        className="px-6 md:px-10 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14"
        style={{ willChange: "opacity, transform" }}
      >
        <div className="md:col-span-7">
          <div
            className="relative border-t border-rule"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <div
              ref={indicatorRef}
              aria-hidden="true"
              className="hidden md:block absolute left-0 w-px bg-foreground pointer-events-none"
              style={{ top: 0, height: 0 }}
            />
            {PROJECTS.map((p, i) => {
              const isFocused = i === focusedIdx;
              const dimmed = hovering && !isFocused;
              return (
                <Link
                  key={p.slug}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  href={`/work/${p.slug}`}
                  onClick={(e) => handleClick(e, p.slug)}
                  onMouseEnter={() => setFocusedIdx(i)}
                  data-cursor="View"
                  className="group relative block border-b border-rule"
                >
                  <div
                    className="flex items-baseline gap-5 md:gap-8 py-6 md:py-8 pl-4 md:pl-8 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      opacity: dimmed ? 0.28 : 1,
                      transform: isFocused
                        ? "translateX(14px)"
                        : "translateX(0)",
                    }}
                  >
                    <span className="text-[11px] uppercase tracking-[0.2em] text-muted w-8 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="flex-1 leading-[0.92] uppercase tracking-[-0.012em]"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(56px, 9vw, 168px)",
                      }}
                    >
                      {p.title}
                    </span>
                    <span className="hidden md:flex items-baseline gap-6 text-[11px] uppercase tracking-[0.2em] text-muted shrink-0">
                      <span>{p.year}</span>
                      <span
                        className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{
                          transform: isFocused
                            ? "translateX(4px)"
                            : "translateX(-6px)",
                          opacity: isFocused ? 1 : 0,
                        }}
                      >
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-baseline justify-between text-[11px] uppercase tracking-[0.2em] text-muted mt-8">
            <span>{PROJECTS[focusedIdx]?.category}</span>
            <span>Hover to preview · Click to enter</span>
          </div>
        </div>

        <div className="hidden md:block md:col-span-5">
          <div className="sticky top-28">
            <div
              ref={previewBoxRef}
              className="relative w-full aspect-[3/4] bg-foreground/[0.04] overflow-hidden"
            />
            <div className="flex items-baseline justify-between mt-5 text-[11px] uppercase tracking-[0.2em] text-muted">
              <span>{PROJECTS[focusedIdx]?.title}</span>
              <span>{PROJECTS[focusedIdx]?.year}</span>
            </div>
          </div>
        </div>
      </div>

      <MagneticWarpLayer
        getActiveRect={getPreviewRect}
        getImageSrc={getPreviewSrc}
        preloadSrcs={PROJECTS.map((p) => p.image)}
      />
    </section>
  );
}
