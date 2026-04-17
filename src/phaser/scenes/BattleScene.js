import Phaser from 'phaser';
import { phaserBridge } from '@/logic/phaserBridge';

/**
 * BattleScene.js
 * The core rendering engine for Pokémon battles.
 */
export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
    this.bg = null;
    this.vignette = null;
    this.playerSprite = null;
    this.enemySprite = null;
    this.currentBattleData = null;
  }

  create() {
    console.log('[BattleScene] Initialized');
    
    // Background layer
    this.bg = this.add.image(0, 0, 'ruta_day').setOrigin(0);
    
    // Vignette / Post-processing layer
    this.vignette = this.add.graphics();
    this.drawVignette();

    // Listen for resize to update background and vignette
    this.scale.on('resize', this.handleResize, this);

    // Initial sync with Vue state
    this.syncFromVue();
  }

  drawVignette() {
    const { width, height } = this.cameras.main;
    this.vignette.clear();
    // Simplified radial vignette for GPU performance
    this.vignette.fillStyle(0x000000, 0.2);
    this.vignette.fillRect(0, 0, width, height);
  }

  handleResize() {
    this.drawVignette();
    if (this.bg && this.bg.texture) {
      this.rescaleBackground();
    }
  }

  rescaleBackground() {
    const { width, height } = this.cameras.main;
    const scale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(scale).setOrigin(0.5).setPosition(width / 2, height / 2);
  }

  /**
   * Sync battle state from Vue.
   */
  async syncFromVue(data) {
    if (data) this.currentBattleData = data;
    if (!this.currentBattleData) return;

    const { locationId, cycle, player, enemy } = this.currentBattleData;

    // 1. Update Background
    await this.updateBackground(locationId, cycle);

    // 2. Update Sprites
    if (player) await this.updatePokemonSprite('player', player);
    if (enemy) await this.updatePokemonSprite('enemy', enemy);
  }

  async updateBackground(locationId, cycle) {
    // Ported logic from legacy 08_shop.js
    const key = this.getBgKey(locationId, cycle);
    const url = this.getBgUrl(key);

    if (!this.textures.exists(key)) {
      this.load.image(key, url);
      this.load.once('complete', () => {
        this.bg.setTexture(key);
        this.rescaleBackground();
      });
      this.load.start();
    } else {
      this.bg.setTexture(key);
      this.rescaleBackground();
    }
  }

  async updatePokemonSprite(side, pokemon) {
    const bootScene = this.scene.get('BootScene');
    const textureKey = await bootScene.loadPokemonTexture(pokemon.id, pokemon.isShiny, side === 'player');

    const { width, height } = this.cameras.main;
    const isPlayer = side === 'player';
    
    let sprite = isPlayer ? this.playerSprite : this.enemySprite;

    if (!sprite) {
      sprite = this.add.sprite(0, 0, textureKey);
      if (isPlayer) this.playerSprite = sprite;
      else this.enemySprite = sprite;
    } else {
      sprite.setTexture(textureKey);
    }

    // Initial positioning (Portrait/Mobile optimized)
    if (isPlayer) {
      sprite.setPosition(width * 0.25, height * 0.7).setScale(2.5).setOrigin(0.5, 1);
    } else {
      sprite.setPosition(width * 0.75, height * 0.35).setScale(1.8).setOrigin(0.5, 1);
    }

    // Refresh idle animation (simple float)
    this.tweens.add({
      targets: sprite,
      y: sprite.y - 10,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  getBgKey(locationId, cycle) {
    // Simplified version of legacy _getBgKey
    const biomeMap = { 
      forest: 'bosque', cave: 'montana', water: 'playa', gym: 'pvp', pvp: 'pvp', power_plant: 'central'
    };
    const biome = biomeMap[locationId] || 'ruta';
    const cycleKey = { morning: 'dawn', day: 'day', dusk: 'dawn', night: 'night' }[cycle] || 'day';
    return `${biome}_${cycleKey}`;
  }

  getBgUrl(key) {
    return new URL(`../../assets/sprites/battle/${key}.webp`, import.meta.url).href;
  }

  handleCommand(command, data) {
    if (command === 'SYNC_BATTLE') {
      this.syncFromVue(data);
    } else if (command === 'PLAY_DAMAGE') {
      this.playDamage(data.side);
    } else if (command === 'PLAY_FAINT') {
      this.playFaint(data.side);
    } else if (command === 'PLAY_MOVE') {
      this.playMoveFX(data.side, data.type);
    } else if (command === 'START_BATTLE') {
      this.syncFromVue(data);
    } else if (command === 'PLAY_WITHDRAW') {
      this.playWithdraw(data.side);
    } else if (command === 'PLAY_SEND_OUT') {
      this.updatePokemonSprite(data.side, data.pokemon);
    }
  }

  playWithdraw(side) {
    const sprite = side === 'player' ? this.playerSprite : this.enemySprite;
    if (!sprite) return;

    this.tweens.add({
      targets: sprite,
      scale: 0,
      alpha: 0,
      duration: 500,
      ease: 'Back.in',
      onComplete: () => {
        sprite.setAlpha(0);
      }
    });
  }

  playDamage(side) {
    const sprite = side === 'player' ? this.playerSprite : this.enemySprite;
    if (!sprite) return;

    // Shake camera
    this.cameras.main.shake(150, 0.015);

    // Sprite flash and tint
    this.tweens.add({
      targets: sprite,
      alpha: 0.3,
      tint: 0xff0000,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        sprite.setAlpha(1);
        sprite.clearTint();
      }
    });
  }

  playFaint(side) {
    const sprite = side === 'player' ? this.playerSprite : this.enemySprite;
    if (!sprite) return;

    this.tweens.add({
      targets: sprite,
      y: sprite.y + 100,
      alpha: 0,
      duration: 1000,
      ease: 'Power2'
    });
  }

  playMoveFX(side, type = 'normal') {
    const isPlayer = side === 'player';
    const targetSprite = isPlayer ? this.enemySprite : this.playerSprite;
    if (!targetSprite) return;

    const colors = {
      fire: 0xff4f00,
      water: 0x00aaff,
      grass: 0x4caf50,
      electric: 0xffeb3b,
      ice: 0x00ffff,
      poison: 0xa33ea1,
      normal: 0xffffff
    };

    const color = colors[type] || colors.normal;

    // Create a simple particle emitter for the move
    const particles = this.add.particles(0, 0, 'pixel', {
      speed: { min: 100, max: 200 },
      scale: { start: 2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      tint: color,
      blendMode: 'ADD',
      gravityY: 100
    });

    particles.setPosition(targetSprite.x, targetSprite.y - 40);
    particles.explode(20);

    this.time.delayedCall(1000, () => particles.destroy());
  }
}
