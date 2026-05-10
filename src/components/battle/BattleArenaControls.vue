<script setup lang="ts">

import { computed, watch, defineAsyncComponent, type Component } from 'vue'
import { gsap } from 'gsap'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useLivePvPStore } from '@/stores/livePvP'
import BattleMovesGrid from './BattleMovesGrid.vue'
import BattleActionButtons from './BattleActionButtons.vue'
import BattleQuickTeam from './BattleQuickTeam.vue'
import BattleQuickBag from './BattleQuickBag.vue'
import type { Pokemon } from '@/types/pokemon'

const isDebugActive = typeof window !== 'undefined' && !!(window as unknown as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__
const BattleDebugTools = isDebugActive 
  ? defineAsyncComponent(() => import('./BattleDebugTools.vue')) as Component
  : null

const battleStore = useBattleStore()
const uiStore = useUIStore()
const gameStore = useGameStore()
const modalStore = useModalStore()
const livePvP = useLivePvPStore()

const battle = computed(() => battleStore.state)
const player = computed(() => battle.value?.player)
const gs = computed(() => gameStore.state)

const isControlsDisabled = computed(() => {
  const s = battleStore.currentFsmState
  return battleStore.isProcessing || 
         battleStore.isIntroAnimating || 
         battleStore.isFinishing ||
         battleStore.isSearching ||
         ['INITIALIZING', 'FIRST_INTRO'].includes(s)
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
    onConfirm: (pokes: Pokemon[]) => {
      if (pokes.length > 0 && pokes[0]) {
        const team = (gameStore.state.team || []) as (Pokemon | null)[]
        const index = team.findIndex(p => p && p.uid === pokes[0]?.uid)
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
  const inventory = gs.value.inventory || {}
  const balls = Object.keys(inventory).filter(n => n.toLowerCase().includes('ball'))
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
      const checkReady = () => {
        if (!battleStore.isProcessing) {
          execShowBattleSwitch()
        } else {
          gsap.delayedCall(0.1, checkReady)
        }
      }
      gsap.delayedCall(0.1, checkReady)
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
    <Transition
      name="controls-slide"
      appear
    >
      <div 
        class="battle-controls-layout"
        :class="{ 'is-ui-locked': isControlsDisabled }"
      >
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
            :moves="player.moves || []" 
            :is-processing="isControlsDisabled"
            :player-info="player"
            @use-move="(idx) => battleStore.executeMove(idx)"
          />

          <BattleActionButtons 
            :is-finishing="isControlsDisabled"
            @switch="execShowBattleSwitch"
            @bag="execShowBattleBag"
            @run="battleStore.flee"
            @catch="execTryCatch"
            @select-ball="(name) => battleStore.useItemInBattle(name)"
          />
        </div>

        <!-- Zona 2: Mochila Rápida (Derecha) -->
        <aside class="quick-shortcut-zone zone-bag">
          <BattleQuickBag />
        </aside>
      </div>
    </Transition>

    <!-- Overlay de Finalización / Búsqueda (Cubre TODO el move-panel) -->
    <div
      v-if="(battleStore.isSearching && ['WAIT_INPUT', 'BUSH_IDLE', 'PARALLEL_PREP', 'BUSH_VISIBLE', 'SILHOUETTE_MODE', 'GEN_NEW_S2'].includes(String(battleStore.currentSubState))) || battleStore.isReadyToExit"
      class="battle-finish-overlay"
      :class="{ 'is-search-mode': battleStore.isSearching }"
    >
      <div class="finish-actions-group">
        <button
          v-if="battleStore.isSearching"
          class="continue-btn-final fight-btn"
          @click.stop="battleStore.startEncounter()"
        >
          <span class="btn-emoji">⚔️</span> ¡COMBATIR!
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
  transition: filter 0.4s ease, opacity 0.4s ease;
  width: 100%;
  max-width: 100%;
  margin: 0;

  &.is-ui-locked {
    will-change: transform, filter, opacity;
  filter: Grayscale(1);
    opacity: 0.6;
    pointer-events: none;
  }

  @media (max-width: 775px) {
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
  
  &.zone-team { 
    min-width: 110px; 
  }
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
  min-height: 230px; // Reserva de espacio determinista para evitar saltos de cámara
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
  -webkit-will-change: transform, opacity;
  will-change: transform, opacity;
  @include gpu-layer;

  &.is-search-mode {
    align-items: flex-end;
    padding-bottom: 20px;
  }
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
    will-change: transform, filter, opacity;
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
  from { opacity: 0; transform: Translatey(20px); }
  to { opacity: 1; transform: Translatey(0); }
}
/* Transición de entrada Sincronizada para todo el panel de control */
.controls-slide-enter-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.controls-slide-enter-from {
  opacity: 0;
  transform: Translatey(30px) Scale(0.95);
}
</style>
