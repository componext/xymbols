import { h, inject, provide } from 'vue';
import type { FunctionalComponent, InjectionKey, SVGAttributes } from 'vue';
import { buildIcon, hasA11yProp } from './generated/icon.js';
import type { IconData, IconNode } from './generated/icon.js';
import { resolveStroke } from './generated/weights.js';
import type { Weight } from './generated/weights.js';

/** Defaults for every icon and glyph below a component that calls setXymbolsProps. */
export interface XymbolsConfig {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  weight?: Weight;
  absoluteStrokeWidth?: boolean;
  nonScalingStroke?: boolean;
  class?: string;
}

export const XYMBOLS_CONTEXT: InjectionKey<XymbolsConfig> = /* @__PURE__ */ Symbol('xymbols');

/** Set defaults for the icons and glyphs in this component's subtree. Call it in `setup`. */
export const setXymbolsProps = (props: XymbolsConfig) => provide(XYMBOLS_CONTEXT, props);
export const useXymbolsProps = (): XymbolsConfig => inject(XYMBOLS_CONTEXT, {});

/** @lucide/vue's names for the same context, so a Lucide app switches with one import change. */
export const LUCIDE_CONTEXT = XYMBOLS_CONTEXT;
export const setLucideProps = setXymbolsProps;
export const useLucideProps = useXymbolsProps;

export interface LucideProps extends Partial<SVGAttributes> {
  size?: number | string;
  /** One of nine weights, SF Symbols' names or 100 to 900. Ignored when `stroke-width` is set. Default regular (2). */
  weight?: Weight;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  'absolute-stroke-width'?: boolean;
  nonScalingStroke?: boolean;
  'non-scaling-stroke'?: boolean;
}

export type XymbolProps = LucideProps;
export type LucideIcon = FunctionalComponent<LucideProps>;

export interface IconProps extends LucideProps {
  name?: string;
  /** Draw any node data, Lucide Lab's included: `<Icon :icon-node="burger" />`. */
  iconNode?: IconNode;
  'icon-node'?: IconNode;
  icon?: IconData;
}

/** A boolean attribute written bare (`<House absolute-stroke-width />`) arrives as an empty string. */
const on = (...values: unknown[]) => values.some((v) => v === true || v === '');
const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * Draws one icon; every exported icon is this component with its data bound.
 * Like @lucide/vue's it declares no props, so class, style and listeners fall
 * through to the `<svg>`.
 */
export const Icon: FunctionalComponent<IconProps> = (allProps, { slots }) => {
  const {
    name,
    iconNode,
    'icon-node': iconNodeKebab,
    icon = { ...(name ? { name: kebab(name) } : {}), node: iconNode ?? iconNodeKebab ?? [], size: 24, aliases: [] },
    absoluteStrokeWidth,
    'absolute-stroke-width': absoluteStrokeWidthKebab,
    nonScalingStroke,
    'non-scaling-stroke': nonScalingStrokeKebab,
    strokeWidth,
    'stroke-width': strokeWidthKebab,
    weight,
    size,
    width = size,
    height = size,
    color,
    ...props
  } = allProps as IconProps & Record<string, unknown>;
  const context = useXymbolsProps();
  delete props.class;
  const children = slots.default?.();
  const [attrs, nodes] = buildIcon(icon, {
    color: color ?? context.color,
    width: width ?? size ?? context.size,
    height: height ?? size ?? context.size,
    strokeWidth: resolveStroke({ strokeWidth: strokeWidth ?? (strokeWidthKebab as number | string | undefined), weight }, context, icon.maxStroke),
    absoluteStrokeWidth: on(absoluteStrokeWidth, absoluteStrokeWidthKebab, context.absoluteStrokeWidth),
    nonScalingStroke: on(nonScalingStroke, nonScalingStrokeKebab, context.nonScalingStroke),
    className: context.class,
    hasA11yProp: (children != null && children.length > 0) || hasA11yProp(props),
    attributes: props,
  });
  return h('svg', attrs, [...nodes.map(([tag, a]) => h(tag, a)), ...(children ?? [])]);
};

/** An icon component from node data, as @lucide/vue's: `createLucideIcon('burger', burgerNode)` or `createLucideIcon(iconData)`. */
export function createLucideIcon(iconDataOrName: IconData | string, iconNode: IconNode = []): LucideIcon {
  const icon: IconData = typeof iconDataOrName === 'string' ? { name: iconDataOrName, node: iconNode } : iconDataOrName;
  return (props, { slots }) => h(Icon, { ...props, icon }, slots.default ? { default: slots.default } : undefined);
}
