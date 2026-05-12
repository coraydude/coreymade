"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const LINES = [
  "Corey Haggard.",
  "Digital designer,",
  "motion thinker",
  "and product builder.",
];

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".hero-line .hero-line__inner", { yPercent: 110 });
      gsap.set(".hero-meta", { opacity: 0, y: 12 });

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.to(".hero-line .hero-line__inner", {
        yPercent: 0,
        duration: 1.2,
        stagger: 0.09,
      })
        .to(".hero-meta", { opacity: 1, y: 0, duration: 0.8 }, "-=0.5")
        .to(
          ".hero-chevron",
          {
            y: 6,
            duration: 0.8,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          },
          "-=0.4"
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative min-h-[100svh] w-full px-6 md:px-10 pt-32 pb-16 flex flex-col"
    >
      <div className="flex-1 flex flex-col justify-end max-w-[1400px]">
        <h1 className="font-light tracking-[-0.02em] leading-[0.95] text-[14vw] md:text-[10vw] lg:text-[9vw]">
          {LINES.map((line, i) => (
            <span key={i} className="hero-line block overflow-hidden">
              <span className="hero-line__inner block will-change-transform">
                {line}
              </span>
            </span>
          ))}
        </h1>
      </div>

      <div className="hero-meta flex items-end justify-between text-[12px] tracking-[0.16em] uppercase text-muted mt-12">
        <div className="flex items-center gap-3">
          <span className="hero-chevron inline-flex">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 5l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Scroll or drag to discover</span>
        </div>
        <div className="hidden md:block">
          Currently — open to select projects in 2026
        </div>
      </div>
    </section>
  );
}
