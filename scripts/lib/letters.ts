/**
 * The tagsets stroke alphabet, the frames text sits in, and the two widths a
 * glyph can take.
 *
 * Every character is a monoline capital, digit or arrow drawn for a 2px round
 * stroke in a squared style: straight sides and Lucide's rectangle corners,
 * as in its square and keycap frames. Every character takes the same cell,
 * and pairs are spaced optically, at most 4 units apart (2px of air between
 * two stems; see pairGap). Two optical sizes:
 *
 * - `text`, for freestanding glyphs: an 8x14 cell (16 tall in ink). Two
 *   characters span x 2..22, filling the square edge to edge, and sit at the
 *   visual size of a Lucide pictogram beside them.
 * - `framed`, inside a frame: a 6x10 cell, the most a frame's 2px of padding
 *   leaves room for.
 *
 * Both keep stems and bars on whole pixels, so 2px strokes stay crisp at 1x.
 *
 * Text is always set on one line. Two widths ("fits", as in Figma's
 * auto-layout sizing):
 * - `fixed`: the 24x24 square, which holds two characters unframed (one in a
 *   frame). Longer codes need a short form ("NP" for "PROPN") or have no
 *   fixed variant.
 * - `hug`: 24 tall, as wide as the text needs. Frames stretch: a circle
 *   becomes a pill, a key's square widens. Never narrower than the square for
 *   a framed glyph; an unframed glyph can be narrower than tall.
 *
 * Characters are written in their own cell (top-left at 0,0) and placed by
 * translating the whole path.
 */

import svgpath from 'svgpath';
import { samplePath, type Pt } from './spacing.ts';

/** The widest gap between two characters' cells: two stems 2px of air apart. */
export const GAP = 4;

export interface Letter {
  width: number;
  d: string;
}

const n = (v: number) => +v.toFixed(3);
/** A path written with ${} numbers, each rounded. */
const p = (s: TemplateStringsArray, ...v: (number | string)[]) => s.reduce((a, b, i) => a + b + (i < v.length ? (typeof v[i] === 'number' ? n(v[i] as number) : v[i]) : ''), '');

/**
 * The squared alphabet, drawn for a `w`x`h` cell with corners of radius `c`
 * (Lucide's 2px rectangle corners at text size, 1.5 framed): straight sides,
 * bowls that are rounded rectangles, terminals of C, G, S and 2 that run on 1
 * unit past the corner. 0 is a stadium to tell it from the boxed O. Stems,
 * bars and bowls sit on whole units; corners and diagonals land where they
 * fall.
 */
