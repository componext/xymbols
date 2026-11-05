/**
 * How heavy a drawing can go. Ink reaches half a stroke either side of a
 * centreline, so two separate strokes whose centrelines come within `d` of
 * each other keep `d - stroke` of air. The heaviest stroke that keeps 1px is
 * `d - 1` for the closest pair; that is the drawing's `maxStroke`.
 *
 * Strokes are compared per subpath. Subpaths that touch, directly or through
 * others, count as one stroke (the corner of an arrowhead fills in at heavy
 * weights, as SF Symbols' do), and one stroke is not compared with itself.
 *
 * It never drops below regular: at weight 2 a xymbols icon is the Lucide icon,
 * whatever its spacing.
 */
import { WEIGHTS } from '../runtime/weights.ts';
import { JOINED, samplePath, toPath, type Pt } from './spacing.ts';
import type { Node } from './source.ts';

/** Air every weight keeps between separate strokes. */
export const MIN_AIR = 1;
const HEAVIEST = WEIGHTS.black;
/** Centreline distances at or above this never limit a weight. */
const REACH = HEAVIEST + MIN_AIR;
/** Coarser than the spacing check: an error of 0.05 moves a clamp by as much, which no one can see. */
const STEP = 0.1;

type Run = { pts: Pt[]; box: [number, number, number, number] };

function run(pts: Pt[]): Run {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { pts, box: [x0, y0, x1, y1] };
}

const boxGap = (a: Run['box'], b: Run['box']) => Math.hypot(Math.max(0, a[0] - b[2], b[0] - a[2]), Math.max(0, a[1] - b[3], b[1] - a[3]));

/** Closest approach of two runs, or REACH if they never come that close. Grid-bucketed: only nearby cells are compared. */
function closest(a: Run, b: Run): number {
  // Cells are REACH wide, so any point nearer than REACH is in one of the 9 around it.
  // Keys pack the cell's column and row into one number (drawings span far fewer than 1000 cells).
  const cell = (v: number) => Math.floor(v / REACH) + 500;
  const grid = new Map<number, Pt[]>();
  for (const p of b.pts) {
    const k = cell(p[0]) * 1000 + cell(p[1]);
    const list = grid.get(k);
    if (list) list.push(p);
    else grid.set(k, [p]);
  }
  let best = REACH * REACH;
  for (const [x, y] of a.pts) {
    const k = cell(x) * 1000 + cell(y);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (const [u, v] of grid.get(k + i * 1000 + j) ?? []) {
          const d = (x - u) * (x - u) + (y - v) * (y - v);
          if (d < best) best = d;
        }
      }
    }
  }
  return Math.sqrt(best);
}

/**
 * The closest pair of separate strokes, centreline to centreline; REACH when
 * none come near. Touching is transitive: a K's lower leg meets its upper
 * diagonal, which meets the stem, so leg and stem are one stroke even where
 * they are 2 apart.
 */
export function closestStrokes(nodes: readonly Node[]): number {
  const runs = nodes.flatMap((n) => samplePath(toPath(n), STEP)).filter((pts) => pts.length > 0).map(run);
  const near: [number, number, number][] = [];
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      if (boxGap(runs[i]!.box, runs[j]!.box) >= REACH) continue;
      const d = closest(runs[i]!, runs[j]!);
      if (d < REACH) near.push([i, j, d]);
    }
  }
  const group = runs.map((_, i) => i);
  const find = (i: number): number => (group[i] === i ? i : (group[i] = find(group[i]!)));
  for (const [i, j, d] of near) if (d < JOINED) group[find(i)] = find(j);
  let best = REACH;
  for (const [i, j, d] of near) if (find(i) !== find(j) && d < best) best = d;
  return best;
}

/** The heaviest stroke the drawing takes, or undefined when it takes every weight. */
export function maxStroke(nodes: readonly Node[]): number | undefined {
  const limit = Math.floor((closestStrokes(nodes) - MIN_AIR) * 100) / 100;
  return limit >= HEAVIEST ? undefined : Math.max(WEIGHTS.regular, limit);
}
