/**
 * lucide-animated, the third upstream: about 440 animated Lucide icons, each a
 * React component animated with Motion. The importer runs the installed bundle
 * with React, the JSX runtime and Motion swapped for stubs (./stubs), calls
 * each icon's startAnimation and stopAnimation through its ref, and records
 * what every motion element would do for the labels they start: its variants,
 * transitions, custom values, orchestration and pivot. Those become tracks on
 * the current Lucide drawing. Elements are matched to Lucide's nodes by shape,
 * so an animation moves today's geometry, never lucide-animated's older copy;
 * attribute and morph tracks need the exact drawing they were written for.
 * Whatever can't be carried over is left out and reported, icon by icon.
 */
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REST, type Bezier, type Ease, type Motion, type Part, type Point, type Prop, type Track } from '../runtime/motion.ts';
import type { Icon } from './lucide.ts';
import { ROOT, type Node } from './source.ts';
import { samplePath, toPath } from './spacing.ts';
import { springCurve } from './spring.ts';

export const LA_DIR = join(ROOT, 'node_modules/lucide-animated');
const STUBS = join(ROOT, 'scripts/lib/stubs');
const FRAGMENT = Symbol.for('xymbols.fragment');
/** lucide-animated draws at 28px by default; its root's x and y are CSS pixels at that size. */
const SIZE = 28;

export const lucideAnimatedVersion = (): string => (JSON.parse(readFileSync(join(LA_DIR, 'package.json'), 'utf8')) as { version: string }).version;

let hooked = false;
function hook() {
  if (hooked) return;
  hooked = true;
  const stubs: Record<string, string> = {
    react: pathToFileURL(join(STUBS, 'react.mjs')).href,
    'react/jsx-runtime': pathToFileURL(join(STUBS, 'jsx-runtime.mjs')).href,
    'motion/react': pathToFileURL(join(STUBS, 'motion.mjs')).href,
  };
  registerHooks({
    resolve(specifier, context, next) {
      const url = stubs[specifier];
      if (url && context.parentURL?.includes('/lucide-animated/dist/')) return { url, shortCircuit: true };
      return next(specifier, context);
    },
  });
}

// ---------------------------------------------------------------- the recorded tree

type Props = Record<string, unknown> & { children?: unknown; variants?: Record<string, unknown>; transition?: Tr; custom?: unknown; animate?: unknown; style?: Record<string, unknown> };
interface El {
  tag: string;
  motion: boolean;
  props: Props;
  children: El[];
  parent: El | undefined;
}
interface LogEntry {
  controls?: object;
  label?: string;
  group: number;
}
type Tr = Record<string, unknown>;

