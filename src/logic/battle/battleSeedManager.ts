/**
 * Unified RNG seed management module for the Pokémon Showdown battle engine.
 * Provides strong types and deterministic methods for seed creation, formatting, and injection.
 */

import type { NumericSeed } from '@/types/battle/battle';

export type { NumericSeed };
export type ShowdownSeed = `${number},${string}`;

/**
 * Generates a new random numeric seed of 4 16-bit integers.
 */
export function generateRandomSeed(): NumericSeed {
  return [
    Math.floor(Math.random() * 0x10000),
    Math.floor(Math.random() * 0x10000),
    Math.floor(Math.random() * 0x10000),
    Math.floor(Math.random() * 0x10000)
  ];
}

/**
 * Formats a 4-element numeric seed into the literal string expected by Pokémon Showdown (e.g. "18588,21544,54523,34263").
 */
export function formatToShowdownSeed(seed: NumericSeed): ShowdownSeed {
  if (!Array.isArray(seed) || seed.length !== 4) {
    throw new Error(`[BattleSeedManager] Semilla inválida para formatear: ${JSON.stringify(seed)}`);
  }
  return `${seed[0]},${seed[1]},${seed[2]},${seed[3]}` as ShowdownSeed;
}

/**
 * Parses and normalizes any raw seed (a number array, a comma-separated string, or undefined)
 * into a valid 4-element numeric seed.
 */
export function parseToNumericSeed(raw: unknown): NumericSeed {
  if (typeof raw === 'string') {
    const parts = raw.split(',').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      return parts as NumericSeed; // domain-ok: Open dynamic text or non-domain string payload
    }
  }
  
  if (raw && typeof raw === 'object') {
    try {
      const arr = Array.from(raw as ArrayLike<unknown>).map(Number);
      if (arr.length === 4 && arr.every(n => !isNaN(n))) {
        return arr as NumericSeed; // domain-ok: Open dynamic text or non-domain string payload
      }
    } catch (e) {
      throw new Error(`[BattleSeedManager] Error parsing numeric seed object: ${String(e)}`, { cause: e });
    }
  }
  
  throw new Error(`[BattleSeedManager] Raw seed parameter is missing or invalid: ${JSON.stringify(raw)}`);
}


/**
 * Safely injects a seed into the global debugging environment.
 */
export function injectDebugSeed(seed: NumericSeed): void {
  if (typeof window !== 'undefined') {
    const debugObj = (window as { __VITE_DEBUG__?: Record<string, unknown> }).__VITE_DEBUG__ || {};
    (window as { __VITE_DEBUG__?: Record<string, unknown> }).__VITE_DEBUG__ = debugObj;
    debugObj.battleSeed = seed;
  }
}
