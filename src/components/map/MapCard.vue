<script setup lang="ts">
import { computed, ref, onUnmounted, onMounted } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { MAP_ROUTE_MAPPING } from '@/data/map-assets'

import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import { getRouteWeather } from '@/logic/weatherUtils'

import { checkPlayerWinner, calculateSpawnGrid } from '@/logic/map/mapCardHelper'


interface MapData {
  id: string
  name: string
  desc: string
  badges: number
  wild?: Record<string, string[]>
  fishing?: { pool: string[], rates: number[] }
  weather?: Record<string, { visitors?: Record<string, unknown>, exclusive?: Record<string, unknown> }>
}

interface DominanceInfo {
  winner?: string | null
  guardian?: { id: string, captured: boolean } | null
}

interface SpawnPool {
  generic: string[]
  specific: string[]
  rates: Record<string, number>
}

interface Props {
  map: MapData
  isLocked?: boolean
  isSafariLocked?: boolean
  cycle?: string
  weather?: string
  badgeCount?: number
  dominance?: DominanceInfo | null
  isRocketExtorted?: boolean
  spawnPool?: SpawnPool
  forcedWeather?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  isLocked: false,
  isSafariLocked: false,
  cycle: 'day',
  weather: 'clear',
  badgeCount: 0,
  dominance: null,
  isRocketExtorted: false,
  spawnPool: () => ({ generic: [], specific: [], rates: {} }),
  forcedWeather: null
})

const emit = defineEmits<{
  (e: 'navigate', map: MapData): void
}>()

const uiStore = useUIStore()
const battleStore = useBattleStore()
const mapStore = useMapStore()
const gameStore = useGameStore()

const cardRef = ref<HTMLElement | null>(null)

const isPerformanceMode = computed(() => {
  return uiStore.isAnyBlockingModalOpen || battleStore.isBattleActive || uiStore.isDebugPerformanceMode
})

const imgPath = computed(() => {
  const fileName = (MAP_ROUTE_MAPPING as Record<string, string>)[props.map.id] || 'default'
  return getAssetUrl(ASSET_TYPES.MAP, fileName, { cycle: props.cycle as any })
})

const cycleEmoji = computed(() => {
  const emojis: Record<string, string> = { morning: '🌅', day: '☀️', dusk: '🌇', night: '🌙' }
  return emojis[props.cycle as string] || '☀️'
})

const cycleName = computed(() => {
  const names: Record<string, string> = { morning: 'Mañana', day: 'Día', afternoon: 'Tarde', dusk: 'Atardecer', night: 'Noche' }
  return names[props.cycle as string] || 'Normal'
})

const seasonName = computed(() => mapStore.currentSeason.label)
const seasonEmoji = computed(() => mapStore.currentSeason.icon)

const computedWeather = computed(() => {
  return props.forcedWeather || mapStore.globalWeather || getRouteWeather(props.map.id, mapStore.currentSeason.id, mapStore.currentEpochHour)
})

const weatherEmoji = computed(() => {
  const emojis: Record<string, string> = { clear: '', rain: '🌧️', storm: '⚡', fog: '🌫️', snow: '🌨️', blizzard: '❄️', sandstorm: '🏜️', heatwave: '🔥' }
  return emojis[computedWeather.value as string] || ''
})

const weatherName = computed(() => {
  const names: Record<string, string> = { clear: 'Despejado', rain: 'Lluvia', storm: 'Tormenta', snow: 'Nieve', blizzard: 'Ventisca', sandstorm: 'Tormenta de Arena', fog: 'Niebla', heatwave: 'Ola de Calor' }
  return names[computedWeather.value as string] || 'Normal'
})

const atmosphere = ref<{ atmosphereStyles?: { filter?: string }, animClass?: string } | null>(null)

const factionAnimClass = computed(() => {
  if (!props.dominance?.winner) return ''
  return props.dominance.winner === 'union' ? 'anim-shine' : 'anim-thump'
})

const getPokemonSprite = (id: string) => getAssetUrl(ASSET_TYPES.POKEMON, id)

