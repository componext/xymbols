/**
 * Motion's spring, solved at build time into a curve both engines can play
 * without a physics step: progress samples (which may overshoot past 1) and a
 * duration. A port of motion-dom 14's spring generator: stiffness, damping and
 * mass, or a duration and bounce solved into them; the analytical position and
 * velocity of an under-, critically or overdamped spring; the same rest
 * thresholds; and the same 50 ms steps when finding where it settles. The
 * tests check it against motion-dom itself.
 */

export interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  /** Seconds, as Motion's transitions write it. */
  duration?: number;
  bounce?: number;
  /** Seconds. */
  visualDuration?: number;
  velocity?: number;
  restSpeed?: number;
  restDelta?: number;
}

const DEFAULT = { stiffness: 100, damping: 10, mass: 1, duration: 800, bounce: 0.3 };
const MIN_DURATION = 0.01;
const MAX_DURATION = 10;
const MIN_DAMPING = 0.05;
const SAFE_MIN = 0.001;
const clamp = (lo: number, hi: number, v: number) => Math.min(hi, Math.max(lo, v));
const angular = (undamped: number, ratio: number) => undamped * Math.sqrt(1 - ratio * ratio);
const bounceToRatio = (bounce: number) => (bounce < 0 ? 1 / Math.max(1 + bounce, MIN_DAMPING) : Math.max(1 - bounce, MIN_DAMPING));

function approximateRoot(envelope: (x: number) => number, derivative: (x: number) => number, guess: number) {
  let x = guess;
  for (let i = 1; i < 12; i++) x -= envelope(x) / derivative(x);
  return x;
}

function overdampedFreqScale(ratio: number, criticalFreqTime: number) {
  if (!(ratio > 1)) return 1;
  const root = Math.sqrt(ratio * ratio - 1);
  const slow = ratio - root;
  const fast = ratio + root;
  const target = 2 * root * Math.exp(-criticalFreqTime) * (1 + criticalFreqTime);
  return (
    approximateRoot(
      (f) => fast * Math.exp(-slow * f) - slow * Math.exp(-fast * f) - target,
      (f) => Math.exp(-fast * f) - Math.exp(-slow * f),
      criticalFreqTime,
    ) / criticalFreqTime
  );
}

/** A stiffness and damping that settle in `durationMs` with `bounce` (motion-dom findSpring). */
function findSpring(durationMs: number, bounce: number) {
  const ratio = bounceToRatio(bounce);
  const duration = clamp(MIN_DURATION, MAX_DURATION, durationMs / 1000);
  let envelope: (f: number) => number;
  let derivative: (f: number) => number;
  if (ratio < 1) {
    envelope = (f) => {
      const decay = f * ratio;
      return SAFE_MIN - (decay / angular(f, ratio)) * Math.exp(-decay * duration);
    };
    derivative = (f) => {
      const decay = f * ratio;
      const e = ratio * ratio * f * f * duration;
      const g = angular(f * f, ratio);
      const factor = -envelope(f) + SAFE_MIN > 0 ? -1 : 1;
      return (factor * -e * Math.exp(-decay * duration)) / g;
    };
  } else {
    envelope = (f) => -SAFE_MIN + Math.exp(-f * duration) * (f * duration + 1);
    derivative = (f) => Math.exp(-f * duration) * (-f * duration * duration);
  }
  const critical = approximateRoot(envelope, derivative, 5 / duration);
  const undamped = critical * overdampedFreqScale(ratio, critical * duration);
  const stiffness = undamped * undamped;
  return { stiffness, damping: ratio * 2 * Math.sqrt(stiffness), duration: duration * 1000 };
}

const valid = (v: number | undefined, zeroOk = false): v is number => v !== undefined && (zeroOk ? v >= 0 : v > 0) && v < Infinity;