function squared(w: number, h: number, c: number): Record<string, string> {
  const m = h / 2; // middle bar
  const bh = Math.round((h * 4) / 7); // P and R bowls
  const d = Math.min(2 * c, w / 2); // D's rounder corners
  const t = 1; // terminals past the corner
  const box = (x0: number, y0: number, x1: number, y1: number, r = c) =>
    p`M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`;
  // Open on the right: C, and the start of G.
  const open = p`M${w} ${c + t}V${c}A${c} ${c} 0 0 0 ${w - c} 0H${c}A${c} ${c} 0 0 0 0 ${c}V${h - c}A${c} ${c} 0 0 0 ${c} ${h}H${w - c}A${c} ${c} 0 0 0 ${w} ${h - c}`;
  const bowl = p`M0 ${h}V0H${w - c}A${c} ${c} 0 0 1 ${w} ${c}V${bh - c}A${c} ${c} 0 0 1 ${w - c} ${bh}H0`;
  const lower = Math.round(h * 0.43); // where 5 turns into its bowl
  return {
    A: p`M0 ${h}V${c}A${c} ${c} 0 0 1 ${c} 0H${w - c}A${c} ${c} 0 0 1 ${w} ${c}V${h}M0 ${Math.round(h * 0.55)}H${w}`,
    B: p`M0 ${m}H${w - c}A${c} ${c} 0 0 1 ${w} ${m + c}V${h - c}A${c} ${c} 0 0 1 ${w - c} ${h}H0V0H${w - 1 - c}A${c} ${c} 0 0 1 ${w - 1} ${c}V${m - c}A${c} ${c} 0 0 1 ${w - 1 - c} ${m}`,
    C: p`${open}V${h - c - t}`,
    D: p`M0 0H${w - d}A${d} ${d} 0 0 1 ${w} ${d}V${h - d}A${d} ${d} 0 0 1 ${w - d} ${h}H0Z`,
    E: p`M${w} 0H0V${h}H${w}M0 ${m}H${(5 * w) / 6}`,
    F: p`M${w} 0H0V${h}M0 ${m}H${(5 * w) / 6}`,
    G: p`${open}V${m}H${w / 2}`,
    H: p`M0 0V${h}M${w} 0V${h}M0 ${m}H${w}`,
    I: p`M${w / 2} 0V${h}M${w / 6} 0H${(5 * w) / 6}M${w / 6} ${h}H${(5 * w) / 6}`,
    J: p`M${w} 0V${h - c}A${c} ${c} 0 0 1 ${w - c} ${h}H${c}A${c} ${c} 0 0 1 0 ${h - c}V${Math.round(h * 0.7)}`,
    K: p`M0 0V${h}M${w} 0L0 ${h * 0.6}M${w / 3} ${h * 0.4}L${w} ${h}`,
    L: p`M0 0V${h}H${w}`,
    M: p`M0 ${h}V0L${w / 2} ${h * 0.6}L${w} 0V${h}`,
    N: p`M0 ${h}V0L${w} ${h}V0`,
    O: box(0, 0, w, h),
    P: bowl,
    Q: p`${box(0, 0, w, h)}M${Math.round(w * 0.6)} ${Math.round(h * 0.72)}L${w} ${h}`,
    R: p`${bowl}M${w / 2} ${bh}L${w} ${h}`,
    S: p`M${w} ${c + t}V${c}A${c} ${c} 0 0 0 ${w - c} 0H${c}A${c} ${c} 0 0 0 0 ${c}V${m - c}A${c} ${c} 0 0 0 ${c} ${m}H${w - c}A${c} ${c} 0 0 1 ${w} ${m + c}V${h - c}A${c} ${c} 0 0 1 ${w - c} ${h}H${c}A${c} ${c} 0 0 1 0 ${h - c}V${h - c - t}`,
    T: p`M0 0H${w}M${w / 2} 0V${h}`,
    U: p`M0 0V${h - c}A${c} ${c} 0 0 0 ${c} ${h}H${w - c}A${c} ${c} 0 0 0 ${w} ${h - c}V0`,
    V: p`M0 0L${w / 2} ${h}L${w} 0`,
    W: p`M0 0L${w / 4} ${h}L${w / 2} ${h * 0.4}L${(3 * w) / 4} ${h}L${w} 0`,
    X: p`M0 0L${w} ${h}M${w} 0L0 ${h}`,
    Y: p`M0 0L${w / 2} ${m}L${w} 0M${w / 2} ${m}V${h}`,
    Z: p`M0 0H${w}L0 ${h}H${w}`,
    '0': box(0, 0, w, h, w / 2),
    '1': p`M1 ${Math.round(h * 0.2)}L${w / 2 + 1} 0V${h}`,
    '2': p`M0 ${c + t}V${c}A${c} ${c} 0 0 1 ${c} 0H${w - c}A${c} ${c} 0 0 1 ${w} ${c}V${m - c}A${c} ${c} 0 0 1 ${w - c} ${m}H${c}A${c} ${c} 0 0 0 0 ${m + c}V${h}H${w}`,
    '3': p`M0 0H${w - c}A${c} ${c} 0 0 1 ${w} ${c}V${m - c}A${c} ${c} 0 0 1 ${w - c} ${m}H${Math.round(w / 3)}M${w - c} ${m}A${c} ${c} 0 0 1 ${w} ${m + c}V${h - c}A${c} ${c} 0 0 1 ${w - c} ${h}H0`,
    '4': p`M0 0V${Math.round(h * 0.64)}H${w}M${w - 2} 0V${h}`,
    '5': p`M${w} 0H0V${lower}H${w - c}A${c} ${c} 0 0 1 ${w} ${lower + c}V${h - c}A${c} ${c} 0 0 1 ${w - c} ${h}H0`,
    '6': p`M${w} 0H${c}A${c} ${c} 0 0 0 0 ${c}V${h - c}A${c} ${c} 0 0 0 ${c} ${h}H${w - c}A${c} ${c} 0 0 0 ${w} ${h - c}V${m + c}A${c} ${c} 0 0 0 ${w - c} ${m}H0`,
    '7': p`M0 0H${w}L${Math.round(w * 0.375)} ${h}`,
    '8': p`${box(1, 0, w - 1, m)}${box(0, m, w, h)}`,
    '9': p`M0 ${h}H${w - c}A${c} ${c} 0 0 0 ${w} ${h - c}V${c}A${c} ${c} 0 0 0 ${w - c} 0H${c}A${c} ${c} 0 0 0 0 ${c}V${m - c}A${c} ${c} 0 0 0 ${c} ${m}H${w}`,
  };
}

