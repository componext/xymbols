# xymbols-vue

Every [Lucide](https://lucide.dev) icon in nine weights, plus tagsets glyphs for licenses (SPDX), locales (ISO 639-1 / BCP 47), part-of-speech tags (UD UPOS), tech abbreviations, keyboard keys and math symbols, as Vue 3 components. A drop-in for `@lucide/vue` (and `lucide-vue-next`): same names, props and markup.

```vue
<script setup>
import { House, LicenseApache, setXymbolsProps } from 'xymbols-vue';
import { TagGlyph } from 'xymbols-vue/dynamic';
setXymbolsProps({ weight: 'light' }); // defaults for this subtree
</script>

<template>
  <House weight="bold" :size="20" />
  <LicenseApache :size="20" title="Apache License 2.0" />
  <TagGlyph tagset="keys" :code="event.code" fit="hug">
    <template #fallback>{{ event.key }}</template>
  </TagGlyph>
</template>
```

Icons take @lucide/vue's props (`size`, `color`, `stroke-width`, `absolute-stroke-width`, `non-scaling-stroke`) plus `weight`; other attributes fall through to the `<svg>`. `setLucideProps`, `useLucideProps`, `createLucideIcon`, `Icon` and `icons` work as in @lucide/vue. Glyphs take `size` (the height), `fit`, `color`, `stroke-width`, `weight`, `absolute-stroke-width` and `title`. Without a `title`, `aria-label` or role, everything is `aria-hidden`. Vue 3.3 or later.

**Animated.** `xymbols-vue/animated` has every icon, animated: its own animation (from UNA or lucide-animated) or a generic effect, played on hover, on the `.group` row's hover, once when `active` turns on, on mount, in a loop, or through a template ref (`play()`, `stop()`, `startAnimation()`).

```vue
<Bell effect="bounce" trigger="group-hover" :active="unread" />
```

See the [repository README](https://github.com/componext/xymbols#readme) for weights, the tagsets and the design rules.
