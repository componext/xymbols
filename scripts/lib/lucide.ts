/**
 * Lucide, read from the pinned lucide-static devDependency (Dependabot bumps
 * it): every icon's node data, its aliases and its tags.
 *
 * node_modules/lucide-static/icon-nodes.json   kebab name → node data
 * node_modules/lucide-static/tags.json         kebab name → search tags
 * node_modules/lucide-static/icons/*.svg       one file per name, aliases included
 * node_modules/lucide-static/dist/*.d.ts       `Canonical as Alias` in its export list
 * node_modules/lucide-react/dist/esm/icons/    the order of each icon's aliases
 *
 * Nothing here is redrawn or optimized: xymbols ships Lucide's geometry byte
 * for byte, so a xymbols icon at regular weight is a lucide-react icon.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, pascal, type Node } from './source.ts';

export const LUCIDE_DIR = join(ROOT, 'node_modules/lucide-static');

export interface IconAlias {
  /** `home` */
  name: string;
  /** `Home` */
  component: string;
}

export interface Icon {
  /** Lucide's kebab-case name: `house`. Also the CSS class suffix and sprite id. */
  name: string;
  /** `House`; exported as `House`, `HouseIcon` and `LucideHouse`. */
  component: string;
  nodes: Node[];
  aliases: IconAlias[];
  tags: string[];
}

/** Every name an icon is exported under, as lucide-react spells them. */
export const exportNames = (component: string) => [component, `${component}Icon`, `Lucide${component}`];

export function lucideVersion(): string {
  return (JSON.parse(readFileSync(join(LUCIDE_DIR, 'package.json'), 'utf8')) as { version: string }).version;
}

/** `Canonical as Alias` pairs from the export list of lucide-static's type declarations. */
function aliasTargets(): Map<string, string> {
  const dts = readdirSync(join(LUCIDE_DIR, 'dist')).find((f) => f.endsWith('.d.ts'));
  if (!dts) throw new Error('lucide-static: no type declarations to read aliases from');
  const text = readFileSync(join(LUCIDE_DIR, 'dist', dts), 'utf8');
  const list = /export\s*\{([^}]*)\}\s*;?\s*$/.exec(text.trim())?.[1];
  if (!list) throw new Error(`lucide-static: no export list in dist/${dts}`);
  const out = new Map<string, string>();
  for (const entry of list.split(',')) {
    const m = /^\s*(\w+)\s+as\s+(\w+)\s*$/.exec(entry);
    if (m && m[1] !== m[2]) out.set(m[2]!, m[1]!);
  }
  return out;
}

/** An icon's aliases as lucide-react's icon module lists them. */
function lucideReactAliases(name: string): string[] {
  const module = readFileSync(join(ROOT, 'node_modules/lucide-react/dist/esm/icons', `${name}.mjs`), 'utf8');
  const list = /\baliases:\s*(\[[^\]]*\])/.exec(module)?.[1];
  return list ? (JSON.parse(list) as string[]) : [];
}

export function loadIcons(): { icons: Icon[]; version: string; problems: string[] } {
  const problems: string[] = [];
  const nodes = JSON.parse(readFileSync(join(LUCIDE_DIR, 'icon-nodes.json'), 'utf8')) as Record<string, [string, Record<string, string | number>][]>;
  const tags = JSON.parse(readFileSync(join(LUCIDE_DIR, 'tags.json'), 'utf8')) as Record<string, string[]>;
  const targets = aliasTargets();

  const icons = new Map<string, Icon>();
  const byComponent = new Map<string, Icon>();
  for (const [name, node] of Object.entries(nodes)) {
    const icon: Icon = {
      name,
      component: pascal(name),
      // Lucide's nodes carry a React `key`; geometry is everything else, as strings.
      nodes: node.map(([tag, a]): Node => [tag, Object.fromEntries(Object.entries(a).filter(([k]) => k !== 'key').map(([k, v]) => [k, String(v)]))]),
      aliases: [],
      tags: tags[name] ?? [],
    };
    icons.set(name, icon);
    byComponent.set(icon.component, icon);
  }

  // An alias is a file in icons/ with no node data of its own; the export list says whose it is.
  // A few aliases only respell the kebab name (`arrow-down-01` for `arrow-down-0-1`): same
  // component name, so they add a class and a dynamic name but no export.
  const files = readdirSync(join(LUCIDE_DIR, 'icons')).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4));
  for (const name of files) {
    if (icons.has(name)) continue;
    const component = pascal(name);
    const target = byComponent.get(targets.get(component) ?? component);
    if (!target) {
      problems.push(`lucide: icons/${name}.svg is neither an icon nor a known alias (${component})`);
      continue;
    }
    target.aliases.push({ name, component });
  }

  // Aliases become classes, in Lucide's own order (`lucide-parking-circle lucide-circle-parking`),
  // which only the framework packages record: take it from the pinned lucide-react.
  for (const icon of icons.values()) {
    const order = lucideReactAliases(icon.name);
    const known = new Set(icon.aliases.map((a) => a.name));
    if (order.length !== known.size || order.some((a) => !known.has(a))) {
      problems.push(`lucide: ${icon.name} has aliases ${[...known].join(', ') || 'none'} in lucide-static but ${order.join(', ') || 'none'} in lucide-react; are the two pinned to one version?`);
      continue;
    }
    icon.aliases.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }
  return { icons: [...icons.values()].sort((a, b) => a.name.localeCompare(b.name)), version: lucideVersion(), problems };
}
