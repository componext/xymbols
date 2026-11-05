/**
 * Drop-in compatibility with the Lucide packages pinned in package.json
 * (Dependabot bumps them with lucide-static): every name they export, xymbols
 * exports, and every icon renders to exactly the same markup.
 */
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

// Native packages import react-native-svg, which needs a device; tests draw with tags instead.
const svgStub = pathToFileURL(fileURLToPath(new URL('./stubs/react-native-svg.mjs', import.meta.url))).href;
registerHooks({ resolve: (specifier, context, next) => (specifier === 'react-native-svg' ? { url: svgStub, shortCircuit: true } : next(specifier, context)) });

const ours = {
  react: await import('xymbols-react'),
  vue: await import('xymbols-vue'),
  native: await import('xymbols-react-native'),
  vanilla: await import('xymbols'),
};
const theirs = {
  react: await import('lucide-react'),
  vue: await import('@lucide/vue'),
  native: await import('lucide-react-native'),
  vanilla: await import('lucide'),
};

/** Export names, minus the CommonJS interop keys Node adds when importing a CJS build. */
const names = (m: object) => Object.keys(m).filter((k) => k !== 'default' && k !== 'module.exports');
const missing = (from: object, into: object) => names(from).filter((k) => !(k in into));
const iconNames = (m: { icons: object }) => Object.keys(m.icons);

test('every name the Lucide packages export, xymbols exports', () => {
  assert.deepEqual(missing(theirs.react, ours.react), [], 'lucide-react');
  assert.deepEqual(missing(theirs.vue, ours.vue), [], '@lucide/vue');
  assert.deepEqual(missing(theirs.native, ours.native), [], 'lucide-react-native');
  assert.deepEqual(missing(theirs.vanilla, ours.vanilla), [], 'lucide');
  assert.deepEqual(iconNames(ours.react).sort(), iconNames(theirs.react).sort(), 'the icons object');
  assert.ok(iconNames(ours.react).length > 2000);
});

const html = (C: unknown, props: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(C as ComponentType, props));

test('React: every icon renders as lucide-react renders it', () => {
  const lucide = theirs.react.icons as Record<string, unknown>;
  const xymbols = ours.react.icons as Record<string, unknown>;
  for (const name of Object.keys(lucide)) assert.equal(html(xymbols[name]), html(lucide[name]), name);
  const props = { size: 32, color: 'red', strokeWidth: 1.5, absoluteStrokeWidth: true, className: 'x y', 'aria-label': 'Home', 'data-k': 'v', nonScalingStroke: true };
  const named = (m: object, name: string) => (m as Record<string, unknown>)[name];
  for (const name of ['House', 'Home', 'HomeIcon', 'LucideHome', 'Bell', 'ArrowDown01', 'Settings']) assert.equal(html(named(ours.react, name), props), html(named(theirs.react, name), props), name);
  const inProvider = (m: object) => {
    const [Provider, House, Bell] = ['LucideProvider', 'House', 'Bell'].map((n) => named(m, n) as ComponentType<Record<string, unknown>>);
    return renderToStaticMarkup(createElement(Provider!, { size: 20, color: 'blue', strokeWidth: 1, className: 'p' }, createElement(House!), createElement(Bell!, { size: 30 })));
  };
  assert.equal(inProvider(ours.react), inProvider(theirs.react), 'LucideProvider');
  const burger = [['path', { d: 'M3 12h18' }]] as const;
  assert.equal(html(ours.react.Icon, { iconNode: burger }), html(theirs.react.Icon, { iconNode: burger }), 'Icon with iconNode');
  assert.equal(html(ours.react.createLucideIcon('Burger', burger)), html(theirs.react.createLucideIcon('Burger', burger as never)), 'createLucideIcon');
  assert.equal(ours.react.House.displayName, 'House');
});

const vueHtml = (C: unknown, props: Record<string, unknown> = {}) => renderToString(createSSRApp({ render: () => h(C as Component, props) }));

test('Vue: every icon renders as @lucide/vue renders it', async () => {
  const lucide = theirs.vue.icons as Record<string, unknown>;
  const xymbols = ours.vue.icons as Record<string, unknown>;
  for (const name of Object.keys(lucide)) assert.equal(await vueHtml(xymbols[name]), await vueHtml(lucide[name]), name);
  const props = { size: 32, color: 'red', 'stroke-width': 1.5, 'absolute-stroke-width': '', class: 'x', 'aria-label': 'Home', 'data-k': 'v' };
  const named = (m: object, name: string) => (m as Record<string, unknown>)[name];
  for (const name of ['House', 'Home', 'Bell']) assert.equal(await vueHtml(named(ours.vue, name), props), await vueHtml(named(theirs.vue, name), props), name);
});

test('React Native: every icon renders as lucide-react-native renders it', () => {
  // lucide-react-native has no icons object; its icons are the same names as lucide-react's.
  const lucide = theirs.native as unknown as Record<string, unknown>;
  const xymbols = ours.native as unknown as Record<string, unknown>;
  for (const name of iconNames(theirs.react)) assert.equal(html(xymbols[name]), html(lucide[name]), name);
  const props = { size: 32, color: 'red', strokeWidth: 1.5, absoluteStrokeWidth: true, testID: 't' };
  for (const name of ['House', 'Bell']) assert.equal(html(xymbols[name], props), html(lucide[name], props), name);
});

test('vanilla: every icon is the node array the lucide package exports', () => {
  const lucide = theirs.vanilla.icons as Record<string, unknown>;
  const xymbols = ours.vanilla.icons as Record<string, unknown>;
  assert.deepEqual(Object.keys(xymbols).sort(), Object.keys(lucide).sort());
  for (const name of Object.keys(lucide)) assert.deepEqual([...(xymbols[name] as unknown[])], lucide[name], name);
});

test('the pinned Lucide packages are one version, lucide-static included', () => {
  const version = (p: string) => (JSON.parse(readFileSync(new URL(`../node_modules/${p}/package.json`, import.meta.url), 'utf8')) as { version: string }).version;
  const versions = new Set(['lucide-static', 'lucide', 'lucide-react', '@lucide/vue', 'lucide-react-native'].map(version));
  assert.equal(versions.size, 1, [...versions].join(', '));
});
