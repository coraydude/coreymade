"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import SplitType from "split-type";
import { useTitle } from "./TitleProvider";
import { PROJECTS } from "@/lib/projects";

function createTitleEl(text: string): HTMLDivElement {
  const div = document.createElement("div");
  div.textContent = text;
  Object.assign(div.style, {
    position: "absolute",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-display)",
    fontSize: "var(--title-size)",
    lineHeight: "1",
    letterSpacing: "-0.01em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    willChange: "transform",
    // Inherit from <body class="text-foreground"> so it matches the home
    // title that just morphed into this seat (and respects dark/light theme).
    color: "currentColor",
  } satisfies Partial<CSSStyleDeclaration>);
  return div;
}

function resolveText(
  pathname: string,
  activeProjectSlug: string | null
): string {
  if (pathname.startsWith("/work/")) {
    const slug = pathname.split("/").filter(Boolean).pop();
    const p = PROJECTS.find((x) => x.slug === slug);
    return p?.title ?? "";
  }
  if (pathname === "/") {
    const p = PROJECTS.find((x) => x.slug === activeProjectSlug);
    return p?.title ?? PROJECTS[0]?.title ?? "";
  }
  return "";
}

const TITLE_BREAKPOINT = "(min-width: 768px)";
// Minimum top inset so the title doesn't crash into the nav on tall
// narrow viewports.
const MIN_TOP_PX = 96;
// Gap between the bottom of the title and the start of the case body.
const TITLE_BODY_GAP_PX = 40;

// Width-driven font-size (what the title naturally wants to be).
const TITLE_VW_MOBILE = 0.22;
const TITLE_VW_DESKTOP = 0.14;
// Case body padding-top — mirrors pt-[42svh] / pt-[50svh] on the case
// page. Used to compute both the title's top position and the maximum
// title height that can fit above the body content.
const CONTENT_TOP_FRAC_MOBILE = 0.42;
const CONTENT_TOP_FRAC_DESKTOP = 0.5;

// Same min(vw-driven, vh-driven) cap as JS, expressed in CSS so the
// wrapper height + font-size collapse together when vertical space is
// the binding constraint (wide-short viewports). Without the vh cap a
// 14vw title can exceed the available space between the nav and the
// intro paragraph and overlap the content underneath.
const TITLE_SIZE_MOBILE = `min(${TITLE_VW_MOBILE * 100}vw, calc(${CONTENT_TOP_FRAC_MOBILE * 100}svh - ${MIN_TOP_PX + TITLE_BODY_GAP_PX}px))`;
const TITLE_SIZE_DESKTOP = `min(${TITLE_VW_DESKTOP * 100}vw, calc(${CONTENT_TOP_FRAC_DESKTOP * 100}svh - ${MIN_TOP_PX + TITLE_BODY_GAP_PX}px))`;

