"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MouseEvent, useEffect, useRef } from "react";
import gsap from "gsap";
import SplitType from "split-type";
import { useTitle } from "./TitleProvider";

type Props = {
  nextSlug: string;
  nextTitle: string;
};

export default function NextProjectFooter({ nextSlug, nextTitle }: Props) {
  const router = useRouter();
  const { setActiveProjectSlug } = useTitle();
  const titleRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<SplitType | null>(null);

  // Pre-split the title chars on mount so the rendering is identical
  // throughout — splitting on click switches the text from plain inline
  // to inline-block spans, which subtly shifts kerning. Doing it up front
  // means the user only sees one consistent typesetting.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    if (splitRef.current) splitRef.current.revert();
    splitRef.current = new SplitType(el, { types: "chars" });
    return () => {
      splitRef.current?.revert();
      splitRef.current = null;
    };
  }, [nextTitle]);

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();

    setActiveProjectSlug(nextSlug);

    const caseBody = document.querySelector<HTMLElement>("[data-case-body]");
    const upNextLabel = document.querySelector<HTMLElement>(
      "[data-up-next-label]"
    );
    // The case-study WebGL canvas lives on <body> (outside the
    // case-content wrapper that gets faded), so include it here or the
    // old images stay visible at full opacity through the navigation
    // and flicker to the new ones on mount.
    const caseGl = document.querySelector<HTMLElement>("[data-case-gl]");

    const navigate = () => {
      // Hide PersistentTitle's wrapper across the scroll-reset → router.push
      // window so the user doesn't see the OLD page's title briefly when
      // scroll snaps back to 0.
      const pt = document.querySelector<HTMLElement>("[data-persistent-title]");
      if (pt) pt.style.visibility = "hidden";

      const lenis = (
        window as unknown as {
          __lenis?: {
            scrollTo: (target: number, opts?: { immediate?: boolean }) => void;
          };
        }
      ).__lenis;
      if (lenis?.scrollTo) {
        lenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
      router.push(`/work/${nextSlug}`);
    };

    // Strictly sequential exit:
    //   1. Case body + "Up next" label + GL canvas fade. Footer title PERSISTS.
    //   2. Footer title chars collapse down (per-letter, stagger from edges).
    //   3. Scroll to 0 + router.push.
    const chars = splitRef.current?.chars;
    const tl = gsap.timeline({ onComplete: navigate });

    const fadeTargets = [caseBody, upNextLabel, caseGl].filter(
      (x): x is HTMLElement => x !== null
    );
    if (fadeTargets.length > 0) {
      tl.to(fadeTargets, {
        opacity: 0,
        duration: 0.4,
        ease: "power2.inOut",
      });
    }

    if (chars && chars.length > 0) {
      tl.to(chars, {
        y: 30,
        scaleY: 0,
        duration: 0.35,
        ease: "power3.in",
        stagger: { from: "edges", axis: "x", amount: 0.06 },
        transformOrigin: "bottom center",
      });
    }
  };

  return (
    <footer className="px-6 md:px-10 pt-32 pb-16 max-w-[1600px] mx-auto border-t border-rule mt-24">
      <div
        data-up-next-label
        className="text-[12px] uppercase tracking-[0.18em] text-muted mb-6"
      >
        Up next
      </div>
      <Link
        href={`/work/${nextSlug}`}
        onClick={onClick}
        data-cursor="Next"
        className="block group"
      >
        <div
          ref={titleRef}
          data-next-title
          className="leading-none uppercase tracking-[-0.01em] text-center"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--title-size, 14vw)",
          }}
        >
          {nextTitle.replace(/ /g, " ")}
        </div>
      </Link>
    </footer>
  );
}
