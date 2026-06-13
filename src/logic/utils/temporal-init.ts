/**
 * src/logic/utils/temporal-init.ts
 * 
 * Verifies that the native Temporal API is available.
 * Ensures the system uses the high-performance native implementation 
 * in Node 26+ and modern browsers.
 */

if (!('Temporal' in globalThis)) {
  console.warn('⚠️ Native Temporal API is missing in this environment.');
}

export {};
