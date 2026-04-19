import { getAssetUrl, ASSET_TYPES, POKEMON_SPRITE_IDS } from './services/assetService';

/**
 * POKEMON SPRITES UTILITY
 * Refactored to use central AssetService.
 */

/**
 * Returns the sprite URL for a given Pokemon ID
 */
export function getSpriteUrl(id, isShiny = false) {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny });
}

/**
 * Returns the back sprite URL for a given Pokemon ID
 */
export function getBackSpriteUrl(id, isShiny = false) {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny, isBack: true });
}

/**
 * Global bridge for legacy code
 */
if (typeof window !== 'undefined') {
  window.POKEMON_SPRITE_IDS = POKEMON_SPRITE_IDS;
  window.getSpriteUrl = getSpriteUrl;
  window.getBackSpriteUrl = getBackSpriteUrl;
}