function expand(node: unknown, parent: El | undefined): El[] {
  if (node === null || node === undefined || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap((n) => expand(n, parent));
  const { type, props = {} } = node as { type: unknown; props?: Props };
  if (typeof type === 'function') return expand((type as (p: Props) => unknown)(props), parent);
  if (type && typeof type === 'object' && '$$forwardRef' in type) return expand((type as unknown as { render: (p: Props, r: null) => unknown }).render(props, null), parent);
  if (type === FRAGMENT) return expand(props.children, parent);
  const tag = typeof type === 'string' ? type : (type as { $$motion?: string } | null)?.$$motion;
  if (!tag) return [];
  const el: El = { tag, motion: typeof type !== 'string', props, children: [], parent };
  el.children = expand(props.children, el);
  return [el];
}

const SHAPES = new Set(['path', 'circle', 'rect', 'line', 'ellipse', 'polyline', 'polygon']);
const GEOMETRY = ['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'points'];
const walk = (el: El, fn: (e: El) => void) => {
  fn(el);
  for (const c of el.children) walk(c, fn);
};
const shapeNode = (el: El): Node => [el.tag, Object.fromEntries(GEOMETRY.filter((k) => el.props[k] !== undefined).map((k) => [k, String(el.props[k])]))];

// ---------------------------------------------------------------- matching shapes to Lucide's

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
function boxOf(node: Node): Box | undefined {
  try {
    const pts = samplePath(toPath(node), 0.25).flat();
    if (!pts.length) return undefined;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  } catch {
    return undefined;
  }
}
const sameNode = (a: Node, b: Node) =>
  a[0] === b[0] && Object.keys(a[1]).length === Object.keys(b[1]).length && Object.entries(a[1]).every(([k, v]) => b[1][k] === v || (v.trim() !== '' && Number(v) === Number(b[1][k])));

/** Each old shape's node in the current drawing (or none), and whether it is the very same drawing. */
function matchShapes(old: readonly Node[], nodes: readonly Node[]): { index: (number | undefined)[]; exact: boolean[] } {
  const index: (number | undefined)[] = old.map(() => undefined);
  const exact = old.map(() => false);
  const taken = new Set<number>();
  old.forEach((o, i) => {
    const j = nodes.findIndex((n, k) => !taken.has(k) && sameNode(o, n));
    if (j >= 0) {
      index[i] = j;
      exact[i] = true;
      taken.add(j);
    }
  });
  // Then by where shapes sit and how big they are: first the close ones, then, among what's left, shapes
  // Lucide has since redrawn (Pause's bars got wider, User's head smaller).
  const family = (tag: string) => (tag === 'circle' || tag === 'ellipse' ? 'round' : tag === 'rect' ? 'rect' : 'stroke');
  for (const limit of [3, 8]) {
    const pairs: [number, number, number][] = [];
    old.forEach((o, i) => {
      if (index[i] !== undefined) return;
      const a = boxOf(o);
      if (!a) return;
      nodes.forEach((n, j) => {
        if (taken.has(j)) return;
        const b = boxOf(n);
        if (!b || (limit > 3 && family(o[0]) !== family(n[0]))) return;
        const cost = Math.abs(a.x + a.w / 2 - b.x - b.w / 2) + Math.abs(a.y + a.h / 2 - b.y - b.h / 2) + Math.abs(a.w - b.w) + Math.abs(a.h - b.h) + (o[0] === n[0] ? 0 : 0.5);
        if (cost < limit) pairs.push([cost, i, j]);
      });
    });
    for (const [, i, j] of pairs.sort((a, b) => a[0] - b[0])) {
      if (index[i] !== undefined || taken.has(j)) continue;
      index[i] = j;
      taken.add(j);
    }
  }
  return { index, exact };
}

// ---------------------------------------------------------------- transitions

const ORCHESTRATION = new Set(['when', 'delay', 'delayChildren', 'staggerChildren', 'staggerDirection', 'repeat', 'repeatType', 'repeatDelay', 'from', 'elapsed']);
const TRANSFORM_KEYS = new Set(['x', 'y', 'z', 'translateX', 'translateY', 'translateZ', 'scale', 'scaleX', 'scaleY', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'skew', 'skewX', 'skewY']);

/** Motion's per-value transition: `transition[key]`, else `transition.default`, else the transition itself. */
const valueTransition = (tr: Tr | undefined, key: string): Tr => ((tr?.[key] ?? tr?.default ?? tr ?? {}) as Tr);

/** Whether a transition says how to animate (anything beyond timing and orchestration), as Motion's isTransitionDefined. */
const defined = (tr: Tr) => Object.entries(tr).some(([k, v]) => !ORCHESTRATION.has(k) && (k === 'ease' || typeof v !== 'object' || v === null || Array.isArray(v)));

/** Motion's default transition when none is given (motion-dom getDefaultTransition). */
function defaultTransition(key: string, frames: readonly number[]): Tr {
  if (frames.length > 2) return { type: 'keyframes', duration: 0.8 };
  if (TRANSFORM_KEYS.has(key)) {
    return key.startsWith('scale')
      ? { type: 'spring', stiffness: 550, damping: frames[1] === 0 ? 2 * Math.sqrt(550) : 30, restSpeed: 10 }
      : { type: 'spring', stiffness: 500, damping: 25, restSpeed: 10 };
  }
  return { type: 'keyframes', ease: [0.25, 0.1, 0.35, 1], duration: 0.3 };
}

const BEZIERS: Record<string, Bezier> = { easeIn: [0.42, 0, 1, 1], easeOut: [0, 0, 0.58, 1], easeInOut: [0.42, 0, 0.58, 1], backOut: [0.33, 1.53, 0.69, 0.99] };
const bezierFn = ([x1, y1, x2, y2]: Bezier) => (x: number) => {
  let lo = 0;
  let hi = 1;
  let t = x;
  const at = (a: number, b: number, s: number) => 3 * a * (1 - s) ** 2 * s + 3 * b * (1 - s) * s ** 2 + s ** 3;
  for (let i = 0; i < 40; i++) {
    const v = at(x1, x2, t);
    if (v < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return at(y1, y2, t);
};
const circIn = (p: number) => 1 - Math.sin(Math.acos(p));
const backIn = (p: number) => 1 - bezierFn(BEZIERS.backOut!)(1 - p);
const mirror = (f: (p: number) => number) => (p: number) => (p <= 0.5 ? f(2 * p) / 2 : (2 - f(2 * (1 - p))) / 2);
const FUNCTIONS: Record<string, (p: number) => number> = {
  circIn,
  circOut: (p) => 1 - circIn(1 - p),
  circInOut: mirror(circIn),
  backIn,
  backInOut: mirror(backIn),
  anticipate: (p) => ((p *= 2) < 1 ? 0.5 * backIn(p) : 0.5 * (2 - 2 ** (-10 * (p - 1)))),
};
const sampled = (f: (p: number) => number): Ease => ({ samples: Array.from({ length: 41 }, (_, i) => Math.round(f(i / 40) * 1e4) / 1e4) });

function easeOf(e: unknown): Ease | undefined {
  if (e === 'linear') return 'linear';
  if (typeof e === 'string') return BEZIERS[e] ?? (FUNCTIONS[e] ? sampled(FUNCTIONS[e]) : undefined);
  if (Array.isArray(e) && e.length === 4 && e.every((n) => typeof n === 'number')) return e as unknown as Bezier;
  if (e && typeof e === 'object' && '$$bezier' in e) return (e as { $$bezier: Bezier }).$$bezier;
  if (typeof e === 'function') return sampled(e as (p: number) => number);
  return undefined;
}

interface Timing {
  ms: number;
  ease: Ease | Ease[];
  times?: number[];
  delay: number;
  repeat?: number;
  alternate?: boolean;
  repeatDelay?: number;
}

/** A Motion transition for one value as track timing: springs solved into samples, eases named or sampled. */
function timing(tr: Tr, key: string, frames: readonly number[], notes: string[]): Timing {
  const o: Tr = defined(tr) ? tr : { ...tr, ...defaultTransition(key, frames) };
  const seconds = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) * 1000 : 0); // `0.1 * custom` with no custom is NaN
  const delay = seconds(o.delay ?? 0);
  const extra = {
    ...(o.repeat ? { repeat: Number(o.repeat) } : {}),
    ...(o.repeat && (o.repeatType === 'reverse' || o.repeatType === 'mirror') ? { alternate: true } : {}),
    ...(seconds(o.repeatDelay) ? { repeatDelay: seconds(o.repeatDelay) } : {}),
  };
  if (o.type === 'spring' && frames.length <= 2) {
    const delta = Math.abs((frames[1] ?? 0) - (frames[0] ?? 0)) || 1;
    const spring = springCurve(
      {
        ...(['stiffness', 'damping', 'mass', 'duration', 'bounce', 'visualDuration', 'velocity', 'restSpeed', 'restDelta'] as const).reduce<Record<string, number>>(
          (acc, k) => (o[k] === undefined ? acc : { ...acc, [k]: Number(o[k]) }),
          {},
        ),
      },
      TRANSFORM_KEYS.has(key) ? delta : 100,
    );
    return { ms: spring.ms, ease: { samples: spring.samples }, delay, ...extra };
  }
  if (o.type === 'spring') notes.push(`${key}: a spring through ${frames.length} keyframes plays as a tween`);
  const segments = Math.max(1, frames.length - 1);
  let ease: Ease | Ease[] = BEZIERS.easeInOut!;
  if (Array.isArray(o.ease) && !(o.ease.length === 4 && o.ease.every((n) => typeof n === 'number'))) {
    ease = (o.ease as unknown[]).map((e) => easeOf(e) ?? BEZIERS.easeInOut!).slice(0, segments);
  } else if (o.ease !== undefined) {
    ease = easeOf(o.ease) ?? BEZIERS.easeInOut!;
    if (!easeOf(o.ease)) notes.push(`${key}: unknown ease ${JSON.stringify(o.ease)}`);
  }
  const times = Array.isArray(o.times) && o.times.length === frames.length ? (o.times as number[]) : undefined;
  return { ms: seconds(o.duration ?? 0.3) || 300, ease, ...(times ? { times } : {}), delay, ...extra };
}

// ---------------------------------------------------------------- values

const KEYS: Record<string, { prop: Prop; attr?: string }> = {
  rotate: { prop: 'rotate' },
  rotateZ: { prop: 'rotate' },
  x: { prop: 'x' },
  translateX: { prop: 'x' },
  y: { prop: 'y' },
  translateY: { prop: 'y' },
  scale: { prop: 'scale' },
  scaleX: { prop: 'scaleX' },
  scaleY: { prop: 'scaleY' },
  opacity: { prop: 'opacity' },
  pathLength: { prop: 'draw' },
  pathOffset: { prop: 'drawOffset' },
  d: { prop: 'attr', attr: 'd' },
  ...Object.fromEntries(['cx', 'cy', 'r', 'rx', 'ry', 'x1', 'x2', 'y1', 'y2', 'width', 'height'].map((a) => [a, { prop: 'attr' as const, attr: a }])),
  strokeWidth: { prop: 'attr', attr: 'stroke-width' },
  strokeDashoffset: { prop: 'attr', attr: 'stroke-dashoffset' },
};

const num = (v: unknown): number | undefined => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && /^-?[\d.]+(px|deg)?$/.test(v.trim())) return parseFloat(v);
  return undefined;
};

