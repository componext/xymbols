import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createSSRApp, h } from 'vue';
import type { Component } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { closestStrokes, maxStroke } from '../scripts/lib/weights.ts';
import { WEIGHTS, resolveStroke, weightStroke } from '../scripts/runtime/weights.ts';

const svgStub = pathToFileURL(fileURLToPath(new URL('./stubs/react-native-svg.mjs', import.meta.url))).href;
registerHooks({ resolve: (specifier, context, next) => (specifier === 'react-native-svg' ? { url: svgStub, shortCircuit: true } : next(specifier, context)) });

const react = await import('xymbols-react');
const vue = await import('xymbols-vue');
const native = await import('xymbols-react-native');
const vanilla = await import('xymbols');

const html = (C: unknown, props: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(C as ComponentType, props));
const stroke = (markup: string) => /<svg[^>]* stroke-width="([^"]+)"/.exec(markup)?.[1];

test('nine weights, by SF Symbols name or CSS font-weight, regular at Lucide\'s 2', () => {
  assert.deepEqual(Object.keys(WEIGHTS), ['ultralight', 'thin', 'light', 'regular', 'medium', 'semibold', 'bold', 'heavy', 'black']);
  assert.equal(WEIGHTS.regular, 2);
  assert.equal(weightStroke('bold'), 2.75);
  assert.equal(weightStroke(700), 2.75);
  assert.equal(weightStroke(100), 1);
  assert.equal(weightStroke('black', 2.97), 2.97, 'heavier weights stop at the drawing\'s limit');
  assert.equal(weightStroke('light', 2.97), 1.5, 'lighter ones never do');
  assert.equal(weightStroke('nope' as 'bold'), 2);
});

test('strokeWidth beats weight, and a component beats its provider', () => {
  assert.equal(resolveStroke({}, {}), 2);
  assert.equal(resolveStroke({ weight: 'bold' }, {}), 2.75);
  assert.equal(resolveStroke({ strokeWidth: 3.5, weight: 'light' }, {}, 3), 3.5, 'an explicit strokeWidth is never clamped');
  assert.equal(resolveStroke({ weight: 'bold' }, { strokeWidth: 1 }), 2.75);
  assert.equal(resolveStroke({}, { strokeWidth: 1, weight: 'black' }), 1);
  assert.equal(resolveStroke({}, { weight: 'black' }, 2.5), 2.5);
});

test('a drawing goes as heavy as its closest separate strokes allow, and never under regular', () => {
  const rings: [string, Record<string, string>][] = [['circle', { cx: '12', cy: '12', r: '10' }], ['circle', { cx: '12', cy: '12', r: '6.5' }]];
  assert.ok(Math.abs(closestStrokes(rings) - 3.5) < 0.06);
  assert.equal(maxStroke(rings), 2.5, '3.5 apart: 2.5 leaves 1px');
  assert.equal(maxStroke([['circle', { cx: '12', cy: '12', r: '10' }], ['circle', { cx: '12', cy: '12', r: '2' }]]), undefined, 'far apart: every weight');
  assert.equal(maxStroke([['path', { d: 'M4 12h16' }], ['path', { d: 'M4 14h16' }]]), 2, 'already tight at regular: stays there');
  const k = [['path', { d: 'M9 7v10' }], ['path', { d: 'M15 7l-6 6' }], ['path', { d: 'M11 11l4 6' }]] as [string, Record<string, string>][];
  assert.equal(maxStroke(k), undefined, 'strokes that touch through each other are one stroke');
});

test('React: weight, its limit, and the provider', () => {
  assert.equal(stroke(html(react.House, { weight: 'black' })), '3.25');
  assert.equal(stroke(html(react.Settings, { weight: 'black' })), '2.97', 'Settings stops at 2.97');
  assert.equal(stroke(html(react.Settings, { weight: 'bold' })), '2.75');
  assert.equal(stroke(html(react.Settings, { strokeWidth: 3.5 })), '3.5');
  assert.equal(stroke(html(react.House, { weight: 'bold', size: 48, absoluteStrokeWidth: true })), '1.375');
  const provided = renderToStaticMarkup(createElement(react.XymbolsProvider, { weight: 'heavy' }, createElement(react.House), createElement(react.Settings), createElement(react.LicenseMit)));
  assert.deepEqual([...provided.matchAll(/<svg[^>]* stroke-width="([^"]+)"/g)].map((m) => m[1]), ['3', '2.97', '3']);
  assert.equal(stroke(html(react.LicenseCc, { weight: 'black' })), '2.43', 'glyphs clamp too');
  assert.equal(stroke(html(react.KeyK, { weight: 600 })), '2.5');
});

test('Vue, React Native and vanilla take the same weights', async () => {
  const vueHtml = (C: unknown, props: Record<string, unknown>) => renderToString(createSSRApp({ render: () => h(C as Component, props) }));
  assert.equal(stroke(await vueHtml(vue.Settings, { weight: 'black' })), '2.97');
  assert.equal(stroke(await vueHtml(vue.House, { weight: 'thin', 'stroke-width': 3 })), '3');
  assert.equal(stroke(await vueHtml(vue.LicenseMit, { weight: 'bold' })), '2.75');
  assert.equal(stroke(html(native.Settings, { weight: 'black' })), '2.97');
  assert.equal(stroke(html(native.LicenseCc, { weight: 'black' })), '2.43');
  assert.equal(stroke(vanilla.toSvg(vanilla.Settings, { weight: 'black' })), '2.97');
  assert.equal(stroke(vanilla.toSvg(vanilla.House, { weight: 600 })), '2.5');
  assert.equal(stroke(vanilla.toSvg(vanilla.LicenseCc, { weight: 'black' })), '2.43');
  assert.ok(Array.isArray(vanilla.Settings), 'a vanilla icon is still a plain node array');
});

test('the manifest lists every icon with its file, aliases, tags and limit', () => {
  const manifest = JSON.parse(readFileSync(new URL('../packages/vanilla/dist/manifest.json', import.meta.url), 'utf8')) as {
    lucide: string;
    weights: Record<string, number>;
    icons: { name: string; aliases?: string[]; tags: string[]; svg: string; maxStroke?: number; geometry: string }[];
  };
  assert.deepEqual(manifest.weights, WEIGHTS);
  assert.ok(manifest.icons.length > 2000);
  const house = manifest.icons.find((i) => i.name === 'house')!;
  assert.deepEqual(house.aliases, ['home']);
  assert.ok(house.tags.includes('home'));
  assert.equal(house.maxStroke, undefined);
  assert.equal(manifest.icons.find((i) => i.name === 'settings')!.maxStroke, 2.97);
  assert.match(house.geometry, /^[0-9a-f]{12}$/);
  const svg = readFileSync(new URL(`../packages/vanilla/dist/${house.svg}`, import.meta.url), 'utf8');
  assert.match(svg, /class="lucide lucide-house lucide-home"/);
});
