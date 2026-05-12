"use client";

import TransitionLink from "./TransitionLink";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PROJECTS } from "@/lib/projects";

export default function ProjectList() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      pos.x = lerp(pos.x, target.x, 0.18);
      pos.y = lerp(pos.y, target.y, 0.18);
      if (previewRef.current) {
        previewRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const wrap = wrapRef.current;
    wrap?.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(rafId);
      wrap?.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <section
      ref={wrapRef}
      className="relative px-6 md:px-10 py-20 md:py-28 border-t border-rule"
    >
      <div className="flex items-baseline justify-between mb-12 md:mb-16">
        <h2 className="text-[12px] uppercase tracking-[0.18em] text-muted">
          Selected Work
        </h2>
        <TransitionLink
          href="/work"
          label="Work"
          data-cursor="View All"
          className="text-[12px] uppercase tracking-[0.18em] text-muted hover:text-foreground transition-colors"
        >
          All Projects →
        </TransitionLink>
      </div>

      <ul>
        {PROJECTS.slice(0, 5).map((p, i) => (
          <li key={p.slug} className="border-t border-rule last:border-b">
            <TransitionLink
              href="/work"
              label={p.title}
              data-cursor="View Project"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="group flex items-baseline justify-between py-7 md:py-9"
            >
              <span className="flex items-baseline gap-6 md:gap-12">
                <span className="text-[12px] uppercase tracking-[0.18em] text-muted w-12">
                  {p.year}
                </span>
                <span className="text-[8vw] md:text-[5.5vw] leading-[0.95] tracking-[-0.02em] font-light transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2">
                  {p.title}
                </span>
              </span>
              <span className="hidden md:inline text-[12px] uppercase tracking-[0.18em] text-muted opacity-0 -translate-x-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 group-hover:translate-x-0">
                {p.category}
              </span>
            </TransitionLink>
          </li>
        ))}
      </ul>

      <div
        ref={previewRef}
        className="pointer-events-none absolute top-0 left-0 w-[320px] h-[200px] -z-0 rounded-sm overflow-hidden"
        style={{ willChange: "transform" }}
      >
        {PROJECTS.slice(0, 5).map((p, i) => (
          <div
            key={p.slug}
            className="absolute inset-0 transition-opacity duration-500 ease-out"
            style={{ opacity: active === i ? 1 : 0 }}
          >
            <Image
              src={p.image}
              alt={p.title}
              fill
              sizes="320px"
              className="object-cover"
              priority={i < 2}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
