import { createElement, forwardRef, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ComponentType, ForwardRefExoticComponent, ReactElement, RefAttributes } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import * as NativeSvg from 'react-native-svg';
import { XymbolsContext } from './createIcon.js';
import type { LucideProps } from './createIcon.js';
import { REACT_ATTRIBUTE_NAMES, buildIcon, hasA11yProp, mergeClasses } from './generated/icon.js';
import type { IconData } from './generated/icon.js';
import { animatedTree, backTrack, effectLength, effectOf, endValue, needsBack, onceTrack, pathAt, restOf, segmentEase, easeAt, trackEnd, valueAtTime } from './generated/motion.js';
import type { AnimatedIconData, Effect, Motion, Scenes, Track, Tree, UnaSpec } from './generated/motion.js';
import { fromUnaSpec } from './generated/motion.js';
import { resolveStroke } from './generated/weights.js';

/**
 * What plays an icon's effect on native, where nothing hovers:
 * - `hover` and `group-hover`: while `pressed` is true (the press stands in for the hover), held tracks holding.
 * - `active`: once, each time `active` turns on (UNA's tab bars). Never on mount.
 * - `mount`, `loop`, `manual`: as on the web.
 */
export type Trigger = 'hover' | 'group-hover' | 'active' | 'mount' | 'loop' | 'manual';

export interface AnimatedIconHandle {
  play(effect?: string): void;
  stop(): void;
  once(effect?: string): void;
  startAnimation(): void;
  stopAnimation(): void;
}

export interface AnimatedIconProps extends LucideProps {
  /** `auto` (the icon's own animation, else a wiggle) or a generic effect: `bounce`, `pulse`, `wiggle`, ... */
  effect?: string;
  /** What plays it. Default `active`; see Trigger. */
  trigger?: Trigger | readonly Trigger[];
  /** The active state: UNA's 20% duotone fill and active shapes, switched at once. */
  active?: boolean;
  /** The row is pressed: scales the icon to 0.96 on the native driver, and plays `hover` triggers. */
  pressed?: boolean;
  scenes?: Scenes;
  animateOnHover?: boolean;
}

export type AnimatedIcon = ForwardRefExoticComponent<AnimatedIconProps & RefAttributes<AnimatedIconHandle>>;

const SHAPES = NativeSvg as unknown as Record<string, ComponentType<Record<string, unknown>>>;
const shapeOf = (tag: string) => SHAPES[tag.charAt(0).toUpperCase() + tag.slice(1)]!;
const animatedCache = new Map<ComponentType<Record<string, unknown>>, ComponentType<Record<string, unknown>>>();
const animated = (C: ComponentType<Record<string, unknown>>) => {
  if (!animatedCache.has(C)) animatedCache.set(C, Animated.createAnimatedComponent(C as ComponentType<object>) as unknown as ComponentType<Record<string, unknown>>);
  return animatedCache.get(C)!;
};
const nativeName = (name: string) => (name === 'class' ? 'className' : name.startsWith('data-') || name.startsWith('aria-') ? name : name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()));
const native = (attrs: Readonly<Record<string, unknown>>) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && !k.startsWith('data-')) out[nativeName(k)] = v;
  return out;
};
const CHILD_DEFAULTS = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ACTIVE_FILL = 0.2;
const FRAME = 1000 / 60;

/** A track as an interpolation table over the playback clock (ms since the effect started). */
function table(t: Track): { inputRange: number[]; outputRange: number[] } {
  const end = trackEnd(t);
  const input: number[] = [];
  const output: number[] = [];
  const last = Number.isFinite(end) ? end : (t.delay ?? 0) + t.ms;
  for (let ms = 0; ms < last; ms += FRAME) {
    input.push(ms);
    output.push(valueAtTime(t, ms));
  }
  input.push(last);
  output.push(Number.isFinite(end) ? endValue(t) : valueAtTime(t, last));
  if (input.length === 1) {
    input.unshift(-1);
    output.unshift(output[0]!);
  }
  return { inputRange: input, outputRange: output };
}

interface Playback {
  effect: Effect;
  /** Each held track's way back, keyed by its index in `effect.tracks`. */
  backs: Map<number, Track>;
  /** The longest way back, for the back clock. */
  backLength: number;
}

type Value = Animated.AnimatedInterpolation<number> | Animated.Value | Animated.AnimatedNode | number;

