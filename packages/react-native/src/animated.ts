/**
 * xymbols-react-native/animated: every icon, animated with react-native-svg and RN Animated, UNA's way.
 * Each one takes its own animation (from UNA or lucide-animated, mapped onto Lucide's current drawing) as
 * `effect="auto"`, and the generic effects every icon takes. By default it plays once when `active` turns on
 * (a tab chosen); `pressed` gives UNA's press feedback. Reduce Motion keeps the active state and drops the
 * movement.
 *
 *   import { Bell } from 'xymbols-react-native/animated';
 *   <Bell active={focused} pressed={pressed} />
 */
export * from './generated/animated/index.js';
export { AnimatedIcon, createAnimatedIcon, createUnaIcon } from './createAnimatedIcon.js';
export type { AnimatedIcon as AnimatedIconComponent, AnimatedIconHandle, AnimatedIconProps, Trigger } from './createAnimatedIcon.js';
export { EFFECTS, EFFECT_NAMES, fromUnaSpec } from './generated/motion.js';
export type { AnimatedIconData, Effect, GenericEffect, Motion, Part, Scenes, Track, UnaSpec } from './generated/motion.js';
export { XymbolsProvider, LucideProvider, useXymbolsContext, useLucideContext } from './createIcon.js';
