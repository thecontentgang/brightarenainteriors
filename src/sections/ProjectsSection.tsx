"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { inter, ttBakers } from "@/app/fonts";
import { imageVariants } from "@/lib/responsiveImage";
import { projectsData } from "@/views/data/ProjectsData";
import ProjectModal, { talkNowIntent } from "@/components/LazyProjectModal";
import WarpCarousel, { type WarpProjectCard } from "./WarpCarousel";

/**
 * Selected Works: project photographs on the Warp Carousel's 3D ring, on the homepage cream.
 * Cards are landscape and carry only the project name. Underneath: two actions, View Project (the project in
 * front) and Book Consultation (the site's Talk Now lead form).
 *
 * Only projects with their own hero photo are shown (the restored legacy entries share one placeholder photo).
 */

const STAGE = "#f7f4ee";

// Warm, on-brand mesh gradients. They show only until a card's photo has decoded (or if it fails to load).
const PALETTES: Pick<WarpProjectCard, "mesh" | "glow">[] = [
  { glow: "#ff8a4c", mesh: ["#2a110a", "#4a1c13", "#7a2e14", "#c4561f", "#ff7043", "#ffb36b", "#5a2410", "#2a110a"] },
  { glow: "#ffb547", mesh: ["#1c0a05", "#3b1a0c", "#6b3a12", "#b8741f", "#ffc107", "#ffe2a0", "#8a5a1c", "#1c0a05"] },
  { glow: "#ff8a4c", mesh: ["#21100c", "#4a2418", "#8a4a2c", "#d08a5c", "#f7d9b8", "#c9845a", "#4a2418", "#21100c"] },
  { glow: "#ffb547", mesh: ["#140805", "#2e140b", "#5c2414", "#a03a1c", "#e2602f", "#ff9a6b", "#5c2414", "#140805"] },
];

// One card per distinct hero photo, in data order: the legacy entries that reuse a placeholder photo drop out
// without hard-coding slugs (which have been renamed before).
const seenHero = new Set<string>();
const CARDS: WarpProjectCard[] = projectsData
  .filter((p) => {
    if (seenHero.has(p.heroImage)) return false;
    seenHero.add(p.heroImage);
    return true;
  })
  .map((p, i) => ({
    title: p.title,
    href: `/portfolio/${p.slug}/`,
    imageUrl: p.heroImage,
    imageVariants: imageVariants(p.heroImage),
    ...PALETTES[i % PALETTES.length],
  }));

export default function ProjectsSection() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [formOpen, setFormOpen] = useState(false);

  const openProject = useCallback((project: WarpProjectCard) => {
    if (project.href) router.push(project.href);
  }, [router]);

  const current = CARDS[active];
  if (!current) return null;

  return (
    <section aria-labelledby="projects-heading" className="relative w-full overflow-hidden py-20 md:py-28" style={{ background: STAGE }}>
      {/* Header */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 text-center">
        <span className="block text-[10px] md:text-xs font-semibold tracking-[0.3em] text-[#ff7043] uppercase mb-4">
          Selected Works
        </span>
        <h2 id="projects-heading" className="font-primary text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] text-[#4a1c13]">
          Rooms Worth <span className="text-[#ff7043]">Walking Through</span>
        </h2>
      </div>

      {/* The ring, edge to edge on the section colour */}
      <div className="relative w-full mt-6 md:mt-8 h-[clamp(260px,62vw,400px)] md:h-[clamp(420px,42vw,580px)]">
        <WarpCarousel
          cards={CARDS}
          index={active}
          onIndexChange={setActive}
          onProjectClick={openProject}
          autoplay
          interval={5}
          step={1}
          warp={0}
          background={STAGE}
          font={inter.style.fontFamily}
          displayFont={ttBakers.style.fontFamily}
          ariaLabel="Selected projects. Use the left and right arrow keys to browse, Enter to open the project in front."
          className="focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff7043]/70"
          style={{ minHeight: 0, aspectRatio: "auto" }}
        />
      </div>

      {/* Actions */}
      <div className="mt-8 md:mt-10 px-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <Link
          href={current.href ?? "/portfolio/"}
          className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-full bg-[#4a1c13] text-[#f7f4ee] text-[11px] font-bold tracking-widest uppercase hover:bg-[#ff7043] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7043] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f4ee]"
        >
          View Project<span className="sr-only">: {current.title}</span>
        </Link>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          {...talkNowIntent}
          className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-full border border-[#4a1c13]/25 text-[#4a1c13] text-[11px] font-bold tracking-widest uppercase hover:border-[#ff7043] hover:text-[#ff7043] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7043] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f4ee]"
        >
          Book Consultation
        </button>
      </div>

      <ProjectModal isOpen={formOpen} onClose={() => setFormOpen(false)} />
    </section>
  );
}