/** A spring from 0 to `target`: position by ms, and whether it has settled. */
function generator(o: SpringOptions, target: number) {
  const timeDefined = !valid(o.stiffness) && !valid(o.damping, true) && !valid(o.mass) && (o.duration !== undefined || o.bounce !== undefined);
  let stiffness = valid(o.stiffness) ? o.stiffness : DEFAULT.stiffness;
  let damping = valid(o.damping, true) ? o.damping : DEFAULT.damping;
  const mass = valid(o.mass) ? o.mass : DEFAULT.mass;
  let resolvedDuration: number | undefined;
  if (timeDefined) {
    if (o.visualDuration) {
      const ratio = bounceToRatio(o.bounce || 0);
      const root = ((2 * Math.PI) / (o.visualDuration * 1.2)) * overdampedFreqScale(ratio, (2 * Math.PI) / 1.2);
      stiffness = root * root;
      damping = 2 * ratio * Math.sqrt(stiffness);
    } else {
      const found = findSpring((o.duration ?? DEFAULT.duration / 1000) * 1000, o.bounce ?? DEFAULT.bounce);
      ({ stiffness, damping } = found);
      resolvedDuration = found.duration;
    }
  }
  const v0 = timeDefined ? 0 : -(o.velocity ?? 0) / 1000 || 0;
  const ratio = damping / (2 * Math.sqrt(stiffness * mass));
  const undamped = Math.sqrt(stiffness / mass) / 1000;
  const decay = ratio * undamped;
  const delta = target;
  // Motion settles small moves (under 5: a few degrees, a scale) on tighter thresholds.
  const granular = Math.abs(delta) < 5;
  const restSpeed = o.restSpeed || (granular ? 0.01 : 2);
  const restDelta = o.restDelta || (granular ? 0.005 : 0.5);

  let at: (t: number) => number;
  let speed: (t: number) => number;
  if (ratio < 1) {
    const w = angular(undamped, ratio);
    const A = (v0 + decay * delta) / w;
    const sinC = decay * A + delta * w;
    const cosC = decay * delta - A * w;
    at = (t) => target - Math.exp(-decay * t) * (A * Math.sin(w * t) + delta * Math.cos(w * t));
    speed = (t) => Math.exp(-decay * t) * (sinC * Math.sin(w * t) + cosC * Math.cos(w * t));
  } else if (ratio === 1) {
    const C = v0 + undamped * delta;
    at = (t) => target - Math.exp(-undamped * t) * (delta + C * t);
    speed = (t) => Math.exp(-undamped * t) * (undamped * C * t - v0);
  } else {
    const wd = undamped * Math.sqrt(ratio * ratio - 1);
    const slow = decay - wd;
    const fast = decay + wd;
    const limit = wd < 1 || timeDefined ? Infinity : 300 / wd;
    const decayAt = (rate: number, t: number) => Math.exp(t > limit ? (decay - rate) * limit - decay * t : -rate * t);
    const P = (v0 + decay * delta) / wd;
    const S = (delta + P) / 2;
    const F = (delta - P) / 2;
    at = (t) => target - S * decayAt(slow, t) - F * decayAt(fast, t);
    speed = (t) => slow * S * decayAt(slow, t) + fast * F * decayAt(fast, t);
  }
  const done = (t: number) => (resolvedDuration !== undefined ? t >= resolvedDuration : Math.abs(speed(t) * 1000) <= restSpeed && Math.abs(target - at(t)) <= restDelta);
  return { at, done };
}

/**
 * A spring as a sampled curve: `samples` of progress (0 to 1, overshoot included) over `ms`. `distance` is how
 * far the value moves: Motion runs transforms on their own values, and hands opacity and the like to the Web
 * Animations API as a spring from 0 to 100.
 */
export function springCurve(o: SpringOptions, distance = 100, steps = 60): { ms: number; samples: number[] } {
  const g = generator(o, distance);
  let ms = 0;
  while (!g.done(ms) && ms < 20_000) ms += 50;
  ms = Math.max(50, ms);
  const samples: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (ms * i) / steps;
    // Once settled, Motion's spring sits exactly on its target.
    samples.push(i === steps || g.done(t) ? 1 : Math.round((g.at(t) / distance) * 1e4) / 1e4);
  }
  return { ms, samples };
}
