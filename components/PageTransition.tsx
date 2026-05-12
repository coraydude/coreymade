"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

type Ctx = {
  cover: (label: string) => Promise<void>;
};

const TransitionContext = createContext<Ctx | null>(null);

export function usePageTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    throw new Error("usePageTransition must be used inside <PageTransition>");
  }
  return ctx;
}

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [isCovered, setIsCovered] = useState(false);
  const pathname = usePathname();
  const lastPathRef = useRef(pathname);

  useEffect(() => {
    gsap.set(overlayRef.current, { clipPath: "inset(100% 0% 0% 0%)" });
    gsap.set(labelRef.current, { yPercent: 40, opacity: 0 });
  }, []);

  const cover = useCallback((label: string) => {
    return new Promise<void>((resolve) => {
      if (!overlayRef.current || !labelRef.current) {
        resolve();
        return;
      }
      labelRef.current.textContent = label;
      gsap.set(labelRef.current, { yPercent: 40, opacity: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "expo.inOut" },
        onComplete: () => {
          setIsCovered(true);
          resolve();
        },
      });

      tl.to(overlayRef.current, {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.7,
      }).to(
        labelRef.current,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.55,
          ease: "expo.out",
        },
        "-=0.4"
      );
    });
  }, []);

  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    if (!isCovered) return;

    window.scrollTo(0, 0);

    const tl = gsap.timeline({
      onComplete: () => setIsCovered(false),
    });

    tl.to(labelRef.current, {
      yPercent: -40,
      opacity: 0,
      duration: 0.45,
      ease: "expo.in",
    }).to(
      overlayRef.current,
      {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: 0.75,
        ease: "expo.inOut",
      },
      "-=0.2"
    );
  }, [pathname, isCovered]);

  return (
    <TransitionContext.Provider value={{ cover }}>
      {children}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9000] bg-black flex items-center justify-center pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div
          ref={labelRef}
          className="text-foreground tracking-[-0.01em] uppercase text-[22vw] md:text-[14vw] leading-none whitespace-nowrap font-display"
          style={{ fontFamily: "var(--font-display)" }}
        />
      </div>
    </TransitionContext.Provider>
  );
}
