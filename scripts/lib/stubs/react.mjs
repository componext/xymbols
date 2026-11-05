// React, as far as lucide-animated's components use it, with no renderer: calling a component returns a
// plain element tree, hooks hold nothing between calls, and useImperativeHandle fills the ref at once,
// so the importer can call the icon's startAnimation itself. See ../lucide-animated.ts.
export const Fragment = Symbol.for('xymbols.fragment');
export const forwardRef = (render) => ({ $$forwardRef: true, render });
export const memo = (c) => c;
export const useRef = (current) => ({ current });
export const useCallback = (fn) => fn;
export const useMemo = (fn) => fn();
export const useImperativeHandle = (ref, create) => {
  if (ref && typeof ref === 'object') ref.current = create();
};
export const useState = (init) => [typeof init === 'function' ? init() : init, () => {}];
export const useReducer = (_, init) => [init, () => {}];
export const useEffect = () => {};
export const useLayoutEffect = () => {};
export const useInsertionEffect = () => {};
export const useId = () => 'xymbols';
export const useContext = (c) => c?._value;
export const createContext = (value) => ({ _value: value, Provider: ({ children }) => children });
export const createElement = (type, props, ...children) => ({ type, props: { ...props, ...(children.length ? { children: children.length === 1 ? children[0] : children } : {}) } });
export const cloneElement = (el, props) => ({ ...el, props: { ...el.props, ...props } });
export const isValidElement = (el) => !!el && typeof el === 'object' && 'type' in el && 'props' in el;
export const Children = { toArray: (c) => [c].flat(Infinity).filter((x) => x != null && x !== false), map: (c, fn) => [c].flat(Infinity).map(fn) };
export default { Fragment, forwardRef, memo, useRef, useCallback, useMemo, useImperativeHandle, useState, useReducer, useEffect, useLayoutEffect, useInsertionEffect, useId, useContext, createContext, createElement, cloneElement, isValidElement, Children };
