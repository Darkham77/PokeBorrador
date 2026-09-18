<script setup lang="ts">
// [PureVue-Ignore-Length]
const MAP_CARD_HOVER_Y_OFFSET_PX = -8
const MAP_CARD_BG_SCALE_HOVER = 1.08
const GSAP_TRANSITION_DURATION_SEC = 0.25
const DEFAULT_OVERLAY_OPACITY = 0.35
import { computed, ref, watch } from 'vue'
import { gsap } from 'gsap'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import MapCardHeader from './MapCardHeader.vue'
import MapCardSpawns from './MapCardSpawns.vue'
import MapCardGuardianBadge from './MapCardGuardianBadge.vue'
import MapCardLeftPills from './MapCardLeftPills.vue'
import MapCardCyclePill from './MapCardCyclePill.vue'
import MapCardSpawnsTrigger from './MapCardSpawnsTrigger.vue'
import MapCardLockOverlay from './MapCardLockOverlay.vue'

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle/battle'
import { useMapStore } from '@/stores/map'
import { useModalStore } from '@/stores/modals'
import { getWeatherAnimSeed } from '@/logic/weather/weatherMath.ts'
import { requireWeatherSeasonId } from '@/data/world/weather-tables'

import { logger } from '@/logic/utils/logger'

import { useMapCardObservers } from '@/composables/map/useMapCardObservers'
import { useMapCardSprites } from '@/composables/map/useMapCardSprites'
import { useMapCardAnimations } from '@/composables/map/useMapCardAnimations'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'
import { useMapCardState } from './useMapCardState.ts'

// Flare URLs for spawn auras
const flare1Url = getAssetUrl(ASSET_TYPES.FX, 'flare_1')
const flare2Url = getAssetUrl(ASSET_TYPES.FX, 'flare_2')

import type { MapLocation } from '@/types/pokemon/encounters'
import type { DominanceInfo } from '@/types/system/stores'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import type { DayPhase } from '@/logic/utils/timeUtils'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'

interface SpawnPool {
  generic: PokemonSpeciesId[]
  specific: PokemonSpeciesId[]
  rates: Partial<Record<PokemonSpeciesId, number>>
}

interface Props {
  map: MapLocation
  isLocked?: boolean
  isSafariLocked?: boolean
  cycle?: DayPhase
  weather?: WeatherId
  badgeCount?: number
  dominance?: DominanceInfo | null
  isRocketExtorted?: boolean
  spawnPool?: SpawnPool
  forcedWeather?: WeatherId | null
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
const modalStore = useModalStore()

const cardRef = ref<HTMLElement | null>(null)
const bgRef = ref<HTMLElement | null>(null)
const overlayRef = ref<HTMLElement | null>(null)

// Animation DOM references
const spawnsRef = ref<InstanceType<typeof MapCardSpawns> | null>(null)

const isFastMode = computed(() => {
  return uiStore.isFastMode || battleStore.isBattleActive
})
const isPerformanceMode = isFastMode

const windowWidthRef = computed(() => uiStore.windowWidth)

// 1. Observers (Resize and Intersection)
const { currentCols, isVisible } = useMapCardObservers(cardRef, windowWidthRef)

const computedWeather = computed(() => mapCardState.computedWeather.value)
const currentWeatherSeason = computed(() => requireWeatherSeasonId(mapStore.currentSeason.id))

const mapCardState = useMapCardState(props, currentCols, isVisible)

const {
  imgPath,
  cycleEmoji,
  cycleName,
  seasonName,
  seasonEmoji,
  weatherEmoji,
  weatherName,
  weatherModifiersDescription,
  cardSeed,
  processedGuardian,
  isPlayerWinner,
  spawnGrid,
  processedGrid,
  showBg,
  lockReason,
  isCardLocked,
  lockDescription
} = mapCardState

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
  if (isCardLocked.value || uiStore.isLowPowerActive || isFastMode.value) return
  isHovered.value = true
  
  gsap.to(cardRef.value, {
    y: MAP_CARD_HOVER_Y_OFFSET_PX,
    borderColor: '#ffd60a',
    boxShadow: '0 15px 35px rgba(0,0,0,0.6), 0 0 25px rgba(255, 204, 0, 0.4)',
    duration: GSAP_TRANSITION_DURATION_SEC,
    ease: 'power2.out',
    overwrite: 'auto'
  })

