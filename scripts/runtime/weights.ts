/**
 * Weights, shared by every SDK (the build copies this file into each package's
 * src/generated/). A weight is a stroke width, named after SF Symbols' nine
 * weights or given as a CSS font-weight (100 to 900).
 *
 * Regular is Lucide's 2. Heavier weights eat into the air between strokes, so
 * each drawing carries `maxStroke`, the heaviest stroke that still leaves 1px
 * between separate strokes; a heavier weight stops there. Lighter weights
 * never clamp, and neither does an explicit `strokeWidth`.
 */

export const WEIGHTS = {
  ultralight: 1,
  thin: 1.25,
  light: 1.5,
  regular: 2,
  medium: 2.25,
  semibold: 2.5,
  bold: 2.75,
  heavy: 3,
  black: 3.25,
} as const;

export type WeightName = keyof typeof WEIGHTS;
export type Weight = WeightName | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

const NAMES = Object.keys(WEIGHTS) as WeightName[];

/** The stroke width of a weight, stopped at `maxStroke` when given. Unknown weights are regular. */
export function weightStroke(weight: Weight, maxStroke?: number): number {
  const name = typeof weight === 'number' ? NAMES[Math.round(weight / 100) - 1] : weight;
  const stroke: number = (name && WEIGHTS[name]) ?? WEIGHTS.regular;
  return maxStroke !== undefined && stroke > maxStroke ? maxStroke : stroke;
}

export interface StrokeInput {
  strokeWidth?: number | string | undefined;
  weight?: Weight | undefined;
}

/**
 * The stroke to draw with. A component's own `strokeWidth` or `weight` beats a
 * provider's; at either level, `strokeWidth` beats `weight`. Default 2.
 */
export function resolveStroke(own: StrokeInput, context: StrokeInput, maxStroke?: number): number | string {
  if (own.strokeWidth != null) return own.strokeWidth;
  if (own.weight != null) return weightStroke(own.weight, maxStroke);
  if (context.strokeWidth != null) return context.strokeWidth;
  if (context.weight != null) return weightStroke(context.weight, maxStroke);
  return WEIGHTS.regular;
}
