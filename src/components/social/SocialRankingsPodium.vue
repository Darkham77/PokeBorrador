<script setup lang="ts">
import { computed } from 'vue';
import type { RankedPodiumWinner } from '@/types/battle/pvp';

const props = defineProps<{
  podiumWinners: RankedPodiumWinner[];
  loading?: boolean;
}>();

const PODIUM_PODESTAL_CAPACITY = 3;

const hasExtendedWinners = computed(() => props.podiumWinners.length > PODIUM_PODESTAL_CAPACITY);
const extendedWinners = computed(() => props.podiumWinners.slice(PODIUM_PODESTAL_CAPACITY));
</script>

<template>
  <div class="podium-container">
    <div v-if="loading" class="loader">
      <div v-gsap-loop="'spin'" class="spinner" />
      <p>Cargando Salón de la Fama...</p>
    </div>

    <div v-else-if="podiumWinners.length === 0" class="podium-empty-card">
      <span class="podium-empty-icon emoji">👑</span>
      <h4 class="podium-empty-title">SALÓN DE LA FAMA EN DISPUTA</h4>
      <p class="podium-empty-desc">
        La temporada actual sigue en curso. Al finalizar el mes, los mejores 10 entrenadores del
        ranking global serán inmortalizados en este podio histórico.
      </p>
    </div>

    <div v-else class="podium-display">
      <div class="podium-steps-container">
        <!-- 2ND PLACE -->
        <div v-if="podiumWinners[1]" class="podium-step step-second">
          <span class="podium-crown emoji">🥈</span>
          <span class="podium-player-name">{{ podiumWinners[1].username }}</span>
          <span class="podium-elo">{{ podiumWinners[1].elo }} LP</span>
          <div class="pedestal pedestal-second">
            <span class="pedestal-num">2</span>
          </div>
        </div>

        <!-- 1ST PLACE -->
        <div v-if="podiumWinners[0]" class="podium-step step-first">
          <span class="podium-crown emoji">👑</span>
          <span class="podium-player-name">{{ podiumWinners[0].username }}</span>
          <span class="podium-elo">{{ podiumWinners[0].elo }} LP</span>
          <div class="pedestal pedestal-first">
            <span class="pedestal-num">1</span>
          </div>
        </div>

        <!-- 3RD PLACE -->
        <div v-if="podiumWinners[2]" class="podium-step step-third">
          <span class="podium-crown emoji">🥉</span>
          <span class="podium-player-name">{{ podiumWinners[2].username }}</span>
          <span class="podium-elo">{{ podiumWinners[2].elo }} LP</span>
          <div class="pedestal pedestal-third">
            <span class="pedestal-num">3</span>
          </div>
        </div>
      </div>

      <!-- REST OF TOP 10 -->
      <div v-if="hasExtendedWinners" class="podium-rest-list">
        <div v-for="winner in extendedWinners" :key="winner.user_id" class="podium-rest-item">
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
  gap: $spacing-md-lg;
}

.podium-empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: 30px 16px;
  border: 1px dashed Rgb(251 191 36 / 30%);
  border-radius: $radius-xl;
  background: Rgb(15 23 42 / 60%);
  text-align: center;

  .podium-empty-icon {
    font-size: var(--font-32);
  }
  .podium-empty-title {
    margin: 0;
    color: var(--amber);
    font-family: var(--font-pixel);
    font-size: var(--font-10);
  }
  .podium-empty-desc {
    max-width: 320px;
    color: var(--slate-400);
    font-family: var(--font-ui);
    font-size: var(--font-9);
    line-height: 1.4;
  }
}

.podium-display {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.podium-steps-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: $spacing-sm;
  padding: 10px 0;
}

.podium-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;
  width: 90px;

  .podium-crown {
    font-size: var(--font-18);
  }
  .podium-player-name {
    max-width: 100%;
    color: var(--slate-50);
    font-family: var(--font-pixel);
    font-size: var(--font-8);
    line-height: 1.45;
    text-align: center;
    padding-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .podium-elo {
    color: var(--amber);
    font-family: var(--font-ui);
    font-size: var(--font-8);
    font-weight: bold;
  }

  .pedestal {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    border-radius: $radius-md $radius-md 0 0;
    .pedestal-num {
      color: Rgb(255 255 255 / 80%);
      font-family: var(--font-pixel);
      font-size: var(--font-16);
      font-weight: bold;
    }
  }

  &.step-first .pedestal {
    height: 70px;
    border: 1px solid var(--amber);
    background: Linear-Gradient(180deg, var(--amber-dark), var(--amber-dark));
  }
  &.step-second .pedestal {
    height: 50px;
    border: 1px solid var(--slate-300);
    background: Linear-Gradient(180deg, var(--slate-400), var(--slate-700));
  }
  &.step-third .pedestal {
    height: 35px;
    border: 1px solid var(--amber-dark);
    background: Linear-Gradient(180deg, var(--amber-dark), var(--darker));
  }
}

.podium-rest-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.podium-rest-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  border: 1px solid Rgb(255 255 255 / 6%);
  border-radius: $radius-md;
  background: Rgb(255 255 255 / 2%);
  font-size: var(--font-9);

  .rest-rank {
    width: 24px;
    color: var(--slate-500);
    font-family: var(--font-pixel);
  }
  .rest-name {
    color: var(--slate-50);
    font-family: var(--font-pixel);
    flex: 1;
  }
  .rest-tier {
    color: var(--slate-400);
    margin-right: 10px;
  }
  .rest-elo {
    color: var(--amber-dark);
    font-weight: bold;
  }
}

.loader {
  padding: 30px;
  color: var(--slate-400);
  font-size: var(--font-10);
  text-align: center;

  .spinner {
    width: 24px;
    height: 24px;
    margin: 0 auto 10px;
    border: 2px solid Rgb(255 255 255 / 10%);
    border-radius: 50%;
    border-top-color: var(--amber);
  }
}
</style>
