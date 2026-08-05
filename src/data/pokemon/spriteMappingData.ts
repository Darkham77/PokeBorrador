/**
 * src/data/pokemon/spriteMappingData.ts
 *
 * Strongly-typed domain wrapper for src/data/pokemon/spriteMapping.json.
 * Enforces strict PokemonSpeciesId key mapping to numeric dex indices.
 */

import dbJson from './spriteMapping.json' with { type: 'json' };
import type { PokemonSpeciesId } from './pokedex.ts';

export type SpriteMappingMap = Record<PokemonSpeciesId, number | string>;

/**
 * Strongly-typed sprite mapping database.
 */
export const SPRITE_MAPPING_DATA: Partial<SpriteMappingMap> = dbJson as Partial<SpriteMappingMap>;
