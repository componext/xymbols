/**
 * Write preview/letterforms.html: experimental letterforms for text glyphs
 * (locales, keys), side by side with Lucide icons, to pick a direction
 * before redrawing the stroke alphabet. Nothing here ships; the families are
 * drawn here and only rendered on this page.
 *
 * Three Lucide-based families, each in two optical sizes (text:
 * freestanding, cap 14; framed: in a key or between rules, cap 10):
 *
 * - lucide-letters: Lucide's letter icons (letter-*, and the letters inside
 *   square-letter-*), combined as a code needs: unframed or between rules
 *   for locales, keycaps and wide keys.
 * - lucide: how Lucide's own text icons draw letters (bold, case-upper,
 *   baseline, type): straight stems, semicircle bowls, 1px corners where a
 *   stroke turns off a stem.
 * - squared: straight sides and Lucide's 2px rectangle corners, as its
 *   square and keycap frames; A gets a rounded top.
 *
 * Letters are spaced optically, in whole pixels: see `spacing`.
 *
 *   pnpm preview && open preview/letterforms.html
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import svgpath from 'svgpath';
import { svgPathBbox } from 'svg-path-bbox';
import { loadIcons } from './lib/lucide.ts';
import { ROOT } from './lib/source.ts';

type Size = 'text' | 'framed';
/** A letter in its own cell: top-left at 0,0, `w` wide between stroke centres. */
interface Letter {
  w: number;
  d: string;
}
type Alphabet = Record<string, Letter>;
interface Family {
  id: string;
  label: string;
  note: string;
  sizes: Record<Size, Alphabet>;
}

const CAP: Record<Size, number> = { text: 14, framed: 10 };
const CELL: Record<Size, number> = { text: 8, framed: 6 };
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const n = (v: number) => +v.toFixed(3);
/** A path written with ${} numbers, each rounded. */
const p = (s: TemplateStringsArray, ...v: (number | string)[]) => s.reduce((a, b, i) => a + b + (i < v.length ? (typeof v[i] === 'number' ? n(v[i] as number) : v[i]) : ''), '');

/* Letters with no bowls, the same in the hand-drawn families. */
const straight = (w: number, h: number): Record<string, string> => ({
  A: p`M0 ${h}L${w / 2} 0L${w} ${h}M${w * 0.15} ${h * 0.7}H${w * 0.85}`,
  H: p`M0 0V${h}M${w} 0V${h}M0 ${h / 2}H${w}`,
  I: p`M${w / 2} 0V${h}M${w / 6} 0H${(5 * w) / 6}M${w / 6} ${h}H${(5 * w) / 6}`,
  K: p`M0 0V${h}M${w} 0L0 ${h * 0.6}M${w / 3} ${h * 0.4}L${w} ${h}`,
  M: p`M0 ${h}V0L${w / 2} ${h * 0.6}L${w} 0V${h}`,
  N: p`M0 ${h}V0L${w} ${h}V0`,
  T: p`M0 0H${w}M${w / 2} 0V${h}`,
  V: p`M0 0L${w / 2} ${h}L${w} 0`,
  W: p`M0 0L${w / 4} ${h}L${w / 2} ${h * 0.4}L${(3 * w) / 4} ${h}L${w} 0`,
  X: p`M0 0L${w} ${h}M${w} 0L0 ${h}`,
  Y: p`M0 0L${w / 2} ${h / 2}L${w} 0M${w / 2} ${h / 2}V${h}`,
  Z: p`M0 0H${w}L0 ${h}H${w}`,
});

