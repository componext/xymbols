/**
 * Animated icons, shared by every SDK (the build copies this file into each
 * package's src/generated/): what an animated icon carries, the generic
 * effects every icon takes, UNA's motions as tracks, and the timing arithmetic
 * both engines use. No DOM and no React Native here: the web engine
 * (animate.ts) and the native one play the same tracks.
 */
import type { IconData } from './icon.js';
import type { GlyphElement } from './types.js';

/**
 * What a track moves. `draw` is the share of each stroke drawn from its start and `drawOffset` how far along
 * it the drawn share starts (Motion's `pathLength` and `pathOffset`). `attr` animates one of a shape's own
 * attributes (`cx`, `x1`, `d`, ...), which only works on the exact drawing it was written for.
 */
export type Prop = 'rotate' | 'x' | 'y' | 'scale' | 'scaleX' | 'scaleY' | 'opacity' | 'draw' | 'drawOffset' | 'attr';
export type Point = readonly [x: number, y: number];
export type Bezier = readonly [x1: number, y1: number, x2: number, y2: number];
/** A curve from 0 to 1: a cubic-bezier, straight, or sampled at even steps (a spring, solved at build time). */
export type Ease = 'linear' | Bezier | { readonly samples: readonly number[] };

/** One property of one part, moving through keyframes. */
export interface Track {
  /** Which part moves: its index in `parts`, or the whole drawing. */
  readonly part: number | 'all';
  /** One shape instead of a part: its index in the icon's `node`. */
  readonly node?: number;
  readonly prop: Prop;
  /** With `attr`: the attribute (`cx`, `stroke-width`, `d`, ...). */
  readonly attr?: string;
  /** With `attr: 'd'`: the shapes to morph through; `values` are positions in this list. */
  readonly paths?: readonly string[];
  /** The value the static drawing has. Default the property's (REST); an `attr` track gives its own. */
  readonly rest?: number;
  /** Keyframes: rotate in degrees, x and y in grid units, scale and opacity as factors, draw as the share of each stroke drawn. */
  readonly values: readonly number[];
  /** When each keyframe lands, 0 to 1. Default: evenly spaced. */
  readonly times?: readonly number[];
  readonly ms: number;
  readonly delay?: number;
  /** The curve of each segment between keyframes: one for all of them, or one per segment. Default standard. */
  readonly ease?: Ease | readonly Ease[];
  /** Plays after the first; Infinity loops. */
  readonly repeat?: number;
  /** Every other play runs backwards (Motion's `repeatType: 'reverse'` and `'mirror'`). */
  readonly alternate?: boolean;
  readonly repeatDelay?: number;
  /** Pivot of rotate and scale on the 24px grid. Default the centre. */
  readonly origin?: Point;
  /** How a held track goes back to rest when its trigger lets go. Default: the same duration, ease and delay. */
  readonly back?: { readonly ms: number; readonly ease?: Ease; readonly delay?: number };
  /** A held track played once (nothing holds it): there and back in `ms`, at its last value at `peak`. */
  readonly once?: { readonly ms: number; readonly peak: number };
}

export interface Effect {
  readonly tracks: readonly Track[];
}

/** A part's shape while the icon is active (UNA's Menu lines folding into an X). */
export interface ActiveShape {
  readonly x?: number;
  readonly y?: number;
  readonly deg?: number;
  readonly origin?: Point;
  /** Fades the part out while active. */
  readonly hide?: boolean;
}

export interface Part {
  /** Indexes into the icon's `node`. */
  readonly nodes: readonly number[];
  /** Filled at 20% while active: every node, or the indexes (into this part's `nodes`) of the ones to fill. */
  readonly fill?: boolean | readonly number[];
  readonly active?: ActiveShape;
}

/** What an icon adds to its drawing to animate: parts, its own effects (`auto` first), and behaviour. */
export interface Motion {
  readonly parts?: readonly Part[];
  readonly effects?: Readonly<Record<string, Effect>>;
  /** No motion while active (the Menu X holds still). */
  readonly still?: boolean;
}

