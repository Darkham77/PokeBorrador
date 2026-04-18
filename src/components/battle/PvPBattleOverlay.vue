<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useGameStore } from '@/stores/game';
import { usePvPStore } from '@/stores/pvpStore';
import { useRankedStore } from '@/stores/rankedStore';
import { useBattleVisuals } from '@/composables/useBattleVisuals';

// Sub-components
import BattleLog from './BattleLog.vue';
import BattleInfoCard from './BattleInfoCard.vue';
import BattleMovesGrid from './BattleMovesGrid.vue';
import PlayerAvatar from '@/components/player/PlayerAvatar.vue';

const gameStore = useGameStore();
const pvpStore = usePvPStore();
const rankedStore = useRankedStore();
const { getHpPct, getHpClass } = useBattleVisuals();

const timeRemaining = ref(40);
let timer = null;

onMounted(() => {
  startTurnTimer();
});

onUnmounted(() => {
  stopTurnTimer();
});

const startTurnTimer = () => {
  timeRemaining.value = 40;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (pvpStore.phase === 'choosing' && !pvpStore.myPick) {
      timeRemaining.value--;
      if (timeRemaining.value <= 0) {
        // Auto-forfeit or random move logic here
        stopTurnTimer();
      }
    }
  }, 1000);
};

const stopTurnTimer = () => {
  if (timer) clearInterval(timer);
};

// Computeds for convenience
const playerPoke = computed(() => pvpStore.myTeam[pvpStore.myActiveIndex] || {});
const enemyPoke = computed(() => pvpStore.enemyTeam[pvpStore.enemyActiveIndex] || {});
const isRanked = computed(() => pvpStore.activeBattle?.isRanked);

const handleMoveSelection = (moveIdx) => {
  pvpStore.makePick({ type: 'move', index: moveIdx });
  stopTurnTimer();
};
</script>

<template>
  <div
    v-if="pvpStore.activeBattle"
    class="pvp-screen-wrapper"
    :class="{ 'is-ranked': isRanked }"
  >
    <!-- Ranked Sidebars (Optional visibility) -->
    <aside
      v-if="isRanked"
      class="trainer-sidebar left"
    >
      <div class="trainer-card card-glass">
        <div class="header press-start">
          JUGADOR
        </div>
        <PlayerAvatar
          :player-class="gameStore.state.playerClass"
          :size="200"
          class="trainer-sprite"
        />
        <div class="trainer-stats">
          <div class="name">
            {{ gameStore.state.trainer }}
          </div>
          <div class="elo press-start">
            {{ gameStore.state.eloRating }} LP
          </div>
        </div>
      </div>
    </aside>

    <main class="battle-main">
      <div class="arena-container card-glass">
        <!-- Timer Overlay -->
        <div
          v-if="pvpStore.phase === 'choosing'"
          class="turn-timer"
          :class="{ 'low-time': timeRemaining < 10 }"
        >
          <div class="timer-ring" />
          <span class="timer-val press-start">{{ timeRemaining }}</span>
        </div>

        <!-- Combatants Info -->
        <div class="battle-combatants">
          <div class="enemy-side">
            <BattleInfoCard :pokemon="enemyPoke" />
          </div>
          <div class="player-side">
            <BattleInfoCard
              :pokemon="playerPoke"
              :is-player="true"
            />
          </div>
        </div>

        <!-- Waiting for opponent overlay -->
        <div
          v-if="pvpStore.myPick && !pvpStore.enemyPick && pvpStore.phase === 'choosing'"
          class="waiting-overlay"
        >
          <div class="pulse-loader" />
          <span class="press-start">ESPERANDO AL RIVAL...</span>
        </div>
      </div>

      <BattleLog class="pvp-log" />

      <!-- Controls -->
      <div class="controls-panel card-glass">
        <BattleMovesGrid 
          :moves="playerPoke.moves"
          :is-processing="pvpStore.phase !== 'choosing' || !!pvpStore.myPick"
          @use-move="handleMoveSelection"
        />
        
        <div class="status-msg press-start">
          {{ pvpStore.phase === 'sync' ? 'Sincronizando...' : 
            pvpStore.phase === 'choosing' ? (pvpStore.myPick ? '¡Movimiento elegido!' : 'Elige tu jugada') : 
            'Resolviendo turno...' }}
        </div>
      </div>
    </main>

    <aside
      v-if="isRanked"
      class="trainer-sidebar right"
    >
      <div class="trainer-card card-glass">
        <div class="header press-start">
          RIVAL
        </div>
        <PlayerAvatar
          :player-class="null"
          :size="200"
          class="trainer-sprite"
        />
        <div class="trainer-stats">
          <div class="name">
            {{ pvpStore.activeBattle.enemyUsername }}
          </div>
          <div class="elo press-start">
            {{ pvpStore.activeBattle.enemyElo }} LP
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style lang="scss" scoped>
.pvp-screen-wrapper {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: #000;
  display: flex;
  padding: 20px;
  gap: 20px;
  overflow: hidden;

  &.is-ranked {
    background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
  }
}

.battle-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1000px;
  margin: 0 auto;
}

.card-glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
}

.arena-container {
  height: 400px;
  position: relative;
  overflow: hidden;
}

.battle-combatants {
  position: absolute;
  inset: 0;
  padding: 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.enemy-side { align-self: flex-start; }
.player-side { align-self: flex-end; }

.trainer-sidebar {
  width: 280px;
  display: flex;
  align-items: center;

  .trainer-card {
    width: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }

  .header {
    font-size: 8px;
    color: var(--gray);
  }

  .trainer-sprite {
    image-rendering: pixelated;
    transform: scale(1.5);
    margin: 20px 0;
  }

  .name {
    font-size: 16px;
    font-weight: bold;
    color: #fff;
  }

  .elo {
    font-size: 9px;
    color: var(--yellow);
    margin-top: 8px;
  }
}

.turn-timer {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: rgba(0, 0, 0, 0.6);
  padding: 10px 20px;
  border-radius: 20px;
  border: 1px solid var(--blue);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;

  &.low-time {
    border-color: var(--red);
    color: var(--red);
    animation: pulse 1s infinite;
  }
}

.waiting-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: #fff;
  z-index: 20;

  span { font-size: 10px; }
}

.controls-panel {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-msg {
  text-align: center;
  font-size: 8px;
  color: var(--gray);
}

.press-start {
  font-family: 'Press Start 2P', monospace;
}

@keyframes pulse {
  0% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.1); }
  100% { transform: translateX(-50%) scale(1); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pulse-loader {
  width: 40px;
  height: 40px;
  border: 4px solid var(--blue);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
</style>
