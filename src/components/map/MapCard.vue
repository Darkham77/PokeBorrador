<script setup>
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const props = defineProps({
  map: { type: Object, required: true },
  isLocked: { type: Boolean, default: false },
  isSafariLocked: { type: Boolean, default: false },
  cycle: { type: String, default: 'day' },
  badgeCount: { type: Number, default: 0 },
  dominance: { type: Object, default: null }, // { winner: 'union'|'poder', guardian: { id, captured } }
  isRocketExtorted: { type: Boolean, default: false },
  isOfficialRoute: { type: Boolean, default: false },
  spawnPool: { type: Object, default: () => ({ generic: [], specific: [], rates: {} }) }
})

const emit = defineEmits(['navigate', 'setOfficial'])

const imgPath = computed(() => {
  const mapping = {
    route1: 'ruta 1',
    route2: 'ruta 2',
    forest: 'bosque viridian',
    route22: 'ruta 22',
    route3: 'ruta 3',
    mt_moon: 'mt. moon',
    route4: 'ruta 4',
    route24: 'ruta 24',
    route25: 'ruta 25',
    route5: 'ruta 5',
    route6: 'ruta 6',
    route11: 'ruta 11',
    diglett_cave: 'cueva diglett',
    route9: 'ruta 9',
    rock_tunnel: 'tunel roca',
    route10: 'ruta 10',
    power_plant: 'central de energia',
    route8: 'ruta 8',
    pokemon_tower: 'torre pokemon',
    route12: 'ruta 12',
    route13: 'ruta 13',
    safari_zone: 'zona safari',
    seafoam_islands: 'islas espuma',
    fishing_island: 'islas espuma',
    mansion: 'mansion pokemon',
    route23: 'ruta 23',
    victory_road: 'calle victoria',
    cerulean_cave: 'cueva celeste'
  }
  const fileName = mapping[props.map.id] || 'default'
  return getAssetUrl(ASSET_TYPES.MAP, fileName)
})

const cycleLabel = computed(() => {
  const labels = { morning: 'AMANECER', day: 'DÍA', dusk: 'ATARDECER', night: 'NOCHE' }
  return labels[props.cycle] || 'DÍA'
})

const cycleEmoji = computed(() => {
  const emojis = { morning: '🌅', day: '☀️', dusk: '🌇', night: '🌙' }
  return emojis[props.cycle] || '☀️'
})

const getPokemonSprite = (id) => getAssetUrl(ASSET_TYPES.POKEMON, id)
const getFactionIcon = (faction) => getAssetUrl(ASSET_TYPES.FACTION, faction)

const isRare = (id) => {
  const rate = props.spawnPool.rates[id] || 10
  return rate < 10
}
</script>

<template>
  <div
    :class="['location-card map-card legacy-panel', { locked: isLocked, 'safari-locked': isSafariLocked }]"
    :style="{ '--bg-image': `url('${imgPath}')` }"
    @click="!isLocked && emit('navigate', map.id)"
  >
    <!-- BLOQUEO OVERLAY (Capa superior absoluta) -->
    <div
      v-if="isLocked || isSafariLocked"
      class="lock-overlay"
    >
      <span class="lock-text">
        {{ isSafariLocked ? '🎫 REQUIERE TICKET' : '🔒 BLOQUEADO' }}
      </span>
    </div>

    <!-- 1. Guardian (Top Left) -->
    <div
      v-if="dominance?.guardian"
      class="guardian-status-badge"
    >
      <img
        :src="getPokemonSprite(dominance.guardian.id)"
        :class="['guardian-mini-sprite', { captured: dominance.guardian.captured }]"
      >
      <span :class="['guardian-label', { captured: dominance.guardian.captured }]">
        {{ dominance.guardian.captured ? 'DERROTADO' : 'GUARDIÁN' }}
      </span>
    </div>

    <!-- 2. Cycle Pill (Top Right) -->
    <span :class="['location-tag', isLocked ? 'tag-locked' : 'tag-wild']">
      <template v-if="isLocked">
        {{ isSafariLocked ? '🔒 TICKET SAFARI' : `🔒 ${map.badges} MEDALLAS` }}
      </template>
      <template v-else>
        {{ cycleEmoji }} {{ cycleLabel }}
      </template>
    </span>

    <!-- 3. Faction Dominance (Top Center-Left) -->
    <div
      v-if="dominance?.winner"
      class="faction-dominance"
    >
      <img
        :src="getFactionIcon(dominance.winner)"
        class="faction-logo pulse"
        :title="`Controlado por ${dominance.winner === 'union' ? 'Unión' : 'Poder'}`"
      >
    </div>

    <!-- 4. Location Info (Top Center) -->
    <div class="location-header">
      <div class="location-name">
        {{ map.name }}
        <span
          v-if="isRocketExtorted"
          class="extorted-tag"
        >[R]</span>
      </div>
      <div class="location-desc">
        {{ map.desc }}
      </div>
    </div>

    <!-- 5. Interactive Icons -->
    <span
      v-if="map.fishing"
      class="fishing-rod"
    >🎣</span>

    <!-- 7. Spawns (Bottom) -->
    <div
      v-if="!isLocked"
      class="location-spawns"
    >
      <div class="spawn-row">
        <img
          v-for="id in spawnPool.generic"
          :key="id"
          :src="getPokemonSprite(id)"
          :class="['pixelated', { 'rare-spawn': isRare(id) }]"
          loading="lazy"
        >
      </div>
      <div
        v-if="spawnPool.specific.length > 0"
        class="spawn-row cycle-specific-spawns"
      >
        <span class="cycle-emoji-label">{{ cycleEmoji }}</span>
        <img
          v-for="id in spawnPool.specific"
          :key="id"
          :src="getPokemonSprite(id)"
          :class="['pixelated', { 'rare-spawn': isRare(id) }]"
          loading="lazy"
        >
      </div>
    </div>

    <!-- 8. Dominado Badge (Bottom Right) -->
    <span
      v-if="dominance?.winner"
      class="dom-badge dominance winning"
    >
      👑 Dominado <span class="bonus-icon">✨</span>
    </span>
  </div>
