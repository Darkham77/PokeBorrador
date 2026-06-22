/**
 * src/data/pokemon/spriteMapping.ts
 *
 * Wrapper to export static sprite mapping database loaded from JSON.
 */
import spriteIds from './spriteMapping.json' with { type: 'json' };

export const POKEMON_SPRITE_IDS = spriteIds as Record<string, number | string>;
