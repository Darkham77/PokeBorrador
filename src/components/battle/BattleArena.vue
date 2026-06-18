<script setup lang="ts">

import { ref, computed, watch, defineAsyncComponent, type Component, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useBattleStore } from '@/stores/battle/battle'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useDebugStore } from '@/stores/debug'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA } from '@/logic/weather/weatherRegistry'

const debugStore = useDebugStore()
const isDebugActive = computed(() => {
  return debugStore.canAccess && typeof window !== 'undefined' && !!(window as unknown as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__
})
const BattleDebugTools = defineAsyncComponent(() => import('./BattleDebugTools.vue')) as Component

const battleStore = useBattleStore()
const uiStore = useUIStore()
const mapStore = useMapStore()

// Responsive logic
const isSmallScreen = computed(() => {
  return (uiStore.windowWidth / uiStore.appZoom) < 950
})


// Sub-components
import BattleLog from './BattleLog.vue'
import BattleArenaView from './BattleArenaView.vue'
import BattleArenaControls from './BattleArenaControls.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

const battle = computed(() => battleStore.state)

const cycleEmoji = computed(() => {
  const emojis: Record<string, string> = { morning: '🌅', day: '🌞', dusk: '🌇', night: '🌙' }
  return emojis[mapStore.currentCycle] || '☀️'
})
const seasonEmoji = computed(() => mapStore.currentSeason.icon)
const computedWeather = computed(() => {
  if (battle.value?.weather && battle.value.weather.turns !== -1) {
    return battle.value.weather.visual || battle.value.weather.type
  }
  if (mapStore.globalWeather) return mapStore.globalWeather
  return getRouteWeather(battle.value?.locationId || 'route1', mapStore.currentSeason.id, mapStore.currentEpochHour, mapStore.currentCycle)
})
const weatherEmoji = computed(() => {
  const visual = WEATHER_VISUAL_METADATA[computedWeather.value as string]
  if (visual) return visual.icon
  const mech = getMechanicalWeather(computedWeather.value as string)
  return WEATHER_UI_METADATA[mech]?.icon || ''
})

const cycleName = computed(() => {
  const names: Record<string, string> = { morning: 'Mañana', day: 'Día', dusk: 'Atardecer', night: 'Noche' }
  return names[mapStore.currentCycle] || 'Día'
})
const seasonName = computed(() => mapStore.currentSeason.label)
const weatherName = computed(() => {
  const visual = WEATHER_VISUAL_METADATA[computedWeather.value as string]
  if (visual) return visual.label
  const mech = getMechanicalWeather(computedWeather.value as string)
  return WEATHER_UI_METADATA[mech]?.label || 'Normal'
})

import type { ComponentPublicInstance } from 'vue'

const envPillRef = ref<ComponentPublicInstance | HTMLElement | null>(null)
let pillContext: gsap.Context | null = null

const initBattlePillAnimation = () => {
  if (pillContext) {
    pillContext.revert()
    pillContext = null
  }

  if (!battleStore.isBattleActive || uiStore.isPerformanceMode || uiStore.isLowPowerActive) {
    return
  }

  const refVal = envPillRef.value
  const el = refVal ? (refVal instanceof HTMLElement ? refVal : (refVal.$el as HTMLElement | null)) : null
  if (!el) return

  pillContext = gsap.context(() => {
    const weather = computedWeather.value
    let type: 'glow' | 'drift' | 'shake' | '' = ''
    if (['clear', 'sun', 'heatwave', 'cold', 'coldwave', 'sandstorm', 'dust_storm', 'intense_sun'].includes(weather)) {
      type = 'glow'
    } else if (['mist', 'fog', 'wind', 'strong_winds'].includes(weather)) {
      type = 'drift'
    } else if (['rain', 'heavy_rain', 'storm', 'thunderstorm', 'hail'].includes(weather)) {
      type = 'shake'
    }

    const seed = 0.5

    if (type === 'glow') {
      const tl = gsap.fromTo(el,
        { filter: 'brightness(1.0)', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)' },
        {
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4), 0px 0px 8px rgba(255, 204, 0, 0.6)',
          filter: 'brightness(1.2)',
          duration: 1.5,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        }
      )
      tl.progress(seed)
    } else if (type === 'drift') {
      const tl = gsap.to(el, {
        x: 3,
        duration: 2.0,
        yoyo: true,
        repeat: -1,
        ease: 'power1.inOut'
      })
      tl.progress(seed)
    } else if (type === 'shake') {
      const tl = gsap.timeline({ repeat: -1 })
      tl.to(el, { rotation: 2, duration: 0.125, ease: 'power1.inOut' })
        .to(el, { rotation: -2, duration: 0.25, ease: 'power1.inOut' })
        .to(el, { rotation: 0, duration: 0.125, ease: 'power1.inOut' })
      tl.progress(seed)
    }
  }, el)
}

