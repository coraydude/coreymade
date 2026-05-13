"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent } from "react";
import gsap from "gsap";
import { useTitle } from "./TitleProvider";

export default function BackToWork() {
  const router = useRouter();
  const pathname = usePathname();
  const { setActiveProjectSlug } = useTitle();

  const fadeAndNavigate = () => {
    const slug = pathname.split("/").filter(Boolean).pop() || "";
    if (slug) {
      window.__returnSlug = slug;
      setActiveProjectSlug(slug);
    }

    // Outgoing transition (case → home):
    //   • PersistentTitle chars sink down + fade (mirror of MeshCarousel's
    //     home-title exit).
    //   • Case-study content fades.
    //   • Navigate after the title chars have left.
    // On the home page MeshCarousel then animates its bottom title chars
    // up from below on mount, completing the loop.
    const chars = document.querySelectorAll<HTMLElement>(
      "[data-persistent-title] .char"
    );
    if (chars.length > 0) {
      gsap.killTweensOf(chars);
      gsap.to(chars, {
        y: 30,
        scaleY: 0,
        duration: 0.35,
        ease: "power3.in",
        stagger: { from: "edges", axis: "x", amount: 0.06 },
        transformOrigin: "bottom center",
      });
    }

    // Fade both the case content wrapper AND the case-study GL canvas
    // (which lives on <body>, outside that wrapper). Without the canvas
    // here, the WebGL images stay at full opacity through the exit and
    // pop on home-mount.
    const fadeEls = [
      document.querySelector<HTMLElement>("[data-case-study-fade]"),
      document.querySelector<HTMLElement>("[data-case-gl]"),
    ].filter((x): x is HTMLElement => x !== null);
    if (fadeEls.length > 0) {
      gsap.to(fadeEls, {
        opacity: 0,
        duration: 0.4,
        ease: "power3.in",
      });
    }

    window.setTimeout(() => router.push("/"), 450);
  };

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();

    const lenis = window.__lenis;
    if (window.scrollY > 30) {
      if (lenis) {
        lenis.scrollTo(0, {
          duration: 0.6,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          onComplete: () => requestAnimationFrame(fadeAndNavigate),
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
        const start = Date.now();
        const check = () => {
          if (window.scrollY < 10 || Date.now() - start > 1000) {
            requestAnimationFrame(fadeAndNavigate);
          } else {
            requestAnimationFrame(check);
          }
        };
        requestAnimationFrame(check);
      }
    } else {
      fadeAndNavigate();
    }
  };

  return (
    <Link
      href="/"
      onClick={onClick}
      data-cursor="Back"
      className="fixed top-20 left-6 md:left-10 z-40 text-[12px] uppercase tracking-[0.18em] text-muted hover:text-foreground border-b border-rule hover:border-foreground pb-1 mix-blend-difference"
    >
      ← Selected work
    </Link>
  );
}
