/**
 * xymbols/animated: every icon's animation data, and the web engine that plays it, for pages without a
 * framework. Each icon takes its own animation (from UNA or lucide-animated, mapped onto Lucide's current
 * drawing) as `effect: 'auto'`, and the generic effects every icon takes.
 *
 *   import { animateIcons, icons } from 'xymbols/animated';
 *   animateIcons({ icons });   // every <i data-lucide="bell" data-effect="bounce" data-trigger="group-hover">
 *
 *   const { element, controller } = createAnimatedElement(Bell, { trigger: 'manual' });
 *   controller.play();
 */
import { animate } from './generated/animate.js';
import type { AnimateOptions, AnimationController, Trigger } from './generated/animate.js';
import { buildIcon, hasA11yProp, mergeClasses } from './generated/icon.js';
import { animatedTree } from './generated/motion.js';
import type { AnimatedIconData, Scenes, Tree } from './generated/motion.js';
import { resolveStroke } from './generated/weights.js';
import type { Weight } from './generated/weights.js';

export * from './generated/animated/index.js';
export * as icons from './generated/animated/index.js';
export { animate, cssEase, frame, keyframesOf } from './generated/animate.js';
export type { AnimateOptions, AnimationController, Trigger } from './generated/animate.js';
export { ANIMATE_CSS, ensureAnimateStyles } from './generated/styles.js';
export { EFFECTS, EFFECT_NAMES, animatedTree, fromUnaSpec } from './generated/motion.js';
export type { AnimatedIconData, Effect, GenericEffect, Motion, Part, Scenes, Track, Tree, UnaSpec } from './generated/motion.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface AnimatedSvgOptions extends AnimateOptions {
  size?: number | string;
  color?: string;
  weight?: Weight;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
  class?: string;
  scenes?: Scenes;
  /** More attributes for the `<svg>`. */
  attrs?: Readonly<Record<string, string | number>>;
}

function rootAndTree(icon: AnimatedIconData, o: AnimatedSvgOptions): [Record<string, string>, Tree] {
  const [attrs, nodes] = buildIcon(icon, {
    color: o.color ?? 'currentColor',
    width: o.size ?? 24,
    height: o.size ?? 24,
    strokeWidth: resolveStroke({ strokeWidth: o.strokeWidth, weight: o.weight }, {}, icon.maxStroke),
    absoluteStrokeWidth: o.absoluteStrokeWidth ?? false,
    className: mergeClasses(o.class),
    hasA11yProp: hasA11yProp(o.attrs ?? {}),
    attributes: o.attrs,
  });
  const root = Object.fromEntries(Object.entries({ ...attrs, 'data-xa': '', ...(o.active ? { 'data-active': '' } : {}), ...(icon.motion?.still ? { 'data-still': '' } : {}) }).map(([k, v]) => [k, String(v)]));
  return [root, animatedTree(nodes, icon.motion, o.scenes)];
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attrText = (a: Readonly<Record<string, string>>) => Object.entries(a).map(([k, v]) => ` ${k}="${escape(v)}"`).join('');
const treeText = ([tag, a, children]: Tree): string => (children?.length ? `<${tag}${attrText(a)}>${children.map(treeText).join('')}</${tag}>` : `<${tag}${attrText(a)}/>`);

/** An animated icon as an SVG string, for server rendering; `animate()` it once it's in the page. */
export function animatedSvg(icon: AnimatedIconData, options: AnimatedSvgOptions = {}): string {
  const [root, tree] = rootAndTree(icon, options);
  return `<svg${attrText(Object.fromEntries(Object.entries(root).filter(([k]) => k !== 'xmlns').concat([['xmlns', SVG_NS]])))}>${treeText(tree)}</svg>`;
}

function treeElement(doc: Document, [tag, a, children]: Tree): SVGElement {
  const el = doc.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(a)) el.setAttribute(k, v);
  for (const c of children ?? []) el.appendChild(treeElement(doc, c));
  return el;
}

/** An animated icon as a DOM element, already bound to its triggers (browsers only). */
export function createAnimatedElement(icon: AnimatedIconData, options: AnimatedSvgOptions = {}, doc: Document = document): { element: SVGSVGElement; controller: AnimationController } {
  const [root, tree] = rootAndTree(icon, options);
  const element = doc.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries(root)) if (k !== 'xmlns') element.setAttribute(k, v);
  element.appendChild(treeElement(doc, tree));
  return { element, controller: animate(element, icon, options) };
}

export interface AnimateIconsOptions extends AnimatedSvgOptions {
  /** The icons to look up, by component name: `{ Bell, Menu }`, or `icons` for all of them. */
  icons: Readonly<Record<string, AnimatedIconData>>;
  /** The attribute naming the icon. Default `data-lucide`. */
  nameAttr?: string;
  /** Where to look. Default `document`. */
  root?: ParentNode;
}

const pascal = (s: string) => s.replace(/(^|-)([a-z0-9])/g, (_, _d: string, c: string) => c.toUpperCase());

/**
 * Replace every `<i data-lucide="bell">` in `root` with its animated icon, bound to its triggers. An
 * element's `data-effect`, `data-trigger` (space-separated), `data-weight`, `data-active` and classes win
 * over the options. Returns each icon's controller.
 */
export function animateIcons({ icons, nameAttr = 'data-lucide', root = document, ...options }: AnimateIconsOptions): AnimationController[] {
  const out: AnimationController[] = [];
  for (const placeholder of Array.from(root.querySelectorAll(`[${nameAttr}]`))) {
    const name = placeholder.getAttribute(nameAttr);
    const icon = name ? icons[pascal(name)] : undefined;
    if (!icon) {
      console.warn(`${placeholder.outerHTML} icon name was not found in the provided icons object.`);
      continue;
    }
    const data = (k: string) => placeholder.getAttribute(`data-${k}`) ?? undefined;
    const trigger = data('trigger')?.split(/\s+/) as Trigger[] | undefined;
    const weight = data('weight');
    const { element, controller } = createAnimatedElement(
      icon,
      {
        ...options,
        ...(data('effect') ? { effect: data('effect')! } : {}),
        ...(trigger ? { trigger } : {}),
        ...(weight ? { weight: (Number.isNaN(Number(weight)) ? weight : Number(weight)) as Weight } : {}),
        ...(placeholder.hasAttribute('data-active') ? { active: true } : {}),
        class: mergeClasses(options.class, placeholder.getAttribute('class') ?? undefined),
      },
      placeholder.ownerDocument,
    );
    element.setAttribute(nameAttr, name!);
    placeholder.parentNode?.replaceChild(element, placeholder);
    out.push(controller);
  }
  return out;
}