  if (bgRef.value) {
    gsap.to(bgRef.value, {
      scale: MAP_CARD_BG_SCALE_HOVER,
      duration: GSAP_TRANSITION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }

  if (overlayRef.value) {
    gsap.to(overlayRef.value, {
      opacity: 1,
      duration: GSAP_TRANSITION_DURATION_SEC,
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
    duration: GSAP_TRANSITION_DURATION_SEC,
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
      duration: GSAP_TRANSITION_DURATION_SEC,
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
      opacity: DEFAULT_OVERLAY_OPACITY,
      duration: GSAP_TRANSITION_DURATION_SEC,
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
  isFastMode,
  isPerformanceMode,
  isLowPowerActive: computed(() => uiStore.isLowPowerActive),
  computedWeather,
  isPlayerWinner,
  cardSeed,
  dominanceWinner: computed(() => props.dominance?.winner ?? undefined),
  hasFishing: computed(() => props.map.fishing),
  hasArchaeology: computed(() => props.map.archaeology),
  spawnGridSlots: computed(() => spawnGrid.value.slots as (string | null)[])
})

const { weatherOnlyFilter } = useWeatherVisuals({
  weather: computedWeather,
  cycle: computed(() => props.cycle)
})

// Dynamic preloading for LCP map backgrounds using JS Image (avoids strict Chrome link preload warnings)
watch(
  imgPath,
  (newUrl) => {
    if (!newUrl) return
    const img = new Image()
    img.src = newUrl
  },
  { immediate: true }
)

function handleCardClick() {
  logger.debug('MapCard', `Click detected. isLocked: ${isCardLocked.value}, isFastMode: ${isFastMode.value}`)
  if (!isCardLocked.value && !isFastMode.value) {
    emit('navigate', props.map)
  } else {
    logger.warn('MapCard', 'Navigation blocked:', {
      isLocked: isCardLocked.value,
      isFastMode: isFastMode.value,
      isBattleActive: battleStore.isBattleActive,
      isAnyBlockingModalOpen: uiStore.isAnyBlockingModalOpen
    })
  }
}

const isAnyLocked = computed(() => isCardLocked.value || Boolean(props.isSafariLocked))
const showGuardianBadge = computed(() => Boolean(processedGuardian.value) && !isAnyLocked.value && isVisible.value)
const showSpawnsTrigger = computed(() => !isAnyLocked.value && !isFastMode.value)

const cardDynamicClasses = computed(() => [
  'location-card map-card legacy-panel',
  {
    locked: isCardLocked.value,
    'safari-locked': Boolean(props.isSafariLocked),
    'is-low-power': uiStore.isLowPowerActive,
    'fast-mode': isFastMode.value,
    'performance-mode': isFastMode.value,
    'is-hovered': isHovered.value,
    'is-rocket-extorted': Boolean(props.isRocketExtorted)
  }
])

const cardDynamicStyles = computed(() => ({
  '--weather-only-filter': weatherOnlyFilter.value,
  '--bg-image': showBg.value ? `url('${imgPath.value}')` : 'none',
  '--flare-1-url': showBg.value ? `url('${flare1Url}')` : 'none',
  '--flare-2-url': showBg.value ? `url('${flare2Url}')` : 'none',
  '--pre-rendered-rare-aura': processedRareAura.value ? `url('${processedRareAura.value}')` : 'none',
  '--pre-rendered-atmos-aura': processedAtmosAura.value ? `url('${processedAtmosAura.value}')` : 'none'
}))
</script>

<template>
  <div
    :id="`map-card-${map.id}`"
    class="map-card-wrapper"
    @click.stop="handleCardClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div
      ref="cardRef"
      :class="cardDynamicClasses"
      :style="cardDynamicStyles"
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
        :season="currentWeatherSeason"
        :is-fast-mode="isFastMode"
        :is-performance-mode="isPerformanceMode"
        :is-low-power="uiStore.isLowPowerActive"
        :is-visible="isVisible"
        :is-locked="isAnyLocked"
        :anim-seed="getWeatherAnimSeed(props.map.id)"
        :z-index="'var(--z-map-weather)'"
      />

      <MapCardLockOverlay
        :is-locked="isAnyLocked"
        :lock-reason="lockReason"
      />

      <!-- 1. Guardian (Top Left) -->
      <MapCardGuardianBadge
        v-if="processedGuardian && showGuardianBadge"
        :guardian="processedGuardian"
        :processed-sprite="guardianProcessedSprite"
      />

      <!-- 2. Cycle Pill (Top Right) -->
      <MapCardCyclePill
        :is-locked="isAnyLocked"
        :lock-description="lockDescription"
        :cycle-name="cycleName"
        :season-name="seasonName"
        :weather-name="weatherName"
        :weather-modifiers-description="weatherModifiersDescription"
        :cycle-emoji="cycleEmoji"
        :season-emoji="seasonEmoji"
        :weather-emoji="weatherEmoji"
      />

      <!-- 4. Bottom Left Actions — all 4 left pills in one container (grows upward from bottom) -->
      <MapCardLeftPills
        :map="map"
        :is-fast-mode="isFastMode"
        :is-performance-mode="isPerformanceMode"
        :is-card-locked="isCardLocked"
        :is-safari-locked="isSafariLocked"
        :is-visible="isVisible"
        :is-low-power="uiStore.isLowPowerActive"
        :dominance="dominance"
        :is-player-winner="isPlayerWinner"
      />

      <!-- 5. Spawns Grid (Rendered using MapCardSpawns subcomponent) -->
      <MapCardSpawns
        ref="spawnsRef"
        :is-locked="isCardLocked"
        :is-fast-mode="isFastMode"
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
        :is-fast-mode="isFastMode"
        :is-performance-mode="isPerformanceMode"
      />

      <!-- 8. Spawns Report Pokéball Trigger (Bottom Right Corner) -->
      <MapCardSpawnsTrigger
        v-if="showSpawnsTrigger"
        @click="openRouteSpawnsModal"
      />
    </div>
  </div>
</template>

<style src="./MapCard.styles.scss" scoped lang="scss"></style>
