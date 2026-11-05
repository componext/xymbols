/**
 * Icons by name and glyphs by code, for what arrives as data.
 *
 * `DynamicIcon` loads one icon module on demand, as lucide-react's does. The
 * tagsets half imports every glyph, so it opts out of tree-shaking: import
 * named glyphs from the package root when you know them at build time.
 */
import { createElement, forwardRef, useEffect, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { Icon } from './createIcon.js';
import type { LucideProps } from './createIcon.js';
import type { GlyphComponent, GlyphProps } from './createGlyph.js';
import dynamicIconImports from './generated/dynamic-imports.js';
import * as all from './generated/glyphs/index.js';
import type { IconData } from './generated/icon.js';
import { registry } from './generated/registry.js';
import type { TagsetId } from './generated/registry.js';
import { normalizeCode, resolveName } from './generated/resolve.js';

export { dynamicIconImports, normalizeCode };

export type IconName = keyof typeof dynamicIconImports;
export const iconNames = Object.keys(dynamicIconImports) as IconName[];

export interface DynamicIconProps extends LucideProps {
  /** An icon or alias name: `house`, `home`. */
  name: IconName;
  /** Rendered until the icon has loaded. Default: nothing. */
  fallback?: ComponentType;
}

/** One icon by name, loaded when first drawn: `<DynamicIcon name="house" />`. */
export const DynamicIcon = forwardRef<SVGSVGElement, DynamicIconProps>(function DynamicIcon({ name, fallback: Fallback, ...props }, ref) {
  const [icon, setIcon] = useState<IconData>();
  useEffect(() => {
    let ignore = false;
    const load = dynamicIconImports[name];
    if (!load) {
      console.error(`[xymbols]: no icon named "${name}"`);
      return;
    }
    load()
      .then((m) => {
        if (!ignore) setIcon(m.__iconData);
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      ignore = true;
    };
  }, [name]);
  if (!icon) return Fallback ? createElement(Fallback) : null;
  return createElement(Icon, { ref, ...props, icon });
});

export const glyphs: Readonly<Record<string, GlyphComponent>> = all;

/** The glyph for a code: `getGlyph('licenses', 'GPL-3.0-or-later')` is `LicenseGpl`. */
export function getGlyph(tagset: TagsetId, code: string | null | undefined): GlyphComponent | undefined {
  const name = resolveName(registry, tagset, code);
  return name ? glyphs[name] : undefined;
}

export interface TagGlyphProps extends GlyphProps {
  tagset: TagsetId;
  code: string | null | undefined;
  /** Rendered when no glyph claims the code. Default: nothing. */
  fallback?: ReactNode;
}

/**
 * Render the glyph for a code: `<TagGlyph tagset="locales" code="pt-BR" />`.
 * The title defaults to the glyph's label ("Portuguese"); pass `title=""` to
 * make it decorative.
 */
export const TagGlyph = forwardRef<SVGSVGElement, TagGlyphProps>(function TagGlyph({ tagset, code, fallback = null, title, ...props }, ref) {
  const Glyph = getGlyph(tagset, code);
  if (!Glyph) return fallback;
  return createElement(Glyph, { ref, title: title ?? Glyph.meta.label, ...props });
});
