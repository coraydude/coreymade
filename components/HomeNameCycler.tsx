"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { PROJECTS } from "@/lib/projects";
import { useTitle } from "./TitleProvider";

const WAVY_PATH = "M0 1H155.026L144.122 5H311";

type LenisShape = {
  stop?: () => void;
  start?: () => void;
};

function splitChars(container: HTMLElement, text: string): HTMLSpanElement[] {
  container.innerHTML = "";
  const chars: HTMLSpanElement[] = [];
  for (const ch of text) {
    const span = document.createElement("span");
    span.style.display = "inline-block";
    span.style.transformOrigin = "bottom";
    span.style.willChange = "transform, opacity";
    span.textContent = ch === " " ? " " : ch;
    container.appendChild(span);
    chars.push(span);
  }
  return chars;
}

export default function HomeNameCycler() {
  const router = useRouter();
  const { setActiveProjectSlug } = useTitle();
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);
  const titleRef = useRef<HTMLDivElement>(null);
  const title2Ref = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const wheelLockRef = useRef(false);
  const isNavigatingRef = useRef(false);

  const reveal = (idx: number, firstReveal = false) => {
    const p = PROJECTS[idx];
    if (
      !p ||
      !titleRef.current ||
      !title2Ref.current ||
      !typeRef.current ||
      !barRef.current
    )
      return;

    activeIdxRef.current = idx;
    setActiveIdx(idx);
    setActiveProjectSlug(p.slug);

    const chars1 = splitChars(titleRef.current, p.title);
    const chars2 = splitChars(title2Ref.current, p.title);

    gsap.killTweensOf([...chars1, ...chars2, barRef.current, typeRef.current]);

    gsap.set(chars1, { scaleY: 0, y: 10, opacity: 1 });
    gsap.to(chars1, {
      scaleY: 1,
      y: 0,
      duration: 0.8,
      stagger: { from: "center", axis: "x", amount: 0.1 },
      ease: "back.out(1.3)",
    });

    gsap.set(chars2, { scaleY: 0, y: 10, opacity: 0.2 });
    gsap.to(chars2, {
      scaleY: 1,
      y: 0,
      duration: 0.8,
      stagger: { from: "edges", axis: "x", amount: 0.1 },
      ease: "back.out(1.8)",
      onComplete: () => {
        if (title2Ref.current) {
          gsap.to(title2Ref.current.children, {
            autoAlpha: 0,
            duration: 0.1,
          });
        }
      },
    });

    gsap.set(barRef.current, { scaleX: 0, opacity: 1 });
    gsap.to(barRef.current, {
      scaleX: 1,
      duration: 0.3,
      delay: firstReveal ? 0.15 : 0.1,
      ease: "back.out",
    });

    typeRef.current.textContent = p.category;
    gsap.fromTo(
      typeRef.current,
      { opacity: 0, y: 10 },
      {
        opacity: 0.5,
        y: 0,
        duration: 0.5,
        delay: 0.2,
        ease: "back.out(2.5)",
      }
    );

    // Subtle nudge on the corresponding home__link
    linksRef.current.forEach((a, i) => {
      if (!a) return;
      gsap.to(a, {
        x: i === idx ? 6 : 0,
        opacity: i === idx ? 1 : 0.5,
        duration: 0.25,
        ease: "cubic.out",
      });
    });
  };

  useLayoutEffect(() => {
    let initialIdx = 0;
    if (typeof window !== "undefined" && window.__returnSlug) {
      const i = PROJECTS.findIndex((p) => p.slug === window.__returnSlug);
      if (i >= 0) initialIdx = i;
      delete window.__returnSlug;
    }
    reveal(initialIdx, true);

    // Reveal the home__links list with a stagger
    const links = linksRef.current.filter(Boolean) as HTMLAnchorElement[];
    gsap.set(links, { opacity: 0, x: -10 });
    gsap.to(links, {
      opacity: 0.5,
      x: 0,
      duration: 0.6,
      stagger: 0.05,
      delay: 0.15,
      ease: "back.out(1.5)",
      onComplete: () => {
        // Re-highlight the active one
        const active = links[initialIdx];
        if (active) gsap.to(active, { opacity: 1, x: 6, duration: 0.25 });
      },
    });

    // Stop Lenis on home so wheel events drive the cycler instead
    const lenis = (window as unknown as { __lenis?: LenisShape }).__lenis;
    lenis?.stop?.();

    return () => {
      lenis?.start?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (wheelLockRef.current || isNavigatingRef.current) return;
      if (Math.abs(e.deltaY) < 4) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const next =
        (activeIdxRef.current + dir + PROJECTS.length) % PROJECTS.length;
      reveal(next);
      wheelLockRef.current = true;
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 480);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  const navigate = (slug: string) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.push(`/work/${slug}`);
  };

  const onLinkEnter = (i: number) => {
    if (activeIdxRef.current !== i) reveal(i);
  };

  const onLinkClick = (
    e: ReactMouseEvent<HTMLAnchorElement>,
    slug: string
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
      return;
    e.preventDefault();
    navigate(slug);
  };

  return (
    <main
      className="fixed inset-0 overflow-hidden font-[var(--font-inter)]"
      style={{
        background: "#f4f0ed",
        color: "#252422",
        fontFamily: "var(--font-inter), Inter, sans-serif",
      }}
    >
      <div
        className="absolute z-10"
        style={{
          bottom: "20px",
          left: "20px",
          lineHeight: "1.5",
        }}
      >
        {PROJECTS.map((p, i) => (
          <div key={p.slug}>
            <a
              ref={(el) => {
                linksRef.current[i] = el;
              }}
              href={`/work/${p.slug}`}
              data-index={i}
              onMouseEnter={() => onLinkEnter(i)}
              onClick={(e) => onLinkClick(e, p.slug)}
              data-cursor="View"
              className="block no-underline cursor-pointer"
              style={{
                color: "#000",
                fontSize: "15px",
                fontWeight: 500,
                opacity: 0,
                willChange: "transform, opacity",
                transition: "color .15s ease",
              }}
            >
              {p.title}
            </a>
          </div>
        ))}
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center text-center cursor-pointer z-10"
        style={{
          bottom: "calc(9% - 20px)",
          padding: "20px",
          color: "#8c8080",
          minWidth: "311px",
        }}
        onClick={() => {
          const p = PROJECTS[activeIdxRef.current];
          if (p) navigate(p.slug);
        }}
        data-cursor="Open"
      >
        <div
          ref={titleRef}
          className="relative lowercase"
          style={{
            fontSize: "21px",
            letterSpacing: "-0.6px",
            lineHeight: 1,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 700,
          }}
        />
        <span
          ref={barRef}
          className="absolute pointer-events-none"
          style={{
            left: "10px",
            top: "48px",
            height: "1px",
            width: "calc(100% - 20px)",
            opacity: 0,
            transform: "scaleX(0)",
            transformOrigin: "center",
          }}
        >
          <svg
            width="311"
            height="6"
            viewBox="0 0 311 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              height: "5px",
              left: "50%",
              position: "absolute",
              top: "50%",
              transform: "translate3d(-50%,-50%,0)",
              width: "60%",
              opacity: 0.9,
              display: "block",
            }}
          >
            <path d={WAVY_PATH} stroke="currentColor" fill="none" />
          </svg>
        </span>
        <div
          ref={title2Ref}
          className="lowercase"
          style={{
            position: "absolute",
            left: "20px",
            top: "20px",
            zIndex: -1,
            opacity: 0.4,
            fontSize: "21px",
            letterSpacing: "-0.6px",
            lineHeight: 1,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 700,
            pointerEvents: "none",
          }}
        />
        <div
          ref={typeRef}
          style={{
            fontSize: "14px",
            marginTop: "10px",
            opacity: 0,
            fontFamily: "var(--font-inter), Inter, sans-serif",
          }}
        />
      </div>
    </main>
  );
}
