<script setup lang="ts">
import { useSocialStore } from '@/stores/social';
import { useAuthStore } from '@/stores/auth';
import { usePvPStore } from '@/stores/pvp';
import PlayerAvatar from '@/components/player/PlayerAvatar.vue';
import { ref, onMounted, watch } from 'vue';

const socialStore = useSocialStore();
const authStore = useAuthStore();
const rankedStore = usePvPStore();

const activeSort = ref('elo_rating');

onMounted(() => {
  socialStore.fetchLeaderboard(activeSort.value);
});

watch(activeSort, (newVal) => {
  socialStore.fetchLeaderboard(newVal);
});

const formatRank = (index: number) => `#${index + 1}`;
</script>

<template>
  <div class="leaderboard-container">
    <div class="leaderboard-header">
      <h2 class="press-start">
        RANKING GLOBAL
      </h2>
      <div class="sort-selector">
        <button 
          v-for="opt in [
            { id: 'elo_rating', label: '🏆 ELO' },
            { id: 'trainer_level', label: '⭐ NIVEL' },
            { id: 'badges', label: '🏅 MEDALLAS' }
          ]"
          :key="opt.id"
          class="sort-btn"
          :class="{ active: activeSort === opt.id }"
          @click.stop="activeSort = opt.id"
        >
          {{ opt.label }}
        </button>
      </div>
      <button 
        class="refresh-btn" 
        :disabled="socialStore.leaderboardLoading"
        @click.stop="socialStore.fetchLeaderboard(activeSort)"
      >
        {{ socialStore.leaderboardLoading ? '...' : '🔄' }}
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
        v-for="(row, index) in socialStore.leaderboard" 
        :key="row.id"
        class="leaderboard-row"
        :class="{ 'is-me': row.id === authStore.user?.id }"
      >
        <div class="rank">
          {{ formatRank(Number(index)) }}
        </div>
        
        <div class="trainer-info">
          <PlayerAvatar 
            :player-class="row.playerClass" 
            :level="row.level"
            :size="32"
          />
          <div class="name-group">
            <span
              class="trainer-name"
              :class="row.nick_style"
            >{{ row.username }}</span>
            <span class="trainer-level m-badge-level">Nv. {{ row.level }} • {{ row.badges }} 🏅</span>
          </div>
        </div>

        <div
          v-if="activeSort === 'elo_rating'"
          class="tier-info"
          :style="{ color: rankedStore.currentTier(row.elo).color }"
        >
          <span class="tier-icon">{{ rankedStore.currentTier(row.elo).icon }}</span>
          <span class="tier-name">{{ rankedStore.currentTier(row.elo).name }}</span>
        </div>

        <div class="val-display press-start">
          {{ activeSort === 'elo_rating' ? row.elo : activeSort === 'trainer_level' ? `Nv.${row.level}` : `${row.badges}🏅` }}
        </div>
      </div>

      <div
        v-if="socialStore.leaderboard.length === 0 && !socialStore.leaderboardLoading"
        class="empty-msg"
      >
        Aún no hay datos de ranking global para esta categoría.
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/_mixins" as *;
.leaderboard-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  
  h2 {
    font-size: 10px;
    color: var(--yellow);
    margin: 0;
  }
}

.sort-selector {
  display: flex;
  gap: 4px;
  background: Rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
}

.sort-btn {
  background: transparent;
  border: none;
  border-radius: 6px;
  color: Rgba(136, 136, 136, 1);
  @include pixelated;
  font-size: 6px;
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: var(--white);
    background: Rgba(255, 255, 255, 0.05);
  }

  &.active {
    background: var(--yellow);
    color: Rgba(0, 0, 0, 1);
    box-shadow: 0 0 10px Rgba(255, 184, 0, 0.3);
  }
}

.refresh-btn {
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--white);
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: Rgba(255, 255, 255, 0.1);
    border-color: Rgba(255, 255, 255, 0.2);
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
  min-height: 0;
  padding-right: 4px;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 40px 1fr 100px 60px;
  align-items: center;
  padding: 10px;
  background: Rgba(0, 0, 0, 0.2);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: transform 0.2s;

  &.is-me {
    background: Rgba(107, 203, 119, 0.08);
    border-color: Rgba(107, 203, 119, 0.4);
    box-shadow: 0 0 15px Rgba(107, 203, 119, 0.1);
  }

  &:hover {
    transform: Translatex(4px);
    background: Rgba(255, 255, 255, 0.05);
  }
}

.rank {
  @include pixelated;
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
  color: var(--white);
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

.val-display {
  font-size: 9px;
  color: var(--white);
  text-align: right;
  white-space: nowrap;
}

.empty-msg, .error-msg {
  padding: 20px;
  text-align: center;
  font-size: 11px;
  color: var(--gray);
}

.error-msg {
  color: var(--red);
  background: Rgba(255, 59, 59, 0.05);
  border-radius: 8px;
}

.press-start {
  @include pixelated;
}
</style>
