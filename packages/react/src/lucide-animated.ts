/**
 * xymbols-react/lucide-animated: a drop-in for lucide-animated. The same exports (`BellIcon`,
 * `BellIconHandle`, ...) with the same defaults (a wrapping `<div>`, size 28, `animateOnHover`), drawing
 * Lucide's current geometry with lucide-animated's animations mapped onto it. Switch with one import change:
 *
 *   import { BellIcon } from 'xymbols-react/lucide-animated';
 */
export * from './generated/lucide-animated.js';
export { createLucideAnimatedIcon } from './lucideAnimated.js';
export type { LucideAnimatedIcon, LucideAnimatedIconHandle, LucideAnimatedIconProps } from './lucideAnimated.js';
