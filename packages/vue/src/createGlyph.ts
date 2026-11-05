import { h } from 'vue';
import type { FunctionalComponent, PropType } from 'vue';
import { useXymbolsProps } from './createIcon.js';
import { absoluteStroke, pickVariant, viewBoxOf, widthAt } from './generated/render.js';
import type { Fit, GlyphMeta, GlyphVariant, GlyphVariants } from './generated/types.js';
import { resolveStroke } from './generated/weights.js';
import type { Weight } from './generated/weights.js';

export interface GlyphProps {
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
   * an image; without one it is `aria-hidden`, like a decorative icon.
   */
  title?: string;
}

export type GlyphComponent = FunctionalComponent<GlyphProps> & GlyphVariants & { readonly meta: GlyphMeta };

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

/** Declared so kebab-case attributes map to props and `absolute-stroke-width` casts to a boolean. */
export const glyphProps = {
  size: [Number, String] as PropType<number | string>,
  fit: String as PropType<Fit>,
  color: String,
  strokeWidth: [Number, String] as PropType<number | string>,
  weight: [String, Number] as PropType<Weight>,
  absoluteStrokeWidth: { type: Boolean, default: undefined },
  title: String,
};

export function createGlyph(meta: GlyphMeta, fixed: GlyphVariant | null, hug: GlyphVariant): GlyphComponent {
  const variants = { fixed, hug };
  // Undeclared attributes (class, style, aria-*, listeners) fall through to the <svg>.
  const Glyph: FunctionalComponent<GlyphProps> = (props, { attrs, slots }) => {
    const context = useXymbolsProps();
    const size = props.size ?? context.size ?? 24;
    const v = pickVariant(variants, props.fit);
    const stroke = resolveStroke({ strokeWidth: props.strokeWidth, weight: props.weight }, context, v.maxStroke);
    const labelled = Boolean(props.title || attrs['aria-label'] || attrs['aria-labelledby']);
    return h(
      'svg',
      {
        ...defaultAttributes,
        width: widthAt(size, v),
        height: size,
        viewBox: viewBoxOf(v),
        stroke: props.color ?? context.color ?? 'currentColor',
        'stroke-width': (props.absoluteStrokeWidth ?? context.absoluteStrokeWidth) ? absoluteStroke(stroke, size) : stroke,
        class: ['xymbol', `xymbol-${meta.id}`, v === fixed ? null : 'xymbol-hug', context.class],
        ...(labelled ? { role: 'img' } : { 'aria-hidden': 'true' }),
      },
      [props.title ? h('title', props.title) : null, ...v.node.map(([tag, a]) => h(tag, { ...a })), slots.default?.()],
    );
  };
  Glyph.props = glyphProps;
  Glyph.displayName = meta.component;
  return Object.assign(Glyph, { meta, fixed, hug });
}
