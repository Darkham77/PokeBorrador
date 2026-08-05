/**
 * src/data/pokemon/evolutionDataWrapper.ts
 *
 * Strongly-typed domain wrapper for src/data/pokemon/evolutionData.json.
 * Enforces strict PokemonSpeciesId and ItemId types.
 */

import dbJson from './evolutionData.json' with { type: 'json' };
import type { PokemonSpeciesId } from './pokedex.ts';
import type { ItemId } from '../inventory/items.ts';

import type { PokemonMoveId } from '../battle/moves.ts';

export interface EvolutionTargetInfo {
  to: PokemonSpeciesId;
  level?: number;
  item?: ItemId;
  heldItem?: ItemId;
  time?: 'day' | 'night';
  happiness?: number;
  move?: PokemonMoveId;
  trade?: boolean;
}

export type EvolutionTableMap = Record<PokemonSpeciesId, EvolutionTargetInfo | EvolutionTargetInfo[]>;

/**
 * Strongly-typed evolution database wrapper.
 */
export const EVOLUTION_TABLE: Partial<EvolutionTableMap> = dbJson.EVOLUTION_TABLE as Partial<EvolutionTableMap>;
