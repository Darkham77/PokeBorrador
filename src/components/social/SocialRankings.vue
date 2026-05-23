<script setup lang="ts">
import { onMounted } from 'vue'
import { useSocialStore } from '@/stores/social.js'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

const socialStore = useSocialStore()

onMounted(() => {
  socialStore.fetchLeaderboard()
})

const getFactionColor = (faction: string | undefined | null) => {
  if (!faction || faction === 'null' || faction === 'NULL' || faction === 'undefined' || faction.trim() === '') return 'rgba(156, 163, 175, 1)'
  const colors: Record<string, string> = {
    'union': 'rgba(59, 130, 246, 1)',
    'poder': 'rgba(239, 68, 68, 1)',
    'rocket': 'rgba(148, 163, 184, 1)',
    'magma': 'rgba(239, 68, 68, 1)',
    'aqua': 'rgba(59, 130, 246, 1)',
    'galactic': 'rgba(167, 139, 250, 1)'
  }
  return colors[faction?.toLowerCase()] || 'rgba(156, 163, 175, 1)'
}

const getFactionLabel = (faction: string | undefined | null) => {
  if (!faction || faction === 'null' || faction === 'NULL' || faction === 'undefined' || faction.trim() === '') return ''
  const labels: Record<string, string> = {
    'union': 'Unión',
    'poder': 'Poder',
    'rocket': 'Rocket',
    'magma': 'Magma',
    'aqua': 'Aqua',
    'galactic': 'Galactic'
  }
  return labels[faction?.toLowerCase()] || faction
}

const isFactionValid = (faction: string | undefined | null) => {
  return !!(faction && faction !== 'null' && faction !== 'NULL' && faction !== 'undefined' && faction.trim() !== '' && faction.toLowerCase() !== 'none')
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
          :class="`rank-${Number(index) + 1}`"
        >
          <div class="rank-number">
            {{ Number(index) + 1 }}
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
              v-gsap-nick="player.nick_style || 'normal'"
              class="player-name"
              :class="player.nick_style || 'normal'"
            >
              {{ player.username }}
              <span 
                v-if="isFactionValid(player.faction)" 
                class="faction-tag" 
                :style="{ backgroundColor: getFactionColor(player.faction) }"
              >
                {{ getFactionLabel(player.faction) }}
              </span>
            </div>
            <div class="player-meta">
              <span class="m-badge-level">Nv. {{ player.level }}</span> · {{ player.elo }} ELO
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
@use "@/styles/core/_mixins" as *;
.rankings-container {
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.season-info {
  background: Linear-Gradient(135deg, Rgba(251, 191, 36, 0.1), Rgba(0, 0, 0, 0.4));
  border: 1px solid Rgba(251, 191, 36, 0.3);
  border-radius: 14px;
  padding: 15px;
  box-shadow: 0 4px 15px Rgba(0, 0, 0, 0.3);

  .season-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    
    .season-icon { font-size: 20px; }
    .season-name {
      @include pixelated;
      font-size: 8px;
      color: Rgba(251, 191, 36, 1);
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
        color: Rgba(136, 136, 136, 1);
        text-transform: uppercase;
      }
      .rule-val {
        font-size: 11px;
        color: var(--white);
        font-weight: bold;

        &.shiny {
          color: Rgba(244, 114, 174, 1);
          text-shadow: 0 0 5px Rgba(244, 114, 174, 0.5);
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
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 15px;
  transition: all 0.2s;

  &:hover {
    background: Rgba(255, 255, 255, 0.05);
    transform: Scale(1.01);
  }

  &.rank-1 { background: Linear-Gradient(90deg, Rgba(251, 191, 36, 0.15), Rgba(0,0,0,0)); border-color: Rgba(251, 191, 36, 0.4); }
  &.rank-2 { background: Linear-Gradient(90deg, Rgba(148, 163, 184, 0.15), Rgba(0,0,0,0)); border-color: Rgba(148, 163, 184, 0.4); }
  &.rank-3 { background: Linear-Gradient(90deg, Rgba(180, 83, 9, 0.15), Rgba(0,0,0,0)); border-color: Rgba(180, 83, 9, 0.4); }
}

.rank-number {
  @include pixelated;
  font-size: 10px;
  width: 24px;
  color: Rgba(102, 102, 102, 1);
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
    background: Rgba(16, 185, 129, 1);
    border-radius: 50%;
    border: 1px solid Rgba(16, 24, 34, 1);
  }
}

.rank-info {
  flex: 1;
  min-width: 0;

  .player-name {
    font-size: 13px;
    font-weight: bold;
    color: var(--white);
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 8px;

    .faction-tag {
      font-size: 7px;
      padding: 1px 4px;
      border-radius: 4px;
      text-transform: uppercase;
      @include pixelated;
      color: white;
    }
  }

  .player-meta {
    font-size: 10px;
    color: Rgba(136, 136, 136, 1);
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
  color: Rgba(136, 136, 136, 1);
  font-size: 12px;

  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid Rgba(255, 255, 255, 0.1);
    border-top-color: Rgba(251, 191, 36, 1);
    border-radius: 50%;
    margin: 0 auto 15px;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  to { transform: Rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: Rgba(136, 136, 136, 1);
  font-size: 12px;
}
</style>
