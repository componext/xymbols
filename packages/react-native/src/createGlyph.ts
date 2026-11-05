import { createElement, forwardRef } from 'react';
import type { ComponentType, ForwardRefExoticComponent, RefAttributes } from 'react';
import * as NativeSvg from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
import { useXymbolsContext } from './createIcon.js';
import { absoluteStroke, pickVariant, viewBoxOf, widthAt } from './generated/render.js';
import type { Fit, GlyphMeta, GlyphVariant, GlyphVariants } from './generated/types.js';
import { resolveStroke } from './generated/weights.js';
import type { Weight } from './generated/weights.js';

export interface GlyphProps extends Omit<SvgProps, 'width' | 'height'> {
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
  /** Accessible name. With one, the glyph is announced as an image; without one it is hidden from screen readers. */
  title?: string;
}

export type GlyphComponent = ForwardRefExoticComponent<GlyphProps & RefAttributes<NativeSvg.Svg>> & GlyphVariants & { readonly meta: GlyphMeta };

const SHAPES = NativeSvg as unknown as Record<string, ComponentType<Record<string, unknown>>>;
const shape = (tag: string) => SHAPES[tag.charAt(0).toUpperCase() + tag.slice(1)]!;

export function createGlyph(meta: GlyphMeta, fixed: GlyphVariant | null, hug: GlyphVariant): GlyphComponent {
  const variants = { fixed, hug };
  const Glyph = forwardRef<NativeSvg.Svg, GlyphProps>(function Glyph({ size, fit = 'fixed', color, strokeWidth, weight, absoluteStrokeWidth, title, children, ...rest }, ref) {
    const context = useXymbolsContext();
    const v = pickVariant(variants, fit);
    const h = size ?? context.size ?? 24;
    const resolved = resolveStroke({ strokeWidth, weight }, context, v.maxStroke);
    const stroke = {
      fill: 'none',
      stroke: color ?? context.color ?? 'currentColor',
      strokeWidth: (absoluteStrokeWidth ?? context.absoluteStrokeWidth) ? absoluteStroke(resolved, h) : resolved,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    } as const;
    return createElement(
      NativeSvg.Svg,
      {
        ref,
        width: widthAt(h, v),
        height: h,
        viewBox: viewBoxOf(v),
        ...stroke,
        ...(title ? { accessible: true, accessibilityRole: 'image', accessibilityLabel: title } : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' }),
        ...rest,
      },
      ...v.node.map(([tag, attrs], i) => createElement(shape(tag), { key: i, ...stroke, ...attrs })),
      children,
    );
  });
  Glyph.displayName = meta.component;
  return Object.assign(Glyph, { meta, fixed, hug });
}
