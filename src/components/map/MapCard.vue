<script setup lang="ts">
// [PureVue-Ignore-Length]
const MAP_CARD_HOVER_Y_OFFSET_PX = -8
const POKEBALL_TRIGGER_HOVER_OFFSET_PX = -8
const MAP_CARD_BG_SCALE_HOVER = 1.08
const POKEBALL_TRIGGER_HOVER_SCALE = 1.35
const GSAP_TRANSITION_DURATION_SEC = 0.25
const DEFAULT_OVERLAY_OPACITY = 0.35
import { computed, ref, watch } from 'vue'
import { gsap } from 'gsap'
import PVTooltip from '@/components/common/PVTooltip.vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import MapCardHeader from './MapCardHeader.vue'
import MapCardSpawns from './MapCardSpawns.vue'

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle/battle'
import { useMapStore } from '@/stores/map'
import { useModalStore } from '@/stores/modals'
import { useGameStore } from '@/stores/game'
import { useWarStore } from '@/stores/war'
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
import type { MapLens } from '@/types/map/mapLenses'
import MapCardWarLayer from './layers/MapCardWarLayer.vue'

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
  forceKeepWarm?: boolean
  isPerformanceMode?: boolean
  activeLens?: MapLens
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
  forcedWeather: null,
  forceKeepWarm: false,
  isPerformanceMode: undefined,
  activeLens: 'adventure'
})

const emit = defineEmits<{
  (e: 'navigate', map: MapLocation): void
}>()

const uiStore = useUIStore()
const battleStore = useBattleStore()
const mapStore = useMapStore()
const modalStore = useModalStore()
const gameStore = useGameStore()
const warStore = useWarStore()

const cardRef = ref<HTMLElement | null>(null)
const bgRef = ref<HTMLElement | null>(null)
const overlayRef = ref<HTMLElement | null>(null)
const pokeballTriggerRef = ref<HTMLElement | null>(null)

// Animation DOM references
const spawnsRef = ref<InstanceType<typeof MapCardSpawns> | null>(null)

const isPerformanceMode = computed(() => {
  if (props.isPerformanceMode !== undefined) return props.isPerformanceMode
  return uiStore.isAnyBlockingModalOpen || battleStore.isBattleActive || uiStore.isDebugPerformanceMode
})

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
  if (isCardLocked.value || uiStore.isLowPowerActive || isPerformanceMode.value) return
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

