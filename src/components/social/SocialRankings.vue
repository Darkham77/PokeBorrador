<script setup>
import { onMounted } from 'vue'
import { useSocialStore } from '@/stores/social.js'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

const socialStore = useSocialStore()

onMounted(() => {
  socialStore.fetchLeaderboard()
})

const getFactionColor = (faction) => {
  const colors = {
    'magma': '#ef4444',
    'aqua': '#3b82f6',
    'galactic': '#a78bfa'
  }
  return colors[faction?.toLowerCase()] || '#9ca3af'
}
</script>

<template>
  <div class="rankings-container">
    <!-- Season Info Panel (QoL) -->
    <div class="season-info">
      <div class="season-header">
        <span class="season-icon">🏆</span>
        <span class="season-name">TEMPORADA: RENACER DE KANTO</span>
      </div>
      <div class="season-rules">
        <div class="rule-item">
          <span class="rule-label">Nivel Máx:</span>
          <span class="rule-val">100</span>
        </div>
        <div class="rule-item">
          <span class="rule-label">Modo:</span>
          <span class="rule-val">6 vs 6 (Single)</span>
        </div>
        <div class="rule-item">
          <span class="rule-label">Recompensa:</span>
          <span class="rule-val shiny">✨ Mewtwo Armored</span>
        </div>
      </div>
    </div>

    <!-- Leaderboard -->
    <div class="leaderboard">
      <div 
        v-if="socialStore.leaderboardLoading" 
        class="loader"
      >
        <div class="spinner" />
        <p>Consultando el Salón Global...</p>
      </div>

      <div 
        v-else-if="socialStore.leaderboard.length === 0" 
        class="empty-state"
      >
        No hay datos disponibles en el Salón Global aún.
      </div>

      <template v-else>
        <div
          v-for="(player, index) in socialStore.leaderboard"
          :key="player.id"
          class="rank-card"
          :class="`rank-${index + 1}`"
        >
          <div class="rank-number">
            {{ index + 1 }}
          </div>
          
          <div class="rank-avatar">
            <TrainerAvatar 
              :player-class="player.playerClass" 
              :level="player.level" 
              :size="36" 
            />
            <div
              v-if="player.isOnline"
              class="online-dot"
            />
          </div>

          <div class="rank-info">
            <div
              class="player-name"
              :class="player.nick_style"
            >
              {{ player.username }}
              <span 
                v-if="player.faction" 
                class="faction-tag" 
                :style="{ backgroundColor: getFactionColor(player.faction) }"
              >
                {{ player.faction }}
              </span>
            </div>
            <div class="player-meta">
              Nv. {{ player.level }} · {{ player.elo }} ELO
            </div>
          </div>

          <div class="rank-medal">
            <span v-if="index === 0">🥇</span>
            <span v-else-if="index === 1">🥈</span>
            <span v-else-if="index === 2">🥉</span>
            <span 
              v-else 
              class="generic-medal"
            >🛡️</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.rankings-container {
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.season-info {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(0, 0, 0, 0.4));
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 14px;
  padding: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);

  .season-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    
    .season-icon { font-size: 20px; }
    .season-name {
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      color: #fbbf24;
      letter-spacing: 1px;
    }
  }

  .season-rules {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;

    .rule-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .rule-label {
        font-size: 9px;
        color: #888;
        text-transform: uppercase;
      }
      .rule-val {
        font-size: 11px;
        color: #fff;
        font-weight: bold;

        &.shiny {
          color: #f472ae;
          text-shadow: 0 0 5px rgba(244, 114, 174, 0.5);
        }
      }
    }
  }
}

.leaderboard {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 15px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: Scale(1.01);
  }

  &.rank-1 { background: linear-gradient(90deg, rgba(251, 191, 36, 0.15), rgba(0,0,0,0)); border-color: rgba(251, 191, 36, 0.4); }
  &.rank-2 { background: linear-gradient(90deg, rgba(148, 163, 184, 0.15), rgba(0,0,0,0)); border-color: rgba(148, 163, 184, 0.4); }
  &.rank-3 { background: linear-gradient(90deg, rgba(180, 83, 9, 0.15), rgba(0,0,0,0)); border-color: rgba(180, 83, 9, 0.4); }
}

.rank-number {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  width: 24px;
  color: #666;
}

.rank-avatar {
  position: relative;
  flex-shrink: 0;

  .online-dot {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    border: 1px solid #1a1a1a;
  }
}

.rank-info {
  flex: 1;
  min-width: 0;

  .player-name {
    font-size: 13px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 8px;

    .faction-tag {
      font-size: 7px;
      padding: 1px 4px;
      border-radius: 4px;
      text-transform: uppercase;
      font-family: 'Press Start 2P', monospace;
      color: white;
    }
  }

  .player-meta {
    font-size: 10px;
    color: #888;
  }
}

.rank-medal {
  font-size: 18px;
  .generic-medal {
    font-size: 12px;
    opacity: 0.3;
  }
}

.loader {
  text-align: center;
  padding: 40px;
  color: #888;
  font-size: 12px;

  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: #fbbf24;
    border-radius: 50%;
    margin: 0 auto 15px;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #888;
  font-size: 12px;
}
</style>
