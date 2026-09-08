<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import BaseRefreshButton from '@/components/common/BaseRefreshButton.vue'
import { useSocialStore } from '@/stores/social/social'
import { useUIStore } from '@/stores/ui'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import { getEloTier } from '@/logic/pvp/rankedEngine'
import { resolveFactionColor, resolveFactionLabel } from '@/components/modals/trainerProfileResolver'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const RANK_CARD_HOVER_X_OFFSET = 4
const RANK_ANIM_FAST_DURATION_SEC = 0.2

const socialStore = useSocialStore()
const uiStore = useUIStore()

const activeSort = ref<'elo_rating' | 'trainer_level' | 'badges'>('elo_rating')
const listRef = ref<HTMLElement | null>(null)

const loadLeaderboard = async () => {
  await socialStore.fetchLeaderboard(activeSort.value)
  nextTick(() => {
    animateList()
  })
}

const animateList = () => {
  if (!listRef.value) return
  const cards = listRef.value.querySelectorAll('.rank-card')
  if (cards.length === 0) return

  gsap.fromTo(
    cards,
    { opacity: 0, x: -12, scale: 0.98 },
    {
      opacity: 1,
      x: 0,
      scale: 1,
      duration: 0.35,
      stagger: 0.04,
      ease: 'power2.out',
      clearProps: 'transform,opacity'
    }
  )
}

const openTrainerProfile = (userId: string) => {
  uiStore.open('TrainerProfile', { userId })
}

const getFactionColor = (faction: string) => {
  return resolveFactionColor(faction)
}

const getFactionLabel = (faction: string) => {
  const clean = faction?.trim().toLowerCase() || ''
  if (clean === 'poder') return 'PODER'
  if (clean === 'union') return 'UNIÓN'
  if (clean === 'rocket') return 'ROCKET'
  return resolveFactionLabel(faction).toUpperCase()
}

const handleCardEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  gsap.to(el, {
    x: RANK_CARD_HOVER_X_OFFSET,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
    duration: RANK_ANIM_FAST_DURATION_SEC,
    ease: 'power2.out'
  })
}

const handleCardLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  let baseBorderColor = 'rgba(255, 255, 255, 0.05)'
  let baseBackground = 'rgba(255, 255, 255, 0.02)'
  
  if (el.classList.contains('rank-1')) {
    baseBorderColor = 'rgba(251, 191, 36, 0.35)'
    baseBackground = 'linear-gradient(90deg, rgba(251, 191, 36, 0.1), rgba(0, 0, 0, 0))'
  } else if (el.classList.contains('rank-2')) {
    baseBorderColor = 'rgba(148, 163, 184, 0.35)'
    baseBackground = 'linear-gradient(90deg, rgba(148, 163, 184, 0.1), rgba(0, 0, 0, 0))'
  } else if (el.classList.contains('rank-3')) {
    baseBorderColor = 'rgba(180, 83, 9, 0.35)'
    baseBackground = 'linear-gradient(90deg, rgba(180, 83, 9, 0.1), rgba(0, 0, 0, 0))'
  }

  gsap.to(el, {
    x: 0,
    background: baseBackground,
    borderColor: baseBorderColor,
    duration: RANK_ANIM_FAST_DURATION_SEC,
    ease: 'power2.out',
    clearProps: 'x,background,borderColor'
  })
}

const handleTabEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  if (el.classList.contains('active')) return
  gsap.to(el, {
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    duration: RANK_ANIM_FAST_DURATION_SEC,
    ease: 'power2.out'
  })
}

const handleTabLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  if (el.classList.contains('active')) return
  gsap.to(el, {
    color: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'transparent',
    duration: RANK_ANIM_FAST_DURATION_SEC,
    ease: 'power2.out',
    clearProps: 'color,backgroundColor'
  })
}

onMounted(() => {
  loadLeaderboard()
})

watch(activeSort, () => {
  loadLeaderboard()
})

</script>