// ---------------------------------------------------------------- pivots

function parseOrigin(spec: string, b: Box, px: number): Point {
  let x: number | undefined;
  let y: number | undefined;
  const numeric: number[] = [];
  const size = (tok: string, s: number) => (tok.endsWith('%') ? (parseFloat(tok) / 100) * s : parseFloat(tok) * px);
  const tokens = spec.trim().split(/\s+/);
  const numbers: string[] = [];
  for (const tok of tokens) {
    if (tok === 'left') x = 0;
    else if (tok === 'right') x = b.w;
    else if (tok === 'top') y = 0;
    else if (tok === 'bottom') y = b.h;
    else if (tok === 'center') numeric.push(NaN);
    else numbers.push(tok);
  }
  for (const tok of numbers) {
    if (x === undefined) x = size(tok, b.w);
    else if (y === undefined) y = size(tok, b.h);
  }
  return [b.x + (x ?? b.w / 2), b.y + (y ?? b.h / 2)];
}

function originOf(el: El, box: Box, px: number): Point {
  const style = el.props.style ?? {};
  const ox = num(style.originX ?? el.props.originX);
  const oy = num(style.originY ?? el.props.originY);
  const to = (style.transformOrigin ?? el.props.transformOrigin) as string | undefined;
  let p: Point = to ? parseOrigin(String(to), box, px) : [box.x + box.w / 2, box.y + box.h / 2];
  if (ox !== undefined) p = [box.x + ox * box.w, p[1]];
  if (oy !== undefined) p = [p[0], box.y + oy * box.h];
  return [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000];
}

