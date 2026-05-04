<script setup>
import { ref, computed, watch } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { useWindowListener } from '@/composables/useWindowListener'
import { useMapStore } from '@/stores/map'
import { getRouteWeather } from '@/logic/weatherUtils'

// Sub-components
import BattleLog from './battle/BattleLog.vue'
import BattleArenaView from './battle/BattleArenaView.vue'
import BattleArenaControls from './battle/BattleArenaControls.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

const battleStore = useBattleStore()
const uiStore = useUIStore()

// Responsive logic
const isSmallScreen = ref(window.innerWidth <= 768)
useWindowListener('resize', () => {
  isSmallScreen.value = window.innerWidth <= 768
})

const battle = computed(() => battleStore.state)
const mapStore = useMapStore()

const cycleEmoji = computed(() => {
  const emojis = { morning: '🌅', day: '☀️', dusk: '🌇', night: '🌙' }
  return emojis[mapStore.currentCycle] || '☀️'
})
const seasonEmoji = computed(() => mapStore.currentSeason.icon)
const computedWeather = computed(() => {
  if (mapStore.globalWeather) return mapStore.globalWeather
  return getRouteWeather(battle.value?.locationId || 'route1', mapStore.currentSeason.id, mapStore.currentEpochHour)
})
const weatherEmoji = computed(() => {
  const emojis = { clear: '', rain: '🌧️', storm: '⚡', fog: '🌫️', snow: '🌨️', blizzard: '❄️', sandstorm: '🏜️', heatwave: '🔥' }
  return emojis[computedWeather.value] || ''
})

const cycleName = computed(() => {
  const names = { morning: 'Mañana', day: 'Día', dusk: 'Atardecer', night: 'Noche' }
  return names[mapStore.currentCycle] || 'Día'
})
const seasonName = computed(() => mapStore.currentSeason.label)
const weatherName = computed(() => {
  const names = { clear: 'Despejado', rain: 'Lluvia', storm: 'Tormenta', snow: 'Nieve', blizzard: 'Ventisca', sandstorm: 'Tormenta de Arena', fog: 'Niebla', heatwave: 'Ola de Calor' }
  return names[computedWeather.value] || 'Normal'
})

const weatherAnimClass = computed(() => {
  if (uiStore.isPerformanceMode) return ''
  const anims = {
    clear: 'anim-glow',
    heatwave: 'anim-glow',
    mist: 'anim-drift',
    fog: 'anim-drift',
    rain: 'anim-shake',
    storm: 'anim-shake'
  }
  return anims[computedWeather.value] || ''
})

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
    :prevent-close="battleStore.isProcessing"
    :close-on-click-outside="false"
    :hide-header="true"
    padding="raw"
    custom-class="battle-arena-modal"
    @close="handleClose"
  >
    <div class="battle-header-actions">
      <div 
        class="environment-pill"
        :class="weatherAnimClass"
        :style="{ '--card-seed': 0.5 }"
      >
        <PVTooltip :title="`Hora: ${cycleName}`">
          <span class="env-icon hover-bounce">{{ cycleEmoji }}</span>
        </PVTooltip>
        <PVTooltip :title="`Estación: ${seasonName}`">
          <span class="env-icon hover-bounce">{{ seasonEmoji }}</span>
        </PVTooltip>
        <PVTooltip
          v-if="weatherEmoji"
          :title="`Clima: ${weatherName}`"
        >
          <span class="env-icon hover-bounce">{{ weatherEmoji }}</span>
        </PVTooltip>
      </div>
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
  </BaseModal>
</template>


<style lang="scss">
/* Ultra-specific override to kill scrolls even in fullscreen padding-raw mode */
.base-modal-root .type-fullscreen.battle-arena-modal,
.base-modal-root .type-center.battle-arena-modal {
  .base-modal-card {
    overflow: hidden !important;
    
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
      
      /* Extra safety for GPU layers */
      contain: content;
    }
  }
}
</style>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.log-entry {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: Rgba(255,255,255,0.9);
  animation: slideIn 0.3s ease-out;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 8px; // Texto más cerca del icono

  .log-icon-wrapper {
    flex-shrink: 0;
    width: 56px !important;
    height: 56px !important;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent !important;
    border-radius: 0 !important;
    overflow: visible !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;

    &::before, &::after { display: none !important; }

    &.item, &.pokemon {
      background: transparent !important;
    }
  }

  .log-icon {
    width: 100% !important;
    height: 100% !important;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
    filter: Drop-Shadow(0 4px 8px Rgba(0,0,0,0.4));
  }
}

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

.environment-pill {
  @include glass-solid(Rgba(0, 0, 0, 0.6));
  padding: 6px 12px;
  border-radius: 20px;
  display: flex;
  gap: 8px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 15px Rgba(0, 0, 0, 0.4);
  
  .env-icon {
    font-size: 16px;
    filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.5));
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    
    &.hover-bounce:hover {
      transform: Scale(1.3) translateY(-2px);
    }
  }
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
  transition: opacity 0.3s ease;

  &.is-searching {
    pointer-events: none;
  }

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

  @media (min-width: 769px) {
    display: grid;
    grid-template-columns: 280px 1fr;
    grid-template-rows: 1fr auto;
    grid-template-areas: 
      "log arena"
      "log moves";
    height: 100%; // Llenado total
    max-height: 100%;
    width: 100%;
    max-width: 1600px; /* 280px log + 1320px arena/controls */
  }
}

.battle-log-wrapper {
  grid-area: log;
  display: flex;
  flex-direction: column;
  background: Rgba(0, 0, 0, 0.2);
  border-right: 1px solid Rgba(255, 255, 255, 0.1);
  overflow: hidden;
  min-height: 120px; 
  flex: 1;
  position: relative;
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    flex: none;
    height: 90px;
    min-height: 72px;
    border-right: none;
    border-top: 1px solid Rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  }

  @media (min-width: 769px) {
    border-radius: 0; 
    flex: 1;
    height: 100%;
    :deep(.battle-log) { position: absolute; inset: 0; padding: 4px; }
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

  @media (max-width: 768px) {
     flex: 1; // Crece para ocupar todo el espacio superior
     height: auto !important;
  }
}
:deep(#move-panel) { 
  grid-area: moves; 
  z-index: var(--z-low); // Asegurar que todo el panel de control esté sobre el fondo
}

</style>