/** Lucide's text icons: semicircle bowls on straight sides, 1px corners off stems. */
function lucideLetters(w: number, h: number): Record<string, string> {
  const r = w / 2;
  const k = Math.min(1, w / 6);
  const rt = h / 4; // B's bowls are semicircles, half the cap each
  const wt = w - Math.min(1, w / 8) * 1;
  const bh = (h * 4) / 7; // P and R bowls
  const rp = bh / 2;
  return {
    ...straight(w, h),
    B: p`M0 ${h / 2}H${wt - rt}A${rt} ${rt} 0 0 0 ${wt - rt} 0H${k}A${k} ${k} 0 0 0 0 ${k}V${h - k}A${k} ${k} 0 0 0 ${k} ${h}H${w - rt}A${rt} ${rt} 0 0 0 ${w - rt} ${h / 2}`,
    C: p`M${w} ${r}A${r} ${r} 0 0 0 0 ${r}V${h - r}A${r} ${r} 0 0 0 ${w} ${h - r}`,
    D: p`M${k} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${k}A${k} ${k} 0 0 1 0 ${h - k}V${k}A${k} ${k} 0 0 1 ${k} 0Z`,
    E: p`M${w} 0H${k}A${k} ${k} 0 0 0 0 ${k}V${h - k}A${k} ${k} 0 0 0 ${k} ${h}H${w}M0 ${h / 2}H${(5 * w) / 6}`,
    F: p`M${w} 0H${k}A${k} ${k} 0 0 0 0 ${k}V${h}M0 ${h / 2}H${(5 * w) / 6}`,
    G: p`M${w} ${r}A${r} ${r} 0 0 0 0 ${r}V${h - r}A${r} ${r} 0 0 0 ${w} ${h - r}V${h / 2}H${w / 2}`,
    J: p`M${w} 0V${h - r}A${r} ${r} 0 0 1 0 ${h - r}`,
    L: p`M0 0V${h - k}A${k} ${k} 0 0 0 ${k} ${h}H${w}`,
    O: p`M0 ${r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 0 ${h - r}Z`,
    P: p`M0 ${h}V${k}A${k} ${k} 0 0 1 ${k} 0H${w - rp}A${rp} ${rp} 0 0 1 ${w - rp} ${bh}H0`,
    Q: p`M0 ${r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 0 ${h - r}ZM${w * 0.6} ${h * 0.75}L${w} ${h}`,
    R: p`M0 ${h}V${k}A${k} ${k} 0 0 1 ${k} 0H${w - rp}A${rp} ${rp} 0 0 1 ${w - rp} ${bh}H0M${w - rp} ${bh}L${w} ${h}`,
    S: p`M${w} ${r}A${r} ${r} 0 0 0 0 ${r}L${w} ${h - r}A${r} ${r} 0 0 1 0 ${h - r}`,
    U: p`M0 0V${h - r}A${r} ${r} 0 0 0 ${w} ${h - r}V0`,
  };
}

/** Straight sides and Lucide's rectangle corners (2px at text size). */
function squaredLetters(w: number, h: number, c: number): Record<string, string> {
  const bh = (h * 4) / 7;
  const d = Math.min(2 * c, w / 2);
  const t = Math.min(1, h / 10); // C, G and S terminals run on past the corner
  const arcs = {
    // Open on the right: C, and the start of G.
    open: p`M${w} ${c + t}V${c}A${c} ${c} 0 0 0 ${w - c} 0H${c}A${c} ${c} 0 0 0 0 ${c}V${h - c}A${c} ${c} 0 0 0 ${c} ${h}H${w - c}A${c} ${c} 0 0 0 ${w} ${h - c}`,
    box: p`M${c} 0H${w - c}A${c} ${c} 0 0 1 ${w} ${c}V${h - c}A${c} ${c} 0 0 1 ${w - c} ${h}H${c}A${c} ${c} 0 0 1 0 ${h - c}V${c}A${c} ${c} 0 0 1 ${c} 0Z`,
    bowl: p`M0 ${h}V0H${w - c}A${c} ${c} 0 0 1 ${w} ${c}V${bh - c}A${c} ${c} 0 0 1 ${w - c} ${bh}H0`,
  };
  return {
    ...straight(w, h),
    A: p`M0 ${h}V${c}A${c} ${c} 0 0 1 ${c} 0H${w - c}A${c} ${c} 0 0 1 ${w} ${c}V${h}M0 ${h * 0.55}H${w}`,
    B: p`M0 ${h / 2}H${w - c}A${c} ${c} 0 0 1 ${w} ${h / 2 + c}V${h - c}A${c} ${c} 0 0 1 ${w - c} ${h}H0V0H${w - 1 - c}A${c} ${c} 0 0 1 ${w - 1} ${c}V${h / 2 - c}A${c} ${c} 0 0 1 ${w - 1 - c} ${h / 2}`,
    C: `${arcs.open}V${n(h - c - t)}`,
    D: p`M0 0H${w - d}A${d} ${d} 0 0 1 ${w} ${d}V${h - d}A${d} ${d} 0 0 1 ${w - d} ${h}H0Z`,
    E: p`M${w} 0H0V${h}H${w}M0 ${h / 2}H${(5 * w) / 6}`,
    F: p`M${w} 0H0V${h}M0 ${h / 2}H${(5 * w) / 6}`,
    G: `${arcs.open}V${n(h / 2)}H${n(w / 2)}`,
    J: p`M${w} 0V${h - c}A${c} ${c} 0 0 1 ${w - c} ${h}H${c}A${c} ${c} 0 0 1 0 ${h - c}V${h * 0.7}`,
    L: p`M0 0V${h}H${w}`,
    O: arcs.box,
    P: arcs.bowl,
    Q: p`${arcs.box}M${w * 0.6} ${h * 0.72}L${w} ${h}`,
    R: p`${arcs.bowl}M${w / 2} ${bh}L${w} ${h}`,
    S: p`M${w} ${c + t}V${c}A${c} ${c} 0 0 0 ${w - c} 0H${c}A${c} ${c} 0 0 0 0 ${c}V${h / 2 - c}A${c} ${c} 0 0 0 ${c} ${h / 2}H${w - c}A${c} ${c} 0 0 1 ${w} ${h / 2 + c}V${h - c}A${c} ${c} 0 0 1 ${w - c} ${h}H${c}A${c} ${c} 0 0 1 0 ${h - c}V${h - c - t}`,
    U: p`M0 0V${h - c}A${c} ${c} 0 0 0 ${c} ${h}H${w - c}A${c} ${c} 0 0 0 ${w} ${h - c}V0`,
  };
}

