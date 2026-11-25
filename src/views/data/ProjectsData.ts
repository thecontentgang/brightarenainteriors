// src/data/projectsData.ts

export interface ProjectSEO {
  metaTitle: string;
  description: string;
  keywords: string;
  h1?: string;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  heroTitle?: string; // <-- Added property
  shortDescription: string;
  description: string;
  heroImage: string;
  gallery: string[];
  seo?: ProjectSEO;
}

export const projectsData: Project[] = [
  {
    id: 1,
    slug: "forest-edge-interior-design-project-hyderabad",
    title: "ForestEdge",
    heroTitle: "A Resort-Like Residential Haven", // <-- Added
    shortDescription: "Luxury Residential, Interior Design",
    description: "A premium residential space designed with timeless interiors, seamlessly blending indoor and outdoor functional areas for a resort-like feel.",
    heroImage: "/projectsImg/forest-edge/fe-img1.webp",
    gallery: Array.from({ length: 10 }, (_, i) => `/projectsImg/forest-edge/fe-img${i + 1}.webp`),
    seo: {
      metaTitle: "Forest Edge Interior Design Project in Hyderabad | Bright Arena Interiors",
      description: "Explore the Forest Edge interior design project by Bright Arena Interiors, showcasing modern layouts, premium finishes, and thoughtfully designed living spaces in Hyderabad.",
      keywords: "ForestEdge interiors, luxury residential design, resort-style home interiors, premium interior designers",
      h1: "Forest Edge Interior Design Project in Hyderabad"
    }
  },
  {
    id: 2,
    slug: "rajapushpa-interior-design-project-hyderabad",
    title: "Rajapushpa Project",
    heroTitle: "Modern Elegance Refined", // <-- Added
    shortDescription: "Premium Apartment, Styling",
    description: "Modern elegant residential interiors crafted for luxurious living, featuring seamless layouts and bespoke furniture tailored for maximum comfort.",
    heroImage: "/projectsImg/rajapushpa/rp-img1.webp",
    gallery: Array.from({ length: 15 }, (_, i) => `/projectsImg/rajapushpa/rp-img${i + 1}.webp`),
    seo: {
      metaTitle: "Rajapushpa Interior Design Project in Hyderabad | Bright Arena Interiors",
      description: "Explore the Rajapushpa Interior Design Project by Bright Arena Interiors, showcasing elegant layouts, premium finishes, and modern living spaces in Hyderabad.",
      keywords: "Rajapushpa apartment interiors, premium apartment styling, modern luxury living, bespoke furniture design",
      h1: "Rajapushpa Interior Design Project in Hyderabad"
    }
  },
  {
    id: 3,
    slug: "bougainvillea-villas-interior-design-project-hyderabad",
    title: "Bougainvillea Villas",
    heroTitle: "Contemporary Family Living",
    shortDescription: "Residential Interiors",
    description:
      "A beautifully tailored residential space featuring contemporary finishes and a serene, comfortable atmosphere crafted specifically for modern family living.",
    heroImage: "/projectsImg/bougainvillea-villa/living-room.webp",
    gallery: [
      "/projectsImg/bougainvillea-villa/living-room.webp",
      "/projectsImg/bougainvillea-villa/2.living room.webp",
      "/projectsImg/bougainvillea-villa/family-lounge.webp",
      "/projectsImg/bougainvillea-villa/famil-lounge-two.webp",
      "/projectsImg/bougainvillea-villa/kitchen.webp",
      "/projectsImg/bougainvillea-villa/crockery.webp",
      "/projectsImg/bougainvillea-villa/pooja-outside.webp",
      "/projectsImg/bougainvillea-villa/pooja-inside.webp",
      "/projectsImg/bougainvillea-villa/master-bedroom.webp",
      "/projectsImg/bougainvillea-villa/master-bed-room-three.webp",
      "/projectsImg/bougainvillea-villa/master-bed-room-three (1).webp",
      "/projectsImg/bougainvillea-villa/child-bed-room.webp",
      "/projectsImg/bougainvillea-villa/child-bed-room-two.webp",
      "/projectsImg/bougainvillea-villa/child-bedroom-two.webp",
      "/projectsImg/bougainvillea-villa/guest-bedroom.webp",
      "/projectsImg/bougainvillea-villa/guest-bed-room-two.webp",
      "/projectsImg/bougainvillea-villa/office-room.webp",
      "/projectsImg/bougainvillea-villa/office-room-two.webp",
      "/projectsImg/bougainvillea-villa/office-room-two (1).webp",
      "/projectsImg/bougainvillea-villa/25.Office Room-3.webp",
    ],
    seo: {
      metaTitle:
        "Vara Prasad Bachupally Interior Design Project in Hyderabad | Bright Arena Interiors",
      description:
        "Explore the Vara Prasad Bachupally Interior Design Project by Bright Arena Interiors, featuring elegant interiors, premium finishes, and customized living spaces in Hyderabad.",
      keywords:
        "Bachupally interior design, modern family home interiors, contemporary residential finishes",
      h1: "Bougainvillea Villa Project",
    },
  },
  {
    id: 4,
    slug: "etna-by-phoenix-interior-design-project-hyderabad",
    title: "Etna By Phoenix",
    heroTitle: "A Sophisticated Urban Oasis", // <-- Added
    shortDescription: "Premium Apartment, Styling",
    description: "A sophisticated blend of contemporary design and timeless elegance, creating a vibrant and luxurious residential oasis.",
    heroImage: "/projectsImg/etna/sr-img1.webp",
    gallery: [1, 3, 4, 5, 6, 7, 9, 10, 12, 13, 14, 16].map((n) => `/projectsImg/etna/sr-img${n}.webp`),
    seo: {
      metaTitle: "Etna by Phoenix Interior Design Project in Hyderabad | Bright Arena Interiors",
      description: "Discover the Etna by Phoenix Interior Design Project by Bright Arena Interiors, featuring elegant interiors, premium finishes, and thoughtfully designed living spaces in Hyderabad",
      keywords: "Etna by Phoenix interiors, luxury apartment design, contemporary residential styling",
      h1: "Etna by Phoenix Interior Design Project in Hyderabad"
    }
  },
  {
    id: 5,
    slug: "banali-foods-commercial-interior-design-project-hyderabad",
    title: "Banali Foods",
    heroTitle: "A Premium Retail Experience", // <-- Added
    shortDescription: "Commercial, Sweets Shop",
    description: "A vibrant and welcoming commercial retail space tailored for a premium sweets brand, featuring elegant display counters and warm ambient lighting.",
    heroImage: "/projectsImg/banali/bf-img5.png",
    gallery: Array.from({ length: 5 }, (_, i) => `/projectsImg/banali/bf-img${i + 1}.png`),
    seo: {
      metaTitle: "Banali Foods Commercial Interior Design Project in Hyderabad | Bright Arena Interiors",
      description: "Explore the Banali Foods commercial interior design project by Bright Arena Interiors, showcasing modern workspaces, premium finishes, and smart space planning.",
      keywords: "Retail interior design, sweets shop interiors, commercial space styling, premium retail design",
      h1: "Banali Foods Commercial Interior Design Project"
    }
  },
  {
    id: 6,
    slug: "anvita-ivana-interior-design-project-hyderabad",
    title: "Anvita Ivana",
    heroTitle: "Modernity Meets Space", // <-- Added
    shortDescription: "Residential, Modern Apartment",
    description: "Elegant residential interiors designed with space-saving layouts and contemporary finishes for a modern family lifestyle.",
    heroImage: "/projectsImg/kollur/kl-img1.webp",
    gallery: Array.from({ length: 15 }, (_, i) => `/projectsImg/kollur/kl-img${i + 1}.webp`),
    seo: {
      metaTitle: "Kollur Apartment Interior Design Project in Hyderabad | Bright Arena Interiors",
      description: "Explore the Kollur Apartment Interior Design Project by Bright Arena Interiors, featuring modern interiors, premium finishes, and customized living spaces in Hyderabad.",
      keywords: "Kollur apartment interiors, space-saving interior design, modern apartment styling",
      h1: "Kollur Apartment Interior Design Project in Hyderabad"
    }
  },
  {
    id: 7,
    slug: "souhithi-svr-mansion-interior-design-project-hyderabad",
    title: "Souhithi SVR Mansion",
    heroTitle: "Timeless Comfort & Crafted Living",
    shortDescription: "Luxury Residential, Interior Design",
    description:
      "A thoughtfully crafted residential interior featuring warm finishes, bespoke bedrooms, and a sleek breakfast counter designed for effortless everyday luxury.",
    heroImage: "/projectsImg/souhithi-svr-mansion/master-bed-room.webp",
    gallery: [
      "/projectsImg/souhithi-svr-mansion/master-bed-room.webp",
      "/projectsImg/souhithi-svr-mansion/master-bed-room-two.webp",
      "/projectsImg/souhithi-svr-mansion/master-bed-room-three.webp",
      "/projectsImg/souhithi-svr-mansion/child-bedroom-one.webp",
      "/projectsImg/souhithi-svr-mansion/child-bedroom-two.webp",
      "/projectsImg/souhithi-svr-mansion/child-bedroom-three.webp",
      "/projectsImg/souhithi-svr-mansion/breakfast-counter.webp",
      "/projectsImg/souhithi-svr-mansion/breakfast-counter-straight-view.webp",
    ],
    seo: {
      metaTitle:
        "Souhithi SVR Mansion Interior Design Project in Hyderabad | Bright Arena Interiors",
      description:
        "Explore the Souhithi SVR Mansion interior design project by Bright Arena Interiors, featuring bespoke bedrooms, a modern breakfast counter, and refined residential finishes in Hyderabad.",
      keywords:
        "Souhithi SVR Mansion interiors, luxury residential interior design Hyderabad, bespoke bedroom interiors, modern kitchen breakfast counter",
      h1: "Souhithi SVR Mansion Interior Design Project in Hyderabad",
    },
  },
  {
    id: 8,
    slug: "sumadhura-horizon-interior-design-project-hyderabad",
    title: "Sumadhura Horizon",
    heroTitle: "Elevated Living, Thoughtfully Designed",
    shortDescription: "Luxury Residential, Interior Design",
    description:
      "A refined modern residence crafted with an expansive living and dining area, an open modular kitchen, serene bedrooms, and a dedicated study room tailored for contemporary family living.",
    heroImage: "/projectsImg/sumadhura-horizon/hall-area.webp",
    gallery: [
      "/projectsImg/sumadhura-horizon/hall-area.webp",
      "/projectsImg/sumadhura-horizon/hall-area-two.webp",
      "/projectsImg/sumadhura-horizon/hall-area-three.webp",
      "/projectsImg/sumadhura-horizon/dine-area.webp",
      "/projectsImg/sumadhura-horizon/dine-area-two.webp",
      "/projectsImg/sumadhura-horizon/open-kitchen.webp",
      "/projectsImg/sumadhura-horizon/kitchen.webp",
      "/projectsImg/sumadhura-horizon/master-bedroom-one.webp",
      "/projectsImg/sumadhura-horizon/master-bedroom-two.webp",
      "/projectsImg/sumadhura-horizon/parents-bedroom.webp",
      "/projectsImg/sumadhura-horizon/child-bed-room.webp",
      "/projectsImg/sumadhura-horizon/child-bedroom-two.webp",
      "/projectsImg/sumadhura-horizon/study-room.webp",
    ],
    seo: {
      metaTitle:
        "Sumadhura Horizon Interior Design Project in Hyderabad | Bright Arena Interiors",
      description:
        "Explore the Sumadhura Horizon interior design project by Bright Arena Interiors, featuring a spacious living and dining area, open kitchen, bespoke bedrooms, and a modern study room in Hyderabad.",
      keywords:
        "Sumadhura Horizon interiors, luxury apartment interior design Hyderabad, open kitchen design, modern bedroom interiors, home study room design",
      h1: "Sumadhura Horizon Interior Design Project in Hyderabad",
    },
  },

];