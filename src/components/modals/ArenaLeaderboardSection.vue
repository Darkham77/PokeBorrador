<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import BaseRefreshButton from '@/components/common/BaseRefreshButton.vue'
import { useSocialStore } from '@/stores/social/social'
import { useUIStore } from '@/stores/ui'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import { getEloTier } from '@/logic/pvp/rankedEngine'
import { resolveFactionColor } from '@/components/modals/trainerProfileResolver'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useRankCardHover, RANK_ANIM_FAST_DURATION_SEC } from '@/composables/arena/useRankCardHover'
import type { RankingSortKey } from '@/types/system/game'
import {
  isValidFaction,
  resolveCleanPlayerClass,
  resolveLeaderboardRankBadge,
  resolveLeaderboardScore,
  resolveLeaderboardFactionLabel
} from './arenaLeaderboardHelper'

const socialStore = useSocialStore()
const uiStore = useUIStore()

const activeSort = ref<RankingSortKey>('elo_rating')
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

const displayPlayers = computed(() => {
  return socialStore.leaderboard.map((player, index) => {
    const rankBadge = resolveLeaderboardRankBadge(index)
    const tier = getEloTier(player.elo)
    const hasFaction = isValidFaction(player.faction)
    const scoreText = resolveLeaderboardScore(activeSort.value, player)
    return {
      ...player,
      rankBadge,
      tierName: tier.name,
      tierSpriteUrl: getAssetUrl(ASSET_TYPES.RANK, tier.id),
      hasFaction,
      factionLabel: hasFaction ? resolveLeaderboardFactionLabel(player.faction!) : '',
      factionColor: hasFaction ? resolveFactionColor(player.faction!) : '',
      playerClassText: resolveCleanPlayerClass(player.playerClass),
      scoreText
    }
  })
})

const { handleCardEnter, handleCardLeave } = useRankCardHover()

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
          v-for="(player, index) in displayPlayers"
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
              v-if="player.rankBadge.isPodium"
              class="emoji crown"
            >{{ player.rankBadge.emoji }}</span>
            <span
              v-else
              class="rank-digits text-outline"
            >
              {{ player.rankBadge.digitText }}
            </span>
            <img
              :src="player.tierSpriteUrl"
              :alt="player.tierName"
              class="ranked-medal-mini pixel-art"
              :title="`Rango: ${player.tierName}`"
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
                v-if="player.hasFaction"
                class="faction-tag-badge text-outline"
                :style="{ backgroundColor: player.factionColor }"
              >
                {{ player.factionLabel }}
              </span>
            </div>
            <div class="player-stats-row">
              <span class="player-class-info">{{ player.playerClassText }}</span>
              <span class="divider">•</span>
              <span class="player-level-info">Nv. {{ player.level }}</span>
            </div>
          </div>

          <!-- Score -->
          <div class="score-badge">
            <span class="score-value text-outline">
              {{ player.scoreText }}
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
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.leaderboard-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgb(255 255 255 / 8%);

  .header-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .section-title {
      @include pixelated;

      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      color: var(--yellow, #fbbf24);
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;

      .emoji {
        font-size: 14px;
        line-height: 1;
      }
    }

    .sub-title {
      @include pixelated;

      color: #94a3b8;
      font-size: 8px;
      letter-spacing: 0.5px;
    }
  }
}

.sorting-controls {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid Rgb(255 255 255 / 6%);
  border-radius: 8px;
  background: Rgb(0 0 0 / 35%);

  .modal-tab-btn.sort-tab {
    @include pixelated;

    padding: 6px 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #94a3b8;
    font-size: 8px;
    text-align: center;
    flex: 1;
    cursor: pointer;
    letter-spacing: 0.5px;

    &.active {
      background: var(--yellow, #fbbf24);
      color: #000;
      font-weight: bold;
      box-shadow: 0 0 10px Rgb(251 191 36 / 30%);
    }
  }
}

.leaderboard-container {
  min-height: 150px;
}

.loading-view,
.empty-view {
  @include pixelated;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: #94a3b8;
  font-size: 9px;
}

.retro-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid Rgb(251 191 36 / 20%);
  border-radius: 50%;
  border-top-color: var(--yellow, #fbbf24);
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
  padding: 8px 12px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 10px;
  background: Rgb(255 255 255 / 2%);
  cursor: pointer;
  will-change: transform, background-color, border-color;

  &.rank-1 {
    background: Linear-Gradient(90deg, Rgb(251 191 36 / 10%), Rgb(0 0 0 / 0%));
    border-color: Rgb(251 191 36 / 35%);
  }
  &.rank-2 {
    background: Linear-Gradient(90deg, Rgb(148 163 184 / 10%), Rgb(0 0 0 / 0%));
    border-color: Rgb(148 163 184 / 35%);
  }
  &.rank-3 {
    background: Linear-Gradient(90deg, Rgb(180 83 9 / 10%), Rgb(0 0 0 / 0%));
    border-color: Rgb(180 83 9 / 35%);
  }
}

.rank-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  .crown {
    min-width: 18px;
    font-size: 14px;
    text-align: center;
  }

  .rank-digits {
    @include pixelated;

    min-width: 18px;
    color: #94a3b8;
    font-size: 9px;
    font-weight: bold;
    text-align: center;
  }

  .ranked-medal-mini {
    @include pixelated;

    width: 26px;
    height: 26px;
    object-fit: contain;
    filter: Drop-Shadow(0 2px 4px Rgb(0 0 0 / 30%));
    flex-shrink: 0;
  }
}

.avatar-container {
  position: relative;
  flex-shrink: 0;

  .status-dot {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 8px;
    height: 8px;
    border: 1.5px solid #0f172a;
    border-radius: 50%;
    background: #64748b;

    &.online {
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
    }
  }
}

.player-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;

  .player-name-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;

    .player-name-text {
      color: var(--white);
      font-size: 11px;
      font-weight: bold;
    }

    .faction-tag-badge {
      @include pixelated;

      padding: 1px 4px;
      border-radius: 4px;
      color: white;
      font-size: 6px;
      line-height: 1.25;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .player-stats-row {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #94a3b8;
    font-size: 8px;

    .player-class-info {
      text-transform: capitalize;
    }

    .divider {
      color: Rgb(255 255 255 / 40%);
    }
  }
}

.score-badge {
  text-align: right;
  flex-shrink: 0;

  .score-value {
    @include pixelated;

    padding: 3px 6px;
    border: 1px solid Rgb(251 191 36 / 15%);
    border-radius: 6px;
    background: Rgb(251 191 36 / 8%);
    color: var(--yellow);
    font-size: 8px;
    line-height: 1.25;
  }
}
</style>
