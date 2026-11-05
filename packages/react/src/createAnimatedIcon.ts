import { createElement, forwardRef, useContext, useEffect, useImperativeHandle, useRef } from 'react';
import type { ForwardRefExoticComponent, ReactElement, RefAttributes } from 'react';
import { XymbolsContext } from './createIcon.js';
import type { LucideProps } from './createIcon.js';
import { animate } from './generated/animate.js';
import type { AnimationController, Trigger } from './generated/animate.js';
import { REACT_ATTRIBUTE_NAMES, buildIcon, hasA11yProp, mergeClasses } from './generated/icon.js';
import type { IconData } from './generated/icon.js';
import { animatedTree, fromUnaSpec } from './generated/motion.js';
import type { AnimatedIconData, Motion, Scenes, Tree, UnaSpec } from './generated/motion.js';
import { resolveStroke } from './generated/weights.js';

/** What a ref to an animated icon gets: lucide-animated's handle, plus xymbols' named effects. */
export interface AnimatedIconHandle {
  /** Play an effect (default the icon's own); held tracks hold until `stop`. */
  play(effect?: string): void;
  /** Send held tracks back to rest. */
  stop(): void;
  /** Play an effect once, there and back. */
  once(effect?: string): void;
  /** lucide-animated's names for `play()` and `stop()`. */
  startAnimation(): void;
  stopAnimation(): void;
  readonly element: SVGSVGElement | null;
}

export interface AnimatedIconProps extends LucideProps {
  /** `auto` (the icon's own animation, else a wiggle) or a generic effect: `bounce`, `pulse`, `wiggle`, ... */
  effect?: string;
  /** What plays it: `hover` (default), `group-hover`, `active`, `mount`, `loop` or `manual`, or several. */
  trigger?: Trigger | readonly Trigger[];
  /** The active state: UNA's 20% duotone fill and active shapes (Menu becomes an X). */
  active?: boolean;
  /** The row a `group-hover` icon listens to. Default `.group`. */
  group?: string;
  /** Turn the active fill or the movement off. */
  scenes?: Scenes;
  /** lucide-animated's switch: false plays only through the ref. */
  animateOnHover?: boolean;
}

export type AnimatedIcon = ForwardRefExoticComponent<AnimatedIconProps & RefAttributes<AnimatedIconHandle>>;

const NAMES: Readonly<Record<string, string>> = { ...REACT_ATTRIBUTE_NAMES, 'fill-opacity': 'fillOpacity' } as Record<string, string>;

function toReact([tag, attrs, children]: Tree, key?: number): ReactElement {
  const props: Record<string, unknown> = key === undefined ? {} : { key };
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style') {
      props.style = Object.fromEntries(
        v
          .split(';')
          .filter((d) => d.includes(':'))
          .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()]),
      );
    } else props[NAMES[k] ?? k] = v;
  }
  return createElement(tag, props, ...(children ?? []).map((c, i) => toReact(c, i)));
}

/** Draws one animated icon; every icon in `xymbols-react/animated` is this with its data bound. */
export const AnimatedIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps & { icon: AnimatedIconData }>(function AnimatedIcon(
  { icon, effect, trigger, active, group, scenes, animateOnHover, color, size, width, height, strokeWidth, weight, absoluteStrokeWidth, nonScalingStroke, className = '', children, ...rest },
  ref,
) {
  const context = useContext(XymbolsContext);
  const svg = useRef<SVGSVGElement>(null);
  const controller = useRef<AnimationController | null>(null);
  const [attrs, nodes] = buildIcon(
    icon,
    {
      color: color ?? context.color ?? 'currentColor',
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
  const triggers = animateOnHover === false ? 'manual' : trigger;
  const binding = JSON.stringify([effect, triggers, group, scenes?.motion]);

  useEffect(() => {
    if (!svg.current) return;
    const c = animate(svg.current, icon, { effect, trigger: triggers, active, group, motion: scenes?.motion });
    controller.current = c;
    return () => {
      c.destroy();
      controller.current = null;
    };
    // `active` changes reach the controller below; rebinding is only for what the triggers are.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icon, binding]);
  useEffect(() => controller.current?.setActive(!!active), [active]);
  useImperativeHandle(
    ref,
    () => ({
      play: (e?: string) => controller.current?.play(e),
      stop: () => controller.current?.stop(),
      once: (e?: string) => controller.current?.once(e),
      startAnimation: () => controller.current?.play(),
      stopAnimation: () => controller.current?.stop(),
      get element() {
        return svg.current;
      },
    }),
    [],
  );

  return createElement(
    'svg',
    { ...attrs, ref: svg, 'data-xa': '', 'data-active': active ? '' : undefined, 'data-still': icon.motion?.still ? '' : undefined },
    toReact(animatedTree(nodes, icon.motion, scenes)),
    children,
  );
});

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