</template>

<style scoped lang="scss">
@use 'sass:string';
@use '../../styles/core/mixins' as *;

.map-card {
  position: relative;
  height: 220px;
  background-image: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.8) 100%), var(--bg-image);
  background-size: cover;
  background-position: center;
  border-radius: 20px;
  border: 2px solid #888 !important;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    background: inherit;
    background-size: 110%;
    background-position: center;
    filter: brightness(0.7);
    transition: transform 0.6s ease;
    z-index: 0;
  }

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 15px 35px rgba(0,0,0,0.6);
    border-color: var(--yellow) !important;

    &::before { transform: Scale(1.1); filter: brightness(0.9); }
  }

  &.locked, &.safari-locked {
    filter: none !important;
    opacity: 1 !important;

    &::before { 
      filter: string.unquote("grayscale(1)") brightness(0.4) !important; 
    }
    
    .location-header, .location-spawns, .guardian-status-badge, .faction-dominance {
      filter: string.unquote("grayscale(1)") brightness(0.6);
      opacity: 0.4;
    }
  }

  & > * { position: relative; z-index: 2; }
}

/* Header & Info */
.location-header {
  position: absolute;
  top: 18px;
  left: 0;
  right: 0;
  padding: 0 45px;
  text-align: center;
  pointer-events: none;
  z-index: 5;
}

.location-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 11px;
  color: var(--yellow);
  text-shadow: 0 2px 0 rgba(0,0,0,1);
  margin-bottom: 4px;
  width: 100%;
}

.location-desc {
  font-size: 10px;
  line-height: 1.2;
  color: #ccc;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  width: 100%;
  margin: 0 auto;
  text-align: center;
}

/* Guardian Badge (Top Left) */
.guardian-status-badge {
  position: absolute;
  top: 15px;
  left: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0,0,0,0.85);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 8px;
  padding: 4px;
  backdrop-filter: blur(4px);
  z-index: 10;
}

.guardian-mini-sprite {
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 0 5px rgba(255,255,255,0.3));
  image-rendering: pixelated;

  &.captured { filter: string.unquote("grayscale(1)") opacity(0.5); }
}

.guardian-label {
  font-family: 'Nunito', sans-serif;
  font-size: 8px;
  font-weight: 900;
  color: #fff;
  background: #ff3e3e;
  padding: 2px 5px;
  border-radius: 4px;
  margin-top: 2px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.4);

  &.captured { background: #22c55e; }
}

/* Cycle Pill (Top Right) */
.location-tag {
  position: absolute;
  top: 15px;
  right: 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  padding: 6px 12px;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 20px;
  color: #ffcc00;
  z-index: 10;
}

.tag-locked { color: #ff6e6e; border-color: rgba(255, 110, 110, 0.3); }

/* Spawns (Bottom) */
.location-spawns {
  position: absolute;
  bottom: 10px;
  left: 15px;
  right: 15px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  pointer-events: none;
}

.spawn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
  width: 100%;

  img {
    width: 54px;
    height: 54px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));
    image-rendering: pixelated;
    
    &:not(:first-child) { margin-left: -12px; }
  }
}

.cycle-specific-spawns {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(255,255,255,0.15);
}

.cycle-emoji-label { font-size: 14px; margin-right: 6px; align-self: center; }

.rare-spawn {
  animation: pulse-red 2s infinite ease-in-out;
}

@keyframes pulse-red {
  0%, 100% { filter: drop-shadow(0 0 2px #ff3333) drop-shadow(0 0 5px rgba(255, 51, 51, 0.6)); }
  50% { filter: drop-shadow(0 0 4px #ff3333) drop-shadow(0 0 10px rgba(255, 51, 51, 0.8)); }
}

/* Lock Overlay */
.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15;
  pointer-events: none;
}

.lock-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: #ff4747;
  text-shadow: 0 0 10px rgba(255, 0, 0, 0.8), 0 2px 4px rgba(0,0,0,1);
  letter-spacing: 1px;
}

.safari-locked .lock-text {
  color: #ffa500;
  text-shadow: 0 0 10px rgba(255, 165, 0, 0.8), 0 2px 4px rgba(0,0,0,1);
}

/* Miscellaneous */
.fishing-rod {
  position: absolute;
  bottom: 12px;
  left: 12px;
  font-size: 20px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.dom-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-size: 9px;
  font-weight: 700;
  color: var(--yellow);
  background: rgba(0,0,0,0.6);
  padding: 4px 8px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.faction-dominance {
  position: absolute;
  top: 65px;
  left: 12px;
}

.faction-logo { width: 32px; height: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); }
.pulse { animation: pulse 2s infinite; }

@keyframes pulse {
  0%, 100% { transform: Scale(1); opacity: 0.8; }
  50% { transform: Scale(1.1); opacity: 1; }
}

.pixelated {
  image-rendering: pixelated;
}
</style>
