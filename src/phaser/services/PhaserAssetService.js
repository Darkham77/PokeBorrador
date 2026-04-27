import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';

/**
 * PhaserAssetService.js
 * Specialized bridge for loading optimized assets within Phaser scenes.
 */
export default class PhaserAssetService {
  /**
   * Load an image texture using the global AssetService.
   */
  static loadTexture(scene, key, type, id, options = {}) {
    if (scene.textures.exists(key)) return;
    
    const url = getAssetUrl(type, id, options);
    scene.load.image(key, url);
  }

  static loadAtlas(scene, key, atlasId) {
    if (scene.textures.exists(key)) return;
    
    const imgUrl = getAssetUrl(ASSET_TYPES.ATLAS, `${atlasId}.webp`);
    const jsonUrl = getAssetUrl(ASSET_TYPES.ATLAS, `${atlasId}.json`);
    
    scene.load.atlas(key, imgUrl, jsonUrl);
  }

  /**
   * Specific helper for Pokémon sprites.
   */
  static loadPokemon(scene, id, isShiny = false, isBack = false) {
    const key = `poke_${id}${isShiny ? '_s' : ''}${isBack ? '_b' : ''}`;
    if (scene.textures.exists(key)) return key;

    const url = getAssetUrl(ASSET_TYPES.POKEMON, id, { shiny: isShiny, back: isBack });
    scene.load.image(key, url);
    return key;
  }

  /**
   * Promise-based wrapper for loading a Pokémon texture.
   */
  static async loadPokemonAsync(scene, id, isShiny = false, isBack = false) {
    const key = this.loadPokemon(scene, id, isShiny, isBack);
    if (scene.textures.exists(key)) return key;

    return new Promise((resolve) => {
      scene.load.once(`filecomplete-image-${key}`, () => resolve(key));
      scene.load.start();
    });
  }
}
