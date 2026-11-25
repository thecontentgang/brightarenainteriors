"use client";

// Warp Carousel by Louis Studios (https://studios.lou15.com), adapted for a project showcase:
// the 3D ring motion, the WebGL2 lens warp and flare, the drag/spring physics, keyboard control and the
// Canvas 2D fallback are unchanged. What changed is what sits on each card (project photo or mesh
// gradient + editorial type, replacing the stat-card numeral and its detail graphics), a click on the front
// card that opens the project, pause-on-hover/focus, and pointer handling through native listeners.

import * as React from "react";

/** One project card on the ring. */
export interface WarpProjectCard {
    /** Project name. Wraps onto at most two lines by itself; "\n" forces the break. */
    title: string;
    /** Short label in the pill at the top left, for example "Residential" or "Commercial". */
    category?: string;
    /** Small highlight at the top right, for example "2026" or "01". */
    metric?: string;
    /** Footer line at the bottom left, joined with " · ". */
    tags?: string[];
    /** Longer summary. Not painted on the card; used for the screen reader announcement and by the host UI. */
    description?: string;
    /** Where the project lives. Opened when the front card is clicked and no onProjectClick is given. */
    href?: string;
    /** Preview photo, drawn object-fit: cover under a dark gradient. Without one the card shows its mesh gradient. */
    imageUrl?: string;
    /** Optional sized variants of imageUrl. The smallest one sharp enough for the current texture size is loaded. */
    imageVariants?: { width: number; url: string }[];
    /** Focal point for the cover crop, 0 to 1 on each axis. Defaults to the centre. */
    imagePosition?: [number, number];
    /** Mesh gradient: up to 42 colours on a 6 by 7 grid, read row by row from the top left, B-spline smoothed. */
    mesh?: string[];
    /** Accent for the category pill border and the rule above the title. */
    accent?: string;
    /** Colour of the glow this card casts onto the top and bottom edges while it faces the viewer. */
    glow?: string;
}

export interface WarpCarouselProps {
    /** The cards on the ring, in order. The next card always enters from the right. Fewer than four are repeated to fill the ring. */
    cards?: WarpProjectCard[];
    /** Controlled front card index. Pair it with onIndexChange. */
    index?: number;
    /** Front card when uncontrolled. */
    defaultIndex?: number;
    /** Called when the front card should change: autoplay, drag, click, buttons or arrow keys. Always 0 to cards.length - 1. */
    onIndexChange?: (index: number) => void;
    /** Called when the front card is clicked (without dragging) or Enter is pressed. Defaults to opening project.href. */
    onProjectClick?: (project: WarpProjectCard, index: number) => void;
    /** Spin to the next card on a timer. Ignored when the viewer prefers reduced motion. */
    autoplay?: boolean;
    /** Pause autoplay while the pointer is over the carousel or it has keyboard focus. */
    pauseOnHover?: boolean;
    /** Seconds between autoplay spins. Longer intervals only stretch the slow tail of the spin; shorter ones compress the whole curve. */
    interval?: number;
    /** Cards advanced per autoplay spin. */
    step?: number;
    /** Stage colour behind the ring. */
    background?: string;
    /** Overrides every card's own glow colour for the top and bottom glows. */
    glow?: string;
    /** Strength of the wide-lens flare at the left and right edges, 0 to 1. */
    warp?: number;
    /** Font stack for the small card copy (category, metric, tags). */
    font?: string;
    /** Font stack for the project title. Defaults to `font`. */
    displayFont?: string;
    /** Freeze the animation at this many seconds of autoplay time. For stills and tests. */
    seconds?: number;
    /** Accessible name for the carousel region. */
    ariaLabel?: string;
    /** Extra class on the outer element. */
    className?: string;
    /** Extra style on the outer element. The root fills its container (width and height 100%), falls back to a 5 / 4 aspect ratio when the container has no height, and is never shorter than 420 px unless overridden here. */
    style?: React.CSSProperties;
}

const DEFAULT_FONT =
    '"Inter", "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", Arial, sans-serif';

/** Placeholder cards, shown only when no cards are passed. */
export const WARP_CAROUSEL_CARDS: WarpProjectCard[] = [
    { title: "Project One", category: "Residential", metric: "01", tags: ["Living", "Dining"], accent: "#ffc107", glow: "#ff9a52", mesh: ["#2a110a", "#4a1c13", "#7a2e14", "#c4561f", "#ff7043", "#ffb36b"] },
    { title: "Project Two", category: "Commercial", metric: "02", tags: ["Retail"], accent: "#ff7043", glow: "#ffb547", mesh: ["#1c0a05", "#3b1a0c", "#6b3a12", "#b8741f", "#ffc107", "#ffe2a0"] },
    { title: "Project Three", category: "Office", metric: "03", tags: ["Workspace"], accent: "#ffc107", glow: "#ff9a52", mesh: ["#21100c", "#4a2418", "#8a4a2c", "#d08a5c", "#f7d9b8", "#f7f4ee"] },
    { title: "Project Four", category: "Villa", metric: "04", tags: ["Bespoke"], accent: "#ff7043", glow: "#ffb547", mesh: ["#140805", "#2e140b", "#5c2414", "#a03a1c", "#e2602f", "#ff9a6b"] },
];


/* ------------------------------------------------------------------ */
/* Geometry: measured from the reference and fitted frame by frame.    */
/* Stage units: the stage is 720 units wide; a card is 256 by 170      */
/* (landscape; the ring geometry depends only on the width).          */
/* ------------------------------------------------------------------ */

const CW = 288;
const CH = 192;
/** Stage dimensions fitted to the box in stage units. */
const STAGE_W = 560;
const STAGE_H = 260;
const CR = 12;
const FOCAL = 734.103;
const G = {
    qA: 0.46401,
    XLA: 165.774,
    zA: 35.354,
    psiA: 1.44638,
    a1: 1.31454,
    a2: 1.10948,
    qB: 0.74999,
    XB: 204.525,
    ZB: 355.405,
    bB: 0.69311,
    bE: 0.04614,
    vC: 203.134,
    aC: 229.260,
    kB: 0.01087,
    bP: 0.99129,
    qPR: 1.01828,
    bPL: 1.00920,
    qPL: 1.07139,
};

type Pose = [number, number, number];

