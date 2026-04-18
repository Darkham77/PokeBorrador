import * as Phaser from 'phaser';

/**
 * WeatherScene.js
 * Handles ambient effects like rain, sandstorms, and day/night overlays.
 * These effects are rendered on TOP of the Vue card UI (z-index managed by PhaserGame.vue).
 */
export default class WeatherScene extends Phaser.Scene {
  constructor() {
    super('WeatherScene');
    this.particles = null;
    this.emitter = null;
    this.overlay = null;
  }

  create() {
    console.log('[WeatherScene] Initialized');
    
    // Day/Night Overlay (covers the entire screen with a tint)
    this.overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000)
      .setOrigin(0)
      .setAlpha(0);

    // Initial weather check
    this.updateWeather('clear', 'day');
  }

  /**
   * Update the visual state based on game logic.
   */
  updateWeather(weatherType, cycleType) {
    this.updateCycleOverlay(cycleType);
    this.updateParticles(weatherType);
  }

  updateCycleOverlay(cycle) {
    if (!this.overlay) return;

    let targetAlpha = 0;
    let color = 0x000000;

    switch (cycle) {
      case 'morning':
        targetAlpha = 0.1;
        color = 0xFAB12F; // Golden hour
        break;
      case 'dusk':
        targetAlpha = 0.3;
        color = 0x58287F; // Purple/Orange mix
        break;
      case 'night':
        targetAlpha = 0.45;
        color = 0x000033; // Dark blue
        break;
      default: // day
        targetAlpha = 0;
    }

    this.overlay.setFillStyle(color);
    this.tweens.add({
      targets: this.overlay,
      alpha: targetAlpha,
      duration: 2000,
      ease: 'Power2'
    });
  }

  updateParticles(type) {
    if (this.emitter) {
      this.emitter.stop();
      this.emitter = null;
    }

    if (type === 'rain') {
      // For now using native line graphics since we haven't loaded an Atlas yet
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.lineStyle(1, 0x6AB1FF, 0.4);
      graphics.lineBetween(0, 0, 0, 10);
      graphics.generateTexture('rain_drop', 2, 10);

      this.particles = this.add.particles(0, 0, 'rain_drop', {
        x: { min: 0, max: this.cameras.main.width },
        y: -10,
        speedY: { min: 400, max: 600 },
        speedX: { min: -100, max: -50 },
        scaleY: { min: 1, max: 1.5 },
        alpha: { min: 0.3, max: 0.6 },
        lifespan: 2000,
        quantity: 2,
        frequency: 50
      });
      this.emitter = this.particles;
    }
  }

  /**
   * Command handler from Vue via PhaserBridge.
   */
  handleCommand(command, data) {
    if (command === 'SET_WEATHER') {
      this.updateWeather(data.weather, data.cycle);
    }
  }
}
