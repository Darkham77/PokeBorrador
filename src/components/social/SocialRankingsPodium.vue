<script setup lang="ts">
import type { RankedPodiumWinner } from '@/types/battle/pvp'

defineProps<{
  podiumWinners: RankedPodiumWinner[]
  loading?: boolean
}>()
</script>

<template>
  <div class="podium-container">
    <div
      v-if="loading"
      class="loader"
    >
      <div
        v-gsap-loop="'spin'"
        class="spinner"
      />
      <p>Cargando Salón de la Fama...</p>
    </div>

    <div
      v-else-if="podiumWinners.length === 0"
      class="podium-empty-card"
    >
      <span class="podium-empty-icon emoji">👑</span>
      <h4 class="podium-empty-title">
        SALÓN DE LA FAMA EN DISPUTA
      </h4>
      <p class="podium-empty-desc">
        La temporada actual sigue en curso. Al finalizar el mes, los mejores 10 entrenadores del ranking global serán inmortalizados en este podio histórico.
      </p>
    </div>

    <div
      v-else
      class="podium-display"
    >
      <div class="podium-steps-container">
        <!-- 2ND PLACE -->
        <div
          v-if="podiumWinners[1]"
          class="podium-step step-second"
        >
          <span class="podium-crown emoji">🥈</span>
          <span class="podium-player-name">{{ podiumWinners[1].username }}</span>
          <span class="podium-elo">{{ podiumWinners[1].elo }} LP</span>
          <div class="pedestal pedestal-second">
            <span class="pedestal-num">2</span>
          </div>
        </div>

        <!-- 1ST PLACE -->
        <div
          v-if="podiumWinners[0]"
          class="podium-step step-first"
        >
          <span class="podium-crown emoji">👑</span>
          <span class="podium-player-name">{{ podiumWinners[0].username }}</span>
          <span class="podium-elo">{{ podiumWinners[0].elo }} LP</span>
          <div class="pedestal pedestal-first">
            <span class="pedestal-num">1</span>
          </div>
        </div>

        <!-- 3RD PLACE -->
        <div
          v-if="podiumWinners[2]"
          class="podium-step step-third"
        >
          <span class="podium-crown emoji">🥉</span>
          <span class="podium-player-name">{{ podiumWinners[2].username }}</span>
          <span class="podium-elo">{{ podiumWinners[2].elo }} LP</span>
          <div class="pedestal pedestal-third">
            <span class="pedestal-num">3</span>
          </div>
        </div>
      </div>

      <!-- REST OF TOP 10 -->
      <div
        v-if="podiumWinners.length > 3"
        class="podium-rest-list"
      >
        <div
          v-for="winner in podiumWinners.slice(3)"
          :key="winner.user_id"
          class="podium-rest-item"
        >
          <span class="rest-rank">#{{ winner.rank }}</span>
          <span class="rest-name">{{ winner.username }}</span>
          <span class="rest-tier">{{ winner.tier }}</span>
          <span class="rest-elo">{{ winner.elo }} LP</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.podium-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.podium-empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 30px 16px;
  background: Rgba(15, 23, 42, 0.6);
  border: 1px dashed Rgba(251, 191, 36, 0.3);
  border-radius: 12px;
  gap: 8px;

  .podium-empty-icon { font-size: 32px; }
  .podium-empty-title { font-family: var(--font-pixel); font-size: 10px; color: #fbbf24; margin: 0; }
  .podium-empty-desc { font-family: var(--font-ui); font-size: 9px; color: #94a3b8; max-width: 320px; line-height: 1.4; }
}

.podium-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.podium-steps-container {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  padding: 10px 0;
}

.podium-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 90px;

  .podium-crown { font-size: 18px; }
  .podium-player-name { font-family: var(--font-pixel); font-size: 8px; color: #f8fafc; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .podium-elo { font-family: var(--font-ui); font-size: 8px; color: #fbbf24; font-weight: bold; }

  .pedestal {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px 6px 0 0;
    .pedestal-num { font-family: var(--font-pixel); font-size: 16px; font-weight: bold; color: Rgba(255, 255, 255, 0.8); }
  }

  &.step-first .pedestal { height: 70px; background: linear-gradient(180deg, #f59e0b, #78350f); border: 1px solid #fbbf24; }
  &.step-second .pedestal { height: 50px; background: linear-gradient(180deg, #94a3b8, #334155); border: 1px solid #cbd5e1; }
  &.step-third .pedestal { height: 35px; background: linear-gradient(180deg, #d97706, #451a03); border: 1px solid #b45309; }
}

.podium-rest-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.podium-rest-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  font-size: 9px;

  .rest-rank { font-family: var(--font-pixel); color: #64748b; width: 24px; }
  .rest-name { font-family: var(--font-pixel); color: #f8fafc; flex: 1; }
  .rest-tier { color: #94a3b8; margin-right: 10px; }
  .rest-elo { color: #f59e0b; font-weight: bold; }
}

.loader {
  text-align: center;
  padding: 30px;
  color: #94a3b8;
  font-size: 10px;

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid Rgba(255, 255, 255, 0.1);
    border-top-color: #fbbf24;
    border-radius: 50%;
    margin: 0 auto 10px;
  }
}
</style>
