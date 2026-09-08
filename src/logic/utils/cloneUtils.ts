/**
 * src/logic/utils/cloneUtils.ts
 *
 * Safe deep cloning and un-proxying utilities for Vue 3 reactive states.
 * Vue's `toRaw()` is shallow, leaving nested proxies (`ivs`, `moves`, `tags`, etc.)
 * intact. Native `structuredClone()` throws DataCloneError when encountering
 * reactive Proxies.
 *
 * `deepToRaw` and `cloneReactive` recursively unwrap all reactive proxies into
 * fresh, detached, plain JavaScript objects and arrays without JSON serialization overhead.
 */
import { toRaw } from 'vue';

export function deepToRaw<T>(source: T): T {
  if (source === null || typeof source !== 'object') {
    return source;
  }
  const raw = toRaw(source);
  if (Array.isArray(raw)) {
    const arr: unknown[] = [];
    for (const item of raw) {
      arr.push(deepToRaw(item));
    }
    return arr as T;
  }
  if (raw instanceof RegExp) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    return new RegExp(raw.source, raw.flags) as T;
  }
  if (raw instanceof Map) {
    const mapCopy = new Map();
    for (const [k, v] of raw.entries()) {
      mapCopy.set(deepToRaw(k), deepToRaw(v));
    }
    return mapCopy as T;
  }
  if (raw instanceof Set) {
    const setCopy = new Set();
    for (const v of raw.values()) {
      setCopy.add(deepToRaw(v));
    }
    return setCopy as T;
  }

  const res: Record<string, unknown> = {}; // open-record: Generic key-value data dictionary container
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) { // open-record: Generic key-value data dictionary container
    res[key] = deepToRaw(value);
  }
  return res as T;
}

/**
 * Deep clones any object, safely unwrapping any Vue reactive proxies in its tree.
 */
export function cloneReactive<T>(source: T): T {
  return deepToRaw(source);
}
