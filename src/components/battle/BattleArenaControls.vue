<script setup>
import { computed, watch } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useLivePvPStore } from '@/stores/livePvP'
import BattleMovesGrid from './BattleMovesGrid.vue'
import BattleActionButtons from './BattleActionButtons.vue'
import BattleInventoryModal from './BattleInventoryModal.vue'

const battleStore = useBattleStore()
const uiStore = useUIStore()
const gameStore = useGameStore()
const modalStore = useModalStore()
const livePvP = useLivePvPStore()

const battle = computed(() => battleStore.state)
const player = computed(() => battle.value?.player)
const gs = computed(() => gameStore.state)

const execShowBattleSwitch = () => { 
  // Limpiamos el flag inmediatamente para permitir futuros disparos si este falla
  uiStore.isBattleSwitchForced = false

  modalStore.open('PokemonSelection', {
    title: 'CAMBIAR POKÉMON',
    isBattleSwitch: true,
    battleMode: 'wild',
    includeTeam: true,
    preventClose: true, // Impedir cerrar sin elegir si es forzado
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
    uiStore.isBattleInventoryOpen = true
  }
}

const execShowBattleBag = () => { 
  uiStore.isBattleInventoryOpen = true 
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
    <BattleInventoryModal />
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
  
  @media (max-width: 959px) {
    padding: 12px 12px 2px 12px;
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
  background: Linear-Gradient(135deg, var(--blue), #2563eb);
  color: $white;
  border: none;
  padding: 16px 24px;
  @include pixelated;
  font-size: 11px;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 10px 30px Rgba(37, 99, 235, 0.4);
  transition: all 0.2s ease;
  width: 100%;
  max-width: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    transform: TranslateY(-2px);
    box-shadow: 0 15px 30px Rgba(37, 99, 235, 0.6);
  }

  &.map-btn {
    background: Linear-Gradient(135deg, #10b981, #059669);
    box-shadow: 0 10px 30px Rgba(16, 185, 129, 0.4);

    &:hover {
      box-shadow: 0 15px 30px Rgba(16, 185, 129, 0.6);
    }
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
