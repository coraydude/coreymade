// Site-wide image preloader. Kicks off HTTP fetches + decodes for every
// image referenced by the case studies so the home loader can actually
// wait on real bytes instead of being a purely cosmetic animation.
//
// MeshCarousel pulls covers through this cache for its WebGL textures
// (via awaitPreloadedImage). The case-page <img> tags don't read this
// cache directly, but they benefit indirectly — the preload warms the
// browser's HTTP + decode cache so the <img> loads are instant.

import { PROJECTS } from "./projects";

type Entry = {
  promise: Promise<HTMLImageElement | null>;
  img: HTMLImageElement;
};

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const resolveImageSrc = (src: string) =>
  src.startsWith("http") ? src : `${BASE_PATH}${src}`;

const cache = new Map<string, Entry>();
let allDonePromise: Promise<void> | null = null;

function preloadOne(src: string): Entry {
  const existing = cache.get(src);
  if (existing) return existing;

  const img = new Image();
  img.crossOrigin = "anonymous";
  // Browsers race the fetch the moment src is assigned; decode() then
  // waits for the bitmap to be fully decoded off the main thread.
  img.src = resolveImageSrc(src);

  const promise: Promise<HTMLImageElement | null> = new Promise((resolve) => {
    const done = () => resolve(img);
    const fail = () => resolve(null);
    if (typeof img.decode === "function") {
      img.decode().then(done).catch(() => {
        // decode() rejects on a handful of formats / older browsers —
        // fall back to the classic load event.
        if (img.complete && img.naturalWidth > 0) done();
        else {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", fail, { once: true });
        }
      });
    } else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", fail, { once: true });
    }
  });

  const entry: Entry = { promise, img };
  cache.set(src, entry);
  return entry;
}

// Pulls every image URL (covers + case-study stacks) out of PROJECTS.
function collectAllSrcs(): string[] {
  const urls: string[] = [];
  for (const p of PROJECTS) {
    urls.push(p.image);
    if (!p.images) continue;
    for (const row of p.images) {
      if (typeof row === "string") urls.push(row);
      else for (const s of row) urls.push(s);
    }
  }
  return urls;
}

// Kicks off preloads for every image and returns a single promise that
// resolves once they have all decoded (or failed). Safe to call multiple
// times — second call returns the same shared promise.
export function preloadAllSiteImages(timeoutMs = 8000): Promise<void> {
  if (allDonePromise) return allDonePromise;
  const all = collectAllSrcs().map((src) => preloadOne(src).promise);
  const settled = Promise.all(all).then(() => undefined);
  // Don't trap users on slow networks: race against a hard timeout so
  // the loader always eventually advances.
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  allDonePromise = Promise.race([settled, timeout]);
  return allDonePromise;
}

// Grab the already-decoded Image (if any) for a given URL. Returning
// the same Image instance lets a WebGL texture skip the decode on the
// texImage2D path (used by MeshCarousel for cover textures).
export function getPreloadedImage(src: string): HTMLImageElement | null {
  const entry = cache.get(src);
  if (!entry) return null;
  if (entry.img.complete && entry.img.naturalWidth > 0) return entry.img;
  return null;
}

// Promise for a single URL — registers with the preload cache so
// callers don't double-fetch.
export function awaitPreloadedImage(
  src: string
): Promise<HTMLImageElement | null> {
  const entry = preloadOne(src);
  return entry.promise;
}
