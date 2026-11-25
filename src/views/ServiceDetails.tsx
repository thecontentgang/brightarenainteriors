"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { servicesData, type ServiceItem } from "../views/data/servicesData";
import NotFoundPage from "./NotFoundPage";
import { responsiveImage } from "@/lib/responsiveImage";

// Gentle, premium easing curve
const EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

function RegisterMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className={className} aria-hidden="true">
      <line x1="12" y1="0" x2="12" y2="24" stroke="currentColor" strokeWidth="1" />
      <line x1="0" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

interface RevealHeadingProps {
  children: string;
  className?: string;
  delay?: number;
  animateOnLoad?: boolean;
}

function RevealHeading({ children, className, delay = 0, animateOnLoad = false }: RevealHeadingProps) {
  if (!children) return null;
  const lines = children.split("\n");
  let wordIndex = 0;

  return (
    <h2 className={className}>
      {lines.map((line: string, li: number) => (
        <span key={li} className="block">
          {line.split(" ").map((word: string) => {
            const wi = wordIndex++;
            return (
              <span key={wi} className="inline-block overflow-hidden pb-2 mr-[0.2em] sm:mr-[0.22em]">
                <motion.span
                  className="block"
                  initial={{ y: "120%", opacity: 0 }}
                  animate={animateOnLoad ? { y: "0%", opacity: 1 } : undefined}
                  whileInView={!animateOnLoad ? { y: "0%", opacity: 1 } : undefined}
                  transition={{ duration: 1.1, delay: delay + wi * 0.04, ease: EASE }}
                  viewport={{ once: true }}
                >
                  {word}
                </motion.span>
              </span>
            );
          })}
        </span>
      ))}
    </h2>
  );
}

