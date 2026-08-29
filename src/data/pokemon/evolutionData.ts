/**
 * src/data/pokemon/evolutionData.ts
 *
 * Wrapper to export evolution tables loaded from JSON.
 */
import dbJson from './evolutionData.json' with { type: 'json' };
import { isPokemonSpeciesId, requirePokemonSpeciesId, type PokemonSpeciesId } from './pokedex.ts';
import { EVOLUTION_TABLE } from './evolutionDataWrapper.ts';

export { EVOLUTION_TABLE };
export type LevelEvolutionSpeciesId = keyof typeof EVOLUTION_TABLE;

export const STONE_EVOLUTIONS = dbJson.STONE_EVOLUTIONS;
export type StoneEvolutionKey = keyof typeof STONE_EVOLUTIONS;

export const TRADE_EVOLUTIONS = dbJson.TRADE_EVOLUTIONS;
export type TradeEvolutionSpeciesId = keyof typeof TRADE_EVOLUTIONS;
export type EvolutionTriggerType = 'level' | 'stone' | 'trade';
function isLevelEvolutionSpeciesId(id: string): id is LevelEvolutionSpeciesId {
  return Object.hasOwn(EVOLUTION_TABLE, id);
}

export function isStoneEvolutionKey(id: string): id is StoneEvolutionKey {
  return Object.hasOwn(STONE_EVOLUTIONS, id);
}

function isTradeEvolutionSpeciesId(id: string): id is TradeEvolutionSpeciesId {
  return Object.hasOwn(TRADE_EVOLUTIONS, id);
}

export function getLevelEvolution(id: string): { level: number; to: PokemonSpeciesId } | null {
  if (!isLevelEvolutionSpeciesId(id)) return null;
  const evolution = EVOLUTION_TABLE[id as keyof typeof EVOLUTION_TABLE]; // domain-ok
  if (!evolution || Array.isArray(evolution) || !('level' in evolution) || typeof evolution.level !== 'number') {
    return null;
  }
  return {
    level: evolution.level,
    to: requirePokemonSpeciesId(evolution.to),
  };
}

export function getTradeEvolution(id: string): PokemonSpeciesId | null { // result-ok
  if (!isTradeEvolutionSpeciesId(id)) return null;
  return requirePokemonSpeciesId(TRADE_EVOLUTIONS[id as keyof typeof TRADE_EVOLUTIONS]); // domain-ok
}

/**
 * Looks up a stone evolution entry for a given species ID.
 */
export function getStoneEvolution(id: string): { stone: string; to: PokemonSpeciesId } | null {
  if (isStoneEvolutionKey(id)) {
    const evolution = STONE_EVOLUTIONS[id as keyof typeof STONE_EVOLUTIONS]; // domain-ok
    return { stone: evolution.stone, to: requirePokemonSpeciesId(evolution.to) };
  }
  const prefix = `${id}_`;
  for (const [key, val] of Object.entries(STONE_EVOLUTIONS)) {
    if (key.startsWith(prefix)) {
      const entry = val as { stone: string; to: string };
      return { stone: entry.stone, to: requirePokemonSpeciesId(entry.to) };
    }
  }
  return null;
}

const PRE_EVOLUTION_MAP: Partial<Record<PokemonSpeciesId, PokemonSpeciesId>> = Object.freeze(
  (() => {
    const map: Partial<Record<PokemonSpeciesId, PokemonSpeciesId>> = {};
    for (const [from, evo] of Object.entries(EVOLUTION_TABLE)) {
      if (evo && typeof evo === 'object' && 'to' in evo && typeof (evo as { to: string }).to === 'string') {
        if (isPokemonSpeciesId(from) && isPokemonSpeciesId((evo as { to: string }).to)) {
          map[requirePokemonSpeciesId((evo as { to: string }).to)] = requirePokemonSpeciesId(from);
        }
      }
    }
    for (const [fromKey, evo] of Object.entries(STONE_EVOLUTIONS)) {
      if (evo && typeof evo === 'object' && 'to' in evo && typeof (evo as { to: string }).to === 'string') {
        const baseSpecies = fromKey.includes('_') ? (fromKey.split('_')[0] ?? fromKey) : fromKey;
        if (isPokemonSpeciesId(baseSpecies) && isPokemonSpeciesId((evo as { to: string }).to)) {
          map[requirePokemonSpeciesId((evo as { to: string }).to)] = requirePokemonSpeciesId(baseSpecies);
        }
      }
    }
    for (const [from, to] of Object.entries(TRADE_EVOLUTIONS)) {
      if (typeof to === 'string' && isPokemonSpeciesId(from) && isPokemonSpeciesId(to)) {
        map[requirePokemonSpeciesId(to)] = requirePokemonSpeciesId(from);
      }
    }
    return map;
  })()
);

export function getPreEvolution(speciesId: PokemonSpeciesId): PokemonSpeciesId | null { // domain-ok
  return PRE_EVOLUTION_MAP[speciesId] ?? null;
}
