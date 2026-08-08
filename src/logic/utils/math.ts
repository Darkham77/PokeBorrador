/**
 * src/logic/utils/math.ts
 * 
 * HERRAMIENTAS MATEMÁTICAS GLOBALES Y PRNG
 * 
 * Centraliza funciones puras de generación de números pseudoaleatorios (PRNG)
 * y algoritmos de hashing para evitar duplicación en dominios específicos (clima, combate, etc.).
 */

/**
 * Mulberry32 PRNG — rápido, de alta calidad y determinista según semilla.
 * @param a - La semilla inicial (número entero)
 * @returns Una función que genera un número flotante en el intervalo [0, 1)
 */
const MULBERRY32_SCALE_DENOMINATOR = 4294967296;
const MULBERRY32_PRIMARY_SHIFT_BITS = 15;
const MULBERRY32_BITWISE_OR_MASK = 61;
const MULBERRY32_SECONDARY_SHIFT_BITS = 14;
const DJB2_INITIAL_HASH_SEED = 5381;

export function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> MULBERRY32_PRIMARY_SHIFT_BITS), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | MULBERRY32_BITWISE_OR_MASK);
    return ((t ^ (t >>> MULBERRY32_SECONDARY_SHIFT_BITS)) >>> 0) / MULBERRY32_SCALE_DENOMINATOR;
  };
}

/** 
 * DJB2 hash: Convierte una cadena de texto en un número entero sin signo de 32 bits.
 * Ideal para generar semillas numéricas a partir de identificadores de texto (ej. mapId).
 */
export function hashString(str: string): number {
  let hash = DJB2_INITIAL_HASH_SEED;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
}
