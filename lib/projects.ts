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
  // Intro paragraph rendered at the top of the case-study page.
  description?: string;
};

export const PROJECTS: Project[] = [
  {
    slug: "dutchie",
    title: "Dutchie",
    year: "2024",
    category: "Product · Web",
    image: "/projects/dutchie/cover.png",
    description:
      "Dutchie is the operating system of the cannabis retail industry. POS, ecommerce, payments, loyalty, and marketing in a single stack. The company powers 6,500+ dispensaries, processes $22B+ in annual sales, and handles peak event traffic of 3,000 orders per minute.",
    images: [
      "/projects/dutchie/desktop-01-overview.png",
      [
        "/projects/dutchie/mobile-02-product.png",
        "/projects/dutchie/mobile-03-brand.png",
      ],
      "/projects/dutchie/desktop-04-loyalty.png",
      [
        "/projects/dutchie/mobile-04-loyalty.png",
        "/projects/dutchie/mobile-05-discounts.png",
      ],
      "/projects/dutchie/desktop-06-purchase-orders.png",
      [
        "/projects/dutchie/mobile-06-purchase-orders.png",
        "/projects/dutchie/mobile-07-segments.png",
      ],
      "/projects/dutchie/desktop-08-marketing.png",
      [
        "/projects/dutchie/mobile-08-marketing.png",
        "/projects/dutchie/mobile-09-workflow.png",
      ],
      "/projects/dutchie/desktop-10-segment-builder.png",
    ],
  },
  {
    slug: "pima",
    title: "Pima",
    year: "2024",
    category: "Product · Web",
    image: "/projects/pima/cover.png",
    description:
      "Pima is a point of sale system built specifically for apparel retail. Sales, inventory, sizing matrices, season changeovers, returns. A specialist tool for an industry that has spent two decades using software built for someone else.",
    images: [
      "https://images.unsplash.com/photo-1431576901776-e539bd916ba2?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    slug: "sharpz",
    title: "Sharpz",
    year: "2023",
    category: "Product · Web",
    image: "/projects/sharpz/cover.png",
    description:
      "Sharpz is a social network for sports bettors on iOS and Android. Users link their sportsbook so every pick is verified, and a public leaderboard ranks the top 25 and the bottom 25 by real win rate. The wedge is transparency.",
    images: [
      "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1551836022-aadb801c60ee?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    slug: "bloomfire",
    title: "Bloomfire",
    year: "2023",
    category: "Product · SaaS",
    image: "/projects/bloomfire/cover.png",
    description:
      "Bloomfire is an enterprise knowledge management platform used by some of the largest organizations in the world. Enterprise search, an AI authoring assistant, content governance, and analytics in a single product. Customers report 60% faster onboarding and a 9.8% gain in team capacity.",
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
    slug: "capacity",
    title: "Capacity",
    year: "2023",
    category: "Product · AI",
    image: "/projects/capacity/cover.png",
    description:
      "Capacity is an AI support automation platform used by more than 20,000 companies. It connects 250+ business systems to answer questions, automate repetitive support, and build workflows that previously took quarters of engineering.",
  },
  {
    slug: "mindful",
    title: "Mindful",
    year: "2023",
    category: "Product · Health",
    image: "/projects/mindful/cover.png",
    description:
      "Mindful is a healthcare navigation app that brings care plans, appointments, insurance, and provider discovery into a single product. It helps people make sense of their coverage and stay on top of their care.",
    images: [
      "/projects/mindful/health-home.jpg",
      "/projects/mindful/browse.jpg",
      "/projects/mindful/appointments.jpg",
      "/projects/mindful/care-plan.jpg",
      "/projects/mindful/insurance.jpg",
    ],
  },
];
