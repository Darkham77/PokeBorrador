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
    const loadingStore = useLoadingStore()
    loadingStore.start('phaser_boot', 'Iniciando Motor...', 'Cargando recursos base', false)
    
    this.load.on('progress', (value) => {
      loadingStore.setProgress('phaser_boot', null, `Cargando recursos: ${Math.round(value * 100)}%`)
    })

    PhaserAssetService.loadAtlas(this, 'vfx', 'vfx');
    
    // Placeholder for common sprites
    PhaserAssetService.loadTexture(this, 'platform', ASSET_TYPES.ITEM, 'pokeball');
  }

  create() {
    console.log('[BootScene] Engine Assets Loaded');
    useLoadingStore().finish('phaser_boot')
    
    // Notify Vue that the engine is ready
    window.dispatchEvent(new CustomEvent('game-state-ready'));
    window.legacyGameReady = true; // For race condition guard in App.vue
    
    // Transition to the first actual scene (e.g., WeatherScene or BattleScene when triggered)
    // For now, we launch the WeatherScene in the background if it exists and isn't running
    const weatherScene = this.scene.manager.getScene('WeatherScene');
    if (weatherScene && !this.scene.isActive('WeatherScene')) {
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
      PhaserAssetService.loadPokemon(this, id, isShiny, isBack);
      
      this.load.once('complete', () => resolve(key));
      this.load.start();
    });
  }
}
