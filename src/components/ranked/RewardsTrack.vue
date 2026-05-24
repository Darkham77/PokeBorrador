<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { usePvPStore, RANKED_REWARD_MILESTONES, RANKED_REWARD_TIER_MARKS } from '@/stores/pvp';
import { useUIStore } from '@/stores/ui';

const gameStore = useGameStore();
const rankedStore = usePvPStore();
const uiStore = useUIStore();
 
interface Milestone {
  id: string;
  tier: string;
  elo: number;
  rewards: Record<string, number>;
  icon: string;
}
 
const MIN_ELO = 1000;
const MAX_ELO = 3400;
 
const milestones = RANKED_REWARD_MILESTONES as unknown as Milestone[];
 
const maxElo = computed(() => {
  const val = Number(gameStore.state.rankedMaxElo);
  return isNaN(val) ? MIN_ELO : Math.max(MIN_ELO, val);
});
 
const currentElo = computed(() => Number(gameStore.state.eloRating || MIN_ELO));
 
const progressPct = computed(() => {
  const span = MAX_ELO - MIN_ELO;
  return ((maxElo.value - MIN_ELO) / span) * 100;
});
 
const getProgressPos = (elo: number) => {
  const span = MAX_ELO - MIN_ELO;
  return ((elo - MIN_ELO) / span) * 100;
};
 
const isClaimed = (id: string) => {
  return gameStore.state.rankedRewardsClaimed?.includes(id) || false;
};
 
const canClaim = (milestone: Milestone) => {
  return maxElo.value >= milestone.elo && !isClaimed(milestone.id);
};
 
const claimReward = async (milestone: Milestone) => {
  if (!canClaim(milestone)) return;
  
  if (!gameStore.state.rankedRewardsClaimed) {
    gameStore.state.rankedRewardsClaimed = [];
  }
  
  gameStore.state.rankedRewardsClaimed.push(milestone.id);
  
  Object.entries(milestone.rewards).forEach(([item, qty]) => {
    gameStore.state.inventory[item] = (gameStore.state.inventory[item] || 0) + qty;
  });
 
  uiStore.notify(`¡Recompensas de ELO ${milestone.elo} reclamadas!`, '🎁');
  gameStore.save();
};
</script>

<template>
  <div class="rewards-track">
    <div class="header">
      <div class="title-group">
        <h3 class="press-start">
          PROGRESO DE TEMPORADA
        </h3>
        <p class="subtitle">
          Máximo ELO alcanzado: <span>{{ maxElo }}</span>
        </p>
      </div>
      <div class="elo-now press-start">
        ELO ACTUAL: {{ currentElo }}
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="progress-container">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: progressPct + '%' }"
        />
        
        <!-- Tier Markers -->
        <div 
          v-for="mark in RANKED_REWARD_TIER_MARKS" 
          :key="mark.name"
          class="tier-marker"
          :style="{ left: getProgressPos(mark.elo) + '%' }"
        >
          <div
            class="marker-dot"
            :style="{ borderColor: mark.color, boxShadow: `0 0 10px ${mark.color}66` }"
          />
        </div>
      </div>
    </div>

    <!-- Milestone Cards -->
    <div class="milestones-scroll custom-scrollbar">
      <div 
        v-for="m in milestones" 
        :key="m.id"
        class="milestone-card"
        :class="{ 
          'unlocked': maxElo >= m.elo, 
          'claimed': isClaimed(m.id),
          'locked': maxElo < m.elo 
        }"
      >
        <div class="card-header">
          <span
            class="tier"
            :style="{ color: rankedStore.currentTier(m.elo).color }"
          >
            {{ rankedStore.currentTier(m.elo).icon }} {{ m.tier }}
          </span>
          <span class="elo-req press-start">ELO {{ m.elo }}</span>
        </div>

        <div class="reward-list">
          <div
            v-for="(qty, item) in m.rewards"
            :key="item"
            class="reward-item"
          >
            🎁 {{ item }} x{{ qty }}
          </div>
        </div>

        <button 
          v-if="!isClaimed(m.id)"
          class="claim-btn press-start"
          :disabled="!canClaim(m)"
          @click.stop="claimReward(m)"
        >
          {{ maxElo >= m.elo ? 'RECLAMAR' : 'BLOQUEADO' }}
        </button>
        <div
          v-else
          class="claimed-status press-start"
        >
          RECLAMADO
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:string";
.rewards-track {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

.press-start {
  @include pixelated;
  font-size: 8px;
}

h3 {
  color: var(--yellow);
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 11px;
  color: var(--gray);
  margin: 0;

  span {
    color: var(--white);
    font-weight: bold;
  }
}

.elo-now {
  color: Rgba(148, 163, 184, 1);
  background: Rgba(255, 255, 255, 0.05);
  padding: 6px 12px;
  border-radius: 8px;
}

.progress-container {
  padding: 10px 0;
}

.progress-bar {
  position: relative;
  height: 8px;
  background: Rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
}

.progress-fill {
  height: 100%;
  background: Linear-Gradient(90deg, #c8a060, #9E9E9E, #FFB800, #E5C100, #89CFF0, $coin-gold);
  border-radius: 999px;
  
}

.tier-marker {
  position: absolute;
  top: 50%;
  transform: Translate(-50%, -50%);
  z-index: var(--z-base);
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid;
  background: Rgba(0, 0, 0, 1);
}

.milestones-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 4px 12px 4px;
}

.milestone-card {
  min-width: 220px;
  background: Rgba(0, 0, 0, 0.3);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  

  &.unlocked {
    border-color: Rgba(107, 203, 119, 0.3);
    background: Rgba(255, 255, 255, 0.05);
  }

  &.claimed {
    background: Rgba(107, 203, 119, 0.05);
    border-color: Rgba(107, 203, 119, 0.2);
  }

  &.locked {
    opacity: 0.8;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tier {
  font-size: 10px;
  font-weight: bold;
}

.elo-req {
  color: var(--yellow);
  font-size: 7px;
}

.reward-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reward-item {
  font-size: 11px;
  color: var(--white);
}

.claim-btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: Rgba(107, 203, 119, 0.2);
  color: var(--green);
  border: 1px solid Rgba(107, 203, 119, 0.3);
  

  &:hover:not(:disabled) {
    background: Rgba(107, 203, 119, 0.3);
    transform: Scale(1.02);
  }

  &:disabled {
    background: Rgba(255, 255, 255, 0.05);
    color: var(--gray);
    border-color: Rgba(255, 255, 255, 0.1);
    cursor: not-allowed;
  }
}

.claimed-status {
  text-align: center;
  color: var(--green);
  font-size: 8px;
  padding: 8px;
}
</style>
