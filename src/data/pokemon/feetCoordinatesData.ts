/**
 * src/data/pokemon/feetCoordinatesData.ts
 *
 * Strongly-typed domain wrapper for src/data/pokemon/pokemonFeetDatabase.json.
 * Enforces strict PokemonSpeciesId key mapping.
 */

import dbJson from './pokemonFeetDatabase.json' with { type: 'json' };
import type { PokemonSpeciesId } from './pokedex.ts';

export interface FeetCoordinates {
  x: number;
  y: number;
}

export type FeetCoordinatesMap = Record<PokemonSpeciesId, FeetCoordinates>;

/**
 * Strongly-typed feet coordinates database.
 */
export const FEET_COORDINATES_DATA: Partial<FeetCoordinatesMap> = dbJson as Partial<FeetCoordinatesMap>;
