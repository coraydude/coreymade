import type { NextConfig } from "next";

// GitHub Pages deployment config.
//
// • `output: "export"` — produces a static `out/` directory next build can ship
//   to GH Pages (no Node runtime needed).
// • `basePath` — set if the repo lives at github.com/<user>/<repo> (the site
//   serves from /<repo>). For a user-site repo (e.g. <user>.github.io) leave
//   it empty by setting `NEXT_PUBLIC_BASE_PATH=""` in the deploy workflow.
// • `images.unoptimized` — GH Pages has no image optimizer; serve raw bytes.
// • `trailingSlash` — ensures /work/dutchie/ resolves to dutchie/index.html.

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
