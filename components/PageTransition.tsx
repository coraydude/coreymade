"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "in" | "out";

type Ctx = {
  // Single navigation entry point. Owns the cover, the route swap, and
  // the uncover. Returns true if accepted, false if a transition is
  // already in flight (and the caller should not call router.push).
  navigate: (href: string, label: string) => boolean;
  phase: Phase;
};

const TransitionContext = createContext<Ctx | null>(null);

export function usePageTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    throw new Error("usePageTransition must be used inside <PageTransition>");
  }
  return ctx;
}

// Timing constants — match the CSS in globals.css (.curtain).
const IN_MS = 950; // slats finish dropping; route swaps here
const OUT_MS = 900; // slats finish lifting; phase returns to idle

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [label, setLabel] = useState("");
  // Latest phase, read by `navigate()` so we can synchronously reject a
  // second call without waiting for a re-render.
  const phaseRef = useRef<Phase>("idle");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const inTimerRef = useRef<number | null>(null);
  const outTimerRef = useRef<number | null>(null);

  const navigate = useCallback(
    (href: string, nextLabel: string): boolean => {
      if (phaseRef.current !== "idle") return false;

      phaseRef.current = "in";
      setLabel(nextLabel);
      setPhase("in");

      if (inTimerRef.current) window.clearTimeout(inTimerRef.current);
      inTimerRef.current = window.setTimeout(() => {
        // Slats are fully closed — swap route + scroll under cover.
        window.scrollTo(0, 0);
        router.push(href);
        phaseRef.current = "out";
        setPhase("out");

        if (outTimerRef.current) window.clearTimeout(outTimerRef.current);
        outTimerRef.current = window.setTimeout(() => {
          phaseRef.current = "idle";
          setPhase("idle");
        }, OUT_MS);
      }, IN_MS);

      return true;
    },
    [router]
  );

  useEffect(
    () => () => {
      if (inTimerRef.current) window.clearTimeout(inTimerRef.current);
      if (outTimerRef.current) window.clearTimeout(outTimerRef.current);
    },
    []
  );

  const curtainCls =
    phase === "in"
      ? "curtain is-in"
      : phase === "out"
      ? "curtain is-out"
      : "curtain";

  return (
    <TransitionContext.Provider value={{ navigate, phase }}>
      {children}
      <div className={curtainCls} aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="slat" />
        ))}
        <div className="label">{label}</div>
      </div>
    </TransitionContext.Provider>
  );
}
