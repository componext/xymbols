// react/jsx-runtime for the stub React: elements are plain { type, props } objects.
export { Fragment } from './react.mjs';
export const jsx = (type, props) => ({ type, props: props ?? {} });
export const jsxs = jsx;
export const jsxDEV = jsx;