onMounted(() => {
  nextTick(() => {
    initBattlePillAnimation()
  })
})

onUnmounted(() => {
  if (pillContext) {
    pillContext.revert()
    pillContext = null
  }
})

watch(
  [
    () => battleStore.isBattleActive,
    computedWeather,
    () => uiStore.isPerformanceMode,
    () => uiStore.isLowPowerActive
  ],
  () => {
    nextTick(() => {
      initBattlePillAnimation()
    })
  },
  { flush: 'post' }
)

// Body Class Management
watch(() => battleStore.isBattleActive, (active) => {
  if (active) document.body.classList.add('in-battle') // [PureVue-Ignore]
  else document.body.classList.remove('in-battle') // [PureVue-Ignore]
}, { immediate: true })

const handleClose = () => {
  if (battleStore.isFinishing) {
    battleStore.completeBattleFlow('map')
  } else {
    battleStore.flee()
  }
}
</script>

<template>
  <BaseModal
    :show="battleStore.isBattleActive"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '1600px'"
    :height="isSmallScreen ? '100dvh' : '92dvh'"
    :max-height="isSmallScreen ? '100dvh' : '92dvh'"
    variant="modern"
    overlay="dark"
    close-button-variant="yellow-solid"
    :prevent-close="battleStore.isProcessing || (!!battleStore.state?.cannotEscape && !battleStore.isFinishing)"
    :show-close-button="(!battleStore.state?.isTrainer && !battleStore.state?.isGym) || battleStore.isFinishing"
    :close-on-click-outside="false"
    :hide-header="true"
    padding="raw"
    custom-class="battle-arena-modal"
    disable-zoom
    disable-auto-grow
    @close="handleClose"
  >
    <div
      v-if="!battle?.isGym"
      class="battle-header-actions"
    >
      <PVTooltip
        ref="envPillRef"
        class="location-tag tag-wild"
        :title="'ESTADO AMBIENTAL'"
        :description="`Ciclo: ${cycleName}\nEstación: ${seasonName}\nClima: ${weatherName}`"
        position="top"
      >
        <span class="pill-content">
          {{ cycleEmoji + seasonEmoji + weatherEmoji }}
        </span>
      </PVTooltip>
    </div>

    <div
      v-if="battle || battleStore.isSearching"
      id="battle-screen" 
      class="battle-screen-grid"
      :class="{ 
        'is-finishing': battleStore.isFinishing, 
        'is-fullscreen': isSmallScreen,
        'is-searching': battleStore.isSearching
      }"
    >
      <div class="battle-container">
        <!-- Viewport: Background & Sprites -->
        <BattleArenaView />

        <!-- Log: Sidebar or Bottom -->
        <div class="battle-log-wrapper">
          <BattleLog class="battle-log" />
        </div>

        <!-- Controls: Moves & Actions -->
        <BattleArenaControls />
      </div>
    </div>

    <!-- GLOBAL BATTLE DEBUG HUD -->
    <Teleport to="body">
      <div 
        v-if="battleStore.isBattleActive && isDebugActive" 
        class="battle-debug-hud-container"
      >
        <component
          :is="BattleDebugTools"
          v-if="BattleDebugTools"
        />
      </div>
    </Teleport>
  </BaseModal>
</template>


<style lang="scss">
.base-modal-root .type-center .base-modal-card.battle-arena-modal {
  width: calc(1600px * var(--app-zoom, 1)) !important;
  max-width: 95dvw !important;
}