/* Symbols, straight strokes in each cell. */
const TEXT_SYMBOLS: Readonly<Record<string, string>> = {
  '.': 'M4 14h.01',
  '-': 'M1.333 7h5.334',
  '+': 'M0 7h8M4 3v8',
  '/': 'M0 14l8-14',
  '↑': 'M4 14v-14M0 4l4-4 4 4',
  '↓': 'M4 0v14M0 10l4 4 4-4',
  '←': 'M8 7h-8M4 3l-4 4 4 4',
  '→': 'M0 7h8M4 3l4 4-4 4',
  '↖': 'M8 14l-8-14M0 5v-5h5',
  '↘': 'M0 0l8 14M8 9v5h-5',
};

const FRAMED_SYMBOLS: Readonly<Record<string, string>> = {
  '.': 'M3 10h.01',
  '-': 'M1 5h4',
  '+': 'M0 5h6M3 2v6',
  '/': 'M0 10l6-10',
  '↑': 'M3 10v-10M0 3l3-3 3 3',
  '↓': 'M3 0v10M0 7l3 3 3-3',
  '←': 'M6 5h-6M3 2l-3 3 3 3',
  '→': 'M0 5h6M3 2l3 3-3 3',
  '↖': 'M6 10l-6-10M0 4v-4h4',
  '↘': 'M0 0l6 10M6 6v4h-4',
};

/* Text size, 8x14, corners 2 (Lucide's rectangles); framed, 6x10, corners 1.5. */
const TEXT_GLYPHS: Readonly<Record<string, string>> = { ...squared(8, 14, 2), ...TEXT_SYMBOLS };
const FRAMED_GLYPHS: Readonly<Record<string, string>> = { ...squared(6, 10, 1.5), ...FRAMED_SYMBOLS };

export type Size = 'text' | 'framed';

export interface Alphabet {
  /** Cell width, in stroke-centre units. */
  cell: number;
  /** Cap height, in stroke-centre units. */
  cap: number;
  letters: Readonly<Record<string, Letter>>;
}

const alphabet = (cell: number, cap: number, glyphs: Readonly<Record<string, string>>): Alphabet => ({
  cell,
  cap,
  letters: Object.fromEntries(Object.entries(glyphs).map(([c, d]) => [c, { width: cell, d }])),
});

export const SIZES: Readonly<Record<Size, Alphabet>> = {
  text: alphabet(8, 14, TEXT_GLYPHS),
  framed: alphabet(6, 10, FRAMED_GLYPHS),
};

/** The characters the alphabet has (both sizes have the same set). */
export const LETTERS = SIZES.text.letters;

/** Shift a letter path: every absolute move gets the offset, nothing else. */
export function place(d: string, dx: number, dy: number): string {
  return svgpath(d).translate(dx, dy).round(3).toString();
}

/*
 * Spacing. Characters are spaced by area, as type designers do (HT
 * Letterspacer, Tracy's method), not by their nearest points: the white
 * between two characters, row by row across the cap height and counted only
 * so deep into an open side, matches what two stems leave at GAP. Open shapes
 * close up (the foot of L under the arm of T, 1 after anything), yet no two
 * characters come closer than the 2px two stems keep, so text takes every
 * weight its letters do. Gaps are whole units, never wider than GAP.
 */
