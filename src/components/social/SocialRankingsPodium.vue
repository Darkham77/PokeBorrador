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
  gap: 8px;
  padding: 30px 16px;
  border: 1px dashed Rgb(251 191 36 / 30%);
  border-radius: 12px;
  background: Rgb(15 23 42 / 60%);
  text-align: center;

  .podium-empty-icon { font-size: 32px; }
  .podium-empty-title { margin: 0; color: #fbbf24; font-family: var(--font-pixel); font-size: 10px; }
  .podium-empty-desc { max-width: 320px; color: #94a3b8; font-family: var(--font-ui); font-size: 9px; line-height: 1.4; }
}

.podium-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.podium-steps-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
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
  .podium-player-name {
    max-width: 100%;
    color: #f8fafc;
    font-family: var(--font-pixel);
    font-size: 8px;
    line-height: 1.45;
    text-align: center;
    padding-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .podium-elo { color: #fbbf24; font-family: var(--font-ui); font-size: 8px; font-weight: bold; }

  .pedestal {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    border-radius: 6px 6px 0 0;
    .pedestal-num { color: Rgb(255 255 255 / 80%); font-family: var(--font-pixel); font-size: 16px; font-weight: bold; }
  }

  &.step-first .pedestal { height: 70px; border: 1px solid #fbbf24; background: Linear-Gradient(180deg, #f59e0b, #78350f); }
  &.step-second .pedestal { height: 50px; border: 1px solid #cbd5e1; background: Linear-Gradient(180deg, #94a3b8, #334155); }
  &.step-third .pedestal { height: 35px; border: 1px solid #b45309; background: Linear-Gradient(180deg, #d97706, #451a03); }
}

.podium-rest-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.podium-rest-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  border: 1px solid Rgb(255 255 255 / 6%);
  border-radius: 6px;
  background: Rgb(255 255 255 / 2%);
  font-size: 9px;

  .rest-rank { width: 24px; color: #64748b; font-family: var(--font-pixel); }
  .rest-name { color: #f8fafc; font-family: var(--font-pixel); flex: 1; }
  .rest-tier { color: #94a3b8; margin-right: 10px; }
  .rest-elo { color: #f59e0b; font-weight: bold; }
}

.loader {
  padding: 30px;
  color: #94a3b8;
  font-size: 10px;
  text-align: center;

  .spinner {
    width: 24px;
    height: 24px;
    margin: 0 auto 10px;
    border: 2px solid Rgb(255 255 255 / 10%);
    border-radius: 50%;
    border-top-color: #fbbf24;
  }
}
</style>
