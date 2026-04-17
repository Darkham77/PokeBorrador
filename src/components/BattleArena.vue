<script setup>
import { computed, watch, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import { useBattleVisuals } from '@/composables/useBattleVisuals'
import { phaserBridge } from '@/logic/phaserBridge'

// Sub-components
import BattleLog from './battle/BattleLog.vue'
import BattleInfoCard from './battle/BattleInfoCard.vue'
import BattleMovesGrid from './battle/BattleMovesGrid.vue'
import BattleActionButtons from './battle/BattleActionButtons.vue'
import BattleInventoryModal from './battle/BattleInventoryModal.vue'
import BattleSwitchModal from './battle/BattleSwitchModal.vue'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const { getHpPct, getHpClass } = useBattleVisuals()

const gs = computed(() => gameStore.state)
const battle = computed(() => battleStore.activeBattle)
const enemy = computed(() => battle.value?.enemy)
const player = computed(() => battle.value?.player)

// Render logic bridge (Phaser Sync)
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

// Sync on HP changes (for lifebars/animations in Phaser)
watch(() => [player.value?.hp, enemy.value?.hp], () => {
  if (battleStore.isBattleActive) syncBattleToPhaser()
})

onMounted(() => {
  if (battleStore.isBattleActive) syncBattleToPhaser()
})

// Actions
const execShowBattleSwitch = () => { 
  uiStore.isBattleSwitchForced = false
  uiStore.isBattleSwitchOpen = true 
}
const execTryCatch = () => { 
  // Locate best ball or show inventory
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

// Watch for forced switch (when player pokemon faints)
watch(() => player.value?.hp, (newHp) => {
  if (newHp <= 0 && battleStore.isBattleActive && !battleStore.isFinishing) {
    uiStore.isBattleSwitchForced = true
    uiStore.isBattleSwitchOpen = true
  }
})
</script>

<template>
  <div 
    id="battle-screen" 
    class="battle-screen-grid"
    :class="{ active: battleStore.isBattleActive, 'is-finishing': battleStore.isFinishing }"
  >
    <div
      v-if="battle"
      class="battle-container"
    >
      <!-- Arena Layout -->
      <div
        id="battle-arena"
        class="battle-arena"
      >
        <!-- The legacy canvas and sprites are now handled by the global Phaser layer -->
        <div class="battle-combatants">
          <!-- Enemy Side INFO -->
          <div class="combatant-info-wrap enemy-side">
            <BattleInfoCard :pokemon="enemy" />
          </div>

          <!-- Player Side INFO -->
          <div class="combatant-info-wrap player-side">
            <BattleInfoCard
              :pokemon="player"
              :is-player="true"
              :nick-style="gs.nick_style"
            />
          </div>
        </div>
      </div>

      <!-- Battle Log -->
      <BattleLog class="battle-log" />

      <!-- Controls -->
      <div id="move-panel">
        <BattleMovesGrid 
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
          <button
            class="continue-btn-final"
            @click="battleStore.completeBattleFlow()"
          >
            CONTINUAR ➔
          </button>
        </div>
        <!-- Modals -->
        <BattleInventoryModal />
        <BattleSwitchModal />
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-screen-grid {
  width: 100%;
  height: 100%;
  box-shadow: 0 20px 50px rgba(0,0,0,0.7);
  border: 1px solid rgba(255,255,255,0.05);
}

.battle-arena {
  position: relative;
  height: 350px; /* Base height for arena */
  overflow: hidden;
  border-radius: 24px 24px 0 0;
  background: transparent; /* Allow Phaser background to show */
}

.battle-combatants {
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.enemy-side { align-self: flex-start; }
.player-side { align-self: flex-end; }

#move-panel {
  padding: 20px;
  background: rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.battle-finish-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.continue-btn-final {
  background: linear-gradient(135deg, var(--blue), #2563eb);
  color: #fff;
  border: none;
  padding: 20px 50px;
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.4);
}
</style>
