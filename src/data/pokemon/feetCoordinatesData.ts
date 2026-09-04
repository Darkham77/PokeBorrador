/**
 * src/data/pokemon/feetCoordinatesData.ts
 *
 * Strongly-typed domain wrapper for src/data/pokemon/pokemonFeetDatabase.json.
 */

import dbJson from './pokemonFeetDatabase.json' with { type: 'json' };

export interface PackedFeetDatabase {
  p?: Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container
  n?: Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container
  t?: Record<string, readonly number[]>; // open-record: Generic key-value data dictionary container
  c?: Record<string, string>; // open-record: Generic key-value data dictionary container
}

export const FEET_COORDINATES_DATA: PackedFeetDatabase = dbJson;

