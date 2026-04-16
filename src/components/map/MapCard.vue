<script setup>
import { computed } from 'vue'

const props = defineProps({
  map: { type: Object, required: true },
  isLocked: { type: Boolean, default: false },
  isSafariLocked: { type: Boolean, default: false },
  cycle: { type: String, default: 'day' },
  badgeCount: { type: Number, default: 0 },
  dominance: { type: Object, default: null }, // { winner: 'union'|'poder', guardian: { id, captured } }
  isRocketExtorted: { type: Boolean, default: false },
  isOfficialRoute: { type: Boolean, default: false },
  spawnPool: { type: Object, default: () => ({ generic: [], specific: [] }) }
})

const emit = defineEmits(['navigate', 'setOfficial'])

const imgPath = computed(() => {
  const mapping = {
    route1: 'ruta 1.png',
    route2: 'ruta 2.png',
    forest: 'bosque viridian.png',
    route22: 'ruta 22.png',
    route3: 'ruta 3.png',
    mt_moon: 'mt. moon.png',
    route4: 'ruta 4.png',
    route24: 'ruta 24.png',
    route25: 'ruta 25.png',
    route5: 'ruta 5.png',
    route6: 'ruta 6.png',
    route11: 'ruta 11.png',
    diglett_cave: 'cueva diglett.png',
    route9: 'ruta 9.png',
    rock_tunnel: 'tunel roca.png',
    route10: 'ruta 10.png',
    power_plant: 'central de energia.png',
    route8: 'ruta 8.png',
    pokemon_tower: 'torre pokemon.png',
    route12: 'ruta 12.png',
    route13: 'ruta 13.png',
    safari_zone: 'zona safari.png',
    seafoam_islands: 'islas espuma.png',
    fishing_island: 'islas espuma.png',
    mansion: 'mansion pokemon.png',
    route23: 'ruta 23.png',
    victory_road: 'calle victoria.png',
    cerulean_cave: 'cueva celeste.png'
  }
  return `/maps/${mapping[props.map.id] || 'default.png'}`
})

const cycleLabel = computed(() => {
  const icons = { morning: '🌅', day: '☀️', dusk: '🌇', night: '🌙' }
  const labels = { morning: 'AMANECER', day: 'DÍA', dusk: 'ATARDECER', night: 'NOCHE' }
  return `${icons[props.cycle] || '☀️'} ${labels[props.cycle] || 'DÍA'}`
})

const getPokemonSprite = (id) => {
  // En una migración ideal, esto vendría de una utilidad o store
  const spriteIds = window.POKEMON_SPRITE_IDS || {}
  const num = spriteIds[id]
  return num ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png` : null
}
</script>

<template>
  <div
    :class="['location-card map-card', { locked: isLocked, 'safari-locked': isSafariLocked }]"
    :style="{ '--bg-image': `url('${imgPath}')` }"
    @click="!isLocked && emit('navigate', map.id)"
  >
    <span :class="['location-tag', isLocked ? 'tag-locked' : 'tag-wild']">
      <template v-if="isLocked">
        {{ isSafariLocked ? '🔒 Ticket Safari' : `🔒 ${map.badges} Medallas` }}
      </template>
      <template v-else>
        {{ cycleLabel }}
      </template>
    </span>

    <span
      v-if="map.fishing"
      class="fishing-rod"
      title="Zona de pesca disponible"
    >🎣</span>

    <!-- Dominancia / Guardianes -->
    <div
      v-if="dominance?.winner"
      class="faction-dominance"
    >
      <img
        :src="`/assets/factions/${dominance.winner}.png`"
        class="faction-logo pulse"
        :title="`Controlado por la ${dominance.winner === 'union' ? 'Unión' : 'Poder'}`"
      >
    </div>

    <div
      v-if="dominance?.guardian"
      class="guardian-badge"
    >
      <img
        :src="getPokemonSprite(dominance.guardian.id)"
        :class="['guardian-sprite', { captured: dominance.guardian.captured }]"
      >
      <span :class="['guardian-label', { captured: dominance.guardian.captured }]">
        {{ dominance.guardian.captured ? 'DERROTADO' : 'GUARDIÁN' }}
      </span>
    </div>

    <div class="location-name">
      {{ map.name }}
      <span
        v-if="isRocketExtorted"
        class="extorted-tag"
        title="Ruta Extorsionada (x1.5 ₽)"
      >[R]</span>
    </div>
    
    <div class="location-desc">
      {{ map.desc }}
    </div>

    <div
      v-if="isSafariLocked"
      class="safari-lock-msg"
    >
      Necesitas un Ticket Safari
    </div>

    <div
      v-if="!isLocked"
      class="location-spawns"
    >
      <!-- Spawns Genéricos -->
      <div class="spawn-row">
        <img
          v-for="id in spawnPool.generic"
          :key="id"
          :src="getPokemonSprite(id)"
          :title="id"
          loading="lazy"
        >
      </div>
      <!-- Spawns Específicos del Ciclo -->
      <div
        v-if="spawnPool.specific.length > 0"
        class="spawn-row cycle-specific-spawns"
      >
        <span class="cycle-emoji-label">{{ cycle === 'night' ? '🌙' : '☀️' }}</span>
        <img
          v-for="id in spawnPool.specific"
          :key="id"
          :src="getPokemonSprite(id)"
          :title="id"
          loading="lazy"
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-card {
  position: relative;
  height: 190px;
  background-image: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%), var(--bg-image);
  background-size: cover;
  background-position: center;
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background-color: var(--dark);
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.map-card:hover:not(.locked) {
  transform: translateY(-4px);
  border-color: var(--yellow);
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
}

.map-card.locked {
  filter: grayscale(1) brightness(0.7);
  cursor: not-allowed;
}

.location-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  padding: 6px 10px;
  border-radius: 8px;
  z-index: 2;
}

.tag-wild { background: rgba(0,0,0,0.6); color: var(--yellow); }
.tag-locked { background: rgba(18,18,18,0.9); color: var(--red); }

.fishing-rod {
  position: absolute;
  top: 12px;
  left: 12px;
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.location-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: #fff;
  margin-bottom: 4px;
}

.location-desc {
  font-size: 11px;
  color: var(--gray);
  margin-bottom: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.location-spawns {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spawn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.spawn-row img {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.cycle-specific-spawns {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 2px 6px;
  align-items: center;
}

.cycle-emoji-label { font-size: 10px; margin-right: 4px; }

.extorted-tag { color: var(--red); text-shadow: 0 0 5px var(--red); margin-left: 4px; }

.faction-dominance {
  position: absolute;
  top: 45px;
  left: 10px;
  z-index: 5;
}

.faction-logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.pulse { animation: pulse 2s infinite; }

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
}

.guardian-badge {
  position: absolute;
  top: 45px;
  right: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.guardian-sprite { width: 40px; height: 40px; image-rendering: pixelated; }
.guardian-sprite.captured { opacity: 0.5; filter: grayscale(1); }

.guardian-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 5px;
  padding: 2px 4px;
  background: var(--yellow);
  color: #000;
  border-radius: 4px;
}

.guardian-label.captured { background: var(--gray); }
</style>
