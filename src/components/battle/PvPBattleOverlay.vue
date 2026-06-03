<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { gsap } from 'gsap';
import { useGameStore } from '@/stores/game';
import { useLivePvPStore } from '@/stores/livePvP';
import { useChatStore } from '@/stores/chat';

// Sub-components
import BattleLog from './BattleLog.vue';
import BattleInfoCard from './BattleInfoCard.vue';
import BattleMovesGrid from './BattleMovesGrid.vue';
import PlayerAvatar from '@/components/player/PlayerAvatar.vue';

const gameStore = useGameStore();
const livePvPStore = useLivePvPStore();
const chatStore = useChatStore();
const battle = computed(() => livePvPStore.battleState);

const opponentCosmetics = computed(() => {
  return battle.value.opponentId ? chatStore.profileCosmetics[battle.value.opponentId] : null;
});

const timeRemaining = ref(40);
const timerRef = ref<HTMLElement | null>(null);
const loaderRef = ref<HTMLElement | null>(null);

let timer: gsap.core.Tween | null = null;
let pulseTween: gsap.core.Tween | null = null;
let spinTween: gsap.core.Tween | null = null;

onMounted(() => {
  startTurnTimer();
  if (battle.value.opponentId) {
    chatStore.fetchMissingCosmetics([battle.value.opponentId]);
  }
});

watch(() => battle.value.opponentId, (newOpponentId) => {
  if (newOpponentId) {
    chatStore.fetchMissingCosmetics([newOpponentId]);
  }
}, { immediate: true });

onUnmounted(() => {
  stopTurnTimer();
});

const startTurnTimer = () => {
  timeRemaining.value = 40;
  if (timer) timer.kill();
  
  const tick = () => {
    if (battle.value.phase === 'choosing' && !battle.value.myPick) {
      timeRemaining.value--;
      if (timeRemaining.value <= 0) {
        stopTurnTimer();
      } else {
        timer = gsap.delayedCall(1, tick);
      }
    }
  }
  
  timer = gsap.delayedCall(1, tick);
};

const stopTurnTimer = () => {
  if (timer) timer.kill();
};

// Computeds for convenience
const playerPoke = computed(() => (battle.value.myTeam && battle.value.myTeam[battle.value.myActiveIdx]) || null);
const enemyPoke = computed(() => (battle.value.enemyTeam && battle.value.enemyTeam[battle.value.enemyActiveIdx]) || null);
const isRanked = computed(() => battle.value.isRanked);

const handleMoveSelection = (moveIdx: number) => {
  livePvPStore._commitPick({ type: 'move', moveIndex: moveIdx });
  stopTurnTimer();
};

// GSAP: Animaciones de UI
watch(() => timeRemaining.value, (val) => {
  if (val < 10 && val > 0 && !pulseTween) {
    if (timerRef.value) {
      pulseTween = gsap.to(timerRef.value, {
        scale: 1.1,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }
  } else if ((val >= 10 || val <= 0) && pulseTween) {
    pulseTween.kill();
    pulseTween = null;
    if (timerRef.value) gsap.to(timerRef.value, { scale: 1, duration: 0.2 });
  }
});

watch(() => [livePvPStore.battleState.myPick, livePvPStore.battleState.enemyPick, livePvPStore.battleState.phase], ([myPick, enemyPick, phase]) => {
  const showLoader = myPick && !enemyPick && phase === 'choosing';
  if (showLoader && !spinTween) {
    // Esperar al siguiente tick para que el ref esté disponible
    gsap.delayedCall(0, () => {
      if (loaderRef.value) {
        spinTween = gsap.to(loaderRef.value, {
          rotation: 360,
          duration: 1,
          repeat: -1,
          ease: 'none'
        });
      }
    });
  } else if (!showLoader && spinTween) {
    spinTween.kill();
    spinTween = null;
  }
}, { immediate: true });
</script>

<template>
  <div
    v-if="battle.active"
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
          :gender="gameStore.state.gender || 'h'"
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
          v-if="battle.phase === 'choosing'"
          ref="timerRef"
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
          v-if="battle.myPick && !battle.enemyPick && battle.phase === 'choosing'"
          class="waiting-overlay"
        >
          <div 
            ref="loaderRef"
            class="pulse-loader" 
          />
          <span class="press-start">ESPERANDO AL RIVAL...</span>
        </div>
      </div>

      <BattleLog class="pvp-log" />

      <!-- Controls -->
      <div class="controls-panel card-glass">
        <BattleMovesGrid 
          :moves="playerPoke?.moves || []"
          :is-processing="battle.phase !== 'choosing' || !!battle.myPick"
          @use-move="handleMoveSelection"
        />
        
        <div class="status-msg press-start">
          {{ battle.phase === 'sync' ? 'Sincronizando...' : 
            battle.phase === 'choosing' ? (battle.myPick ? '¡Movimiento elegido!' : 'Elige tu jugada') : 
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
          :player-class="opponentCosmetics?.player_class || null"
          :gender="opponentCosmetics?.gender || 'h'"
          :size="200"
          class="trainer-sprite"
        />
        <div class="trainer-stats">
          <div class="name">
            {{ battle.opponentName }}
          </div>
          <div class="elo press-start">
            {{ battle.opponentElo }} LP
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:string";
@use "@/styles/core/tools" as *;

.pvp-screen-wrapper {
  position: fixed;
  inset: 0;
  z-index: var(--z-base);
  background: $black;
  display: flex;
  padding: 20px;
  gap: 20px;
  overflow: hidden;

  &.is-ranked {
    background: Radial-Gradient(circle at center, #1e293b 0%, #0f172a 100%);
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
  background: Rgba(255, 255, 255, 0.03);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(12px);
  backdrop-filter: Blur(12px);
  @include gpu-layer;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  @include gpu-layer;
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
    @include sprite-render;
    transform: Scale(1.5);
    margin: 20px 0;
  }

  .name {
    font-size: 16px;
    font-weight: bold;
    color: $white;
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
  transform: Translatex(-50%);
  z-index: var(--z-base);
  background: Rgba(0, 0, 0, 0.6);
  padding: 10px 20px;
  border-radius: 20px;
  border: 1px solid var(--blue);
  color: $white;
  display: flex;
  align-items: center;
  gap: 10px;

  &.low-time {
    border-color: var(--red);
    color: var(--red);
  }
}

.waiting-overlay {
  position: absolute;
  inset: 0;
  background: Rgba(0, 0, 0, 0.4);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(4px);
  backdrop-filter: Blur(4px);
  @include gpu-layer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: $white;
  z-index: var(--z-base);
  @include gpu-layer;

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
  @include pixelated;
}

.pulse-loader {
  width: 40px;
  height: 40px;
  border: 4px solid var(--blue);
  border-top-color: transparent;
  border-radius: 50%;
}
</style>
