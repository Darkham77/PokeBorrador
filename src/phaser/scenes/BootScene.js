import * as Phaser from 'phaser';
import { ASSET_TYPES } from '@/logic/services/assetService';
import PhaserAssetService from '../services/PhaserAssetService';
import { useLoadingStore } from '@/stores/loading';

/**
 * BootScene.js
 * Responsible for asset preloading and engine initialization.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // 1. Setup Loading UI

    // 2. Preload recurring UI/VFX Assets
    if (!this.game || this.game.pendingDestroy) return;

    const loadingStore = useLoadingStore()
    loadingStore.start('phaser_boot', 'Iniciando motor...', 'Cargando recursos base', true)
    
    this.load.on('progress', (value) => {
      loadingStore.setProgress('phaser_boot', null, `Cargando recursos: ${Math.round(value * 100)}%`)
    })

    PhaserAssetService.loadAtlas(this, 'vfx', 'vfx');
    
    // Placeholder for common sprites
    PhaserAssetService.loadTexture(this, 'platform', ASSET_TYPES.ITEM, 'pokeball');
  }

  create() {
    console.log('[BootScene] Engine Assets Loaded');
    
    // Garantizar que la fase de "Iniciando" dure al menos 500ms para estabilidad visual y renderizado
    setTimeout(() => {
      // Cláusula de guarda: si el juego se destruyó durante la espera, salir silenciosamente
      if (!this.scene || !this.scene.manager || (this.game && this.game.pendingDestroy)) return;

      useLoadingStore().finish('phaser_boot')
      
      // Notify Vue that the engine is ready
      window.dispatchEvent(new CustomEvent('game-state-ready'));
      window.legacyGameReady = true; // For race condition guard in App.vue
      
      // Transition to the first actual scene
      const weatherScene = this.scene.manager.getScene('WeatherScene');
      if (weatherScene && !this.scene.isActive('WeatherScene')) {
        this.scene.launch('WeatherScene');
      }

      this.scene.stop();
    }, 500);
  }

  /**
   * Helper to load external Pokémon sprites on-demand.
   * Can be called from any scene during runtime.
   */
  async loadPokemonTexture(id, isShiny = false, isBack = false) {
    const key = `poke_${id}${isShiny ? '_s' : ''}${isBack ? '_b' : ''}`;
    
    if (this.textures.exists(key)) return key;

    return new Promise((resolve) => {
      PhaserAssetService.loadPokemon(this, id, isShiny, isBack);
      
      this.load.once('complete', () => resolve(key));
      this.load.start();
    });
  }
}
