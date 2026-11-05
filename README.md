# xymbols

[![CI](https://github.com/componext/xymbols/actions/workflows/ci.yml/badge.svg)](https://github.com/componext/xymbols/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/xymbols)](https://www.npmjs.com/package/xymbols)

Every [Lucide](https://lucide.dev) icon in nine weights and animated, plus glyphs for standardized codes (licenses, locales, part-of-speech tags, tech abbreviations, keys, math), for React, Vue, React Native and plain JS. Inspired by SF Symbols: one system of symbols that share a grid, weights, animations and (in a coming release) fills.

- **A drop-in for Lucide.** Same names (`House`, `HouseIcon`, `LucideHouse`, aliases such as `Home`), same props, same markup: switching is one import line. The tests render every icon through both packages and require identical output.
- **Weights.** `weight="bold"` on any icon or glyph, from `ultralight` to `black`. Icons whose strokes would crowd stop getting heavier where they would.
- **Animations.** Every icon animates: 416 with an animation of their own (from [UNA](https://github.com/unacms/UNA) and [lucide-animated](https://lucide-animated.com), mapped onto Lucide's current drawings), and ten generic effects for all of them, on the web and React Native.
- **Tagsets.** 195 glyphs for codes that arrive as data, drawn to sit beside Lucide's pictograms: `TagGlyph tagset="licenses" code="GPL-3.0-or-later"`.
- **Keeps up.** Lucide releases weekly; Dependabot bumps it here, CI checks and reports what changed, and an update that breaks nothing merges and releases itself.

Browse everything in the catalog: [componext.github.io/xymbols](https://componext.github.io/xymbols/).

## Packages

| Package | Replaces | What it ships |
|---|---|---|
| `xymbols-react` | `lucide-react` | One component per icon and glyph; `XymbolsProvider` (also `LucideProvider`); `xymbols-react/dynamic` for `DynamicIcon` and `TagGlyph` |
| `xymbols-vue` | `@lucide/vue`, `lucide-vue-next` | The same for Vue 3; `setXymbolsProps` (also `setLucideProps`) |
| `xymbols-react-native` | `lucide-react-native` | The same on `react-native-svg` |
| `xymbols` | `lucide` | Icons as Lucide's node arrays with `createIcons` and `createElement`; glyph data, `toSvg`, `replaceElements`; SVG files, sprites, tiles, `manifest.json` |
| `xymbols-react/lucide-animated` | `lucide-animated` | Its exports (`BellIcon`, `BellIconHandle`, ...) and defaults, drawing Lucide's current icons |

Each package also has an `/animated` entry: `xymbols-react/animated`, `xymbols-vue/animated`, `xymbols-react-native/animated` and `xymbols/animated`. See [Animations](#animations).

```diff
- import { House, Bell } from 'lucide-react';
+ import { House, Bell } from 'xymbols-react';
```

```tsx
import { House, Settings, LicenseMit, KeyMeta, KeyK, XymbolsProvider } from 'xymbols-react';
import { DynamicIcon, TagGlyph } from 'xymbols-react/dynamic';

<House />                                                 // Lucide's house, unchanged
<House weight="semibold" />                               // stroke 2.5
<Settings weight="black" />                               // stops at 2.97, its limit
<XymbolsProvider weight="light" size={20}>…</XymbolsProvider>
<DynamicIcon name="house" />
<KeyMeta /><KeyK />                                       // ⌘ K
<TagGlyph tagset="keys" code={event.code} fit="hug" />    // ShiftLeft → SHIFT keycap
<TagGlyph tagset="licenses" code={pkg.license} fallback={pkg.license} />
```

```vue
<script setup>
import { House, PosNoun } from 'xymbols-vue';
import { TagGlyph } from 'xymbols-vue/dynamic';
</script>

<template>
  <House weight="bold" :size="20" />
  <PosNoun :size="16" fit="hug" />
  <TagGlyph tagset="math" :code="symbol.latex" fit="hug" />
</template>
```

```html
<i data-lucide="house" data-weight="bold"></i>
<i data-tagset="locales" data-code="pt-BR"></i>
<script type="module">
  import { createIcons, icons, replaceElements, toSvg, Bell, TechJson } from 'xymbols';
  createIcons({ icons });
  replaceElements();
  toSvg(Bell, { weight: 'heavy', size: 32 });
  toSvg(TechJson, { fit: 'hug' });
</script>

<svg width="24" height="24"><use href="/sprite.svg#house" /></svg>
```

Icons take Lucide's props (`size`, `color`, `strokeWidth`, `absoluteStrokeWidth`, `nonScalingStroke`, any SVG attribute) plus `weight`. Glyphs take `size` (the height), `fit`, `color`, `strokeWidth`, `weight`, `absoluteStrokeWidth` and `title`, and expose `meta`, `fixed` and `hug`.

## Animations

```tsx
import { Bell, Menu, Settings } from 'xymbols-react/animated';

<Bell />                                        // its own animation (UNA's ring) on hover
<Bell effect="bounce" />                        // or a generic effect
<Menu trigger="group-hover" active={open} />    // plays when its .group row is hovered; Menu → X while active
<Settings trigger="loop" />                     // over and over
ref.current?.play('wiggle');                    // or startAnimation() / stopAnimation()
```

```diff
- import { BellIcon } from 'lucide-animated';
+ import { BellIcon } from 'xymbols-react/lucide-animated';
```

- **Effects.** `effect="auto"` (the default) plays the icon's own animation, else a wiggle. Every icon also takes `bounce`, `pulse`, `scale`, `wiggle`, `rotate`, `breathe`, `appear`, `disappear`, `draw-on` and `draw-off`.
- **Triggers.** `hover` (the default on the web; keyboard focus on the link or button around the icon counts), `group-hover` (the row around it, `.group`), `active` (once, each time `active` turns on: tab bars), `mount`, `loop` and `manual`. A held motion (Settings turning 180°) holds until the hover ends, then goes back. On React Native, which has no hover, the default is `active`, and `hover` follows the `pressed` prop.
- **Active state.** `active` fills closed shapes at 20% and changes shape where an icon says so (Menu's lines fold into an X), as UNA's icons do. `scenes={{ fill: false }}` or `{{ motion: false }}` turns either off.
- **Reduced motion** keeps the active state and plays no movement.
- **Same drawing.** An animated icon draws exactly the static one's shapes (the tests check every icon), so swapping one for the other moves nothing.
- **Engines.** The web engine (React, Vue, vanilla) uses the Web Animations API with CSS for state, and no animation library. The native one uses RN `Animated`, as UNA does. Springs are solved when the packages are built (a port of Motion's, checked against it) and played as CSS `linear()` on the web and an interpolation table on native, so both play the same curve.
- **Where animations come from.** The build reads UNA's 35 specs from the `upstream/una` submodule (only its animated-icons folder is fetched), and lucide-animated's from its installed bundle, run with React and Motion stubbed out to record what each icon does. Both are mapped onto Lucide's current nodes. Where an icon has both, UNA's wins. Of lucide-animated 1.0.5's 441 icons, 392 carry over. 25 aren't Lucide icons (brand logos and its own drawings), and the rest animate shapes Lucide no longer draws.
- **UNA forks** keep their own specs: `createUnaIcon(spec)` turns a UNA spec object into an animated icon.

## Weights

| `ultralight` | `thin` | `light` | `regular` | `medium` | `semibold` | `bold` | `heavy` | `black` |
|---|---|---|---|---|---|---|---|---|
| 1 | 1.25 | 1.5 | **2** | 2.25 | 2.5 | 2.75 | 3 | 3.25 |

Names follow SF Symbols; CSS font-weights work too (`weight={600}`). A weight is a stroke width at 24px, and regular is Lucide's 2, so a default icon is exactly Lucide's.

Heavier strokes eat into the air between strokes, so the build measures every drawing (`scripts/lib/weights.ts`): the closest pair of separate strokes sets the heaviest weight that still leaves 1px between them, and a heavier weight stops there. Of Lucide 1.69's 2,024 icons, 906 take every weight, 29 stay at regular (mostly `-off` icons, whose slash leaves a deliberate gap), and the rest stop between. Lighter weights never stop, and an explicit `strokeWidth` is never clamped. The manifest lists each limit as `maxStroke`.

Precedence: a component's `strokeWidth`, then its `weight`, then the provider's `strokeWidth`, then the provider's `weight`.

## Tagsets

195 glyphs in six tagsets, drawn on Lucide's grid: 24 tall, 2px round strokes, 1px padding.

| Tagset | Prefix | Standard | Glyphs | Resolves |
|---|---|---|---|---|
| `keys` | `Key` | UI Events `KeyboardEvent.key` | 68 | `a`, `KeyA`, `ShiftLeft`, `" "`, `NumpadEnter`, `⌘` |
| `licenses` | `License` | SPDX License List | 22 | `GPL-3.0-or-later`, `BSD-3-Clause`, `(MIT OR Apache-2.0)`, `CC-BY-SA-4.0` |
| `locales` | `Locale` | ISO 639-1 / BCP 47 | 26 | `en`, `pt-BR`, `zh_Hant_TW`, ISO 639-2 `ger` |
| `math` | `Math` | LaTeX / Unicode | 37 | `\leq`, `leq`, `≤`, `<=`; case-sensitive (`\Delta` ≠ `\delta`) |
| `pos` | `Pos` | Universal Dependencies UPOS | 17 | `NOUN`, Penn Treebank `NN`, `NNP`, `PRP$` |
| `tech` | `Tech` | Common usage | 25 | `JSON`, `yml`, `https` |

Every glyph also ships as a 72px tile in the style of the UNA launcher icons, in its tagset's colour. The build fails if a glyph's name or id would collide with an icon's.

### Fixed and hug

Every glyph is 24 tall and comes in up to two widths, named after Figma's auto-layout sizing:

- **`hug`**: as wide as its content. The full text, always on one line: `MIT`, `NOUN`, `APACHE2`, `SHIFT`. Frames stretch with it: a circle becomes a pill, a key's square widens. An unframed glyph can be narrower than it is tall (`X`, `×`).
- **`fixed`**: the 24×24 square, which holds two characters (one inside a frame). When the full text does not fit, the glyph uses a recognizable short form (`N` for `NOUN`, `NP` for `PROPN`) or its symbol (`⇧`, `⏎`, `⌘`). When neither exists, there is no fixed form and `fixed` falls back to `hug`.

| Glyph | Fixed | Hug |
|---|---|---|
| `LocaleEn` | `EN`, filling the square | the same (24) |
| `PosNoun`, `PosPropn` | `N`, `NP` | `NOUN` (48), `PROPN` (60) |
| `KeyShift`, `KeyHome` | `⇧`, `↖` | `SHIFT` keycap (60), `HOME` keycap (50) |
| `KeyK`, `LicenseCc` | same as hug | 24 |
| `MathSum` | `∑` in the square | `∑` cropped to its ink (16) |
| `LicenseMit`, `TechApi`, `LicenseApache`, `KeyF1` | none | `MIT` (36), `API` (36), `APACHE2` (84), `F1` keycap (30) |

61 glyphs are hug-only: the three-letter and longer license, tech and POS codes with no recognizable two-character short form, plus `Fn`, `F1`–`F12`, `PgUp` and `PgDn`. Nothing is ever set on two lines.

## Things the integration must respect

1. **Name what stands in for text.** Icons and glyphs are `aria-hidden` unless they have a `title`, an `aria-label` or a role. A tag glyph usually *is* the content (a license column, a language switcher, a shortcut hint), so give it one unless a visible label sits next to it. `TagGlyph` and `replaceElements` title themselves with the glyph's label; pass `title=""` to opt out.
2. **A glyph's `size` is its height.** A fixed glyph is `size` square; a hug glyph is `size × width / 24` wide. Numbers and plain lengths (`"1.5em"`) scale; anything else (`var(--s)`) keeps the box square and the drawing shrinks to fit it. Hugging glyphs carry the class `xymbol-hug`. Icons are always square, as in Lucide.
3. **Pick one fit per row.** Fixed glyphs line up in columns; hug glyphs read like words. A fixed row can still contain hug-only glyphs (most three-letter codes), which come out wider than the rest. Sprites follow the same rule: `sprite.svg` holds the fixed form (or hug where there is none), `sprite-hug.svg` the hug form, each with its own `viewBox`, so size `<use>` boxes from `manifest.json`. Icons are in both.
4. **12px is the floor for glyphs.** Freestanding characters are 14 grid units tall with 6-unit counters (4px of air at 16px); characters in a key are 10 tall with 4-unit counters (2.7px at 16px, 2px at 12px). Below that they close up. Keep `absoluteStrokeWidth` for sizes of 24px and up: below 24px it thickens the stroke in grid units (2px at 16px is 3 units).
5. **Tiles inline, statics anywhere.** SVG files and sprites work in `<img>`, CSS and `<use>`. Tile ids are suffixed with the glyph id, so any number can be inlined on one page. Tiles are square, so round the corners in CSS (16px at 72px). A hug-only glyph's tile shrinks it to fit.
6. **Codes resolve, they are not validated.** `getGlyph('licenses', 'GPL-2.0-only')` returns the GPL family glyph; versions share it (so `Apache-1.1` shows `APACHE2`). Keys follow macOS: `Meta` is `⌘`/`CMD`, `Alt` is `⌥`/`ALT`. A code nobody claims returns `undefined` (React: `fallback`, Vue: `#fallback` slot, vanilla: the placeholder stays).
7. **The dynamic entries.** `DynamicIcon` loads one icon module when first drawn. `TagGlyph` imports all 195 glyphs (about 130KB unminified, 12KB gzipped). Import named icons and glyphs from the package root when you know them at build time; everything else tree-shakes.
8. **Marks and credits.** Icons are Lucide's, unchanged (ISC, `LICENSE-lucide`). The CC glyphs are drawn here, not copied, but "CC" and its marks are Creative Commons trademarks: use them to indicate a CC license. The `bubble` frame is Lucide's `message-square`, `⌘` follows Lucide's `command`, and keys sit in Lucide's `square`. The letterforms follow Nunito's rounded capitals, redrawn as single strokes. SF Symbols is Apple's; xymbols borrows its ideas, not its drawings.

## How it is made

**Icons** come from the pinned `lucide-static` (geometry, aliases, tags) and `lucide-react` (the order of each icon's aliases, which becomes its class order), byte for byte: nothing is redrawn or optimized (`scripts/lib/lucide.ts`).

**Glyphs** are mostly text, set in a monoline stroke alphabet (`scripts/lib/letters.ts`): capitals, digits and arrows after Nunito's rounded geometric capitals, drawn as single 2px strokes with oval bowls. The alphabet is monospaced, characters sit 4 apart (2px of air between strokes), and it comes in two optical sizes:

- **Text**, for freestanding glyphs: an 8×14 cell (16 tall in ink). A pair fills the square edge to edge and sits at the visual size of a Lucide pictogram beside it.
- **Framed**, inside a key or a circle: a 6×10 cell, the most a frame's 2px of padding leaves room for.

In both, stems and bars land on whole pixels, so they stay crisp at 1×.

A glyph's `.json` holds its codes and, for text, `"text"` and an optional `"short"`. The build composes both fits from them; nothing generated is written back to the source. A drawn `<name>.svg` beside the JSON is the fixed form; with no `text` it is the hug form too.

Text sits in a **frame**, set per tagset or per glyph:

| Frame | Fixed holds | Hug | Used for |
|---|---|---|---|
| `none` | two text-size characters | text + 2 each side | locales, licenses, POS, tech, math |
| `circle` | one framed-size character | becomes a pill | `©`, CC0 |
| `keycap` | one framed-size character | square widens | keys (Lucide `square`) |
| `bubble` | one framed-size character | body widens, tail stays | no tagset by default (Lucide `message-square`) |

Two spacing rules hold for every glyph, and the build checks them on every variant (`scripts/lib/spacing.ts`): separate strokes either join or keep at least 1px of air between them, and anything inside a frame keeps at least 2px of air from it (a slash may cross it). A character in a key has exactly 2px above and below. Three-letter codes need a recognizable two-character short form (`NP`, `CC`) or a symbol, or stay hug-only.

### Adding a glyph

1. Add `sources/tagsets/<tagset>/<name>.json` with `label`, `code` and any `aliases` (see `glyph.schema.json`).
2. Either add `"text"` (and a recognizable `"short"` if the text is too wide for the square), or draw `<name>.svg` on the grid. Copy an existing drawn glyph for the root; children are bare shapes (`path`, `circle`, `rect`, `line`, `polyline`, `polygon`, `ellipse`) with geometry only, stroke centres inside 2..22. A framed drawing starts with its frame exactly, and keeps its content inside it.
3. `pnpm check`, then `pnpm preview` to look at it at 16–48px, in every weight, in both fits and as a tile.

A new tagset is a folder with a `_tagset.json`: `id`, a PascalCase `prefix`, `label`, `standard`, `normalize` (`spdx`, `bcp47`, `upper`, `key` or `latex`), an optional `frame` and display `order`, and a `tile` palette.

## Scripts

| Command | Does |
|---|---|
| `pnpm build` | Check every glyph, load Lucide, measure weights, compose both fits, optimize glyphs with SVGO, emit all packages, compile with `tsc` |
| `pnpm test` | Lucide compatibility in all four packages, weights, source rules, fits, code resolution, assets, rendering |
| `pnpm check` | Build, typecheck, test |
| `pnpm preview` | Write `preview/index.html`, the catalog |
| `pnpm report` | After a build: what changes against the latest `xymbols` on npm |
| `pnpm versions check` / `set X.Y.Z` | Check, or set, the one version the four packages share |

The build fails on any rule a glyph breaks (wrong root attributes, style on children, geometry outside the grid, strokes closer than 1px without joining, content within 2px of its frame, a frame that differs from its tagset's, a short form that does not fit or is never used, two glyphs claiming one code, a character the alphabet lacks), on an alias Lucide's two packages disagree about, and on a glyph name an icon already has.

Requires Node 22.18+ (scripts run as TypeScript directly) and pnpm.

## Keeping up with Lucide, lucide-animated and UNA

1. **Dependabot** (`.github/dependabot.yml`) checks weekly: the Lucide packages (all five together), lucide-animated (with the Motion version the spring tests compare against), and UNA (the `upstream/una` submodule).
2. **CI** builds and runs the compatibility and animation tests against the new versions. The upstream report (`upstream.yml`) comments on the pull request with what changes: icons added, redrawn, renamed or removed, weight limits that moved, and animations added, changed or dropped, by source.
3. **Auto-merge.** If nothing importable disappears (Lucide keeps renamed icons as aliases), the pull request merges itself once CI passes. A removal waits for a person. An icon that loses its own animation still animates with the generic effects, so that isn't breaking.
4. **Release.** Every morning, `release-upstream.yml` checks whether everything on `main` since the last release came from Dependabot. If so, it releases: minor when icons, names or animations were added, patch for redraws and changed animations, with the report as release notes. Anything a person merged waits for a person to release it.
5. **Catalog.** `pages.yml` rebuilds the catalog on every push to `main`.

## Releasing

CI (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request, on Node 22 and 24: versions in lockstep, `pnpm check`, and a dry-run pack of each package.

The four packages release together, at one version, from `.github/workflows/release.yml`, through [npm trusted publishing](https://docs.npmjs.com/trusted-publishers): npm trusts that workflow, so there is no npm token, and each version gets a provenance statement. The version comes from the tag (the repository keeps the packages at `0.0.0`), so a release needs no version-bump commit. A prerelease, or a tag with a `-`, publishes under the `next` dist-tag. Re-running a release skips the packages already published.

- **By hand:** `gh release create v0.2.0 --generate-notes` (add `--prerelease` for `next`).
- **Upstream updates:** automatic, as above.

**One-time setup** for each package, by an owner, approved with the account's passkey. Trusted publishing cannot make a package's first publish, so publish the first version from a clean checkout:

```bash
pnpm versions set 0.1.0 && pnpm check && for dir in vanilla react vue react-native; do (cd "packages/$dir" && npm publish --access public --auth-type=web); done
```

Then on npmjs.com, each package's **Settings → Trusted Publisher → GitHub Actions**: organization `componext`, repository `xymbols`, workflow `release.yml`, environment `npm`. After the first release through the workflow, set each package's **Settings → Publishing access** to "Require two-factor authentication and disallow tokens". Auto-merge needs "Allow auto-merge" in the repository settings and a branch rule on `main` that requires CI.
