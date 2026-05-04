<script setup>
import { computed, watch } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useLivePvPStore } from '@/stores/livePvP'
import BattleMovesGrid from './BattleMovesGrid.vue'
import BattleActionButtons from './BattleActionButtons.vue'
import BattleQuickTeam from './BattleQuickTeam.vue'
import BattleQuickBag from './BattleQuickBag.vue'
import { defineAsyncComponent } from 'vue'

const isDebugActive = !!window.__VITE_DEBUG__
const BattleDebugTools = isDebugActive 
  ? defineAsyncComponent(() => import('./BattleDebugTools.vue'))
  : null

const battleStore = useBattleStore()
const uiStore = useUIStore()
const gameStore = useGameStore()
const modalStore = useModalStore()
const livePvP = useLivePvPStore()

const battle = computed(() => battleStore.state)
const player = computed(() => battle.value?.player)
const gs = computed(() => gameStore.state)

const isIntroActive = computed(() => {
  const s = battleStore.fsm.currentState
  return s === 'INITIALIZING' || s === 'FIRST_INTRO'
})

const execShowBattleSwitch = () => { 
  const isForced = uiStore.isBattleSwitchForced
  uiStore.isBattleSwitchForced = false

  modalStore.open('PokemonSelection', {
    title: 'CAMBIAR POKÉMON',
    isBattleSwitch: true,
    battleMode: 'wild',
    includeTeam: true,
    preventClose: isForced, 
    activePokemonUid: player.value?.uid,
    onConfirm: (pokes) => {
      if (pokes.length > 0) {
        const index = gameStore.state.team.findIndex(p => p.uid === pokes[0].uid)
        if (index !== -1) {
          if (livePvP.battleState.active) {
            livePvP._commitPick({ type: 'switch', switchIndex: index })
          } else {
            battleStore.executeSwitch(index, true)
          }
        }
      }
    }
  })
}

const execTryCatch = () => { 
  const balls = Object.keys(gs.value.inventory).filter(n => n.toLowerCase().includes('ball'))
  if (balls.length === 0) {
    uiStore.notify('¡No tienes Poké Balls!', '🚫')
    return
  }
  
  modalStore.open('Inventory', { 
    battleMode: true, 
    initialCategory: 'pokeballs' 
  })
}

const execShowBattleBag = () => { 
  modalStore.open('Inventory', { 
    battleMode: true, 
    initialCategory: 'pociones' 
  })
}

watch(() => uiStore.isBattleSwitchForced, (val) => {
  if (val) {
    if (battleStore.isProcessing) {
      const checkReady = setInterval(() => {
        if (!battleStore.isProcessing) {
          clearInterval(checkReady)
          execShowBattleSwitch()
        }
      }, 100)
    } else {
      execShowBattleSwitch()
    }
  }
})
</script>

<template>
  <div
    id="move-panel"
  >
    <div class="battle-controls-layout">
      <!-- Zona 1: Equipo Rápido (Izquierda) -->
      <aside class="quick-shortcut-zone zone-team">
        <BattleQuickTeam />
      </aside>

      <div class="controls-content">
        <component
          :is="BattleDebugTools"
          v-if="BattleDebugTools"
        />
        <BattleMovesGrid 
          v-if="player"
          class="is-compact"
          :moves="player.moves" 
          :is-processing="battleStore.isProcessing || battleStore.isIntroAnimating"
          :player-info="player"
          @use-move="(idx) => battleStore.executeMove(idx)"
        />

        <BattleActionButtons 
          :is-finishing="battleStore.isFinishing || battleStore.isIntroAnimating"
          @switch="execShowBattleSwitch"
          @bag="execShowBattleBag"
          @run="battleStore.flee"
          @catch="execTryCatch"
          @select-ball="(name) => battleStore.useItemInBattle(name)"
        />

        <div
          v-if="battleStore.isSearching"
          class="battle-finish-overlay"
        >
          <div class="finish-actions-group">
            <button
              v-if="gameStore.state.team.some(p => p.hp > 0)"
              class="continue-btn-final search-btn"
              @click.stop="battleStore.isSearching
                ? battleStore.triggerSearchEncounter()
                : battleStore.completeBattleFlow('search')"
            >
              <span class="btn-emoji">🔍</span> BUSCAR
            </button>
            <button
              class="continue-btn-final map-btn"
              @click.stop="battleStore.completeBattleFlow('map')"
            >
              <span class="btn-emoji">🗺️</span> VOLVER AL MAPA
            </button>
          </div>
        </div>
      </div>

      <!-- Zona 2: Mochila Rápida (Derecha) -->
      <aside class="quick-shortcut-zone zone-bag">
        <BattleQuickBag />
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

#move-panel {
  --move-card-max-width: 200px;
  --move-panel-gap: 12px;
  --info-zone-width: 16px; 
  --move-panel-max-width: calc(((var(--move-card-max-width) + var(--info-zone-width)) * 2) + var(--move-panel-gap));
  --shortcut-zone-width: 160px;
  
  padding: 0 !important; 
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  overflow: visible !important; 
  z-index: var(--z-low);
  
  @media (max-width: 959px) {
    padding: 0;
    flex-shrink: 0;
    margin-bottom: -2px;
  }

  @media (max-width: 420px) {
    padding: 0 !important;
  }
}

.battle-controls-layout {
  display: flex;
  align-items: stretch; // Estirar para coincidir con la altura del centro
  justify-content: space-between;
  gap: 5px; // Gap mínimo entre zonas
  width: 100%;
  max-width: 100%;
  margin: 0;

  @media (max-width: 950px) {
    .quick-shortcut-zone {
      display: none !important;
    }
    justify-content: center;
  }
}

.quick-shortcut-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  
  // Trick: height 0 + min-height 100% para que hereden la altura del padre 
  // (definida por el centro) sin expandir el contenedor ellos mismos.
  height: 0;
  min-height: 100%;
  overflow: hidden;
  
  &.zone-team { min-width: 220px; }
  &.zone-bag { min-width: 140px; }
}

.controls-content {
  width: 100%;
  max-width: var(--move-panel-max-width);
  display: flex;
  flex-direction: column;
  gap: 8px; // Gap reducido entre movimientos y botones
  flex-shrink: 0;
  padding-top: 8px;
  position: relative;
}

:deep(.moves-grid-vicio) {
  margin-bottom: 0 !important;
}

.battle-finish-overlay {
  position: absolute;
  inset: 0;
  background: Rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-overlay);
  pointer-events: all;
  cursor: pointer;
  -webkit-backdrop-filter: Blur(4px);
  backdrop-filter: Blur(4px);
  @include gpu-layer;
}

.continue-btn-final {
  @include btn-vicio('info', 'md', true);
  max-width: 300px;
  display: flex;
  align-items: center;
  z-index: calc(var(--z-overlay) + 1);
  pointer-events: all;
  cursor: pointer;
  justify-content: flex-start;
  padding-left: 48px;
  gap: 16px;
  text-align: left;
  
  &.map-btn {
    @include btn-vicio('success', 'md', true);
  }

  .btn-emoji {
    width: 32px;
    font-size: 28px; 
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: Drop-Shadow(0 2px 4px Rgba(0,0,0,0.3));
    position: relative;
    top: -1px;
    flex-shrink: 0;
  }
}

.finish-actions-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 20px;
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>