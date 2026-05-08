<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useLivePvPStore } from '@/stores/livePvP'
import BattleInfoCard from './BattleInfoCard.vue'
import BattleMovesGrid from './BattleMovesGrid.vue'
import { useModalStore } from '@/stores/modals'

const gameStore = useGameStore() as any
const livePvP = useLivePvPStore() as any

const battle = computed(() => livePvP.battleState as any)

// PvP Sync (Pure Vue)
const syncToGameBus = () => {
  // Aquí podríamos emitir eventos al gameBus si fuera necesario
}

onMounted(() => {
  syncToGameBus()
})

// Actions
const handleMove = (idx: number) => {
  livePvP._commitPick({ type: 'move', moveIndex: idx })
}

const handleForfeit = () => {
  if (confirm('¿Seguro que quieres rendirte?')) {
    livePvP._forfeit()
  }
}

const handleSwitch = () => {
  useModalStore().open('BattleSwitch', {
    title: 'CAMBIAR POKÉMON',
    isBattleSwitch: true,
    battleMode: 'pvp',
    includeTeam: true,
    activePokemonUid: battle.value.myTeam[battle.value.myActiveIdx].uid,
    onConfirm: (pokes: any[]) => {
      if (pokes.length > 0) {
        const index = (gameStore.state.team as any[]).findIndex(p => p.uid === pokes[0].uid)
        if (index !== -1) {
          livePvP._commitPick({ type: 'switch', switchIndex: index })
        }
      }
    }
  })
}
</script>

<template>
  <div 
    v-if="battle.active"
    id="pvp-screen" 
    class="battle-screen-grid pvp-mode"
  >
    <div class="battle-container">
      <!-- Arena Layout -->
      <div class="battle-arena">
        <div class="battle-combatants">
          <!-- Enemy Side -->
          <div class="combatant-info-wrap enemy-side">
            <div class="trainer-header">
              <span class="trainer-name">{{ battle.opponentName }}</span>
              <span class="trainer-elo">{{ battle.opponentElo }} ELO</span>
            </div>
            <BattleInfoCard :pokemon="battle.enemyTeam[battle.enemyActiveIdx]" />
          </div>

          <!-- Player Side -->
          <div class="combatant-info-wrap player-side">
            <BattleInfoCard
              :pokemon="battle.myTeam[battle.myActiveIdx]"
              :is-player="true"
            />
          </div>
        </div>
      </div>

      <!-- Battle Log -->
      <div class="pvp-log-container">
        <div class="pvp-status-bar">
          <span :class="battle.phase">{{ 
            battle.phase === 'choosing' ? '⚔️ TU TURNO' : 
            battle.phase === 'waiting' ? '⏳ ESPERANDO RIVAL' :
            battle.phase === 'resolving' ? '⚡ CALCULANDO' :
            battle.phase === 'animating' ? '🎬 REPRODUCIENDO' : 'Sincronizando...'
          }}</span>
        </div>
        <div class="logs-area scrollbar">
          <div
            v-for="(log, i) in battle.logs"
            :key="i"
            class="log-entry"
          >
            {{ log }}
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div
        id="move-panel"
        :class="{ disabled: battle.phase !== 'choosing' }"
      >
        <BattleMovesGrid 
          :moves="battle.myTeam[battle.myActiveIdx].moves" 
          :is-processing="battle.phase !== 'choosing'"
          @use-move="handleMove"
        />

        <div class="pvp-actions">
          <button
            class="action-btn switch"
            @click.stop="handleSwitch"
          >
            CAMBIAR
          </button>
          <button
            class="action-btn forfeit"
            @click.stop="handleForfeit"
          >
            RENDIRSE
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.battle-screen-grid {
  position: fixed;
  inset: 0;
  background: var(--darker);
  z-index: var(--z-overlay);
  display: flex;
  flex-direction: column;
  transform: Translatez(0);
}

.battle-arena {
  height: 300px;
  position: relative;
  background: Linear-Gradient(to bottom, Rgba(30, 41, 59, 1), Rgba(15, 23, 42, 1));
}

.trainer-header {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  @include pixelated;
  font-size: 8px;
  color: Rgba(148, 163, 184, 1);
}

.pvp-log-container {
  flex: 1;
  background: Rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pvp-status-bar {
  padding: 10px;
  text-align: center;
  @include pixelated;
  font-size: 10px;
  background: Rgba(255,255,255,0.05);
  
  .choosing { color: Rgba(74, 222, 128, 1); }
  .waiting { color: Rgba(250, 204, 21, 1); }
  .resolving { color: Rgba(96, 165, 250, 1); }
}

.logs-area {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  min-height: 0;
  font-size: 13px;
  line-height: 1.6;
}

.log-entry {
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid Rgba(255,255,255,0.03);
}

#move-panel {
  padding: 16px;
  background: Rgba(30, 41, 59, 1);
  &.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.pvp-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 8px;
}

.action-btn {
  padding: 12px;
  border: none;
  border-radius: 12px;
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &.switch {
    background: Rgba(51, 65, 85, 1);
    color: $white;
  }
  
  &.forfeit {
    background: Rgba(239, 68, 68, 0.1);
    color: Rgba(239, 68, 68, 1);
    border: 1px solid Rgba(239, 68, 68, 0.2);
  }
  
  &:hover {
    transform: Translatey(-2px);
  }
}
</style>
