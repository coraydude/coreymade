export type Project = {
  slug: string;
  title: string;
  year: string;
  category: string;
  image: string;
};

export const PROJECTS: Project[] = [
  {
    slug: "dutchie",
    title: "Dutchie",
    year: "2024",
    category: "Product · Web",
    image:
      "https://images.unsplash.com/photo-1530435460869-d13625c69bbf?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "pima",
    title: "Pima",
    year: "2024",
    category: "Product · Web",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "letter-clash",
    title: "Letter Clash",
    year: "2024",
    category: "Game · Mobile",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "sharpz",
    title: "Sharpz",
    year: "2023",
    category: "Product · Web",
    image:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "bloomfire",
    title: "Bloomfire",
    year: "2023",
    category: "Product · SaaS",
    image: "/projects/bloomfire.webp",
  },
  {
    slug: "capacity",
    title: "Capacity",
    year: "2023",
    category: "Product · AI",
    image:
      "https://images.unsplash.com/photo-1518972559570-7cc1309f3229?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "newstore",
    title: "NewStore",
    year: "2022",
    category: "Product · Commerce",
    image:
      "https://images.unsplash.com/photo-1483653364400-eedcfb9f1f88?auto=format&fit=crop&w=1600&q=80",
  },
];
