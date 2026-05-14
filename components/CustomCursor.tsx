"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;
    setEnabled(true);

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const dot = { x: target.x, y: target.y };
    const ring = { x: target.x, y: target.y };
    let hoverScale = 1;
    let hoverScaleEased = 1;
    let labelText = "";
    // Cache the rendered label width so the tick doesn't read
    // offsetWidth every frame (which forces layout). Only re-measured
    // when textContent actually changes inside refreshCursor.
    let labelWidth = 0;
    // Cache the last element returned by closest() so a stationary
    // pointer (or one sliding within the same data-cursor zone) skips
    // both the DOM walk and the DOM writes.
    let lastEl: HTMLElement | null = null;
    // Track the last applied transform values per element so the tick
    // can short-circuit DOM writes when nothing has actually changed
    // (i.e. cursor truly idle and lerps have fully settled).
    let lastDotX = 0,
      lastDotY = 0;
    let lastRingX = 0,
      lastRingY = 0,
      lastRingScale = 0;
    let lastRingForLabelX = 0,
      lastRingForLabelY = 0;

    const refreshCursor = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor]") ?? null;
      if (el === lastEl) return;
      lastEl = el;
      const nextLabel = el ? el.dataset.cursor || "" : "";
      if (nextLabel === labelText) return;
      hoverScale = el ? 2.2 : 1;
      labelText = nextLabel;
      if (labelRef.current) {
        labelRef.current.textContent = labelText;
        labelRef.current.style.opacity = labelText ? "1" : "0";
        // Single layout read per text change instead of every frame.
        labelWidth = labelText ? labelRef.current.offsetWidth : 0;
      }
      if (dotRef.current) {
        dotRef.current.style.opacity = labelText ? "0" : "1";
      }
    };

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      refreshCursor(e);
    };

    const onOver = (e: MouseEvent) => refreshCursor(e);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    let rafId = 0;
    const tick = () => {
      dot.x = lerp(dot.x, target.x, 0.35);
      dot.y = lerp(dot.y, target.y, 0.35);
      ring.x = lerp(ring.x, target.x, 0.18);
      ring.y = lerp(ring.y, target.y, 0.18);
      hoverScaleEased = lerp(hoverScaleEased, hoverScale, 0.18);

      if (dotRef.current && (dot.x !== lastDotX || dot.y !== lastDotY)) {
        dotRef.current.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) translate(-50%, -50%)`;
        lastDotX = dot.x;
        lastDotY = dot.y;
      }
      if (
        ringRef.current &&
        (ring.x !== lastRingX ||
          ring.y !== lastRingY ||
          hoverScaleEased !== lastRingScale)
      ) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%) scale(${hoverScaleEased})`;
        lastRingX = ring.x;
        lastRingY = ring.y;
        lastRingScale = hoverScaleEased;
      }
      if (
        labelRef.current &&
        (ring.x !== lastRingForLabelX || ring.y !== lastRingForLabelY)
      ) {
        // labelWidth is captured once per text change above — no
        // layout-thrashing offsetWidth read per frame.
        const flipLeft =
          ring.x + 28 + labelWidth > window.innerWidth - 12;
        if (flipLeft) {
          // Anchor label's right edge to (cursor.x - 28). `translate(-100%)`
          // shifts the box leftward by its own width so it grows toward
          // the cursor, not off-screen.
          labelRef.current.style.transform = `translate3d(${ring.x - 28}px, ${ring.y - 8}px, 0) translate(-100%, 0)`;
        } else {
          labelRef.current.style.transform = `translate3d(${ring.x + 28}px, ${ring.y - 8}px, 0)`;
        }
        lastRingForLabelX = ring.x;
        lastRingForLabelY = ring.y;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[9999]"
        style={{ mixBlendMode: "difference" }}
      >
        <div
          ref={ringRef}
          className="absolute top-0 left-0 h-9 w-9 rounded-full border border-white"
          style={{ willChange: "transform" }}
        />
        <div
          ref={dotRef}
          className="absolute top-0 left-0 h-2.5 w-2.5 rounded-full bg-white transition-opacity duration-150"
          style={{ willChange: "transform" }}
        />
      </div>
      <div
        className="pointer-events-none fixed inset-0 z-[10000]"
        style={{ isolation: "isolate" }}
      >
        <div
          ref={labelRef}
          className="absolute top-0 left-0 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-black bg-white rounded-full opacity-0 transition-opacity duration-150 whitespace-nowrap"
          style={{ willChange: "transform" }}
        />
      </div>
    </>
  );
}
