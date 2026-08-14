/**
 * src/data/pokemon/feetCoordinatesData.ts
 *
 * Strongly-typed domain wrapper for src/data/pokemon/pokemonFeetDatabase.json.
 */

import dbJson from './pokemonFeetDatabase.json' with { type: 'json' };

export interface PackedFeetDatabase {
  p?: Record<string, readonly number[]>; // open-record
  n?: Record<string, readonly number[]>; // open-record
  t?: Record<string, readonly number[]>; // open-record
  c?: Record<string, string>; // open-record
}

export const FEET_COORDINATES_DATA: PackedFeetDatabase = dbJson;

