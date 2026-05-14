export const metadata = {
  title: "Contact — Corey Haggard",
};

const CHANNELS = [
  {
    label: "Email",
    value: "hello@coreymade.design",
    href: "mailto:hello@coreymade.design",
  },
  {
    label: "Dribbble",
    value: "@coreymade",
    href: "https://dribbble.com/coreymade",
  },
  {
    label: "Instagram",
    value: "@corey.haggard",
    href: "https://instagram.com/corey.haggard",
  },
  {
    label: "LinkedIn",
    value: "in/coreymade",
    href: "https://www.linkedin.com/in/coreymade/",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-svh px-6 md:px-10 pt-32 pb-24 overflow-x-hidden">
      {/* ─────────────── Big headline ─────────────── */}
      <h1
        className="uppercase tracking-[-0.01em]"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(72px, 17vw, 320px)",
          lineHeight: 0.95,
        }}
      >
        Let&rsquo;s work
        <br />
        Together.
      </h1>

      {/* ─────────────── Status / availability ─────────────── */}
      <div className="mt-12 md:mt-20 max-w-[1400px]">
        <p className="text-[28px] md:text-[48px] leading-[1.18] tracking-[-0.01em] text-foreground/85 font-light">
          <span className="inline-flex items-center gap-2 mr-2 align-middle">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-foreground animate-ping opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground" />
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
              Open
            </span>
          </span>
          Currently booking early-stage product + brand engagements for
          Q3 2026 and beyond. Quick replies on email, slower on socials.
        </p>
      </div>

      {/* ─────────────── Channels (display only, no form) ─────────────── */}
      <div className="mt-20 md:mt-28 grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-6 max-w-[1400px]">
        <div className="md:col-span-3 text-[11px] uppercase tracking-[0.18em] text-muted">
          Channels
        </div>
        <ul className="md:col-span-9 border-t border-rule">
          {CHANNELS.map((c) => (
            <li key={c.label}>
              <a
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                data-cursor={c.label}
                className="group flex items-baseline justify-between border-b border-rule py-5 md:py-7"
              >
                <span className="flex items-baseline gap-6 md:gap-12">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-muted w-28">
                    {c.label}
                  </span>
                  <span
                    className="tracking-[-0.01em] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(28px, 4vw, 64px)",
                      lineHeight: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    {c.value}
                  </span>
                </span>
                <span className="hidden md:inline text-[11px] uppercase tracking-[0.18em] text-muted opacity-0 -translate-x-3 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0">
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* ─────────────── Footer note ─────────────── */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-6 max-w-[1400px]">
        <div className="md:col-span-3 text-[11px] uppercase tracking-[0.18em] text-muted">
          Based
        </div>
        <div className="md:col-span-9 text-[14px] md:text-[15px] text-foreground/70 font-light max-w-2xl">
          Tampa, Florida — working with teams worldwide.
        </div>
      </div>
    </main>
  );
}
