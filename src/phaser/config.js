import * as Phaser from 'phaser';

import BootScene from './scenes/BootScene';
import WeatherScene from './scenes/WeatherScene';
import BattleScene from './scenes/BattleScene';

/**
 * Phaser Game Configuration
 * Optimized for Mobile GPU Performance as per Project Standards.
 */
export const phaserConfig = {
  type: Phaser.AUTO, // WebGL preferred, Canvas fallback
  parent: 'phaser-container',
  backgroundColor: '#000000',
  transparent: true, // Allow Vue background to show through if needed
  pixelArt: true,    // Sharp pixels for Pokémon aesthetics
  powerPreference: 'high-performance', // Hint for GPU
  
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%'
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },

  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
    batchSize: 512 // Optimization for many particles/sprites
  },

  // Scenes
  scene: [BootScene, WeatherScene, BattleScene]
};
