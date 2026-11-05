/**
 * xymbols without a framework.
 *
 * Icons: every Lucide icon as Lucide's node array, with the lucide package's
 * `createIcons` and `createElement`, so a page switches with one import change.
 * Glyphs: tagsets glyph data, SVG strings, DOM elements, and replacing
 * `<i data-tagset data-code>` placeholders. `toSvg` draws either, in any weight.
 */
import * as all from './generated/glyphs.js';
import { buildIcon, defaultAttributes, hasA11yProp, maxStrokeOf, mergeClasses } from './generated/icon.js';
import type { IconNode } from './generated/icon.js';
import { registry } from './generated/registry.js';
import type { TagsetId } from './generated/registry.js';
import { absoluteStroke, pickVariant, viewBoxOf, widthAt } from './generated/render.js';
import { normalizeCode, resolveName } from './generated/resolve.js';
import type { Fit, GlyphData, GlyphVariant } from './generated/types.js';
import { resolveStroke, weightStroke } from './generated/weights.js';
import type { Weight } from './generated/weights.js';

export * from './generated/glyphs.js';
export * from './generated/icons/index.js';
export * as icons from './generated/icons/index.js';
export { registry, tagsets } from './generated/registry.js';
export type { TagsetId } from './generated/registry.js';
export { absoluteStroke, defaultAttributes, normalizeCode, pickVariant, viewBoxOf, widthAt };
export { WEIGHTS, weightStroke } from './generated/weights.js';
export type { Weight, WeightName } from './generated/weights.js';
export type { IconData, IconNode } from './generated/icon.js';
export type { Fit, GlyphData, GlyphElement, GlyphMeta, GlyphNode, GlyphVariant, GlyphVariants, TagsetInfo } from './generated/types.js';

export const glyphs: Readonly<Record<string, GlyphData>> = all;

const SVG_NS = 'http://www.w3.org/2000/svg';
const isIcon = (x: IconNode | GlyphData): x is IconNode => Array.isArray(x);

export interface SvgOptions {
  /** Height, and the width of an icon or a fixed glyph. Default 24. */
  size?: number | string;
  /** Glyphs only: `fixed` (default; falls back to hug where there is no fixed form) or `hug`. */
  fit?: Fit;
  /** Stroke colour. Default `currentColor`. */
  color?: string;
  /** Stroke width in grid units (1/24 of the height). Default 2; overrides `weight`. */
  strokeWidth?: number | string;
  /** One of nine weights, SF Symbols' names or 100 to 900. Default regular (2). */
  weight?: Weight;
  /** Keep the stroke `strokeWidth` pixels wide at any size. */
  absoluteStrokeWidth?: boolean;
  /** Accessible name; without one the drawing is `aria-hidden`. */
  title?: string;
  /** Extra classes, after `lucide` (icons) or `xymbol xymbol-<id>` (glyphs). */
  class?: string;
  /** Any other attributes for the root. */
  attrs?: Readonly<Record<string, string | number>>;
}

/** The glyph for a code: `getGlyph('licenses', 'GPL-3.0-or-later')` is `LicenseGpl`. */
export function getGlyph(tagset: TagsetId, code: string | null | undefined): GlyphData | undefined {
  const name = resolveName(registry, tagset, code);
  return name ? glyphs[name] : undefined;
}

function glyphAttrs(glyph: GlyphData, v: GlyphVariant, o: SvgOptions): Record<string, string> {
  const size = o.size ?? 24;
  const sw = resolveStroke({ strokeWidth: o.strokeWidth, weight: o.weight }, {}, v.maxStroke);
  const out: Record<string, string> = {
    xmlns: SVG_NS,
    width: String(widthAt(size, v)),
    height: String(size),
    viewBox: viewBoxOf(v),
    fill: 'none',
    stroke: o.color ?? 'currentColor',
    'stroke-width': String(o.absoluteStrokeWidth ? absoluteStroke(sw, size) : sw),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: mergeClasses('xymbol', `xymbol-${glyph.id}`, v === glyph.fixed ? '' : 'xymbol-hug', o.class),
  };
  if (o.title || o.attrs?.['aria-label'] || o.attrs?.['aria-labelledby']) out.role = 'img';
  else out['aria-hidden'] = 'true';
  for (const [k, val] of Object.entries(o.attrs ?? {})) out[k] = String(val);
  return out;
}

