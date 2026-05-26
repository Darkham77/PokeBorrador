<script setup lang="ts">
import { useShowdownSandboxStore } from '../useShowdownSandboxStore';
import ShowdownHudCard from './ShowdownHudCard.vue';
import ShowdownWeatherTooltip from './ShowdownWeatherTooltip.vue';

const store = useShowdownSandboxStore();

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
  <div class="battle-scene">
    <!-- Background Grid & Stars -->
    <div class="arena-background">
      <div class="nebula-glow" />
      <div class="stars-layer" />
      <div class="battle-grid-3d" />
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

    <!-- Combatants Scene -->
    <div class="combatants-container">
      <!-- Enemy Platform & Sprite -->
      <div
        v-if="store.enemyPokemon"
        class="combatant-wrapper enemy-wrapper"
      >
        <div class="platform-pad enemy-pad" />
        <div class="sprite-box">
          <img 
            id="enemy-sprite"
            :src="store.enemyPokemon.spriteUrl" 
            :alt="store.enemyPokemon.name"
            class="pokemon-sprite pixelated"
          >
        </div>
      </div>

      <!-- Player Platform & Sprite -->
      <div
        v-if="store.playerPokemon"
        class="combatant-wrapper player-wrapper"
      >
        <div class="platform-pad player-pad" />
        <div class="sprite-box">
          <img 
            id="player-sprite"
            :src="store.playerPokemon.spriteUrl" 
            :alt="store.playerPokemon.name"
            class="pokemon-sprite pixelated"
          >
        </div>
      </div>
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
  </div>
</template>

<style scoped lang="scss">
.battle-scene {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
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

.arena-background {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, #1b1130 0%, #05060b 100%);
  z-index: 1;

  .nebula-glow {
    position: absolute;
    top: 20%;
    left: 30%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, Rgba(10, 132, 255, 0.15) 0%, transparent 70%);
    filter: Blur(40px);
    pointer-events: none;
    animation: float-slow 15s infinite alternate ease-in-out;
  }

  .stars-layer {
    position: absolute;
    inset: 0;
    background-image: 
      radial-gradient(circle, Rgba(255,255,255,0.15) 1px, transparent 1px),
      radial-gradient(circle, Rgba(255,255,255,0.08) 1.5px, transparent 1.5px);
    background-size: 120px 120px, 200px 200px;
    background-position: 0 0, 40px 60px;
    opacity: 0.5;
  }

  .battle-grid-3d {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 60%;
    background-image: 
      linear-gradient(Rgba(10, 132, 255, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, Rgba(10, 132, 255, 0.08) 1px, transparent 1px);
    background-size: 50px 50px;
    background-position: center bottom;
    transform: perspective(260px) rotateX(60deg);
    transform-origin: bottom center;
    mask-image: linear-gradient(to top, Rgba(0, 0, 0, 1) 20%, Rgba(0, 0, 0, 0) 100%);
    pointer-events: none;
  }
}

.combatants-container {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.combatant-wrapper {
  position: absolute;
  width: 240px;
  height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;

  &.enemy-wrapper {
    top: 15%;
    right: 18%;
  }

  &.player-wrapper {
    bottom: 12%;
    left: 18%;
  }
}

.platform-pad {
  position: absolute;
  bottom: 0;
  width: 180px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, Rgba(10, 132, 255, 0.25) 0%, Rgba(10, 132, 255, 0) 70%);
  border: 2px solid Rgba(10, 132, 255, 0.3);
  box-shadow: 
    0 0 25px Rgba(10, 132, 255, 0.3),
    inset 0 0 15px Rgba(10, 132, 255, 0.2);
  transform: scaleY(0.4);
  animation: pulse-glow 3s infinite alternate ease-in-out;

  &.enemy-pad {
    width: 160px;
    height: 50px;
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
  height: 200px;
  width: 200px;
  margin-bottom: 10px;
}

.pokemon-sprite {
  max-width: 160px;
  max-height: 160px;
  object-fit: contain;
  filter: Drop-Shadow(0 10px 15px Rgba(0, 0, 0, 0.6));
  animation: float-sprite 4s infinite alternate ease-in-out;
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

// Animaciones Clave
@keyframes float-slow {
  0% { transform: Translatey(0) Scale(1); }
  100% { transform: Translatey(-20px) Scale(1.05); }
}

@keyframes float-sprite {
  0% { transform: Translatey(0); }
  100% { transform: Translatey(-8px); }
}

@keyframes pulse-glow {
  0% { opacity: 0.7; transform: scaleY(0.4) Scale(0.95); }
  100% { opacity: 1; transform: scaleY(0.4) Scale(1.05); }
}
</style>