const mono = (draw: (w: number, h: number) => Record<string, string>): Record<Size, Alphabet> =>
  Object.fromEntries(
    (['text', 'framed'] as const).map((s) => [s, Object.fromEntries(Object.entries(draw(CELL[s], CAP[s])).map(([c, d]) => [c, { w: CELL[s], d }]))]),
  ) as Record<Size, Alphabet>;

/**
 * The letter drawn in an icon file, as one absolute path: every element but the frame (Lucide's square or
 * circle). Circles and lines become paths.
 */
function letterOf(file: string): string {
  const svg = readFileSync(file, 'utf8');
  const out: string[] = [];
  for (const m of svg.matchAll(/<(path|circle|line|rect)\b([^>]*?)\/?>/g)) {
    const a = Object.fromEntries([...m[2]!.matchAll(/([\w-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
    if (m[1] === 'path') out.push(svgpath(a.d!).abs().toString());
    else if (m[1] === 'line') out.push(`M${a.x1} ${a.y1}L${a.x2} ${a.y2}`);
    else if (m[1] === 'circle') {
      const [cx, cy, r] = [+a.cx!, +a.cy!, +a.r!];
      if (r === 10 && cx === 12 && cy === 12) continue;
      out.push(`M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`);
    } else if (!(a.width === '18' && a.height === '18')) throw new Error(`letterforms: a rect in ${file}`);
  }
  return out.join('');
}

/** Letters from icon files, moved to their own cell (cap line at `top`, `cap` tall) and scaled to each size: geometry, not stroke. */
function fromIcons(files: Record<Size, { file: (c: string) => string; top: number; cap: number }>): Record<Size, Alphabet> {
  return Object.fromEntries(
    (['text', 'framed'] as const).map((s) => {
      const { file, top, cap } = files[s];
      const k = CAP[s] / cap;
      const letters = Object.fromEntries(
        [...AZ].map((c) => {
          const d = letterOf(file(c.toLowerCase()));
          const [x0, , x1] = svgPathBbox(d);
          return [c, { w: n((x1 - x0) * k), d: svgpath(d).translate(-x0, -top).scale(k).round(3).toString() }];
        }),
      );
      return [s, letters];
    }),
  ) as Record<Size, Alphabet>;
}
const LUCIDE_ICONS = join(ROOT, 'node_modules/lucide-static/icons');
/** Lucide's letter-* icons standing alone; the letters of its square-letter-* icons, scaled up, in keys. */
const lucideIcons = fromIcons({
  text: { file: (c) => join(LUCIDE_ICONS, `letter-${c}.svg`), top: 4, cap: 16 },
  framed: { file: (c) => join(LUCIDE_ICONS, `square-letter-${c}.svg`), top: 8, cap: 8 },
});

const FAMILIES: Family[] = [
  {
    id: 'lucide-letters',
    label: 'Lucide letters',
    note: "Lucide's own letter icons: letter-* standing alone, and the letters inside square-letter-* (with their .5px corners) in keys, combined as a code needs. Proportional widths, scaled as geometry so the stroke stays 2.",
    sizes: lucideIcons,
  },
  {
    id: 'lucide',
    label: 'Lucide text',
    note: 'As Lucide draws letters in bold, case-upper, baseline and type: straight stems, semicircle bowls on straight sides, 1px corners where a stroke turns off a stem, an S of two half circles and a diagonal.',
    sizes: mono(lucideLetters),
  },
  {
    id: 'squared',
    label: 'Squared',
    note: "Straight sides with Lucide's 2px rectangle corners, the same corners as its square and the keycap; A gets a rounded top.",
    sizes: mono((w, h) => squaredLetters(w, h, w >= 8 ? 2 : 1.5)),
  },
];

/*
 * Spacing. Each pair gets its own distance, in whole pixels, the way a type designer spaces by area rather
 * than by the nearest points (as HT Letterspacer and Tracy's method do): the white between two letters,
 * row by row across the cap height and measured only so deep into an open side, should add up to what two
 * straight stems leave at the even 2px gap. Open shapes (the foot of L under the arm of T, A against V)
 * close up; rounds sit a little tighter than straights; and no two strokes come closer than 1px of air.
 */
const AIR = 2; // ink gap between two stems, px: the even spacing every pair is matched to
const DEPTH = 4; // how far into an open side the white counts, px
const MIN_AIR = 1; // nothing closer than this, px
const STROKE = 2;

/** Points along a path every ~0.25 units (stroke centres). */
function points(d: string): [number, number][] {
  const out: [number, number][] = [];
  let start: [number, number] = [0, 0];
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const k = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.25));
    for (let i = 0; i <= k; i++) out.push([x0 + ((x1 - x0) * i) / k, y0 + ((y1 - y0) * i) / k]);
  };
  svgpath(d).abs().unarc().unshort().iterate((seg, _i, x, y) => {
    const [cmd, ...v] = seg as [string, ...number[]];
    if (cmd === 'M') start = [v[0]!, v[1]!];
    else if (cmd === 'L') line(x, y, v[0]!, v[1]!);
    else if (cmd === 'H') line(x, y, v[0]!, y);
    else if (cmd === 'V') line(x, y, x, v[0]!);
    else if (cmd === 'Z') line(x, y, ...start);
    else if (cmd === 'C' || cmd === 'Q') {
      const c = cmd === 'Q' ? [x + (2 / 3) * (v[0]! - x), y + (2 / 3) * (v[1]! - y), v[2]! + (2 / 3) * (v[0]! - v[2]!), v[3]! + (2 / 3) * (v[1]! - v[3]!), v[2]!, v[3]!] : v;
      for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        const m = 1 - t;
        out.push([m * m * m * x + 3 * m * m * t * c[0]! + 3 * m * t * t * c[2]! + t * t * t * c[4]!, m * m * m * y + 3 * m * m * t * c[1]! + 3 * m * t * t * c[3]! + t * t * t * c[5]!]);
      }
    }
  });
  return out;
}

interface Shape {
  w: number;
  d: string;
  pts: [number, number][];
}
const shape = (l: Letter): Shape => ({ ...l, pts: points(l.d) });

/** Each side of a shape row by row (stroke centres; NaN where the row has no ink). */
function sides(s: Shape, cap: number): { left: number[]; right: number[] } {
  const rows = Math.round(cap * 2);
  const left: number[] = [];
  const right: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const y = r / 2;
    const xs = s.pts.filter(([, py]) => Math.abs(py - y) < STROKE / 2).map(([px]) => px);
    left.push(xs.length ? Math.min(...xs) : NaN);
    right.push(xs.length ? Math.max(...xs) : NaN);
  }
  return { left, right };
}

