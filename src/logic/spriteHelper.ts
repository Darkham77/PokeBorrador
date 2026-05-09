
/**
 * POKEMON SPRITES UTILITIES
 */
import { getAssetUrl, ASSET_TYPES } from './services/assetService.ts';
import { POKEMON_SPRITE_IDS } from '@/logic/pokedexConstants';

export { POKEMON_SPRITE_IDS };

export function getSpriteUrl(id: string, isShiny: boolean = false): string {
  if (id && id.includes('egg')) return getAssetUrl(ASSET_TYPES.ITEM, 'egg');
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny });
}

export function getBackSpriteUrl(id: string, isShiny: boolean = false): string {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny, isBack: true });
}

/**
 * Carga una imagen en un elemento de imagen con lógica de carga limpia.
 */
export function loadSprite(imgEl: HTMLImageElement, emojiEl: HTMLElement | null, url: string): void {
  if (emojiEl) emojiEl.style.display = 'none'; 
  if (!url) { 
    imgEl.style.display = 'none'; 
    return; 
  }
  
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