// ---------------------------------------------------------------- one icon

export interface ImportedIcon {
  /** lucide-animated's export, `BellIcon`. */
  name: string;
  icon: Icon;
  motion: Motion;
  /** What couldn't be carried over. */
  notes: string[];
}

interface Target {
  el: El;
  /** 'all', a node index, or the node indexes of a group. */
  kind: 'all' | 'node' | 'group';
  nodes: number[];
  exact: boolean;
  origin: Point;
  /** Grid units per Motion pixel: 24/28 on the root, 1 inside. */
  px: number;
}

interface Piece {
  target: Target;
  key: string;
  group: number;
  track: Track;
}

const isControls = (v: unknown): v is object => !!v && typeof v === 'object' && '$$controls' in v;

/** The labels an element animates to, from its own controls or (variant propagation) its nearest motion ancestor's. */
function labels(el: El, log: readonly LogEntry[]): { source: El; entries: LogEntry[] } | undefined {
  for (let e: El | undefined = el; e; e = e.parent) {
    if (!e.motion) continue;
    if (isControls(e.props.animate)) return { source: e, entries: log.filter((l) => l.controls === e.props.animate && l.label) };
    if (e.props.animate !== undefined || e.props.inherit === false) return undefined;
  }
  return undefined;
}

function variantOf(el: El, label: string): Record<string, unknown> | undefined {
  const v = el.props.variants?.[label];
  return (typeof v === 'function' ? (v as (c: unknown) => unknown)(el.props.custom) : v) as Record<string, unknown> | undefined;
}

