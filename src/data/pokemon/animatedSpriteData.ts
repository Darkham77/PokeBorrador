/**
 * src/data/pokemon/animatedSpriteData.ts
 *
 * Strongly-typed domain wrapper for src/data/pokemon/animatedSpriteDatabase.json.
 * Enforces strict PokemonSpeciesId key mapping.
 */

import dbJson from './animatedSpriteDatabase.json' with { type: 'json' };
import type { PokemonSpeciesId } from './pokedex.ts';

export type AnimatedSpriteMap = Record<PokemonSpeciesId, string | undefined>;

/**
 * Strongly-typed animated sprite database.
 */
export const ANIMATED_SPRITE_DATA: Partial<AnimatedSpriteMap> = dbJson as Partial<AnimatedSpriteMap>;
