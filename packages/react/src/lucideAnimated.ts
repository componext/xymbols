import { createElement, forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import type { ForwardRefExoticComponent, HTMLAttributes, MouseEvent, RefAttributes } from 'react';
import { AnimatedIcon } from './createAnimatedIcon.js';
import type { AnimatedIconHandle } from './createAnimatedIcon.js';
import type { IconData } from './generated/icon.js';
import type { AnimatedIconData, Motion } from './generated/motion.js';

/** lucide-animated's handle: the ref of every icon in `xymbols-react/lucide-animated`. */
export interface LucideAnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

/** lucide-animated's props: the wrapping `<div>`'s, plus `size` and `animateOnHover`. */
export interface LucideAnimatedIconProps extends HTMLAttributes<HTMLDivElement> {
  /** Default 28, as lucide-animated. */
  size?: number;
  /** Default true. A ref takes over: with one attached, only startAnimation and stopAnimation play it. */
  animateOnHover?: boolean;
}

export type LucideAnimatedIcon = ForwardRefExoticComponent<LucideAnimatedIconProps & RefAttributes<LucideAnimatedIconHandle>>;

/**
 * A lucide-animated icon, behaving as lucide-animated's own: a `<div>` that takes `className` and the mouse
 * handlers, an `<svg>` at `size` 28, hover playing it unless a ref is attached. It draws today's Lucide
 * geometry with lucide-animated's animation mapped onto it.
 */
export function createLucideAnimatedIcon(iconData: IconData, motion?: Motion): LucideAnimatedIcon {
  const icon: AnimatedIconData = motion ? { ...iconData, motion } : iconData;
  const Component = forwardRef<LucideAnimatedIconHandle, LucideAnimatedIconProps>(function Component(
    { onMouseEnter, onMouseLeave, className, size = 28, animateOnHover = true, ...props },
    ref,
  ) {
    const inner = useRef<AnimatedIconHandle>(null);
    const controlled = useRef(false);
    useImperativeHandle(ref, () => {
      controlled.current = true;
      return { startAnimation: () => inner.current?.play(), stopAnimation: () => inner.current?.stop() };
    });
    const enter = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (!controlled.current && animateOnHover) inner.current?.play();
        else onMouseEnter?.(e);
      },
      [onMouseEnter, animateOnHover],
    );
    const leave = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (controlled.current) onMouseLeave?.(e);
        else inner.current?.stop();
      },
      [onMouseLeave],
    );
    return createElement(
      'div',
      { className, onMouseEnter: enter, onMouseLeave: leave, ...props },
      createElement(AnimatedIcon, { ref: inner, icon, size, trigger: 'manual', strokeWidth: 2 }),
    );
  });
  return Component;
}