/** Pose of a card at ring offset q (0 front, +1 right, -1 left): centre x, depth behind the front plane, yaw. */
function poseAt(q0: number): Pose {
    let q = q0;
    if (Math.abs(q) < 1) q -= G.kB * Math.sin(Math.PI * q) ** 2;
    const s = q < 0 ? -1 : 1;
    const a = Math.abs(q);
    const half = CW / 2;
    const bulge = 150 * Math.cos(Math.min(1, a) * Math.PI * 0.5) ** 2;
    if (a <= G.qA) {
        const t = a / G.qA;
        const xl = -half + (G.XLA + half) * Math.pow(t, G.a1);
        const zl = G.zA * t ** 4;
        const psi = G.psiA * Math.pow(t, G.a2);
        return [s * (xl + half * Math.cos(psi)), zl + half * Math.sin(psi) - bulge, s * psi];
    }
    const dXL = ((G.XLA + half) * G.a1) / G.qA;
    const dZL = (G.zA * 4) / G.qA;
    const dps = (G.psiA * G.a2) / G.qA;
    // hinge (the edge away from the centre)
    let Hx: number;
    let Hz: number;
    if (a <= G.qB) {
        const L = G.qB - G.qA;
        const t = (a - G.qA) / L;
        const hx = G.XLA + CW * Math.cos(G.psiA);
        const hz = G.zA + CW * Math.sin(G.psiA);
        const dhx = dXL - CW * Math.sin(G.psiA) * dps;
        const dhz = dZL + CW * Math.cos(G.psiA) * dps;
        const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
        const h10 = t ** 3 - 2 * t ** 2 + t;
        const h01 = -2 * t ** 3 + 3 * t ** 2;
        const h11 = t ** 3 - t ** 2;
        Hx = h00 * hx + h10 * L * dhx * G.bB + h01 * G.XB + h11 * L * G.vC * G.bE;
        Hz = h00 * hz + h10 * L * dhz * G.bB + h01 * G.ZB;
    } else {
        const d = a - G.qB;
        Hx = G.XB + G.vC * d + G.aC * d * d;
        Hz = G.ZB;
    }
    // yaw finishes later on the outgoing side, as in the reference
    const qP = s < 0 ? G.qPL : G.qPR;
    const bP = s < 0 ? G.bPL : G.bP;
    const LP = qP - G.qA;
    const tp = Math.min(1, (a - G.qA) / LP);
    const psi = (2 * tp ** 3 - 3 * tp ** 2 + 1) * G.psiA + (tp ** 3 - 2 * tp ** 2 + tp) * LP * dps * bP + (-2 * tp ** 3 + 3 * tp ** 2) * Math.PI;
    return [s * (Hx - half * Math.cos(psi)), Hz - half * Math.sin(psi) - bulge, s * psi];
}

/* Spin curve: ring progress over one autoplay step, in reference frames (30 fps). */
const TK = [0, 3, 6, 8, 10, 11, 12, 13, 14, 16, 18, 21, 25, 30, 36, 45, 55, 70, 88, 110];
const TB = [0, 0.02175, 0.12069, 0.22549, 0.35493, 0.43254, 0.51436, 0.5952, 0.6751, 0.83199, 0.9709, 1.12669, 1.27958, 1.40975, 1.53561, 1.68385, 1.79183, 1.89191, 1.95233, 2];
const DRIFT = 0.06511; // the ring keeps creeping past rest by this much before the next spin
const REST_PHASE = 81.828; // where reference frame 1 sits inside a step, in frames
const STEP_FRAMES = 110;

const SLOPES = (() => {
    const n = TK.length;
    const h = TK.slice(1).map((x, i) => x - TK[i]);
    const dl = h.map((hi, i) => (TB[i + 1] - TB[i]) / hi);
    const d = new Array(n).fill(0);
    for (let k = 1; k < n - 1; k++) {
        if (dl[k - 1] * dl[k] <= 0) d[k] = 0;
        else {
            const w1 = 2 * h[k] + h[k - 1];
            const w2 = h[k] + 2 * h[k - 1];
            d[k] = (w1 + w2) / (w1 / dl[k - 1] + w2 / dl[k]);
        }
    }
    const v = (dl[0] + dl[n - 2]) / 2;
    d[0] = v;
    d[n - 1] = v;
    return d;
})();

/** Normalised spin curve over 110 reference frames: 0 at the start, 1 at the end, with the reference's slow creep at both ends. */
function spin(frames: number): number {
    if (frames <= 0) return 0;
    if (frames >= STEP_FRAMES) return 1;
    let i = 0;
    while (i < TK.length - 2 && frames > TK[i + 1]) i++;
    const h = TK[i + 1] - TK[i];
    const t = (frames - TK[i]) / h;
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
    const h10 = t ** 3 - 2 * t ** 2 + t;
    const h01 = -2 * t ** 3 + 3 * t ** 2;
    const h11 = t ** 3 - t ** 2;
    return (h00 * TB[i] + h10 * h * SLOPES[i] + h01 * TB[i + 1] + h11 * h * SLOPES[i + 1]) / 2;
}

/** The spin curve fitted into `n` frames: the fast part keeps its timing, only the slow tail stretches. */
function spinN(frames: number, n: number): number {
    if (n <= STEP_FRAMES + 0.5) return spin((frames * STEP_FRAMES) / Math.max(1, n));
    const knee = 80;
    if (frames <= knee) return spin(frames);
    return spin(knee + ((frames - knee) * (STEP_FRAMES - knee)) / (n - knee));
}

const LEAD = (STEP_FRAMES - REST_PHASE) / 30;

/** Ring progress for pure autoplay at time t (seconds) after mount, starting on card `start`. Matches the live loop. */
function autoplayProgress(t: number, start: number, step: number, interval: number): number {
    if (t < LEAD) return start - step + DRIFT + step * spin(REST_PHASE + t * 30);
    const k = Math.floor((t - LEAD) / interval);
    const tau = (t - LEAD - k * interval) * 30;
    return start + k * step + DRIFT + step * spinN(tau, interval * 30);
}

/* ------------------------------------------------------------------ */
/* Colour helpers                                                      */
/* ------------------------------------------------------------------ */

