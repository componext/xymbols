# xymbols: plan

## Context

tagsets has no outside users yet: about 800 of its weekly downloads are UNA's own CI and registry bots. On its own it is a niche. The aim is to fold it into a bigger idea: **xymbols**, a Lucide-compatible symbol system modelled on what makes SF Symbols more than an icon set:

- every icon in multiple weights;
- outline and filled variants;
- several animations per icon, working on web and React Native;
- tagsets (codes, keys, licenses, math) designed to sit beside the icons.

It must be a drop-in for the Lucide packages people already use, and it must keep up with three upstreams on its own: Lucide (geometry), lucide-animated (animation patterns) and UNA (its animated icon specs). UNA is its first user.

Facts this plan rests on, checked on 2026-11-05:

| | |
|---|---|
| Names | `xymbols`, `xymbols-react`, `xymbols-vue`, `xymbols-react-native` are free on npm; `componext/xymbols` is free on GitHub |
| Lucide 1.69.0 | 2,024 icons in `lucide-static` (`icon-nodes.json`, `tags.json`) plus 293 alias names (`home` → `house`). `lucide-react` exports each name 3 ways (`House`, `HouseIcon`, `LucideHouse`) and has `LucideProvider`, `createLucideIcon`, `lucide-react/dynamic`. 127.7M weekly downloads |
| lucide-animated 1.0.5 | MIT, ~440 icons in the npm bundle (469 in pqoqubbw/icons). Each icon is a React + Motion component: `normal`/`animate` variants with keyframe arrays, durations and springs, a `startAnimation`/`stopAnimation` ref handle and `animateOnHover`. Its paths are copies of older Lucide geometry (its Bell is the pre-2024 drawing) |
| UNA engine | `neo/packages/app/ui/atoms/animated-icons` in unacms/UNA (MIT, public, 576 MB). 35 specs: Lucide nodes split into parts, each with `fill`, one `motion` (rotate, shift, swing, wiggle, lift, pulse, draw, appear) and an `active` shape. Web is pure CSS (`.nai`), native is react-native-svg + RN `Animated` |

## Decisions (defaults; say if you want any changed)

1. **Rename `componext/tagsets` to `componext/xymbols`.** GitHub redirects the old URLs; history and CI carry over. The `tagsets*` npm packages are deprecated with a pointer once UNA has moved.
2. **Every upstream is tracked by Dependabot.** The npm ones (`lucide-static`, `lucide`, `lucide-react`, `@lucide/vue`, `lucide-react-native`, `lucide-animated`) are devDependencies. UNA becomes a git submodule at `upstream/una`, which Dependabot's `gitsubmodule` updater bumps; CI fetches only the animated-icons folder (`--filter=blob:none`, sparse checkout), never the whole 576 MB repo.
3. **Upstream updates merge and release themselves when nothing breaks** (details under "Keeping up").
4. **No animation library.** Web uses the Web Animations API plus CSS; native uses RN `Animated` as UNA does. No Motion, no Reanimated peer dependency.
5. **Geometry always comes from the current Lucide.** Animations borrowed from lucide-animated or UNA are mapped onto Lucide's nodes, never their own copies of the paths.

## Architecture

### Sources

- `upstream/` — read-only inputs: Lucide via `node_modules/lucide-static`, lucide-animated via `node_modules/lucide-animated`, UNA via the submodule.
- `sources/tagsets/` — today's `packages/glyphs` tagsets, unchanged.
- `sources/symbols/<lucide-name>.json` — an **overlay** per icon that needs one: its parts (which nodes form a part, roles for the fill variant, pivots) and its effects. Each overlay records the hash of the Lucide geometry it was made for, so a Lucide redraw flags it as stale instead of animating the wrong shape. Overlays carry a `source`: `xymbols` (hand-tuned), `una` or `lucide-animated`. Importers rewrite their own overlays and never touch hand-tuned ones. Precedence: xymbols > UNA > lucide-animated.

Reused from today's build: `scripts/lib/source.ts` (loading, `lintNodes`), `scripts/lib/spacing.ts` (made stroke-aware, see Weights), `scripts/lib/emit.ts` (one module per glyph), `scripts/runtime/*` (resolve, render), `scripts/lib/tiles.ts`, the preview. Lucide nodes bypass SVGO so they stay byte-identical to `lucide-react`.

### Packages and drop-in compatibility

| Replaces | Package | Notes |
|---|---|---|
| `lucide-react` | `xymbols-react` | same names in all 3 forms plus aliases, same props (`size`, `color`, `strokeWidth`, `absoluteStrokeWidth`, `nonScalingStroke`), `XymbolsProvider` (+ `LucideProvider` alias), `createLucideIcon`, `/dynamic` |
| `@lucide/vue` (formerly `lucide-vue-next`) | `xymbols-vue` | same |
| `lucide-react-native` | `xymbols-react-native` | peers `react-native`, `react-native-svg` |
| `lucide` | `xymbols` | `createIcons` / `data-lucide`, plus today's `toSvg`, `replaceElements`, manifest, sprites, tiles |
| `lucide-animated` | `xymbols-react/animated` | `BellIcon` with `startAnimation`/`stopAnimation` and `animateOnHover` |