function computeTopPx(isCase: boolean): number {
  if (typeof window === "undefined") return 0;
  if (!isCase) return 0;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const isDesktop = window.matchMedia(TITLE_BREAKPOINT).matches;
  const vwSize = vw * (isDesktop ? TITLE_VW_DESKTOP : TITLE_VW_MOBILE);
  const contentTopFrac = isDesktop
    ? CONTENT_TOP_FRAC_DESKTOP
    : CONTENT_TOP_FRAC_MOBILE;
  const contentTopPx = vh * contentTopFrac;
  // Maximum height the title can occupy without crashing into the nav
  // OR overlapping the body content below — mirrors the CSS min() above.
  const vhCap = contentTopPx - MIN_TOP_PX - TITLE_BODY_GAP_PX;
  const titleHeightPx = Math.min(vwSize, vhCap);
  const top = contentTopPx - TITLE_BODY_GAP_PX - titleHeightPx;
  return Math.max(MIN_TOP_PX, top);
}

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function PersistentTitle() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const currentElRef = useRef<HTMLDivElement | null>(null);
  const prevTextRef = useRef<string | null>(null);
  const animatingRef = useRef(false);
  const queueRef = useRef<string | null>(null);
  const prevPathIsCaseRef = useRef<boolean | null>(null);
  const titleSplitRef = useRef<SplitType | null>(null);
  const titleTweenRef = useRef<gsap.core.Tween | null>(null);
  // Tracks whether the previous render was suppressed (home). Used so
  // the enter effect can detect a home → case transition and force a
  // re-create even when the destination project's title hasn't changed
  // since the user's previous visit to it.
  const wasSuppressedRef = useRef(true);

  const pathname = usePathname();
  const { activeProjectSlug } = useTitle();
  const isCase = pathname.startsWith("/work/");
  const text = resolveText(pathname, activeProjectSlug);
  // Home page uses MeshCarousel's own bottom-centered title; suppress the
  // big persistent title there so it doesn't overlap the cards.
  const suppress = pathname === "/";

  useIsoLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (prevPathIsCaseRef.current === null) {
      wrapper.style.top = `${computeTopPx(isCase)}px`;
      prevPathIsCaseRef.current = isCase;
    }
    const apply = () => {
      const mq = window.matchMedia(TITLE_BREAKPOINT);
      const size = mq.matches ? TITLE_SIZE_DESKTOP : TITLE_SIZE_MOBILE;
      wrapper.style.setProperty("--title-size", size);
      document.documentElement.style.setProperty("--title-size", size);
    };
    apply();
    const mql = window.matchMedia(TITLE_BREAKPOINT);
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // Refit the title when the viewport changes. Same shrink-to-fit logic
  // as the text-change effect, but runs on every resize so the title
  // doesn't overflow when the user shrinks the window.
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const refit = () => {
      const el = currentElRef.current;
      if (!el) return;
      el.style.fontSize = "var(--title-size)";
      const containerW = window.innerWidth - 48;
      const naturalW = el.scrollWidth;
      const SAFE_FRACTION = 0.92;
      if (naturalW > containerW * SAFE_FRACTION) {
        const currentSize = parseFloat(getComputedStyle(el).fontSize);
        const fittedSize = (currentSize * containerW * SAFE_FRACTION) / naturalW;
        el.style.fontSize = `${fittedSize}px`;
      }
    };
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refit, 100);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  // Create the initial title element synchronously before paint so the
  // case-study page doesn't render one frame without a title (which would
  // make the morphed home title appear to disappear on navigation).
  useIsoLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    if (currentElRef.current) return;
    const div = createTitleEl(text);
    inner.appendChild(div);
    currentElRef.current = div;
    prevTextRef.current = text;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate the title chars IN whenever the title becomes visible OR the
  // text changes. The OUT animation is owned by whoever is navigating
  // away (MeshCarousel for home→case, BackToWork for case→home,
  // NextProjectFooter for case→case), so we just need to rebuild and
  // raise the new chars here.
  //
  // useIsoLayoutEffect so the new chars are present + hidden in the DOM
  // before the browser paints — no flash of plain text between SplitType
  // revert and the chars getting their opacity:0 inline style.
  useIsoLayoutEffect(() => {
    if (suppress) {
      wasSuppressedRef.current = true;
      return;
    }
    const el = currentElRef.current;
    if (!el) return;
    // Re-create even when text hasn't changed if we're coming OUT of
    // suppress (home → case again on the same project). The previous
    // case visit left the chars in their exit "sunk" state and
    // BackToWork's home detour didn't revert the split, so without this
    // force-recreate the title silently stays invisible.
    const cameFromSuppress = wasSuppressedRef.current;
    wasSuppressedRef.current = false;
    if (
      prevTextRef.current === text &&
      titleSplitRef.current &&
      !cameFromSuppress
    ) {
      return;
    }
    prevTextRef.current = text;

    if (titleTweenRef.current) titleTweenRef.current.kill();
    // Hide the parent across the revert / textContent / re-split window so
    // the previous title text doesn't flash as plain text between the
    // outgoing chars vanishing and the new chars being hidden.
    gsap.set(el, { opacity: 0 });
    if (titleSplitRef.current) titleSplitRef.current.revert();
    // Replace regular spaces with non-breaking spaces so multi-word
    // titles ("Letter Clash") keep their space. SplitType wraps each
    // char (including a plain " ") in an inline-block span, and an
    // inline-block whose content is a regular space collapses to zero
    // width. An nbsp char never collapses.
    el.textContent = text.replace(/ /g, " ");

    // Auto-fit the title to viewport width. Reset to the var-driven
    // default first, then measure scrollWidth and scale font-size down
    // to a px value if the title would overflow the available space.
    // Without this, long titles (Letter Clash, Marketplace, NewStore)
    // crash into the side padding.
    el.style.fontSize = "var(--title-size)";
    const SIDE_PADDING_PX = 48; // px-6 each side
    const SAFE_FRACTION = 0.92; // keep a touch of breathing room
    const containerW = window.innerWidth - SIDE_PADDING_PX;
    const naturalW = el.scrollWidth;
    if (naturalW > containerW * SAFE_FRACTION) {
      const currentFontSize = parseFloat(getComputedStyle(el).fontSize);
      const fittedSize = (currentFontSize * containerW * SAFE_FRACTION) / naturalW;
      el.style.fontSize = `${fittedSize}px`;
    }

    titleSplitRef.current = new SplitType(el, { types: "chars" });
    const chars = titleSplitRef.current.chars;
    if (!chars || chars.length === 0) {
      gsap.set(el, { opacity: 1 });
      return;
    }
    gsap.set(chars, {
      y: 30,
      scaleY: 0,
      transformOrigin: "bottom center",
    });
    gsap.set(el, { opacity: 1 });
    // Restore the wrapper visibility — NextProjectFooter hides it during
    // its nav-out sequence to prevent a flash of the old title at the top
    // of the previous page when scroll resets. React's style-prop diff
    // doesn't catch the manual change so we explicitly reset it here.
    if (wrapperRef.current) {
      wrapperRef.current.style.visibility = "visible";
    }
    titleTweenRef.current = gsap.to(chars, {
      y: 0,
      scaleY: 1,
      duration: 0.55,
      stagger: { from: "center", axis: "x", amount: 0.08 },
      ease: "expo.out",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppress, text]);

  // While the title is suppressed (home page), keep its internal text in
  // sync with whatever the carousel is showing so that, when the user
  // clicks a project, the title element already has the right text loaded
  // and the enter animation above splits the correct word.
  useEffect(() => {
    if (!suppress) return;
    if (prevTextRef.current === text) return;
    const el = currentElRef.current;
    if (!el) return;
    if (titleSplitRef.current) {
      titleSplitRef.current.revert();
      titleSplitRef.current = null;
    }
    el.textContent = text;
    prevTextRef.current = text;
  }, [suppress, text]);

  // External exit trigger — case-→-case (NextProjectFooter) and other
  // outgoing transitions can dispatch `persistent-title:exit` to animate
  // the chars down individually. Uses the internal SplitType ref so we
  // don't depend on DOM queries (more reliable across renders).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { onComplete?: () => void }
        | undefined;
      const chars = titleSplitRef.current?.chars;
      if (!chars || chars.length === 0) {
        detail?.onComplete?.();
        return;
      }
      if (titleTweenRef.current) titleTweenRef.current.kill();
      titleTweenRef.current = gsap.to(chars, {
        y: 30,
        scaleY: 0,
        duration: 0.35,
        ease: "power3.in",
        stagger: { from: "edges", axis: "x", amount: 0.06 },
        transformOrigin: "bottom center",
        onComplete: () => detail?.onComplete?.(),
      });
    };
    window.addEventListener("persistent-title:exit", handler);
    return () => window.removeEventListener("persistent-title:exit", handler);
  }, []);

  useIsoLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (prevPathIsCaseRef.current === isCase) return;
    prevPathIsCaseRef.current = isCase;
    // Snap to the route's target slot synchronously before paint. The
    // visual transition from home → case is owned by MeshCarousel's FLIP
    // morph; we just need the destination to be ready.
    wrapper.style.top = `${computeTopPx(isCase)}px`;
  }, [isCase]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (!isCase) {
      wrapper.style.transform = "translate3d(0,0,0)";
      return;
    }
    let ticking = false;
    const apply = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (wrapperRef.current) {
          wrapperRef.current.style.transform = `translate3d(0,${-window.scrollY}px,0)`;
        }
        ticking = false;
      });
    };
    apply();
    window.addEventListener("scroll", apply, { passive: true });
    return () => window.removeEventListener("scroll", apply);
  }, [isCase]);

  return (
    <div
      ref={wrapperRef}
      data-persistent-title
      className="fixed left-0 right-0 flex justify-center pointer-events-none z-30 px-6"
      style={{
        height: "var(--title-size)",
        willChange: "top, opacity",
        // Hide on the home page (MeshCarousel renders its own bottom title
        // and morphs it into this wrapper's position on click). Keep the
        // wrapper mounted with real refs so the mount-time layout effects
        // can attach the title element / set `top` before the case page
        // ever paints.
        opacity: suppress ? 0 : 1,
        visibility: suppress ? "hidden" : "visible",
      }}
    >
      <div
        ref={innerRef}
        className="relative w-full max-w-[1600px]"
        style={{ height: "100%", overflow: "hidden" }}
      />
    </div>
  );
}
