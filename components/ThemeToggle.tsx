"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showDark = mounted && theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      suppressHydrationWarning
      data-cursor={showDark ? "Light" : "Dark"}
      aria-label={`Switch to ${showDark ? "light" : "dark"} mode`}
      className="text-[11px] uppercase tracking-[0.04em] font-mono text-white hover:opacity-70 transition-opacity"
    >
      <span suppressHydrationWarning>{showDark ? "Lgt" : "Drk"}</span>
    </button>
  );
}
