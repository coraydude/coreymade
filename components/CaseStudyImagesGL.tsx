"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { caseGLSetSlots } from "./CaseGLHost";

type Props = {
  // Each row is either a single src (full-bleed 16:9) or an array of
  // srcs that render side by side in one flex row (4:5 aspect each).
  rows: (string | string[])[];
  alt?: string;
};

// Thin per-page component. The heavy WebGL setup lives in CaseGLHost
// (mounted at the layout level) and persists across navigation; here we
// just render the DOM slot divs the host uses for layout sync, and
// register/unregister them.
export default function CaseStudyImagesGL({ rows, alt }: Props) {
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Flat srcs (rows flattened into a single linear list) — one entry per
  // visible image, in slot order.
  const srcs = rows.flatMap((r) => (typeof r === "string" ? [r] : r));
  // Stable key for the effect dep — a parent passing a new array
  // identity with the same contents doesn't re-fire slot rebuild.
  const srcsKey = srcs.join("|");

  useEffect(() => {
    caseGLSetSlots(srcs, slotRefs.current);
    // Stage the canvas fade-in so the images are the *third* beat of
    // the case-page entrance (title → intro → images). buildSlots
    // resets canvas opacity to 1 above; we override to 0 here and tween
    // back up with a delay long enough to let the title rise (~0.55s)
    // AND the intro fade-up (~0.7s delay + 0.6s duration ≈ 1.3s) finish
    // before the images start appearing.
    const canvas = document.querySelector<HTMLElement>("[data-case-gl]");
    if (canvas) {
      gsap.killTweensOf(canvas);
      gsap.set(canvas, { opacity: 0, y: 24 });
      gsap.to(canvas, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        delay: 0.9,
        ease: "power2.inOut",
      });
    }
    return () => {
      // Unmount (e.g. user navigated away from the case page) → clear
      // the host's slot list. The canvas stays alive on document.body
      // but renders nothing until the next case page mounts.
      caseGLSetSlots([], []);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcsKey]);

  // Walk rows and emit either a full-bleed slot or a flex row of N
  // slots. `flatIdx` is the running index into the flat srcs list — the
  // WebGL slot it maps to.
  let flatIdx = 0;
  const slotRef = (i: number) => (el: HTMLDivElement | null) => {
    slotRefs.current[i] = el;
  };

  return (
    <div className="px-6 md:px-10 space-y-6 md:space-y-10">
      {rows.map((row, rowIdx) => {
        if (typeof row === "string") {
          const i = flatIdx++;
          return (
            <div
              key={rowIdx}
              ref={slotRef(i)}
              aria-label={alt ? `${alt} — image ${i + 1}` : undefined}
              className="relative w-full max-w-[1600px] mx-auto"
              style={{ aspectRatio: "16 / 9" }}
            />
          );
        }
        // Multi-up row — N slots side by side at flex-1.
        return (
          <div
            key={rowIdx}
            className="flex gap-6 md:gap-10 max-w-[1600px] mx-auto"
          >
            {row.map((_, j) => {
              const i = flatIdx++;
              return (
                <div
                  key={j}
                  ref={slotRef(i)}
                  aria-label={alt ? `${alt} — image ${i + 1}` : undefined}
                  className="relative flex-1"
                  style={{ aspectRatio: "4 / 5" }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