/** The gap from `a`'s box to `b`'s, in whole pixels: the tightest that keeps the pair's white at the stems' and every stroke 1px apart. */
function gap(a: Shape, b: Shape, cap: number): number {
  const ra = sides(a, cap).right;
  const lb = sides(b, cap).left;
  const white = (dx: number) => {
    let sum = 0;
    for (let i = 0; i < ra.length; i++) {
      const g = Number.isNaN(ra[i]!) || Number.isNaN(lb[i]!) ? DEPTH : dx + lb[i]! - ra[i]! - STROKE;
      sum += Math.max(0, Math.min(DEPTH, g));
    }
    return sum / ra.length;
  };
  const nearest = (dx: number) => {
    let m = Infinity;
    for (const [ax, ay] of a.pts) for (const [bx, by] of b.pts) m = Math.min(m, Math.hypot(bx + dx - ax, by - ay));
    return m - STROKE;
  };
  // From well inside a's box outwards, one pixel at a time.
  for (let g = -Math.floor(a.w / 2); g < 12; g++) if (white(a.w + g) >= AIR - 1e-6 && nearest(a.w + g) >= MIN_AIR - 1e-6) return g;
  return GAP;
}

/* Setting text. */
const GAP = 4; // even spacing, stroke centre to stroke centre
interface Placed {
  width: number;
  paths: string[];
}
/**
 * Text in a box: centred on `cx` (snapped to a whole pixel), cap line at `top`. Wider than `max` at even
 * spacing, the letters are scaled down about the cap's middle first, then spaced at that size.
 */