Switching is a one-line import change. A compat test runs on every build: every export name in the installed `lucide-react` (and the Vue and native packages) exists in ours with the same props. Tagsets components (`LocaleEn`, `KeyShift`, ...) ship in the same packages; the build fails if one collides with a Lucide name.

The static entry (`import { Bell } from 'xymbols-react'`) stays as light as `lucide-react`'s; the animation engine and an icon's tracks load only from the `/animated` entries.

```tsx
<Bell weight="semibold" variant="fill" />               // SF-style weight and fill
<Bell rendering="duotone" />                            // 20% fill, UNA's active look
import { Bell } from 'xymbols-react/animated';
<Bell trigger="hover" />                                // its own animation
<Bell effect="wiggle" trigger="group-hover" active={on} />  // UNA menu rows
ref.current?.play('bounce');                            // or startAnimation()
```

### Weights

Nine named weights mapped to stroke width at 24px, tuned on the preview against SF Symbols' optical weights:

| ultralight | thin | light | regular | medium | semibold | bold | heavy | black |
|---|---|---|---|---|---|---|---|---|
| 1 | 1.25 | 1.5 | 2 | 2.25 | 2.5 | 2.75 | 3 | 3.25 |

`strokeWidth` still overrides. Lucide keeps 2px of air between elements at stroke 2, so heavy weights eat into it. The build runs the spacing check (1px air between strokes, generalised from `spacing.ts`) at every weight, records each icon's heaviest safe weight in the manifest, and clamps to it, so an icon never closes up. Tagsets letters follow the same rule; keys will top out early and may later get letters sized per weight.

### Variants and rendering

- **Fill.** An overlay gives nodes a role: `fill` (solid), `knockout` (cut out of the fill through a mask, so a bell's clapper stays visible), or `outline`. The build proposes roles for every icon (closed shapes fill, shapes inside them knock out) and the preview shows outline, fill and duotone side by side for review. Only reviewed icons ship `variant="fill"`; the rest fall back to outline and the manifest says so. First batch: UNA's 35, which already mark their fills. Keycap and circle tagsets get fills with knocked-out text almost for free.
- **Rendering modes:** `monochrome` (default), `duotone` (fill at 20%, as UNA), `palette` (`color` plus `secondaryColor` for fills).
- **Scales** (`small`, `medium`, `large`) for icons set in text, aligned to cap height.

### Effects

One track format covers both sources: a part, a property (`rotate`, `x`, `y`, `scale`, `opacity`, `draw`), keyframes with optional `times`, a duration, a delay, an easing (cubic-bezier or a spring), repeat and an origin.

- **Borrowed from lucide-animated:** its `normal`/`animate` variants become tracks; keyframe arrays, `times`, springs and per-element delays all map. Springs are sampled once at build time into CSS `linear()` easing for web and an interpolation table for native, so both play the same curve. The ref handle and `animateOnHover` keep its API.
- **From UNA:** the 8 motion kinds become track presets with UNA's own durations and keyframes, per platform (web rotate is 300 ms, native 350). Active shapes, `stagger`, `stillWhenActive` and fill indexes carry over. The runtime also accepts UNA spec objects as they are, so specs in UNA forks' `customization/animated-icons.js` keep working.
- **Per icon:** its own animation, if any source has one, is `effect="auto"`. Every icon also takes the generic effects with no overlay needed: `bounce`, `pulse`, `scale`, `wiggle`, `rotate`, `breathe`, `appear`, `disappear`, `draw-on`, `draw-off`. They move the whole icon, or the overlay's primary part when there is one. `replace` (a swap between two icons) comes in phase 3.
- **Triggers:** `hover`, `group-hover` (UNA's `.group` rows), keyboard `focus-visible`, `active` (rising edge, UNA's tab bars), `mount`, `loop`, `manual` (ref). Nothing plays on mount unless asked.
- **UNA behaviours kept:** 20% active fill fading in over 200 ms, press to 0.96, no hover scale, no re-render on hover, reduced motion keeps state changes and drops movement, static and animated drawings identical so a lazy swap moves nothing, `scenes` (fill / motion) switches.
- **Web engine** (`xymbols/animate`, shared by React, Vue and vanilla): CSS for state (fill, active shapes, press, reduced motion), Web Animations API for tracks.
- **Native engine** (`xymbols-react-native/animated`): UNA's approach, generalised. One `Animated` progress value drives every track through interpolation; transforms on the JS driver (SVG groups can't use the native one), the press scale on the native driver, Reduce Motion respected. `draw` falls back to `appear` unless animating the dash offset proves smooth on device.

