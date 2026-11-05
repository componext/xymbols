# xymbols

Every [Lucide](https://lucide.dev) icon in nine weights, plus tagsets glyphs for licenses (SPDX), locales (ISO 639-1 / BCP 47), part-of-speech tags (UD UPOS), tech abbreviations, keyboard keys and math symbols, without a framework. A drop-in for the `lucide` package. For components, see `xymbols-react`, `xymbols-vue` and `xymbols-react-native`.

```js
import { createIcons, icons, House, Bell, PosNoun, getGlyph, toSvg, replaceElements } from 'xymbols';

createIcons({ icons });                      // <i data-lucide="house" data-weight="bold"></i> → <svg>
toSvg(Bell, { weight: 'heavy', size: 32 });  // an SVG string, in any weight
toSvg(PosNoun, { fit: 'hug' });              // NOUN, 48×24
getGlyph('keys', 'ShiftLeft');               // KeyShift
replaceElements();                           // <i data-tagset="pos" data-code="NOUN"></i> → <svg>
```

Icons are Lucide's node arrays, as the `lucide` package exports them (`createElement(House, attrs)` works the same). Files:

- `svg/icons/<name>.svg`: every icon, as Lucide draws it.
- `svg/fixed/<tagset>/<name>.svg`, `svg/hug/<tagset>/<name>.svg`: glyphs, safe in `<img>` and CSS. Hug-only glyphs have no fixed file.
- `sprite.svg` and `sprite-hug.svg`: one `<symbol>` per icon (`#house`) and glyph (`#license-mit`), each with its own `viewBox`.
- `tiles/<tagset>/<name>.svg`: 72px glyph tiles in the UNA launcher style, with page-unique ids.
- `manifest.json`: every icon (aliases, tags, weight limit) and glyph (codes, labels, widths), with file paths.

See the [repository README](https://github.com/componext/xymbols#readme) for weights, the tagsets and the design rules.