function set(text: string, f: Family, size: Size, cx: number, top: number, max = Infinity, even = false): Placed {
  const a = f.sizes[size];
  const cap = CAP[size];
  const chars = [...text];
  const w0 = chars.reduce((s, c) => s + a[c]!.w, 0) + GAP * (chars.length - 1);
  const k = w0 > max ? max / w0 : 1;
  const shapes = chars.map((c) => shape({ w: a[c]!.w * k, d: svgpath(a[c]!.d).translate(0, -cap / 2).scale(k).translate(0, cap / 2).toString() }));
  const xs = [0];
  for (let i = 1; i < shapes.length; i++) xs.push(xs[i - 1]! + shapes[i - 1]!.w + (even ? GAP : gap(shapes[i - 1]!, shapes[i]!, cap)));
  const width = xs.at(-1)! + shapes.at(-1)!.w;
  const x0 = Math.round(cx - width / 2);
  return { width, paths: shapes.map((s, i) => svgpath(s.d).translate(x0 + xs[i]!, top).round(3).toString()) };
}

type Frame = 'none' | 'rules' | 'key' | 'key-hug' | 'circle-one' | 'dashed-one';
/** Lucide's circle-dashed. */
const DASHED = letterOf(join(ROOT, 'node_modules/lucide-static/icons/circle-dashed.svg'));
const svgOpen = (w: number, cls = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(w)} 24" width="${n(w)}" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="g ${cls}" style="--k:${n(w / 24)}" aria-hidden="true">`;
const path = (d: string) => `<path d="${d}"/>`;

function glyph(f: Family, text: string, frame: Frame, even = false): string {
  if (frame === 'none') {
    if (text.length > 2) {
      const w = Math.ceil(set(text, f, 'text', 0, 5, Infinity, even).width) + 4;
      return `${svgOpen(w)}${set(text, f, 'text', w / 2, 5, Infinity, even).paths.map(path).join('')}</svg>`;
    }
    return `${svgOpen(24)}${set(text, f, 'text', 12, 5, 20, even).paths.map(path).join('')}</svg>`;
  }
  // A line over and a line under, at the top and bottom of Lucide's square, with the text between at key size.
  if (frame === 'rules') return `${svgOpen(24)}<path d="M3 3h18M3 21h18"/>${set(text, f, 'framed', 12, 7, 18, even).paths.map(path).join('')}</svg>`;
  if (frame === 'circle-one' || frame === 'dashed-one') {
    const ring = frame === 'circle-one' ? '<circle cx="12" cy="12" r="10"/>' : path(DASHED);
    return `${svgOpen(24)}${ring}${set(text, f, 'framed', 12, 7, 10).paths.map(path).join('')}</svg>`;
  }
  if (frame === 'key') return `${svgOpen(24)}<rect x="3" y="3" width="18" height="18" rx="2"/>${set(text, f, 'framed', 12, 7, 10).paths.map(path).join('')}</svg>`;
  // A hugging key: the square widens to 4px of padding either side of the text (stroke centres), in whole pixels.
  const fw = Math.max(18, Math.ceil(set(text, f, 'framed', 0, 7, Infinity, even).width) + 8);
  const w = fw + 6;
  return `${svgOpen(w)}<rect x="3" y="3" width="${fw}" height="18" rx="2"/>${set(text, f, 'framed', w / 2, 7, Infinity, even).paths.map(path).join('')}</svg>`;
}

