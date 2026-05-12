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
  const { cover } = usePageTransition();

  const onClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (href === pathname) return;

    e.preventDefault();

    const text =
      label ??
      (typeof children === "string"
        ? children
        : (e.currentTarget.textContent ?? "").trim() || "→");

    await cover(text);
    router.push(href);
  };

  return (
    <Link href={href} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}
