"use client";

import { useEffect, useRef, ViewTransition, type ViewTransitionInstance } from "react";
import { usePathname } from "next/navigation";

/**
 * Site-wide "bands" page transition, built on React's <ViewTransition> (browser View Transitions API).
 *
 * On every route change the new page is revealed over a frozen snapshot of the old one in five horizontal bands
 * that sweep across one after another (left to right going forward, right to left on browser back). Only the
 * page content takes part: the navbar and the floating social bar are named in globals.css so they stay put.
 *
 * Unlike the old GSAP tile overlay, nothing covers the screen and nothing waits for a midpoint, so the new page
 * is interactive the moment it renders. Browsers without View Transitions simply swap pages instantly. Visitors who
 * prefer reduced motion get a short crossfade instead of the sweep.
 */

const BANDS = 5;
const BAND_STAGGER = 0.12;
const BAND_FRAMES = 16;
const DURATION_MS = 700;

type Frame = { top: number; bottom: number };

/** The pseudo-element handles React attaches at runtime (the published types only declare `name`). */
type PseudoHandle = { animate: (keyframes: Keyframe[] | PropertyIndexedKeyframes, options: KeyframeAnimationOptions) => Animation };
type Instance = ViewTransitionInstance & { old: PseudoHandle; new: PseudoHandle };

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** clip-path keyframes: band i starts BAND_STAGGER later than band i-1; together they reveal [top, bottom] of the snapshot. */
function bandFrames(back: boolean, { top, bottom }: Frame): string[] {
  const span = 1 - (BANDS - 1) * BAND_STAGGER;
  return Array.from({ length: BAND_FRAMES + 1 }, (_, frame) => {
    const t = frame / BAND_FRAMES;
    const points: string[] = [];
    for (let band = 0; band < BANDS; band++) {
      const p = easeOutCubic(Math.min(1, Math.max(0, (t - band * BAND_STAGGER) / span)));
      const edge = back ? 100 : 0;
      const reach = back ? 100 - p * 100 : p * 100;
      // bands split the visible part of the page; the outer two run on past it, so no sliver of the snapshot
      // above or below the viewport is ever left unrevealed
      const from = band === 0 ? -1e6 : top + ((bottom - top) * band) / BANDS;
      const to = band === BANDS - 1 ? 1e6 : top + ((bottom - top) * (band + 1)) / BANDS;
      points.push(`${edge}% ${from}px`, `${reach}% ${from}px`, `${reach}% ${to}px`, `${edge}% ${to}px`);
    }
    return `polygon(${points.join(", ")})`;
  });
}

/** The part of `el` inside the viewport, in the element's own coordinates (its snapshot can be taller than the screen). */
function visibleFrame(el: HTMLElement | null): Frame {
  const h = window.innerHeight;
  if (!el) return { top: 0, bottom: h };
  const r = el.getBoundingClientRect();
  const top = Math.min(Math.max(0, -r.top), r.height);
  return { top, bottom: Math.max(top + 1, Math.min(r.height, h - r.top)) };
}

export default function PageTransitionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageRef = useRef<HTMLDivElement>(null);
  const backRef = useRef(false);

  // browser back/forward never carries a transition type, so remember it to sweep the other way
  useEffect(() => {
    const onPop = () => { backRef.current = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const onEnter = (instance: ViewTransitionInstance, types: string[]) => {
    const vt = instance as Instance;
    const back = backRef.current || types.includes("nav-back");
    backRef.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const anim = reduce
      ? vt.new.animate({ opacity: [0, 1] }, { duration: 200, easing: "ease-out", fill: "both" })
      : vt.new.animate({ clipPath: bandFrames(back, visibleFrame(pageRef.current)) }, { duration: DURATION_MS, easing: "linear", fill: "both" });
    return () => anim.cancel();
  };

  const onExit = (instance: ViewTransitionInstance) => {
    // the old page holds still underneath while the bands sweep over it
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const anim = (instance as Instance).old.animate(
      { opacity: [1, 1] },
      { duration: reduce ? 200 : DURATION_MS, fill: "both" },
    );
    return () => anim.cancel();
  };

  return (
    <ViewTransition key={pathname} enter="page-bands" exit="page-bands" default="none" onEnter={onEnter} onExit={onExit}>
      <div ref={pageRef} data-slot="page-transition">
        {children}
      </div>
    </ViewTransition>
  );
}
