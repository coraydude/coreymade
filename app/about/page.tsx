import TransitionLink from "@/components/TransitionLink";
import { PROJECTS } from "@/lib/projects";

export const metadata = {
  title: "About — Corey Haggard",
};

const PRACTICE = [
  "Product design",
  "Motion direction",
  "Brand systems",
  "Front-end engineering",
];

const RECOGNITION = [
  { name: "Awwwards Site of the Day", year: "2024" },
  { name: "FWA", year: "2024" },
  { name: "Communication Arts", year: "2023" },
];

export default function AboutPage() {
  return (
    <main className="min-h-svh">
      {/* ─────────────── Headline ─────────────── */}
      <section className="px-6 md:px-10 pt-36 pb-24 md:pt-44 md:pb-32">
        <div className="flex items-baseline justify-between mb-10 md:mb-16">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
            About — Corey Haggard
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
            ©2026
          </div>
        </div>

        <h1
          className="uppercase tracking-[-0.01em]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(64px, 18vw, 320px)",
            lineHeight: 0.82,
          }}
        >
          I make
          <br />
          things
          <br />
          inevitable.
        </h1>
      </section>

      {/* ─────────────── Bio ─────────────── */}
      <section className="px-6 md:px-10 py-20 md:py-28 border-t border-rule">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-6 max-w-[1400px]">
          <div className="md:col-span-3 text-[11px] uppercase tracking-[0.18em] text-muted">
            Bio
          </div>
          <div className="md:col-span-9 space-y-8 max-w-3xl">
            <p className="text-[22px] md:text-[32px] leading-[1.22] tracking-[-0.015em] font-light">
              I work at the seam of product, motion, and brand — shipping
              interfaces that hold up to scrutiny: precise, calm, and
              memorable in the small moments.
            </p>
            <p className="text-[16px] md:text-[18px] leading-[1.55] text-foreground/75 font-light">
              Recent collaborations have ranged from early-stage product teams
              to in-house brand systems. I work end to end — strategy, IA,
              interaction, motion direction, and front-end implementation
              when it sharpens the result.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────── Practice + Clients ─────────────── */}
      <section className="px-6 md:px-10 py-20 md:py-28 border-t border-rule">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-12 max-w-[1400px]">
          <div className="md:col-span-3 text-[11px] uppercase tracking-[0.18em] text-muted">
            Practice
          </div>
          <ul className="md:col-span-3 space-y-2 text-[16px] md:text-[18px] tracking-[-0.005em]">
            {PRACTICE.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>

          <div className="md:col-span-3 text-[11px] uppercase tracking-[0.18em] text-muted">
            Selected clients
          </div>
          <ul className="md:col-span-3 space-y-2 text-[16px] md:text-[18px] tracking-[-0.005em]">
            {PROJECTS.map((p) => (
              <li key={p.slug}>
                <TransitionLink
                  href={`/work/${p.slug}`}
                  label={p.title}
                  data-cursor="View"
                  className="border-b border-transparent hover:border-foreground transition-colors"
                >
                  {p.title}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─────────────── Recognition ─────────────── */}
      <section className="px-6 md:px-10 py-20 md:py-28 border-t border-rule">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-6 max-w-[1400px]">
          <div className="md:col-span-3 text-[11px] uppercase tracking-[0.18em] text-muted">
            Recognition
          </div>
          <ul className="md:col-span-9 max-w-3xl">
            {RECOGNITION.map((r) => (
              <li
                key={r.name}
                className="flex items-baseline justify-between gap-6 py-4 border-b border-rule text-[16px] md:text-[18px]"
              >
                <span>{r.name}</span>
                <span className="text-[12px] tabular-nums text-muted">
                  {r.year}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─────────────── Contact ─────────────── */}
      <section className="px-6 md:px-10 py-24 md:py-36 border-t border-rule">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-8 max-w-[1400px]">
          <div className="md:col-span-3 text-[11px] uppercase tracking-[0.18em] text-muted">
            Get in touch
          </div>
          <div className="md:col-span-9">
            <a
              href="mailto:hello@coreyhaggard.com"
              data-cursor="Write"
              className="block uppercase tracking-[-0.01em] leading-[0.9] hover:opacity-70 transition-opacity"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(40px, 9vw, 160px)",
              }}
            >
              hello@
              <br />
              coreyhaggard.com
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
