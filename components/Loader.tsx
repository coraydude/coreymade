"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function Loader() {
  const [show, setShow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const topMetaRef = useRef<HTMLDivElement>(null);
  const bottomMetaRef = useRef<HTMLDivElement>(null);
  const dispMapRef = useRef<SVGFEDisplacementMapElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem("loader-seen")) return;
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const container = containerRef.current;
    const counter = counterRef.current;
    const word = wordRef.current;
    const bar = barRef.current;
    const topMeta = topMetaRef.current;
    const bottomMeta = bottomMetaRef.current;
    if (!container || !counter || !word || !bar) return;

    sessionStorage.setItem("loader-seen", "1");

    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    const STAGES = [
      "BOOT",
      "LOAD",
      "WIRE",
      "READY",
    ];

    const dispState = { scale: 0 };
    const applyDisp = () => {
      if (dispMapRef.current) {
        dispMapRef.current.setAttribute("scale", dispState.scale.toFixed(1));
      }
    };

    const state = { progress: 0 };
    gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
    gsap.set([topMeta, bottomMeta], { opacity: 0, y: 12 });
    gsap.set(counter, { opacity: 0 });
    gsap.set(word, { opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => {
        html.style.overflow = prevOverflow;
        setShow(false);
      },
    });

    tl.to([topMeta, bottomMeta], {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: "power2.out",
      stagger: 0.08,
    });

    tl.to(
      counter,
      { opacity: 1, duration: 0.25, ease: "power2.out" },
      "<+=0.1"
    );
    tl.to(
      word,
      { opacity: 1, duration: 0.25, ease: "power2.out" },
      "<"
    );

    tl.to(
      state,
      {
        progress: 100,
        duration: 2.2,
        ease: "expo.out",
        onUpdate: () => {
          const pct = Math.floor(state.progress);
          counter.textContent = String(pct).padStart(3, "0");
          const stageIdx = Math.min(
            STAGES.length - 1,
            Math.floor((pct / 100) * STAGES.length)
          );
          word.textContent = STAGES[stageIdx];
          bar.style.transform = `scaleX(${pct / 100})`;
        },
      },
      "<"
    );

    tl.to(
      dispState,
      {
        scale: 80,
        duration: 0.6,
        ease: "power2.in",
        onUpdate: applyDisp,
      },
      "-=0.6"
    );

    tl.to({}, { duration: 0.18 });

    tl.to(
      dispState,
      {
        scale: 220,
        duration: 0.35,
        ease: "power2.in",
        onUpdate: applyDisp,
      },
      ">-=0.05"
    );

    tl.to(
      [counter, word, topMeta, bottomMeta, bar],
      {
        opacity: 0,
        duration: 0.25,
        ease: "power2.in",
      },
      "<+=0.1"
    );

    tl.to(
      container,
      {
        clipPath: "inset(0 0 100% 0)",
        duration: 0.75,
        ease: "expo.inOut",
      },
      "<-=0.05"
    );

    tl.to(
      dispState,
      {
        scale: 0,
        duration: 0.4,
        onUpdate: applyDisp,
      },
      "<"
    );

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
      style={{
        background: "#050505",
        clipPath: "inset(0 0 0 0)",
      }}
    >
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        style={{ position: "absolute" }}
      >
        <defs>
          <filter
            id="loader-displace"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015 0.025"
              numOctaves={2}
              seed={7}
              result="noise"
            />
            <feDisplacementMap
              ref={dispMapRef}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div
        ref={topMetaRef}
        className="absolute top-10 md:top-14 left-6 md:left-10 right-6 md:right-10 flex items-baseline justify-between text-[11px] md:text-[12px] uppercase tracking-[0.18em] text-white/60 font-mono"
      >
        <span>CH/24 — INDEX 0001</span>
        <span>EST. 2026</span>
      </div>

      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ filter: "url(#loader-displace)" }}
      >
        <span
          ref={counterRef}
          className="font-display uppercase text-white leading-none tabular-nums"
          style={{
            fontSize: "clamp(8rem, 28vw, 26rem)",
            letterSpacing: "0.04em",
          }}
        >
          000
        </span>
      </div>

      <div
        ref={bottomMetaRef}
        className="absolute bottom-16 md:bottom-20 left-6 md:left-10 right-6 md:right-10 flex items-end justify-between gap-6"
      >
        <div className="flex flex-col gap-4 text-[11px] md:text-[12px] uppercase tracking-[0.18em] text-white/60 font-mono">
          <span>Loading experience</span>
          <span
            ref={wordRef}
            className="text-white text-[16px] md:text-[22px] font-display tracking-[-0.01em] leading-none"
          >
            BOOT
          </span>
        </div>
        <div className="text-[11px] md:text-[12px] uppercase tracking-[0.18em] text-white/60 font-mono text-right leading-[1.6]">
          Corey Haggard
          <br />
          Digital Designer
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
        <div
          ref={barRef}
          className="h-full w-full bg-white origin-left"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
}