<template>
  <section class="arena-leaderboard-section">
    <!-- Header Row -->
    <div class="leaderboard-header-row">
      <div class="header-title-wrap">
        <h3 class="section-title text-outline">
          <span class="emoji">🏆</span> SALÓN DE LA FAMA
        </h3>
        <span class="sub-title">Top 100 entrenadores globales</span>
      </div>

      <BaseRefreshButton
        id="arena-leaderboard-refresh-btn"
        size="md"
        :loading="socialStore.leaderboardLoading"
        title="Actualizar ranking"
        @click="loadLeaderboard"
      />
    </div>

    <!-- Sorting Controls -->
    <div class="sorting-controls">
      <button
        id="arena-leaderboard-sort-elo-btn"
        class="modal-tab-btn sort-tab text-outline"
        :class="{ active: activeSort === 'elo_rating' }"
        @click.stop="activeSort = 'elo_rating'"
        @mouseenter="handleTabEnter"
        @mouseleave="handleTabLeave"
      >
        ELO
      </button>
      <button
        id="arena-leaderboard-sort-level-btn"
        class="modal-tab-btn sort-tab text-outline"
        :class="{ active: activeSort === 'trainer_level' }"
        @click.stop="activeSort = 'trainer_level'"
        @mouseenter="handleTabEnter"
        @mouseleave="handleTabLeave"
      >
        Nivel
      </button>
      <button
        id="arena-leaderboard-sort-badges-btn"
        class="modal-tab-btn sort-tab text-outline"
        :class="{ active: activeSort === 'badges' }"
        @click.stop="activeSort = 'badges'"
        @mouseenter="handleTabEnter"
        @mouseleave="handleTabLeave"
      >
        Medallas
      </button>
    </div>

    <!-- Leaderboard Container -->
    <div class="leaderboard-container">
      <div
        v-if="socialStore.leaderboardLoading"
        class="loading-view"
      >
        <div class="retro-spinner" />
        <p>Consultando el Salón de la Fama...</p>
      </div>

      <div
        v-else-if="socialStore.leaderboard.length === 0"
        class="empty-view"
      >
        No hay datos de entrenadores disponibles.
      </div>

      <div
        v-else
        ref="listRef"
        class="leaderboard-list"
      >
        <div
          v-for="(player, index) in socialStore.leaderboard"
          :id="`arena-leaderboard-card-${player.id}`"
          :key="player.id"
          class="rank-card"
          :class="`rank-${index + 1}`"
          @click.stop="openTrainerProfile(player.id)"
          @mouseenter="handleCardEnter"
          @mouseleave="handleCardLeave"
        >
          <!-- Rank Placement & Tier Medal Sprite -->
          <div class="rank-badge">
            <span
              v-if="index === 0"
              class="emoji crown"
            >🥇</span>
            <span
              v-else-if="index === 1"
              class="emoji crown"
            >🥈</span>
            <span
              v-else-if="index === 2"
              class="emoji crown"
            >🥉</span>
            <span
              v-else
              class="rank-digits text-outline"
            >
              {{ index + 1 }}
            </span>
            <img
              :src="getAssetUrl(ASSET_TYPES.RANK, getEloTier(player.elo).id)"
              :alt="getEloTier(player.elo).name"
              class="ranked-medal-mini pixel-art"
              :title="`Rango: ${getEloTier(player.elo).name}`"
            >
          </div>

          <!-- Avatar -->
          <div class="avatar-container">
            <TrainerAvatar
              :profile="player"
              :size="36"
            >
              <template #overlay>
                <div
                  class="status-dot"
                  :class="{ online: player.isOnline }"
                />
              </template>
            </TrainerAvatar>
          </div>

          <!-- Player Details -->
          <div class="player-details">
            <div class="player-name-row">
              <span
                v-gsap-nick="player.nick_style || 'normal'"
                class="player-name-text text-outline"
                :class="player.nick_style || 'normal'"
              >
                {{ player.username }}
              </span>
              <span
                v-if="player.faction && player.faction !== 'null' && player.faction !== 'NULL' && player.faction !== 'undefined' && player.faction.trim() !== ''"
                class="faction-tag-badge text-outline"
                :style="{ backgroundColor: getFactionColor(player.faction) }"
              >
                {{ getFactionLabel(player.faction) }}
              </span>
            </div>
            <div class="player-stats-row">
              <span class="player-class-info">{{ (player.playerClass && player.playerClass !== 'null' && player.playerClass !== 'Null' && player.playerClass !== 'NULL') ? player.playerClass : 'Entrenador' }}</span>
              <span class="divider">•</span>
              <span class="player-level-info">Nv. {{ player.level }}</span>
            </div>
          </div>

          <!-- Score -->
          <div class="score-badge">
            <span class="score-value text-outline">
              {{ activeSort === 'elo_rating' ? `${player.elo} ELO` : (activeSort === 'trainer_level' ? `Nv. ${player.level}` : `${player.badges} Medallas`) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.arena-leaderboard-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.leaderboard-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.08);

  .header-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .section-title {
      margin: 0;
      font-size: 13px;
      font-weight: 900;
      color: var(--yellow, #fbbf24);
      display: flex;
      align-items: center;
      gap: 6px;
      letter-spacing: 0.5px;
      @include pixelated;

      .emoji {
        font-size: 14px;
        line-height: 1;
      }
    }

    .sub-title {
      font-size: 8px;
      color: #94a3b8;
      @include pixelated;
      letter-spacing: 0.5px;
    }
  }
}

