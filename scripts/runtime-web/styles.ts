/**
 * State styles for animated icons (copied into the web packages beside animate.ts): the active fill, active
 * shapes and the press, keyed on `data-active`. Kept apart from the engine, with no imports, so the build can
 * read it too: it also writes it out as xymbols' `animate.css`.
 */

/** Injected once per document by the engine; also published as `animate.css`. */
export const ANIMATE_CSS = `[data-xa] g,[data-xa] [data-n]{transform-box:view-box;transform-origin:0 0}
[data-xa] [data-fill]{fill-opacity:0;transition:fill-opacity 200ms cubic-bezier(.2,0,0,1)}
[data-xa][data-active] [data-fill]{fill-opacity:.2}
@starting-style{[data-xa][data-active][data-swapped] [data-fill]{fill-opacity:0}}
[data-xa] [data-shape]{transition:transform 250ms cubic-bezier(.2,0,0,1),opacity 150ms cubic-bezier(.2,0,0,1)}
[data-xa][data-active] [data-shape]{transform:var(--xa-shape)}
[data-xa][data-active] [data-shape][data-hide]{opacity:0}
[data-xa]{transition:scale 150ms cubic-bezier(.2,0,0,1)}
@media (prefers-reduced-motion:no-preference){.group:active [data-xa]{scale:.96}}
@media (prefers-reduced-motion:reduce){[data-xa]{transition:none}[data-xa] [data-shape]{transition:opacity 150ms cubic-bezier(.2,0,0,1)}}
`;

/** Add ANIMATE_CSS to a document once. */
export function ensureAnimateStyles(doc: Document | undefined = typeof document === 'undefined' ? undefined : document): void {
  if (!doc?.head || doc.querySelector('style[data-xymbols-animate]')) return;
  const style = doc.createElement('style');
  style.setAttribute('data-xymbols-animate', '');
  style.textContent = ANIMATE_CSS;
  doc.head.append(style);
}

