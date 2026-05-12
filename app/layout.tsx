import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import CustomCursor from "@/components/CustomCursor";
import Nav from "@/components/Nav";
import PageTransition from "@/components/PageTransition";
import TitleProvider from "@/components/TitleProvider";
import PersistentTitle from "@/components/PersistentTitle";
import Loader from "@/components/Loader";
import ThemeProvider from "@/components/ThemeProvider";
import BackgroundNoise from "@/components/BackgroundNoise";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

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

const schabo = localFont({
  src: [
    {
      path: "../public/fonts/SCHABO-XCondensed.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/SCHABO-XCondensed.woff",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Corey Haggard — Digital Designer",
  description:
    "Portfolio of Corey Haggard. Digital designer, motion thinker and product builder.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${schabo.variable} ${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-svh text-foreground">
        <ThemeProvider>
          <SmoothScroll />
          <BackgroundNoise />
          <CustomCursor />
          <Loader />
          <TitleProvider>
            <PersistentTitle />
            <PageTransition>
              <Nav />
              {children}
            </PageTransition>
          </TitleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