.sorting-controls {
  display: flex;
  background: Rgba(0, 0, 0, 0.35);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 3px;
  gap: 4px;

  .modal-tab-btn.sort-tab {
    flex: 1;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 8px;
    padding: 6px 0;
    border-radius: 6px;
    cursor: pointer;
    text-align: center;
    @include pixelated;
    letter-spacing: 0.5px;

    &.active {
      background: var(--yellow, #fbbf24);
      color: #000;
      font-weight: bold;
      box-shadow: 0 0 10px Rgba(251, 191, 36, 0.3);
    }
  }
}

.leaderboard-container {
  min-height: 150px;
}

.loading-view,
.empty-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 0;
  color: #94a3b8;
  font-size: 9px;
  @include pixelated;
}

.retro-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid Rgba(251, 191, 36, 0.2);
  border-top-color: var(--yellow, #fbbf24);
  border-radius: 50%;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  will-change: transform, background-color, border-color;

  &.rank-1 {
    background: linear-gradient(90deg, Rgba(251, 191, 36, 0.1), Rgba(0, 0, 0, 0));
    border-color: Rgba(251, 191, 36, 0.35);
  }
  &.rank-2 {
    background: linear-gradient(90deg, Rgba(148, 163, 184, 0.1), Rgba(0, 0, 0, 0));
    border-color: Rgba(148, 163, 184, 0.35);
  }
  &.rank-3 {
    background: linear-gradient(90deg, Rgba(180, 83, 9, 0.1), Rgba(0, 0, 0, 0));
    border-color: Rgba(180, 83, 9, 0.35);
  }
}

.rank-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  .crown {
    font-size: 14px;
    min-width: 18px;
    text-align: center;
  }

  .rank-digits {
    @include pixelated;
    font-size: 9px;
    font-weight: bold;
    color: #94a3b8;
    min-width: 18px;
    text-align: center;

    &.top-1 {
      color: #fbbf24;
    }
    &.top-2 {
      color: #cbd5e1;
    }
    &.top-3 {
      color: #f59e0b;
    }
  }

  .ranked-medal-mini {
    width: 26px;
    height: 26px;
    object-fit: contain;
    @include pixelated;
    filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.3));
    flex-shrink: 0;
  }
}

.avatar-container {
  position: relative;
  flex-shrink: 0;

  .status-dot {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #64748b;
    border: 1.5px solid #0f172a;

    &.online {
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
    }
  }
}

.player-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;

  .player-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;

    .player-name-text {
      font-size: 11px;
      font-weight: bold;
      color: var(--white);
    }

    .faction-tag-badge {
      font-size: 6px;
      padding: 1px 4px;
      border-radius: 4px;
      color: white;
      text-transform: uppercase;
      @include pixelated;
      letter-spacing: 0.5px;
      line-height: 1.25;
    }
  }

  .player-stats-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 8px;
    color: #94a3b8;

    .player-class-info {
      text-transform: capitalize;
    }

    .divider {
      color: Rgba(255, 255, 255, 0.4);
    }
  }
}

.score-badge {
  text-align: right;
  flex-shrink: 0;

  .score-value {
    @include pixelated;
    font-size: 8px;
    color: var(--yellow);
    background: Rgba(251, 191, 36, 0.08);
    border: 1px solid Rgba(251, 191, 36, 0.15);
    padding: 3px 6px;
    border-radius: 6px;
    line-height: 1.25;
  }
}
</style>
