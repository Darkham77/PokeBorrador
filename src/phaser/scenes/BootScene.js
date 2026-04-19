import * as Phaser from 'phaser';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';

/**
 * BootScene.js
 * Responsible for asset preloading and engine initialization.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // 1. Setup Loading UI (Simple text for now)
    const { width, height } = this.cameras.main;
    const _loadingText = this.add.text(width / 2, height / 2, 'Cargando Motor...', {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      fill: '#FFD93D'
    }).setOrigin(0.5);

    // 2. Preload recurring UI/VFX Assets
    // Note: Once the Texture Atlas is generated, load it here.
    // this.load.atlas('vfx', 'assets/vfx.webp', 'assets/vfx.json');
    
    // Placeholder for common sprites
    this.load.image('platform', getAssetUrl(ASSET_TYPES.ITEM, 'pokeball'));
  }

  create() {
    console.log('[BootScene] Engine Assets Loaded');
    
    // Notify Vue that the engine is ready
    window.dispatchEvent(new CustomEvent('game-state-ready'));
    window.legacyGameReady = true; // For race condition guard in App.vue
    
    // Transition to the first actual scene (e.g., WeatherScene or BattleScene when triggered)
    // For now, we launch the WeatherScene in the background if it exists
    if (this.scene.manager.getScene('WeatherScene')) {
      this.scene.launch('WeatherScene');
    }

    this.scene.stop();
  }

  /**
   * Helper to load external Pokémon sprites on-demand.
   * Can be called from any scene during runtime.
   */
  async loadPokemonTexture(id, isShiny = false, isBack = false) {
    const key = `poke_${id}${isShiny ? '_s' : ''}${isBack ? '_b' : ''}`;
    
    if (this.textures.exists(key)) return key;

    return new Promise((resolve) => {
      const url = getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny, isBack });
      
      this.load.image(key, url);
      this.load.once('complete', () => resolve(key));
      this.load.start();
    });
  }
}