function iconAttrs(icon: IconNode, o: SvgOptions): Record<string, string> {
  const size = o.size ?? 24;
  const attributes = { ...(o.title ? { role: 'img' } : {}), ...o.attrs };
  const [attrs] = buildIcon(
    { node: icon, ...(maxStrokeOf(icon) === undefined ? {} : { maxStroke: maxStrokeOf(icon)! }) },
    {
      color: o.color,
      width: size,
      height: size,
      strokeWidth: resolveStroke({ strokeWidth: o.strokeWidth, weight: o.weight }, {}, maxStrokeOf(icon)),
      absoluteStrokeWidth: o.absoluteStrokeWidth,
      className: o.class,
      hasA11yProp: Boolean(o.title) || hasA11yProp(attributes),
      attributes,
    },
  );
  return Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, String(v)]));
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attrText = (a: Readonly<Record<string, string | number>>) => Object.entries(a).map(([k, val]) => ` ${k}="${escape(String(val))}"`).join('');

/** An icon or glyph as an SVG string: `toSvg(House, { weight: 'bold' })`, `toSvg(LicenseMit, { fit: 'hug' })`. */
export function toSvg(drawing: IconNode | GlyphData, options: SvgOptions = {}): string {
  const [root, node] = isIcon(drawing) ? [iconAttrs(drawing, options), drawing] : ((v) => [glyphAttrs(drawing, v, options), v.node] as const)(pickVariant(drawing, options.fit));
  const title = options.title ? `<title>${escape(options.title)}</title>` : '';
  return `<svg${attrText(root)}>${title}${node.map(([tag, a]) => `<${tag}${attrText(a)}/>`).join('')}</svg>`;
}

function svgElement(doc: Document, root: Readonly<Record<string, string | number>>, node: IconNode, title?: string): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  for (const [k, val] of Object.entries(root)) if (k !== 'xmlns') svg.setAttribute(k, String(val));
  if (title) svg.appendChild(doc.createElementNS(SVG_NS, 'title')).textContent = title;
  for (const [tag, a] of node) {
    const child = svg.appendChild(doc.createElementNS(SVG_NS, tag));
    for (const [k, val] of Object.entries(a)) child.setAttribute(k, val);
  }
  return svg;
}

/**
 * A DOM element (browsers only).
 *
 * - `createElement(House, { stroke: 'red' })`: as the lucide package's, the
 *   second argument is raw attributes over Lucide's defaults.
 * - `createElement(LicenseMit, { fit: 'hug', weight: 'bold' })`: a glyph, with SvgOptions.
 */
export function createElement(icon: IconNode, attrs?: Readonly<Record<string, string | number>>, doc?: Document): SVGSVGElement;
export function createElement(glyph: GlyphData, options?: SvgOptions, doc?: Document): SVGSVGElement;
export function createElement(drawing: IconNode | GlyphData, second: Readonly<Record<string, string | number>> | SvgOptions = {}, doc: Document = document): SVGSVGElement {
  if (isIcon(drawing)) return svgElement(doc, { ...defaultAttributes, ...(second as Record<string, string | number>) }, drawing);
  const options = second as SvgOptions;
  const v = pickVariant(drawing, options.fit);
  return svgElement(doc, glyphAttrs(drawing, v, options), v.node, options.title);
}

const pascal = (s: string) => s.replace(/^([A-Z])|[\s-_]+(\w)/g, (_, p1?: string, p2?: string) => (p2 ? p2.toUpperCase() : (p1 ?? '').toLowerCase())).replace(/^./, (c) => c.toUpperCase());
const classList = (c: unknown): string[] => (typeof c === 'string' ? c.split(' ') : Array.isArray(c) ? c.map(String) : []);

