/**
 * Icon rendering shared by every SDK (the build copies this file into each
 * package's src/generated/). It gives the same root attributes, classes and
 * children as Lucide's own builder, so a xymbols icon renders exactly as the
 * Lucide icon it replaces; `weight` is the one addition.
 */
import type { GlyphElement } from './types.js';

/** One child element of an icon: `['path', { d: '...' }]`, as in Lucide. */
export type IconNode = readonly GlyphElement[];

/** An icon as Lucide describes one, plus the heaviest stroke it takes (see weights.ts). */
export interface IconData {
  /** Kebab-case name, the class suffix: `house` gives `lucide-house`. */
  readonly name?: string;
  readonly node: IconNode;
  readonly aliases?: readonly string[];
  /** viewBox size. Default 24. */
  readonly size?: number;
  readonly maxStroke?: number;
}

/**
 * Vanilla icons are Lucide's plain node arrays. One that stops getting heavier
 * carries its limit as a property, which iterating the array never sees.
 */
export function withMaxStroke<T extends IconNode>(node: T, maxStroke: number): T & { readonly maxStroke: number } {
  return Object.assign(node, { maxStroke });
}

/** The heaviest stroke an icon takes: an IconData's `maxStroke`, or one carried by a vanilla node array. */
export const maxStrokeOf = (icon: IconData | IconNode): number | undefined => (icon as { maxStroke?: number }).maxStroke;

export const defaultAttributes = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const;

/** Lucide's class joining: drop empties and repeats, keep order. */
export function mergeClasses(...classes: readonly (string | false | null | undefined)[]): string {
  return classes
    .filter((c, i, all): c is string => Boolean(c) && (c as string).trim() !== '' && all.indexOf(c) === i)
    .join(' ')
    .trim();
}

/** Props that give an icon an accessible name or role, so it is not `aria-hidden`. */
export function hasA11yProp(props: Readonly<Record<string, unknown>>): boolean {
  for (const prop in props) if (prop.startsWith('aria-') || prop === 'role' || prop === 'title') return true;
  return false;
}

export interface BuildParams {
  color?: string | undefined;
  width?: number | string | undefined;
  height?: number | string | undefined;
  /** Already resolved from strokeWidth and weight (resolveStroke). */
  strokeWidth: number | string;
  absoluteStrokeWidth?: boolean | undefined;
  nonScalingStroke?: boolean | undefined;
  className?: string | undefined;
  hasA11yProp: boolean;
  /** Everything else the caller passed; spread last, so it wins. */
  attributes?: Readonly<Record<string, unknown>> | undefined;
}

/** How a framework spells SVG attributes: React wants `strokeWidth` and `className`. */
export type AttributeNames = Readonly<Partial<Record<string, string>>>;

export const REACT_ATTRIBUTE_NAMES: AttributeNames = {
  class: 'className',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'vector-effect': 'vectorEffect',
};

const defined = <T>(v: T | null | undefined): v is T => v !== null && v !== undefined;

/** Root attributes and children for an icon: Lucide's buildLucideIconNode, attribute for attribute. */
export function buildIcon(icon: IconData, params: BuildParams, names: AttributeNames = {}): [Record<string, unknown>, GlyphElement[]] {
  const name = (n: string) => names[n] ?? n;
  const box = icon.size ?? 24;
  const iconClasses = [...(icon.name ? [`lucide-${icon.name}`] : []), ...(icon.aliases ?? []).filter((a) => a.trim() !== '').map((a) => `lucide-${a}`)];
  const className = mergeClasses('lucide', ...iconClasses, ...(params.className?.split(' ').filter(Boolean) ?? []));
  const strokeWidth = params.absoluteStrokeWidth ? (Number(params.strokeWidth) * box) / Number(params.width ?? 24) : params.strokeWidth;

  const attrs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(defaultAttributes)) attrs[name(k)] = v;
  if (params.color) attrs[name('stroke')] = params.color;
  if (defined(params.width)) attrs[name('width')] = params.width;
  if (defined(params.height)) attrs[name('height')] = params.height;
  attrs[name('stroke-width')] = strokeWidth;
  if (className) attrs[name('class')] = className;
  attrs[name('viewBox')] = `0 0 ${box} ${box}`;
  if (!params.hasA11yProp) attrs[name('aria-hidden')] = 'true';
  Object.assign(attrs, params.attributes);

  const children = icon.node.map(([tag, a]): GlyphElement => [tag, params.nonScalingStroke ? { [name('vector-effect')]: 'non-scaling-stroke', ...a } : a]);
  return [attrs, children];
}