function parseColor(c: string, fallback: [number, number, number] = [0, 0, 0]): [number, number, number] { // ls:keep
    const s = (c || "").trim();
    let m = /^#([0-9a-f]{3,8})$/i.exec(s);
    if (m) {
        let h = m[1];
        if (h.length <= 4) h = h.split("").map((x) => x + x).join("");
        const n = parseInt(h.slice(0, 6), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    m = /^rgba?\(([^)]+)\)$/i.exec(s);
    if (m) {
        const p = m[1].split(/[ ,/]+/).filter(Boolean).map((x) => parseFloat(x));
        return [p[0] || 0, p[1] || 0, p[2] || 0];
    }
    if (typeof document !== "undefined" && s) {
        const cv = document.createElement("canvas");
        cv.width = cv.height = 1;
        const cx = cv.getContext("2d");
        if (cx) {
            cx.fillStyle = s;
            cx.fillRect(0, 0, 1, 1);
            const d = cx.getImageData(0, 0, 1, 1).data;
            return [d[0], d[1], d[2]];
        }
    }
    return fallback;
}


/* ------------------------------------------------------------------ */
/* Card painter                                                        */
/* ------------------------------------------------------------------ */

function bspline(t: number, out: number[]) {
    const it = 1 - t;
    out[0] = (it * it * it) / 6;
    out[1] = (3 * t * t * t - 6 * t * t + 4) / 6;
    out[2] = (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6;
    out[3] = (t * t * t) / 6;
}

function meshGrid(mesh: string[] | undefined): [number, number, number][] {
    const fallback = ["#1d1d3a", "#3b2f8f", "#2a6fd6", "#0d0d24"];
    const src = mesh && mesh.length ? mesh : fallback;
    const cols = src.map((c) => parseColor(c));
    const out: [number, number, number][] = [];
    for (let j = 0; j < 7; j++)
        for (let i = 0; i < 6; i++) {
            if (cols.length === 42) out.push(cols[j * 6 + i]);
            else {
                const k = Math.min(cols.length - 1, Math.round(((j * 6 + i) / 41) * (cols.length - 1)));
                out.push(cols[k]);
            }
        }
    return out;
}

function paintMesh(ctx: CanvasRenderingContext2D, w: number, h: number, mesh: string[] | undefined) {
    const grid = meshGrid(mesh);
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const wx = new Float32Array(w * 4);
    const ix = new Int32Array(w * 4);
    const tmp = [0, 0, 0, 0];
    for (let x = 0; x < w; x++) {
        const u = ((x + 0.5) / w) * 5;
        const i = Math.floor(u);
        bspline(u - i, tmp);
        for (let k = 0; k < 4; k++) {
            wx[x * 4 + k] = tmp[k];
            ix[x * 4 + k] = Math.min(5, Math.max(0, i - 1 + k));
        }
    }
    const row = new Float32Array(6 * 3);
    let seed = 1234567;
    for (let y = 0; y < h; y++) {
        const v = ((y + 0.5) / h) * 6;
        const j = Math.floor(v);
        bspline(v - j, tmp);
        row.fill(0);
        for (let k = 0; k < 4; k++) {
            const jj = Math.min(6, Math.max(0, j - 1 + k));
            const wy = tmp[k];
            for (let i = 0; i < 6; i++) {
                const c = grid[jj * 6 + i];
                row[i * 3] += c[0] * wy;
                row[i * 3 + 1] += c[1] * wy;
                row[i * 3 + 2] += c[2] * wy;
            }
        }
        for (let x = 0; x < w; x++) {
            let r = 0;
            let g = 0;
            let b = 0;
            for (let k = 0; k < 4; k++) {
                const wgt = wx[x * 4 + k];
                const i3 = ix[x * 4 + k] * 3;
                r += row[i3] * wgt;
                g += row[i3 + 1] * wgt;
                b += row[i3 + 2] * wgt;
            }
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            const n = (seed / 0x7fffffff - 0.5) * 1.6;
            const o = (y * w + x) * 4;
            d[o] = r + n;
            d[o + 1] = g + n;
            d[o + 2] = b + n;
            d[o + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
}

function fontStr(weight: number, px: number, family: string) {
    return `${weight} ${px}px ${family}`;
}

/** Font size whose digit cap height equals `cap` pixels. */
function sizeForCap(ctx: CanvasRenderingContext2D, weight: number, family: string, cap: number, sample = "0") {
    ctx.font = fontStr(weight, 100, family);
    const m = ctx.measureText(sample);
    const asc = m.actualBoundingBoxAscent || 71;
    return (cap / asc) * 100;
}


/** Splits `text` into at most `max` lines no wider than `width`; the last line is ellipsised if it still overflows. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
    const out: string[] = [];
    for (const para of text.split("\n")) {
        let line = "";
        for (const word of para.split(/\s+/).filter(Boolean)) {
            const next = line ? `${line} ${word}` : word;
            if (line && ctx.measureText(next).width > width) {
                out.push(line);
                line = word;
            } else line = next;
        }
        out.push(line);
    }
    if (out.length > max) {
        const kept = out.slice(0, max);
        kept[max - 1] = `${kept[max - 1]} ${out.slice(max).join(" ")}`;
        out.length = 0;
        out.push(...kept);
    }
    const last = out.length - 1;
    if (last >= 0 && ctx.measureText(out[last]).width > width) {
        let s = out[last];
        while (s.length > 1 && ctx.measureText(`${s}…`).width > width) s = s.slice(0, -1);
        out[last] = `${s.trimEnd()}…`;
    }
    return out;
}


function imageReady(img: HTMLImageElement | null | undefined): img is HTMLImageElement {
    return !!img && img.complete && img.naturalWidth > 0;
}

/** Draws `img` over the whole w by h canvas like object-fit: cover, around the focal point (0 to 1 per axis). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, focal?: [number, number]) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const s = Math.max(w / iw, h / ih);
    const dw = iw * s;
    const dh = ih * s;
    const [fx, fy] = focal || [0.5, 0.5];
    const dx = Math.min(0, Math.max(w - dw, w / 2 - dw * fx));
    const dy = Math.min(0, Math.max(h - dh, h / 2 - dh * fy));
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * The back of a card, seen while it swings around the far side of the ring: the front's picture mirrored (so it
 * reads the right way round from behind) and dimmed, with no text, so nothing ever appears mirrored.
 */
function paintBack(cv: HTMLCanvasElement, card: WarpProjectCard, img: HTMLImageElement | null) {
    const w = cv.width;
    const h = cv.height;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (imageReady(img)) {
        ctx.setTransform(-1, 0, 0, 1, w, 0);
        drawCover(ctx, img, w, h, card.imagePosition);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
        paintMesh(ctx, w, h, card.mesh);
    }
    ctx.fillStyle = "rgba(14, 6, 3, 0.45)"; // ls:keep (scrim)
    ctx.fillRect(0, 0, w, h);
}

/** The card face: the photo (or mesh) with the project name on a soft bottom scrim. Nothing else. */
function paintCard(cv: HTMLCanvasElement, card: WarpProjectCard, family: string, display: string, img: HTMLImageElement | null) {
    const w = cv.width;
    const h = cv.height;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const k = w / CW;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const photo = imageReady(img);
    if (photo) drawCover(ctx, img, w, h, card.imagePosition);
    else paintMesh(ctx, w, h, card.mesh);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    void family;

    // one soft scrim along the bottom, just enough for the name to read on any photo
    const sy = CH * 0.45;
    const bot = ctx.createLinearGradient(0, sy, 0, CH);
    bot.addColorStop(0, "rgba(14, 6, 3, 0)"); // ls:keep (scrim)
    bot.addColorStop(1, `rgba(14, 6, 3, ${photo ? 0.78 : 0.4})`); // ls:keep (scrim)
    ctx.fillStyle = bot;
    ctx.fillRect(0, sy, CW, CH - sy);

    // the project name, bottom left: shrink until it fits on one line, else allow a second
    const pad = 16;
    const inner = CW - pad * 2;
    let cap = 16;
    let lines: string[] = [];
    let px = 0;
    for (; cap >= 9; cap -= 1) {
        px = sizeForCap(ctx, 400, display, cap, "H");
        ctx.font = fontStr(400, px, display);
        lines = wrapLines(ctx, card.title || "", inner, cap > 11 ? 1 : 2);
        if (!lines.some((l) => l.endsWith("…"))) break;
    }
    const lh = Math.max(cap, 9) * 1.55;
    const firstBase = CH - pad - (lines.length - 1) * lh;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)"; // ls:keep (text shadow)
    ctx.shadowBlur = 6 * k;
    ctx.fillStyle = "#ffffff";
    ctx.font = fontStr(400, px, display);
    lines.forEach((ln, i) => ctx.fillText(ln, pad, firstBase + i * lh));
    ctx.restore();
}

/* Shared image cache: a photo decoded once is reused across remounts, resizes and repeated ring slots. */
const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string): Promise<HTMLImageElement> {
    let p = imageCache.get(url);
    if (!p) {
        p = new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            // same-origin photos are unaffected; remote ones must send CORS headers or they fail to load
            // here (and the card keeps its mesh) instead of tainting the canvas and breaking the WebGL upload
            img.crossOrigin = "anonymous";
            img.decoding = "async";
            img.onload = () => {
                const done = () => resolve(img);
                if (img.decode) img.decode().then(done, done);
                else done();
            };
            img.onerror = () => {
                imageCache.delete(url);
                reject(new Error(`WarpCarousel: could not load ${url}`));
            };
            img.src = url;
        });
        imageCache.set(url, p);
    }
    return p;
}

/** The image URL for a card at texture height `texH` px: the smallest variant whose height (assuming a landscape 16:10 photo) covers it. */
function pickImageUrl(card: WarpProjectCard, texH: number): string | undefined {
    const vs = card.imageVariants;
    if (vs && vs.length) {
        const need = texH * 1.6;
        const sorted = [...vs].sort((a, b) => a.width - b.width);
        return (sorted.find((v) => v.width >= need) || sorted[sorted.length - 1]).url;
    }
    return card.imageUrl;
}

/**
 * The glow a card casts above and below the ring, as one whole soft ellipse: [centre u, half width, strength].
 * It is moment-matched to the card's light spread through a fixed window over the stage centre (the card seen
 * from the bands, scaled out 1.8x, brightest along its nearer edge), so it lands where the reference's glow
 * sits but always as a complete ellipse.
 */
function glowShape(pose: Pose): [number, number, number] {
    void pose;
    return [0, 1, 0];
}

/* ------------------------------------------------------------------ */
/* WebGL renderer                                                      */
/* ------------------------------------------------------------------ */

const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uTex;
uniform vec2 uRes;
uniform float uUnit;
uniform vec4 uPose[8];
uniform vec3 uGlowCol[8];
uniform vec3 uGlowShape[8];
uniform vec3 uBg;
uniform float uWarp;
uniform float uMix;
uniform float uBackOffset;
out vec4 outColor;

const float F = ${FOCAL.toFixed(2)};
const float CW = ${CW.toFixed(1)};
const float CH = ${CH.toFixed(1)};
const float CR = ${CR.toFixed(1)};


float sdRound(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

// premultiplied colour of one card along a source ray
vec4 shadeCard(vec4 pose, vec2 ps, float fx, float fy, out float depth){
  depth = 1e9;
  if (pose.w < 0.0) return vec4(0.0);
  float k = ps.x / F;
  float c = cos(pose.z), sn = sin(pose.z);
  float den = sn * k - c;
  if (abs(den) < 1e-5) return vec4(0.0);
  float A = pose.x, B = F + pose.y;
  float s = (A - B * k) / den;
  float t = B + s * sn;
  if (t < 4.0) return vec4(0.0);
  float y = t * ps.y / F;
  float dsdk = (B * c - A * sn) / (den * den);
  float fs = min(abs(dsdk / F) * fx, 48.0);
  float fyc = min(t / F * fy, 48.0);
  vec2 p = vec2(s, y);
  float d = sdRound(p, vec2(CW, CH) * 0.5, CR);
  vec2 q = abs(p) - vec2(CW, CH) * 0.5 + CR;
  vec2 n = q.x > q.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  if (q.x > 0.0 && q.y > 0.0) n = normalize(q);
  float fp = length(vec2(fs * n.x, fyc * n.y)) + 1e-4;
  if (d > fp) return vec4(0.0);
  float cov = clamp(0.5 - d / fp, 0.0, 1.0);
  if (cov <= 0.0) return vec4(0.0);
  vec2 uv = vec2(s / CW + 0.5, 0.5 - y / CH);
  // facing away from the viewer: sample the card's back face, stored uBackOffset layers after the fronts
  float layer = pose.w;
  if ((A + s * c) * sn - t * c > 0.0) layer += uBackOffset;
  vec4 tex = textureGrad(uTex, vec3(uv, layer), vec2(fs / CW, 0.0), vec2(0.0, fyc / CH));
  depth = t;
  return vec4(tex.rgb, 1.0) * cov;
}

vec4 scene(vec2 ps, float fx, float fy, int base){
  vec4 col[4];
  float dep[4];
  for (int i = 0; i < 4; i++) col[i] = shadeCard(uPose[base + i], ps, fx, fy, dep[i]);
  // sort by depth (4 entries)
  for (int i = 0; i < 3; i++)
    for (int j = 0; j < 3; j++)
      if (j < 3 - i && dep[j] > dep[j+1]) {
        float td = dep[j]; dep[j] = dep[j+1]; dep[j+1] = td;
        vec4 tc = col[j]; col[j] = col[j+1]; col[j+1] = tc;
      }
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 4; i++) acc += (1.0 - acc.a) * col[i];
  return acc;
}

// top and bottom reflections removed: stage returns the flat background
vec3 stage(vec2 pu, float halfH, int base){
  return uBg;
}

vec3 render(vec2 pu, float halfH, int base){
  float px = 1.0 / uUnit;
  vec3 bg = stage(pu, halfH, base);
  vec4 c = scene(pu, px, px, base);
  return c.rgb + (1.0 - c.a) * bg;
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 pu = (fc - 0.5 * uRes) / uUnit;
  float halfH = 0.5 * uRes.y / uUnit;
  vec3 col = render(pu, halfH, 0);
  if (uMix > 0.0) col = mix(col, render(pu, halfH, 4), uMix);
  outColor = vec4(col, 1.0);
}`;

interface GLState {
    gl: WebGL2RenderingContext;
    prog: WebGLProgram;
    tex: WebGLTexture;
    loc: Record<string, WebGLUniformLocation | null>;
    layers: number;
    texW: number;
}

function createGL(canvas: HTMLCanvasElement): GLState | null {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) return null;
    const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.warn(gl.getShaderInfoLog(s));
            return null;
        }
        return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn(gl.getProgramInfoLog(prog));
        return null;
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture()!;
    const loc: Record<string, WebGLUniformLocation | null> = {};
    for (const n of ["uTex", "uRes", "uUnit", "uPose", "uGlowCol", "uGlowShape", "uBg", "uWarp", "uMix", "uBackOffset"]) loc[n] = gl.getUniformLocation(prog, n);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    (tex as unknown as { aniso: unknown }).aniso = aniso;
    return { gl, prog, tex, loc, layers: 0, texW: 0 };
}

function uploadCards(st: GLState, canvases: HTMLCanvasElement[]) {
    const { gl, tex } = st;
    const w = canvases[0].width;
    const h = canvases[0].height;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, w, h, canvases.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    canvases.forEach((cv, i) => {
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, w, h, 1, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    });
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const an = (tex as unknown as { aniso: { TEXTURE_MAX_ANISOTROPY_EXT: number } | null }).aniso;
    if (an) gl.texParameterf(gl.TEXTURE_2D_ARRAY, an.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    st.layers = canvases.length;
    st.texW = w;
}

/* ------------------------------------------------------------------ */
/* Canvas 2D fallback: per-strip affine approximation, no lens blur.   */
/* ------------------------------------------------------------------ */

function drawFallback(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    unit: number,
    poses: { pose: Pose; layer: number }[],
    canvases: HTMLCanvasElement[],
    bg: string,
    glows: [number, number, number][],
) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    void glows;
    const proj = (X: number, Zb: number, Y: number) => {
        const D = FOCAL + Zb;
        return [w / 2 + ((X * FOCAL) / D) * unit, h / 2 - ((Y * FOCAL) / D) * unit];
    };
    const items = poses
        .filter((p) => p.layer >= 0)
        .map((p) => ({ ...p, depth: p.pose[1] }))
        .sort((a, b) => b.depth - a.depth);
    const strips = 32;
    // neighbouring strips overlap a little so their anti-aliased clip edges never show as seams
    const eps = 1.5 / Math.max(unit, 0.25);
    const half = CW / 2;
    // card outline height at s, following the rounded corners
    const edgeY = (sv: number) => {
        const dx = Math.abs(sv) - (half - CR);
        if (dx <= 0) return CH / 2;
        return CH / 2 - CR + Math.sqrt(Math.max(0, CR * CR - Math.min(dx, CR) ** 2));
    };
    for (const it of items) {
        const [cx, zb, psi] = it.pose;
        const cs = Math.cos(psi);
        const sn = Math.sin(psi);
        // canvases holds the fronts, then the backs; judge the facing at the card's centre
        const back = cx * sn - (FOCAL + zb) * cs > 0;
        const cv = (back && canvases[it.layer + canvases.length / 2]) || canvases[it.layer];
        if (!cv) continue;
        const tpu = cv.width / CW;
        const at = (sv: number, y: number) => proj(cx + sv * cs, zb + sv * sn, y);
        for (let i = 0; i < strips; i++) {
            const s0 = -half + (CW * i) / strips - (i > 0 ? eps : 0);
            const s1 = -half + (CW * (i + 1)) / strips + (i < strips - 1 ? eps : 0);
            if (FOCAL + zb + s0 * sn < 10 || FOCAL + zb + s1 * sn < 10) continue;
            // clip: the strip of the card outline (corner strips follow the rounding)
            const n = Math.abs(s0) > half - CR - 1 || Math.abs(s1) > half - CR - 1 ? 6 : 1;
            ctx.save();
            ctx.beginPath();
            for (let k = 0; k <= n; k++) {
                const sv = Math.max(-half, Math.min(half, s0 + ((s1 - s0) * k) / n));
                const pt = at(sv, edgeY(sv));
                if (k === 0) ctx.moveTo(pt[0], pt[1]);
                else ctx.lineTo(pt[0], pt[1]);
            }
            for (let k = n; k >= 0; k--) {
                const sv = Math.max(-half, Math.min(half, s0 + ((s1 - s0) * k) / n));
                const pt = at(sv, -edgeY(sv));
                ctx.lineTo(pt[0], pt[1]);
            }
            ctx.closePath();
            ctx.clip();
            // affine taken through the strip's centre line, overscanned slightly so perspective never leaves a gap
            const sm = (s0 + s1) / 2;
            const tl = at(s0, CH / 2);
            const tr = at(s1, CH / 2);
            const mt = at(sm, CH / 2);
            const mb = at(sm, -CH / 2);
            const sx0 = (s0 + half) * tpu;
            const sw = (s1 - s0) * tpu;
            const ov = 1.025;
            const a = (tr[0] - tl[0]) / sw;
            const b = (tr[1] - tl[1]) / sw;
            const c = ((mb[0] - mt[0]) / cv.height) * ov;
            const d = ((mb[1] - mt[1]) / cv.height) * ov;
            const smx = (sm + half) * tpu;
            // texture point (smx, H/2) lands on the centre of the strip's centre line
            const ox = (mt[0] + mb[0]) / 2 - a * smx - c * (cv.height / 2);
            const oy = (mt[1] + mb[1]) / 2 - b * smx - d * (cv.height / 2);
            ctx.setTransform(a, b, c, d, ox, oy);
            const x0 = Math.max(0, sx0 - 1);
            const x1 = Math.min(cv.width, sx0 + sw + 1);
            ctx.drawImage(cv, x0, 0, x1 - x0, cv.height, x0, 0, x1 - x0, cv.height);
            ctx.restore();
        }
    }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function usePrefersReducedMotion() {
    const [reduced, setReduced] = React.useState(false);
    React.useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const on = () => setReduced(mq.matches);
        on();
        mq.addEventListener?.("change", on);
        return () => mq.removeEventListener?.("change", on);
    }, []);
    return reduced;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Half the front card's width and height in stage units: the hit box for "open this project". */
const S_FRONT = FOCAL / (FOCAL - 150);
const FRONT_HALF_W = (CW / 2) * S_FRONT;
const FRONT_HALF_H = (CH / 2) * S_FRONT;
/** Side click zones start this far from the centre, in stage units. */
const SIDE_ZONE = 195;

interface Live {
    P: number;
    from: number;
    to: number;
    t0: number;
    n: number;
    v: number;
    mode: "rest" | "spin" | "drag" | "spring" | "fade";
    nextAuto: number;
    autoPending: boolean;
    fadeFrom: number;
    fadeT0: number;
    dragX: number;
    dragP: number;
    downX: number;
    moved: boolean;
    lastT: number;
    visible: boolean;
    hiddenAt: number;
    hovered: boolean;
    focused: boolean;
}

export function WarpCarousel({
    cards = WARP_CAROUSEL_CARDS,
    index,
    defaultIndex = 0,
    onIndexChange,
    onProjectClick,
    autoplay = true,
    pauseOnHover = true,
    interval = 3.6667,
    step = 1,
    background = "#f0f0f0",
    glow,
    warp = 0,
    font = DEFAULT_FONT,
    displayFont,
    seconds,
    ariaLabel = "Projects",
    className,
    style,
}: WarpCarouselProps) {
    const wrapRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const reduced = usePrefersReducedMotion();
    const list = React.useMemo(() => {
        const src = cards && cards.length ? cards : WARP_CAROUSEL_CARDS;
        const out: WarpProjectCard[] = [];
        while (out.length < 4) out.push(...src);
        return out;
    }, [cards]);
    const realCount = cards && cards.length ? cards.length : WARP_CAROUSEL_CARDS.length;
    const N = list.length;
    const stepN = Math.max(1, Math.round(step));
    const gap = Math.max(0.5, interval);
    const titleFont = displayFont || font;
    const auto = autoplay && !reduced;

    const controlled = index !== undefined;
    const [inner, setInner] = React.useState(defaultIndex);
    const current = controlled ? (index as number) : inner;
    const [startIdx] = React.useState(current);

    const live = React.useRef<Live>({
        P: current,
        from: current,
        to: current,
        t0: 0,
        n: STEP_FRAMES,
        v: 0,
        mode: "rest",
        nextAuto: Infinity,
        autoPending: false,
        fadeFrom: current,
        fadeT0: 0,
        dragX: 0,
        dragP: 0,
        downX: 0,
        moved: false,
        lastT: 0,
        visible: true,
        hiddenAt: 0,
        hovered: false,
        focused: false,
    });
    const latest = { onIndexChange, onProjectClick, controlled, autoplay: auto, pauseOnHover, gap, stepN, seconds, reduced, realCount, list, N };
    const props = React.useRef(latest);
    React.useEffect(() => {
        props.current = latest;
    });
    const handles = React.useRef<{ kick: () => void; draw: () => void }>({ kick: () => { }, draw: () => { } });

    const lastIndex = React.useRef(current);
    const request = React.useCallback((next: number) => {
        const p = props.current;
        if (p.onIndexChange) p.onIndexChange(mod(next, p.realCount));
        if (!p.controlled) setInner(next);
    }, []);

    /** The card that is (nearly) at rest in front, or null mid-spin. */
    const frontAtRest = React.useCallback((): { card: WarpProjectCard; index: number } | null => {
        const L = live.current;
        const p = props.current;
        if (L.mode === "drag") return null;
        const r = Math.round(L.P);
        if (Math.abs(L.P - r) > 0.22) return null;
        const layer = mod(r, p.N);
        return { card: p.list[layer], index: layer % p.realCount };
    }, []);

    const openFront = React.useCallback(() => {
        const f = frontAtRest();
        if (!f) return false;
        const p = props.current;
        if (p.onProjectClick) p.onProjectClick(f.card, f.index);
        else if (f.card.href) window.location.assign(f.card.href);
        else return false;
        return true;
    }, [frontAtRest]);

    // a change of the effective index starts a spin (or a cross-fade when motion is reduced)
    React.useEffect(() => {
        const L = live.current;
        const prev = lastIndex.current;
        lastIndex.current = current;
        if (prev === current) return;
        let delta = current - prev;
        if (props.current.controlled && Math.abs(delta) > realCount / 2) delta -= Math.sign(delta) * realCount;
        const now = performance.now() / 1000;
        const fromAuto = L.autoPending;
        L.autoPending = false;
        if (delta === 0) return;
        if (props.current.reduced) {
            L.fadeFrom = L.P;
            L.P = Math.round(L.P) + delta;
            L.mode = "fade";
            L.fadeT0 = now;
        } else if (L.mode !== "spring") {
            const base = Math.round(L.P - DRIFT) + delta;
            L.from = L.P;
            L.to = base + DRIFT;
            L.t0 = now;
            L.n = fromAuto ? props.current.gap * 30 : STEP_FRAMES;
            L.mode = "spin";
        }
        if (!fromAuto) L.nextAuto = now + props.current.gap;
        handles.current.kick();
    }, [current, realCount]);

    React.useEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return;
        let gls: GLState | null = createGL(canvas);
        let ctx2d: CanvasRenderingContext2D | null = null;
        if (!gls) ctx2d = canvas.getContext("2d");
        let cardCanvases: HTMLCanvasElement[] = [];
        let texW = 0;
        let raf = 0;
        let disposed = false;
        const bg = parseColor(background, [240, 240, 240]);
        const glowOverride = glow ? parseColor(glow) : null;
        const glowCols = list.map((c) => (glowOverride ? glowOverride : parseColor(c.glow || "#7fd0f0")));

        // photos: the best loaded image per ring slot, and the URL each slot wants at the current texture size
        const images: (HTMLImageElement | null)[] = list.map(() => null);
        const wanted: (string | undefined)[] = list.map(() => undefined);
        let uploadQueued = false;
        const queueUpload = () => {
            // one re-upload per frame however many photos land together, so WebGL never shows a half-updated set
            if (uploadQueued || disposed) return;
            uploadQueued = true;
            requestAnimationFrame(() => {
                uploadQueued = false;
                if (disposed || !cardCanvases.length) return;
                if (gls) uploadCards(gls, cardCanvases);
                draw(performance.now() / 1000);
            });
        };
        const requestImages = (texH: number) => {
            list.forEach((card, i) => {
                const url = pickImageUrl(card, texH);
                wanted[i] = url;
                if (!url) return;
                loadImage(url).then(
                    (img) => {
                        if (disposed || wanted[i] !== url) return;
                        images[i] = img;
                        const cv = cardCanvases[i];
                        if (cv) paintCard(cv, card, font, titleFont, img);
                        const bk = cardCanvases[i + N];
                        if (bk) paintBack(bk, card, img);
                        queueUpload();
                    },
                    () => { /* keep the mesh (or the lower-resolution photo already shown) */ },
                );
            });
        };

        const paintAll = (w: number) => {
            const ch = Math.round((w * CH) / CW);
            const make = () => {
                const cv = document.createElement("canvas");
                cv.width = w;
                cv.height = ch;
                return cv;
            };
            // texture layers: N fronts, then N backs (the shader adds uBackOffset = N for a card facing away).
            // Until a sharper photo arrives, a slot keeps whatever it already has (smaller photo or mesh).
            const fronts = list.map((card, i) => {
                const cv = make();
                paintCard(cv, card, font, titleFont, images[i]);
                return cv;
            });
            const backs = list.map((card, i) => {
                const cv = make();
                paintBack(cv, card, images[i]);
                return cv;
            });
            cardCanvases = [...fronts, ...backs];
            texW = w;
            if (gls) uploadCards(gls, cardCanvases);
            requestImages(ch);
        };

        let W = 0;
        let H = 0;
        let unit = 1;
        const resize = () => {
            const r = wrap.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = Math.max(2, Math.round(r.width * dpr));
            H = Math.max(2, Math.round(r.height * dpr));
            if (canvas.width !== W) canvas.width = W;
            if (canvas.height !== H) canvas.height = H;
            // the STAGE_W unit stage fills the width; short, wide boxes shrink it so the cards always fit the height
            unit = Math.min(W / STAGE_W, H / STAGE_H);
            const want = Math.min(1024, Math.max(256, Math.round(CW * unit * 1.35)));
            if (want !== texW) paintAll(want);
        };

        const poseSet = (P: number) => {
            const ids = Array.from({ length: N }, (_, c) => ({ c, q: mod(c - P + N / 2, N) - N / 2 }))
                .sort((a, b) => Math.abs(a.q) - Math.abs(b.q))
                .slice(0, 4);
            return ids.map(({ c, q }) => (Math.abs(q) > 2.05 ? { pose: [0, 0, 0] as Pose, layer: -1 } : { pose: poseAt(q), layer: c }));
        };

        const L = live.current;
        const paused = () => props.current.pauseOnHover && (L.hovered || L.focused);
        const progressAt = (now: number) => {
            const p = props.current;
            if (p.seconds !== undefined) {
                if (p.reduced) {
                    const k = p.seconds < LEAD ? 0 : Math.floor((p.seconds - LEAD) / p.gap) + 1;
                    return { P: startIdx + k * p.stepN, Pb: 0, mix: 0 };
                }
                return { P: autoplayProgress(p.seconds, startIdx, p.stepN, p.gap), Pb: 0, mix: 0 };
            }
            if (L.mode === "spin") {
                const f = (now - L.t0) * 30;
                L.P = L.from + (L.to - L.from) * spinN(f, L.n);
                if (f >= L.n) L.mode = "rest";
            } else if (L.mode === "spring") {
                const dt = Math.min(0.034, Math.max(0, now - L.lastT));
                L.lastT = now;
                const sub = 4;
                for (let i = 0; i < sub; i++) {
                    const acc = -60 * (L.P - L.to) - 13 * L.v;
                    L.v += (acc * dt) / sub;
                    L.P += (L.v * dt) / sub;
                }
                if (Math.abs(L.P - L.to) < 4e-4 && Math.abs(L.v) < 3e-3) {
                    L.P = L.to;
                    L.v = 0;
                    L.mode = "rest";
                }
            } else if (L.mode === "fade") {
                const m = Math.min(1, (now - L.fadeT0) / 0.45);
                if (m >= 1) L.mode = "rest";
                return { P: L.P, Pb: L.fadeFrom, mix: 1 - m * m * (3 - 2 * m) };
            }
            return { P: L.P, Pb: 0, mix: 0 };
        };

        const poseArr = new Float32Array(32);
        const glowArr = new Float32Array(24);
        const shapeArr = new Float32Array(24);
        const fill = (set: { pose: Pose; layer: number }[], off: number) => {
            set.forEach((s, i) => {
                const j = off + i;
                poseArr[j * 4] = s.pose[0];
                poseArr[j * 4 + 1] = s.pose[1];
                poseArr[j * 4 + 2] = s.pose[2];
                poseArr[j * 4 + 3] = s.layer;
                const gc = s.layer >= 0 ? glowCols[s.layer] : [255, 255, 255]; // ls:keep (unused slot)
                glowArr[j * 3] = gc[0] / 255;
                glowArr[j * 3 + 1] = gc[1] / 255;
                glowArr[j * 3 + 2] = gc[2] / 255;
                const gs = s.layer >= 0 ? glowShape(s.pose) : [0, 1, 0];
                shapeArr[j * 3] = gs[0];
                shapeArr[j * 3 + 1] = gs[1];
                shapeArr[j * 3 + 2] = gs[2];
            });
        };

        const draw = (now: number) => {
            if (disposed) return;
            const { P, Pb, mix } = progressAt(now);
            const setA = poseSet(P);
            if (gls) {
                const { gl, prog, loc } = gls;
                gl.viewport(0, 0, W, H);
                gl.useProgram(prog);
                fill(setA, 0);
                if (mix > 0) fill(poseSet(Pb), 4);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D_ARRAY, gls.tex);
                gl.uniform1i(loc.uTex, 0);
                gl.uniform2f(loc.uRes, W, H);
                gl.uniform1f(loc.uUnit, unit);
                gl.uniform4fv(loc.uPose, poseArr);
                if (loc.uGlowCol) gl.uniform3fv(loc.uGlowCol, glowArr);
                if (loc.uGlowShape) gl.uniform3fv(loc.uGlowShape, shapeArr);
                gl.uniform3f(loc.uBg, bg[0] / 255, bg[1] / 255, bg[2] / 255);
                gl.uniform1f(loc.uWarp, Math.max(0, Math.min(1, warp)));
                gl.uniform1f(loc.uMix, mix);
                gl.uniform1f(loc.uBackOffset, N);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            } else if (ctx2d) {
                const css = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
                drawFallback(ctx2d, W, H, unit, setA, cardCanvases, css, glowCols);
                if (mix > 0) {
                    ctx2d.globalAlpha = mix;
                    drawFallback(ctx2d, W, H, unit, poseSet(Pb), cardCanvases, css, glowCols);
                    ctx2d.globalAlpha = 1;
                }
            }
        };

        const loop = () => {
            raf = 0;
            if (disposed || !L.visible) return;
            const now = performance.now() / 1000;
            const p = props.current;
            const autoOn = p.seconds === undefined && p.autoplay && !paused();
            if (autoOn && L.mode !== "drag" && L.mode !== "spring" && now >= L.nextAuto) {
                L.nextAuto = Math.max(L.nextAuto + p.gap, now + p.gap * 0.5);
                L.autoPending = true;
                request(lastIndex.current + p.stepN);
            }
            draw(now);
            const busy = p.seconds === undefined && (L.mode !== "rest" || autoOn);
            if (busy) raf = requestAnimationFrame(loop);
        };
        const kick = () => {
            if (!raf && !disposed && L.visible) raf = requestAnimationFrame(loop);
        };
        handles.current = { kick, draw: () => draw(performance.now() / 1000) };

        // the reference opens mid-rest, a moment before its first spin
        const t0 = performance.now() / 1000;
        if (props.current.autoplay && !props.current.reduced && props.current.seconds === undefined) {
            L.from = current - props.current.stepN + DRIFT;
            L.to = current + DRIFT;
            L.t0 = t0 - REST_PHASE / 30;
            L.n = STEP_FRAMES;
            L.mode = "spin";
            L.P = L.from + (L.to - L.from) * spin(REST_PHASE);
            L.nextAuto = t0 + LEAD;
        } else {
            L.nextAuto = t0 + props.current.gap;
        }

        resize();
        const ro = new ResizeObserver(() => {
            resize();
            draw(performance.now() / 1000);
        });
        ro.observe(wrap);

        const setVisible = (vis: boolean) => {
            const now = performance.now() / 1000;
            if (vis === L.visible) return;
            if (!vis) L.hiddenAt = now;
            else {
                const dt = now - L.hiddenAt;
                L.t0 += dt;
                L.fadeT0 += dt;
                L.nextAuto += dt;
                L.lastT = now;
            }
            L.visible = vis;
            if (vis) kick();
        };
        let inView = true;
        const io = new IntersectionObserver((ents) => {
            inView = ents.some((e) => e.isIntersecting);
            setVisible(inView && document.visibilityState === "visible");
        });
        io.observe(wrap);
        const onVis = () => setVisible(inView && document.visibilityState === "visible");
        document.addEventListener("visibilitychange", onVis);

        let lost = false;
        const onLost = (e: Event) => {
            e.preventDefault();
            lost = true;
        };
        const onRestored = () => {
            if (!lost) return;
            lost = false;
            gls = createGL(canvas);
            texW = 0;
            resize();
            kick();
        };
        canvas.addEventListener("webglcontextlost", onLost);
        canvas.addEventListener("webglcontextrestored", onRestored);

        const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts;
        const repaint = () => {
            if (disposed) return;
            texW = 0;
            resize();
            draw(performance.now() / 1000);
        };
        fonts?.addEventListener?.("loadingdone", repaint);
        // canvas text never triggers a webfont download by itself, so ask for the faces the cards use
        if (fonts?.load) {
            Promise.all([fonts.load(fontStr(400, 24, titleFont)), fonts.load(fontStr(600, 12, font)), fonts.load(fontStr(300, 12, font))])
                .then(repaint, () => { });
        }

        draw(t0);
        kick();
        return () => {
            disposed = true;
            if (raf) cancelAnimationFrame(raf);
            ro.disconnect();
            io.disconnect();
            document.removeEventListener("visibilitychange", onVis);
            canvas.removeEventListener("webglcontextlost", onLost);
            canvas.removeEventListener("webglcontextrestored", onRestored);
            fonts?.removeEventListener?.("loadingdone", repaint);
            if (gls) {
                gls.gl.deleteTexture(gls.tex);
                gls.gl.deleteProgram(gls.prog);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [list, background, glow, warp, font, titleFont, N]);

    React.useEffect(() => {
        if (seconds !== undefined) handles.current.draw();
        else {
            live.current.nextAuto = Math.max(live.current.nextAuto, performance.now() / 1000 + gap * 0.5);
            handles.current.kick();
        }
    }, [seconds, auto, reduced, gap]);

    /* ---------------- interaction ----------------
     * Pointer, hover and focus listeners are attached natively rather than as React props: the handlers need
     * pointer capture and run on every move, and native listeners behave the same however the host app mounts
     * or hydrates this component. They read the latest props through refs, so they are bound once. */
    React.useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const L = live.current;
        const stagePoint = (clientX: number, clientY: number) => {
            const r = el.getBoundingClientRect();
            const unitCss = Math.min(r.width / STAGE_W, r.height / STAGE_H);
            return { u: (clientX - r.left - r.width / 2) / unitCss, v: (clientY - r.top - r.height / 2) / unitCss, unitCss };
        };
        const onFrontCard = (u: number, v: number) => Math.abs(u) <= FRONT_HALF_W && Math.abs(v) <= FRONT_HALF_H;
        const canOpen = () => {
            const f = frontAtRest();
            return !!f && (!!props.current.onProjectClick || !!f.card.href);
        };
        const resume = () => {
            L.nextAuto = Math.max(L.nextAuto, performance.now() / 1000 + props.current.gap * 0.6);
            handles.current.kick();
        };

        const onDown = (e: PointerEvent) => {
            if (props.current.seconds !== undefined || e.button > 0) return;
            el.setPointerCapture?.(e.pointerId);
            L.mode = "drag";
            L.dragX = e.clientX;
            L.downX = e.clientX;
            L.dragP = L.P;
            L.v = 0;
            L.moved = false;
            L.lastT = performance.now() / 1000;
            handles.current.kick();
        };
        const onMove = (e: PointerEvent) => {
            const { u, v, unitCss } = stagePoint(e.clientX, e.clientY);
            if (L.mode !== "drag") {
                if (e.pointerType === "mouse") {
                    const hot = (onFrontCard(u, v) && canOpen()) || Math.abs(u) > SIDE_ZONE;
                    el.style.cursor = hot ? "pointer" : "grab";
                }
                return;
            }
            el.style.cursor = "grabbing";
            const now = performance.now() / 1000;
            const P = L.dragP - (e.clientX - L.dragX) / (unitCss * 300);
            const dt = Math.max(1 / 240, now - L.lastT);
            L.v = 0.6 * L.v + 0.4 * ((P - L.P) / dt);
            L.P = P;
            L.lastT = now;
            if (Math.abs(e.clientX - L.downX) > 5) L.moved = true;
            handles.current.draw();
        };
        const onUp = (e: PointerEvent) => {
            if (L.mode !== "drag") return;
            el.style.cursor = "grab";
            const now = performance.now() / 1000;
            L.nextAuto = now + props.current.gap;
            if (!L.moved) {
                // a tap: side zones turn the ring; the front card opens its project
                const { u, v } = stagePoint(e.clientX, e.clientY);
                const tap = e.type !== "pointercancel";
                if (tap && Math.abs(u) > SIDE_ZONE) {
                    L.mode = "rest";
                    request(lastIndex.current + (u > 0 ? 1 : -1));
                    return;
                }
                // the press froze any spin in progress: glide on to the card the ring was heading for
                const rc = props.current.realCount;
                const base = Math.round(L.P - DRIFT);
                let diff = mod(lastIndex.current - base, rc);
                if (diff > rc / 2) diff -= rc;
                L.to = base + diff + DRIFT;
                L.v = 0;
                L.lastT = now;
                L.mode = "spring";
                handles.current.kick();
                if (tap && onFrontCard(u, v)) openFront();
                return;
            }
            if (now - L.lastT > 0.08) L.v = 0;
            const target = Math.round(L.P + L.v * 0.16);
            const from = Math.round(L.dragP - DRIFT);
            L.to = target;
            L.mode = "spring";
            L.lastT = now;
            const next = lastIndex.current + (target - from);
            if (next !== lastIndex.current) {
                lastIndex.current = next;
                const p = props.current;
                if (p.onIndexChange) p.onIndexChange(mod(next, p.realCount));
                if (!p.controlled) setInner(next);
            }
            handles.current.kick();
        };
        const onEnter = () => { L.hovered = true; };
        const onLeave = () => {
            L.hovered = false;
            resume();
        };
        const onFocusIn = () => { L.focused = true; };
        const onFocusOut = (e: FocusEvent) => {
            if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
            L.focused = false;
            resume();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                request(lastIndex.current + (e.key === "ArrowRight" ? 1 : -1));
            } else if (e.key === "Enter" || e.key === " ") {
                if (openFront()) e.preventDefault();
            }
        };

        el.addEventListener("pointerdown", onDown);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        el.addEventListener("pointerenter", onEnter);
        el.addEventListener("pointerleave", onLeave);
        el.addEventListener("focusin", onFocusIn);
        el.addEventListener("focusout", onFocusOut);
        el.addEventListener("keydown", onKey);
        return () => {
            el.removeEventListener("pointerdown", onDown);
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerup", onUp);
            el.removeEventListener("pointercancel", onUp);
            el.removeEventListener("pointerenter", onEnter);
            el.removeEventListener("pointerleave", onLeave);
            el.removeEventListener("focusin", onFocusIn);
            el.removeEventListener("focusout", onFocusOut);
            el.removeEventListener("keydown", onKey);
        };
    }, [request, frontAtRest, openFront]);

    const front = list[mod(current, N)];
    const announce = front
        ? [front.title.replace(/\n/g, " "), front.category, front.description].filter(Boolean).join(". ")
        : "";
    return (
        <div
            ref={wrapRef}
            className={className}
            role="region"
            aria-roledescription="carousel"
            aria-label={ariaLabel}
            tabIndex={0}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: 420,
                aspectRatio: "5 / 4",
                overflow: "hidden",
                background,
                touchAction: "pan-y",
                userSelect: "none",
                cursor: "grab",
                outline: "none",
                ...style,
            }}
        >
            <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
            <div aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
                {announce}
            </div>
        </div>
    );
}

export default WarpCarousel;