.base-modal-root .type-fullscreen,
.base-modal-root .type-center {
  .base-modal-card.battle-arena-modal {
    overflow: hidden !important;
    background: #1c2135 !important; 
    background-image: Radial-Gradient(circle at 0% 0%, Rgba(255, 255, 255, 0.12) 0%, Transparent 70%) !important;
    border: 1px solid Rgba(255, 255, 255, 0.15) !important;
    box-shadow: 0 50px 100px Rgba(0, 0, 0, 0.9), inset 0 0 40px Rgba(0, 0, 0, 0.4) !important;
    
    .modal-scrollable-content.padding-raw {
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      flex: 1 !important;
      width: 100% !important;
      max-width: 100dvw !important;
      height: 100% !important; 
      max-height: 100% !important;
      min-height: 0 !important;
      overflow: hidden !important;
      overflow-y: hidden !important;
      overflow-x: hidden !important;
      contain: content;
    }
  }
}
</style>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.battle-header-actions {
  position: absolute;
  top: 16px;
  right: 64px; 
  z-index: var(--z-low);
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: auto;
}

.location-tag {
  cursor: pointer;
}




.battle-screen-grid {
  width: 100% !important;
  max-width: 100dvw !important;
  margin: 0 !important;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  &.is-fullscreen {
    flex: 1;
    height: 100%;
    :deep(.battle-log) { padding: 2px 4px !important; gap: 2px !important; }
    :deep(.log-entry) { font-size: 11px !important; padding-bottom: 4px !important; line-height: 1.4 !important; }
  }
}

.battle-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%; // Asegurar llenado total en móvil
  min-height: 0;
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  overflow: hidden; 
  background: Linear-Gradient(180deg, Rgba(255, 255, 255, 0.03) 0%, Transparent 100%);

  .battle-screen-grid:not(.is-fullscreen) & {
    display: grid;
    grid-template-columns: calc(320px * var(--app-zoom, 1)) 1fr;
    grid-template-rows: 1fr auto;
    grid-template-areas: 
      "log arena"
      "moves moves";
    row-gap: 0;
    column-gap: 0;
    align-items: stretch;
    height: 100%; // Llenado total
    max-height: 100%;
    width: 100%;
    max-width: 1600px; /* 280px log + 1320px arena/controls */
  }
}

.battle-log-wrapper {
  grid-area: log;
  zoom: var(--app-zoom, 1);
  will-change: zoom;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  min-height: 120px; 
  flex: 1;

  :deep(.battle-log) {
    @include shell-premium(#141824, 0);
    border-radius: 0 !important;
    border: none;
    border-right: 1px solid Rgba(255, 255, 255, 0.15);
    box-shadow: inset -10px 0 20px Rgba(0, 0, 0, 0.3);
  }
  
  .battle-screen-grid.is-fullscreen & {
    flex: none;
    height: 90px;
    min-height: 72px;
    :deep(.battle-log) {
      border-right: none;
      border-top: 1px solid Rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
    }
  }

  .battle-screen-grid:not(.is-fullscreen) & {
    height: 100%;
    .battle-log {
      height: 100%;
    }
  }
}

.battle-debug-hud-container {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: var(--z-critical);
  pointer-events: none;
  width: auto;
  max-width: 400px;

  & > * {
    pointer-events: auto;
  }
}

/* Ensure controls and arena take their grid spots */
:deep(.battle-arena) { 
  grid-area: arena; 
  width: 100%;
  height: 100% !important;
  min-height: 0;
  flex: 1; // Unificar crecimiento para evitar tirones
  object-fit: contain;

  .battle-screen-grid.is-fullscreen & {
     flex: 1; // Crece para ocupar todo el espacio superior
     height: auto !important;
  }
}
:deep(#move-panel) { 
  grid-area: moves; 
  zoom: var(--app-zoom, 1);
  will-change: zoom;
  z-index: var(--z-hud); 
  border-top: 1px solid Rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 10px 20px Rgba(0, 0, 0, 0.4);
  margin-top: -1px; // Solapamiento para evitar fugas de luz
  min-height: 192px;
  max-height: 192px;
  height: 192px;
}

</style>
