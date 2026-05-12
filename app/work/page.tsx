"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The home page (/) IS the work page (MeshCarousel). /work bounces back
// there. Client-side redirect because static export can't run server-side
// `redirect()`.
export default function WorkPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
