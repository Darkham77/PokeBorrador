<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref, type CSSProperties } from 'vue';
import { useShowdownSandboxStore } from '../useShowdownSandboxStore';
import ShowdownHudCard from './ShowdownHudCard.vue';
import ShowdownWeatherTooltip from './ShowdownWeatherTooltip.vue';
import VirtualSpace from '@/components/battle/VirtualSpace.vue';
import VirtualEntity from '@/components/battle/VirtualEntity.vue';
import BattleEnvironment from '@/components/battle/BattleEnvironment.vue';
import { getCombatantPosition, WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { gsap } from 'gsap';

const store = useShowdownSandboxStore();

// Spatial coordinate constants
const { BASE_ENTITY_SIZE_PLAYER, BASE_ENTITY_SIZE_ENEMY } = WORLD_CONSTANTS;
const p1Pos = computed(() => getCombatantPosition('player'));
const p2Pos = computed(() => getCombatantPosition('enemy'));

// Isolated Camera Zoom and Guides State for Showdown Sandbox
const debugZoom = ref(1.0);
const debugShowGuides = ref(false);

const arenaRef = ref<HTMLElement | null>(null);
const vpWidth = ref(0);
const vpHeight = ref(0);
const camWidth = ref(0);
const camHeight = ref(0);
const tx = ref(0);
const ty = ref(0);
const scale = ref(1);

const cameraStyles = computed<CSSProperties>(() => ({
  width: `${camWidth.value}px`,
  height: `${camHeight.value}px`,
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}));

const worldStyles = computed<CSSProperties & Record<string, string | number>>(() => ({
  position: 'absolute',
  top: '0',
  left: '0',
  width: `${WORLD_CONSTANTS.MAP_WIDTH}px`,
  height: `${WORLD_CONSTANTS.MAP_HEIGHT}px`,
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
  willChange: 'transform',
  '--obj-scale': WORLD_CONSTANTS.OBJECT_SCALE,
  '--bush-size': WORLD_CONSTANTS.BUSH_SIZE,
  '--preview-size': WORLD_CONSTANTS.PREVIEW_SIZE
}));

const updateCamera = (width: number, height: number) => {
  if (!width || !height || width < 100 || height < 100) return;

  let cw = width;
  let ch = height;

  const ratio = cw / ch;
  if (ratio > WORLD_CONSTANTS.RATIO_MAX) {
    cw = ch * WORLD_CONSTANTS.RATIO_MAX;
  } else if (ratio < WORLD_CONSTANTS.RATIO_MIN) {
    ch = cw / WORLD_CONSTANTS.RATIO_MIN;
  }

  camWidth.value = cw;
  camHeight.value = ch;

  const scaleX = cw / WORLD_CONSTANTS.VISIBLE_UNITS_X;
  const scaleY = ch / WORLD_CONSTANTS.VISIBLE_UNITS_Y;
  const currentScale = Math.min(scaleX, scaleY) * debugZoom.value;
  scale.value = currentScale;

  tx.value = (cw / 2) - (WORLD_CONSTANTS.TARGET_X * currentScale);
  ty.value = (ch / 2) - (WORLD_CONSTANTS.TARGET_Y * currentScale);
};

let resizeObserver: ResizeObserver | null = null;

// Zoom Interaction Handlers with GSAP
const zoomIn = () => {
  const targetVal = Math.min(1.0, Math.round((debugZoom.value + 0.1) * 10) / 10);
  gsap.to(debugZoom, {
    value: targetVal,
    duration: 0.3,
    ease: 'power2.out',
    onUpdate: () => {
      if (arenaRef.value) {
        const rect = arenaRef.value.getBoundingClientRect();
        updateCamera(rect.width, rect.height);
      }
    }
  });
};

const zoomOut = () => {
  const targetVal = Math.max(0.5, Math.round((debugZoom.value - 0.1) * 10) / 10);
  gsap.to(debugZoom, {
    value: targetVal,
    duration: 0.3,
    ease: 'power2.out',
    onUpdate: () => {
      if (arenaRef.value) {
        const rect = arenaRef.value.getBoundingClientRect();
        updateCamera(rect.width, rect.height);
      }
    }
  });
};

const toggleGuides = () => {
  debugShowGuides.value = !debugShowGuides.value;
};

// Animated elements references
const playerSpriteRef = ref<HTMLElement | null>(null);
const enemySpriteRef = ref<HTMLElement | null>(null);
const playerPlatformRef = ref<HTMLElement | null>(null);
const enemyPlatformRef = ref<HTMLElement | null>(null);

let playerFloatTween: gsap.core.Tween | null = null;
let enemyFloatTween: gsap.core.Tween | null = null;
let playerPlatformTween: gsap.core.Tween | null = null;
let enemyPlatformTween: gsap.core.Tween | null = null;

const initGsapAnimations = () => {
  // Clear any existing CSS transforms on platforms and set initial properties through GSAP
  // to avoid CSS vs GSAP transform string collisions.
  if (playerPlatformRef.value) {
    gsap.set(playerPlatformRef.value, { scaleY: 0.4, scaleX: 1.0, opacity: 0.8 });
    playerPlatformTween = gsap.to(playerPlatformRef.value, {
      scaleX: 1.05,
      opacity: 0.9,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }

  if (enemyPlatformRef.value) {
    gsap.set(enemyPlatformRef.value, { scaleY: 0.4, scaleX: 1.0, opacity: 0.8 });
    enemyPlatformTween = gsap.to(enemyPlatformRef.value, {
      scaleX: 1.05,
      opacity: 0.9,
      duration: 2.0,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }

  if (playerSpriteRef.value) {
    playerFloatTween = gsap.to(playerSpriteRef.value, {
      y: -12,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }

  if (enemySpriteRef.value) {
    enemyFloatTween = gsap.to(enemySpriteRef.value, {
      y: -10,
      duration: 2.0,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }
};

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    requestAnimationFrame(() => {
      if (!resizeObserver) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        vpWidth.value = width;
        vpHeight.value = height;
        updateCamera(width, height);
      }
    });
  });

  if (arenaRef.value) {
    resizeObserver.observe(arenaRef.value);
    const rect = arenaRef.value.getBoundingClientRect();
    updateCamera(rect.width, rect.height);
  }

  initGsapAnimations();
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (playerFloatTween) playerFloatTween.kill();
  if (enemyFloatTween) enemyFloatTween.kill();
  if (playerPlatformTween) playerPlatformTween.kill();
  if (enemyPlatformTween) enemyPlatformTween.kill();
});

watch(debugZoom, () => {
  if (arenaRef.value) {
    const rect = arenaRef.value.getBoundingClientRect();
    updateCamera(rect.width, rect.height);
  }
});

const getWeatherEmoji = (weather?: string) => {
  if (!weather) return '🍃';
  const map: Record<string, string> = {
    sunnyday: '☀️',
    raindance: '🌧️',
    sandstorm: '🏜️',
    hail: '❄️'
  };
  return map[weather.toLowerCase()] || '🍃';
};

const getWeatherName = (weather?: string) => {
  if (!weather) return 'NORMAL';
  const map: Record<string, string> = {
    sunnyday: 'SOLEADO',
    raindance: 'LLUVIA',
    sandstorm: 'T. ARENA',
    hail: 'GRANIZO'
  };
  return map[weather.toLowerCase()] || weather.toUpperCase();
};
</script>

<template>
  <div
    ref="arenaRef"
    class="battle-scene"
  >
    <!-- Viewport with Dynamic Camera Styles -->
    <div
      class="battle-arena-content"
      :style="cameraStyles"
    >
      <VirtualSpace
        :show-guides="debugShowGuides"
        :world-styles="worldStyles"
      >
        <!-- Environment locked strictly to Gym (gimnasio) -->
        <BattleEnvironment
          location-id="gym"
          current-cycle="dia"
          class="smooth-backdrop"
        />

        <!-- Virtual Entities Layer -->
        <div class="battle-sprites">
          <!-- Enemy Plattform & Sprite -->
          <VirtualEntity
            v-if="store.enemyPokemon"
            class="combatant-sprite"
            :x="p2Pos.x"
            :y="p2Pos.y"
            :w="BASE_ENTITY_SIZE_ENEMY"
            :h="BASE_ENTITY_SIZE_ENEMY"
          >
            <div class="combatant-wrapper enemy-wrapper">
              <div
                ref="enemyPlatformRef"
                class="platform-pad enemy-pad"
              />
              <div
                ref="enemySpriteRef"
                class="sprite-box"
              >
                <img 
                  id="enemy-sprite"
                  :src="getAssetUrl(ASSET_TYPES.POKEMON, store.enemyPokemon.num || store.enemyPokemon.id, { isBack: false, isShiny: store.enemyShiny })" 
                  :alt="store.enemyPokemon.name"
                  class="pokemon-sprite pixelated"
                >
              </div>
            </div>
          </VirtualEntity>

          <!-- Player Plattform & Sprite -->
          <VirtualEntity
            v-if="store.playerPokemon"
            class="combatant-sprite"
            :x="p1Pos.x"
            :y="p1Pos.y"
            :w="BASE_ENTITY_SIZE_PLAYER"
            :h="BASE_ENTITY_SIZE_PLAYER"
          >
            <div class="combatant-wrapper player-wrapper">
              <div
                ref="playerPlatformRef"
                class="platform-pad player-pad"
              />
              <div
                ref="playerSpriteRef"
                class="sprite-box"
              >
                <img 
                  id="player-sprite"
                  :src="getAssetUrl(ASSET_TYPES.POKEMON, store.playerPokemon.num || store.playerPokemon.id, { isBack: true, isShiny: store.playerShiny })" 
                  :alt="store.playerPokemon.name"
                  class="pokemon-sprite pixelated"
                >
              </div>
            </div>
          </VirtualEntity>
        </div>
      </VirtualSpace>
    </div>

    <!-- Floating Weather Badge in Battle Arena -->
    <div
      v-if="store.weather && store.weather.weather"
      class="floating-weather-container"
    >
      <ShowdownWeatherTooltip
        :weather-id="store.weather.weather"
        :duration="store.weather.weatherDuration"
      >
        <div
          class="weather-badge-pill"
          :class="`badge-${store.weather.weather.toLowerCase()}`"
        >
          <span class="weather-badge-emoji">{{ getWeatherEmoji(store.weather.weather) }}</span>
          <span class="weather-badge-name">{{ getWeatherName(store.weather.weather) }}</span>
          <span
            v-if="store.weather.weatherDuration > 0"
            class="weather-badge-turns"
          >{{ store.weather.weatherDuration }}T</span>
        </div>
      </ShowdownWeatherTooltip>
    </div>

    <!-- Floating Info Cards HUD -->
    <div class="hud-overlay">
      <!-- Enemy HUD Card -->
      <ShowdownHudCard
        :pokemon="store.enemyPokemon"
        :hp="store.enemyHP"
        :max-hp="store.enemyMaxHP"
        :team="store.enemyTeam"
        :is-player="false"
        :side-conditions="store.enemySideConditions"
      />

      <!-- Player HUD Card -->
      <ShowdownHudCard
        :pokemon="store.playerPokemon"
        :hp="store.playerHP"
        :max-hp="store.playerMaxHP"
        :team="store.playerTeam"
        :is-player="true"
        :side-conditions="store.playerSideConditions"
      />
    </div>

    <!-- Camera Zoom & Debug Guides Controls -->
    <div class="camera-zoom-controls">
      <button
        class="zoom-btn"
        :disabled="debugZoom >= 1.0"
        @click.stop="zoomIn"
      >
        +
      </button>
      <button
        class="zoom-btn"
        :disabled="debugZoom <= 0.5"
        @click.stop="zoomOut"
      >
        -
      </button>
      <button
        class="zoom-btn debug-btn"
        @click.stop="toggleGuides"
      >
        🗺️
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.battle-scene {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background: #000;
}

.battle-arena-content {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.smooth-backdrop {
  :deep(.arena-bg) {
    image-rendering: auto !important;
  }
}

.battle-sprites {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: calc(var(--z-base) + 10);
}

.floating-weather-container {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: Translatex(-50%);
  z-index: 100;
  pointer-events: auto;
}

.weather-badge-pill {
  font-family: var(--font-pixel);
  font-size: 8px;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  background: Rgba(15, 18, 32, 0.75);
  backdrop-filter: Blur(8px);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  box-shadow: 
    0 10px 25px Rgba(0, 0, 0, 0.5),
    inset 0 1px 1px Rgba(255, 255, 255, 0.1);
  will-change: filter, transform;
  transition: background 0.2s, transform 0.2s;

  &:hover {
    background: Rgba(255, 255, 255, 0.15);
    transform: Translatey(-1px);
  }

  .weather-badge-emoji {
    font-size: 12px;
  }

  .weather-badge-name {
    letter-spacing: 0.5px;
  }

  .weather-badge-turns {
    color: var(--yellow, #ffd60a);
    font-size: 7px;
    background: Rgba(0, 0, 0, 0.3);
    padding: 1px 4px;
    border-radius: 4px;
    border: 1px solid Rgba(255, 255, 255, 0.05);
  }

  &.badge-sunnyday {
    border-color: Rgba(255, 159, 10, 0.4);
    background: Rgba(255, 159, 10, 0.15);
    box-shadow: 
      0 10px 25px Rgba(0, 0, 0, 0.5),
      0 0 15px Rgba(255, 159, 10, 0.15);
  }
  &.badge-raindance {
    border-color: Rgba(10, 132, 255, 0.4);
    background: Rgba(10, 132, 255, 0.15);
    box-shadow: 
      0 10px 25px Rgba(0, 0, 0, 0.5),
      0 0 15px Rgba(10, 132, 255, 0.15);
  }
  &.badge-sandstorm {
    border-color: Rgba(191, 90, 242, 0.4);
    background: Rgba(191, 90, 242, 0.15);
    box-shadow: 
      0 10px 25px Rgba(0, 0, 0, 0.5),
      0 0 15px Rgba(191, 90, 242, 0.15);
  }
  &.badge-hail {
    border-color: Rgba(100, 210, 255, 0.4);
    background: Rgba(100, 210, 255, 0.15);
    box-shadow: 
      0 10px 25px Rgba(0, 0, 0, 0.5),
      0 0 15px Rgba(100, 210, 255, 0.15);
  }
}

/* Flex styling for VirtualEntity alignment */
.combatant-sprite {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: visible;
}

.combatant-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
  overflow: visible;
}

.platform-pad {
  position: absolute;
  bottom: 0;
  left: 5%;
  right: 5%;
  height: 30%;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, Rgba(10, 132, 255, 0.25) 0%, Rgba(10, 132, 255, 0) 70%);
  border: 2px solid Rgba(10, 132, 255, 0.3);
  box-shadow: 
    0 0 25px Rgba(10, 132, 255, 0.3),
    inset 0 0 15px Rgba(10, 132, 255, 0.2);
  transform-origin: bottom center;

  &.enemy-pad {
    background: radial-gradient(ellipse at center, Rgba(255, 69, 58, 0.25) 0%, Rgba(255, 69, 58, 0) 70%);
    border-color: Rgba(255, 69, 58, 0.3);
    box-shadow: 
      0 0 25px Rgba(255, 69, 58, 0.3),
      inset 0 0 15px Rgba(255, 69, 58, 0.2);
  }
}

.sprite-box {
  z-index: 15;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: 100%;
  width: 100%;
  position: relative;
  overflow: visible;
}

.pokemon-sprite {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: bottom center;
  filter: Drop-Shadow(0 10px 15px Rgba(0, 0, 0, 0.6));
  transform-origin: bottom center;
}

.hud-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.pixelated {
  image-rendering: pixelated;
}

/* Camera Zoom Scoped Controls Styling */
.camera-zoom-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
  z-index: calc(var(--z-base) + 40);
  pointer-events: auto;
  @include pixelated;
}

.zoom-btn {
  @include btn-vicio('neutral', 'sm');
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  font-size: 10px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &.debug-btn {
    font-size: 12px !important;
  }
}
</style>
