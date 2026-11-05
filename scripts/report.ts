/**
 * What this build changes against the latest published xymbols: icons and
 * glyphs added, removed or redrawn, aliases added or removed, weight limits
 * moved, and the Lucide version. CI posts it on pull requests, and the
 * scheduled release uses it to decide whether (and how) an upstream update
 * releases itself.
 *
 *   node scripts/report.ts                        against xymbols@latest on npm
 *   node scripts/report.ts --base old.json        against a manifest on disk
 *   ... --markdown report.md --json report.json   also write them to files
 *
 * Run it after the build (it reads packages/vanilla/dist/manifest.json).
 * Breaking: a name someone may import is gone. Lucide keeps renamed icons as
 * aliases, so a rename alone is not breaking; a removed icon is.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT } from './lib/source.ts';

interface ManifestIcon {
  name: string;
  aliases?: string[];
  maxStroke?: number;
  geometry?: string;
}
interface ManifestGlyph {
  id: string;
  component: string;
  fixed: { geometry?: string } | null;
  hug: { geometry?: string };
}
interface Manifest {
  version: string;
  lucide?: string;
  icons?: ManifestIcon[];
  glyphs: ManifestGlyph[];
}

export interface Report {
  base: string;
  lucide: { from: string | null; to: string | null };
  icons: { added: string[]; removed: string[]; redrawn: string[]; aliasesAdded: string[]; aliasesRemoved: string[]; limitsMoved: string[] };
  glyphs: { added: string[]; removed: string[]; redrawn: string[] };
  breaking: boolean;
  bump: 'none' | 'patch' | 'minor';
}

const { values } = parseArgs({ options: { base: { type: 'string' }, markdown: { type: 'string' }, json: { type: 'string' } } });

/** The manifest of the latest xymbols on npm, or null before the first publish. */
function publishedManifest(): Manifest | null {
  const dir = mkdtempSync(join(tmpdir(), 'xymbols-report-'));
  try {
    const out = execFileSync('npm', ['pack', 'xymbols@latest', '--json', '--pack-destination', dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const [{ filename }] = JSON.parse(out) as [{ filename: string }];
    execFileSync('tar', ['-xzf', join(dir, filename), '-C', dir, 'package/dist/manifest.json']);
    return JSON.parse(readFileSync(join(dir, 'package/dist/manifest.json'), 'utf8')) as Manifest;
  } catch (e) {
    if (/E404|404 Not Found|is not in this registry/.test(String((e as { stderr?: string }).stderr ?? e))) return null;
    throw e;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const current = JSON.parse(readFileSync(join(ROOT, 'packages/vanilla/dist/manifest.json'), 'utf8')) as Manifest;
const base: Manifest | null = values.base ? (JSON.parse(readFileSync(values.base, 'utf8')) as Manifest) : publishedManifest();
const baseName = values.base ?? (base ? `xymbols@${base.version}` : 'nothing published yet');

const byName = <T>(list: readonly T[] | undefined, key: (t: T) => string) => new Map((list ?? []).map((t) => [key(t), t]));
const diff = <T>(before: Map<string, T>, after: Map<string, T>) => ({ added: [...after.keys()].filter((k) => !before.has(k)), removed: [...before.keys()].filter((k) => !after.has(k)) });

const iconsBefore = byName(base?.icons, (i) => i.name);
const iconsAfter = byName(current.icons, (i) => i.name);
const aliases = (m: Map<string, ManifestIcon>) => new Map([...m.values()].flatMap((i) => (i.aliases ?? []).map((a) => [a, i.name] as const)));
const icons = diff(iconsBefore, iconsAfter);
const aliasDiff = diff(aliases(iconsBefore), aliases(iconsAfter));
const kept = [...iconsAfter.keys()].filter((k) => iconsBefore.has(k));
// An icon renamed upstream keeps its old name as an alias: not gone, only moved.
const allNames = (m: Map<string, ManifestIcon>) => new Set([...m.keys(), ...aliases(m).keys()]);
const namesAfter = allNames(iconsAfter);
const gone = [...allNames(iconsBefore)].filter((n) => !namesAfter.has(n));

const glyphsBefore = byName(base?.glyphs, (g) => g.component);
const glyphsAfter = byName(current.glyphs, (g) => g.component);
const glyphs = diff(glyphsBefore, glyphsAfter);
const glyphGeometry = (g: ManifestGlyph) => `${g.fixed?.geometry ?? ''}/${g.hug.geometry ?? ''}`;

const report: Report = {
  base: baseName,
  lucide: { from: base?.lucide ?? null, to: current.lucide ?? null },
  icons: {
    added: icons.added,
    removed: icons.removed,
    redrawn: kept.filter((k) => iconsBefore.get(k)!.geometry !== iconsAfter.get(k)!.geometry),
    aliasesAdded: aliasDiff.added,
    aliasesRemoved: aliasDiff.removed,
    limitsMoved: kept.filter((k) => iconsBefore.get(k)!.maxStroke !== iconsAfter.get(k)!.maxStroke),
  },
  glyphs: {
    added: glyphs.added,
    removed: glyphs.removed,
    redrawn: [...glyphsAfter.keys()].filter((k) => glyphsBefore.has(k) && glyphGeometry(glyphsBefore.get(k)!) !== glyphGeometry(glyphsAfter.get(k)!)),
  },
  breaking: gone.length > 0 || glyphs.removed.length > 0,
  bump: 'none',
};
const additions = report.icons.added.length + report.icons.aliasesAdded.length + report.glyphs.added.length;
const changes = report.icons.redrawn.length + report.icons.limitsMoved.length + report.glyphs.redrawn.length + report.icons.removed.length + report.icons.aliasesRemoved.length;
report.bump = report.breaking || additions ? 'minor' : changes || report.lucide.from !== report.lucide.to ? 'patch' : 'none';

const list = (items: readonly string[], max = 40) => (items.length ? items.slice(0, max).map((i) => `\`${i}\``).join(', ') + (items.length > max ? `, and ${items.length - max} more` : '') : '');
const line = (label: string, items: readonly string[]) => (items.length ? [`- **${label} (${items.length}):** ${list(items)}`] : []);
const markdown = [
  `## Upstream report`,
  '',
  `Against ${report.base}. Lucide ${report.lucide.from ?? '(none)'} → ${report.lucide.to ?? '(none)'}.`,
  '',
  ...line('Icons added', report.icons.added),
  ...line('Icons removed', report.icons.removed),
  ...line('Icons redrawn', report.icons.redrawn),
  ...line('Aliases added', report.icons.aliasesAdded),
  ...line('Aliases removed', report.icons.aliasesRemoved),
  ...line('Weight limits moved', report.icons.limitsMoved),
  ...line('Glyphs added', report.glyphs.added),
  ...line('Glyphs removed', report.glyphs.removed),
  ...line('Glyphs redrawn', report.glyphs.redrawn),
  ...(additions + changes === 0 ? ['Nothing drawn changes.'] : []),
  '',
  report.breaking
    ? `**Breaking:** ${list([...gone, ...glyphs.removed])} would no longer be importable. This needs a person: it won't merge or release itself.`
    : `Nothing breaks. Next release: ${report.bump === 'none' ? 'none needed' : report.bump}.`,
  '',
].join('\n');

if (values.markdown) writeFileSync(values.markdown, markdown);
if (values.json) writeFileSync(values.json, JSON.stringify(report, null, 2) + '\n');
console.log(markdown);
