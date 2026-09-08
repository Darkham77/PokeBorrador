<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseRefreshButton from '@/components/common/BaseRefreshButton.vue'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import { useSocialStore } from '@/stores/social/social'
import { useUIStore } from '@/stores/ui'
import { getSeasonalThemeForMonth } from '@/data/system/rankedData'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import { toPokemonType, type PokemonType } from '@/data/battle/types'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getEloTier } from '@/logic/pvp/rankedEngine'
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

const currentTheme = computed(() => {
  return getSeasonalThemeForMonth(Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE).month)
})
const allowedTypes = computed<PokemonType[]>(() =>
  (currentTheme.value.allowedTypes || []).map(toPokemonType)
)

const getPokemonRewardSprite = (species: string, isShiny = true) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, species, { isShiny })
}

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
    color: '#94a3b8',
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
  nextTick(() => {
    const spinner = document.querySelector('.retro-spinner')
    if (newVal && spinner) {
      gsap.to(spinner, {
        rotation: RANK_SPINNER_ROTATION_DEG,
        duration: RANK_SPINNER_DURATION_SEC,
        repeat: -1,
        ease: 'none'
      })
    }
  })
}, { immediate: true })
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '680px'"
    :height="isSmallScreen ? '100dvh' : '780px'"
    variant="retro"
    padding="raw"
    accent-color="var(--yellow)"
    @close="emit('close')"
  >
    <template #header>
      <div class="ranking-modal-header">
        <div class="ranking-title-group">
          <span class="emoji">🏆</span>
          <div class="title-text-wrap">
            <span class="main-title text-outline">SALÓN DE LA FAMA</span>
            <span class="sub-title">Top 100 entrenadores globales</span>
          </div>
        </div>
        <BaseRefreshButton
          id="ranking-modal-refresh-btn"
          size="md"
          :loading="socialStore.leaderboardLoading"
          title="Actualizar ranking"
          @click="loadLeaderboard"
        />
      </div>
    </template>

    <div class="ranking-modal-content custom-scrollbar">
      <!-- Season Tournament Card (EventCard & Coliseo standard) -->
      <section class="season-tournament-card">
        <div class="tournament-banner-wrapper">
          <img
            :src="currentTheme.bannerImage"
            :alt="currentTheme.name"
            class="tournament-banner-img allow-aliasing"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
        </div>

        <div class="tournament-details">
          <div class="tournament-header-row">
            <span class="season-badge">TORNEO DE TEMPORADA</span>
            <h3 class="tournament-name text-outline">
              {{ currentTheme.name }}
            </h3>
          </div>

          <p class="tournament-desc">
            {{ currentTheme.description }}
          </p>

          <div class="tournament-badges-row">
            <span class="rule-badge text-outline">
              <span class="emoji">⚔️</span> 6 vs 6 (Single)
            </span>
            <span class="rule-badge text-outline">
              <span class="emoji">⭐</span> Nivel Máx: 100
            </span>
            <span
              v-if="currentTheme.isLittleCup"
              class="rule-badge special-rule text-outline"
            >
              <span class="emoji">🐣</span> Little Cup
            </span>
            <span
              v-if="currentTheme.requiresMonotype"
              class="rule-badge special-rule text-outline"
            >
              <span class="emoji">🧬</span> Monotipo
            </span>
            <span
              v-if="currentTheme.requiresDualType"
              class="rule-badge special-rule text-outline"
            >
              <span class="emoji">⚡</span> Doble Tipo
            </span>

            <!-- Allowed Types Badges -->
            <div
              v-if="allowedTypes.length"
              class="types-pills-row"
            >
              <PokemonTypeTag
                v-for="t in allowedTypes"
                :key="t"
                :type="t"
                size="ssm"
              />
            </div>
            <span
              v-else
              class="rule-badge all-types text-outline"
            >
              Todos los tipos permitidos
            </span>
          </div>

          <!-- Shiny Reward Preview for Diamante / Maestro -->
          <div class="tournament-reward-preview">
            <img
              :src="getPokemonRewardSprite(currentTheme.rewardPokemon.maestro.species, true)"
              :alt="currentTheme.rewardPokemon.maestro.species"
              class="reward-sprite pixel-art"
            >
            <div class="reward-text-group">
              <span class="reward-tag text-outline">RECOMPENSA EXCLUSIVA MAESTRO</span>
              <span class="reward-name text-outline">
                <span class="emoji">✨</span> {{ currentTheme.rewardPokemon.maestro.species }} SHINY (IVs 31x4)
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Sorting Selectors -->
      <div class="sorting-controls">
        <button
          id="ranking-modal-sort-elo-btn"
          class="modal-tab-btn sort-tab text-outline"
          :class="{ active: activeSort === 'elo_rating' }"
          @click.stop="activeSort = 'elo_rating'"
          @mouseenter="handleTabEnter"
          @mouseleave="handleTabLeave"
        >
          ELO
        </button>
        <button
          id="ranking-modal-sort-level-btn"
          class="modal-tab-btn sort-tab text-outline"
          :class="{ active: activeSort === 'trainer_level' }"
          @click.stop="activeSort = 'trainer_level'"
          @mouseenter="handleTabEnter"
          @mouseleave="handleTabLeave"
        >
          Nivel
        </button>
        <button
          id="ranking-modal-sort-badges-btn"
          class="modal-tab-btn sort-tab text-outline"
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
                class="generic-rank text-outline"
              >
                {{ index + 1 }}
              </span>
              <img
                v-if="activeSort === 'elo_rating'"
                :src="getAssetUrl(ASSET_TYPES.RANK, getEloTier(player.elo).id)"
                :alt="getEloTier(player.elo).name"
                class="ranked-medal-mini"
                :title="`Rango: ${getEloTier(player.elo).name}`"
              >
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
                  class="player-name-text text-outline"
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
              <span class="score-value text-outline">
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
