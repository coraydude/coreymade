"use client";

import Image from "next/image";

type Props = {
  // Each row is either a single src (full-bleed 16:9) or an array of
  // srcs that render side by side in one flex row (4:5 aspect each).
  rows: (string | string[])[];
  alt?: string;
};

// Plain-DOM case-study image stack. Replaced the WebGL renderer (the
// scroll-bend effect was the dominant source of GPU saturation during
// scroll). Browser handles loading/decoding/compositing natively.
export default function CaseStudyImages({ rows, alt }: Props) {
  // Running flat index used to label images (alt text) consistently
  // across pair rows.
  let flatIdx = 0;
  return (
    <div className="px-6 md:px-10 space-y-6 md:space-y-10">
      {rows.map((row, rowIdx) => {
        if (typeof row === "string") {
          const i = flatIdx++;
          return (
            <div
              key={rowIdx}
              className="relative w-full max-w-[1600px] mx-auto overflow-hidden"
              style={{ aspectRatio: "16 / 9" }}
            >
              <Image
                src={row}
                alt={
                  alt ? `${alt} — image ${i + 1}` : `case study image ${i + 1}`
                }
                fill
                sizes="(max-width: 1600px) 100vw, 1600px"
                className="object-cover"
                priority={i === 0}
                quality={95}
              />
            </div>
          );
        }
        return (
          <div
            key={rowIdx}
            className="flex gap-6 md:gap-10 max-w-[1600px] mx-auto"
          >
            {row.map((src, j) => {
              const i = flatIdx++;
              return (
                <div
                  key={j}
                  className="relative flex-1 overflow-hidden"
                  style={{ aspectRatio: "4 / 5" }}
                >
                  <Image
                    src={src}
                    alt={
                      alt
                        ? `${alt} — image ${i + 1}`
                        : `case study image ${i + 1}`
                    }
                    fill
                    sizes="(max-width: 768px) 50vw, 800px"
                    className="object-cover"
                    quality={95}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
