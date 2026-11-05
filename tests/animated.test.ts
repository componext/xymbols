import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseHTML } from 'linkedom';
import { calcGeneratorDuration, spring } from 'motion-dom';
import { createElement, createRef } from 'react';
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createSSRApp, h } from 'vue';
import type { Component } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { loadLucideAnimated } from '../scripts/lib/lucide-animated.ts';
import { loadIcons } from '../scripts/lib/lucide.ts';
import { springCurve } from '../scripts/lib/spring.ts';
import { loadUna } from '../scripts/lib/una.ts';
import { EFFECTS, UNA_MS, onceTrack, timesOf, unaTracks, valueAt, valueAtTime, type Track, type UnaSpec } from '../scripts/runtime/motion.ts';

const stub = (f: string) => pathToFileURL(fileURLToPath(new URL(`./stubs/${f}`, import.meta.url))).href;
const STUBS: Record<string, string> = { 'react-native-svg': stub('react-native-svg.mjs'), 'react-native': stub('react-native.mjs') };
registerHooks({ resolve: (specifier, context, next) => (STUBS[specifier] ? { url: STUBS[specifier], shortCircuit: true } : next(specifier, context)) });

const react = await import('xymbols-react');
const reactAnimated = await import('xymbols-react/animated');
const reactLA = await import('xymbols-react/lucide-animated');
const vue = await import('xymbols-vue');
const vueAnimated = await import('xymbols-vue/animated');
const native = await import('xymbols-react-native');
const nativeAnimated = await import('xymbols-react-native/animated');
const vanilla = await import('xymbols/animated');

const html = (C: unknown, props: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(C as ComponentType, props));
const vueHtml = (C: unknown, props: Record<string, unknown> = {}) => renderToString(createSSRApp({ render: () => h(C as Component, props) }));

/** The shapes a drawing draws, in order, with what an animated icon adds to them taken off. */
const shapes = (markup: string) =>
  [...markup.matchAll(/<(path|circle|rect|line|ellipse|polyline|polygon)\b([^>]*?)\/?>/g)].map(([, tag, attrs]) => {
    const kept = [...attrs!.matchAll(/([\w-:]+)="([^"]*)"/g)].filter(([, k]) => !/^(data-|fill$|fill-opacity|fillopacity)/i.test(k!)).map(([, k, v]) => `${k}=${v}`);
    return `${tag} ${kept.sort().join(' ')}`;
  });
const root = (markup: string) => /<svg([^>]*)>/.exec(markup)![1]!.replace(/ data-[\w-]+="[^"]*"/g, '');

test('springs settle and curve as Motion\'s own', () => {
  const cases: [Record<string, number>, number][] = [
    [{ stiffness: 50, damping: 10 }, 180],
    [{ stiffness: 500, damping: 25, restSpeed: 10 }, 10],
    [{ stiffness: 300, damping: 15, mass: 1 }, 1],
    [{ bounce: 0.5, duration: 0.6 }, 100],
    [{ stiffness: 550, damping: 30, restSpeed: 10 }, 0.2],
    [{ stiffness: 100, damping: 40 }, 24],
    [{ visualDuration: 0.4, bounce: 0.25 }, 100],
  ];
  for (const [o, distance] of cases) {
    const ours = springCurve(o, distance);
    const motionOptions = { ...o, ...(o.duration ? { duration: o.duration * 1000 } : {}), keyframes: [0, distance] };
    const theirs = spring(motionOptions as never);
    assert.equal(ours.ms, calcGeneratorDuration(theirs), JSON.stringify(o));
    ours.samples.forEach((s, i) => {
      const t = (ours.ms * i) / (ours.samples.length - 1);
      const v = i === ours.samples.length - 1 ? distance : (theirs.next(t).value as number);
      assert.ok(Math.abs(s - v / distance) < 0.002, `${JSON.stringify(o)} at ${t}ms: ${s} vs ${v / distance}`);
    });
  }
});