/* The page. */
const lucide = loadIcons();
const icon = (name: string) => {
  const i = lucide.icons.find((x) => x.name === name);
  if (!i) throw new Error(`letterforms: no Lucide icon ${name}`);
  return `${svgOpen(24)}${i.nodes.map(([tag, a]) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('')}</svg>`;
};
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const LOCALES = ['AR', 'CS', 'DA', 'DE', 'EL', 'EN', 'ES', 'FI', 'FR', 'HE', 'HI', 'ID', 'IT', 'JA', 'KO', 'NL', 'NO', 'PL', 'PT', 'RU', 'SV', 'TH', 'TR', 'UK', 'VI', 'ZH'];
const NEIGHBOURS = ['house', 'bell', 'settings', 'search', 'mail', 'globe', 'languages', 'calendar'];
const SAMPLE = ['EN', 'DE', 'FR', 'JA', 'ZH', 'RU'];
const WORDS = ['ALT', 'ESC', 'TAB', 'FN', 'END', 'HOME', 'CTRL', 'SHIFT', 'ENTER', 'SPACE'];
const fig = (svg: string, cap: string, cls = '') => `<figure${cls ? ` class="${cls}"` : ''}>${svg}<figcaption>${cap}</figcaption></figure>`;

const sideBySide = FAMILIES.map(
  (f) => `<div class="row"><span class="who">${esc(f.label)}</span>
  <span class="strip">${NEIGHBOURS.slice(0, 5).map(icon).join('')}${SAMPLE.slice(0, 3).map((c) => glyph(f, c, 'none')).join('')}${NEIGHBOURS.slice(5).map(icon).join('')}${SAMPLE.slice(3).map((c) => glyph(f, c, 'none')).join('')}</span>
  <span class="strip">${glyph(f, 'EN', 'rules')}${glyph(f, 'K', 'key')}${icon('square-check')}${glyph(f, 'R', 'circle-one')}${icon('circle-user')}${glyph(f, 'ALT', 'key-hug')}${icon('square-terminal')}</span></div>`,
).join('\n');

const toolbar = (f: Family) => `<span class="toolbar">${icon('search')}${icon('bell')}<span class="chip">${icon('globe')}${glyph(f, 'EN', 'none')}${icon('chevron-down')}</span>${glyph(f, 'DE', 'rules')}${icon('settings')}</span>`;
const toolbars = FAMILIES.map((f) => `<div class="row"><span class="who">${esc(f.label)}</span><span class="tb s16">${toolbar(f)}</span><span class="tb s20">${toolbar(f)}</span><span class="tb s32">${toolbar(f)}</span></div>`).join('\n');

const familySection = (f: Family) => `<section id="${f.id}">
  <header><h2>${esc(f.label)}</h2><p>${esc(f.note)}</p></header>
  <div class="sets">
    <div><h3>Locales, unframed (default)</h3><div class="grid">${LOCALES.map((c) => fig(glyph(f, c, 'none'), c)).join('')}</div></div>
    <div><h3>Locales between rules (option)</h3><div class="grid">${LOCALES.map((c) => fig(glyph(f, c, 'rules'), c)).join('')}</div></div>
    <div><h3>Keys</h3><div class="grid keys">${['A', 'G', 'K', 'Q', 'R', 'S', 'Z'].map((c) => fig(glyph(f, c, 'key'), c)).join('')}${fig(glyph(f, 'R', 'circle-one'), 'R · circle')}${fig(glyph(f, 'R', 'dashed-one'), 'R · dashed')}${fig(glyph(f, 'A', 'rules'), 'A · rules')}</div>
      <h3 class="sub">Wide keys: optical spacing, and even spacing below for comparison</h3>
      <div class="words">${WORDS.map((c) => fig(glyph(f, c, 'key-hug'), c)).join('')}</div>
      <div class="words even">${WORDS.map((c) => fig(glyph(f, c, 'key-hug', true), `${c} · even`)).join('')}</div></div>
    <div><h3>Alphabet, text and key size</h3><div class="alpha">${[...AZ].map((c) => `<span>${glyph(f, c, 'none')}</span>`).join('')}</div><div class="alpha">${[...AZ].map((c) => `<span>${glyph(f, c, 'key')}</span>`).join('')}</div></div>
  </div>
</section>`;

