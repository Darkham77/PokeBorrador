import * as Phaser from 'phaser';

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
    const loadingText = this.add.text(width / 2, height / 2, 'Cargando Motor...', {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      fill: '#FFD93D'
    }).setOrigin(0.5);

    // 2. Preload recurring UI/VFX Assets
    // Note: Once the Texture Atlas is generated, load it here.
    // this.load.atlas('vfx', 'assets/vfx.webp', 'assets/vfx.json');
    
    // Placeholder for common sprites
    this.load.image('platform', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png');
  }

  create() {
    console.log('[BootScene] Engine Assets Loaded');
    
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
      const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${isBack ? 'back/' : ''}${isShiny ? 'shiny/' : ''}${id}.png`;
      
      this.load.image(key, url);
      this.load.once('complete', () => resolve(key));
      this.load.start();
    });
  }
}
