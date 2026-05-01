<script setup>
import { computed, watch } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useLivePvPStore } from '@/stores/livePvP'
import BattleMovesGrid from './BattleMovesGrid.vue'
import BattleActionButtons from './BattleActionButtons.vue'
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
  // This is now mainly for "no balls" or fallback
  const balls = Object.keys(gs.value.inventory).filter(n => n.toLowerCase().includes('ball'))
  if (balls.length === 0) {
    uiStore.notify('¡No tienes Poké Balls!', '🚫')
    return
  }
  
  // If called from a legacy place or fallback, open inventory
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

// Watcher robusto para cambio forzado
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
  <div id="move-panel">
    <div class="controls-content">
      <component
        :is="BattleDebugTools"
        v-if="BattleDebugTools"
      />
      <BattleMovesGrid 
        v-if="player"
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
        v-if="battleStore.isFinishing"
        class="battle-finish-overlay"
      >
        <div class="finish-actions-group">
          <button
            v-if="gameStore.state.team.some(p => p.hp > 0)"
            class="continue-btn-final search-btn"
            @click.stop="battleStore.completeBattleFlow('search')"
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

    <!-- Modals (Relative to move-panel) -->
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

#move-panel {
  padding: 16px; 
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  overflow: visible !important; 
  z-index: var(--z-low); // Aseguramos que esté por encima del fondo del combate pero bajo modales/tooltips
  
  @media (max-width: 959px) {
    padding: 12px 12px 0 12px; // Anclaje al fondo (0px bottom)
    flex-shrink: 0;
    margin-bottom: -2px; // Precisión de anclaje según estándares
  }
}

.controls-content {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
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
  z-index: var(--z-low);
  -webkit-backdrop-filter: Blur(4px);
  backdrop-filter: Blur(4px);
  @include gpu-layer;
}

.continue-btn-final {
  @include btn-vicio('info', 'md', true);
  max-width: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  
  &.map-btn {
    @include btn-vicio('success', 'md', true);
  }

  .btn-emoji {
    font-size: 32px; 
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    filter: Drop-Shadow(0 2px 4px Rgba(0,0,0,0.3));
    position: relative;
    top: -2px; // Ajuste para el baseline de la fuente pixelada
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