<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { MAP_ROUTE_MAPPING } from '@/data/map-assets'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'

const props = defineProps({
  map: { type: Object, required: true },
  isLocked: { type: Boolean, default: false },
  isSafariLocked: { type: Boolean, default: false },
  cycle: { type: String, default: 'day' }, // morning, day, dusk, night
  weather: { type: String, default: 'clear' }, // clear, rain
  badgeCount: { type: Number, default: 0 },
  dominance: { type: Object, default: null },
  isRocketExtorted: { type: Boolean, default: false },
  spawnPool: { type: Object, default: () => ({ generic: [], specific: [], rates: {} }) }
})

const emit = defineEmits(['navigate'])

const uiStore = useUIStore()
const battleStore = useBattleStore()

const isPerformanceMode = computed(() => {
  return uiStore.isAnyBlockingModalOpen || battleStore.isBattleActive || uiStore.isDebugPerformanceMode
})

const imgPath = computed(() => {
  const fileName = MAP_ROUTE_MAPPING[props.map.id] || 'default'
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

const weatherEmoji = computed(() => {
  const emojis = { 
    clear: '', 
    rain: '🌧️', 
    storm: '⚡', 
    fog: '🌫️', 
    snow: '🌨️', 
    blizzard: '❄️',
    sandstorm: '🏜️', 
    heatwave: '🔥' 
  }
  return emojis[props.weather] || ''
})

const atmosphereStyles = computed(() => {
  const filters = {
    morning: 'Brightness(0.6) contrast(1.2) Saturate(1.2) hue-rotate(-15deg)',
    day: 'Brightness(1.0) contrast(1.0) Saturate(1.0)',
    dusk: 'Brightness(0.6) contrast(1.4) Saturate(1.8) sepia(0.5) hue-rotate(-25deg)',
    night: 'Brightness(0.35) contrast(1.3) Saturate(0.6) hue-rotate(210deg)'
  }

  const hoverFilters = {
    morning: 'Brightness(0.7) contrast(1.3) Saturate(1.4) hue-rotate(-15deg)',
    day: 'Brightness(1.1) contrast(1.1) Saturate(1.1)',
    dusk: 'Brightness(0.7) contrast(1.5) Saturate(2.0) sepia(0.4) hue-rotate(-25deg)',
    night: 'Brightness(0.4) contrast(1.3) Saturate(0.6) hue-rotate(220deg)'
  }

  let baseFilter = filters[props.cycle] || filters.day
  let hoverFilter = hoverFilters[props.cycle] || hoverFilters.day

  const isNight = props.cycle === 'night'
  const weatherAdjustments = {
    rain: { 
      base: ` Blur(0.4px) ${isNight ? '' : 'Brightness(0.7) Saturate(0.8)'}`, 
      hover: ` Blur(0.4px) ${isNight ? 'Brightness(1.1)' : 'Brightness(0.8) Saturate(0.9)'}` 
    },
    storm: { 
      base: ` Blur(0.4px) ${isNight ? '' : 'Brightness(0.8) Contrast(1.2) Hue-rotate(15deg)'}`, 
      hover: ` Blur(0.4px) ${isNight ? 'Brightness(1.1)' : 'Brightness(0.9) Contrast(1.3) Hue-rotate(15deg)'}` 
    },
    fog: { 
      base: ` Blur(4px) ${isNight ? 'Brightness(0.8) Grayscale(0.3)' : 'Brightness(1.05) Grayscale(0.45) Saturate(0.5)'}`, 
      hover: ` Blur(2px) ${isNight ? 'Brightness(1.0) Grayscale(0.2)' : 'Brightness(1.15) Grayscale(0.3) Saturate(0.7)'}` 
    },
    snow: { 
      base: ` Blur(0.3px) ${isNight ? 'Brightness(0.8) Grayscale(0.3)' : 'Brightness(1.05) Grayscale(0.35) Saturate(0.5)'}`, 
      hover: ` Blur(0.3px) ${isNight ? 'Brightness(1.0) Grayscale(0.2)' : 'Brightness(1.1) Grayscale(0.3) Saturate(0.6)'}` 
    },
    blizzard: { 
      base: ` Blur(1.5px) ${isNight ? 'Brightness(0.7) Grayscale(0.5)' : 'Brightness(1.2) Grayscale(0.6) Saturate(0.25)'}`, 
      hover: ` Blur(1px) ${isNight ? 'Brightness(0.9) Grayscale(0.4)' : 'Brightness(1.3) Grayscale(0.5) Saturate(0.35)'}` 
    },
    sandstorm: { 
      base: ` Sepia(0.5) ${isNight ? '' : 'Contrast(1.2) Brightness(0.9)'}`, 
      hover: ` Sepia(0.4) ${isNight ? 'Brightness(1.1)' : 'Contrast(1.1) Brightness(1.0)'}` 
    },
    heatwave: { 
      base: ` Saturate(1.5) ${isNight ? '' : 'Contrast(1.1) Brightness(1.1) Hue-rotate(-10deg)'}`, 
      hover: ` Saturate(1.8) ${isNight ? 'Brightness(1.2)' : 'Contrast(1.2) Brightness(1.2) Hue-rotate(-15deg)'}` 
    }
  }

  // NO mostrar clima si la ruta está bloqueada
  const showWeather = !props.isLocked && !props.isSafariLocked

  if (showWeather && weatherAdjustments[props.weather]) {
    baseFilter += weatherAdjustments[props.weather].base
    hoverFilter += weatherAdjustments[props.weather].hover
  }

  return {
    '--atmosphere-filter': baseFilter,
    '--atmosphere-filter-hover': hoverFilter,
    '--bg-image': `url('${imgPath.value}')`
  }
})

// Weather Logic: Lightning Randomization
const lightningPos = ref({ x1: 20, x2: 60 })
let lightningInterval = null

function updateLightningPos() {
  const x1 = Math.floor(Math.random() * 60) + 10 // 10% to 70%
  const x2 = x1 + (Math.floor(Math.random() * 20) + 10) // offset 10-30%
  lightningPos.value = { x1, x2 }
}

watch([() => props.weather, isPerformanceMode], ([newWeather, perfMode]) => {
  if (newWeather === 'storm' && !perfMode) {
    updateLightningPos()
    if (!lightningInterval) {
      lightningInterval = setInterval(updateLightningPos, 7000)
    }
  } else {
    if (lightningInterval) {
      clearInterval(lightningInterval)
      lightningInterval = null
    }
  }
}, { immediate: true })

onUnmounted(() => {
  if (lightningInterval) clearInterval(lightningInterval)
})

const getPokemonSprite = (id) => getAssetUrl(ASSET_TYPES.POKEMON, id)
const getFactionIcon = (faction) => getAssetUrl(ASSET_TYPES.FACTION, faction)

const isRare = (id) => {
  const rate = props.spawnPool.rates[id] || 10
  return rate < 10
}

const allSpawns = computed(() => [
  ...props.spawnPool.generic,
  ...props.spawnPool.specific
])
</script>

<template>
  <div
    :class="['location-card map-card legacy-panel', { locked: isLocked, 'safari-locked': isSafariLocked }]"
    :style="atmosphereStyles"
    @click="!isLocked && !isPerformanceMode && emit('navigate', map.id)"
  >
    <!-- Weather Layer -->
    <div
      v-if="weather !== 'clear' && !isPerformanceMode && !isLocked && !isSafariLocked"
      :class="['weather-overlay', weather]"
    >
      <!-- Rain & Storm -->
      <template v-if="weather === 'rain' || weather === 'storm'">
        <div class="rain-layer layer-1" />
        <div class="rain-layer layer-2" />
        <div
          v-if="weather === 'storm'"
          class="lightning-bolt"
          :style="{ '--lx1': lightningPos.x1 + '%', '--lx2': lightningPos.x2 + '%' }"
        />
      </template>

      <!-- Snow & Blizzard -->
      <template v-if="weather === 'snow' || weather === 'blizzard'">
        <div class="snow-layer layer-1" />
        <div class="snow-layer layer-2" />
      </template>

      <!-- Sandstorm -->
      <template v-if="weather === 'sandstorm'">
        <div class="sandstorm-layer layer-1" />
        <div class="sandstorm-layer layer-2" />
      </template>
    </div>

    <!-- BLOQUEO OVERLAY -->
    <div
      v-if="isLocked || isSafariLocked"
      class="lock-overlay"
    >
      <span
        v-if="!isPerformanceMode"
        class="lock-text"
      >
        {{ isSafariLocked ? '🎫 REQUIERE TICKET' : '🔒 BLOQUEADO' }}
      </span>
    </div>

    <!-- 1. Guardian (Top Left) -->
    <div
      v-if="dominance?.guardian && !isPerformanceMode"
      class="guardian-status-badge"
    >
      <img
        :src="getPokemonSprite(dominance.guardian.id)"
        :class="['guardian-mini-sprite', { captured: dominance.guardian.captured }]"
        @error="e => e.target.style.display = 'none'"
      >
      <span :class="['guardian-label', { captured: dominance.guardian.captured }]">
        {{ dominance.guardian.captured ? 'DERROTADO' : 'GUARDIÁN' }}
      </span>
    </div>

    <!-- 2. Cycle Pill (Top Right) -->
    <span
      v-if="!isPerformanceMode"
      :class="['location-tag', isLocked ? 'tag-locked' : 'tag-wild']"
    >
      <template v-if="isLocked">
        {{ isSafariLocked ? '🔒 TICKET SAFARI' : `🔒 ${map.badges} MEDALLAS` }}
      </template>
      <template v-else>
        {{ cycleEmoji }}<template v-if="!isLocked && !isSafariLocked">{{ weatherEmoji }}</template> {{ cycleLabel }}
      </template>
    </span>

    <!-- 3. Faction Dominance -->
    <div
      v-if="dominance?.winner && !isPerformanceMode"
      class="faction-dominance"
    >
      <img
        :src="getFactionIcon(dominance.winner)"
        class="faction-logo pulse"
        :title="`Controlado por ${dominance.winner === 'union' ? 'Unión' : 'Poder'}`"
        @error="e => e.target.style.display = 'none'"
      >
    </div>

    <!-- 4. Location Info -->
    <div
      v-if="!isPerformanceMode"
      class="location-header"
    >
      <div class="location-name">
        {{ map.name }}
      </div>
      <div class="location-desc">
        {{ map.desc }}
      </div>
    </div>

    <!-- 5. Interactive Icons -->
    <div
      v-if="!isPerformanceMode"
      class="interactive-pills-container"
    >
      <div
        v-if="map.fishing"
        class="interactive-pill fishing-pill"
      >
        <span class="pill-icon">🎣</span>
        <span class="pill-text">PESCA</span>
      </div>
    </div>

    <div
      v-if="!isLocked && !isPerformanceMode"
      class="location-spawns"
    >
      <div class="spawn-row-grid">
        <img
          v-for="(id, index) in allSpawns"
          :key="index + '-' + id"
          :src="getPokemonSprite(id)"
          :class="['pixelated', { 'rare-spawn': isRare(id) }]"
          :title="id"
          @error="e => e.target.style.display = 'none'"
        >
      </div>
    </div>

    <!-- 8. Dominado Badge -->
    <span
      v-if="dominance?.winner && !isPerformanceMode"
      class="dom-badge dominance winning"
    >
      👑 Dominado <span class="bonus-icon">✨</span>
    </span>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/map-card-weather" as *;

/* Note: Core styles moved to _map-card-render.scss to stay under 500 lines */
</style>
