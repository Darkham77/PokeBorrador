/**
 * src/logic/utils/jsonUtils.ts
 *
 * Centralized JSON utility helpers.
 */

export function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return (val as T) || fallback;
}
