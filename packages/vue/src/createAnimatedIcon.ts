import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { DefineComponent, PropType, VNode } from 'vue';
import { useXymbolsProps } from './createIcon.js';
import type { LucideProps } from './createIcon.js';
import { animate } from './generated/animate.js';
import type { AnimationController, Trigger } from './generated/animate.js';
import { buildIcon, hasA11yProp } from './generated/icon.js';
import type { IconData } from './generated/icon.js';
import { animatedTree, fromUnaSpec } from './generated/motion.js';
import type { AnimatedIconData, Motion, Scenes, Tree, UnaSpec } from './generated/motion.js';
import { resolveStroke } from './generated/weights.js';
import type { Weight } from './generated/weights.js';

/** What a template ref to an animated icon exposes: lucide-animated's handle, plus xymbols' named effects. */
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
  /** What plays it: `hover` (default), `group-hover`, `active`, `mount`, `loop` or `manual`, or several. */
  trigger?: Trigger | Trigger[];
  /** The active state: UNA's 20% duotone fill and active shapes. */
  active?: boolean;
  /** The row a `group-hover` icon listens to. Default `.group`. */
  group?: string;
  scenes?: Scenes;
  /** lucide-animated's switch: false plays only through the ref. */
  animateOnHover?: boolean;
}

export type AnimatedIcon = DefineComponent<AnimatedIconProps>;

const toVue = ([tag, attrs, children]: Tree): VNode => h(tag, attrs, (children ?? []).map(toVue));
const on = (...values: unknown[]) => values.some((v) => v === true || v === '');

/** An animated icon component from icon data and its motion (or none: it then takes the generic effects). */
export function createAnimatedIcon(iconData: IconData, motion?: Motion): AnimatedIcon {
  const icon: AnimatedIconData = motion ? { ...iconData, motion } : iconData;
  return defineComponent({
    name: icon.name ? icon.name.replace(/(^|-)([a-z0-9])/g, (_, _d: string, c: string) => c.toUpperCase()) : 'AnimatedIcon',
    inheritAttrs: false,
    props: {
      effect: String,
      trigger: [String, Array] as PropType<Trigger | Trigger[]>,
      active: { type: Boolean, default: undefined },
      group: String,
      scenes: Object as PropType<Scenes>,
      animateOnHover: { type: Boolean, default: undefined },
      size: [Number, String],
      weight: [String, Number] as PropType<Weight>,
      color: String,
      strokeWidth: [Number, String],
      absoluteStrokeWidth: { type: Boolean, default: undefined },
      nonScalingStroke: { type: Boolean, default: undefined },
    },
    setup(props, { attrs, slots, expose }) {
      const context = useXymbolsProps();
      const svg = ref<SVGSVGElement | null>(null);
      let controller: AnimationController | null = null;
      const bind = () => {
        controller?.destroy();
        if (!svg.value) return;
        controller = animate(svg.value, icon, {
          ...(props.effect ? { effect: props.effect } : {}),
          trigger: props.animateOnHover === false ? 'manual' : (props.trigger ?? 'hover'),
          active: !!props.active,
          ...(props.group ? { group: props.group } : {}),
          ...(props.scenes?.motion === false ? { motion: false } : {}),
        });
      };
      onMounted(bind);
      onBeforeUnmount(() => controller?.destroy());
      watch(() => [props.effect, props.trigger, props.group, props.animateOnHover, props.scenes?.motion], bind);
      watch(
        () => props.active,
        (a) => controller?.setActive(!!a),
      );
      const handle: AnimatedIconHandle = {
        play: (e) => controller?.play(e),
        stop: () => controller?.stop(),
        once: (e) => controller?.once(e),
        startAnimation: () => controller?.play(),
        stopAnimation: () => controller?.stop(),
      };
      expose(handle);
      return () => {
        const rest = { ...attrs } as Record<string, unknown>;
        const strokeWidthKebab = rest['stroke-width'];
        const absKebab = rest['absolute-stroke-width'];
        const nonKebab = rest['non-scaling-stroke'];
        delete rest['stroke-width'];
        delete rest['absolute-stroke-width'];
        delete rest['non-scaling-stroke'];
        const children = slots.default?.();
        const [svgAttrs, nodes] = buildIcon(icon, {
          color: props.color ?? context.color,
          width: (rest.width as string | number | undefined) ?? props.size ?? context.size,
          height: (rest.height as string | number | undefined) ?? props.size ?? context.size,
          strokeWidth: resolveStroke({ strokeWidth: props.strokeWidth ?? (strokeWidthKebab as number | string | undefined), weight: props.weight }, context, icon.maxStroke),
          absoluteStrokeWidth: on(props.absoluteStrokeWidth, absKebab, context.absoluteStrokeWidth),
          nonScalingStroke: on(props.nonScalingStroke, nonKebab, context.nonScalingStroke),
          className: [context.class, rest.class as string | undefined].filter(Boolean).join(' '),
          hasA11yProp: (children != null && children.length > 0) || hasA11yProp(rest),
          attributes: Object.fromEntries(Object.entries(rest).filter(([k]) => k !== 'class')),
        });
        return h(
          'svg',
          { ...svgAttrs, ref: svg, 'data-xa': '', 'data-active': props.active ? '' : undefined, 'data-still': icon.motion?.still ? '' : undefined },
          [toVue(animatedTree(nodes, icon.motion, props.scenes)), ...(children ?? [])],
        );
      };
    },
  }) as unknown as AnimatedIcon;
}

/** An animated icon from a UNA spec object as UNA forks write them. */
export function createUnaIcon(spec: UnaSpec, name?: string): AnimatedIcon {
  const { motion, ...data } = fromUnaSpec(spec, name);
  return createAnimatedIcon(data, motion);
}