// Next.js port: the slug comes from the route (app/services/[slug]) instead of useParams().
export default function ServiceDetailsPage({ slug }: { slug: string }) {
  const service = servicesData.find((item: ServiceItem) => item.slug === slug);
  const primaryImgRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: imgScroll } = useScroll({
    target: primaryImgRef,
    offset: ["start end", "end start"],
  });

  const imgY = useTransform(imgScroll, [0, 1], ["-8%", "8%"]);

  if (!service) {
    return <NotFoundPage />;
  }

  const cleanImgSrc = (src: string) => (src.endsWith(".") ? `${src}png` : src);

  /* ─────────────────────────────────────────────
     NEW: Markdown Link Parser
     Converts [Text](/url) into styled <Link> tags
  ───────────────────────────────────────────────*/
  const parseLinks = (text: string) => {
    // Regex splits the text by the [text](url) pattern
    const parts = text.split(/(\[.*?\]\(.*?\))/g);
    
    return parts.map((part, i) => {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const linkText = match[1];
        const url = match[2];
        const linkClasses = "font-bold text-[#ff7043] underline decoration-[#ff7043]/30 hover:decoration-[#ff7043] transition-colors duration-300";
        
        // Use React Router for internal links
        if (url.startsWith('/')) {
          return <Link key={i} href={url} className={linkClasses}>{linkText}</Link>;
        }
        // Use standard <a> tag for external links
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={linkClasses}>
            {linkText}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderRichContent = (content: string) => {
    const extraImages = service.images ? service.images.slice(1) : [];
    let headingCount = 0;
    let imageIndex = 0;

    return content
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line, idx) => {
        const isHeading = line.length < 100 && !line.trim().endsWith(".") && !line.trim().endsWith("?");
        let injectedImage = null;

        if (isHeading) {
          headingCount++;

          if (headingCount > 1 && headingCount % 2 === 0 && imageIndex < extraImages.length) {
            const imgSrc = cleanImgSrc(extraImages[imageIndex]);
            imageIndex++;

            injectedImage = (
              <motion.div
                key={`img-${idx}`}
                className="w-full aspect-[4/5] sm:aspect-[16/9] overflow-hidden rounded-xl sm:rounded-2xl shadow-sm my-10 sm:my-16"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.1, ease: EASE }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <img
                  {...responsiveImage(imgSrc, "min(100vw, 900px)")}
                  alt={`${service.title} detail layout`}
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-[1.5s]"
                />
              </motion.div>
            );
          }

          return (
            <React.Fragment key={idx}>
              {injectedImage}
              <motion.h3
                className="font-primary text-xl sm:text-2xl md:text-3xl text-[#4a1c13] mt-10 sm:mt-12 mb-5 sm:mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE }}
                viewport={{ once: true, margin: "-50px" }}
              >
                {/* Apply Link Parser to Headings */}
                {parseLinks(line)}
              </motion.h3>
            </React.Fragment>
          );
        }

        return (
          <motion.p
            key={idx}
            className="text-[#4a1c13]/75 leading-[1.8] sm:leading-[1.85] mb-5 sm:mb-6 text-[15px] sm:text-base md:text-lg font-sans"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            viewport={{ once: true, margin: "-50px" }}
          >
            {/* Apply Link Parser to Paragraphs */}
            {parseLinks(line)}
          </motion.p>
        );
      });
  };

  return (
    <>

      <main className="bg-[#f7f4ee] text-[#4a1c13] overflow-hidden font-sans selection:bg-[#ff7043] selection:text-white pt-20 sm:pt-24 md:pt-28">
        {/* ── COMPACT EDITORIAL HEADER ── */}
        <section className="relative w-full px-5 sm:px-8 md:px-12 lg:px-16 mb-8 sm:mb-10 md:mb-12 text-center flex flex-col items-center">
          <RegisterMark className="hidden sm:block absolute top-2 left-4 md:left-8 text-[#4a1c13]/15" />
          <RegisterMark className="hidden sm:block absolute top-2 right-4 md:right-8 text-[#4a1c13]/15" />

          

          <motion.nav
            className="flex items-center gap-2 text-[9px] sm:text-[10px] uppercase tracking-widest text-[#4a1c13]/50 font-bold mb-4 sm:mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <Link href="/services/" className="hover:text-[#ff7043] transition-colors">
              Services
            </Link>
            <span className="w-1 h-1 rounded-full bg-[#4a1c13]/30 mx-1" />
            <span className="text-[#4a1c13] max-w-[45vw] sm:max-w-none truncate">{service.title}</span>
          </motion.nav>

          <RevealHeading
            animateOnLoad={true}
            className="font-primary text-[clamp(24px,5.5vw,44px)] leading-[1.1] tracking-tight text-[#4a1c13] max-w-3xl"
          >
            {service.heroTitle || "Crafting Timeless Spaces"}
          </RevealHeading>

          {service.subtitle && (
            <motion.p
              className="mt-3 sm:mt-4 max-w-xs sm:max-w-lg md:max-w-xl text-[13px] sm:text-sm md:text-base text-[#4a1c13]/70 font-light leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: EASE }}
            >
              {service.subtitle}
            </motion.p>
          )}
        </section>

        {/* ── PRIMARY IMAGE ── */}
        {service.images?.[0] && (
          <section className="w-full sm:max-w-[1600px] sm:mx-auto sm:px-4 md:px-8 mb-12 sm:mb-14 md:mb-20">
            <div
              ref={primaryImgRef}
              className="relative aspect-[4/3] xs:aspect-[4/3] sm:aspect-[16/8] md:aspect-[21/8] w-full overflow-hidden sm:rounded-[1.5rem] md:rounded-[2rem] shadow-sm"
            >
              <motion.img
                {...responsiveImage(cleanImgSrc(service.images[0]), "min(110vw, 1760px)")}
                fetchPriority="high"
                alt={service.title}
                className="w-full h-full object-cover"
                style={{ y: imgY, scale: 1.1 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, ease: EASE }}
              />
              <motion.div
                className="absolute inset-0 bg-[#f7f4ee]"
                style={{ transformOrigin: "left" }}
                initial={{ scaleX: 1 }}
                whileInView={{ scaleX: 0 }}
                transition={{ duration: 1.2, ease: EASE }}
                viewport={{ once: true, margin: "-60px" }}
              />
              <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex items-center gap-2 text-[#f7f4ee]">
                <span className="w-6 sm:w-8 h-px bg-[#ffc107]" />
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-bold drop-shadow-sm">
                  {service.title}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ── STATS ── */}
        {service.stats && service.stats.length > 0 && (
          <section className="max-w-5xl mx-auto px-5 sm:px-8 md:px-12 mb-12 sm:mb-16">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x divide-[#4a1c13]/15 border-y border-[#4a1c13]/15 py-8 sm:py-10">
              {service.stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="text-center px-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: EASE }}
                  viewport={{ once: true }}
                >
                  <div className="font-primary text-4xl sm:text-5xl text-[#ff7043] leading-none">{stat.value}</div>
                  <p className="mt-3 text-[13px] sm:text-sm text-[#4a1c13]/75 font-medium leading-snug max-w-[16rem] mx-auto">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── WHY CHOOSE US ── */}
        {service.highlights && service.highlights.length > 0 && (
          <section className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 mb-14 sm:mb-20">
            <span className="uppercase tracking-[0.2em] text-[10px] font-bold text-[#ff7043] block mb-3 text-center">
              Why Choose Us
            </span>
            <h2 className="font-primary text-2xl sm:text-3xl md:text-4xl text-[#4a1c13] text-center mb-8 sm:mb-10 leading-tight">
              The Bright Arena Difference
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {service.highlights.map((item, i) => (
                <motion.div
                  key={item.title}
                  className="rounded-2xl border border-[#4a1c13]/10 bg-white/50 p-6 sm:p-7 hover:border-[#ff7043]/40 transition-colors duration-500"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: i * 0.08, ease: EASE }}
                  viewport={{ once: true, margin: "-40px" }}
                >
                  <span className="text-[#ff7043] font-bold text-xs tracking-widest">0{i + 1}</span>
                  <h3 className="font-primary text-xl text-[#4a1c13] mt-3 mb-2">{item.title}</h3>
                  <p className="text-[14px] sm:text-[15px] text-[#4a1c13]/70 leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── EXAMPLES GALLERY ── */}
        {service.gallery && service.gallery.length > 0 && (
          <section className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 mb-14 sm:mb-20">
            <span className="uppercase tracking-[0.2em] text-[10px] font-bold text-[#ff7043] block mb-3 text-center">
              Our Work
            </span>
            <h2 className="font-primary text-2xl sm:text-3xl md:text-4xl text-[#4a1c13] text-center mb-8 sm:mb-10 leading-tight">
              Home Interior Examples
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {service.gallery.map((item, i) => (
                <motion.div
                  key={item.src}
                  className="aspect-[4/3] overflow-hidden rounded-xl sm:rounded-2xl shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: (i % 3) * 0.08, ease: EASE }}
                  viewport={{ once: true, margin: "-40px" }}
                >
                  <img
                    {...responsiveImage(item.src, "(min-width: 768px) 33vw, 50vw")}
                    alt={item.alt}
                    loading="lazy"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-[1.5s]"
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── SHORT FAQS ── */}
        {service.faqs && service.faqs.length > 0 && (
          <section className="max-w-3xl mx-auto px-5 sm:px-8 md:px-12 mb-16 sm:mb-24">
            <span className="uppercase tracking-[0.2em] text-[10px] font-bold text-[#ff7043] block mb-3 text-center">
              FAQs
            </span>
            <h2 className="font-primary text-2xl sm:text-3xl md:text-4xl text-[#4a1c13] text-center mb-8 sm:mb-10 leading-tight">
              Quick Answers
            </h2>
            <div className="border-t border-[#4a1c13]/15">
              {service.faqs.map((faq) => (
                <details key={faq.q} className="group border-b border-[#4a1c13]/15">
                  <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="font-primary text-lg sm:text-xl text-[#4a1c13]">{faq.q}</span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-[#ff7043] text-2xl leading-none transition-transform duration-300 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-5 pr-8 text-[15px] sm:text-base text-[#4a1c13]/75 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ── DETAILED EXPLANATION ── */}
        {/* When seoOnlyContent is set, this stays in the DOM for crawlers/AI engines but is visually hidden (sr-only). */}
        <section
          className={
            service.seoOnlyContent
              ? "sr-only"
              : "max-w-4xl mx-auto px-5 sm:px-8 md:px-12 mb-16 sm:mb-20"
          }
        >
          {service.description && (
            <RevealHeading
              delay={0.1}
              className="font-primary text-[clamp(24px,6vw,48px)] leading-[1.2] tracking-tight text-[#4a1c13] mb-6 sm:mb-8"
            >
              {service.description}
            </RevealHeading>
          )}

          <div>
            {service.longDescription && (
              <motion.p
                className="text-[#4a1c13]/90 text-base sm:text-lg md:text-xl leading-[1.75] sm:leading-[1.8] font-medium mb-10 sm:mb-12 pb-10 sm:pb-12 border-b border-[#4a1c13]/10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: EASE }}
                viewport={{ once: true }}
              >
                {/* Apply Link Parser here too in case you add links to longDescription */}
                {parseLinks(service.longDescription)}
              </motion.p>
            )}

            {/* Content parsed with embedded images and links */}
            {service.content && <div className="mt-6 sm:mt-8">{renderRichContent(service.content)}</div>}
          </div>

          {service.benefits && service.benefits.length > 0 && (
            <div className="mt-16 sm:mt-20 pt-14 sm:pt-16 border-t border-[#4a1c13]/10">
              <span className="uppercase tracking-[0.2em] text-[10px] font-bold text-[#ff7043] block mb-6 sm:mb-8">
                Key Advantages
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 sm:gap-x-12 gap-y-5 sm:gap-y-6">
                {service.benefits.map((benefit: string, i: number) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-4 rounded-xl -mx-3 px-3 py-2 transition-colors hover:bg-[#4a1c13]/[0.03]"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: i * 0.08, ease: EASE }}
                    viewport={{ once: true }}
                  >
                    <span className="text-[#ff7043] font-bold text-sm mt-1 shrink-0">0{i + 1}.</span>
                    <span className="text-[#4a1c13] font-medium leading-relaxed">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </section>

      </main>
    </>
  );
}