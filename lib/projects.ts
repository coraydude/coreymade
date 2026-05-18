export type Project = {
  slug: string;
  title: string;
  year: string;
  category: string;
  // Carousel cover (also used as a fallback if `images` is empty).
  image: string;
  // Case-study image stack. Each entry is either:
  //   • a string → renders as a single full-bleed 16:9 block.
  //   • a string[] → renders as a single row with N images side by
  //     side (e.g. ["a.png", "b.png"] for a two-up row).
  // Leave empty/undefined and the page will show the cover image once.
  images?: (string | string[])[];
  // Intro paragraph(s) rendered at the top of the case-study page.
  // Combines company context + the brief / strategic role. Pass an
  // array to render as multiple paragraphs.
  description?: string | string[];
  // Outcome paragraph(s) rendered below the image stack, before the
  // "Up next" footer. Numbers should be embedded in prose and tied to
  // business outcomes (not just usage stats). Pass an array to render
  // as multiple paragraphs.
  results?: string | string[];
};

export const PROJECTS: Project[] = [
  {
    slug: "dutchie",
    title: "Dutchie",
    year: "2024",
    category: "Product · Web",
    image: "/projects/dutchie/cover.png",
    description: [
      "Dutchie is the operating system of the cannabis retail industry, powering 6,500+ dispensaries with POS, ecommerce, payments, loyalty, and marketing in a single stack. I joined as a Senior Product Designer when Dutchie served 300 dispensaries and held 20% market share, and grew with the company through Staff Product Designer and into Design Lead while it scaled to over 6,500 dispensaries and more than 60% of the market.",
      "The work spanned every surface of the product, from consumer ecommerce to back office tooling to the loyalty and marketing systems that drive repeat revenue, and I led the design team responsible for the AI tooling that became the company's most defensible bet.",
    ],
    results: [
      "During my tenure I shipped work across nearly every product surface. The consumer ecommerce experience moved from a checkout for a single brand into a multi-tenant marketplace serving the full dispensary network. The loyalty and marketing systems shipped as a full lifecycle suite. The back office tooling absorbed multiple acquired products into a single operating model. And the AI tooling my team led became the first cross-product surface in the company, defining the patterns the rest of the suite would inherit.",
      "The design org grew alongside the product. The team I left behind was running the same surfaces I had taken from Senior through Staff and into Design Lead, with the operating model and craft bar that came out of those years still in place.",
    ],
    images: [
      "/projects/dutchie/desktop-1.png",
      "/projects/dutchie/desktop-1-1.png",
      "/projects/dutchie/desktop-1-2.png",
      "/projects/dutchie/desktop-1-3.png",
      "/projects/dutchie/desktop-1-4.png",
      "/projects/dutchie/desktop-1-5.png",
      "/projects/dutchie/desktop-1-6.png",
      [
        "/projects/dutchie/mobile-1.png",
        "/projects/dutchie/mobile-2.png",
      ],
      "/projects/dutchie/mobile-3.png",
    ],
  },
  {
    slug: "pima",
    title: "Pima",
    year: "2024",
    category: "Product · Web",
    image: "/projects/pima/cover.png",
    description:
      "Pima is a point of sale system built for apparel retail, replacing tools the industry had spent two decades inheriting from grocery chains and big retailers. I was brought in to lead design end-to-end, partnering directly with the founder on product strategy and the design system that would let an engineering team of two ship a credible specialist tool. The constraint was simple: every flow had to feel right to people who run a store in the morning and a Shopify in the afternoon, with no IT to call.",
    results: [
      "Pima shipped V1 in seven months. The size matrix interaction model became the company's primary technical moat, and the design system supported the first two product surfaces (returns and consignment) without further design involvement from me.",
      "The seed round that followed valued the company at $14M on the back of a 4.8 NPS from the pilot retailers and a ninety percent activation rate on the cohort that signed up during early access.",
    ],
    images: [
      "/projects/pima/desktop-1.png",
      "/projects/pima/desktop-2.png",
      "/projects/pima/desktop-3.png",
      "/projects/pima/desktop-4.png",
      [
        "/projects/pima/mobile-1.png",
        "/projects/pima/mobile-2.png",
      ],
    ],
  },
  {
    slug: "sharpz",
    title: "Sharpz",
    year: "2023",
    category: "Product · Web",
    image: "/projects/sharpz/cover.png",
    description:
      "Sharpz is a social network for sports bettors. Every pick is verified by linking the user's sportsbook before they post, and a public leaderboard ranks the top 25 and bottom 25 by real win rate. I led design strategy and execution in partnership with the founding team, joining at the napkin stage and staying through launch. The remit was the product itself, but the real assignment was to leave behind a design organization the team could run without me.",
    results: [
      "Sharpz launched on iOS and Android eight months after kickoff. The verification flow at signup became the trust pattern every subsequent feature inherited, the design system carried the next two product surfaces without rework, and the leaderboard became the company's primary press hook, anchoring a $4M seed at the end of the year.",
      "Eighteen thousand verified sportsbook links inside the first quarter and a 4.8 App Store rating across 1,200 reviews. The number I'm prouder of is the velocity it bought the team: average ship cycle from Figma start to TestFlight dropped from six weeks to two.",
    ],
    images: [
      "/projects/sharpz/desktop-1.png",
      "/projects/sharpz/desktop-2.png",
      "/projects/sharpz/desktop-3.png",
      "/projects/sharpz/desktop-4.png",
    ],
  },
  {
    slug: "bloomfire",
    title: "Bloomfire",
    year: "2023",
    category: "Product · SaaS",
    image: "/projects/bloomfire/cover.png",
    description:
      "Bloomfire is an enterprise knowledge management platform used by Fortune 500 companies including Capital One, Comcast, and Wayfair. The product had grown in layers over a decade: enterprise search, AI authoring, content governance, and analytics had each been built by different teams in different design eras, and the surface area was outpacing the coherence. I was brought in to lead design on the consolidation, partnering with the VP of Product on a single mental model for the product and the design system that would carry it.",
    results: [
      "The unified shell shipped in six months. Average task time on the three busiest flows dropped between twenty-two and forty-one percent in the month after rollout, and the customers surveyed reported a 9.8% gain in team capacity that anchored the next round of enterprise sales collateral.",
      "The design system shipped with four squads pulling from it on day one. It now governs every new feature in the product, and the patterns we wrote for the AI authoring assistant became the company's template for shipping AI surfaces across the rest of the suite.",
    ],
    images: [
      "/projects/bloomfire/bloomfire-1.png",
      "/projects/bloomfire/bloomfire-1-1.png",
      "/projects/bloomfire/bloomfire-1-2.png",
      "/projects/bloomfire/bloomfire-1-3.png",
      "/projects/bloomfire/bloomfire-1-4.png",
      "/projects/bloomfire/bloomfire-1-5.png",
      "/projects/bloomfire/bloomfire-1-6.png",
      "/projects/bloomfire/bloomfire-1-7.png",
    ],
  },
  {
    slug: "mindful",
    title: "Mindful",
    year: "2023",
    category: "Product · Health",
    image: "/projects/mindful/cover.png",
    description:
      "Mindful is a healthcare navigation app that brings care plans, appointments, insurance, and provider discovery into a single product, sitting on top of the fragmented information layer that makes it hard for patients to know what their coverage actually covers. I led design end-to-end, partnering with the founder and the head of clinical content on the architecture, the visual system, and the interaction patterns for surfaces patients touch when they are already stressed.",
    results: [
      "Mindful launched as a private beta to 12,000 members at three employer customers. The interaction patterns from the appointment booking flow were carried into two adjacent products in the suite without redesign, and the company's clinical advisory board cited the care plan visualization in its case for expanding the product into Medicare Advantage.",
      "Support call volume for plan questions, historically the most common reason people called, dropped 38% in the first sixty days. Time from signup to first appointment halved, and the seventy-five percent of members who completed onboarding came back weekly through the first quarter.",
    ],
    images: [
      "/projects/mindful/health-home.jpg",
      "/projects/mindful/browse.jpg",
      "/projects/mindful/appointments.jpg",
      "/projects/mindful/care-plan.jpg",
      "/projects/mindful/insurance.jpg",
    ],
  },
];
