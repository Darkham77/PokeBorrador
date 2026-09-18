import type { Pokemon } from '@/types/pokemon/pokemon';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { pokemonDebugService } from '@/logic/debug/pokemonDebugService';

export const MIN_DEBUG_TEAM_SIZE = 1 as const;
export const MAX_DEBUG_TEAM_SIZE = 6 as const;
const MIN_DEBUG_LEVEL_BOUND = 1 as const;
const MAX_DEBUG_LEVEL_BOUND = 100 as const;
const SHINY_DEBUG_PROBABILITY = 0.05 as const;

export interface DebugGeneratePokemonParams {
  speciesId: PokemonSpeciesId;
  minLevel: number;
  maxLevel: number;
  forceShiny: boolean;
  guardianProb: number;
}

export function generateDebugTeamPokemon(params: DebugGeneratePokemonParams): Pokemon | null {
  const levelSpan = Math.max(0, params.maxLevel - params.minLevel);
  const rawLevel = Math.floor(Math.random() * (levelSpan + 1)) + params.minLevel;
  const level = Math.max(MIN_DEBUG_LEVEL_BOUND, Math.min(MAX_DEBUG_LEVEL_BOUND, rawLevel));
  const isShiny = params.forceShiny || Math.random() < SHINY_DEBUG_PROBABILITY;

  const p = pokemonDebugService.generate({
    id: params.speciesId,
    level,
    isShiny
  });

  if (p) {
    p.isGuardian = Math.random() < params.guardianProb;
  }
  return p;
}

export interface DebugGenerateTeamParams {
  size: number;
  speciesPool: readonly (string | PokemonSpeciesId)[];
  minLevel: number;
  maxLevel: number;
  forceShiny: boolean;
  guardianProb: number;
}

export function generateDebugTeamList(params: DebugGenerateTeamParams): Pokemon[] {
  const clampedSize = Math.max(MIN_DEBUG_TEAM_SIZE, Math.min(MAX_DEBUG_TEAM_SIZE, params.size));
  const team: Pokemon[] = [];
  if (params.speciesPool.length === 0) return team;

  for (let i = 0; i < clampedSize; i++) {
    const raw = params.speciesPool[Math.floor(Math.random() * params.speciesPool.length)] || 'rattata';
    const speciesId = requirePokemonSpeciesId(raw);
    const p = generateDebugTeamPokemon({
      speciesId,
      minLevel: params.minLevel,
      maxLevel: params.maxLevel,
      forceShiny: params.forceShiny,
      guardianProb: params.guardianProb
    });
    if (p) {
      team.push(p);
    }
  }

  return team;
}
