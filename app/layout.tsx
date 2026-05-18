import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono, Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import CustomCursor from "@/components/CustomCursor";
import Nav from "@/components/Nav";
import PageTransition from "@/components/PageTransition";
import TitleProvider from "@/components/TitleProvider";
import PersistentTitle from "@/components/PersistentTitle";
import ThemeProvider from "@/components/ThemeProvider";
import MeshCarousel from "@/components/MeshCarousel";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);if(!sessionStorage.getItem('carousel-intro-seen')&&window.location.pathname.replace(/\\/$/,'')===''){document.documentElement.classList.add('intro-pending');}}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const anton = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Corey Haggard — Digital Designer",
  description:
    "Portfolio of Corey Haggard. Digital designer, motion thinker and product builder.",
  // Adaptive theme-color stops the white nav-bar flash Chrome paints
  // during client-side route transitions on dark themes.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#f1ecdf" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} ${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-svh text-foreground">
        <ThemeProvider>
          <SmoothScroll />
          <CustomCursor />
          <TitleProvider>
            <PersistentTitle />
            {/* MeshCarousel lives at the layout level so its WebGL
                renderer + textures persist across navigation. On non-
                home routes it fades to opacity 0 with pointer-events
                disabled, but never unmounts. Returning home is then
                instant — no shader recompile, no texture re-download. */}
            <MeshCarousel />
            <PageTransition>
              <Nav />
              {children}
            </PageTransition>
          </TitleProvider>
        </ThemeProvider>
      </body>
      {/* GA4 — only loads in production builds. Handles SPA route
          changes automatically; no need for a route-change listener. */}
      {process.env.NODE_ENV === "production" && (
        <GoogleAnalytics gaId="G-F9RBLQV74Y" />
      )}
    </html>
  );
}
