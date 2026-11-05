// motion/react for the importer: motion.<tag> marks an element as animated, and useAnimation's controls
// log each start(label). Starts made in the same tick share a group; a start made after awaiting
// another begins a new group, which plays after the previous one. See ../lucide-animated.ts.
const rec = (globalThis.__xymbolsMotion ??= { log: [], controls: 0, open: false, group: 0 });
const group = () => {
  if (!rec.open) {
    rec.group += 1;
    rec.open = true;
    queueMicrotask(() => {
      rec.open = false;
    });
  }
  return rec.group;
};
export const motion = new Proxy({}, { get: (_, tag) => ({ $$motion: String(tag) }) });
export const m = motion;
export function useAnimation() {
  const controls = {
    $$controls: (rec.controls += 1),
    start(label) {
      rec.log.push({ controls, label, group: group() });
      return Promise.resolve();
    },
    stop() {},
    set(values) {
      rec.log.push({ controls, set: values, group: group() });
    },
    mount() {},
  };
  return controls;
}
export const useAnimationControls = useAnimation;
export const AnimatePresence = ({ children }) => children;
export const MotionConfig = ({ children }) => children;
export const LayoutGroup = ({ children }) => children;
export const useReducedMotion = () => false;
export const cubicBezier = (a, b, c, d) => ({ $$bezier: [a, b, c, d] });
export const easeIn = 'easeIn';
export const easeOut = 'easeOut';
export const easeInOut = 'easeInOut';
export const circIn = 'circIn';
export const circOut = 'circOut';
export const circInOut = 'circInOut';
export const backIn = 'backIn';
export const backOut = 'backOut';
export const backInOut = 'backInOut';
export const anticipate = 'anticipate';
export const linear = 'linear';
