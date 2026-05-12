"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ComponentProps, MouseEvent } from "react";
import gsap from "gsap";

type Props = Omit<ComponentProps<typeof Link>, "onClick" | "href"> & {
  href: string;
  projectTitle?: string;
};

export default function CarouselCardLink({
  href,
  children,
  ...rest
}: Props) {
  const router = useRouter();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (typeof href !== "string") return;
    if (href.startsWith("http") || href.startsWith("mailto:")) return;

    e.preventDefault();

    const fadeEl =
      document.querySelector<HTMLElement>("[data-carousel-fade]");

    if (fadeEl) {
      gsap.to(fadeEl, {
        opacity: 0,
        y: 40,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => router.push(href),
      });
    } else {
      router.push(href);
    }
  };

  return (
    <Link href={href} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}
