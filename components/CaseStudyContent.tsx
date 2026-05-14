"use client";

import { ReactNode, useLayoutEffect, useRef } from "react";
import gsap from "gsap";

type Props = { children: ReactNode };

// Wraps the case-study page content and stages individual sections in
// after PersistentTitle's chars-rise. Each child element tagged with a
// `data-stage` attribute fades up on its own beat, giving the page a
// "title → intro → images" rhythm instead of everything appearing at
// once.
export default function CaseStudyContent({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // useLayoutEffect (not useEffect) so the stages are hidden *before*
  // the browser paints. With useEffect there was a one-frame flash of
  // the intro paragraph at full opacity between mount and the gsap.set
  // that hides it.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stages = el.querySelectorAll<HTMLElement>("[data-stage]");
    if (stages.length === 0) return;
    gsap.set(stages, { opacity: 0, y: 24 });
    // Title rise is ~0.55s. Hold ~50ms beat, then start the first stage
    // at 0.5s. Stagger 0.7s between subsequent stages so each one
    // breathes before the next starts.
    gsap.to(stages, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      delay: 0.5,
      stagger: 0.7,
      ease: "power3.out",
    });
  }, []);

  return (
    <div
      ref={ref}
      data-case-study-fade
      className="relative z-[2]"
    >
      {children}
    </div>
  );
}
