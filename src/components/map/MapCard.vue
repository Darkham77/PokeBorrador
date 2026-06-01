<script setup lang="ts">
// [PureVue-Ignore-Length]
import { computed, ref } from 'vue'
import { gsap } from 'gsap'
import PVTooltip from '@/components/common/PVTooltip.vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import MapCardHeader from './MapCardHeader.vue'
import MapCardSpawns from './MapCardSpawns.vue'

import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { MAP_ROUTE_MAPPING } from '@/data/map-assets'
import { translateType } from '@/data/types'

import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import { useModalStore } from '@/stores/modals'

import { getRouteWeather, getWeatherMultiplier } from '@/logic/weatherUtils'
import { getWeatherAnimSeed } from '@/logic/weather/weatherMath.ts'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, WEATHER_REGISTRY } from '@/logic/weather/weatherRegistry'
import { logger } from '@/logic/utils/logger'
import { checkPlayerWinner, calculateSpawnGrid } from '@/logic/map/mapCardHelper'

import { useMapCardObservers } from '@/composables/map/useMapCardObservers'
import { useMapCardSprites } from '@/composables/map/useMapCardSprites'
import { useMapCardAnimations } from '@/composables/map/useMapCardAnimations'

// Flare URLs for spawn auras
const flare1Url = getAssetUrl(ASSET_TYPES.FX, 'flare_1')
const flare2Url = getAssetUrl(ASSET_TYPES.FX, 'flare_2')

import type { MapLocation } from '@/types/encounters'
import type { DominanceInfo } from '@/types/stores'

interface SpawnPool {
  generic: string[]
  specific: string[]
  rates: Record<string, number>
}

interface Props {
  map: MapLocation
  isLocked?: boolean
  isSafariLocked?: boolean
  cycle?: 'morning' | 'day' | 'dusk' | 'night'
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
  (e: 'navigate', map: MapLocation): void
}>()

const uiStore = useUIStore()
const battleStore = useBattleStore()
const mapStore = useMapStore()
const gameStore = useGameStore()
const modalStore = useModalStore()

const cardRef = ref<HTMLElement | null>(null)
const bgRef = ref<HTMLElement | null>(null)
const overlayRef = ref<HTMLElement | null>(null)
const pokeballTriggerRef = ref<HTMLElement | null>(null)

// Animation DOM references
const spawnsRef = ref<InstanceType<typeof MapCardSpawns> | null>(null)

const isPerformanceMode = computed(() => {
  return uiStore.isAnyBlockingModalOpen || battleStore.isBattleActive || uiStore.isDebugPerformanceMode
})

const windowWidthRef = computed(() => uiStore.windowWidth)

// 1. Observers (Resize and Intersection)
const { currentCols, isVisible } = useMapCardObservers(cardRef, windowWidthRef)

const computedWeather = computed(() => {
  return props.forcedWeather || mapStore.globalWeather || getRouteWeather(props.map.id, mapStore.currentSeason.id, mapStore.currentEpochHour, mapStore.currentCycle)
})

const imgPath = computed(() => {
  const fileName = (MAP_ROUTE_MAPPING as Record<string, string>)[props.map.id] || 'default'
  return getAssetUrl(ASSET_TYPES.MAP, fileName, { 
    cycle: props.cycle,
    isLowPower: uiStore.isLowPowerActive
  })
})

const cycleEmoji = computed(() => {
  const emojis: Record<string, string> = { morning: '🌅', day: '🌞', dusk: '🌇', night: '🌙' }
  return emojis[props.cycle as string] || '🌞'
})

const cycleName = computed(() => {
  const names: Record<string, string> = { morning: 'Mañana', day: 'Día', afternoon: 'Tarde', dusk: 'Atardecer', night: 'Noche' }
  return names[props.cycle as string] || 'Normal'
})

const seasonName = computed(() => mapStore.currentSeason.label)
const seasonEmoji = computed(() => mapStore.currentSeason.icon)

const weatherEmoji = computed(() => {
  const visual = WEATHER_VISUAL_METADATA[computedWeather.value as string]
  if (visual) return visual.icon
  const mech = getMechanicalWeather(computedWeather.value as string)
  return WEATHER_UI_METADATA[mech]?.icon || ''
})

const weatherName = computed(() => {
  const visual = WEATHER_VISUAL_METADATA[computedWeather.value as string]
  if (visual) return visual.label
  const mech = getMechanicalWeather(computedWeather.value as string)
  return WEATHER_UI_METADATA[mech]?.label || 'Normal'
})

