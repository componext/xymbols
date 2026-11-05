/**
 * The web engine for animated icons, shared by the vanilla, React and Vue packages (the build copies this
 * file into their src/generated/). It plays an icon's tracks on the groups `animatedTree` draws and binds them
 * to triggers. Transforms, opacity and stroke drawing run on the Web Animations API; a shape's own attributes
 * (`cx`, `x1`, a morphing `d`), which not every browser animates as CSS, run on animation frames. What isn't
 * movement (the active fill, active shapes, the press) is CSS keyed on `data-active` (ANIMATE_CSS), so nothing
 * re-renders on hover. Reduced motion keeps the state changes and plays no tracks.
 */
import { backTrack, effectLength, effectOf, endValue, isBezier, isHeld, needsBack, onceTrack, pathAt, restOf, segmentEase, timesOf, valueAtTime } from './motion.js';
import type { AnimatedIconData, Ease, Effect, Track } from './motion.js';
import { ensureAnimateStyles } from './styles.js';

export { ANIMATE_CSS, ensureAnimateStyles } from './styles.js';

/**
 * What plays an icon's effect:
 * - `hover`: the pointer over the icon, or keyboard focus on the link or button around it; held tracks hold until it leaves.
 * - `group-hover`: the same for the row around it (`.group`, or `group`'s selector), as UNA's menus.
 * - `active`: once, each time `active` turns on (UNA's tab bars). Never on mount.
 * - `mount`: once, when the icon appears.
 * - `loop`: over and over while the icon is on the page.
 * - `manual`: only through the controller (or the component's ref).
 */
export type Trigger = 'hover' | 'group-hover' | 'active' | 'mount' | 'loop' | 'manual';

export interface AnimateOptions {
  /** The effect triggers play: `auto` (the icon's own, else a wiggle) or a name. */
  effect?: string;
  trigger?: Trigger | readonly Trigger[];
  active?: boolean;
  /** The row a `group-hover` icon listens to. Default `.group`. */
  group?: string;
  /** False plays no movement at all (UNA's `draw` scene off). */
  motion?: boolean;
}

export interface AnimationController {
  /** Play an effect (default the icon's); held tracks hold until `stop`. */
  play(effect?: string): void;
  /** Send held tracks back to rest. */
  stop(): void;
  /** Play an effect once, there and back. */
  once(effect?: string): void;
  setActive(active: boolean): void;
  destroy(): void;
}

const round = (n: number) => Math.round(n * 1e4) / 1e4;

/** A curve as CSS: `linear`, `cubic-bezier()`, or `linear()` through a spring's samples. */
export function cssEase(e: Ease): string {
  if (e === 'linear') return 'linear';
  if (isBezier(e)) return `cubic-bezier(${e.map(round).join(', ')})`;
  return `linear(${e.samples.map(round).join(', ')})`;
}

/** One keyframe of a track, as CSS: a transform pivoting on the track's origin, an opacity, or a stroke dash. */
export function frame(t: Track, v: number): Keyframe {
  const [ox, oy] = t.origin ?? [12, 12];
  const pivot = (f: string) => `translate(${ox}px, ${oy}px) ${f} translate(${-ox}px, ${-oy}px)`;
  switch (t.prop) {
    case 'rotate':
      return { transform: pivot(`rotate(${round(v)}deg)`) };
    case 'scale':
      return { transform: pivot(`scale(${round(v)})`) };
    case 'scaleX':
      return { transform: pivot(`scale(${round(v)}, 1)`) };
    case 'scaleY':
      return { transform: pivot(`scale(1, ${round(v)})`) };
    case 'x':
      return { transform: `translate(${round(v)}px, 0px)` };
    case 'y':
      return { transform: `translate(0px, ${round(v)}px)` };
    case 'opacity':
      return { opacity: String(round(v)) };
    case 'draw':
      return { strokeDasharray: `${round(Math.max(0, v))} 1` };
    case 'drawOffset':
      return { strokeDashoffset: String(round(-v)) };
    case 'attr':
      return {};
  }
}

/** A track's keyframes, placed at `[start, start + span]` of the animation's length (a loop pads them). */
export function keyframesOf(t: Track, start = 0, span = 1): Keyframe[] {
  const times = timesOf(t);
  return t.values.map((v, i) => ({ ...frame(t, v), offset: round(start + (times[i] ?? 0) * span), easing: cssEase(segmentEase(t.ease, i)) }));
}

