// The part of react-native's types this package's source uses, so it builds without installing React
// Native. Apps type-check against their own react-native; nothing here is published.
declare module 'react-native' {
  import type { ComponentType } from 'react';

  type Numeric = Animated.AnimatedNode | number;
  export namespace Animated {
    class AnimatedNode {}
    interface InterpolationConfig {
      inputRange: readonly number[];
      outputRange: readonly number[] | readonly string[];
      extrapolate?: 'extend' | 'identity' | 'clamp';
    }
    class AnimatedInterpolation<T = number> extends AnimatedNode {
      interpolate(config: InterpolationConfig): AnimatedInterpolation<T>;
    }
    class Value extends AnimatedInterpolation<number> {
      constructor(value: number);
      setValue(value: number): void;
      stopAnimation(callback?: (value: number) => void): void;
    }
    interface CompositeAnimation {
      start(callback?: (result: { finished: boolean }) => void): void;
      stop(): void;
    }
    function timing(value: Value, config: { toValue: number; duration?: number; delay?: number; easing?: (t: number) => number; useNativeDriver: boolean }): CompositeAnimation;
    function loop(animation: CompositeAnimation): CompositeAnimation;
    function add(a: Numeric, b: Numeric): AnimatedInterpolation<number>;
    function subtract(a: Numeric, b: Numeric): AnimatedInterpolation<number>;
    function multiply(a: Numeric, b: Numeric): AnimatedInterpolation<number>;
    function createAnimatedComponent<T>(component: T): T;
    const View: ComponentType<Record<string, unknown>>;
  }
  type EasingFn = (t: number) => number;
  export const Easing: { linear: EasingFn; quad: EasingFn; out(f: EasingFn): EasingFn; in(f: EasingFn): EasingFn; inOut(f: EasingFn): EasingFn };
  export const AccessibilityInfo: {
    isReduceMotionEnabled?(): Promise<boolean>;
    addEventListener?(event: 'reduceMotionChanged', handler: (on: boolean) => void): { remove(): void };
  };
}
