<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import { useSocialStore } from '@/stores/social/social'
import { useUIStore } from '@/stores/ui'
import { gsap } from 'gsap'

const RANK_CARD_HOVER_X_OFFSET = 4
const RANK_LIST_ANIM_X_OFFSET = -15
const RANK_LIST_ANIM_SCALE_MIN = 0.97
const RANK_LIST_ANIM_DURATION_SEC = 0.4
const RANK_LIST_ANIM_STAGGER_SEC = 0.05
const RANK_LIST_EASE_STRING = 'back.out(1.15)'
const RANK_SPINNER_ROTATION_DEG = 360
const RANK_ANIM_FAST_DURATION_SEC = 0.2
const RANK_SPINNER_DURATION_SEC = 1.5
const RANK_BTN_Y_OFFSET = -1

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
const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

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

const handleButtonEnter = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    y: RANK_BTN_Y_OFFSET,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    duration: RANK_ANIM_FAST_DURATION_SEC,
    ease: 'power2.out'
  })
}

const handleButtonLeave = (e: MouseEvent) => {
  gsap.to(e.currentTarget, {
    y: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    duration: RANK_ANIM_FAST_DURATION_SEC,
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
    duration: RANK_ANIM_FAST_DURATION_SEC,
    ease: 'power2.out'
  })
}

const handleTabLeave = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  if (el.classList.contains('active')) return
  gsap.to(el, {
    color: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
    duration: RANK_ANIM_FAST_DURATION_SEC,
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
        x: RANK_LIST_ANIM_X_OFFSET,
        scale: RANK_LIST_ANIM_SCALE_MIN,
        duration: RANK_LIST_ANIM_DURATION_SEC,
        stagger: RANK_LIST_ANIM_STAGGER_SEC,
        ease: RANK_LIST_EASE_STRING,
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
  nextTick(() => {
    const tabs = document.querySelectorAll('.sort-tab')
    tabs.forEach(tab => {
      gsap.killTweensOf(tab)
      gsap.set(tab, { clearProps: 'color,backgroundColor' })
    })
  })
  animateList()
})

// Watch loading state to animate the spinner via GSAP
watch(() => socialStore.leaderboardLoading, (newVal) => {
  if (newVal) {
    nextTick(() => {
      const spinner = document.querySelector('.retro-spinner')
      if (spinner) {
        gsap.to(spinner, {
          rotation: RANK_SPINNER_ROTATION_DEG,
          duration: RANK_SPINNER_DURATION_SEC,
          repeat: -1,
          ease: 'none'
        })
      }
    })
  }
}, { immediate: true })
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
          id="ranking-modal-refresh-btn"
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
          id="ranking-modal-sort-elo-btn"
          class="sort-tab"
          :class="{ active: activeSort === 'elo_rating' }"
          @click.stop="activeSort = 'elo_rating'"
          @mouseenter="handleTabEnter"
          @mouseleave="handleTabLeave"
        >
          ELO
        </button>
        <button
          id="ranking-modal-sort-level-btn"
          class="sort-tab"
          :class="{ active: activeSort === 'trainer_level' }"
          @click.stop="activeSort = 'trainer_level'"
          @mouseenter="handleTabEnter"
          @mouseleave="handleTabLeave"
        >
          Nivel
        </button>
        <button
          id="ranking-modal-sort-badges-btn"
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
            :id="`ranking-modal-card-${player.id}`"
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
                :profile="player"
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

<style src="./RankingModal.styles.scss" scoped lang="scss"></style>
