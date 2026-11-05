import { createElement, forwardRef } from 'react';
import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react';
import { useXymbolsContext } from './createIcon.js';
import { mergeClasses } from './generated/icon.js';
import { absoluteStroke, pickVariant, viewBoxOf, widthAt } from './generated/render.js';
import type { Fit, GlyphMeta, GlyphVariant, GlyphVariants } from './generated/types.js';
import { resolveStroke } from './generated/weights.js';
import type { Weight } from './generated/weights.js';

export interface GlyphProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  /** Height, and the width of a fixed glyph. Default 24. */
  size?: number | string;
  /**
   * `fixed` (default): the 24x24 square, showing a short form or symbol when
   * the full text does not fit; glyphs with no fixed form fall back to hug.
   * `hug`: as wide as the full text, which is always on one line.
   */
  fit?: Fit;
  /** Stroke colour. Default `currentColor`. */
  color?: string;
  /** Stroke width in grid units (1/24 of the height). Default 2; overrides `weight`. */
  strokeWidth?: number | string;
  /** One of nine weights, SF Symbols' names or 100 to 900. Default regular (2). */
  weight?: Weight;
  /** Keep the stroke `strokeWidth` pixels wide at any size. */
  absoluteStrokeWidth?: boolean;
  /**
   * Accessible name. With a title (or `aria-label`), the glyph is announced as
   * an image; without one it is `aria-hidden`, like a decorative icon. A tag
   * glyph usually stands in for text, so give it one unless a visible label sits
   * next to it.
   */
  title?: string;
}

export type GlyphComponent = ForwardRefExoticComponent<GlyphProps & RefAttributes<SVGSVGElement>> &
  GlyphVariants & { readonly meta: GlyphMeta };

export const defaultAttributes = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function createGlyph(meta: GlyphMeta, fixed: GlyphVariant | null, hug: GlyphVariant): GlyphComponent {
  const variants = { fixed, hug };
  const Glyph = forwardRef<SVGSVGElement, GlyphProps>(function Glyph({ size, fit = 'fixed', color, strokeWidth, weight, absoluteStrokeWidth, title, className, children, ...rest }, ref) {
    const context = useXymbolsContext();
    const v = pickVariant(variants, fit);
    const h = size ?? context.size ?? 24;
    const stroke = resolveStroke({ strokeWidth, weight }, context, v.maxStroke);
    const labelled = Boolean(title || rest['aria-label'] || rest['aria-labelledby']);
    return createElement(
      'svg',
      {
        ref,
        ...defaultAttributes,
        width: widthAt(h, v),
        height: h,
        viewBox: viewBoxOf(v),
        stroke: color ?? context.color ?? 'currentColor',
        strokeWidth: (absoluteStrokeWidth ?? context.absoluteStrokeWidth) ? absoluteStroke(stroke, h) : stroke,
        className: mergeClasses('xymbol', `xymbol-${meta.id}`, v === fixed ? null : 'xymbol-hug', context.className, className),
        ...(labelled ? { role: 'img' } : { 'aria-hidden': true }),
        ...rest,
      },
      title ? createElement('title', null, title) : null,
      ...v.node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs })),
      children,
    );
  });
  Glyph.displayName = meta.component;
  return Object.assign(Glyph, { meta, fixed, hug });
}
