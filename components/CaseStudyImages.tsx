"use client";

import Image from "next/image";

type Props = {
  srcs: string[];
  alt?: string;
};

export default function CaseStudyImages({ srcs, alt }: Props) {
  return (
    <div className="px-6 md:px-10 space-y-6 md:space-y-10">
      {srcs.map((src, i) => (
        <div
          key={i}
          className="relative w-full max-w-[1600px] mx-auto overflow-hidden"
          style={{ aspectRatio: "16 / 9" }}
        >
          <Image
            src={src}
            alt={alt ? `${alt} — image ${i + 1}` : `case study image ${i + 1}`}
            fill
            sizes="(max-width: 1600px) 100vw, 1600px"
            className="object-cover"
            priority={i === 0}
            // Next.js Image defaults to quality 75 + WebP re-encode, which
            // adds compression grain in flat regions. Bump to near-lossless
            // so case images match the raw bytes the carousel renders.
            quality={95}
          />
        </div>
      ))}
    </div>
  );
}
