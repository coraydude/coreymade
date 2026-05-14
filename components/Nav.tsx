import TransitionLink from "./TransitionLink";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  return (
    <header
      data-nav
      className="fixed top-0 left-0 right-0 z-[8600] px-6 md:px-10 py-5 text-[#f1ecdf] mix-blend-difference pointer-events-none"
    >
      <div className="grid grid-cols-12 gap-6 items-start text-[11px] uppercase tracking-[0.04em] font-mono leading-[1.35] [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        <TransitionLink
          href="/"
          label="Haggard"
          data-cursor="Home"
          className="col-span-2 md:col-span-1 flex items-start gap-1"
        >
          <span>
            <span className="block">CH</span>
            <span className="block">24</span>
          </span>
          <span className="text-[8px] mt-[1px]">©</span>
        </TransitionLink>

        <div className="hidden md:flex md:col-span-3 flex-col">
          <span>Available for freelance</span>
          <a
            href="mailto:hello@coreymade.design"
            data-cursor="Write"
            className="underline underline-offset-[3px] hover:opacity-70 transition-opacity w-fit"
          >
            hello@coreymade.design
          </a>
        </div>

        <div className="hidden md:flex md:col-span-4 flex-col">
          <span>Product · UI · UX</span>
          <span>Brand systems</span>
          <span>Motion direction</span>
        </div>

        <div className="hidden md:flex md:col-span-3 flex-col">
          <span>Social:</span>
          <div className="flex gap-3">
            <a
              href="https://instagram.com/corey.haggard"
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="Instagram"
              className="hover:opacity-70 transition-opacity"
            >
              IG
            </a>
            <a
              href="https://dribbble.com/coreymade"
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="Dribbble"
              className="hover:opacity-70 transition-opacity"
            >
              DR
            </a>
            <a
              href="https://www.linkedin.com/in/coreymade/"
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="LinkedIn"
              className="hover:opacity-70 transition-opacity"
            >
              LI
            </a>
          </div>
        </div>

        <nav className="col-span-10 md:col-span-1 flex md:flex-col items-end justify-end gap-3 md:gap-0">
          <TransitionLink
            href="/"
            label="Work"
            data-cursor="Work"
            className="group flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              →
            </span>
            <span>Wrk</span>
          </TransitionLink>
          <TransitionLink
            href="/about"
            label="About"
            data-cursor="About"
            className="group flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              →
            </span>
            <span>Abt</span>
          </TransitionLink>
          <TransitionLink
            href="/contact"
            label="Write"
            data-cursor="Write"
            className="group flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              →
            </span>
            <span>Wrt</span>
          </TransitionLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
