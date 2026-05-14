"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const WORD = "COREYMADE";
const TAGLINE_LINES = [
  "Corey Haggard.",
  "UX Designer,",
  "and Creative Director",
];

export default function Loader() {
  const [show, setShow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  // One ref per char in WORD; index 0 is the "C" that stays.
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem("loader-seen")) return;
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const container = containerRef.current;
    const word = wordRef.current;
    if (!container || !word) return;

    sessionStorage.setItem("loader-seen", "1");

    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    // Snapshot each letter's natural width so we can tween width → 0 from
    // an explicit pixel start (you can't animate width: auto → 0).
    const widths = charRefs.current.map(
      (el) => el?.getBoundingClientRect().width ?? 0
    );
    charRefs.current.forEach((el, i) => {
      if (el) gsap.set(el, { width: widths[i] });
    });

    // OREYMADE — every letter except the C, in reverse order so the
    // collapse starts at the rightmost letter and folds inward.
    const collapseTargets = charRefs.current.slice(1).reverse();

    const lines = lineRefs.current.filter(
      (el): el is HTMLDivElement => el !== null
    );
    // Lines start aligned (no cascade) and translucent. The cascade
    // emerges as they get "pulled" leftward at different rates during
    // the OREYMADE collapse.
    gsap.set(lines, { opacity: 0, x: 0 });
    gsap.set(word, { opacity: 0, y: 14 });

    const EASE = "power3.inOut";

    const tl = gsap.timeline({
      onComplete: () => {
        html.style.overflow = prevOverflow;
        setShow(false);
      },
    });

    // 1. Word rises.
    tl.to(word, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: EASE,
    });

    // 2. Tagline fades in — all three lines aligned, no cascade yet.
    tl.to(
      lines,
      {
        opacity: 1,
        duration: 0.55,
        ease: "power2.out",
      },
      "-=0.35"
    );

    // 3. Hold so the user can read.
    tl.to({}, { duration: 0.8 });

    // 4. The collapse + the pull happen concurrently. OREYMADE folds
    // into the C, and the tagline lines drift left at different rates:
    // top line gets pulled hardest and fastest; middle drifts a bit;
    // bottom barely moves. The differential motion is what produces
    // the staircase cascade.
    const collapseLabel = "collapse";
    tl.add(collapseLabel);

    tl.to(
      collapseTargets,
      {
        width: 0,
        opacity: 0,
        duration: 1.2,
        ease: EASE,
        stagger: 0.08,
      },
      collapseLabel
    );

    // All three lines travel to the SAME final position (left-flush)
    // but at different speeds, so during the motion they fan out into a
    // temporary cascade and then settle back into alignment by the time
    // the collapse finishes.
    const FINAL_X = -160;
    tl.to(
      lines[0],
      { x: FINAL_X, duration: 0.9, ease: "power3.out" },
      collapseLabel
    );
    tl.to(
      lines[1],
      { x: FINAL_X, duration: 1.3, ease: "power3.out" },
      collapseLabel
    );
    tl.to(
      lines[2],
      { x: FINAL_X, duration: 1.7, ease: "power3.out" },
      collapseLabel
    );

    // 5. Hold on the final composition.
    tl.to({}, { duration: 0.8 });

    // 6. Lift off.
    tl.to(container, {
      opacity: 0,
      y: -12,
      duration: 0.7,
      ease: EASE,
    });

    return () => {
      tl.kill();
      html.style.overflow = prevOverflow;
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9500] pointer-events-none overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <div className="absolute inset-0 flex items-center justify-center px-6 md:px-10">
        <div className="flex items-center gap-6 md:gap-10 max-w-full">
          {/* COREYMADE — each letter is an inline-block span whose width
              we'll snapshot then tween to 0 in the timeline above. */}
          <div
            ref={wordRef}
            className="flex items-center font-display uppercase text-foreground"
            style={{
              fontSize: "clamp(80px, 16vw, 260px)",
              lineHeight: 0.9,
              letterSpacing: "-0.01em",
            }}
          >
            {WORD.split("").map((ch, i) => (
              <span
                key={i}
                ref={(el) => {
                  charRefs.current[i] = el;
                }}
                style={{
                  display: "inline-block",
                  overflow: "hidden",
                  whiteSpace: "pre",
                }}
              >
                {ch}
              </span>
            ))}
          </div>

          {/* Tagline starts left-aligned (all lines flush). The cascade
              shape emerges from the differential leftward pull applied
              during the collapse, not from initial layout. */}
          <div
            className="text-foreground leading-[1.15] shrink-0"
            style={{
              fontFamily: "var(--font-inter)",
              fontSize: "clamp(28px, 4vw, 72px)",
            }}
          >
            {TAGLINE_LINES.map((line, i) => (
              <div
                key={i}
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
