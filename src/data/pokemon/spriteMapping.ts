/**
 * src/data/pokemon/spriteMapping.ts
 *
 * Wrapper to export static sprite mapping database loaded from JSON.
 */
import spriteIds from './spriteMapping.json' with { type: 'json' };

export const POKEMON_SPRITE_IDS = spriteIds;
export type PokemonSpriteId = keyof typeof POKEMON_SPRITE_IDS;
export type PokemonSpriteValue = (typeof POKEMON_SPRITE_IDS)[PokemonSpriteId];

export function hasPokemonSpriteId(id: string): id is PokemonSpriteId {
  return Object.hasOwn(POKEMON_SPRITE_IDS, id);
}

export function requirePokemonSpriteId(id: string): PokemonSpriteId {
  if (hasPokemonSpriteId(id)) return id;
  throw new Error(`[spriteMapping] Unknown pokemon sprite id: ${id}`);
}

export function requirePokemonSpriteValue(id: string): PokemonSpriteValue {
  return POKEMON_SPRITE_IDS[requirePokemonSpriteId(id)];
}