// UNA's engines, ported as fixtures: the web .nai keyframes and durations, and the native engine's
// one-shot keyframes and durations (neo/packages/app/ui/atoms/animated-icons).
const UNA_WEB: Record<string, (m: Record<string, number>) => { times: number[]; values: number[] }[]> = {
  rotate: (m) => [{ times: [0, 1], values: [0, m.deg!] }],
  shift: (m) => [...(m.x ? [{ times: [0, 1], values: [0, m.x] }] : []), ...(m.y ? [{ times: [0, 1], values: [0, m.y] }] : [])],
  swing: (m) => [{ times: [0, 0.45, 1], values: [0, m.deg!, 0] }],
  wiggle: (m) => [{ times: [0, 0.2, 0.45, 0.7, 0.88, 1], values: [0, -m.deg!, m.deg! * 0.7, -m.deg! * 0.35, m.deg! * 0.1, 0] }],
  lift: (m) => [...((m.x ?? 0) ? [{ times: [0, 0.4, 1], values: [0, m.x!, 0] }] : []), ...((m.y ?? -1.5) ? [{ times: [0, 0.4, 1], values: [0, m.y ?? -1.5, 0] }] : [])],
  pulse: (m) => [{ times: [0, 0.45, 1], values: [1, m.scale!, 1] }],
  draw: () => [{ times: [0, 1], values: [0, 1] }],
  appear: () => [{ times: [0, 1], values: [0.15, 1] }],
};
const UNA_NATIVE_MS: Record<string, number> = { rotate: 350, shift: 350, swing: 450, wiggle: 500, lift: 400, pulse: 350, appear: 200 };
const UNA_NATIVE: Record<string, (m: Record<string, number>) => [number, number][]> = {
  rotate: (m) => [[0, 0], [0.45, m.deg!], [1, 0]],
  swing: (m) => [[0, 0], [0.45, m.deg!], [1, 0]],
  wiggle: (m) => [[0, 0], [0.2, -m.deg!], [0.45, m.deg! * 0.7], [0.7, -m.deg! * 0.35], [0.88, m.deg! * 0.1], [1, 0]],
  lift: () => [[0, 0], [0.4, 1], [1, 0]],
  shift: () => [[0, 0], [0.4, 1], [1, 0]],
  pulse: (m) => [[0, 1], [0.45, m.scale!], [1, 1]],
  appear: () => [[0, 0.15], [1, 1]],
};

test("UNA's 35 specs play UNA's keyframes and durations, on the web and once on native", async () => {
  const { icons } = loadIcons();
  const una = await loadUna(icons);
  assert.equal(una.icons.length, 35);
  assert.deepEqual(una.dropped, []);
  const { specs } = (await import(pathToFileURL(fileURLToPath(new URL('../upstream/una/neo/packages/app/ui/atoms/animated-icons/specs.ts', import.meta.url))).href)) as { specs: Record<string, UnaSpec> };
  for (const [key, spec] of Object.entries(specs)) {
    const tracks = unaTracks(spec);
    let moving = 0;
    spec.parts.forEach((part, p) => {
      const m = part.motion as unknown as (Record<string, number> & { kind: string }) | undefined;
      if (!m) return;
      const delay = part.delay ?? (spec.stagger ?? 0) * moving++;
      const mine = tracks.filter((t) => t.part === p);
      const web = UNA_WEB[m.kind]!(m);
      assert.equal(mine.length, web.length, `${key} part ${p}`);
      mine.forEach((t, i) => {
        assert.deepEqual(timesOf(t), web[i]!.times, `${key} part ${p} times`);
        assert.deepEqual(t.values.map((v) => +v.toFixed(6)), web[i]!.values.map((v) => +v.toFixed(6)), `${key} part ${p} values`);
        assert.equal(t.ms, m.ms ?? UNA_MS[m.kind as keyof typeof UNA_MS], `${key} part ${p} ms`);
        assert.equal(t.delay ?? 0, delay, `${key} part ${p} delay`);
        // Native plays every motion once, there and back. (UNA's native skips draw; ours plays it as a fade.)
        if (m.kind === 'draw') return;
        const once = onceTrack(t);
        const frames = UNA_NATIVE[m.kind]!(m);
        assert.equal(once.ms, m.ms ?? UNA_NATIVE_MS[m.kind], `${key} part ${p} native ms`);
        const scale = m.kind === 'lift' || m.kind === 'shift' ? (t.values.find((v) => v !== 0) ?? 1) : 1;
        assert.deepEqual(timesOf(once), frames.map(([x]) => x), `${key} part ${p} native times`);
        assert.deepEqual(once.values.map((v) => +v.toFixed(6)), frames.map(([, v]) => +(v * scale).toFixed(6)), `${key} part ${p} native values`);
      });
    });
  }
});

