<script setup lang="ts">

import { computed, watch } from 'vue'
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

// Debug tools are now handled by BattleArena sidebar

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
  return !!(battleStore.isProcessing || 
         battleStore.isIntroAnimating || 
         battleStore.isFinishing ||
         battleStore.isSearching ||
         battle.value?.over ||
         ['INITIALIZING', 'FIRST_INTRO', 'LEVEL_UP_MODAL', 'REWARDS_PHASE'].includes(s || ''))
})

const execShowBattleSwitch = () => { 
  const isForced = uiStore.isBattleSwitchForced
  uiStore.isBattleSwitchForced = false

  modalStore.open('PokemonSelection', {
    title: '⚡ CAMBIAR POKÉMON',
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
            battleStore.executeSwitch(index, isForced)
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

// GSAP Transition Hooks
const onEnter = (el: Element, done: () => void) => {
  gsap.fromTo(el, 
    { opacity: 0, y: 30, scale: 0.95 },
    { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      duration: 0.5, 
      ease: 'back.out(1.7)',
      onComplete: done
    }
  )
}
</script>

<template>
  <div
    id="move-panel"
  >
    <Transition
      :css="false"
      appear
      @enter="onEnter"
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
          <!-- Tools moved to sidebar -->
          <BattleMovesGrid 
            class="is-compact"
            :moves="player?.moves || []" 
            :is-processing="isControlsDisabled"
            :player-info="player"
            @use-move="(idx: number) => battleStore.executeMove(idx)"
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
  z-index: var(--z-hud);
  
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
  @include shell-premium(#141824, 0);
  border-radius: 0 !important;
  border: none;
  border-top: 1px solid Rgba(255, 255, 255, 0.2);

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

    .controls-content {
      flex: 1 1 auto;
      width: 100%;
      max-width: var(--move-panel-max-width);
    }
  }
}

.quick-shortcut-zone {
  display: flex;
  flex-direction: column;
  height: 0;        // No contribuye a la altura del move-panel; esa la define controls-content
  min-height: 100%; // Se estira al alto del contenedor vía align-items: stretch del padre
  overflow-y: auto; // Scrollbar cuando Pokémon o items no caben
  overflow-x: hidden;
  border-left: 1px solid Rgba(255, 255, 255, 0.05);
  border-right: 1px solid Rgba(255, 255, 255, 0.05);
  
  &.zone-team { 
    // 6×115px (tarjetas) + 5×6px (gaps) + 8px (padding grid) + 17px (scrollbar) = 745px
    flex: 0 1 745px;
    max-width: 745px;
    min-width: 120px;
  }
  &.zone-bag { 
    flex: 1 1 90px; // Crece para rellenar el espacio vacío que zone-team no ocupa
    min-width: 90px;
  }
}

.controls-content {
  flex: 0 0 var(--move-panel-max-width); // El panel de movimientos es rígido y no se puede achicar ni deformar
  width: var(--move-panel-max-width);
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0 !important;
  margin: 0 !important; // Junto a la zona de Pokémon, sin márgenes extra
  position: relative;
  justify-content: flex-start;
}

:deep(.moves-grid-vicio) {
  margin: 0 !important;
  padding: 0 !important;
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

</style>