export interface AnimatedIconData extends IconData {
  readonly motion?: Motion;
}

/** Which parts of an animation play: the active fill, and the movement. */
export interface Scenes {
  readonly fill?: boolean;
  readonly motion?: boolean;
}

// ---------------------------------------------------------------- curves

/** Material's standard curve, for movement that settles (UNA's transitions). */
export const STANDARD: Bezier = [0.2, 0, 0, 1];
/** For movement that goes out and comes back (UNA's keyframed motions). */
export const EMPHASIS: Bezier = [0.4, 0, 0.2, 1];
const ACCELERATE: Bezier = [0.4, 0, 1, 1];
const IN_OUT: Bezier = [0.4, 0, 0.6, 1];

export const isBezier = (e: unknown): e is Bezier => Array.isArray(e) && typeof e[0] === 'number';

/** The curve of segment `i` of a track. */
export function segmentEase(ease: Track['ease'], i: number): Ease {
  if (ease === undefined) return STANDARD;
  if (isBezier(ease) || !Array.isArray(ease)) return ease as Ease;
  const list = ease as readonly Ease[];
  return list[Math.min(i, list.length - 1)] ?? STANDARD;
}

function bezierAt([x1, y1, x2, y2]: Bezier, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const at = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;
  let lo = 0;
  let hi = 1;
  let t = x;
  for (let i = 0; i < 40; i++) {
    const v = at(x1, x2, t);
    if (Math.abs(v - x) < 1e-6) break;
    if (v < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return at(y1, y2, t);
}

/** How far along a curve is at `t` (0 to 1). Springs may overshoot past 1. */
export function easeAt(ease: Ease, t: number): number {
  if (ease === 'linear') return Math.min(1, Math.max(0, t));
  if (isBezier(ease)) return bezierAt(ease, t);
  const s = ease.samples;
  if (t <= 0) return s[0] ?? 0;
  if (t >= 1) return s[s.length - 1] ?? 1;
  const at = t * (s.length - 1);
  const i = Math.floor(at);
  return (s[i] ?? 0) + ((s[i + 1] ?? 1) - (s[i] ?? 0)) * (at - i);
}

// ---------------------------------------------------------------- timing

/** Each property's value at rest, where a drawing is as the static icon draws it. */
export const REST: Readonly<Record<Prop, number>> = { rotate: 0, x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1, draw: 1, drawOffset: 0, attr: 0 };

export const restOf = (t: Track) => t.rest ?? REST[t.prop];

/** At rest: as the static icon draws it. A turn by a whole number of turns looks like no turn. */
export const atRest = (t: Track, v: number) => (t.prop === 'rotate' && t.rest === undefined ? v % 360 === 0 : Math.abs(v - restOf(t)) < 1e-9);

/** Where a track is when it's done: its last value, or its first after an odd number of backward plays. */
export const endValue = (t: Track) => (t.alternate && (t.repeat ?? 0) % 2 === 1 ? t.values[0] : t.values[t.values.length - 1]) ?? restOf(t);

/** A track that ends away from rest holds there while its trigger holds. */
export const isHeld = (t: Track) => t.repeat !== Infinity && !atRest(t, endValue(t));

export const timesOf = (t: Track): readonly number[] =>
  t.times && t.times.length === t.values.length ? t.times : t.values.map((_, i) => (t.values.length > 1 ? i / (t.values.length - 1) : 0));

/** A track's value `ms` into one play (its delay not counted). */
export function valueAt(t: Track, ms: number): number {
  const { values } = t;
  const times = timesOf(t);
  const p = t.ms > 0 ? Math.min(1, Math.max(0, ms / t.ms)) : 1;
  for (let i = 0; i < values.length - 1; i++) {
    const t0 = times[i] ?? 0;
    const t1 = times[i + 1] ?? 1;
    if (p <= t1 || i === values.length - 2) {
      const local = t1 > t0 ? (p - t0) / (t1 - t0) : 1;
      const k = easeAt(segmentEase(t.ease, i), local);
      return (values[i] ?? 0) + ((values[i + 1] ?? 0) - (values[i] ?? 0)) * k;
    }
  }
  return values[values.length - 1] ?? REST[t.prop];
}

/** A track's value `ms` after its effect started: delay, repeats, pauses and backward plays counted. */
export function valueAtTime(t: Track, ms: number): number {
  const local = ms - (t.delay ?? 0);
  if (local <= 0) return t.values[0] ?? restOf(t);
  const period = t.ms + (t.repeatDelay ?? 0);
  const k = Math.floor(local / Math.max(1, period));
  if (k > (t.repeat ?? 0)) return endValue(t);
  const within = Math.min(t.ms, local - k * period);
  return valueAt(t, t.alternate && k % 2 === 1 ? t.ms - within : within);
}

/** A path between two of a morph's shapes: their numbers mixed, so both must have the same commands. */
export function pathAt(paths: readonly string[], v: number): string {
  const i = Math.max(0, Math.min(paths.length - 1, Math.floor(v)));
  const a = paths[i] ?? '';
  const b = paths[Math.min(paths.length - 1, i + 1)] ?? a;
  const f = v - i;
  if (f <= 0 || a === b) return a;
  const nb = b.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  let n = 0;
  return a.replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, (m) => {
    const to = Number(nb[n++] ?? m);
    return String(Math.round((Number(m) + (to - Number(m)) * f) * 1000) / 1000);
  });
}

/** When a track is done, from the start of its effect: Infinity for a loop. */
export function trackEnd(t: Track): number {
  const repeat = t.repeat ?? 0;
  if (repeat === Infinity) return Infinity;
  return (t.delay ?? 0) + t.ms * (repeat + 1) + (t.repeatDelay ?? 0) * repeat;
}

/** An effect's length in ms: its longest track. */
export const effectLength = (e: Effect) => Math.max(0, ...e.tracks.map((t) => (t.repeat === Infinity ? (t.delay ?? 0) + t.ms : trackEnd(t))));

/** The way back of a held track, from `from` to rest. */
export function backTrack(t: Track, from: number): Track {
  const back = t.back ?? { ms: t.ms, ease: segmentEase(t.ease, 0), ...(t.delay ? { delay: t.delay } : {}) };
  const rest = t.prop === 'rotate' && t.rest === undefined ? from - (from % 360) : restOf(t);
  const where = { part: t.part, ...(t.node === undefined ? {} : { node: t.node }), ...(t.origin ? { origin: t.origin } : {}) };
  const timing = { ms: back.ms, ease: back.ease ?? STANDARD, ...(back.delay ? { delay: back.delay } : {}) };
  if (t.paths) {
    // A morph goes straight back to the drawn shape, not through the ones between.
    const paths = [pathAt(t.paths, from), t.paths[rest] ?? t.paths[0] ?? ''];
    return { ...where, ...timing, prop: 'attr', attr: 'd', paths, values: [0, 1], rest: 1 };
  }
  return { ...where, ...timing, prop: t.prop, ...(t.attr ? { attr: t.attr } : {}), ...(t.rest === undefined ? {} : { rest: t.rest }), values: [from, rest] };
}

/** A track that keeps going until its trigger lets go: it repeats forever, or holds away from rest. */
export const needsBack = (t: Track) => t.repeat === Infinity || isHeld(t);

/**
 * A track played once with nothing to hold it: one that repeats forever plays one round, a held one goes there
 * and back, the rest play as they are.
 */
export function onceTrack(track: Track): Track {
  const t = track.repeat === Infinity ? { ...track, repeat: track.alternate ? 1 : 0 } : track;
  if (!isHeld(t)) return t;
  const backMs = t.back?.ms ?? t.ms;
  const ms = t.once?.ms ?? t.ms + backMs;
  const peak = t.once?.peak ?? t.ms / (t.ms + backMs);
  const times = timesOf(t);
  const eases = t.values.slice(1).map((_, i) => segmentEase(t.ease, i));
  const last = t.values[t.values.length - 1] ?? 0;
  return {
    ...t,
    values: [...t.values, t.prop === 'rotate' && t.rest === undefined ? last - (last % 360) : restOf(t)],
    times: [...times.map((x) => x * peak), 1],
    ms,
    ease: [...eases, t.back?.ease ?? eases[0] ?? STANDARD],
    back: undefined,
    once: undefined,
  };
}

// ---------------------------------------------------------------- effects

/** Effects every icon takes, with no overlay: they move the whole drawing. */
export const EFFECTS = {
  bounce: { tracks: [{ part: 'all', prop: 'y', values: [0, -3, 0, -1, 0], times: [0, 0.3, 0.55, 0.75, 1], ms: 600, ease: EMPHASIS }] },
  pulse: { tracks: [{ part: 'all', prop: 'opacity', values: [1, 0.4, 1], ms: 800, ease: IN_OUT }] },
  scale: { tracks: [{ part: 'all', prop: 'scale', values: [1, 1.15], ms: 250, ease: STANDARD }] },
  wiggle: { tracks: [{ part: 'all', prop: 'rotate', values: [0, -10, 7, -3.5, 1, 0], times: [0, 0.2, 0.45, 0.7, 0.88, 1], ms: 500, ease: EMPHASIS }] },
  rotate: { tracks: [{ part: 'all', prop: 'rotate', values: [0, 360], ms: 700, ease: STANDARD }] },
  breathe: { tracks: [{ part: 'all', prop: 'scale', values: [1, 1.08, 1], ms: 1600, ease: IN_OUT }] },
  appear: {
    tracks: [
      { part: 'all', prop: 'opacity', values: [0, 1], ms: 300, ease: STANDARD },
      { part: 'all', prop: 'scale', values: [0.6, 1], ms: 300, ease: STANDARD },
    ],
  },
  disappear: {
    tracks: [
      { part: 'all', prop: 'opacity', values: [1, 0], ms: 250, ease: ACCELERATE },
      { part: 'all', prop: 'scale', values: [1, 0.6], ms: 250, ease: ACCELERATE },
    ],
  },
  'draw-on': { tracks: [{ part: 'all', prop: 'draw', values: [0, 1], ms: 700, ease: STANDARD }] },
  'draw-off': { tracks: [{ part: 'all', prop: 'draw', values: [1, 0], ms: 400, ease: ACCELERATE }] },
} as const satisfies Record<string, Effect>;

export type GenericEffect = keyof typeof EFFECTS;
export const EFFECT_NAMES = Object.keys(EFFECTS) as GenericEffect[];

/** What plays for `name`: the icon's own effect of that name, else a generic one. `auto` is the icon's own, else a wiggle. */
export function effectOf(motion: Motion | undefined, name = 'auto'): Effect | undefined {
  if (name === 'auto') return motion?.effects?.auto ?? EFFECTS.wiggle;
  return motion?.effects?.[name] ?? (EFFECTS as Record<string, Effect>)[name];
}

// ---------------------------------------------------------------- markup

/** An element to render: tag, attributes, children. */
export type Tree = readonly [tag: string, attrs: Readonly<Record<string, string>>, children?: readonly Tree[]];

const shapeTransform = (s: ActiveShape) => {
  const [ox, oy] = s.origin ?? [12, 12];
  return `translate(${ox + (s.x ?? 0)}px, ${oy + (s.y ?? 0)}px) rotate(${s.deg ?? 0}deg) translate(${-ox}px, ${-oy}px)`;
};

/**
 * The children of an animated icon's `<svg>`: the same shapes as the static icon, grouped so its parts can
 * move. One `<g data-all>` holds everything; each part is a `<g data-part>`, inside a `<g data-shape>` when it
 * changes shape while active. Shapes in no part follow, still. Fillable shapes carry `data-fill` and start
 * at `fill-opacity` 0, so the drawing matches the static icon until the icon is active.
 */
export function animatedTree(nodes: readonly GlyphElement[], motion: Motion | undefined, scenes: Scenes = {}): Tree {
  const parts = motion?.parts ?? [];
  // Shapes a track moves by themselves are marked, so an engine can find them.
  const marked = new Set(Object.values(motion?.effects ?? {}).flatMap((e) => e.tracks.flatMap((t) => (t.node === undefined ? [] : [t.node]))));
  const partOf = new Map<number, number>();
  parts.forEach((part, p) => part.nodes.forEach((i) => partOf.has(i) || partOf.set(i, p)));
  const fillOn = scenes.fill !== false;
  const shape = (i: number, part?: Part, k = 0): Tree => {
    const [tag, attrs] = nodes[i]!;
    const fills = fillOn && part && (part.fill === true || (Array.isArray(part.fill) && part.fill.includes(k)));
    return [tag, { ...attrs, ...(fills ? { fill: 'currentColor', 'fill-opacity': '0', 'data-fill': '' } : {}), ...(marked.has(i) ? { 'data-n': String(i) } : {}) }];
  };
  const partTree = (p: number): Tree => {
    const part = parts[p]!;
    // Shapes keep the static icon's order, so they overlap as it draws them.
    const shapes = part.nodes.map((i, k) => ({ i, k })).filter(({ i }) => i >= 0 && i < nodes.length && partOf.get(i) === p);
    const group: Tree = ['g', { 'data-part': String(p) }, shapes.sort((a, b) => a.i - b.i).map(({ i, k }) => shape(i, part, k))];
    if (!part.active) return group;
    return ['g', { 'data-shape': '', ...(part.active.hide ? { 'data-hide': '' } : {}), style: `--xa-shape: ${shapeTransform(part.active)}` }, [group]];
  };
  const children: Tree[] = [];
  const drawn = new Set<number>();
  nodes.forEach((_, i) => {
    const p = partOf.get(i);
    if (p === undefined) children.push(shape(i));
    else if (!drawn.has(p)) {
      drawn.add(p);
      children.push(partTree(p));
    }
  });
  // A part with no shapes still gets its group, so the engine finds every track's target.
  parts.forEach((_, p) => drawn.has(p) || children.push(['g', { 'data-part': String(p) }, []]));
  return ['g', { 'data-all': '' }, children];
}

// ---------------------------------------------------------------- UNA

type UnaNode = readonly [tag: string, attrs: Readonly<Record<string, string | number>>];

/** One of UNA's motions (neo/packages/app/ui/atoms/animated-icons/types.ts). */
export type UnaMotion =
  | { readonly kind: 'rotate' | 'swing' | 'wiggle'; readonly deg: number; readonly origin?: Point; readonly ms?: number }
  | { readonly kind: 'shift' | 'lift'; readonly x?: number; readonly y?: number; readonly ms?: number }
  | { readonly kind: 'pulse'; readonly scale: number; readonly origin?: Point; readonly ms?: number }
  | { readonly kind: 'draw' | 'appear'; readonly ms?: number };

/** A UNA animated icon spec, as `specs.ts` and UNA forks' `customization/animated-icons` write them. */
export interface UnaSpec {
  readonly parts: readonly {
    readonly nodes: readonly UnaNode[];
    readonly fill?: boolean | readonly number[];
    readonly motion?: UnaMotion;
    readonly delay?: number;
    readonly active?: ActiveShape;
  }[];
  readonly stagger?: number;
  readonly stillWhenActive?: boolean;
}

/** UNA's web durations (the `.nai` CSS); a native one-shot of rotate and shift takes 350 ms. */
export const UNA_MS = { rotate: 300, shift: 300, swing: 450, wiggle: 500, lift: 400, pulse: 350, draw: 400, appear: 200 } as const;
const UNA_ONCE_MS = 350;

/** UNA's motions as tracks: the `.nai` keyframes, durations and curves, part for part. */
export function unaTracks(spec: UnaSpec): Track[] {
  const tracks: Track[] = [];
  let moving = 0;
  spec.parts.forEach((part, p) => {
    const m = part.motion;
    if (!m) return;
    const delay = part.delay ?? (spec.stagger ?? 0) * moving;
    moving += 1;
    const ms = m.ms ?? UNA_MS[m.kind];
    const base = { part: p, ms, ...(delay ? { delay } : {}) };
    const origin = 'origin' in m && m.origin ? { origin: m.origin } : {};
    switch (m.kind) {
      case 'rotate':
        tracks.push({ ...base, ...origin, prop: 'rotate', values: [0, m.deg], ease: STANDARD, once: { ms: m.ms ?? UNA_ONCE_MS, peak: 0.45 } });
        break;
      case 'shift':
        for (const [prop, v] of [['x', m.x ?? 0], ['y', m.y ?? 0]] as const)
          if (v) tracks.push({ ...base, prop, values: [0, v], ease: STANDARD, once: { ms: m.ms ?? UNA_ONCE_MS, peak: 0.4 } });
        break;
      case 'swing':
        tracks.push({ ...base, ...origin, prop: 'rotate', values: [0, m.deg, 0], times: [0, 0.45, 1], ease: EMPHASIS });
        break;
      case 'wiggle': {
        const d = m.deg;
        tracks.push({ ...base, ...origin, prop: 'rotate', values: [0, -d, d * 0.7, -d * 0.35, d * 0.1, 0], times: [0, 0.2, 0.45, 0.7, 0.88, 1], ease: EMPHASIS });
        break;
      }
      case 'lift':
        for (const [prop, v] of [['x', m.x ?? 0], ['y', m.y ?? -1.5]] as const)
          if (v) tracks.push({ ...base, prop, values: [0, v, 0], times: [0, 0.4, 1], ease: EMPHASIS });
        break;
      case 'pulse':
        tracks.push({ ...base, ...origin, prop: 'scale', values: [1, m.scale, 1], times: [0, 0.45, 1], ease: EMPHASIS });
        break;
      case 'draw':
        tracks.push({ ...base, prop: 'draw', values: [0, 1], ease: STANDARD });
        break;
      case 'appear':
        tracks.push({ ...base, prop: 'opacity', values: [0.15, 1], ease: STANDARD });
        break;
    }
  });
  return tracks;
}

/** UNA's parts as xymbols parts, given where each of a part's nodes is in the icon's `node`. */
export function unaMotion(spec: UnaSpec, nodeIndexes: readonly (readonly number[])[]): Motion {
  return {
    parts: spec.parts.map((part, p) => ({
      nodes: nodeIndexes[p] ?? [],
      ...(part.fill ? { fill: part.fill } : {}),
      ...(part.active ? { active: part.active } : {}),
    })),
    effects: { auto: { tracks: unaTracks(spec) } },
    ...(spec.stillWhenActive ? { still: true } : {}),
  };
}

const str = (attrs: UnaNode[1]): Record<string, string> => Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, String(v)]));

/** An animated icon from a UNA spec object as it is: its own nodes, its parts, its motion as `auto`. */
export function fromUnaSpec(spec: UnaSpec, name?: string): AnimatedIconData {
  const node: GlyphElement[] = [];
  const indexes = spec.parts.map((part) => part.nodes.map(([tag, attrs]) => node.push([tag, str(attrs)]) - 1));
  return { ...(name ? { name } : {}), node, motion: unaMotion(spec, indexes) };
}