test('lucide-animated imports onto Lucide geometry, and its drop-in exports every Lucide name', async () => {
  const { icons } = loadIcons();
  const la = await loadLucideAnimated(icons);
  assert.ok(la.icons.length > 380, `${la.icons.length} imported`);
  const bell = la.icons.find((i) => i.name === 'BellIcon')!;
  const [ring] = bell.motion.effects!.auto!.tracks;
  assert.deepEqual([ring!.part, ring!.prop, ring!.values, ring!.ms], ['all', 'rotate', [0, -10, 10, -10, 0], 500]);
  const settings = la.icons.find((i) => i.name === 'SettingsIcon')!.motion.effects!.auto!.tracks[0]!;
  assert.equal(settings.ms, 1200, 'its spring, solved as Motion solves it');
  for (const i of la.icons) {
    for (const t of i.motion.effects!.auto!.tracks) {
      const times = timesOf(t);
      assert.ok(times.every((x, k) => x >= 0 && x <= 1 && (k === 0 || x >= times[k - 1]!)), `${i.name}: keyframe times run forwards`);
      assert.ok(t.ms > 0 && t.values.every(Number.isFinite), `${i.name}: plays`);
      if (t.node !== undefined) assert.ok(t.node < i.icon.nodes.length, `${i.name}: moves a node Lucide draws`);
    }
  }
  for (const { name } of la.exports) assert.equal(typeof (reactLA as Record<string, unknown>)[name], 'object', `xymbols-react/lucide-animated exports ${name}`);
  const markup = html(reactLA.BellIcon, { className: 'p-2' });
  assert.match(markup, /^<div class="p-2"><svg[^>]* width="28" height="28"/, "lucide-animated's wrapper and size");
});

test('an animated icon draws exactly what the static one does, in React, Vue and React Native', async () => {
  const manifest = JSON.parse(readFileSync(new URL('../packages/vanilla/dist/manifest.json', import.meta.url), 'utf8')) as { icons: { component: string; animation?: unknown }[] };
  for (const { component, animation } of manifest.icons) {
    const still = html((react as Record<string, unknown>)[component], { weight: 'bold' });
    const moving = html((reactAnimated as Record<string, unknown>)[component], { weight: 'bold' });
    // Same shapes; a part's shapes are drawn together, which can change the order of same-colour strokes.
    assert.deepEqual(shapes(moving).sort(), shapes(still).sort(), component);
    assert.equal(root(moving), root(still), `${component}: the same <svg>`);
    if (animation) assert.match(moving, /data-part="0"|data-n=|data-all/, `${component}: grouped to move`);
  }
  for (const name of ['Bell', 'Menu', 'Settings', 'House', 'LicenseMit'].filter((n) => n in vueAnimated)) {
    const v = vueAnimated as Record<string, unknown>;
    assert.deepEqual(shapes(await vueHtml(v[name], { weight: 'bold' })).sort(), shapes(await vueHtml((vue as Record<string, unknown>)[name], { weight: 'bold' })).sort(), `Vue ${name}`);
  }
  for (const name of ['Bell', 'Menu', 'Settings', 'House']) {
    const n = nativeAnimated as Record<string, unknown>;
    assert.deepEqual(shapes(html(n[name], { weight: 'bold' })).sort(), shapes(html((native as Record<string, unknown>)[name], { weight: 'bold' })).sort(), `React Native ${name}`);
  }
});

test('active: the duotone fill and active shapes, as UNA draws them', () => {
  const idle = html(reactAnimated.Menu);
  const on = html(reactAnimated.Menu, { active: true });
  assert.ok(!/data-active/.test(idle));
  assert.match(on, /data-active=""/);
  assert.match(on, /data-shape="" style="--xa-shape:translate\(12px, 12px\) rotate\(45deg\) translate\(-12px, -5px\)"/, "Menu's top line folds into the X");
  assert.match(html(reactAnimated.Bell), /fill="currentColor" fill-opacity="0" data-fill=""/, 'the fill waits, invisible, for active');
  const nativeOn = html(nativeAnimated.Bell, { active: true });
  assert.match(nativeOn, /fill-opacity="0.2"/, 'native switches the fill on');
  assert.match(html(nativeAnimated.Menu), /transform="translate\(0 0\)"/, 'native resets an active shape with an explicit transform (react-native-svg keeps a removed one)');
});

// ---------------------------------------------------------------- the web engine, on linkedom

