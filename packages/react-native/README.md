# xymbols-react-native

Every [Lucide](https://lucide.dev) icon in nine weights, plus tagsets glyphs for licenses (SPDX), locales (ISO 639-1 / BCP 47), part-of-speech tags (UD UPOS), tech abbreviations, keyboard keys and math symbols, as React Native components on `react-native-svg`. A drop-in for `lucide-react-native`: same names, props and drawing.

```tsx
import { House, Settings, KeyShift, XymbolsProvider } from 'xymbols-react-native';
import { TagGlyph } from 'xymbols-react-native/dynamic';

<House color="#0a84ff" size={28} />
<Settings weight="bold" />                               // ultralight … black, or 100 … 900
<XymbolsProvider weight="light">…</XymbolsProvider>
<KeyShift fit="hug" />                                   // SHIFT keycap
<TagGlyph tagset="locales" code="pt-BR" />
```

Icons take lucide-react-native's props (`size`, `color`, `strokeWidth`, `absoluteStrokeWidth`, any `SvgProps`) plus `weight`; `LucideProvider`, `createLucideIcon`, `Icon` and `icons` work as in lucide-react-native. Glyphs take `size` (the height), `fit`, `color`, `strokeWidth`, `weight`, `absoluteStrokeWidth` and `title` (its accessibility label). Needs `react-native-svg` 12 or later.

**Animated.** `xymbols-react-native/animated` has every icon, animated with RN `Animated`, as UNA's tab bars do. By default an icon plays once each time `active` turns on, and `pressed` scales it to 0.96 and plays `hover` triggers. Reduce Motion keeps the active fill and drops the movement. It needs `react-native` itself as well as `react-native-svg`.

```tsx
import { Bell } from 'xymbols-react-native/animated';

<Bell active={focused} pressed={pressed} />
<Bell effect="bounce" trigger="mount" />
```

See the [repository README](https://github.com/componext/xymbols#readme) for weights, the tagsets and the design rules.
