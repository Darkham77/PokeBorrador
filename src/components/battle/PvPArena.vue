<script setup>
import { computed, watch, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useLivePvPStore } from '@/stores/livePvP'
import { useUIStore } from '@/stores/ui'
import { useBattleVisuals } from '@/composables/useBattleVisuals'
import { phaserBridge } from '@/logic/phaserBridge'

// Sub-components (Reusing from battle directory)
import BattleInfoCard from './BattleInfoCard.vue'
import BattleMovesGrid from './BattleMovesGrid.vue'
import BattleSwitchModal from './BattleSwitchModal.vue'

const gameStore = useGameStore()
const livePvP = useLivePvPStore()
const uiStore = useUIStore()
const { _getHpPct, _getHpClass } = useBattleVisuals()

const gs = computed(() => gameStore.state)
const battle = computed(() => livePvP.battleState)

// Sync with Phaser
const syncToPhaser = () => {
  if (battle.value.active) {
    // We reuse the BattleScene but send PvP data
    phaserBridge.sendCommand('BattleScene', 'SYNC_BATTLE', {
      isPvP: true,
      locationId: 'pvp',
      cycle: gs.value.dayCycle || 'day',
      player: battle.value.myTeam[battle.value.myActiveIdx],
      enemy: battle.value.enemyTeam[battle.value.enemyActiveIdx]
    })
  }
}

watch(() => battle.value.active, (active) => {
  if (active) syncToPhaser()
}, { immediate: true })

onMounted(() => {
  if (battle.value.active) syncToPhaser()
})

// Actions
const handleMove = (idx) => {
  livePvP._commitPick({ type: 'move', moveIndex: idx })
}

const handleForfeit = () => {
  if (confirm('¿Seguro que quieres rendirte?')) {
    livePvP._forfeit()
  }
}

const handleSwitch = () => {
  uiStore.isBattleSwitchOpen = true
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
            @click="handleSwitch"
          >
            CAMBIAR
          </button>
          <button
            class="action-btn forfeit"
            @click="handleForfeit"
          >
            RENDIRSE
          </button>
        </div>
      </div>
    </div>

    <!-- Switch Modal -->
    <BattleSwitchModal v-if="uiStore.isBattleSwitchOpen" />
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
  transform: translateZ(0);
}

.battle-arena {
  height: 300px;
  position: relative;
  background: linear-gradient(to bottom, #1e293b, #0f172a);
}

.trainer-header {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  @include pixelated;
  font-size: 8px;
  color: #94a3b8;
}

.pvp-log-container {
  flex: 1;
  background: rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pvp-status-bar {
  padding: 10px;
  text-align: center;
  @include pixelated;
  font-size: 10px;
  background: rgba(255,255,255,0.05);
  
  .choosing { color: #4ade80; }
  .waiting { color: #facc15; }
  .resolving { color: #60a5fa; }
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
  border-bottom: 1px solid rgba(255,255,255,0.03);
}

#move-panel {
  padding: 20px;
  background: #1e293b;
  &.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.pvp-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
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
    background: #334155;
    color: $white;
  }
  
  &.forfeit {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
  
  &:hover {
    transform: translateY(-2px);
  }
}
</style>