/** The distances the spacing picks for some telling pairs, against the even gap. */
const PAIRS = ['HH', 'HO', 'OO', 'LT', 'TA', 'AV', 'AL', 'FA', 'LY', 'RT', 'SC', 'EN', 'DE'];
const pairTable = (() => {
  const f = FAMILIES[0]!;
  const a = f.sizes.framed;
  const rows = PAIRS.map((pair) => {
    const [x, y] = [...pair] as [string, string];
    const sa = shape(a[x]!);
    const sb = shape(a[y]!);
    return `<tr><td>${glyph(f, pair, 'key-hug')}</td><td>${glyph(f, pair, 'key-hug', true)}</td><td>${pair}</td><td>${gap(sa, sb, CAP.framed)}</td><td>${GAP}</td></tr>`;
  });
  return `<table class="pairs"><thead><tr><th>optical</th><th>even</th><th>pair</th><th>gap, px</th><th>even gap</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
})();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>xymbols letterforms</title>
<style>
:root{--bg:#fafafa;--panel:#fff;--ink:#18181b;--muted:#71717a;--line:#e4e4e7;--accent:#0284c7;--size:24px;--w:2;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0c0c0e;--panel:#18181b;--ink:#f4f4f5;--muted:#a1a1aa;--line:#27272a;--accent:#38bdf8;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0c0c0e;--panel:#18181b;--ink:#f4f4f5;--muted:#a1a1aa;--line:#27272a;--accent:#38bdf8;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.bar{position:sticky;top:0;z-index:1;display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;padding:12px 16px;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.bar h1{margin:0;font-size:16px;font-weight:600}
.tabs{display:flex;gap:4px}
.tabs a{color:var(--muted);text-decoration:none;padding:4px 10px;border-radius:7px;font-size:13px}
.tabs a[aria-current]{background:var(--ink);color:var(--bg)}
.ctl{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:12px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.seg button{font:inherit;font-size:12px;color:var(--ink);background:var(--panel);border:0;border-left:1px solid var(--line);padding:5px 9px;cursor:pointer;min-width:34px}
.seg button:first-child{border-left:0}
.seg button[aria-pressed="true"]{background:var(--ink);color:var(--bg)}
main{padding:8px 16px 48px;max-width:1280px;margin:0 auto}
section{margin-top:28px}
header{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin-bottom:12px}
h2{margin:0;font-size:15px;font-weight:600}
h3{margin:0 0 8px;font-size:12px;font-weight:500;color:var(--muted)}
header p{margin:0;color:var(--muted);font-size:12px;max-width:820px}
nav.jump{display:flex;flex-wrap:wrap;gap:8px;font-size:12px}
a{color:var(--accent)}
svg.g{stroke-width:var(--w);height:var(--size);width:calc(var(--size) * var(--k));flex:none}
.panel,.sets>div{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 14px}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 24px;min-height:52px;border-top:1px solid var(--line);padding:6px 0}
.row:first-child{border-top:0}
.who{width:130px;flex:none;font-size:12px;color:var(--muted)}
.strip{display:flex;flex-wrap:wrap;align-items:center;gap:calc(var(--size) * .6);min-width:0}
.sets{display:grid;gap:10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(58px,1fr));gap:6px}
.words{display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:6px}
.words.even{opacity:.6}
h3.sub{margin-top:12px}
table.pairs{border-collapse:collapse;font-size:12px}
.pairs td,.pairs th{padding:4px 14px 4px 0;text-align:left;font-weight:500;color:var(--muted)}
.pairs td:nth-child(3){font:12px ui-monospace,Menlo,monospace;color:var(--ink)}
figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0 4px;border-radius:8px}
figure:hover{background:color-mix(in srgb,var(--ink) 5%,transparent)}
figcaption{font:10px ui-monospace,Menlo,monospace;color:var(--muted)}
.alpha{display:flex;flex-wrap:wrap;gap:4px 10px;margin-bottom:8px}
.tb{display:flex}
.toolbar{display:inline-flex;align-items:center;gap:.75em;padding:.4em .7em;border:1px solid var(--line);border-radius:999px}
.toolbar svg.g{height:1em;width:calc(1em * var(--k))}
.toolbar .chip{display:inline-flex;align-items:center;gap:.25em}
.s16{font-size:16px}.s20{font-size:20px}.s32{font-size:32px}
.compare-note{color:var(--muted);font-size:12px;margin:8px 0 0}
@media (max-width:560px){.who{width:100%}}
</style>
</head>
<body>
<div class="bar">
  <h1>xymbols</h1>
  <nav class="tabs"><a href="index.html">Catalog</a><a href="letterforms.html" aria-current="page">Letterforms</a></nav>
  <div class="ctl">Size <div class="seg" data-var="--size" data-unit="px">${[16, 20, 24, 32, 48].map((s) => `<button aria-pressed="${s === 24}">${s}</button>`).join('')}</div></div>
  <div class="ctl">Weight <div class="seg" data-var="--w" data-unit="">${[1, 1.5, 2, 2.5, 3].map((w) => `<button aria-pressed="${w === 2}">${w}</button>`).join('')}</div></div>
  <div class="ctl">Theme <div class="seg" data-attr="data-theme">${['auto', 'light', 'dark'].map((s) => `<button aria-pressed="${s === 'auto'}">${s}</button>`).join('')}</div></div>
</div>
<main>
<section>
  <header><h2>Letterforms, experimental</h2><p>Three Lucide-based ways to draw the letters in locale and key glyphs, next to Lucide ${lucide.version} icons. Locales go unframed by default, between rules as an option; keys sit in Lucide's square, widened for words. Letters are spaced optically in whole pixels. Nothing here ships yet.</p></header>
  <nav class="jump">${FAMILIES.map((f) => `<a href="#${f.id}">${esc(f.label)}</a>`).join('')}</nav>
</section>
<section>
  <header><h2>Side by side</h2><p>Lucide icons with unframed locales between them; then a locale between rules, keys in a square and a circle, and a wide key, beside Lucide's own square and circle icons.</p></header>
  <div class="panel">${sideBySide}</div>
</section>
<section>
  <header><h2>In a toolbar</h2><p>At 16, 20 and 32px: search, notifications, a language chip, a locale between rules, settings.</p></header>
  <div class="panel">${toolbars}</div>
</section>
${FAMILIES.map(familySection).join('\n')}
<section id="spacing">
  <header><h2>Spacing</h2><p>Each pair is spaced by the white between it, not its nearest points: row by row across the cap height, counted up to ${DEPTH}px deep into an open side, it should add up to what two stems leave at the even ${AIR}px gap, and no strokes come closer than ${MIN_AIR}px. Distances are whole pixels. Lucide letters at key size; gap is from one letter's box to the next (negative: they tuck under each other).</p></header>
  <div class="panel">${pairTable}</div>
</section>
<p class="compare-note">Lucide icons and letters: ISC.</p>
</main>
<script>
for (const seg of document.querySelectorAll('.seg')) {
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const x of seg.children) x.setAttribute('aria-pressed', String(x === b));
    const v = b.textContent;
    if (seg.dataset.var) document.documentElement.style.setProperty(seg.dataset.var, v + seg.dataset.unit);
    if (seg.dataset.attr === 'data-theme') v === 'auto' ? document.documentElement.removeAttribute('data-theme') : document.documentElement.setAttribute('data-theme', v);
  });
}
</script>
</body>
</html>
`;

mkdirSync(join(ROOT, 'preview'), { recursive: true });
writeFileSync(join(ROOT, 'preview/letterforms.html'), html);
console.log(`letterforms: ${FAMILIES.length} families → preview/letterforms.html`);
