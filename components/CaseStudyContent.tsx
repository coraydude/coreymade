"use client";

import { ReactNode, useEffect, useRef } from "react";
import gsap from "gsap";

type Props = { children: ReactNode };

export default function CaseStudyContent({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.set(el, { opacity: 0, y: 24 });
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.55,
      delay: 0.65,
      ease: "power3.out",
    });
  }, []);

  return (
    <div
      ref={ref}
      data-case-study-fade
      className="relative z-[2]"
      style={{ opacity: 0, willChange: "opacity, transform" }}
    >
      {children}
    </div>
  );
}
