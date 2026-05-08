
import { getAssetUrl, ASSET_TYPES } from './services/assetService';
import { POKEMON_SPRITE_IDS } from '@/logic/pokedexConstants';

/**
 * POKEMON SPRITES UTILITY
 * Refactored to use central AssetService.
 */

/**
 * Returns the sprite URL for a given Pokemon ID
 */
export function getSpriteUrl(id: string, isShiny: boolean = false): string {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny });
}

/**
 * Returns the back sprite URL for a given Pokemon ID
 */
export function getBackSpriteUrl(id: string, isShiny: boolean = false): string {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny, isBack: true });
}

// Global bridge for legacy code
if (typeof window !== 'undefined') {
  const win = window as unknown as { 
    POKEMON_SPRITE_IDS: typeof POKEMON_SPRITE_IDS;
    getSpriteUrl: typeof getSpriteUrl;
    getBackSpriteUrl: typeof getBackSpriteUrl;
  };
  win.POKEMON_SPRITE_IDS = POKEMON_SPRITE_IDS;
  win.getSpriteUrl = getSpriteUrl;
  win.getBackSpriteUrl = getBackSpriteUrl;
}
