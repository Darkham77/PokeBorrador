/**
 * POKEMON SPRITES UTILITIES
 */
import { getAssetUrl, ASSET_TYPES } from './services/assetService';

import { POKEMON_SPRITE_IDS } from '@/logic/pokedexConstants';
export { POKEMON_SPRITE_IDS };

export function getSpriteUrl(id, isShiny = false) {
  if (id && id.includes('egg')) return getAssetUrl(ASSET_TYPES.ITEM, 'egg');
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny });
}

export function getBackSpriteUrl(id, isShiny = false) {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny, isBack: true });
}

/**
 * Carga una imagen en un elemento <img> con lógica de carga limpia.
 */
export function loadSprite(imgEl, emojiEl, url) {
  if (emojiEl) emojiEl.style.display = 'none';
  if (!url) { imgEl.style.display = 'none'; return; }
  
  imgEl.style.display = 'none';

  const testImg = new Image();
  testImg.crossOrigin = 'anonymous';
  testImg.onload = () => {
    imgEl.src = url;
    imgEl.style.display = 'block';
  };
  testImg.onerror = () => {
    imgEl.style.display = 'none';
  };
  testImg.src = url;
}
