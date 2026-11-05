// react-native for tests in Node: just enough Animated for React DOM's server renderer to print what a
// native animated icon draws. Animated values are numbers you can read (interpolation included), an
// animated component renders its values as they are now, and timings jump to their end.
import { createElement, forwardRef } from 'react';

class Node {
  get() {
    return 0;
  }
  interpolate({ inputRange, outputRange, extrapolate }) {
    return new Interpolation(this, inputRange, outputRange, extrapolate);
  }
}

class Value extends Node {
  constructor(v) {
    super();
    this.v = v;
  }
  get() {
    return this.v;
  }
  setValue(v) {
    this.v = v;
  }
  stopAnimation(cb) {
    cb?.(this.v);
  }
}

const mix = (a, b, f) => {
  if (typeof a === 'number') return a + (b - a) * f;
  // Strings with numbers in them (`10deg`, a path): mix each number.
  const nb = String(b).match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  let i = 0;
  return String(a).replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, (m) => String(Number(m) + (Number(nb[i++] ?? m) - Number(m)) * f));
};

class Interpolation extends Node {
  constructor(parent, input, output, extrapolate) {
    super();
    Object.assign(this, { parent, input, output, extrapolate });
  }
  get() {
    const x = read(this.parent);
    const { input, output } = this;
    if (x <= input[0]) return output[0];
    if (x >= input[input.length - 1]) return output[output.length - 1];
    let i = 0;
    while (i < input.length - 2 && x > input[i + 1]) i++;
    const f = (x - input[i]) / (input[i + 1] - input[i] || 1);
    return mix(output[i], output[i + 1], f);
  }
}

class Op extends Node {
  constructor(fn, a, b) {
    super();
    Object.assign(this, { fn, a, b });
  }
  get() {
    return this.fn(read(this.a), read(this.b));
  }
}

const read = (v) => (v instanceof Node ? v.get() : v);
const resolve = (v) => (v instanceof Node ? v.get() : Array.isArray(v) ? v.map(resolve) : v && typeof v === 'object' && !v.$$typeof ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)])) : v);

export const Animated = {
  Value,
  timing: (value, { toValue }) => ({ start: (cb) => (value.setValue(toValue), cb?.({ finished: true })), stop() {} }),
  loop: (a) => a,
  add: (a, b) => new Op((x, y) => x + y, a, b),
  subtract: (a, b) => new Op((x, y) => x - y, a, b),
  multiply: (a, b) => new Op((x, y) => x * y, a, b),
  createAnimatedComponent: (C) => forwardRef((props, ref) => createElement(C, { ...resolve(props), ref })),
  View: forwardRef(({ style, children }, ref) => createElement('div', { ref, 'data-view': JSON.stringify(resolve(style)) }, children)),
};
export const Easing = { linear: (t) => t, quad: (t) => t * t, out: (f) => (t) => 1 - f(1 - t), in: (f) => f, inOut: (f) => (t) => (t < 0.5 ? f(2 * t) / 2 : 1 - f(2 * (1 - t)) / 2) };
export const AccessibilityInfo = { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove() {} }) };
export default { Animated, Easing, AccessibilityInfo };
