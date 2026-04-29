// [PureVue-Ignore-Length]
import * as Phaser from 'phaser';
import { ASSET_TYPES } from '@/logic/services/assetService';
import PhaserAssetService from '../services/PhaserAssetService';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

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
    this.playerShadow = null;
    this.enemyShadow = null;
    this.currentBattleData = null;
  }

  create() {
    console.log('[BattleScene] Initialized');
    
    // Background layer
    this.bg = this.add.image(0, 0, 'platform').setOrigin(0); // Temporary placeholder
    
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
    if (!this.bg || !this.bg.texture) return;
    const { width, height } = this.cameras.main;
    const bgWidth = this.bg.width || 1;
    const bgHeight = this.bg.height || 1;
    const scale = Math.max(width / bgWidth, height / bgHeight);
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
    const bgKey = this.getBgKey(locationId, cycle);
    await this.updateBackground(bgKey);

    // 2. Update Sprites
    if (player) await this.updatePokemonSprite('player', player);
    if (enemy) await this.updatePokemonSprite('enemy', enemy);
  }

  async updateBackground(key) {
    if (!key) return;

    if (!this.textures.exists(key)) {
      PhaserAssetService.loadTexture(this, key, ASSET_TYPES.BATTLE_BG, key);
      
      return new Promise((resolve) => {
        this.load.once(`filecomplete-image-${key}`, () => {
          if (this.bg) {
            this.bg.setTexture(key);
            this.rescaleBackground();
          }
          resolve();
        });
        this.load.start();
      });
    } else {
      if (this.bg) this.bg.setTexture(key);
      this.rescaleBackground();
    }
  }

  async updatePokemonSprite(side, pokemon, skipTween = false) {
    if (!pokemon) return;
    
    const isPlayer = side === 'player';
    const textureKey = await PhaserAssetService.loadPokemonAsync(this, pokemon.id, pokemon.isShiny, isPlayer);

    const { width, height } = this.cameras.main;
    
    let sprite = isPlayer ? this.playerSprite : this.enemySprite;

    if (!sprite) {
      sprite = this.add.sprite(0, 0, textureKey);
      if (isPlayer) this.playerSprite = sprite;
      else this.enemySprite = sprite;
    } else {
      sprite.setTexture(textureKey);
      sprite.setAlpha(1);
      sprite.setScale(isPlayer ? 2.5 : 1.8);
    }

    // Match Vue's .battle-arena coordinate system
    // Arena is width: 100%, aspect-ratio: 4/3
    const arenaWidth = width;
    const arenaHeight = width * 0.75;
    
    // Vue sprite container is 38cqw
    const spriteSize = arenaWidth * 0.38;

    if (isPlayer) {
      // Vue: left: 12%, bottom: 12%
      const playerX = (arenaWidth * 0.12) + (spriteSize / 2);
      const playerY = arenaHeight - (arenaHeight * 0.12);
      sprite.setPosition(playerX, playerY).setOrigin(0.5, 1);
    } else {
      // Vue: right: 12%, top: 12%
      const enemyX = arenaWidth - (arenaWidth * 0.12) - (spriteSize / 2);
      const enemyY = (arenaHeight * 0.12) + spriteSize;
      sprite.setPosition(enemyX, enemyY).setOrigin(0.5, 1);
    }

    // 3. Update Shadow
    this.updateShadow(side);
    const shadow = isPlayer ? this.playerShadow : this.enemyShadow;

    if (skipTween) return sprite;

    // Refresh idle animation (Sway + Float)
    const duration = 2000 + Math.random() * 1000;
    const sway = isPlayer ? 5 : -5;
    
    this.tweens.killTweensOf(sprite);
    if (shadow) this.tweens.killTweensOf(shadow);

    this.tweens.add({
      targets: sprite,
      y: sprite.y - 10,
      x: sprite.x + sway,
      duration: duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    if (shadow) {
      this.tweens.add({
        targets: shadow,
        x: shadow.x + sway,
        duration: duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    return sprite;
  }

  updateShadow(side) {
    const isPlayer = side === 'player';
    const sprite = isPlayer ? this.playerSprite : this.enemySprite;
    if (!sprite) return;

    const pokemon = isPlayer ? this.currentBattleData?.player : this.currentBattleData?.enemy;
    const speciesData = pokemon ? pokemonDataProvider.getPokemonData(pokemon.id) : null;
    const isFlying = speciesData?.isFloating || false;
    
    let shadow = isPlayer ? this.playerShadow : this.enemyShadow;
    
    const arenaWidth = this.cameras.main.width;
    const spriteSize = arenaWidth * 0.38; // 38cqw in Vue
    const effectiveFeetY = isFlying ? 0.95 : 0.9;
    
    // In Vue, shadow is at effectiveFeetY of the spriteSize.
    // sprite.y is at 100% of spriteSize.
    // So shadow is (1 - effectiveFeetY) * spriteSize HIGHER than sprite.y
    const verticalOffset = spriteSize * (1 - effectiveFeetY);

    const shadowX = sprite.x;
    const shadowY = sprite.y - verticalOffset;
    const shadowWidth = isPlayer ? 100 : 70;
    const shadowHeight = shadowWidth * 0.3;

    if (!shadow) {
      shadow = this.add.ellipse(shadowX, shadowY, shadowWidth, shadowHeight, 0x000000, 0.25);
      shadow.setDepth(sprite.depth - 1);
      if (isPlayer) this.playerShadow = shadow;
      else this.enemyShadow = shadow;
    } else {
      shadow.setPosition(shadowX, shadowY);
      shadow.setAlpha(0.25);
    }
  }

  getBgKey(locationId, cycle) {
    const biomeMap = { 
      forest: 'bosque', cave: 'montana', water: 'playa', gym: 'pvp', pvp: 'pvp', power_plant: 'central'
    };
    const biome = biomeMap[locationId] || 'ruta';
    const cycleKey = { morning: 'dawn', day: 'day', dusk: 'dawn', night: 'night' }[cycle] || 'day';
    return `${biome}_${cycleKey}`;
  }

  handleCommand(command, data) {
    console.log(`[BattleScene] Command Received: ${command}`, data);
    
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
    } else if (command === 'PLAY_CATCH_ENERGY') {
      this.playCaptureEnergy(data.side);
    } else if (command === 'PLAY_RELEASE_ENERGY') {
      this.playReleaseEnergy(data.side, data.pokemon);
    } else if (command === 'DEBUG_VISUAL_SWAP') {
      if (this.currentBattleData) this.visualSwap(data);
    }
  }

  visualSwap(data) {
    if (!this.currentBattleData) return;
    const side = data.side || 'enemy';
    const pokemon = side === 'player' ? this.currentBattleData.player : this.currentBattleData.enemy;
    if (!pokemon) return;
    const newId = parseInt(data.id);
    if (isNaN(newId)) return;
    pokemon.id = newId;
    this.updatePokemonSprite(side, pokemon);
  }

  playWithdraw(side) {
    this._playShrinkAnimation(side, false);
  }

  playCaptureEnergy(side) {
    this._playShrinkAnimation(side, true);
  }

  _playShrinkAnimation(side, isCapture) {
    const sprite = side === 'player' ? this.playerSprite : this.enemySprite;
    const shadow = side === 'player' ? this.playerShadow : this.enemyShadow;
    if (!sprite) return;

    this.tweens.killTweensOf(sprite);

    // Vue handles the highly visible white/blue CSS animation (which perfectly targets the DOM shadow).
    // Phaser only needs to quietly fade out so it doesn't create a misaligned "ghost" sprite.
    this.tweens.add({
      targets: sprite,
      alpha: 0,
      duration: isCapture ? 800 : 500,
      ease: 'Power2'
    });

    if (shadow) {
      this.tweens.add({
        targets: shadow,
        alpha: 0,
        duration: 500,
        ease: 'Power2'
      });
    }
  }

  playDamage(side) {
    const sprite = side === 'player' ? this.playerSprite : this.enemySprite;
    if (!sprite) return;
    this.cameras.main.shake(150, 0.015);
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
    const shadow = side === 'player' ? this.playerShadow : this.enemyShadow;
    if (!sprite) return;
    this.tweens.add({
      targets: sprite,
      y: sprite.y + 100,
      alpha: 0,
      duration: 1000,
      ease: 'Power2'
    });
    if (shadow) {
      this.tweens.add({
        targets: shadow,
        alpha: 0,
        duration: 800,
        ease: 'Power2'
      });
    }
  }

  playMoveFX(side, type = 'normal') {
    const isPlayer = side === 'player';
    const attacker = isPlayer ? this.playerSprite : this.enemySprite;
    const attackerShadow = isPlayer ? this.playerShadow : this.enemyShadow;
    const targetSprite = isPlayer ? this.enemySprite : this.playerSprite;
    if (!attacker || !targetSprite) return;
    const dashDistance = isPlayer ? 50 : -50;
    this.tweens.add({
      targets: [attacker, attackerShadow],
      x: (target) => target.x + dashDistance,
      duration: 150,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    const colors = { fire: 0xff4f00, water: 0x00aaff, grass: 0x4caf50, electric: 0xffeb3b, ice: 0x00ffff, poison: 0xa33ea1, normal: 0xffffff };
    const color = colors[type] || colors.normal;
    let particles;
    if (this.textures.exists('vfx')) {
      particles = this.add.particles(0, 0, 'vfx', { frame: 'pixel', speed: { min: 100, max: 200 }, scale: { start: 2, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 500, tint: color, blendMode: 'ADD', gravityY: 100 });
    } else {
      particles = this.add.particles(0, 0, 'platform', { speed: { min: 50, max: 100 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 400, tint: color, blendMode: 'ADD' });
    }
    particles.setPosition(targetSprite.x, targetSprite.y - 40);
    particles.explode(20);
    this.time.delayedCall(1000, () => particles.destroy());
  }

  async playReleaseEnergy(side, pokemon) {
    const sprite = await this.updatePokemonSprite(side, pokemon, true);
    const shadow = side === 'player' ? this.playerShadow : this.enemyShadow;
    if (!sprite) return;

    this.tweens.killTweensOf(sprite);
    
    // Vue handles the white/blue CSS animation.
    // Phaser quietly fades in behind the DOM.
    sprite.setAlpha(0);

    this.tweens.add({
      targets: sprite,
      alpha: 1,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        this.updatePokemonSprite(side, pokemon);
      }
    });
    
    if (shadow) {
      shadow.setAlpha(0);
      this.tweens.add({ targets: shadow, alpha: 0.25, duration: 800, ease: 'Power2' });
    }
  }
}
