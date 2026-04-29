<script setup>
import { computed, watch } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useLivePvPStore } from '@/stores/livePvP'
import BattleMovesGrid from './BattleMovesGrid.vue'
import BattleActionButtons from './BattleActionButtons.vue'
import BattleDebugTools from './BattleDebugTools.vue'

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
    preventClose: isForced, // Impedir cerrar solo si es un cambio forzado por debilitamiento
    activePokemonUid: player.value?.uid,
    onConfirm: (pokes) => {
      if (pokes.length > 0) {
        const index = gameStore.state.team.findIndex(p => p.uid === pokes[0].uid)
        if (index !== -1) {
          if (livePvP.battleState.active) {
            livePvP._commitPick({ type: 'switch', switchIndex: index })
          } else {
            battleStore.executeSwitch(index, true) // Forzado = true
          }
        }
      }
    }
  })
}

const execTryCatch = () => { 
  const balls = Object.keys(gs.value.inventory).filter(n => n.toLowerCase().includes('ball'))
  if (balls.length === 1) {
    battleStore.useItemInBattle(balls[0])
  } else {
    modalStore.open('Inventory', { 
      battleMode: true, 
      initialCategory: 'pokeballs' 
    })
  }
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
    // Si el combate está procesando una animación, esperamos un poco
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
      <BattleDebugTools />
      <BattleMovesGrid 
        v-if="player"
        :moves="player.moves" 
        :is-processing="battleStore.isProcessing"
        :player-info="player"
        @use-move="(idx) => battleStore.executeMove(idx)"
      />

      <BattleActionButtons 
        :is-finishing="battleStore.isFinishing"
        @switch="execShowBattleSwitch"
        @bag="execShowBattleBag"
        @run="battleStore.flee"
        @catch="execTryCatch"
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
            🔍 BUSCAR OTRO
          </button>
          <button
            class="continue-btn-final map-btn"
            @click.stop="battleStore.completeBattleFlow('map')"
          >
            🗺️ VOLVER AL MAPA
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
  z-index: var(--z-low);
  
  @media (max-width: 959px) {
    padding: 12px 12px 12px 12px; // Aumentado de 2px a 12px para dar aire a las animaciones
    flex-shrink: 0;
    margin-top: auto;
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
  -webkit-backdrop-filter: Blur(4px); backdrop-filter: Blur(4px);
}

.continue-btn-final {
  @include btn-vicio('info', 'md', true);
  max-width: 240px;
  
  &.map-btn {
    @include btn-vicio('success', 'md', true);
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
