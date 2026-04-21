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

const allSpawns = computed(() => {
  // We combine both pools. User wants bottom row filled first.
  // In wrap-reverse, the first elements of the list are rendered in the bottom row.
  return [
    ...props.spawnPool.generic,
    ...props.spawnPool.specific
  ]
})
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

    <div class="interactive-pills-container">
      <div
        v-if="map.fishing"
        class="interactive-pill fishing-pill"
      >
        <span class="pill-icon">🎣</span>
        <span class="pill-text">PESCA</span>
      </div>
    </div>

    <div
      v-if="!isLocked"
      class="location-spawns"
    >
      <div class="spawn-row-grid">
        <span
          v-if="spawnPool.specific.length > 0"
          class="cycle-emoji-label"
        >{{ cycleEmoji }}</span>
        <img
          v-for="(id, index) in allSpawns"
          :key="index + '-' + id"
          :src="getPokemonSprite(id)"
          :class="['pixelated', { 'rare-spawn': isRare(id) }]"
          :title="id"
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


