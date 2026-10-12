/**
 * src/logic/utils/math.ts
 * 
 * GLOBAL MATHEMATICAL TOOLS AND PRNG
 * 
 * Centralizes pure pseudorandom number generation (PRNG) functions
 * and hashing algorithms to prevent duplication across domains (weather, combat, etc.).
 */

/**
 * Mulberry32 PRNG — fast, high-quality, and deterministic based on seed.
 * @param a - Initial seed (integer)
 * @returns A function that generates a float in the range [0, 1)
 */
const MULBERRY32_SCALE_DENOMINATOR = 4294967296;
const MULBERRY32_PRIMARY_SHIFT_BITS = 15;
const MULBERRY32_TERTIARY_SHIFT_BITS = 7;
const MULBERRY32_BITWISE_OR_MASK = 61;
const MULBERRY32_SECONDARY_SHIFT_BITS = 14;
const DJB2_INITIAL_HASH_SEED = 5381;

export function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> MULBERRY32_PRIMARY_SHIFT_BITS), t | 1);
    t ^= t + Math.imul(t ^ (t >>> MULBERRY32_TERTIARY_SHIFT_BITS), t | MULBERRY32_BITWISE_OR_MASK);
    return ((t ^ (t >>> MULBERRY32_SECONDARY_SHIFT_BITS)) >>> 0) / MULBERRY32_SCALE_DENOMINATOR;
  };
}

/** 
 * DJB2 hash: Converts a string into an unsigned 32-bit integer.
 * Ideal for generating numeric seeds from string identifiers (e.g. mapId).
 */
export function hashString(str: string): number {
  let hash = DJB2_INITIAL_HASH_SEED;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
}