const processedGuardian = computed(() => {
  if (!props.dominance?.guardian) return null
  const id = props.dominance.guardian.id
  let isSeen = (gameStore.state.seenPokedex || []).includes(id) || (gameStore.state.pokedex || []).includes(id)
  let isCaught = (gameStore.state.pokedex || []).includes(id)

  if (uiStore.debugPokedexMode === 'caught') {
    isSeen = true; isCaught = true
  } else if (uiStore.debugPokedexMode === 'seen') {
    isSeen = true
  } else if (uiStore.debugPokedexMode === 'none') {
    isSeen = false; isCaught = false
  }
  
  const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
  const name = isSeen ? (data?.name || id.toUpperCase()) : 'Desconocido'
  const typeInfo = (isSeen && data?.type) ? (Array.isArray(data.type) ? data.type.join('/') : data.type).toUpperCase() : '???'
  const captured = props.dominance.guardian.captured || false

  return { 
    ...props.dominance.guardian, 
    isSeen, 
    isCaught, 
    name, 
    typeInfo, 
    captured,
    sprite: getPokemonSprite(id), 
    seed: id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) / 100
  }
})

const isPlayerWinner = computed(() => checkPlayerWinner(props.dominance?.winner || null, gameStore.state.faction))

interface ProcessedSpawn {
  id: string | null
  key: string
  name?: string
  sprite?: string
  isSeen?: boolean
  isCaught?: boolean
  isRare?: boolean
  isAtmospheric?: boolean
  tooltipTitle?: string
  tooltipDesc?: string
  seed?: number
}

const processedGrid = computed<ProcessedSpawn[]>(() => {
  const gridData = spawnGrid.value
  const slots = gridData.slots || []
  const seenPokedex = gameStore.state.seenPokedex || []
  const caughtPokedex = gameStore.state.pokedex || []
  
  const weatherBoosts: Record<string, string[]> = {
    rain: ['water', 'bug', 'grass'],
    storm: ['electric', 'dragon'],
    sun: ['fire', 'grass'],
    snow: ['ice', 'steel'],
    sandstorm: ['rock', 'ground', 'steel'],
    fog: ['ghost', 'psychic', 'dark'],
    heatwave: ['fire']
  };

  const isSpeciesBoostedLocal = (id: string, weather: string) => {
    const data = pokemonDataProvider.getPokemonData(id);
    if (!data || !weatherBoosts[weather]) return false;
    const types = Array.isArray(data.type) ? data.type : [data.type];
    return types.some((t: string) => (weatherBoosts[weather] as string[]).includes(t.toLowerCase()));
  }

  return slots.map((id: string | null, index: number): ProcessedSpawn => {
    if (!id) return { id: null, key: `empty-${index}` }
    let isSeen = seenPokedex.includes(id) || caughtPokedex.includes(id)
    let isCaught = caughtPokedex.includes(id)

    if (uiStore.debugPokedexMode === 'caught') {
      isSeen = true; isCaught = true
    } else if (uiStore.debugPokedexMode === 'seen') {
      isSeen = true
    }
    const rate = props.spawnPool?.rates?.[id] || 10
    const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
    const name = isSeen ? (data?.name || id.toUpperCase()) : 'Desconocido'
    const typeInfo = (isSeen && data?.type) ? `Tipo: ${(Array.isArray(data.type) ? data.type.join('/') : data.type).toUpperCase()}` : ''

    const cycles = ['morning', 'day', 'dusk', 'night']
    const appearingCycles = cycles.filter(c => (props.map.wild?.[c] || []).includes(id))
    const isLimited = appearingCycles.length > 0 && appearingCycles.length < cycles.length
    
    const emojiMap: Record<string, string> = { morning: '🌅', day: '☀️', dusk: '🌇', night: '🌙' }
    
    // Detección Atmosférica temprana para el texto
    const weather = computedWeather.value
    const isVisitor = !!(props.map.weather?.[weather]?.visitors as Record<string, unknown>)?.[id]
    const isExclusive = !!(props.map.weather?.[weather]?.exclusive as Record<string, unknown>)?.[id]

    const isBoosted = !isVisitor && !isExclusive && isSpeciesBoostedLocal(id, weather)
    const isAtmospheric = isVisitor || isExclusive || isBoosted

    let timeText = ''
    
    // 1. Información de Ciclo (Si es limitado y lo hemos visto)
    if (isLimited && isSeen) {
      const emojis = appearingCycles.map(c => emojiMap[c] || c).join(' ')
      timeText = `Aparición: ${emojis}`
    }

    // 2. Información Atmosférica
    if (isAtmospheric) {
      if (isSeen) {
        const weatherTag = isVisitor ? 'Visitante' : (isExclusive ? 'Exclusivo' : 'Potenciado')
        const weatherLine = `${weatherEmoji.value} ${weatherTag} por el clima.`
        timeText = timeText ? `${timeText}\n${weatherLine}` : weatherLine
      } else {
        timeText = `${weatherEmoji.value} Anomalía Atmosférica detectada.`
      }
    }

    // 3. Fallback: Habitante común (Solo si no hay ciclo ni clima)
    if (!timeText) {
      timeText = 'Habitante común.'
    }

    return {
      id, 
      key: `${id}-${index}`, 
      name, 
      sprite: getAssetUrl(ASSET_TYPES.POKEMON, id), 
      isSeen, 
      isCaught, 
      isRare: (rate < 10) || isVisitor || isExclusive, 
      isAtmospheric,
      tooltipTitle: name, 
      tooltipDesc: typeInfo ? `${typeInfo}\n${timeText}` : timeText, 
      seed: (id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) + index) / 100
    }

  })
})

