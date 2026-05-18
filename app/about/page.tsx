import TransitionLink from "@/components/TransitionLink";
import { PROJECTS } from "@/lib/projects";

export const metadata = {
  title: "About — Corey Haggard",
};

const RECOGNITION = [
  { name: "Awwwards Honorable Mention", year: "2020" },
  { name: "CSS Design Awards Special Kudos", year: "2020" },
  { name: "Lapa Ninja Feature", year: "2020" },
  { name: "Awwwards Honorable Mention (Mossio)", year: "2019" },
  { name: "Awwwards Honorable Mention (Mossio)", year: "2015" },
  { name: "Awwwards Nominee", year: "2013" },
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
            lineHeight: 0.92,
          }}
        >
          Strategy
          <br />
          that
          <br />
          ships.
        </h1>
      </section>

      {/* ─────────────── Bio ─────────────── */}
      <section className="px-6 md:px-10 py-20 md:py-28 border-t border-rule">
        <div className="max-w-[1400px] space-y-8">
          <p className="text-[28px] md:text-[48px] leading-[1.18] tracking-[-0.01em] text-foreground/85 font-light">
            Product designer leading zero-to-one products, platform
            consolidations, and the design practices that ship after I
            roll off.
          </p>
          <p className="text-[16px] md:text-[18px] leading-[1.55] text-foreground/70 font-light max-w-3xl">
            I&apos;m brought in for the moments where a product needs its
            first shape, a platform needs to consolidate into one, or a
            design team needs the rituals and systems to ship without me.
            I work directly with founders and product leads to set the
            vision, make the strategic calls, and translate them into
            shipped work, staying close enough to the build to keep the
            spec honest. Previously Design Lead at Dutchie and cofounder
            of Mossio, an independent studio I ran for nine years
            shipping product work for funded startups and Fortune 500
            brands.
          </p>
        </div>
      </section>

      {/* ─────────────── How I work ─────────────── */}
      <section className="px-6 md:px-10 py-20 md:py-28 border-t border-rule">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-6 max-w-[1400px]">
          <div className="md:col-span-3 text-[11px] uppercase tracking-[0.18em] text-muted">
            How I work
          </div>
          <p className="md:col-span-9 max-w-3xl text-[16px] md:text-[18px] leading-[1.55] text-foreground/85 font-light">
            I take on engagements where the design problem is also a
            business problem, and I work directly with founders and
            product leads to make the calls that affect both. The work
            isn&apos;t judged by launch. It&apos;s judged by whether the
            team can extend the system without me, which means I spend as
            much time on the rituals, decision frameworks, and craft bar
            that outlive the engagement as I do on the screens
            themselves.
          </p>
        </div>
      </section>

      {/* ─────────────── Selected clients ─────────────── */}
      <section className="px-6 md:px-10 py-20 md:py-28 border-t border-rule">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-6 max-w-[1400px]">
          <div className="md:col-span-3 text-[11px] uppercase tracking-[0.18em] text-muted">
            Selected clients
          </div>
          <ul className="md:col-span-9 max-w-3xl space-y-2 text-[16px] md:text-[18px] tracking-[-0.005em]">
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
              href="mailto:hello@coreymade.design"
              data-cursor="Write"
              className="block uppercase tracking-[-0.01em] leading-[0.95] hover:opacity-70 transition-opacity"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(40px, 9vw, 160px)",
              }}
            >
              hello@
              <br />
              coreymade.design
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
