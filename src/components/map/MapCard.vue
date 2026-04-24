<script setup>
import { computed, ref, watch, onUnmounted, onMounted } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { MAP_ROUTE_MAPPING } from '@/data/map-assets'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { checkPlayerWinner, calculateSpawnGrid } from '@/logic/map/mapCardHelper'

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


const cycleEmoji = computed(() => {
  const emojis = { morning: '🌅', day: '☀️', dusk: '🌇', night: '🌙' }
  return emojis[props.cycle] || '☀️'
})

const cycleName = computed(() => {
  const names = {
    morning: 'Mañana',
    day: 'Día',
    afternoon: 'Tarde',
    night: 'Noche'
  }
  return names[props.cycle] || 'Normal'
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

const weatherName = computed(() => {
  const names = {
    clear: 'Despejado',
    rain: 'Lluvia',
    storm: 'Tormenta',
    snow: 'Nieve',
    blizzard: 'Ventisca',
    sandstorm: 'Tormenta de Arena',
    mist: 'Niebla',
    fog: 'Niebla',
    heatwave: 'Ola de Calor'
  }
  return names[props.weather] || 'Normal'
})

const atmosphereStyles = computed(() => {
  const filters = {
    morning: 'Brightness(0.6) contrast(1.2) Saturate(1.2) hue-rotate(-15deg)',
    day: 'Brightness(1.0) contrast(1.0) Saturate(1.0)',
    dusk: 'Brightness(0.6) contrast(1.4) Saturate(1.8) sepia(0.5) hue-rotate(-25deg)',
    night: 'Brightness(0.35) contrast(1.3) Saturate(0.6) hue-rotate(210deg)'
  }

  const hoverFilters = {
    morning: 'Brightness(0.5) contrast(1.2)',
    day: 'Brightness(0.65) contrast(1.1)',
    dusk: 'Brightness(0.5) contrast(1.4) sepia(0.3)',
    night: 'Brightness(0.25) contrast(1.2)'
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

const weatherAnimClass = computed(() => {
  if (props.isLocked) return ''
  const anims = {
    clear: 'anim-glow',
    heatwave: 'anim-glow',
    mist: 'anim-drift',
    fog: 'anim-drift',
    rain: 'anim-shake',
    storm: 'anim-shake'
  }
  return anims[props.weather] || ''
})

const factionAnimClass = computed(() => {
  if (!props.dominance?.winner) return ''
  return props.dominance.winner === 'union' ? 'anim-shine' : 'anim-thump'
})

const gameStore = useGameStore()
const getPokemonSprite = (id) => getAssetUrl(ASSET_TYPES.POKEMON, id)

const processedGuardian = computed(() => {
  if (!props.dominance?.guardian) return null
  const id = props.dominance.guardian.id
  
  let isSeen = gameStore.state.seenPokedex?.includes(id) || 
               gameStore.state.pokedex?.includes(id)
  let isCaught = gameStore.state.pokedex?.includes(id)

  if (uiStore.debugPokedexMode === 'none') {
    isSeen = false
    isCaught = false
  } else if (uiStore.debugPokedexMode === 'seen') {
    isSeen = true
    isCaught = false
  } else if (uiStore.debugPokedexMode === 'caught') {
    isSeen = true
    isCaught = true
  }
  
  const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
  const name = isSeen ? (data?.name || id.toUpperCase()) : '???'
  const typeInfo = (isSeen && data?.type) ? `Tipo: ${data.type.toUpperCase()}` : ''
  
  return {
    ...props.dominance.guardian,
    isSeen,
    isCaught,
    name,
    typeInfo,
    sprite: getPokemonSprite(id)
  }
})

const isPlayerWinner = computed(() => {
  return checkPlayerWinner(props.dominance?.winner, gameStore.state.faction)
})

// Optimized processed grid to avoid calling functions in template
const processedGrid = computed(() => {
  const gridData = spawnGrid.value
  const slots = gridData.slots || []
  
  // Cache pokedex state to avoid repeated reactive lookups
  const seenPokedex = gameStore.state.seenPokedex || []
  const caughtPokedex = gameStore.state.pokedex || []
  const debugMode = uiStore.debugPokedexMode
  
  return slots.map((id, index) => {
    if (!id) return { id: null, key: `empty-${index}` }
    
    let isSeen = seenPokedex.includes(id) || caughtPokedex.includes(id)
    let isCaught = caughtPokedex.includes(id)

    if (debugMode === 'none') {
      isSeen = false
      isCaught = false
    } else if (debugMode === 'seen') {
      isSeen = true
      isCaught = false
    } else if (debugMode === 'caught') {
      isSeen = true
      isCaught = true
    }
    
    // Rare check
    const rate = props.spawnPool?.rates?.[id] || 10
    const rare = rate < 10

    // Tooltip logic
    const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
    const name = isSeen ? (data?.name || id.toUpperCase()) : '???'
    const typeInfo = (isSeen && data?.type) ? `Tipo: ${data.type.toUpperCase()}` : ''

    let tooltipDesc = 'Habitante común de esta ruta.'
    if (rare) {
      tooltipDesc = '¡Aparición Especial! Este Pokémon tiene un ratio de aparición muy bajo en esta ruta, por eso emite un aura roja de poder.'
    }

    if (isSeen && typeInfo) {
      tooltipDesc = `${typeInfo}. ${tooltipDesc}`
    }

    return {
      id,
      key: `${id}-${index}`,
      name,
      sprite: getAssetUrl(ASSET_TYPES.POKEMON, id),
      isSeen,
      isCaught,
      isRare: rare,
      tooltipTitle: name === '???' ? 'POKÉMON DESCONOCIDO' : name,
      tooltipDesc
    }
  })
})

const allSpawns = computed(() => [
  ...props.spawnPool.generic,
  ...props.spawnPool.specific
])

// Dynamic Grid & Responsiveness
const cardRef = ref(null)
const currentCols = ref(3)
let resizeObserver = null

onMounted(() => {
  if (cardRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width || 0
      if (width > 580) currentCols.value = 5
      else if (width > 420) currentCols.value = 4
      else currentCols.value = 3
    })
    resizeObserver.observe(cardRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})

const lockReason = computed(() => {
  if (props.isSafariLocked) return 'REQUIERE TICKET SAFARI'
  if (!props.isLocked) return ''
  if (props.map.id === 'cerulean_cave' && props.badgeCount < 8) return '8 MEDALLAS / TICKET'
  if (props.badgeCount < props.map.badges) return `REQUIERE ${props.map.badges} MEDALLAS`
  return 'BLOQUEADO'
})

const lockDescription = computed(() => {
  if (props.isSafariLocked) return 'Necesitas un Ticket Safari para entrar a esta zona.'
  if (!props.isLocked) return ''
  if (props.map.id === 'cerulean_cave') return 'Necesitas 8 medallas o un Ticket Cueva Celeste.'
  return `Consigue ${props.map.badges} medallas para acceder a esta zona.`
})

const spawnGrid = computed(() => {
  const rawSpawns = allSpawns.value
  const count = rawSpawns.length

  const { rows, cols, totalSlots } = calculateSpawnGrid(count, currentCols.value)
  const grid = new Array(totalSlots).fill(null)

  // Place pokemons from the end (bottom-right)
  rawSpawns.forEach((id, index) => {
    grid[totalSlots - 1 - index] = id
  })

  return {
    slots: grid,
    rows,
    cols
  }
})
</script>

<template>
  <div
    ref="cardRef"
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
        {{ lockReason }}
      </span>
    </div>

    <!-- 1. Guardian (Top Left) -->
    <PVTooltip
      v-if="processedGuardian && !isPerformanceMode && !isLocked && !isSafariLocked"
      class="guardian-status-badge"
      :class="{ 
        'is-silhouette': !processedGuardian.isCaught 
      }"
      :title="!processedGuardian.isSeen ? 'POKÉMON ???' : (processedGuardian.captured ? 'GUARDIÁN DERROTADO' : 'POKÉMON GUARDIÁN')"
      :description="processedGuardian.captured 
        ? 'El protector de esta ruta ha sido vencido, permitiendo que una facción tome el control total.' 
        : `Un Pokémon poderoso que protege la ruta. ${processedGuardian.isSeen ? 'Es un ' + processedGuardian.name + ' (' + processedGuardian.typeInfo + '). ' : ''}Derrótalo para liberar la zona y permitir que tu facción la domine, activando bonus de captura.`"
      position="top"
    >
      <img
        :src="processedGuardian.sprite"
        :class="['guardian-mini-sprite', { captured: processedGuardian.captured, 'spawn-silhouette': !processedGuardian.isCaught }]"
        @error="e => e.target.style.display = 'none'"
      >
      <span :class="['guardian-label', { captured: processedGuardian.captured }]">
        {{ processedGuardian.captured ? 'DERROTADO' : 'GUARDIÁN' }}
      </span>
    </PVTooltip>

    <!-- 2. Cycle Pill (Top Right) -->
    <PVTooltip
      v-if="!isPerformanceMode"
      :class="['location-tag', (isLocked || isSafariLocked) ? 'tag-locked' : 'tag-wild', weatherAnimClass]"
      :title="(isLocked || isSafariLocked) ? 'ZONA BLOQUEADA' : 'ESTADO AMBIENTAL'"
      :description="(isLocked || isSafariLocked) ? lockDescription : `Clima: ${weatherName} | Ciclo: ${cycleName}`"
      position="top"
    >
      <span class="pill-content">
        <template v-if="isLocked || isSafariLocked">🔒</template>
        <template v-else>
          <span class="tag-icon">
            {{ cycleEmoji }}{{ weatherEmoji }}
          </span>
        </template>
      </span>
    </PVTooltip>



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

    <!-- 3. Faction Status (Middle Left, below Guardian) -->
    <PVTooltip
      v-if="dominance?.winner && dominance?.winner !== 'none' && !isPerformanceMode && !isLocked && !isSafariLocked"
      class="faction-status-pill"
      title="DOMINIO FACCIÓN"
      :description="`Controlado por ${dominance.winner === 'union' ? 'Unión' : 'Poder'}`"
      position="top"
    >
      <div :class="['pill-content', factionAnimClass]">
        <span class="faction-emoji">
          {{ dominance.winner === 'union' ? '⭐' : '✊' }}
        </span>
      </div>
    </PVTooltip>

    <!-- 5. Fishing Icon (Bottom Left) -->
    <PVTooltip
      v-if="map.fishing && !isPerformanceMode && !isLocked && !isSafariLocked"
      class="fishing-pill-standalone"
      title="PESCA"
      description="¡Esta zona tiene agua! Puedes pescar Pokémon aquí."
      position="top"
    >
      <div class="interactive-pill fishing-pill map-pill">
        <span class="pill-icon">🎣</span>
      </div>
    </PVTooltip>

    <div
      v-if="!isLocked && !isPerformanceMode"
      class="location-spawns"
    >
      <div 
        class="spawn-grid-container"
        :style="{ 
          '--grid-cols': spawnGrid.cols,
          '--grid-rows': spawnGrid.rows,
          '--sprite-scale': 1 
        }"
        :class="{ 'show-debug-grid': uiStore.isDebugGridMode }"
      >
        <div 
          v-for="item in processedGrid" 
          :key="item.key"
          class="spawn-slot"
        >
          <div
            v-if="item.id"
            class="spawn-content"
          >
            <div :class="['sprite-wrapper', { 'rare-spawn': item.isRare }]">
              <PVTooltip 
                :title="item.tooltipTitle || item.name" 
                :description="item.tooltipDesc"
                position="top"
                class="spawn-tooltip-trigger"
              >
                <img
                  :src="item.sprite"
                  class="pixelated"
                  :class="{ 'spawn-silhouette': !item.isCaught }"
                  @error="e => e.target.style.display = 'none'"
                >
              </PVTooltip>
            </div>
          </div>
        </div>
      </div>
    </div>

    <PVTooltip
      v-if="isPlayerWinner && !isPerformanceMode && !isLocked && !isSafariLocked"
      class="dom-badge winning anim-aura"
      title="DOMINADO"
      description="¡Bonus de captura activo por dominio de facción!"
      position="top"
    >
      <span class="pill-content">
        👑
      </span>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/map-card-weather" as *;

.spawn-tooltip-trigger {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

/* Note: Core styles moved to _map-card-render.scss to stay under 500 lines */
</style>