const STEMS = GAP - 2; // white between two stems at GAP: 2px of air
const DEPTH = 4; // how far into an open side white counts
const MIN_AIR = 2; // as two stems at GAP: closer would cap the heavier weights
const sampled = new Map<string, Pt[]>();
const pointsOf = (d: string) => {
  if (!sampled.has(d)) sampled.set(d, samplePath(d, 0.25).flat());
  return sampled.get(d)!;
};
const gaps = new Map<string, number>();

/** The gap between two characters' cells at a size, in whole units (GAP for two stems). */
export function pairGap(a: string, b: string, size: Size): number {
  const key = `${size}${a}${b}`;
  const known = gaps.get(key);
  if (known !== undefined) return known;
  const { cap, letters } = SIZES[size];
  const la = letters[a]!;
  const pa = pointsOf(la.d);
  const pb = pointsOf(letters[b]!.d);
  const rows = Array.from({ length: cap * 2 + 1 }, (_, i) => i / 2);
  const side = (pts: Pt[], y: number, f: (...v: number[]) => number) => {
    const xs = pts.filter(([, py]) => Math.abs(py - y) < 1).map(([px]) => px);
    return xs.length ? f(...xs) : NaN;
  };
  const right = rows.map((y) => side(pa, y, Math.max));
  const left = rows.map((y) => side(pb, y, Math.min));
  const white = (dx: number) =>
    rows.reduce((sum, _, i) => sum + (Number.isNaN(right[i]!) || Number.isNaN(left[i]!) ? DEPTH : Math.max(0, Math.min(DEPTH, dx + left[i]! - right[i]! - 2))), 0) / rows.length;
  const nearest = (dx: number) => {
    let best = Infinity;
    for (const [ax, ay] of pa) for (const [bx, by] of pb) best = Math.min(best, (bx + dx - ax) ** 2 + (by - ay) ** 2);
    return Math.sqrt(best) - 2;
  };
  let g = GAP;
  for (let t = -Math.floor(la.width / 2); t < GAP; t++) {
    if (white(la.width + t) >= STEMS - 1e-6 && nearest(la.width + t) >= MIN_AIR - 0.01) {
      g = t;
      break;
    }
  }
  gaps.set(key, g);
  return g;
}

export type Fit = 'fixed' | 'hug';
export const FITS: readonly Fit[] = ['fixed', 'hug'];

/**
 * What a glyph's content sits in:
 * - `none`: nothing; text or symbol on the bare grid (locales and most tags).
 * - `bubble`: Lucide's message-square, a speech bubble with its tail at the
 *   bottom left. No tagset uses it by default.
 * - `circle`: a 20px circle, a pill when hugging (CC-style marks).
 * - `keycap`: Lucide's square, 18px with 2px corners, wider when hugging (keys).
 *
 * Inside a frame, text and drawn content keep 2px of air from the frame's
 * stroke; nothing anywhere comes closer than 1px to a stroke it does not join.
 */
export type Frame = 'none' | 'bubble' | 'circle' | 'keycap';
export const FRAMES: readonly Frame[] = ['none', 'bubble', 'circle', 'keycap'];

export interface Element {
  tag: 'path' | 'circle' | 'rect';
  attrs: Record<string, string>;
}

interface FrameSpec {
  /** Which optical size of the alphabet the frame sets. */
  size: Size;
  /** Distance from the canvas edge to the frame's stroke centre. */
  inset: number;
  /** Cap line of the text: vertically centred in the frame's face. */
  top: number;
  /** Widest text the fixed (24x24) variant takes, in stroke-centre units. */
  fixedMax: number;
  /** Stroke-centre distance from text to frame when hugging. */
  pad: number;
  /** Where drawn content may go in a fixed glyph (stroke centres), if the frame constrains it. */
  content?: readonly [x0: number, y0: number, x1: number, y1: number];
  /** The frame, `w` units wide between its stroke centres, starting at x=inset. */
  draw(w: number): Element[];
}

/* Stroke centres stay inside 2..22: Lucide's 1px padding for a 2px stroke.
 * Inside a frame, content keeps at least 1px of air from the frame's stroke. */
