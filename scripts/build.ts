/**
 * Build every package from sources/ and the pinned lucide-static.
 *
 * 1. Check: every tagsets glyph passes the grid and metadata rules and
 *    resolves into its fixed and hug variants (scripts/lib/source.ts); Lucide
 *    loads with every alias accounted for (scripts/lib/lucide.ts); and no
 *    glyph's name or id collides with an icon's. Any problem stops the build.
 * 2. Optimize each tagsets variant with SVGO. Lucide's nodes ship as they are.
 * 3. Find how heavy each drawing can go (scripts/lib/weights.ts).
 * 4. Emit vanilla SVGs, sprites, tiles and manifest (packages/vanilla/dist),
 *    and generated TypeScript for vanilla, React, Vue and React Native
 *    (packages/<pkg>/src/generated). `pnpm build` then compiles them with tsc.
 */
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { emitAll, iconExports, type Built, type BuiltIcon } from './lib/emit.ts';
import { loadIcons } from './lib/lucide.ts';
import { optimizeGlyph } from './lib/optimize.ts';
import { ROOT, loadGlyphs, sourceSvg, type Variant } from './lib/source.ts';
import { maxStroke } from './lib/weights.ts';

const started = performance.now();
const { tagsets, glyphs, problems } = loadGlyphs();
const lucide = loadIcons();
problems.push(...lucide.problems);

// Glyphs and icons share every namespace: package exports, CSS classes, sprite ids, file names.
const iconNames = new Map<string, string>();
for (const icon of lucide.icons) {
  for (const n of iconExports(icon)) iconNames.set(n, icon.name);
  for (const n of [icon.name, ...icon.aliases.map((a) => a.name)]) iconNames.set(n, icon.name);
}
for (const g of glyphs) {
  for (const n of [g.component, g.id]) {
    if (iconNames.has(n)) problems.push(`${g.tagset.id}/${g.name}: ${n} is taken by Lucide's ${iconNames.get(n)}`);
  }
}

if (problems.length) {
  for (const p of problems) console.error(`✗ ${p}`);
  console.error(`\nbuild failed: ${problems.length} problem(s)`);
  process.exit(1);
}

// Variants that draw the same thing (a framed drawing, a cropped symbol) share one optimization.
const cache = new Map<string, Variant['nodes']>();
const limits = new Map<string, number | undefined>();
const optimized = (v: Variant, where: string): Variant => {
  const key = JSON.stringify(v.nodes);
  if (!cache.has(key)) cache.set(key, optimizeGlyph(sourceSvg(v.nodes, `${v.x} 0 ${v.width} 24`), where));
  const nodes = cache.get(key)!;
  if (!limits.has(key)) limits.set(key, maxStroke(nodes));
  const limit = limits.get(key);
  return { ...v, nodes, ...(limit === undefined ? {} : { maxStroke: limit }) };
};

const built: Built[] = glyphs.map((glyph) => {
  const where = `${glyph.tagset.id}/${glyph.name}`;
  return { glyph, ...(glyph.fixed ? { fixed: optimized(glyph.fixed, `${where} (fixed)`) } : {}), hug: optimized(glyph.hug, `${where} (hug)`) };
});

const weighed = performance.now();
const icons: BuiltIcon[] = lucide.icons.map((icon) => {
  const limit = maxStroke(icon.nodes);
  return { icon, ...(limit === undefined ? {} : { maxStroke: limit }) };
});

// Start clean, buildinfo included: tsc -b keeps it beside tsconfig.json, and
// a buildinfo that outlives its dist makes tsc skip the emit.
for (const pkg of ['vanilla', 'react', 'vue', 'react-native']) {
  for (const p of ['dist', 'src/generated', 'tsconfig.tsbuildinfo']) rmSync(join(ROOT, 'packages', pkg, p), { recursive: true, force: true });
}

const { version } = JSON.parse(readFileSync(join(ROOT, 'packages/vanilla/package.json'), 'utf8')) as { version: string };
emitAll(tagsets, built, icons, { version, lucide: lucide.version });

const hugOnly = built.filter((b) => !b.fixed);
const clamped = icons.filter((b) => b.maxStroke !== undefined);
console.log(`built ${icons.length} Lucide ${lucide.version} icons (${icons.reduce((n, b) => n + b.icon.aliases.length, 0)} aliases) and ${built.length} glyphs in ${tagsets.length} tagsets (${tagsets.map((t) => `${t.id} ${glyphs.filter((g) => g.tagset === t).length}`).join(', ')})`);
console.log(`weights: ${icons.length - clamped.length} icons take every weight, ${clamped.filter((b) => b.maxStroke === 2).length} stay at regular, the rest stop between (${Math.round(performance.now() - weighed)}ms)`);
console.log(`hug only (${hugOnly.length}): ${hugOnly.map((b) => b.glyph.id).join(', ')}`);
console.log(`${cache.size} distinct glyph drawings optimized; done in ${Math.round(performance.now() - started)}ms`);