const weatherModifiersDescription = computed(() => {
  const entry = WEATHER_REGISTRY[computedWeather.value as string]
  const mods = entry?.modifiers
  if (!mods) return ''

  const formatList = (list?: string[]) => (list || []).map(translateType).join(', ')
  
  let lines = []
  if (mods.boost?.length) lines.push(`▲ ${formatList(mods.boost)}`)
  if (mods.debuff?.length) lines.push(`▼ ${formatList(mods.debuff)}`)
  if (mods.block?.length) lines.push(`🚫 ${formatList(mods.block)}`)
  
  return lines.length ? `\n\n${lines.join('\n')}` : ''
})

const cardSeed = computed(() => {
  const sum = props.map.name.split('').reduce((acc, char, i) => {
    return acc + (char.charCodeAt(0) * (i + 1))
  }, 0)
  return (sum % 100) / 100
})

const getPokemonSprite = (id: string) => getAssetUrl(ASSET_TYPES.POKEMON, id)

const getFormattedTypes = (data: { type: string | string[]; type2?: string }): string => {
  const types: string[] = []
  if (Array.isArray(data.type)) {
    types.push(...data.type)
  } else {
    if (data.type) types.push(data.type)
    if (data.type2) types.push(data.type2)
  }
  return types.map(translateType).join('/').toUpperCase()
}

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
  const typeInfo = (isSeen && data) ? getFormattedTypes(data) : '???'
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

const allSpawns = computed(() => [...props.spawnPool.generic, ...props.spawnPool.specific])

const spawnGrid = computed(() => {
  const weather = computedWeather.value
  const cycle = props.cycle || 'day'
  const wildList = props.map.wild?.[cycle] || []

  const filteredSpawns = allSpawns.value.filter(id => {
    const isVisitor = !!(props.map.weather?.[weather]?.visitors as Record<string, unknown>)?.[id]
    const isExclusive = !!(props.map.weather?.[weather]?.exclusive as Record<string, unknown>)?.[id]
    const isFishingActive = !!props.map.fishing?.pool?.includes(id)
    const hasWildRestrictions = !!props.map.wild
    const isWildActive = !hasWildRestrictions || wildList.includes(id) || isVisitor || isExclusive || isFishingActive

    return isWildActive && getWeatherMultiplier(id, weather) > 0
  })

  const { rows, cols, totalSlots } = calculateSpawnGrid(filteredSpawns.length, currentCols.value)
  const grid = new Array(totalSlots).fill(null)
  filteredSpawns.forEach((id, index) => { grid[totalSlots - 1 - index] = id })
  return { slots: grid, rows, cols }
})

const processedGrid = computed(() => {
  const gridData = spawnGrid.value
  const slots = gridData.slots || []
  const seenPokedex = gameStore.state.seenPokedex || []
  const caughtPokedex = gameStore.state.pokedex || []

  return slots.map((id: string | null, index: number) => {
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
    const typeInfo = (isSeen && data) ? `Tipo: ${getFormattedTypes(data)}` : ''

    const cycles = ['morning', 'day', 'dusk', 'night']
    const appearingCycles = cycles.filter(c => (props.map.wild?.[c] || []).includes(id))
    const isLimited = appearingCycles.length > 0 && appearingCycles.length < cycles.length
    
    const emojiMap: Record<string, string> = { morning: '🌅', day: '🌞', dusk: '🌇', night: '🌙' }
    
    const weather = computedWeather.value
    const isVisitor = !!(props.map.weather?.[weather]?.visitors as Record<string, unknown>)?.[id]
    const isExclusive = !!(props.map.weather?.[weather]?.exclusive as Record<string, unknown>)?.[id]

    let timeText = ''
    
    if (isLimited && isSeen) {
      const emojis = appearingCycles.map(c => emojiMap[c] || c).join('')
      timeText = `Aparición: ${emojis}`
    }

    const multiplier = getWeatherMultiplier(id, weather)
    const isBoosted = !isVisitor && !isExclusive && multiplier > 1.0
    const isDebuffed = !isVisitor && !isExclusive && multiplier < 1.0 && multiplier > 0
    const isSpecialWeatherSpawn = isVisitor || isExclusive

    if (isSpecialWeatherSpawn || isBoosted || isDebuffed) {
      if (isSeen) {
        const weatherTag = isVisitor ? 'Visitante' : (isExclusive ? 'Exclusivo' : (isBoosted ? 'Potenciado' : 'Debilitado'))
        const weatherLine = `${weatherEmoji.value} ${weatherTag} por el clima.`
        timeText = timeText ? `${timeText}\n${weatherLine}` : weatherLine
      } else {
        timeText = `${weatherEmoji.value} Anomalía Atmosférica detectada.`
      }
    }

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
      isRare: (rate <= 5) || isExclusive, 
      isAtmospheric: isSpecialWeatherSpawn, 
      tooltipTitle: name, 
      tooltipDesc: typeInfo ? `${typeInfo}\n${timeText}` : timeText, 
      seed: (id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) + index) / 100
    }
  })
})

