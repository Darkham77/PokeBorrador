/**
 * src/logic/utils/temporal-init.ts
 * 
 * Conditionally loads the Temporal API polyfill only if not natively available.
 * Ensures that the system uses the high-performance native implementation 
 * in Node 26+ and modern browsers while maintaining compatibility.
 */

if (!('Temporal' in globalThis)) {
  const polyfill = await import('@js-temporal/polyfill');
  // Use a safe assignment to avoid type collision with built-in libs
  Object.defineProperty(globalThis, 'Temporal', {
    value: polyfill.Temporal,
    writable: true,
    enumerable: false,
    configurable: true
  });
}

export {};
