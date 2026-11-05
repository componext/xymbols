# xymbols-react

Every [Lucide](https://lucide.dev) icon in nine weights, plus tagsets glyphs for licenses (SPDX), locales (ISO 639-1 / BCP 47), part-of-speech tags (UD UPOS), tech abbreviations, keyboard keys and math symbols, as React components. A drop-in for `lucide-react`: same names, props and markup.

```tsx
import { House, Settings, PosNoun, LicenseMit, KeyMeta, KeyK, XymbolsProvider } from 'xymbols-react';
import { DynamicIcon, TagGlyph } from 'xymbols-react/dynamic';
import Bell from 'xymbols-react/icons/bell';

<House />                                                // Lucide's house, unchanged
<House weight="semibold" />                              // ultralight … black, or 100 … 900
<Settings weight="black" />                              // stops at its limit, 2.97
<XymbolsProvider weight="light" size={20}>…</XymbolsProvider>
<DynamicIcon name="house" />
<PosNoun size={20} fit="hug" />                          // NOUN, as wide as it needs
<KeyMeta /><KeyK />                                      // ⌘ K
<TagGlyph tagset="licenses" code="GPL-3.0-or-later" fallback="GPL" />
```

Icons take lucide-react's props (`size`, `color`, `strokeWidth`, `absoluteStrokeWidth`, `nonScalingStroke`, any SVG attribute) plus `weight`. `LucideProvider`, `useLucideContext`, `createLucideIcon`, `Icon` and `icons` work as in lucide-react. Glyphs take `size` (the height), `fit`, `color`, `strokeWidth`, `weight`, `absoluteStrokeWidth` and `title`. Without a `title`, `aria-label` or role, everything is `aria-hidden`. React 18 or later.

See the [repository README](https://github.com/componext/xymbols#readme) for weights, the tagsets and the design rules.
