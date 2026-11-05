/**
 * UNA's animated icons, the second upstream. The repository is a submodule at
 * upstream/una, but only one folder of it is ever fetched: a blob-less,
 * shallow, sparse clone of neo/packages/app/ui/atoms/animated-icons at the
 * commit the submodule pins (about 11 MB instead of UNA's 576). Dependabot
 * bumps the pin; the build fetches what it points to.
 *
 * Each UNA spec names a Lucide component and carries its own copy of the
 * nodes. The importer finds each of them in the current Lucide drawing, so the
 * animated icon draws Lucide's geometry, never UNA's copy; a spec drawn for an
 * older Lucide is left out and reported.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { unaMotion, type Motion, type UnaSpec } from '../runtime/motion.ts';
import type { Icon } from './lucide.ts';
import { ROOT } from './source.ts';

export const UNA_DIR = join(ROOT, 'upstream/una');
export const UNA_FOLDER = 'neo/packages/app/ui/atoms/animated-icons';
const UNA_ICONS = join(UNA_DIR, UNA_FOLDER);

const git = (args: readonly string[], cwd = ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** The UNA commit the submodule pins, from the superproject's index. */
export function unaPin(): string {
  const line = git(['ls-files', '-s', 'upstream/una']);
  const sha = line.split(/\s+/)[1];
  if (!sha) throw new Error('upstream/una is not a submodule: run git submodule status');
  return sha;
}

function unaUrl(): string {
  return git(['config', '-f', '.gitmodules', 'submodule.upstream/una.url']);
}

/** Fetch UNA's animated-icons folder at the pinned commit, unless it's there already. Returns the commit. */
export function ensureUna(log: (s: string) => void = () => {}): string {
  const sha = unaPin();
  const fetched = existsSync(join(UNA_DIR, '.git')) && existsSync(join(UNA_ICONS, 'specs.ts'));
  if (fetched && git(['rev-parse', 'HEAD'], UNA_DIR) === sha) return sha;
  if (existsSync(UNA_DIR) && readdirSync(UNA_DIR).length && !existsSync(join(UNA_DIR, '.git'))) {
    throw new Error(`${UNA_DIR} has files but no git checkout; move them away and build again`);
  }
  log(`fetching UNA ${sha.slice(0, 10)} (${UNA_FOLDER} only)`);
  if (!existsSync(join(UNA_DIR, '.git'))) {
    git(['init', '-q', UNA_DIR]);
    git(['remote', 'add', 'origin', unaUrl()], UNA_DIR);
    git(['sparse-checkout', 'set', '--no-cone', `/${UNA_FOLDER}/`], UNA_DIR);
  }
  git(['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', sha], UNA_DIR);
  git(['checkout', '-q', '--detach', 'FETCH_HEAD'], UNA_DIR);
  return sha;
}

export interface UnaIcon {
  /** UNA's key: a Lucide component name, or one of its aliases. */
  key: string;
  icon: Icon;
  motion: Motion;
}

type Node = readonly [string, Readonly<Record<string, string | number>>];
const same = (a: Node, b: readonly [string, Readonly<Record<string, string>>]) => {
  if (a[0] !== b[0]) return false;
  const ka = Object.keys(a[1]);
  return ka.length === Object.keys(b[1]).length && ka.every((k) => String(a[1][k]) === b[1][k]);
};

/** UNA's specs, mapped onto the current Lucide drawings. */
export async function loadUna(icons: readonly Icon[]): Promise<{ sha: string; icons: UnaIcon[]; dropped: string[]; problems: string[] }> {
  const sha = ensureUna((s) => console.log(s));
  // specs.ts imports only types, so Node runs it as it is.
  const { specs } = (await import(pathToFileURL(join(UNA_ICONS, 'specs.ts')).href)) as { specs: Record<string, UnaSpec> };
  const byComponent = new Map<string, Icon>();
  for (const icon of icons) for (const c of [icon.component, ...icon.aliases.map((a) => a.component)]) byComponent.set(c, icon);

  const out: UnaIcon[] = [];
  const dropped: string[] = [];
  const problems: string[] = [];
  for (const [key, spec] of Object.entries(specs)) {
    const icon = byComponent.get(key);
    if (!icon) {
      problems.push(`UNA's ${key} is not a Lucide ${JSON.parse(readFileSync(join(ROOT, 'node_modules/lucide-static/package.json'), 'utf8')).version} icon`);
      continue;
    }
    const taken = new Set<number>();
    const indexes = spec.parts.map((part) =>
      part.nodes.map((node) => {
        const i = icon.nodes.findIndex((n, j) => !taken.has(j) && same(node, n));
        if (i >= 0) taken.add(i);
        return i;
      }),
    );
    if (indexes.flat().some((i) => i < 0)) {
      dropped.push(`${key}: drawn for an older Lucide; not animated until UNA's spec is updated`);
      continue;
    }
    out.push({ key, icon, motion: unaMotion(spec, indexes) });
  }
  return { sha, icons: out, dropped, problems };
}
