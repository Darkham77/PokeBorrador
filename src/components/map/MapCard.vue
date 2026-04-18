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
    route1: 'ruta 1.webp',
    route2: 'ruta 2.webp',
    forest: 'bosque viridian.webp',
    route22: 'ruta 22.webp',
    route3: 'ruta 3.webp',
    mt_moon: 'mt. moon.webp',
    route4: 'ruta 4.webp',
    route24: 'ruta 24.webp',
    route25: 'ruta 25.webp',
    route5: 'ruta 5.webp',
    route6: 'ruta 6.webp',
    route11: 'ruta 11.webp',
    diglett_cave: 'cueva diglett.webp',
    route9: 'ruta 9.webp',
    rock_tunnel: 'tunel roca.webp',
    route10: 'ruta 10.webp',
    power_plant: 'central de energia.webp',
    route8: 'ruta 8.webp',
    pokemon_tower: 'torre pokemon.webp',
    route12: 'ruta 12.webp',
    route13: 'ruta 13.webp',
    safari_zone: 'zona safari.webp',
    seafoam_islands: 'islas espuma.webp',
    fishing_island: 'islas espuma.webp',
    mansion: 'mansion pokemon.webp',
    route23: 'ruta 23.webp',
    victory_road: 'calle victoria.webp',
    cerulean_cave: 'cueva celeste.webp'
  }
  return `/maps/${mapping[props.map.id] || 'default.webp'}`
})

const cycleLabel = computed(() => {
  const labels = { morning: 'AMANECER', day: 'DÍA', dusk: 'ATARDECER', night: 'NOCHE' }
  return labels[props.cycle] || 'DÍA'
})

const getPokemonSprite = (id) => {
  const spriteIds = window.POKEMON_SPRITE_IDS || {}
  const num = spriteIds[id]
  return num ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.webp` : null
}

const getFactionIcon = (faction) => {
  if (!faction) return ''
  return new URL(`../../assets/ui/factions/${faction}.webp`, import.meta.url).href
}
</script>

<template>
  <div
    :class="['location-card map-card legacy-panel', { locked: isLocked, 'safari-locked': isSafariLocked }]"
    :style="{ '--bg-image': `url('${imgPath}')` }"
    @click="!isLocked && emit('navigate', map.id)"
  >
    <!-- Header Tag -->
    <span :class="['location-tag', isLocked ? 'tag-locked' : 'tag-wild']">
      <template v-if="isLocked">
        {{ isSafariLocked ? '🔒 TICKET SAFARI' : `🔒 ${map.badges} MEDALLAS` }}
      </template>
      <template v-else>
        {{ cycle === 'night' ? '🌙' : '☀️' }} {{ cycleLabel }}
      </template>
    </span>

    <span
      v-if="map.fishing"
      class="fishing-rod"
      title="Zona de pesca"
    >🎣</span>

    <!-- Dominancia / Guardianes -->
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

    <!-- Location Info -->
    <div class="card-content">
      <div class="location-name">
        {{ map.name }}
        <span
          v-if="isRocketExtorted"
          class="extorted-tag"
          title="Extorsionada"
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
        <div class="spawn-row">
          <img
            v-for="id in spawnPool.generic"
            :key="id"
            :src="getPokemonSprite(id)"
            class="pixelated"
            loading="lazy"
          >
        </div>
        <div
          v-if="spawnPool.specific.length > 0"
          class="spawn-row cycle-specific-spawns"
        >
          <span class="cycle-emoji-label">{{ cycle === 'night' ? '🌙' : '☀️' }}</span>
          <img
            v-for="id in spawnPool.specific"
            :key="id"
            :src="getPokemonSprite(id)"
            class="pixelated"
            loading="lazy"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.map-card {
  position: relative;
  height: 200px;
  background-image: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4)), var(--bg-image);
  background-size: cover;
  background-position: center;
  border: 4px solid #333;
  box-shadow: 0 0 0 4px #000;
  padding: 15px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  cursor: pointer;
  transition: all 0.1s;
  overflow: hidden;
}

.map-card:hover:not(.locked) {
  border-color: #666;
  transform: translateY(-2px);
}

.map-card.locked {
  filter: grayScale(100%) Brightness(0.6);
  cursor: not-allowed;
}

.location-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  padding: 4px 8px;
  border: 2px solid #333;
  z-index: 5;
}

.tag-wild { background: #000; color: #ffcc00; }
.tag-locked { background: #111; color: #ff3b3b; }

.fishing-rod {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 16px;
  z-index: 5;
}

.card-content {
  position: relative;
  z-index: 2;
}

.location-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: #fff;
  margin-bottom: 5px;
  text-shadow: 2px 2px #000;
}

.location-desc {
  font-size: 10px;
  color: #aaa;
  margin-bottom: 10px;
  line-height: 1.4;
  height: 28px;
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
  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));
}

.cycle-specific-spawns {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 2px 5px;
  align-items: center;
}

.cycle-emoji-label { font-size: 10px; margin-right: 5px; }

.extorted-tag { color: #ff3b3b; text-shadow: 0 0 5px #ff3b3b; margin-left: 5px; }

.faction-dominance {
  position: absolute;
  top: 45px;
  left: 10px;
  z-index: 10;
}

.faction-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.pulse { animation: pulse 2s infinite; }

@keyframes pulse {
  0% { transform: Scale(1.0); opacity: 0.8; }
  50% { transform: Scale(1.1); opacity: 1; }
  100% { transform: Scale(1.0); opacity: 0.8; }
}

.guardian-badge {
  position: absolute;
  top: 45px;
  right: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.guardian-sprite { width: 42px; height: 42px; image-rendering: pixelated; }
.guardian-sprite.captured { opacity: 0.4; filter: grayScale(100%); }

.guardian-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 5px;
  padding: 2px 4px;
  background: #ffcc00;
  color: #000;
  border: 1px solid #000;
}

.guardian-label.captured { background: #555; color: #ccc; }

.safari-lock-msg {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  color: #ff3b3b;
  margin-top: 5px;
}

.pixelated {
  image-rendering: -moz-crisp-edges;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: pixelated;
  image-rendering: optimize-speed;
}
</style>
