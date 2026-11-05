/**
 * Fetch UNA's animated-icons folder at the commit the upstream/una submodule
 * pins (the build does this itself when it's missing).
 *
 *   node scripts/upstream-una.ts
 */
import { ensureUna, UNA_FOLDER } from './lib/una.ts';

const sha = ensureUna((s) => console.log(s));
console.log(`upstream/una at ${sha.slice(0, 10)}: ${UNA_FOLDER}`);