const onPokeballMouseEnter = () => {
  if (uiStore.isLowPowerActive) return
  if (pokeballTriggerRef.value) {
    gsap.to(pokeballTriggerRef.value, {
      x: POKEBALL_TRIGGER_HOVER_OFFSET_PX,
      y: POKEBALL_TRIGGER_HOVER_OFFSET_PX,
      scale: POKEBALL_TRIGGER_HOVER_SCALE,
      duration: GSAP_TRANSITION_DURATION_SEC,
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
      duration: GSAP_TRANSITION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto',
      onComplete: () => {
        if (pokeballTriggerRef.value) {
          gsap.set(pokeballTriggerRef.value, { clearProps: 'transform,x,y,scale' })
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
</script>

<template>
  <div
    :id="`map-card-${map.id}`"
    class="map-card-wrapper"
    @click.stop="() => {
      logger.debug('MapCard', `Click detected. isLocked: ${isCardLocked}, isPerformanceMode: ${isPerformanceMode}`);
      if (!isCardLocked) {
        emit('navigate', props.map);
      } else {
        logger.warn('MapCard', 'Navigation blocked:', { isLocked: isCardLocked, isPerformanceMode, isBattleActive: battleStore.isBattleActive, isAnyBlockingModalOpen: uiStore.isAnyBlockingModalOpen });
      }
    }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div
      ref="cardRef"
      :class="['location-card map-card legacy-panel', {
        locked: isCardLocked,
        'safari-locked': isSafariLocked,
        'is-low-power': uiStore.isLowPowerActive,
        'performance-mode': isPerformanceMode,
        'is-hovered': isHovered,
        'is-rocket-extorted': isRocketExtorted
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
        v-if="!isPerformanceMode"
        :weather="computedWeather"
        :cycle="cycle"
        :season="currentWeatherSeason"
        :is-performance-mode="isPerformanceMode"
        :is-low-power="uiStore.isLowPowerActive"
        :is-visible="isVisible"
        :is-locked="isCardLocked || isSafariLocked"
        :anim-seed="getWeatherAnimSeed(props.map.id)"
        :z-index="'var(--z-map-weather)'"
      />

      <div
        v-if="isCardLocked || isSafariLocked"
        class="lock-overlay"
      >
        <span class="lock-text">{{ lockReason }}</span>
      </div>

      <!-- 1. Guardian (Top Left) -->
      <PVTooltip
        v-if="processedGuardian && !isCardLocked && !isSafariLocked && isVisible"
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
        :class="['location-tag', (isCardLocked || isSafariLocked) ? 'tag-locked' : 'tag-wild']"
        :title="(isCardLocked || isSafariLocked) ? 'ZONA BLOQUEADA' : 'ESTADO AMBIENTAL'"
        :description="(isCardLocked || isSafariLocked) ? lockDescription : `Ciclo: ${cycleName}\nEstación: ${seasonName}\nClima: ${weatherName}${weatherModifiersDescription}`"
        position="top"
      >
        <span class="pill-content weather-emoji">
          {{ (isCardLocked || isSafariLocked) ? '🔒' : (cycleEmoji + seasonEmoji + weatherEmoji) }}
        </span>
      </PVTooltip>

      <!-- Modo Guerra: Capa Táctica de Facciones -->
      <div
        v-if="activeLens === 'war' && !isCardLocked && !isSafariLocked"
        class="map-card-war-wrapper"
      >
        <MapCardWarLayer
          :map="map"
          :dominance="dominance"
          :player-faction="gameStore.state.faction"
          :is-dispute-active="warStore.isDisputeActive"
          :is-guardian-available="!!processedGuardian && !processedGuardian.captured"
          :has-guardian-captured-today="!!processedGuardian?.captured"
          @action="() => emit('navigate', props.map)"
        />
      </div>

      <!-- Modo Aventura: Píldoras, Spawns y Pokébola de Reporte -->
      <template v-else>
        <!-- 4. Bottom Left Actions — all 4 left pills in one container (grows upward from bottom) -->
        <!-- DOM order (column-reverse): fishing → archaeology → faction → crown -->
        <!-- Visual order from bottom: fishing, archaeology, faction, crown -->
        <div class="map-left-pills-container">
          <!-- Fishing Icon -->
          <PVTooltip
            v-if="map.fishing && !isPerformanceMode && !isCardLocked && !isSafariLocked && isVisible"
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
            v-if="map.archaeology && !isPerformanceMode && !isCardLocked && !isSafariLocked && isVisible"
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
            v-if="dominance?.winner && !isPerformanceMode && !isCardLocked && !isSafariLocked && isVisible"
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
            v-if="isPlayerWinner && !isPerformanceMode && !isCardLocked && !isSafariLocked"
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
              <span class="pill-content icon">👑</span>
            </div>
          </PVTooltip>
        </div>

        <!-- 5. Spawns Grid (Rendered using MapCardSpawns subcomponent) -->
        <MapCardSpawns
          ref="spawnsRef"
          :is-locked="isCardLocked"
          :is-performance-mode="isPerformanceMode"
          :is-visible="isVisible"
          :force-keep-warm="forceKeepWarm"
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
          v-if="!isCardLocked && !isSafariLocked && !isPerformanceMode"
          title="REPORTE DE ENCUENTROS"
          description="Ver probabilidades en tiempo real de todos los Pokémon."
          position="top"
          class="pokeball-route-tooltip"
        >
          <div
            class="pokeball-route-trigger"
            @click.stop.prevent="openRouteSpawnsModal"
            @mouseenter="onPokeballMouseEnter"
            @mouseleave="onPokeballMouseLeave"
          >
            <div
              ref="pokeballTriggerRef"
              class="pokeball-icon-wrapper"
            >
              <img
                :src="getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')"
                class="pokeball-icon"
                alt="Spawns"
              >
            </div>
          </div>
        </PVTooltip>
      </template>
    </div>
  </div>
</template>

<style src="./MapCard.styles.scss" scoped lang="scss"></style>