export interface CreateIconsOptions {
  /** The icons to look up, by component name: `{ House, Menu }`, or `icons` for all of them. */
  icons: Readonly<Record<string, IconNode>>;
  /** The attribute naming the icon. Default `data-lucide`. */
  nameAttr?: string;
  /** Attributes for every icon (an element's own win). */
  attrs?: Readonly<Record<string, string | number | readonly string[]>>;
  /** A weight for every icon; an element's `data-weight` wins, and a `stroke-width` beats both. */
  weight?: Weight;
  /** Where to look. Default `document`. */
  root?: ParentNode;
  /** Also look inside `<template>` contents. */
  inTemplates?: boolean;
}

/**
 * Replace every `<i data-lucide="house">` in `root` with its icon, as the
 * lucide package's createIcons, plus `data-weight="bold"` (or the `weight`
 * option) for a weight.
 */
export function createIcons({ icons = {}, nameAttr = 'data-lucide', attrs = {}, weight, root = document, inTemplates }: CreateIconsOptions): void {
  if (!Object.values(icons).length) throw new Error("Please provide an icons object: `createIcons({ icons })`, with `import { createIcons, icons } from 'xymbols'` for all of them.");
  for (const element of Array.from(root.querySelectorAll(`[${nameAttr}]`))) {
    const name = element.getAttribute(nameAttr);
    if (name == null) continue;
    const icon = icons[pascal(name)];
    if (!icon) {
      console.warn(`${element.outerHTML} icon name was not found in the provided icons object.`);
      continue;
    }
    const own = Object.fromEntries(Array.from(element.attributes).map((a) => [a.name, a.value]));
    const chosen = (own['data-weight'] as Weight | undefined) ?? weight;
    const stroke = chosen != null && own['stroke-width'] == null && attrs['stroke-width'] == null ? { 'stroke-width': weightStroke(Number.isNaN(Number(chosen)) ? chosen : (Number(chosen) as Weight), maxStrokeOf(icon)) } : {};
    const merged: Record<string, string | number> = {
      ...defaultAttributes,
      'data-lucide': name,
      ...(hasA11yProp(own) ? {} : { 'aria-hidden': 'true' }),
      ...stroke,
      ...(attrs as Record<string, string | number>),
      ...own,
    };
    const classes = mergeClasses('lucide', `lucide-${name}`, ...classList(own.class), ...classList(attrs.class));
    if (classes) merged.class = classes;
    element.parentNode?.replaceChild(svgElement(element.ownerDocument, merged, icon), element);
  }
  if (inTemplates) {
    for (const template of Array.from(root.querySelectorAll('template'))) createIcons({ icons, nameAttr, attrs, ...(weight ? { weight } : {}), root: template.content, inTemplates });
  }
}

export interface ReplaceOptions extends Omit<SvgOptions, 'title'> {
  /** Where to look. Default `document`. */
  root?: ParentNode;
}

/**
 * Replace every `<i data-tagset="licenses" data-code="MIT">` in `root` with its
 * glyph. The placeholder's classes carry over; `data-size`, `data-fit`,
 * `data-color`, `data-stroke-width` and `data-weight` override the options;
 * the title is the glyph's label unless the placeholder has `data-title`
 * (empty for decorative). Placeholders with no matching glyph are left in
 * place. Returns how many were replaced.
 */
export function replaceElements(options: ReplaceOptions = {}): number {
  const { root = document, ...base } = options;
  let n = 0;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-tagset][data-code]'))) {
    const glyph = getGlyph(el.dataset.tagset as TagsetId, el.dataset.code);
    if (!glyph) continue;
    const weight = el.dataset.weight ?? base.weight;
    const svg = createElement(
      glyph,
      {
        ...base,
        size: el.dataset.size ?? base.size,
        fit: (el.dataset.fit as Fit | undefined) ?? base.fit,
        color: el.dataset.color ?? base.color,
        strokeWidth: el.dataset.strokeWidth ?? base.strokeWidth,
        ...(weight == null ? {} : { weight: (Number.isNaN(Number(weight)) ? weight : Number(weight)) as Weight }),
        title: el.dataset.title ?? glyph.label,
        class: [base.class, el.getAttribute('class')].filter(Boolean).join(' ') || undefined,
      },
      el.ownerDocument,
    );
    el.replaceWith(svg);
    n++;
  }
  return n;
}