const allSpawns = computed(() => [...props.spawnPool.generic, ...props.spawnPool.specific])
const currentCols = ref(3)
let resizeObserver: ResizeObserver | null = null

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

onUnmounted(() => { if (resizeObserver) resizeObserver.disconnect() })

const lockReason = computed(() => {
  if (props.isSafariLocked) return 'REQUIERE TICKET SAFARI'
  if (gameStore.isSaveLocked && !uiStore.hasDismissedSessionLock) return 'SESIÓN BLOQUEADA'
  if (!props.isLocked) return ''
  if (props.badgeCount < props.map.badges) return `REQUIERE ${props.map.badges} MEDALLAS`
  return 'BLOQUEADO'
})

const isLocked = computed(() => {
  if (props.isLocked) return true
  if (gameStore.isSaveLocked && !uiStore.hasDismissedSessionLock) return true
  return false
})

const lockDescription = computed(() => {
  if (props.isSafariLocked) return 'Necesitas un Ticket Safari para entrar a esta zona.'
  if (gameStore.isSaveLocked && !uiStore.hasDismissedSessionLock) return 'Sesión activa en otra pestaña. Toma el control para habilitar el guardado.'
  if (!props.isLocked) return ''
  return `Consigue ${props.map.badges} medallas para acceder a esta zona.`
})

const spawnGrid = computed(() => {
  const { rows, cols, totalSlots } = calculateSpawnGrid(allSpawns.value.length, currentCols.value)
  const grid = new Array(totalSlots).fill(null)
  allSpawns.value.forEach((id, index) => { grid[totalSlots - 1 - index] = id })
  return { slots: grid, rows, cols }
})
</script>