/** Draws one animated icon with react-native-svg and RN Animated. */
export const AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps & { icon: AnimatedIconData }>(function AnimatedIcon(
  { icon, effect, trigger, active = false, pressed, scenes, animateOnHover, color, size, width = size, height = size, strokeWidth, weight, absoluteStrokeWidth, nonScalingStroke, className, children, ...rest },
  ref,
) {
  const context = useContext(XymbolsContext);
  const clock = useRef(new Animated.Value(0)).current;
  const back = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const was = useRef({ active, pressed });
  const triggers = useMemo(
    () => new Set<Trigger>(animateOnHover === false ? ['manual'] : trigger === undefined ? ['active'] : typeof trigger === 'string' ? [trigger as Trigger] : (trigger as Trigger[])),
    [animateOnHover, trigger],
  );

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled?.().then((on) => live && setReduceMotion(on));
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      live = false;
      sub?.remove();
    };
  }, []);

  const canMove = () => scenes?.motion !== false && !reduceMotion && !(active && icon.motion?.still);

  const run = (e: Effect, hold: boolean) => {
    const effectRun: Effect = { tracks: e.tracks.map((t) => (hold ? t : onceTrack(t))) };
    const length = effectLength(effectRun);
    back.setValue(0);
    clock.setValue(0);
    setPlayback({ effect: effectRun, backs: new Map(), backLength: 0 });
    const loop = triggers.has('loop') && !hold;
    const timing = Animated.timing(clock, { toValue: Math.max(1, length), duration: Math.max(1, length), easing: Easing.linear, useNativeDriver: false });
    (loop ? Animated.loop(timing) : timing).start();
  };

  const play = (name?: string) => {
    const e = effectOf(icon.motion, name ?? effect);
    if (e && canMove()) run(e, true);
  };
  const once = (name?: string) => {
    const e = effectOf(icon.motion, name ?? effect);
    if (e && canMove()) run(e, false);
  };
  const stop = () => {
    if (!playback) return;
    clock.stopAnimation((at: number) => {
      const backs = new Map<number, Track>();
      playback.effect.tracks.forEach((t, i) => {
        if (needsBack(t)) backs.set(i, backTrack(t, valueAtTime(t, at)));
      });
      const backLength = Math.max(0, ...[...backs.values()].map(effectLengthOf));
      setPlayback({ ...playback, backs, backLength });
      back.setValue(0);
      Animated.timing(back, { toValue: Math.max(1, backLength), duration: Math.max(1, backLength), easing: Easing.linear, useNativeDriver: false }).start();
    });
  };

  useEffect(() => {
    if (triggers.has('loop') || triggers.has('mount')) once();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const prev = was.current;
    was.current = { active, pressed };
    if (active && !prev.active && triggers.has('active')) once();
    if ((triggers.has('hover') || triggers.has('group-hover')) && pressed !== prev.pressed) {
      if (pressed) play();
      else stop();
    }
    if (pressed !== prev.pressed && pressed !== undefined && !reduceMotion) {
      Animated.timing(press, { toValue: pressed ? 0.96 : 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, pressed]);
  useImperativeHandle(ref, () => ({ play, stop, once, startAnimation: () => play(), stopAnimation: stop }));

  const [attrs, nodes] = buildIcon(
    icon,
    {
      color: (color ?? context.color ?? 'currentColor') as string,
      width: width ?? size ?? context.size ?? 24,
      height: height ?? size ?? context.size ?? 24,
      strokeWidth: resolveStroke({ strokeWidth, weight }, context, icon.maxStroke),
      absoluteStrokeWidth: absoluteStrokeWidth ?? context.absoluteStrokeWidth ?? false,
      nonScalingStroke: nonScalingStroke ?? context.nonScalingStroke ?? false,
      className: mergeClasses(context.className, className),
      hasA11yProp: Boolean(children) || hasA11yProp(rest),
      attributes: rest,
    },
    REACT_ATTRIBUTE_NAMES,
  );
  const stroke = { fill: attrs.fill, stroke: attrs.stroke, strokeWidth: attrs.strokeWidth, strokeLinecap: attrs.strokeLinecap, strokeLinejoin: attrs.strokeLinejoin };
  const tint = String(attrs.stroke);

  /** A track's current value: its run on the clock, blended towards rest by its way back. */
  const valueOf = (t: Track, i: number): Value => {
    const enter = clock.interpolate({ ...table(t), extrapolate: 'clamp' });
    const b = playback?.backs.get(i);
    if (!b) return enter;
    const blend = back.interpolate({ inputRange: [-1, b.delay ?? 0, (b.delay ?? 0) + b.ms + 1e-3], outputRange: [0, 0, 1], extrapolate: 'clamp' });
    const eased = b.ms > 0 ? blend.interpolate({ inputRange: Array.from({ length: 21 }, (_, k) => k / 20), outputRange: Array.from({ length: 21 }, (_, k) => easeAt(segmentEase(b.ease, 0), k / 20)) }) : blend;
    return Animated.add(Animated.multiply(enter, Animated.subtract(1, eased)), Animated.multiply(restOf(t), eased));
  };

  const tracks = playback && canMove() ? playback.effect.tracks : [];
  const wrap = (content: ReactElement, own: (t: Track) => boolean, key: string): ReactElement => {
    let out = content;
    // Inner tracks first, so the first track of an element ends up outermost, as on the web.
    for (let i = tracks.length - 1; i >= 0; i--) {
      const t = tracks[i]!;
      if (!own(t) || t.prop === 'attr' || t.prop === 'drawOffset') continue;
      const v = valueOf(t, i);
      const [ox, oy] = t.origin ?? [12, 12];
      const k = `${key}-${i}`;
      if (t.prop === 'opacity' || t.prop === 'draw') out = createElement(animated(NativeSvg.G as never), { key: k, opacity: v }, out);
      else if (t.prop === 'x') out = createElement(animated(NativeSvg.G as never), { key: k, style: { transform: [{ translateX: v }] } }, out);
      else if (t.prop === 'y') out = createElement(animated(NativeSvg.G as never), { key: k, style: { transform: [{ translateY: v }] } }, out);
      else {
        const transform =
          t.prop === 'rotate'
            ? [{ rotate: (v as Animated.AnimatedInterpolation<number>).interpolate({ inputRange: [-36000, 36000], outputRange: ['-36000deg', '36000deg'] }) }]
            : [{ [t.prop === 'scaleX' ? 'scaleX' : t.prop === 'scaleY' ? 'scaleY' : 'scale']: v }];
        out = createElement(
          NativeSvg.G,
          { key: k, transform: `translate(${ox} ${oy})` },
          createElement(animated(NativeSvg.G as never), { style: { transform } }, createElement(NativeSvg.G, { transform: `translate(${-ox} ${-oy})` }, out)),
        );
      }
    }
    return out;
  };

  const fillOn = active && scenes?.fill !== false;
  const render = ([tag, a, kids]: Tree, key: string): ReactElement => {
    if (tag === 'g') {
      const part = a['data-part'];
      const inner = createElement(NativeSvg.G, { key }, ...(kids ?? []).map((c, i) => render(c, `${key}.${i}`)));
      if ('data-all' in a) return wrap(inner, (t) => t.part === 'all' && t.node === undefined, key);
      if (part !== undefined) return wrap(inner, (t) => t.part === Number(part) && t.node === undefined, key);
      if ('data-shape' in a) {
        const index = Number(kids?.[0]?.[1]['data-part']);
        const shape = icon.motion?.parts?.[index]?.active;
        if (!shape) return inner;
        const [ox, oy] = shape.origin ?? [12, 12];
        // Always the same group, with an explicit identity when inactive: react-native-svg keeps a transform
        // whose prop is removed.
        const on = active;
        return createElement(
          NativeSvg.G,
          {
            key,
            opacity: on && shape.hide ? 0 : 1,
            transform: on ? `translate(${ox + (shape.x ?? 0)} ${oy + (shape.y ?? 0)}) rotate(${shape.deg ?? 0}) translate(${-ox} ${-oy})` : 'translate(0 0)',
          },
          inner,
        );
      }
      return inner;
    }
    const n = a['data-n'];
    const fill = 'data-fill' in a ? (fillOn ? { fill: tint, fillOpacity: ACTIVE_FILL } : { fill: 'none' }) : {};
    const { 'fill-opacity': _f, ...shapeAttrs } = a;
    const props: Record<string, unknown> = { key, ...native({ ...CHILD_DEFAULTS, ...stroke, ...shapeAttrs }), ...fill };
    if (n === undefined) return createElement(shapeOf(tag), props);
    // A shape moved by itself: its attribute tracks animate its props, the rest wrap it.
    const mine = (t: Track) => t.node === Number(n);
    tracks.forEach((t, i) => {
      if (!mine(t) || t.prop !== 'attr') return;
      if (t.paths) {
        const { inputRange, outputRange } = table(t);
        props[nativeName(t.attr ?? 'd')] = clock.interpolate({ inputRange, outputRange: outputRange.map((v) => pathAt(t.paths!, v)), extrapolate: 'clamp' });
      } else props[nativeName(t.attr ?? '')] = valueOf(t, i);
    });
    const Shape = tracks.some((t) => mine(t) && t.prop === 'attr') ? animated(shapeOf(tag)) : shapeOf(tag);
    return wrap(createElement(Shape, props), mine, key);
  };

  const svg = createElement(NativeSvg.Svg, { ...native(attrs), ...rest }, render(animatedTree(nodes, icon.motion, scenes), 'x'), children);
  if (pressed === undefined) return svg;
  return createElement(Animated.View, { style: { width: Number(attrs.width), height: Number(attrs.height), transform: [{ scale: press }] } }, svg);
});

const effectLengthOf = (t: Track) => (t.delay ?? 0) + t.ms;

const pascal = (s: string) => s.replace(/(^|-)([a-z0-9])/g, (_, _d: string, c: string) => c.toUpperCase());

/** An animated icon component from icon data and its motion (or none: it then takes the generic effects). */
export function createAnimatedIcon(iconData: IconData, motion?: Motion): AnimatedIcon {
  const icon: AnimatedIconData = motion ? { ...iconData, motion } : iconData;
  const Component = forwardRef<AnimatedIconHandle, AnimatedIconProps>(function Component(props, ref) {
    return createElement(AnimatedIcon, { ref, icon, ...props });
  });
  if (icon.name) Component.displayName = pascal(icon.name);
  return Component;
}

/** An animated icon from a UNA spec object as UNA forks write them (`customization/animated-icons`). */
export function createUnaIcon(spec: UnaSpec, name?: string): AnimatedIcon {
  const { motion, ...data } = fromUnaSpec(spec, name);
  return createAnimatedIcon(data, motion);
}
