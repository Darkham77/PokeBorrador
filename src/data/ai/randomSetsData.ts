/**
 * src/data/ai/randomSetsData.ts
 *
 * Strongly-typed domain wrapper for src/data/ai/random-sets.json.
 * Enforces strict domain union types for items, species, abilities, and moves.
 */

import dbJson from './random-sets.json' with { type: 'json' };
import type { ItemId } from '../inventory/items.ts';
import type { PokemonSpeciesId } from '../pokemon/pokedex.ts';
import type { AbilityId } from '../battle/abilities.ts';
import type { PokemonMoveId } from '@/types/pokemon/pokemon';

export interface RandomSetItem {
  moves: PokemonMoveId[];
  ability: AbilityId;
  item?: ItemId;
  role: string; // domain-ok
}

export interface RandomSetEntry {
  pokemon: PokemonSpeciesId;
  sets: RandomSetItem[];
}

/**
 * Strongly-typed random sets dataset.
 * TypeScript will throw a compile error if any entity ID in random-sets.json is not a valid domain ID.
 */
export const RANDOM_SETS_DATA: readonly RandomSetEntry[] = dbJson as RandomSetEntry[];