function page() {
  const { document, window } = parseHTML('<!doctype html><html><head></head><body><div class="group"><button></button></div></body></html>');
  const calls: { el: Element; frames: Keyframe[]; options: KeyframeAnimationOptions; cancelled: boolean }[] = [];
  (window.Element.prototype as unknown as { animate: unknown }).animate = function (this: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
    const call = { el: this, frames, options, cancelled: false };
    calls.push(call);
    return { cancel: () => (call.cancelled = true) };
  };
  return { document, calls };
}

test('the web engine plays tracks as Web Animations, holds, goes back, and plays once', () => {
  const { document, calls } = page();
  const { element, controller } = vanilla.createAnimatedElement(vanilla.Bell, { trigger: 'manual' }, document as unknown as Document);
  document.body.append(element);
  assert.ok(document.head.querySelector('style[data-xymbols-animate]'), 'state styles, once');
  controller.play();
  assert.equal(calls.length, 1);
  const [ring] = calls;
  assert.equal(ring!.el.getAttribute('data-part'), '0');
  assert.equal(ring!.options.duration, 500);
  assert.equal(ring!.options.composite, 'add');
  assert.deepEqual(ring!.frames.map((f) => f.offset), [0, 0.2, 0.45, 0.7, 0.88, 1]);
  assert.equal(ring!.frames[1]!.transform, 'translate(12px, 2.5px) rotate(-10deg) translate(-12px, -2.5px)');

  const settings = vanilla.createAnimatedElement(vanilla.Settings, { trigger: 'manual' }, document as unknown as Document);
  calls.length = 0;
  settings.controller.play();
  assert.equal(calls[0]!.options.fill, 'forwards', 'a turn by 180 holds');
  assert.match(String(calls[0]!.frames[0]!.easing), /^linear\(/, 'its spring as linear()');
  settings.controller.stop();
  assert.ok(calls[0]!.cancelled);
  assert.equal(calls[1]!.options.fill, 'none', 'and goes back');
  calls.length = 0;
  settings.controller.once();
  assert.deepEqual(calls.at(-1)!.frames.map((f) => f.transform?.toString().match(/rotate\(([-\d.]+)deg\)/)?.[1]), ['0', '180', '0'], 'once: there and back');

  calls.length = 0;
  const house = vanilla.createAnimatedElement(vanilla.House, { trigger: 'manual', effect: 'draw-on' }, document as unknown as Document);
  house.controller.play();
  assert.ok(calls.every((c) => c.el.getAttribute('pathLength') === '1' && /^[\d.]+ 1$/.test(String(c.frames[0]!.strokeDasharray))), 'draw-on draws every stroke');
});

test('triggers: active plays once on the rising edge, never on mount; reduced motion plays nothing', () => {
  const { document, calls } = page();
  const { element, controller } = vanilla.createAnimatedElement(vanilla.Compass, { trigger: 'active', active: true }, document as unknown as Document);
  document.querySelector('.group')!.append(element);
  assert.equal(calls.length, 0, 'not on mount');
  controller.setActive(false);
  controller.setActive(true);
  assert.equal(calls.length, 1);
  assert.equal(element.getAttribute('data-active'), '');
  const g = globalThis as { matchMedia?: unknown };
  g.matchMedia = (q: string) => ({ matches: q.includes('reduce') });
  try {
    calls.length = 0;
    controller.setActive(false);
    controller.setActive(true);
    controller.play('bounce');
    assert.equal(calls.length, 0);
  } finally {
    delete g.matchMedia;
  }
});

test('generic effects and the timing arithmetic', () => {
  assert.deepEqual(Object.keys(EFFECTS), ['bounce', 'pulse', 'scale', 'wiggle', 'rotate', 'breathe', 'appear', 'disappear', 'draw-on', 'draw-off']);
  const t: Track = { part: 'all', prop: 'y', values: [0, -2], ms: 100, ease: 'linear', repeat: 1, alternate: true, delay: 50 };
  assert.equal(valueAt(t, 25), -0.5);
  assert.equal(valueAtTime(t, 50 + 25), -0.5);
  assert.equal(valueAtTime(t, 50 + 100 + 25), -1.5, 'the second play runs backwards');
  assert.equal(valueAtTime(t, 10), 0, 'before its delay');
  const ref = createRef<{ play(): void }>();
  assert.equal(html(reactAnimated.Bell, { ref }).startsWith('<svg'), true);
});
