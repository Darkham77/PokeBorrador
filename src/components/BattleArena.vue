<script setup>
import { computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import { useBattleVisuals } from '@/composables/useBattleVisuals'

// Sub-components
import BattleLog from './battle/BattleLog.vue'
import BattleInfoCard from './battle/BattleInfoCard.vue'
import BattleMovesGrid from './battle/BattleMovesGrid.vue'
import BattleActionButtons from './battle/BattleActionButtons.vue'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const { 
  canvasRef, getSprite, redrawBackground,
  getHpPct, getHpClass 
} = useBattleVisuals()

const gs = computed(() => gameStore.state)
const battle = computed(() => battleStore.activeBattle)
const enemy = computed(() => battle.value?.enemy)
const player = computed(() => battle.value?.player)

// Render logic bridge
watch(() => battleStore.isBattleActive, async (active) => {
  if (active) {
    await nextTick()
    redrawBackground(true, battle.value?.locationId, battle.value?.cycle)
  }
})

let resizeObserver = null
onMounted(() => {
  const arena = document.getElementById('battle-arena')
  if (arena) {
    resizeObserver = new ResizeObserver(() => redrawBackground(battleStore.isBattleActive, battle.value?.locationId, battle.value?.cycle))
    resizeObserver.observe(arena)
  }
  if (battleStore.isBattleActive) nextTick(() => redrawBackground(true, battle.value?.locationId, battle.value?.cycle))
})

onUnmounted(() => { if (resizeObserver) resizeObserver.disconnect() })

// Actions
const execShowBattleSwitch = () => { if (typeof window.showBattleSwitch === 'function') window.showBattleSwitch() }
const execTryCatch = () => { if (typeof window.tryCatch === 'function') window.tryCatch() }
const execShowBattleBag = () => { if (typeof window.showBattleBag === 'function') window.showBattleBag() }
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
        <canvas
          id="battle-bg-canvas"
          ref="canvasRef"
          class="battle-bg-canvas"
        />
        
        <div class="battle-combatants">
          <!-- Enemy Side -->
          <div class="combatant-info-wrap enemy-side">
            <BattleInfoCard :pokemon="enemy" />
          </div>
          <div class="sprite-wrap enemy-sprite">
            <img
              :src="getSprite(enemy.id, enemy.isShiny)"
              class="pokemon-sprite"
            >
          </div>

          <!-- Player Side -->
          <div class="sprite-wrap player-sprite">
            <img
              :src="getSprite(player.id, player.isShiny, true)"
              class="pokemon-sprite back"
            >
          </div>
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

.battle-bg-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.battle-arena {
  position: relative;
  height: 350px; /* Base height for arena */
  overflow: hidden;
  border-radius: 24px 24px 0 0;
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

.sprite-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 150px;
}

.enemy-side { align-self: flex-start; }
.player-side { align-self: flex-end; }

.enemy-sprite { align-items: flex-start; justify-content: flex-end; }
.player-sprite { align-items: flex-end; justify-content: flex-start; }

.pokemon-sprite {
  height: 140px;
  width: auto;
  image-rendering: pixelated;
  filter: drop-shadow(0 15px 15px rgba(0,0,0,0.5));
  animation: idle 3s infinite ease-in-out;
}

.pokemon-sprite.back { height: 180px; }

@keyframes idle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

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