const SHAPES = 'path,circle,rect,line,ellipse,polyline,polygon';
const FOCUSABLE = 'a[href],button,[role="button"],[role="menuitem"],[role="tab"],[tabindex]';
const TRANSFORMS = new Set(['rotate', 'scale', 'scaleX', 'scaleY', 'x', 'y']);

interface Playing {
  cancel(): void;
}

interface Running {
  track: Track;
  playing: Playing[];
  /** When the track's effect started. */
  started: number;
  /** A way back, not an effect. */
  back?: boolean;
}

const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now());
const media = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches;
const frameLoop = (fn: (time: number) => boolean): Playing => {
  let id = 0;
  const tick = (time: number) => {
    if (fn(time)) id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return { cancel: () => cancelAnimationFrame(id) };
};

/** Bind an animated icon's `<svg>` (drawn from `animatedTree`) to its triggers. */
export function animate(svg: SVGSVGElement, icon: AnimatedIconData, options: AnimateOptions = {}): AnimationController {
  ensureAnimateStyles(svg.ownerDocument);
  const triggers = new Set<Trigger>(options.trigger === undefined ? ['hover'] : typeof options.trigger === 'string' ? [options.trigger] : options.trigger);
  let active = !!options.active;
  let running: Running[] = [];
  const cleanups: (() => void)[] = [];

  const targets = (t: Track): Element[] => {
    const el =
      t.node !== undefined ? svg.querySelector(`[data-n="${t.node}"]`) : t.part === 'all' ? svg.querySelector('[data-all]') : svg.querySelector(`[data-part="${t.part}"]`);
    if (!el) return [];
    if (t.prop !== 'draw' && t.prop !== 'drawOffset') return [el];
    const shapes = el.matches(SHAPES) ? [el] : [...el.querySelectorAll(SHAPES)];
    for (const s of shapes) s.setAttribute('pathLength', '1');
    return shapes;
  };

  /** An attribute track, frame by frame; at the end it leaves the attribute as the static drawing has it, unless held. */
  const attrLoop = (els: Element[], t: Track, hold: boolean, started: number, length: number): Playing => {
    const name = t.attr ?? 'd';
    const originals = els.map((el) => el.getAttribute(name));
    const write = (v: number) => {
      const value = t.paths ? pathAt(t.paths, v) : String(round(v));
      for (const el of els) el.setAttribute(name, value);
    };
    const restore = () => els.forEach((el, i) => (originals[i] === null ? el.removeAttribute(name) : el.setAttribute(name, originals[i]!)));
    const loop = frameLoop((time) => {
      const elapsed = time - started;
      if (elapsed >= length) {
        if (hold) write(endValue(t));
        else restore();
        return false;
      }
      write(valueAtTime(t, Number.isFinite(length) ? elapsed : elapsed % effectLength({ tracks: [t] })));
      return true;
    });
    return { cancel: () => (loop.cancel(), hold || restore()) };
  };

  const start = (t: Track, hold: boolean, loopLength?: number): Running => {
    const els = targets(t);
    const started = now();
    if (t.prop === 'attr') {
      const length = loopLength === undefined ? (t.repeat === Infinity ? Infinity : (t.delay ?? 0) + t.ms * ((t.repeat ?? 0) + 1) + (t.repeatDelay ?? 0) * (t.repeat ?? 0)) : Infinity;
      return { track: t, started, playing: [attrLoop(els, t, hold, started, length)] };
    }
    const composite: CompositeOperation = TRANSFORMS.has(t.prop) ? 'add' : 'replace';
    const fill: FillMode = hold ? 'forwards' : 'none';
    let frames: Keyframe[];
    let opts: KeyframeAnimationOptions;
    if (loopLength !== undefined) {
      // A loop: each track sits inside the effect's whole length, so staggered parts keep their places.
      const begin = (t.delay ?? 0) / loopLength;
      frames = [{ ...frame(t, t.values[0] ?? restOf(t)), offset: 0 }, ...keyframesOf(t, begin, t.ms / loopLength), { ...frame(t, endValue(t)), offset: 1 }];
      opts = { duration: loopLength, iterations: Infinity, fill, composite };
    } else {
      const repeat = t.repeat ?? 0;
      let duration = t.ms;
      frames = keyframesOf(t);
      if (t.repeatDelay && repeat > 0) {
        duration = t.ms + t.repeatDelay;
        frames = [...keyframesOf(t, 0, t.ms / duration), { ...frame(t, t.values[t.values.length - 1] ?? restOf(t)), offset: 1 }];
      }
      opts = { duration: Math.max(1, duration), delay: t.delay ?? 0, iterations: repeat + 1, direction: t.alternate ? 'alternate' : 'normal', fill, composite };
    }
    const playing: Playing[] = [];
    for (const el of els) {
      try {
        playing.push(el.animate(frames, opts));
      } catch {
        // A track the browser can't play is skipped; the rest of the effect still plays.
      }
    }
    return { track: t, started, playing };
  };

  const cancelAll = () => {
    for (const r of running) for (const p of r.playing) p.cancel();
    running = [];
  };

  const canMove = () => options.motion !== false && !media('(prefers-reduced-motion: reduce)') && !(active && icon.motion?.still);
  const sameTarget = (a: Track, b: Track) => a.part === b.part && a.node === b.node && a.prop === b.prop && a.attr === b.attr;

  const play = (name?: string) => {
    const effect = effectOf(icon.motion, name ?? options.effect);
    if (!effect || !canMove()) return;
    const before = running;
    running = [];
    for (const t of effect.tracks) {
      // A held track caught on its way back starts again from where it is.
      const caught = before.find((r) => r.back && sameTarget(r.track, t));
      const from = caught && !t.paths ? valueAtTime(caught.track, now() - caught.started) : undefined;
      const track = from === undefined || !isHeld(t) ? t : { ...t, values: [from, ...t.values.slice(1)] };
      running.push(start(track, isHeld(track)));
    }
    for (const r of before) for (const p of r.playing) p.cancel();
  };

  const stop = () => {
    const before = running;
    running = [];
    for (const r of before) {
      if (r.back || !needsBack(r.track)) {
        running.push(r); // a way back, or a one-shot: let it finish
        continue;
      }
      const from = valueAtTime(r.track, now() - r.started);
      const back = start(backTrack(r.track, from), false);
      for (const p of r.playing) p.cancel();
      running.push({ ...back, back: true });
    }
  };

  const once = (name?: string) => {
    const effect = effectOf(icon.motion, name ?? options.effect);
    if (!effect || !canMove()) return;
    cancelAll();
    for (const t of effect.tracks) running.push(start(onceTrack(t), false));
  };

  const loop = (name?: string) => {
    const base = effectOf(icon.motion, name ?? options.effect);
    if (!base || !canMove()) return;
    const effect: Effect = { tracks: base.tracks.map(onceTrack) };
    const length = Math.max(1, effectLength(effect));
    cancelAll();
    for (const t of effect.tracks) running.push(start(t, false, length));
  };

  const listen = (el: EventTarget, type: string, fn: (e: Event) => void) => {
    el.addEventListener(type, fn);
    cleanups.push(() => el.removeEventListener(type, fn));
  };

  const bindHover = (host: Element) => {
    listen(host, 'pointerenter', (e) => (e as PointerEvent).pointerType === 'touch' || play());
    listen(host, 'pointerleave', () => stop());
    const focusable = host.matches(FOCUSABLE) ? host : host.closest(FOCUSABLE);
    if (focusable) {
      listen(focusable, 'focusin', () => focusable.matches(':focus-visible') && play());
      listen(focusable, 'focusout', () => stop());
    }
  };

  if (triggers.has('hover')) bindHover(svg);
  if (triggers.has('group-hover')) bindHover(svg.closest(options.group ?? '.group') ?? svg);
  svg.toggleAttribute('data-active', active);
  if (triggers.has('loop')) loop();
  else if (triggers.has('mount')) once();

  return {
    play,
    stop,
    once,
    setActive(next: boolean) {
      const rising = next && !active;
      active = next;
      svg.toggleAttribute('data-active', next);
      if (rising && triggers.has('active')) once();
    },
    destroy() {
      for (const c of cleanups.splice(0)) c();
      cancelAll();
    },
  };
}
