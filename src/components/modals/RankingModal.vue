<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import TrainerAvatar from '@/components/TrainerAvatar.vue'
import { useSocialStore } from '@/stores/social'
import { useUIStore } from '@/stores/ui'
import { useWindowListener } from '@/composables/useWindowListener'
import { gsap } from 'gsap'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  close: []
}>()

const socialStore = useSocialStore()
const uiStore = useUIStore()

// State
const activeSort = ref<'elo_rating' | 'trainer_level' | 'badges'>('elo_rating')
const listRef = ref<HTMLElement | null>(null)

// Responsiveness
const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => {
  isSmallScreen.value = window.innerWidth <= 950
}
useWindowListener('resize', handleResize)

// Faction styling mapping
const getFactionColor = (faction: string) => {
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

const getFactionLabel = (faction: string) => {
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

// Trainer Profile Click Handler
const openTrainerProfile = (userId: string) => {
  uiStore.open('TrainerProfile', { userId })
}

// GSAP hover handlers
const handleCardEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  gsap.to(el, {
    x: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
    duration: 0.2,
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
    duration: 0.2,
    ease: 'power2.out',
    clearProps: 'x,background,borderColor'
  })
}

const handleButtonEnter = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    y: -1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    duration: 0.2,
    ease: 'power2.out'
  })
}

const handleButtonLeave = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    y: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    duration: 0.2,
    ease: 'power2.out',
    clearProps: 'y,backgroundColor,borderColor'
  })
}

const handleTabEnter = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  if (el.classList.contains('active')) return
  gsap.to(el, {
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    duration: 0.2,
    ease: 'power2.out'
  })
}

const handleTabLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  if (el.classList.contains('active')) return
  gsap.to(el, {
    color: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
    duration: 0.2,
    ease: 'power2.out',
    clearProps: 'color,backgroundColor'
  })
}

// Fetch leaderboards
const loadLeaderboard = async () => {
  await socialStore.fetchLeaderboard(activeSort.value)
}

// GSAP Stagger Entrance Animations
const animateList = () => {
  nextTick(() => {
    if (!listRef.value) return
    const cards = listRef.value.querySelectorAll('.rank-card')
    if (cards.length > 0) {
      listRef.value.classList.add('list-animating')
      gsap.killTweensOf(cards)
      gsap.from(cards, {
        opacity: 0,
        x: -15,
        scale: 0.97,
        duration: 0.4,
        stagger: 0.05,
        ease: 'back.out(1.15)',
        clearProps: 'all',
        onComplete: () => {
          listRef.value?.classList.remove('list-animating')
        }
      })
    }
  })
}

// Hooks & Watchers
onMounted(async () => {
  await loadLeaderboard()
  animateList()
})