<template>
  <div
    ref="cardRef"
    :class="['location-card map-card legacy-panel', { locked: isLocked, 'safari-locked': isSafariLocked }]"
    :style="{ 
      '--atmosphere-filter': atmosphere?.atmosphereStyles?.filter,
      '--bg-image': `url('${imgPath}')`
    }"
    @click.stop="() => {
      console.log('[MapCard] Click detected. isLocked:', isLocked, 'isPerformanceMode:', isPerformanceMode);
      if (!isLocked && !isPerformanceMode) {
        emit('navigate', props.map);
      } else {
        console.warn('[MapCard] Navigation blocked:', { isLocked, isPerformanceMode, isBattleActive: battleStore.isBattleActive, isAnyBlockingModalOpen: uiStore.isAnyBlockingModalOpen });
      }
    }"
  >
    <AtmosphereLayer
      ref="atmosphere"
      :weather="computedWeather"
      :cycle="cycle"
      :season="mapStore.currentSeason.id"
      :is-performance-mode="isPerformanceMode"
      :is-locked="isLocked || isSafariLocked"
      :seed="props.map.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)"
    />

    <div
      v-if="isLocked || isSafariLocked"
      class="lock-overlay"
    >
      <span class="lock-text">{{ lockReason }}</span>
    </div>

    <!-- 1. Guardian (Top Left) -->
    <PVTooltip
      v-if="processedGuardian && !isLocked && !isSafariLocked"
      class="guardian-status-badge"
      :title="!processedGuardian.isSeen ? 'POKÉMON DESCONOCIDO' : (processedGuardian.captured ? 'GUARDIÁN DERROTADO' : 'POKÉMON GUARDIÁN')"
      :description="processedGuardian.captured 
        ? 'El protector de esta ruta ha sido vencido, permitiendo que una facción tome el control total.' 
        : `Un Pokémon poderoso que protege la ruta. ${processedGuardian.isSeen ? 'Es un ' + processedGuardian.name + ' (' + processedGuardian.typeInfo + '). ' : ''}Derrótalo para liberar la zona y permitir que tu facción la domine, activando bonus de captura.`"
      position="top"
    >
      <img 
        :src="processedGuardian.sprite" 
        class="guardian-mini-sprite" 
        :class="{ captured: processedGuardian.captured, 'spawn-silhouette': !processedGuardian.isCaught }"
        :style="{ '--spawn-seed': processedGuardian.seed }"
        @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
      >
      <span :class="['guardian-label', { captured: processedGuardian.captured }]">
        {{ processedGuardian.captured ? 'DERROTADO' : 'GUARDIÁN' }}
      </span>
    </PVTooltip>

    <!-- 2. Cycle Pill (Top Right) -->
    <PVTooltip
      :class="['location-tag', (isLocked || isSafariLocked) ? 'tag-locked' : 'tag-wild', atmosphere?.animClass]"
      :title="(isLocked || isSafariLocked) ? 'ZONA BLOQUEADA' : 'ESTADO AMBIENTAL'"
      :description="(isLocked || isSafariLocked) ? lockDescription : `Clima: ${weatherName} | Ciclo: ${cycleName} | Estación: ${seasonName}`"
      position="top"
    >
      <span class="pill-content">
        {{ (isLocked || isSafariLocked) ? '🔒' : (cycleEmoji + seasonEmoji + weatherEmoji) }}
      </span>
    </PVTooltip>

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

    <!-- 4. Fishing Icon (Bottom Left) -->
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

    <!-- 5. Spawns Grid (MOVED UP to be behind other UI elements) -->
    <div
      v-if="!isLocked && !isPerformanceMode"
      class="location-spawns"
    >
      <div 
        class="spawn-grid-container" 
        :style="{ '--grid-cols': spawnGrid.cols, '--grid-rows': spawnGrid.rows }"
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
            <div 
              :class="['sprite-wrapper', { 'rare-spawn': item.isRare, 'atmospheric-spawn': item.isAtmospheric }]"
              :style="{ '--spawn-seed': item.seed }"
            >
              <PVTooltip
                :title="item.tooltipTitle"
                :description="item.tooltipDesc"
                position="top"
                class="spawn-tooltip-trigger"
              >
                <img
                  :src="item.sprite"
                  class="pixelated"
                  :class="{ 'spawn-silhouette': !item.isCaught }"
                  @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                >
              </PVTooltip>
            </div>
          </div>
        </div>
      </div>
    </div>

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

    <!-- 6. Winner Crown (Bottom Right) -->
    <PVTooltip
      v-if="isPlayerWinner && !isPerformanceMode && !isLocked && !isSafariLocked"
      class="dom-badge winning anim-aura"
      title="DOMINADO"
      description="¡Bonus de captura activo por dominio de facción!"
      position="top"
    >
      <span class="pill-content">👑</span>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/map-card-weather" as *;
.spawn-tooltip-trigger { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: auto; }
</style>
