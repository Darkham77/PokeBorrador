<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { phaserBridge } from '@/logic/phaserBridge'
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
const isSmallScreen = ref(window.innerWidth <= 950)
useWindowListener('resize', () => {
  isSmallScreen.value = window.innerWidth <= 950
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

// Phaser Sync
const syncBattleToPhaser = () => {
  if (battleStore.isBattleActive && battle.value) {
    phaserBridge.sendCommand('BattleScene', 'SYNC_BATTLE', {
      locationId: battle.value.locationId,
      cycle: battle.value.cycle,
      player: battle.value.player,
      enemy: battle.value.enemy
    })
  }
}

watch(() => battleStore.isBattleActive, (active) => {
  if (active) syncBattleToPhaser()
}, { immediate: true })

watch(() => [battle.value?.player?.hp, battle.value?.enemy?.hp], () => {
  if (battleStore.isBattleActive) syncBattleToPhaser()
})

onMounted(() => {
  if (battleStore.isBattleActive) syncBattleToPhaser()
})

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
    :max-width="isSmallScreen ? '100vw' : '1230px'"
    :max-height="isSmallScreen ? '100vh' : '92vh'"
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
/* Modal customization */
.battle-arena-modal {
  .modal-content-premium {
    overflow: hidden !important;
  }
  
  .modal-scrollable-content {
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    height: 100% !important;
    overflow: hidden !important; // Bloqueo total
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
    cursor: help;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    
    &.hover-bounce:hover {
      transform: Scale(1.3) translateY(-2px);
    }
  }
}


.battle-screen-grid {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  transition: opacity 0.3s ease;

  &.is-searching {
    opacity: 0.6;
    pointer-events: none;
    filter: Saturate(0.5);
  }

  &.is-fullscreen {
    height: 100vh;
    :deep(.battle-log) { padding: 6px 12px !important; gap: 5px !important; }
    :deep(.log-entry) { font-size: 11px !important; padding-bottom: 4px !important; line-height: 1.4 !important; }
  }
}

.battle-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
  min-height: 0;
  width: 100%;

  @media (min-width: 951px) {
    display: grid;
    grid-template-columns: 280px 1fr;
    grid-template-rows: 1fr auto;
    grid-template-areas: 
      "log arena"
      "log moves";
    height: 100%; // Llenado total
    max-height: 100%;
    width: 100%;
    max-width: 1230px; /* 280px log + 950px arena */
  }
}

.battle-log-wrapper {
  grid-area: log;
  display: flex;
  flex-direction: column;
  background: Rgba(0, 0, 0, 0.2);
  border-right: 1px solid Rgba(255, 255, 255, 0.3) !important; // Más brillo para que se note
  overflow: hidden;
  min-height: 0;
  position: relative;
  flex: 1;
  
  @media (max-width: 959px) {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    border-right: none;
    border-top: 1px solid Rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  }

  @media (min-width: 960px) {
    border-radius: 0; // Cuadrado para integrarse al modal
    :deep(.battle-log) { position: absolute; inset: 0; }
  }
}

/* Ensure controls and arena take their grid spots */
:deep(.battle-arena) { 
  grid-area: arena; 
  aspect-ratio: 16 / 11 !important;
  width: 100%;
  height: auto !important;
  object-fit: contain;

  @media (min-width: 951px) {
    height: 100% !important;
    max-height: none !important;
    object-fit: cover;
  }
}
:deep(#move-panel) { 
  grid-area: moves; 
  z-index: var(--z-low); // Asegurar que todo el panel de control esté sobre el fondo
}

</style>
