import { createContext, createElement, forwardRef, useContext, useMemo } from 'react';
import type { ComponentType, ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import * as NativeSvg from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
import { REACT_ATTRIBUTE_NAMES, buildIcon, hasA11yProp, mergeClasses } from './generated/icon.js';
import type { IconData, IconNode } from './generated/icon.js';
import { resolveStroke } from './generated/weights.js';
import type { Weight } from './generated/weights.js';

/** Defaults for every icon and glyph below a provider. */
export interface XymbolsConfig {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  weight?: Weight;
  absoluteStrokeWidth?: boolean;
  nonScalingStroke?: boolean;
  className?: string;
}

const XymbolsContext = createContext<XymbolsConfig>({});

/** Set defaults for every icon and glyph inside: `<XymbolsProvider weight="semibold" size={20}>`. */
export function XymbolsProvider({ children, size, color, strokeWidth, weight, absoluteStrokeWidth, nonScalingStroke, className }: XymbolsConfig & { children?: ReactNode }) {
  const value = useMemo(
    () => ({ size, color, strokeWidth, weight, absoluteStrokeWidth, nonScalingStroke, className }),
    [size, color, strokeWidth, weight, absoluteStrokeWidth, nonScalingStroke, className],
  );
  return createElement(XymbolsContext.Provider, { value }, children);
}

export const useXymbolsContext = (): XymbolsConfig => useContext(XymbolsContext);

/** lucide-react-native's names for the same provider, so a Lucide app switches with one import change. */
export const LucideProvider = XymbolsProvider;
export const useLucideContext = useXymbolsContext;

export interface LucideProps extends SvgProps {
  size?: string | number;
  width?: string | number;
  height?: string | number;
  className?: string;
  /** One of nine weights, SF Symbols' names or 100 to 900. Ignored when `strokeWidth` is set. Default regular (2). */
  weight?: Weight;
  /** Keep the stroke `strokeWidth` pixels wide at any size. */
  absoluteStrokeWidth?: boolean;
  /** `vectorEffect: non-scaling-stroke` on every shape. */
  nonScalingStroke?: boolean;
  'data-testid'?: string;
}

export type XymbolProps = LucideProps;
export type LucideIcon = ForwardRefExoticComponent<LucideProps & RefAttributes<NativeSvg.Svg>>;

export interface IconProps extends LucideProps {
  /** Draw any node data, Lucide Lab's included: `<Icon iconNode={burger} />`. */
  iconNode?: IconNode;
  icon?: IconData;
}

/** react-native-svg spells attributes in camelCase, except data-* and aria-*. */
const nativeName = (name: string) => (name === 'class' ? 'className' : name.startsWith('data-') || name.startsWith('aria-') ? name : name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()));
const native = (attrs: Readonly<Record<string, unknown>>) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) out[nativeName(k)] = v;
  return out;
};

const SHAPES = NativeSvg as unknown as Record<string, ComponentType<Record<string, unknown>>>;
const shape = (tag: string) => SHAPES[tag.charAt(0).toUpperCase() + tag.slice(1)]!;
const CHILD_DEFAULTS = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/**
 * Draws one icon with react-native-svg. Every exported icon is this component
 * with its data bound. As in lucide-react-native, each shape repeats the
 * root's stroke attributes, since react-native-svg does not always inherit them.
 */
export const Icon = forwardRef<NativeSvg.Svg, IconProps>(function Icon(
  { color, size, width = size, height = size, strokeWidth, weight, absoluteStrokeWidth, nonScalingStroke, children, iconNode = [], icon = { node: iconNode, size: 24 }, className, testID, ...rest },
  ref,
) {
  const context = useContext(XymbolsContext);
  const [attrs, nodes] = buildIcon(
    icon,
    {
      // A ColorValue goes onto `stroke` as it is; the builder only passes it along.
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
  return createElement(
    NativeSvg.Svg,
    { ref, ...native(attrs), testID, ...rest },
    ...nodes.map(([tag, a], i) => createElement(shape(tag), { key: i, ...native({ ...CHILD_DEFAULTS, ...stroke, ...a }) })),
    children,
  );
});

const pascal = (s: string) => s.replace(/^([A-Z])|[\s-_]+(\w)/g, (_, p1?: string, p2?: string) => (p2 ? p2.toUpperCase() : (p1 ?? '').toLowerCase())).replace(/^./, (c) => c.toUpperCase());
const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** An icon component from node data, as lucide-react-native's. */
export function createLucideIcon(iconDataOrName: IconData | string, iconNode: IconNode = [], aliases: readonly string[] = []): LucideIcon {
  const icon: IconData = typeof iconDataOrName === 'string' ? { name: kebab(iconDataOrName), size: 24, node: iconNode, ...(aliases.length ? { aliases } : {}) } : iconDataOrName;
  const Component = forwardRef<NativeSvg.Svg, LucideProps>(function Component(props, ref) {
    return createElement(Icon, { ref, icon, ...props });
  });
  if (icon.name) Component.displayName = pascal(icon.name);
  return Component;
}
