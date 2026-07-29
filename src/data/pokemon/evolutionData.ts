/**
 * src/data/pokemon/evolutionData.ts
 *
 * Wrapper to export evolution tables loaded from JSON.
 */
import dbJson from './evolutionData.json' with { type: 'json' };
import { requirePokemonSpeciesId, type PokemonSpeciesId } from './pokedex.ts';

export const EVOLUTION_TABLE = dbJson.EVOLUTION_TABLE;
export type LevelEvolutionSpeciesId = keyof typeof EVOLUTION_TABLE;

export const STONE_EVOLUTIONS = dbJson.STONE_EVOLUTIONS;
export type StoneEvolutionKey = keyof typeof STONE_EVOLUTIONS;

export const TRADE_EVOLUTIONS = dbJson.TRADE_EVOLUTIONS;
export type TradeEvolutionSpeciesId = keyof typeof TRADE_EVOLUTIONS;

export function isLevelEvolutionSpeciesId(id: string): id is LevelEvolutionSpeciesId {
  return Object.hasOwn(EVOLUTION_TABLE, id);
}

export function isStoneEvolutionKey(id: string): id is StoneEvolutionKey {
  return Object.hasOwn(STONE_EVOLUTIONS, id);
}

export function isTradeEvolutionSpeciesId(id: string): id is TradeEvolutionSpeciesId {
  return Object.hasOwn(TRADE_EVOLUTIONS, id);
}

export function getLevelEvolution(id: string): { level: number; to: PokemonSpeciesId } | null {
  if (!isLevelEvolutionSpeciesId(id)) return null;
  const evolution = EVOLUTION_TABLE[id];
  return {
    level: evolution.level,
    to: requirePokemonSpeciesId(evolution.to),
  };
}

export function getTradeEvolution(id: string): PokemonSpeciesId | null {
  if (!isTradeEvolutionSpeciesId(id)) return null;
  return requirePokemonSpeciesId(TRADE_EVOLUTIONS[id]);
}

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
export function getStoneEvolution(id: string): { stone: string; to: PokemonSpeciesId } | null {
  if (isStoneEvolutionKey(id)) {
    const evolution = STONE_EVOLUTIONS[id];
    return { stone: evolution.stone, to: requirePokemonSpeciesId(evolution.to) };
  }
  const prefix = `${id}_`;
  for (const [key, val] of Object.entries(STONE_EVOLUTIONS)) {
    if (key.startsWith(prefix)) return { stone: val.stone, to: requirePokemonSpeciesId(val.to) };
  }
  return null;
}
