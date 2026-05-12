export type Project = {
  slug: string;
  title: string;
  year: string;
  category: string;
  // Carousel cover (also used as a fallback if `images` is empty).
  image: string;
  // Case-study image stack. Each entry renders as a full-bleed 16:9
  // block on the slug page. Leave empty/undefined and the page will
  // show the cover image once.
  images?: string[];
};

export const PROJECTS: Project[] = [
  {
    slug: "dutchie",
    title: "Dutchie",
    year: "2024",
    category: "Product · Web",
    image: "/projects/dutchie.png",
    images: [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    slug: "pima",
    title: "Pima",
    year: "2024",
    category: "Product · Web",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1431576901776-e539bd916ba2?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    slug: "letter-clash",
    title: "Letter Clash",
    year: "2024",
    category: "Game · Mobile",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    slug: "sharpz",
    title: "Sharpz",
    year: "2023",
    category: "Product · Web",
    image:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80",
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
    image: "/projects/bloomfire.webp",
    images: [
      "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    slug: "capacity",
    title: "Capacity",
    year: "2023",
    category: "Product · AI",
    image:
      "https://images.unsplash.com/photo-1518972559570-7cc1309f3229?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1655720828018-edd2daec9349?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1633412802994-5c058f151b66?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    slug: "newstore",
    title: "NewStore",
    year: "2022",
    category: "Product · Commerce",
    image:
      "https://images.unsplash.com/photo-1483653364400-eedcfb9f1f88?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1604740114043-e6a04e80b1e6?auto=format&fit=crop&w=1600&q=80",
    ],
  },
];