watch(activeSort, async () => {
  await loadLeaderboard()
  animateList()
})
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '600px'"
    :height="isSmallScreen ? '100dvh' : '650px'"
    variant="retro"
    padding="raw"
    accent-color="var(--yellow)"
    @close="emit('close')"
  >
    <template #header>
      <div class="ranking-modal-header">
        <div class="ranking-title-group">
          <span class="title-icon">🏆</span>
          <div class="title-text-wrap">
            <span class="main-title">SALÓN DE LA FAMA</span>
            <span class="sub-title">Top 100 entrenadores globales</span>
          </div>
        </div>
        <button
          class="retro-btn refresh"
          :disabled="socialStore.leaderboardLoading"
          @click.stop="loadLeaderboard"
          @mouseenter="handleButtonEnter"
          @mouseleave="handleButtonLeave"
        >
          {{ socialStore.leaderboardLoading ? '...' : '🔄' }}
        </button>
      </div>
    </template>

    <div class="ranking-modal-content custom-scrollbar">
      <!-- Season Card Info (Retro Premium Style) -->
      <div class="season-info-card">
        <div class="season-header-bar">
          <span class="season-badge">TEMPORADA ACTUAL</span>
          <span class="season-title">RENACER DE KANTO</span>
        </div>
        <div class="season-rewards-bar">
          <div class="reward-item">
            <span class="reward-lbl">Nivel Máx:</span>
            <span class="reward-val">100</span>
          </div>
          <div class="reward-item">
            <span class="reward-lbl">Modo:</span>
            <span class="reward-val">6 vs 6 (Single)</span>
          </div>
          <div class="reward-item flex-stretch">
            <span class="reward-lbl">Recompensa:</span>
            <span class="reward-val prize-highlight">✨ Mewtwo Armored</span>
          </div>
        </div>
      </div>

      <!-- Sorting Selectors -->
      <div class="sorting-controls">
        <button
          class="sort-tab"
          :class="{ active: activeSort === 'elo_rating' }"
          @click.stop="activeSort = 'elo_rating'"
          @mouseenter="handleTabEnter"
          @mouseleave="handleTabLeave"
        >
          ELO
        </button>
        <button
          class="sort-tab"
          :class="{ active: activeSort === 'trainer_level' }"
          @click.stop="activeSort = 'trainer_level'"
          @mouseenter="handleTabEnter"
          @mouseleave="handleTabLeave"
        >
          Nivel
        </button>
        <button
          class="sort-tab"
          :class="{ active: activeSort === 'badges' }"
          @click.stop="activeSort = 'badges'"
          @mouseenter="handleTabEnter"
          @mouseleave="handleTabLeave"
        >
          Medallas
        </button>
      </div>

      <!-- Leaderboard Entries List -->
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
            :key="player.id"
            class="rank-card"
            :class="`rank-${index + 1}`"
            @click.stop="openTrainerProfile(player.id)"
            @mouseenter="handleCardEnter"
            @mouseleave="handleCardLeave"
          >
            <!-- Rank placement indicator -->
            <div class="rank-badge">
              <span
                v-if="index === 0"
                class="crown"
              >🥇</span>
              <span
                v-else-if="index === 1"
                class="crown"
              >🥈</span>
              <span
                v-else-if="index === 2"
                class="crown"
              >🥉</span>
              <span
                v-else
                class="generic-rank"
              >#{{ index + 1 }}</span>
            </div>

            <!-- Avatar -->
            <div class="avatar-container">
              <TrainerAvatar
                :player-class="player.playerClass"
                :level="player.level"
                :avatar-style="player.avatar_style"
                :size="38"
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
                  class="player-name-text"
                  :class="player.nick_style || 'normal'"
                >
                  {{ player.username }}
                </span>
                <span
                  v-if="player.faction && player.faction !== 'null' && player.faction !== 'NULL' && player.faction !== 'undefined' && player.faction.trim() !== ''"
                  class="faction-tag-badge"
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
              <span class="score-value">
                {{ activeSort === 'elo_rating' ? `${player.elo} ELO` : (activeSort === 'trainer_level' ? `Nv. ${player.level}` : `${player.badges} Medallas`) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;
@use "@/styles/components/cosmetics" as *;

.ranking-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 48px;
}

.ranking-title-group {
  display: flex;
  align-items: center;
  gap: 12px;

  .title-icon {
    font-size: 22px;
    filter: Drop-Shadow(0 0 6px Rgba(251, 191, 36, 0.4));
  }

  .title-text-wrap {
    display: flex;
    flex-direction: column;
  }

  .main-title {
    @include pixelated;
    font-size: 13px;
    color: var(--yellow);
    text-shadow: 0 2px 0 var(--black);
    line-height: 1.2;
  }

  .sub-title {
    font-size: 9px;
    color: var(--gray);
    margin-top: 1px;
  }
}

.retro-btn {
  @include pixelated;
  cursor: pointer;
  background: Rgba(255, 255, 255, 0.05);
  border: 2px solid Rgba(255, 255, 255, 0.1);
  color: var(--white);
  border-radius: 6px;

  &.refresh {
    font-size: 10px;
    padding: 6px 10px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.ranking-modal-content {
  height: 100%;
  overflow-y: auto;
  padding: 16px 20px 30px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// Season Info
.season-info-card {
  background: linear-gradient(135deg, Rgba(251, 191, 36, 0.08), Rgba(0, 0, 0, 0.5));
  border: 1px solid Rgba(251, 191, 36, 0.25);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 8px;

  .season-header-bar {
    display: flex;
    align-items: center;
    gap: 8px;

    .season-badge {
      font-size: 6px;
      padding: 4px 8px;
      border-radius: 4px;
      background: var(--yellow);
      color: var(--white);
      @include text-outline(#000, 1px);
      @include pixelated;
    }

    .season-title {
      @include pixelated;
      font-size: 8px;
      color: Rgba(251, 191, 36, 1);
      letter-spacing: 0.5px;
    }
  }

  .season-rewards-bar {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;

    .reward-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 60px;

      .reward-lbl {
        font-size: 8px;
        color: Rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
      }

      .reward-val {
        font-size: 10px;
        color: var(--white);
        font-weight: bold;
      }

      .prize-highlight {
        color: Rgba(244, 114, 174, 1);
        text-shadow: 0 0 6px Rgba(244, 114, 174, 0.4);
      }
    }

    .flex-stretch {
      flex: 1;
      text-align: right;
      align-items: flex-end;
    }
  }
}

// Sorting Controls
.sorting-controls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: Rgba(0, 0, 0, 0.35);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 3px;

  .sort-tab {
    @include pixelated;
    font-size: 8px;
    background: transparent;
    border: none;
    padding: 8px 0;
    color: Rgba(255, 255, 255, 0.5);
    cursor: pointer;
    border-radius: 8px;

    &.active {
      background: var(--yellow);
      color: var(--white);
      font-weight: bold;
      @include text-outline(#000, 1px);
      box-shadow: 0 2px 6px Rgba(251, 191, 36, 0.3);
    }
  }
}

// Leaderboard container
.leaderboard-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  .loading-view, .empty-view {
    text-align: center;
    padding: 40px;
    color: Rgba(255, 255, 255, 0.4);
    font-size: 11px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .retro-spinner {
    width: 24px;
    height: 24px;
    border: 2px dashed var(--yellow);
    border-radius: 50%;
    animation: spin 1.5s linear infinite;
  }
}

@keyframes spin {
  to { transform: Rotate(360deg); }
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  will-change: transform, background-color, border-color;

  // Top 3 distinct backgrounds
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
  justify-content: center;
  width: 28px;
  flex-shrink: 0;

  .crown {
    font-size: 16px;
  }

  .generic-rank {
    @include pixelated;
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.3);
  }
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
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
    gap: 8px;
    flex-wrap: wrap;

    .player-name-text {
      font-size: 12px;
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
    }
  }

  .player-stats-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 9px;
    color: Rgba(255, 255, 255, 0.45);

    .player-class-info {
      text-transform: capitalize;
    }

    .divider {
      color: Rgba(255, 255, 255, 0.2);
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
    padding: 4px 8px;
    border-radius: 6px;
  }
}
</style>
