/**
 * xymbols-vue/animated: every icon, animated. Each one takes its own animation (from UNA or lucide-animated,
 * mapped onto Lucide's current drawing) as `effect="auto"`, and the generic effects every icon takes.
 *
 *   <Bell effect="bounce" trigger="group-hover" :active="unread" ref="bell" />
 *   bell.value.play('wiggle')
 */
export * from './generated/animated/index.js';
export { createAnimatedIcon, createUnaIcon } from './createAnimatedIcon.js';
export type { AnimatedIcon, AnimatedIconHandle, AnimatedIconProps } from './createAnimatedIcon.js';
export { EFFECTS, EFFECT_NAMES, fromUnaSpec } from './generated/motion.js';
export type { AnimatedIconData, Effect, GenericEffect, Motion, Part, Scenes, Track, UnaSpec } from './generated/motion.js';
export type { Trigger } from './generated/animate.js';
export { ANIMATE_CSS } from './generated/styles.js';
