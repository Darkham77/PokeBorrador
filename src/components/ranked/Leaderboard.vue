<script setup>
import { onMounted } from 'vue';
import { useRankedStore } from '@/stores/rankedStore';
import { useAuthStore } from '@/stores/auth';
import PlayerAvatar from '@/components/player/PlayerAvatar.vue';

const rankedStore = useRankedStore();
const authStore = useAuthStore();

onMounted(() => {
  rankedStore.fetchLeaderboard();
});

const formatRank = (index) => `#${index + 1}`;
</script>

<template>
  <div class="leaderboard-container">
    <div class="leaderboard-header">
      <h2 class="press-start">
        RANKING GLOBAL
      </h2>
      <button 
        class="refresh-btn" 
        :disabled="rankedStore.isLoading"
        @click="rankedStore.fetchLeaderboard(true)"
      >
        {{ rankedStore.isLoading ? '...' : '🔄' }}
      </button>
    </div>

    <div
      v-if="rankedStore.error"
      class="error-msg"
    >
      {{ rankedStore.error }}
    </div>

    <div class="leaderboard-list custom-scrollbar">
      <div 
        v-for="(row, index) in rankedStore.leaderboard" 
        :key="row.id"
        class="leaderboard-row"
        :class="{ 'is-me': row.id === authStore.user?.id }"
      >
        <div class="rank">
          {{ formatRank(index) }}
        </div>
        
        <div class="trainer-info">
          <PlayerAvatar 
            :player-class="row.player_class" 
            :level="row.trainer_level"
            :size="32"
          />
          <div class="name-group">
            <span
              class="trainer-name"
              :class="row.nick_style"
            >{{ row.username }}</span>
            <span class="trainer-level">Nv. {{ row.trainer_level }}</span>
          </div>
        </div>

        <div
          class="tier-info"
          :style="{ color: rankedStore.currentTier(row.elo_rating).color }"
        >
          <span class="tier-icon">{{ rankedStore.currentTier(row.elo_rating).icon }}</span>
          <span class="tier-name">{{ rankedStore.currentTier(row.elo_rating).name }}</span>
        </div>

        <div class="elo-val press-start">
          {{ row.elo_rating }}
        </div>
      </div>

      <div
        v-if="rankedStore.leaderboard.length === 0 && !rankedStore.isLoading"
        class="empty-msg"
      >
        Aún no hay datos de ranking global.
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.leaderboard-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h2 {
    font-size: 10px;
    color: var(--yellow);
    margin: 0;
  }
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 4px;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 40px 1fr 100px 60px;
  align-items: center;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: transform 0.2s;

  &.is-me {
    background: rgba(107, 203, 119, 0.08);
    border-color: rgba(107, 203, 119, 0.4);
    box-shadow: 0 0 15px rgba(107, 203, 119, 0.1);
  }

  &:hover {
    transform: translateX(4px);
    background: rgba(255, 255, 255, 0.05);
  }
}

.rank {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--yellow);
}

.trainer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.name-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.trainer-name {
  font-size: 12px;
  font-weight: bold;
  color: #fff;
}

.trainer-level {
  font-size: 9px;
  color: var(--gray);
}

.tier-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: bold;
}

.tier-icon {
  font-size: 12px;
}

.elo-val {
  font-size: 9px;
  color: #fff;
  text-align: right;
}

.empty-msg, .error-msg {
  padding: 20px;
  text-align: center;
  font-size: 11px;
  color: var(--gray);
}

.error-msg {
  color: var(--red);
  background: rgba(255, 59, 59, 0.05);
  border-radius: 8px;
}

.press-start {
  font-family: 'Press Start 2P', monospace;
}
</style>
