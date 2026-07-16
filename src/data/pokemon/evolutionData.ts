/**
 * src/data/pokemon/evolutionData.ts
 *
 * Wrapper to export evolution tables loaded from JSON.
 */
import dbJson from './evolutionData.json' with { type: 'json' };

export const EVOLUTION_TABLE = dbJson.EVOLUTION_TABLE as Record<string, { level: number; to: string }>;
export const STONE_EVOLUTIONS = dbJson.STONE_EVOLUTIONS as Record<string, { stone: string; to: string }>;
export const TRADE_EVOLUTIONS = dbJson.TRADE_EVOLUTIONS as Record<string, string>;

/**
 * Looks up a stone evolution entry for a given species ID.
 *
 * Keys in STONE_EVOLUTIONS follow two patterns:
 *   - Exact: "pikachu" → "raichu"
 *   - Disambiguated: "eevee_water" / "slowpokegalar_cuff" (one entry per stone variant)
 *
 * An exact lookup `STONE_EVOLUTIONS[id]` misses multi-stone species entirely.
 * This helper tries exact first, then falls back to the first prefix match.
 * Returns `null` when the species has no stone evolution at all.
 */
export function getStoneEvolution(id: string): { stone: string; to: string } | null {
  if (STONE_EVOLUTIONS[id]) return STONE_EVOLUTIONS[id]!;
  const prefix = `${id}_`;
  for (const [key, val] of Object.entries(STONE_EVOLUTIONS)) {
    if (key.startsWith(prefix)) return val;
  }
  return null;
}
