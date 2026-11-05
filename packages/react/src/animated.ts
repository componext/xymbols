/**
 * xymbols-react/animated: every icon, animated. Each one takes its own animation (from UNA or
 * lucide-animated, mapped onto Lucide's current drawing) as `effect="auto"`, and the generic effects every
 * icon takes. Same names and props as the static entry, plus `effect`, `trigger`, `active` and a ref handle.
 *
 *   import { Bell } from 'xymbols-react/animated';
 *   <Bell />                                  // its own animation on hover
 *   <Bell effect="bounce" trigger="group-hover" active={unread} />
 *   ref.current?.play('wiggle');              // or startAnimation()
 */
export * from './generated/animated/index.js';
export { AnimatedIcon, createAnimatedIcon, createUnaIcon } from './createAnimatedIcon.js';
export type { AnimatedIcon as AnimatedIconComponent, AnimatedIconHandle, AnimatedIconProps } from './createAnimatedIcon.js';
export { EFFECTS, EFFECT_NAMES, fromUnaSpec } from './generated/motion.js';
export type { AnimatedIconData, Effect, GenericEffect, Motion, Part, Scenes, Track, UnaSpec } from './generated/motion.js';
export type { Trigger } from './generated/animate.js';
export { ANIMATE_CSS } from './generated/styles.js';
export { XymbolsProvider, LucideProvider, useXymbolsContext, useLucideContext } from './createIcon.js';