/** Extra delay from an ancestor's delayChildren and staggerChildren, in ms. */
function orchestration(el: El, source: El, label: string, order: Map<El, El[]>): number {
  if (source === el) return 0;
  const tr = (variantOf(source, label)?.transition ?? source.props.transition ?? {}) as Tr;
  const siblings = order.get(source) ?? [];
  const i = siblings.indexOf(el);
  const stagger = Number(tr.staggerChildren ?? 0);
  const n = tr.staggerDirection === -1 ? siblings.length - 1 - i : i;
  return (Number(tr.delayChildren ?? 0) + Math.max(0, n) * stagger) * 1000;
}

/**
 * Sequential tracks on one target and property, from labels started one after another, as one track. A step
 * that starts before the previous one is done interrupts it there, as a new Motion animation of the same
 * value does.
 */
function merge(tracks: Track[], notes: string[], what: string): Track {
  if (tracks.length === 1) return tracks[0]!;
  if (tracks.some((t) => t.repeat || t.paths)) {
    notes.push(`${what}: a repeating or morphing step in a sequence; only its last step plays`);
    return [...tracks].sort((a, b) => (a.delay ?? 0) - (b.delay ?? 0)).at(-1)!;
  }
  const sorted = [...tracks].sort((a, b) => (a.delay ?? 0) - (b.delay ?? 0));
  const start = sorted[0]!.delay ?? 0;
  /** Each keyframe, with the curve of the segment that ends at it. */
  const points: { at: number; v: number; ease: Ease }[] = [];
  for (const t of sorted) {
    const times = t.times ?? t.values.map((_, i) => i / Math.max(1, t.values.length - 1));
    const begin = (t.delay ?? 0) - start;
    while (points.length && points.at(-1)!.at > begin) points.pop();
    t.values.forEach((v, i) => {
      const ease: Ease = i === 0 ? 'linear' : Array.isArray(t.ease) && typeof t.ease[0] !== 'number' ? ((t.ease as Ease[])[i - 1] ?? 'linear') : ((t.ease as Ease | undefined) ?? 'linear');
      points.push({ at: begin + (times[i] ?? 0) * t.ms, v, ease });
    });
  }
  const ms = Math.max(1, points.at(-1)!.at);
  return {
    ...sorted[0]!,
    values: points.map((p) => p.v),
    times: points.map((p) => Math.round((p.at / ms) * 1e4) / 1e4),
    ms,
    delay: start,
    ease: points.slice(1).map((p) => p.ease),
    back: sorted.at(-1)!.back,
  };
}

/** Keyframe times that run forwards and stay in [0, 1]. */
const sound = (t: Track) => !t.times || (t.times.length === t.values.length && t.times.every((x, i) => x >= 0 && x <= 1 && (i === 0 || x >= t.times![i - 1]!)));