The lucide-animated importer loads the installed bundle with `motion/react` redirected (a Node module hook) to a recording stub. It renders each icon server-side, which captures every element's variants and transitions without parsing source. It maps elements onto the current Lucide nodes by order and shape. Anything it can't map (imperative `useAnimate` sequences, node mismatches from geometry drift) goes into the report for porting by hand.

### Keeping up

1. **Dependabot, weekly:** one grouped PR for the npm upstreams, one for the UNA submodule, plus GitHub Actions updates.
2. **CI on those PRs** builds, runs the importers and the compat test, and posts an upstream report as a PR comment: icons added, redrawn, renamed or removed; animations added or changed, by source; overlays gone stale. A UNA bump that touches nothing in the animated-icons folder reports "no changes".
3. **Auto-merge** (`dependabot/fetch-metadata`, `gh pr merge --auto`) when the report has nothing breaking. Lucide renames keep the old name as an alias, so they don't count. Removed exports or a stale hand-tuned overlay leave the PR open for review.
4. **Release, daily:** a scheduled job checks whether main has glyph changes since the last tag. If so it tags the next version (minor for new icons or animations, patch otherwise), writes release notes from the report, and dispatches `release.yml`. It runs on a schedule because merges made with the Actions token don't trigger other workflows; dispatch is the exception.
5. **`release.yml`** gains `workflow_dispatch` and sets package versions from the tag, so there are no version-bump commits. It stays the trusted publisher, with provenance.

After phase 4, UNA consumes xymbols: new animations are written in xymbols, UNA's Dependabot follows xymbols, and the UNA submodule keeps importing only what forks still add there.

## Phases

Each phase ends in a release.

1. **xymbols with all of Lucide.** Rename the repo and packages. Move tagsets sources to `sources/tagsets`. Import Lucide geometry, aliases and tags. Ship the React, Vue, vanilla and React Native static packages with the compat tests, weights with per-icon clamping, the name collision check, a searchable preview (also published to GitHub Pages as the catalog), the Dependabot config, upstream report, auto-merge and scheduled release. Release 0.1.0.
2. **Effects.** Track format, presets, generic effects, web and native engines, the `/animated` entries, the UNA importer (35 icons) and the lucide-animated importer (~440), the UNA submodule. An Expo example app for checking native.
3. **Variants and rendering.** Fill roles, the review page and the first reviewed batches, duotone and palette, scales, `replace`.
4. **UNA on xymbols.** In the UNA repo: replace the in-repo engine with `xymbols-react` and `xymbols-react-native`, keep forks' customization working, delete the copied specs. Then deprecate `tagsets*` on npm.

## Verification

- `pnpm check` on every phase: build, lint, spacing at every weight, tests.
- **Compat:** export names and props match the installed Lucide packages, and each icon's nodes equal Lucide's at regular weight (exact data, not pixels).
- **Visual:** the preview in the browser pane: Lucide vs xymbols side by side, the weight ladder, outline/fill/duotone, and animations on hover, focus, active and reduced motion.
- **UNA:** each of UNA's 35 specs compiles to the same keyframes and durations as UNA's own web and native engines (fixtures ported from them). In phase 4, UNA's web and native tab bars are checked in the browser and the iOS simulator.
- **Native:** the Expo example in the iOS simulator through argent: effects play on active, Reduce Motion stops them.
- **Release path:** a dry run of the scheduled release and `release.yml` via `workflow_dispatch` before the first automatic one.

## What you'll need to do

- First publish of each new package name, with your passkey (`npm publish --auth-type=web`), then add the trusted publisher (componext/xymbols, `release.yml`, environment `npm`) on npmjs.com. Trusted publishing can't do a package's first publish.
- Approve the repo rename and the repo settings auto-merge needs: "Allow auto-merge", and branch protection on main requiring CI. I can set these with `gh` once you say so.
- After phase 4: `npm deprecate` the three `tagsets*` packages (passkey).

## Risks

- **Lucide is entrenched**, so xymbols only wins if switching costs one line and the extras are visible. The catalog site matters as much as the code.
- **"SF Symbols" is Apple's trademark.** Say "inspired by SF Symbols" in the README; keep it out of the name and headline.
- **Licenses:** ship `LICENSE-lucide` (ISC, Feather MIT), `LICENSE-lucide-animated` (MIT) and UNA's MIT notice in every package that carries their work.
- **Bundle size:** the static entry must stay at `lucide-react`'s cost per icon; check with a bundle-size test in CI.
- **Fill variants need review time** across 2,000 icons. The review page and batches keep it moving; unreviewed icons stay outline-only rather than shipping bad fills.
