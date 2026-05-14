"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ComponentProps, MouseEvent, ReactNode } from "react";
import { usePageTransition } from "./PageTransition";

type Props = Omit<ComponentProps<typeof Link>, "onClick" | "href"> & {
  href: string;
  label?: string;
  children: ReactNode;
};

export default function TransitionLink({
  href,
  label,
  children,
  ...rest
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { navigate } = usePageTransition();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    // Normalize trailing slashes so /about and /about/ compare equal
    // (Next.js static export adds them; usePathname doesn't always).
    const norm = (s: string) => s.replace(/\/$/, "") || "/";
    if (norm(href) === norm(pathname)) {
      // Already on this page — block to prevent firing the curtain
      // without a route change to reveal against.
      e.preventDefault();
      return;
    }

    e.preventDefault();

    // Case-study pages own their own enter/exit choreography (chars
    // rising, content fade). Don't layer the curtain on top of them —
    // just push the route directly.
    if (href.startsWith("/work/")) {
      router.push(href);
      return;
    }

    const text =
      label ??
      (typeof children === "string"
        ? children
        : (e.currentTarget.textContent ?? "").trim() || "→");

    navigate(href, text);
  };

  return (
    <Link href={href} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}