async function importOne(name: string, component: unknown, icon: Icon, rec: { log: LogEntry[] }): Promise<ImportedIcon | string> {
  const notes: string[] = [];
  const ref: { current: { startAnimation?: () => unknown; stopAnimation?: () => unknown } | null } = { current: null };
  if (!('render' in (component as object))) return 'is not a forwardRef component';
  const roots = expand((component as { render: (p: unknown, r: unknown) => unknown }).render({ size: SIZE }, ref), undefined);
  const svg = roots.flatMap((r) => (r.tag === 'svg' ? [r] : r.children.filter((c) => c.tag === 'svg')))[0];
  if (!svg) return 'renders no <svg>';
  if (!ref.current?.startAnimation) return 'has no startAnimation handle';
  const flush = () => new Promise((r) => setTimeout(r, 0));
  rec.log = [];
  await ref.current.startAnimation();
  await flush();
  const startLog = rec.log;
  rec.log = [];
  await ref.current.stopAnimation?.();
  await flush();
  const stopLog = rec.log;

  // Shapes in drawing order, matched to Lucide's.
  const shapes: El[] = [];
  walk(svg, (e) => SHAPES.has(e.tag) && shapes.push(e));
  const { index, exact } = matchShapes(shapes.map(shapeNode), icon.nodes);
  const shapeIndex = new Map(shapes.map((s, i) => [s, i]));
  const unmatched = shapes.filter((_, i) => index[i] === undefined).length;
  if (unmatched) notes.push(`${unmatched} of lucide-animated's ${shapes.length} shapes have no counterpart in Lucide's drawing`);

  // Variant children of each source, in order, for staggering.
  const order = new Map<El, El[]>();
  walk(svg, (e) => {
    if (!e.motion || !e.props.variants) return;
    const l = labels(e, startLog);
    if (l && l.source !== e) order.set(l.source, [...(order.get(l.source) ?? []), e]);
  });

  const targetOf = (el: El): Target | undefined => {
    if (el === svg) return { el, kind: 'all', nodes: [], exact: true, origin: originOf(el, { x: 0, y: 0, w: 24, h: 24 }, 24 / SIZE), px: 24 / SIZE };
    if (SHAPES.has(el.tag)) {
      const i = shapeIndex.get(el)!;
      const n = index[i];
      if (n === undefined) return undefined;
      return { el, kind: 'node', nodes: [n], exact: exact[i]!, origin: originOf(el, boxOf(icon.nodes[n]!) ?? { x: 0, y: 0, w: 24, h: 24 }, 1), px: 1 };
    }
    const inner: number[] = [];
    walk(el, (e) => {
      if (!SHAPES.has(e.tag)) return;
      const n = index[shapeIndex.get(e)!];
      if (n !== undefined) inner.push(n);
    });
    if (!inner.length) return undefined;
    const boxes = inner.map((n) => boxOf(icon.nodes[n]!)).filter((b): b is Box => !!b);
    const x = Math.min(...boxes.map((b) => b.x));
    const y = Math.min(...boxes.map((b) => b.y));
    const box = { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
    return { el, kind: 'group', nodes: inner, exact: false, origin: originOf(el, box, 1), px: 1 };
  };

  const boxAround = (t: Target): Box => {
    if (t.kind === 'all') return { x: 0, y: 0, w: 24, h: 24 };
    const boxes = t.nodes.map((n) => boxOf(icon.nodes[n]!)).filter((b): b is Box => !!b);
    if (!boxes.length) return { x: 0, y: 0, w: 24, h: 24 };
    const x = Math.min(...boxes.map((b) => b.x));
    const y = Math.min(...boxes.map((b) => b.y));
    return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
  };

  // Every motion element's tracks, label by label.
  const pieces: Piece[] = [];
  const groupEnds = new Map<number, number>();
  walk(svg, (el) => {
    if (!el.motion || !el.props.variants) return;
    const l = labels(el, startLog);
    if (!l?.entries.length) return;
    const target = targetOf(el);
    const stopLabel = labels(el, stopLog)?.entries.at(-1)?.label;
    const normal = stopLabel ? variantOf(el, stopLabel) : undefined;
    for (const entry of l.entries) {
      const v = variantOf(el, entry.label!);
      if (!v) continue;
      const extra = orchestration(el, l.source, entry.label!, order);
      // A pivot set in the variant itself.
      const pivoted = target && (v.originX !== undefined || v.originY !== undefined || v.transformOrigin !== undefined)
        ? { ...target, origin: originOf({ ...el, props: { ...el.props, style: { ...el.props.style, originX: v.originX ?? el.props.style?.originX, originY: v.originY ?? el.props.style?.originY, transformOrigin: v.transformOrigin ?? el.props.style?.transformOrigin } } }, boxAround(target), target.px) }
        : target;
      for (const [key, raw] of Object.entries(v)) {
        if (key === 'transition' || key === 'transitionEnd' || key === 'originX' || key === 'originY' || key === 'transformOrigin') continue;
        const map = KEYS[key];
        if (!map) {
          notes.push(`${el.tag}: ${key} isn't carried over`);
          continue;
        }
        if (!target) {
          notes.push(`${el.tag}: ${key} moves a shape Lucide no longer draws`);
          continue;
        }
        const tr = valueTransition((v.transition ?? el.props.transition) as Tr | undefined, key);
        const original = map.prop === 'attr' && target.kind === 'node' ? icon.nodes[target.nodes[0]!]![1][map.attr === 'stroke-width' ? 'stroke-width' : map.attr!] : undefined;
        if (map.prop === 'attr' && (target.kind !== 'node' || !target.exact)) {
          notes.push(`${el.tag}: ${key} is written for lucide-animated's own drawing`);
          continue;
        }
        const list = (Array.isArray(raw) ? raw : [undefined, raw]) as unknown[];
        let track: Track;
        if (map.attr === 'd') {
          const restPath = original ?? '';
          const frames = list.map((p) => (p === null || p === undefined ? restPath : String(p)));
          const paths = [...new Set([restPath, ...frames])];
          const t = timing(tr, key, frames.map((_, i) => i), notes);
          track = { part: 'all', node: target.nodes[0]!, prop: 'attr', attr: 'd', paths, values: frames.map((p) => paths.indexOf(p)), rest: 0, ...t };
        } else {
          const rest = map.prop === 'attr' ? (num(original) ?? (map.attr === 'stroke-width' ? 2 : 0)) : REST[map.prop];
          const restAt = num(normal?.[key]);
          if (restAt !== undefined && Math.abs(restAt * (map.prop === 'x' || map.prop === 'y' ? target.px : 1) - rest) > 1e-6) {
            notes.push(`${el.tag}: ${key} rests at ${restAt}, away from the drawing`);
            continue;
          }
          const values: number[] = [];
          for (const item of list) {
            const n = item === null || item === undefined ? (values.at(-1) ?? rest) : num(item);
            if (n === undefined) break;
            values.push(map.prop === 'x' || map.prop === 'y' ? n * target.px : n);
          }
          if (values.length !== list.length) {
            notes.push(`${el.tag}: ${key} has values that aren't plain numbers`);
            continue;
          }
          const t = timing(tr, key, values, notes);
          track = {
            part: 'all',
            prop: map.prop,
            ...(map.attr ? { attr: map.attr, rest } : {}),
            values,
            ...t,
            ...(map.prop === 'rotate' || map.prop.startsWith('scale') ? { origin: (pivoted ?? target).origin } : {}),
          };
        }
        track = { ...track, delay: (track.delay ?? 0) + extra };
        // The way back, from the label stopAnimation starts.
        if (normal) {
          const btr = valueTransition((normal.transition ?? el.props.transition) as Tr | undefined, key);
          const bt = timing(btr, key, [track.values.at(-1) ?? 0, track.rest ?? REST[track.prop]], []);
          const ease = Array.isArray(bt.ease) && typeof bt.ease[0] !== 'number' ? ((bt.ease as Ease[])[0] ?? 'linear') : (bt.ease as Ease);
          track = { ...track, back: { ms: bt.ms, ease, ...(bt.delay ? { delay: bt.delay } : {}) } };
        }
        const end = (track.delay ?? 0) + track.ms * ((track.repeat ?? 0) + 1) + (track.repeatDelay ?? 0) * (track.repeat ?? 0);
        groupEnds.set(entry.group, Math.max(groupEnds.get(entry.group) ?? 0, end));
        pieces.push({ target, key, group: entry.group, track });
      }
    }
  });

  // Labels started after awaiting the previous ones play after them.
  const groups = [...new Set(pieces.map((p) => p.group))].sort((a, b) => a - b);
  const offsets = new Map<number, number>();
  let at = 0;
  for (const g of groups) {
    offsets.set(g, at);
    at += groupEnds.get(g) ?? 0;
  }
  for (const p of pieces) p.track = { ...p.track, delay: (p.track.delay ?? 0) + (offsets.get(p.group) ?? 0) };

  // Moves that go nowhere (a reset to rest before the real start) drop out.
  const moving = pieces.filter((p) => p.track.paths ? p.track.values.some((v) => v !== 0) : p.track.values.some((v) => Math.abs(v - (p.track.rest ?? REST[p.track.prop])) > 1e-9));
  if (!moving.length) return notes.length ? `nothing carries over (${notes.join('; ')})` : 'starts nothing';

  // Parts: groups that contain no other moving group. An outer group's tracks repeat on what it holds.
  const groupTargets = [...new Set(moving.filter((p) => p.target.kind === 'group').map((p) => p.target.el))];
  const contains = (outer: El, inner: El) => {
    for (let e = inner.parent; e; e = e.parent) if (e === outer) return true;
    return false;
  };
  const leaves = groupTargets.filter((g) => !groupTargets.some((o) => o !== g && contains(g, o)));
  const parts: Part[] = [];
  const partOf = new Map<El, number>();
  const claimed = new Set<number>();
  for (const g of leaves) {
    const nodes = moving.find((p) => p.target.el === g)!.target.nodes.filter((n) => !claimed.has(n));
    nodes.forEach((n) => claimed.add(n));
    partOf.set(g, parts.length);
    parts.push({ nodes });
  }

  const byTarget = new Map<string, { what: string; tracks: Track[] }>();
  const add = (where: string, what: string, t: Track) => {
    const k = `${where}|${t.prop}|${t.attr ?? ''}|${t.origin?.join() ?? ''}`;
    const entry = byTarget.get(k) ?? { what, tracks: [] };
    entry.tracks.push(t);
    byTarget.set(k, entry);
  };
  for (const p of moving) {
    const { target, track } = p;
    if (target.kind === 'all') add('all', 'svg', { ...track, part: 'all' });
    else if (target.kind === 'node') add(`n${target.nodes[0]}`, target.el.tag, { ...track, part: 'all', node: target.nodes[0]! });
    else if (partOf.has(target.el)) add(`p${partOf.get(target.el)}`, 'g', { ...track, part: partOf.get(target.el)! });
    else {
      // An outer group: the same track on each inner part, and on each of its shapes in no inner part.
      const inner = leaves.filter((l) => contains(target.el, l));
      for (const l of inner) add(`p${partOf.get(l)}`, 'g', { ...track, part: partOf.get(l)! });
      const covered = new Set(inner.flatMap((l) => parts[partOf.get(l)!]!.nodes));
      for (const n of target.nodes) if (!covered.has(n)) add(`n${n}`, 'g', { ...track, part: 'all', node: n });
    }
  }
  const tracks = [...byTarget.values()].map(({ what, tracks: list }) => merge(list, notes, what)).filter((t) => sound(t) || (notes.push(`${t.prop}: keyframe times out of order`), false));
  return { name, icon, motion: { ...(parts.length ? { parts } : {}), effects: { auto: { tracks } } }, notes };
}

// ---------------------------------------------------------------- all of them

/**
 * Every lucide-animated icon: `exports` lists each of its names that is a Lucide icon (the drop-in exports them
 * all), `icons` the ones whose animation carried over, `skipped` why the rest didn't.
 */
export async function loadLucideAnimated(icons: readonly Icon[]): Promise<{ version: string; exports: { name: string; icon: Icon }[]; icons: ImportedIcon[]; skipped: string[] }> {
  hook();
  const rec = ((globalThis as { __xymbolsMotion?: { log: LogEntry[] } }).__xymbolsMotion ??= { log: [] } as { log: LogEntry[] });
  const mod = (await import(pathToFileURL(join(LA_DIR, 'dist/index.js')).href)) as Record<string, unknown>;
  const byComponent = new Map<string, Icon>();
  for (const icon of icons) for (const c of [icon.component, ...icon.aliases.map((a) => a.component)]) byComponent.set(c, icon);
  const out: ImportedIcon[] = [];
  const skipped: string[] = [];
  const exports: { name: string; icon: Icon }[] = [];
  for (const [name, component] of Object.entries(mod)) {
    if (!name.endsWith('Icon') || !component || typeof component !== 'object') continue;
    const icon = byComponent.get(name.slice(0, -4));
    if (!icon) {
      skipped.push(`${name}: not a Lucide icon`);
      continue;
    }
    exports.push({ name, icon });
    try {
      const r = await importOne(name, component, icon, rec);
      if (typeof r === 'string') skipped.push(`${name}: ${r}`);
      else out.push(r);
    } catch (e) {
      skipped.push(`${name}: ${(e as Error).message}`);
    }
  }
  return { version: lucideAnimatedVersion(), exports, icons: out, skipped };
}
