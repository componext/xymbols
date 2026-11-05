import { createContext, createElement, forwardRef, useContext, useMemo } from 'react';
import type { ForwardRefExoticComponent, ReactNode, RefAttributes, SVGProps } from 'react';
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

/** lucide-react's names for the same provider, so a Lucide app switches with one import change. */
export const LucideProvider = XymbolsProvider;
export const useLucideContext = useXymbolsContext;

export interface LucideProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  /** Width and height. Default 24. */
  size?: number | string;
  /** One of nine weights, SF Symbols' names or 100 to 900. Ignored when `strokeWidth` is set. Default regular (2). */
  weight?: Weight;
  /** Keep the stroke `strokeWidth` pixels wide at any size. */
  absoluteStrokeWidth?: boolean;
  /** `vector-effect: non-scaling-stroke` on every shape. */
  nonScalingStroke?: boolean;
}

export type XymbolProps = LucideProps;
export type LucideIcon = ForwardRefExoticComponent<LucideProps & RefAttributes<SVGSVGElement>>;

export interface IconProps extends LucideProps {
  /** Draw any node data, Lucide Lab's included: `<Icon iconNode={burger} />`. */
  iconNode?: IconNode;
  icon?: IconData;
}

/** Draws one icon. Every exported icon is this component with its data bound. */
export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { color, size, width, height, strokeWidth, weight, absoluteStrokeWidth, nonScalingStroke, className = '', children, iconNode = [], icon = { node: iconNode, aliases: [], size: 24 }, ...rest },
  ref,
) {
  const context = useContext(XymbolsContext);
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
  return createElement('svg', { ref, ...attrs }, ...nodes.map(([tag, a], i) => createElement(tag, { key: i, ...a })), children);
});

const pascal = (s: string) => s.replace(/^([A-Z])|[\s-_]+(\w)/g, (_, p1?: string, p2?: string) => (p2 ? p2.toUpperCase() : (p1 ?? '').toLowerCase())).replace(/^./, (c) => c.toUpperCase());
const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** An icon component from node data, as lucide-react's: `createLucideIcon('Burger', burgerNode)` or `createLucideIcon(iconData)`. */
export function createLucideIcon(iconDataOrName: IconData | string, iconNode: IconNode = [], aliases: readonly string[] = []): LucideIcon {
  const icon: IconData = typeof iconDataOrName === 'string' ? { name: kebab(iconDataOrName), size: 24, node: iconNode, ...(aliases.length ? { aliases } : {}) } : iconDataOrName;
  const Component = forwardRef<SVGSVGElement, LucideProps>(function Component({ className, ...props }, ref) {
    return createElement(Icon, { ref, icon, className, ...props });
  });
  if (icon.name) Component.displayName = pascal(icon.name);
  return Component;
}
