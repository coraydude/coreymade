"use client";

import { ReactNode, useEffect, useRef } from "react";

type Props = { children: ReactNode };

export default function VelocityImages({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId = 0;
    let smoothedV = 0;
    const SMOOTHING = 0.18;
    const SCALE_PER_VEL = 0.00018;
    const MAX_SCALE = 0.14;

    const tick = () => {
      const lenis = window.__lenis as
        | { velocity?: number }
        | undefined;
      const rawV =
        typeof lenis?.velocity === "number" ? lenis.velocity : 0;
      smoothedV += (rawV - smoothedV) * SMOOTHING;

      const container = ref.current;
      if (container) {
        const items = container.querySelectorAll<HTMLElement>(
          "[data-velocity-item]"
        );
        const magnitude = Math.abs(smoothedV);
        const stretch = Math.min(magnitude * SCALE_PER_VEL, MAX_SCALE);
        const origin = smoothedV > 0 ? "50% 0%" : "50% 100%";
        items.forEach((el) => {
          el.style.transformOrigin = origin;
          el.style.transform = `scaleY(${(1 + stretch).toFixed(4)})`;
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return <div ref={ref}>{children}</div>;
}