export const FRAME_SPECS: Readonly<Record<Frame, FrameSpec>> = {
  // Two text-size characters: 20 units, x 2..22, y 5..19.
  none: { size: 'text', inset: 2, top: 5, fixedMax: 20, pad: 0, draw: () => [] },
  // Lucide's message-square (ISC), path for path at w=20: a body from y 3 to
  // 19 with the tail running off its left edge. Hugging widens the body only;
  // the tail keeps Lucide's exact curve.
  bubble: {
    size: 'framed',
    inset: 2,
    top: 6,
    fixedMax: 14,
    pad: 4,
    content: [5, 6, 19, 16],
    draw: (w) => [
      {
        tag: 'path',
        attrs: { d: `M${2 + w} 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h${w - 4}a2 2 0 0 1 2 2z` },
      },
    ],
  },
  // One character fits the circle; a pill's round ends need 6 units of padding
  // to clear a 10-tall line.
  circle: {
    size: 'framed',
    inset: 2,
    top: 7,
    fixedMax: 6,
    pad: 6,
    draw: (w) =>
      w === 20
        ? [{ tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } }]
        : [{ tag: 'path', attrs: { d: `M12 2h${w - 20}a10 10 0 0 1 0 20h-${w - 20}a10 10 0 0 1 0-20z` } }],
  },
  // Lucide's square: stroke centres 3..21, inside 4..20. A character (ink
  // y 6..18) or drawn content (ink within 6..18) keeps 2px of air all round.
  keycap: {
    size: 'framed',
    inset: 3,
    top: 7,
    fixedMax: 10,
    pad: 4,
    content: [7, 7, 17, 17],
    draw: (w): Element[] => [{ tag: 'rect', attrs: { x: '3', y: '3', width: String(w), height: '18', rx: '2' } }],
  },
};

export function textWidth(text: string, size: Size = 'text'): number {
  const chars = [...text];
  const widths = chars.map((c) => {
    const letter = SIZES[size].letters[c];
    if (!letter) throw new Error(`no letter "${c}" in the stroke alphabet`);
    return letter.width;
  });
  return widths.reduce((a, b) => a + b, 0) + chars.slice(1).reduce((sum, c, i) => sum + pairGap(chars[i]!, c, size), 0);
}

/** A frame's elements for a variant `width` wide (24 for fixed). */
export function frameElements(frame: Frame, width: number): Element[] {
  const spec = FRAME_SPECS[frame];
  return spec.draw(width - 2 * spec.inset);
}

/** Whether text fits a frame's fixed (24x24) variant. */
export function fitsFixed(text: string, frame: Frame): boolean {
  return textWidth(text, FRAME_SPECS[frame].size) <= FRAME_SPECS[frame].fixedMax;
}

function letters(text: string, x0: number, top: number, size: Size): Element[] {
  let x = x0;
  const chars = [...text];
  return chars.map((c, i) => {
    const letter = SIZES[size].letters[c]!;
    const el: Element = { tag: 'path', attrs: { d: place(letter.d, x, top) } };
    if (i + 1 < chars.length) x += letter.width + pairGap(c, chars[i + 1]!, size);
    return el;
  });
}

export interface Composed {
  /** Width of the viewBox (its height is always 24). */
  width: number;
  elements: Element[];
}

/** Set text in a frame at a fit: frame elements first, then one path per character. */
export function compose(text: string, frame: Frame, fit: Fit): Composed {
  if ([...text].length === 0) throw new Error('no text to set');
  const spec = FRAME_SPECS[frame];
  const tw = textWidth(text, spec.size);
  if (fit === 'fixed') {
    if (tw > spec.fixedMax) throw new Error(`"${text}" is ${tw} units wide; a fixed ${frame} glyph fits ${spec.fixedMax}`);
    return { width: 24, elements: [...frameElements(frame, 24), ...letters(text, Math.floor((24 - tw) / 2), spec.top, spec.size)] };
  }
  if (frame === 'none') return { width: tw + 4, elements: letters(text, 2, spec.top, spec.size) };
  const w = Math.max(24 - 2 * spec.inset, tw + 2 * spec.pad);
  return { width: w + 2 * spec.inset, elements: [...spec.draw(w), ...letters(text, spec.inset + Math.floor((w - tw) / 2), spec.top, spec.size)] };
}