// 2. Sprites & Auras Processing
const { processedSprites, guardianProcessedSprite, processedRareAura, processedAtmosAura } = useMapCardSprites(
  processedGrid,
  processedGuardian,
  flare1Url,
  flare2Url
)

// Resolving HTML target reference from spawnsRef component child
const spawnGridHtmlRef = computed(() => spawnsRef.value?.spawnGridRef || null)

// 3. Animations Handler
useMapCardAnimations({
  cardRef,
  spawnGridRef: spawnGridHtmlRef,
  isVisible,
  isPerformanceMode,
  isLowPowerActive: computed(() => uiStore.isLowPowerActive),
  computedWeather,
  isPlayerWinner,
  cardSeed,
  dominanceWinner: computed(() => props.dominance?.winner ?? undefined),
  hasFishing: computed(() => props.map.fishing),
  hasArchaeology: computed(() => props.map.archaeology),
  spawnGridSlots: computed(() => spawnGrid.value.slots)
})

const keepWarm = computed(() => {
  const isMobileDevice = uiStore.windowWidth < 768
  return !isMobileDevice && !uiStore.isLowPowerActive
})

const showBg = computed(() => {
  return isVisible.value || keepWarm.value
})

const lockReason = computed(() => {
  if (props.isSafariLocked) return 'REQUIERE TICKET SAFARI'
  if (gameStore.isSaveLocked && !uiStore.hasDismissedSessionLock) return 'SESIÓN BLOQUEADA'
  if (!props.isLocked) return ''
  const requiredBadges = props.map.badges || 0
  if (props.badgeCount < requiredBadges) return `REQUIERE ${requiredBadges} MEDALLAS`
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

const openRouteSpawnsModal = () => {
  modalStore.open('RouteSpawns', {
    map: props.map,
    weather: computedWeather.value,
    cycle: props.cycle
  })
}

// Hover effects
const isHovered = ref(false)
const onMouseEnter = () => {
  if (isLocked.value || uiStore.isLowPowerActive || isPerformanceMode.value) return
  isHovered.value = true
  
  gsap.to(cardRef.value, {
    y: -8,
    borderColor: '#ffd60a',
    boxShadow: '0 15px 35px rgba(0,0,0,0.6), 0 0 25px rgba(255, 204, 0, 0.4)',
    duration: 0.25,
    ease: 'power2.out',
    overwrite: 'auto'
  })
  
  if (bgRef.value) {
    gsap.to(bgRef.value, {
      scale: 1.08,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }
  
  if (overlayRef.value) {
    gsap.to(overlayRef.value, {
      opacity: 1,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }
}

const onMouseLeave = () => {
  isHovered.value = false
  
  if (uiStore.isLowPowerActive) {
    gsap.set([cardRef.value, bgRef.value, overlayRef.value], { clearProps: 'transform,scale,y,boxShadow,borderColor,opacity' })
    return
  }
  
  gsap.to(cardRef.value, {
    y: 0,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    boxShadow: 'none',
    duration: 0.25,
    ease: 'power2.out',
    overwrite: 'auto',
    onComplete: () => {
      if (!isHovered.value && cardRef.value) {
        gsap.set(cardRef.value, { clearProps: 'transform,y,boxShadow,borderColor' })
      }
    }
  })
  
  if (bgRef.value) {
    gsap.to(bgRef.value, {
      scale: 1,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
      onComplete: () => {
        if (!isHovered.value && bgRef.value) {
          gsap.set(bgRef.value, { clearProps: 'transform,scale' })
        }
      }
    })
  }
  
  if (overlayRef.value) {
    gsap.to(overlayRef.value, {
      opacity: 0.35,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
      onComplete: () => {
        if (!isHovered.value && overlayRef.value) {
          gsap.set(overlayRef.value, { clearProps: 'opacity' })
        }
      }
    })
  }
}

const onPokeballMouseEnter = () => {
  if (uiStore.isLowPowerActive) return
  if (pokeballTriggerRef.value) {
    gsap.to(pokeballTriggerRef.value, {
      x: -8,
      y: -8,
      scale: 1.35,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }
}

const onPokeballMouseLeave = () => {
  if (uiStore.isLowPowerActive) {
    if (pokeballTriggerRef.value) {
      gsap.set(pokeballTriggerRef.value, { clearProps: 'transform,x,y,scale' })
    }
    return
  }
  if (pokeballTriggerRef.value) {
    gsap.to(pokeballTriggerRef.value, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
      onComplete: () => {
        gsap.set(pokeballTriggerRef.value, { clearProps: 'transform,x,y,scale' })
      }
    })
  }
}

import { useWeatherVisuals } from '@/composables/useWeatherVisuals'
const { weatherOnlyFilter } = useWeatherVisuals({
  weather: computedWeather,
  cycle: computed(() => props.cycle)
})
</script>

<template>
  <div
    class="map-card-wrapper"
    @click.stop="() => {
      logger.debug('MapCard', `Click detected. isLocked: ${isLocked}, isPerformanceMode: ${isPerformanceMode}`);
      if (!isLocked && !isPerformanceMode) {
        emit('navigate', props.map);
      } else {
        logger.warn('MapCard', 'Navigation blocked:', { isLocked, isPerformanceMode, isBattleActive: battleStore.isBattleActive, isAnyBlockingModalOpen: uiStore.isAnyBlockingModalOpen });
      }
    }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div
      ref="cardRef"
      :class="['location-card map-card legacy-panel', {
        locked: isLocked,
        'safari-locked': isSafariLocked,
        'is-low-power': uiStore.isLowPowerActive,
        'performance-mode': isPerformanceMode,
        'is-hovered': isHovered
      }]"
      :style="{ 
        '--weather-only-filter': weatherOnlyFilter,
        '--bg-image': showBg ? `url('${imgPath}')` : 'none',
        '--flare-1-url': showBg ? `url('${flare1Url}')` : 'none',
        '--flare-2-url': showBg ? `url('${flare2Url}')` : 'none',
        '--pre-rendered-rare-aura': processedRareAura ? `url('${processedRareAura}')` : 'none',
        '--pre-rendered-atmos-aura': processedAtmosAura ? `url('${processedAtmosAura}')` : 'none'
      }"
    >
      <!-- Background and overlay -->
      <div 
        ref="bgRef"
        class="map-card-bg"
      />
      <div 
        ref="overlayRef"
        class="map-card-overlay"
      />

      <AtmosphereLayer
        :weather="computedWeather"
        :cycle="cycle"
        :season="mapStore.currentSeason.id"
        :is-performance-mode="isPerformanceMode"
        :is-low-power="uiStore.isLowPowerActive"
        :is-visible="isVisible"
        :is-locked="isLocked || isSafariLocked"
        :anim-seed="getWeatherAnimSeed(props.map.id)"
      />

      <div
        v-if="isLocked || isSafariLocked"
        class="lock-overlay"
      >
        <span class="lock-text">{{ lockReason }}</span>
      </div>

      <!-- 1. Guardian (Top Left) -->
      <PVTooltip
        v-if="processedGuardian && !isLocked && !isSafariLocked && isVisible"
        class="guardian-status-badge"
        :title="!processedGuardian.isSeen ? 'POKÉMON DESCONOCIDO' : (processedGuardian.captured ? 'GUARDIÁN DERROTADO' : 'POKÉMON GUARDIÁN')"
        :description="processedGuardian.captured 
          ? 'El protector de esta ruta ha sido vencido, permitiendo que una facción tome el control total.' 
          : `Un Pokémon poderoso que protege la ruta. ${processedGuardian.isSeen ? 'Es un ' + processedGuardian.name + ' (' + processedGuardian.typeInfo + '). ' : ''}Derrótalo para liberar la zona y permitir que tu facción la domine, activando bonus de captura.`"
        position="top"
      >
        <div class="spawn-atmosphere-wrapper">
          <img 
            :src="guardianProcessedSprite || processedGuardian.sprite" 
            class="guardian-mini-sprite" 
            :class="{ 
              captured: processedGuardian.captured, 
              'spawn-silhouette': !guardianProcessedSprite && !processedGuardian.isCaught,
              'is-pre-rendered': !!guardianProcessedSprite 
            }"
            :style="{ '--spawn-seed': processedGuardian.seed }"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
        </div>
        <span :class="['guardian-label', { captured: processedGuardian.captured }]">
          {{ processedGuardian.captured ? 'DERROTADO' : 'GUARDIÁN' }}
        </span>
      </PVTooltip>

      <!-- 2. Cycle Pill (Top Right) -->
      <PVTooltip
        ref="locationTagRef"
        :class="['location-tag', (isLocked || isSafariLocked) ? 'tag-locked' : 'tag-wild']"
        :title="(isLocked || isSafariLocked) ? 'ZONA BLOQUEADA' : 'ESTADO AMBIENTAL'"
        :description="(isLocked || isSafariLocked) ? lockDescription : `Ciclo: ${cycleName}\nEstación: ${seasonName}\nClima: ${weatherName}${weatherModifiersDescription}`"
        position="top"
      >
        <span class="pill-content">
          {{ (isLocked || isSafariLocked) ? '🔒' : (cycleEmoji + seasonEmoji + weatherEmoji) }}
        </span>
      </PVTooltip>

      <!-- 4. Bottom Left Actions — all 4 left pills in one container (grows upward from bottom) -->
      <!-- DOM order (column-reverse): fishing → archaeology → faction → crown -->
      <!-- Visual order from bottom: fishing, archaeology, faction, crown -->
      <div class="map-left-pills-container">
        <!-- Fishing Icon -->
        <PVTooltip
          v-if="map.fishing && !isPerformanceMode && !isLocked && !isSafariLocked && isVisible"
          class="fishing-pill-standalone"
          title="PESCA"
          description="¡Esta zona tiene agua! Puedes pescar Pokémon aquí."
          position="top"
        >
          <div 
            ref="fishingPillRef"
            :class="['interactive-pill fishing-pill map-pill', { 'is-low-power': uiStore.isLowPowerActive }]"
          >
            <span class="pill-icon">🎣</span>
          </div>
        </PVTooltip>

        <!-- Archaeology Icon -->
        <PVTooltip
          v-if="map.archaeology && !isPerformanceMode && !isLocked && !isSafariLocked && isVisible"
          class="archaeology-pill-standalone"
          title="ARQUEOLOGÍA"
          description="¡Esta zona tiene rocas antiguas! Puedes excavar fósiles y minerales aquí."
          position="top"
        >
          <div 
            ref="archaeologyPillRef"
            :class="['interactive-pill archaeology-pill map-pill', { 'is-low-power': uiStore.isLowPowerActive }]"
          >
            <span class="pill-icon">⛏️</span>
          </div>
        </PVTooltip>

        <!-- Faction Status Pill -->
        <PVTooltip
          v-if="dominance?.winner && dominance?.winner !== 'none' && !isPerformanceMode && !isLocked && !isSafariLocked && isVisible"
          ref="factionPillRef"
          class="faction-status-pill"
          title="DOMINIO FACCIÓN"
          :description="`Controlado por ${dominance.winner === 'union' ? 'Unión' : 'Poder'}`"
          position="top"
        >
          <div class="pill-content">
            <span class="faction-emoji">
              {{ dominance.winner === 'union' ? '⭐' : '✊' }}
            </span>
          </div>
        </PVTooltip>

        <!-- Winner Crown -->
        <PVTooltip
          v-if="isPlayerWinner && !isPerformanceMode && !isLocked && !isSafariLocked"
          ref="crownRef"
          class="dom-badge winning"
          title="DOMINADO"
          description="¡Bonus de captura activo por dominio de facción!"
          position="top"
        >
          <div class="crown-glow-wrapper">
            <div 
              v-if="!uiStore.isLowPowerActive" 
              class="crown-shine-aura" 
            />
            <span class="pill-content">👑</span>
          </div>
        </PVTooltip>
      </div>

      <!-- 5. Spawns Grid (Rendered using MapCardSpawns subcomponent) -->
      <MapCardSpawns
        ref="spawnsRef"
        :is-locked="isLocked"
        :is-performance-mode="isPerformanceMode"
        :is-visible="isVisible"
        :hide-map-pokemon="uiStore.hideMapPokemon"
        :is-debug-grid-mode="uiStore.isDebugGridMode"
        :spawn-grid="spawnGrid"
        :processed-grid="processedGrid"
        :processed-sprites="processedSprites"
        :processed-rare-aura="processedRareAura"
        :processed-atmos-aura="processedAtmosAura"
        :is-low-power-active="uiStore.isLowPowerActive"
      />

      <!-- 6. Map Name/Header -->
      <MapCardHeader
        :name="map.name"
        :desc="map.desc || ''"
        :is-performance-mode="isPerformanceMode"
      />

      <!-- 8. Spawns Report Pokéball Trigger (Bottom Right Corner) -->
      <PVTooltip
        v-if="!isLocked && !isSafariLocked && !isPerformanceMode"
        title="REPORTE DE ENCUENTROS"
        description="Ver probabilidades en tiempo real de todos los Pokémon."
        position="top"
        class="pokeball-route-tooltip"
      >
        <div
          ref="pokeballTriggerRef"
          class="pokeball-route-trigger"
          @click.stop.prevent="openRouteSpawnsModal"
          @mouseenter="onPokeballMouseEnter"
          @mouseleave="onPokeballMouseLeave"
        >
          <img
            :src="getAssetUrl(ASSET_TYPES.ITEM, 'poke-ball')"
            class="pokeball-icon"
            alt="Spawns"
            @mouseenter="onPokeballMouseEnter"
            @mouseleave="onPokeballMouseLeave"
          >
        </div>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/map-card-weather" as *;

.sprite-wrapper {
  position: relative;
  z-index: calc(var(--z-map-floor) + 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.aura-effect {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  margin: auto;
  height: 95%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  pointer-events: none;
  z-index: var(--z-map-floor);
  opacity: 0;
  image-rendering: auto !important;
  will-change: transform, opacity;
  
  // Mask properties to colorize monochrome assets on the fly
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;

  &.rare-aura {
    z-index: calc(var(--z-map-floor) + 1);
    
    &:not(.is-pre-rendered) {
      -webkit-mask-image: var(--flare-2-url);
      mask-image: var(--flare-2-url);
      background-color: Rgba(255, 0, 0, 0.9);
      filter: Blur(1.5px);
    }

    &.is-pre-rendered {
      background-image: var(--pre-rendered-rare-aura);
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      background-color: transparent;
      filter: none !important;
    }

    &.is-low-power {
      filter: none !important;
    }
  }

  &.atmospheric-aura {
    z-index: var(--z-map-floor);
    
    &:not(.is-pre-rendered) {
      -webkit-mask-image: var(--flare-1-url);
      mask-image: var(--flare-1-url);
      background-color: Rgba(0, 255, 255, 0.85);
      filter: Blur(1.5px);
    }

    &.is-pre-rendered {
      background-image: var(--pre-rendered-atmos-aura);
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      background-color: transparent;
      filter: none !important;
    }

    &.is-low-power {
      filter: none !important;
    }
  }
}

:deep(.dom-badge) {
  .crown-glow-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-map-floor);
  }

  .crown-shine-aura {
    position: absolute;
    top: 50% !important;
    left: 50% !important;
    width: 38px;
    height: 38px;
    margin-top: -21px !important;
    margin-left: -19px !important;
    background-color: Rgba(255, 215, 0, 0.8) !important;
    pointer-events: none;
    z-index: calc(var(--z-base) - 1) !important;
    opacity: 0.65;
    will-change: transform, opacity;

    -webkit-mask-image: var(--flare-1-url);
    mask-image: var(--flare-1-url);
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
  }

  .pill-content {
    position: relative;
    z-index: var(--z-map-floor);
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    height: 100% !important;
    line-height: 1 !important;
    text-align: center !important;
    transform: Translatey(-4px) !important;
  }
}
</style>

<style scoped lang="scss">
.map-card-wrapper {
  position: relative;
  height: 220px;
  width: 100%;
  overflow: visible;
}

.pokeball-route-tooltip {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: var(--z-map-ui);
  pointer-events: none;
}

.pokeball-route-trigger {
  position: absolute;
  bottom: -12px;
  right: -12px;
  width: 48px;
  height: 48px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  will-change: transform;
  z-index: var(--z-map-ui);

  .pokeball-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
    @include sprite-render;
    filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.5));
  }
}
</style>
