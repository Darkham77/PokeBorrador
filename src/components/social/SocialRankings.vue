<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSocialStore } from '@/stores/social/social'
import { useLivePvPStore } from '@/stores/livePvP'
import { useModalStore } from '@/stores/modals'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { usePvPStore } from '@/stores/pvp'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import SocialRankingsPodium from '@/components/social/SocialRankingsPodium.vue'
import SocialRankingsTheater from '@/components/social/SocialRankingsTheater.vue'
import { getEloTier, RANKED_TIERS } from '@/logic/pvp/rankedEngine'
import { DEFAULT_INITIAL_ELO } from '@/logic/constants/gameplay'
import { logger } from '@/logic/utils/logger'
import type { LeaderboardEntry } from '@/stores/social/social'
import type { RankedPodiumWinner, SocialRankingsTab } from '@/types/battle/pvp'

const COMPETITION_RESULTS_LIMIT = 20 as const
const activeTab = ref<SocialRankingsTab>('season')
const socialStore = useSocialStore()
const livePvPStore = useLivePvPStore()
const modalStore = useModalStore()
const authStore = useAuthStore()
const gameStore = useGameStore()
const pvpStore = usePvPStore()

const podiumWinners = ref<RankedPodiumWinner[]>([])
const podiumLoading = ref(false)

const currentPlayerId = computed(() => authStore.user?.id || '')
const currentElo = computed(() => {
  return pvpStore.elo || DEFAULT_INITIAL_ELO
})
const currentTier = computed(() => getEloTier(currentElo.value))

const nextTier = computed(() => {
  if (currentTier.value.id === 'maestro') return null
  if (currentTier.value.id === 'diamante') return RANKED_TIERS.MAESTRO
  if (currentTier.value.id === 'platino') return RANKED_TIERS.DIAMANTE
  if (currentTier.value.id === 'oro') return RANKED_TIERS.PLATINO
  if (currentTier.value.id === 'plata') return RANKED_TIERS.ORO
  return RANKED_TIERS.PLATA
})

const pointsToNextTier = computed(() => {
  if (!nextTier.value) return 0
  return Math.max(0, nextTier.value.minElo - currentElo.value)
})

const displayTiers = [
  { code: 'MAESTRO', tier: RANKED_TIERS.MAESTRO, rewardsDesc: 'Medalla Maestro · Shiny Eevee · 500 BC' },
  { code: 'DIAMANTE', tier: RANKED_TIERS.DIAMANTE, rewardsDesc: 'Medalla Diamante · 350 BC · 4 Tickets' },
  { code: 'PLATINO', tier: RANKED_TIERS.PLATINO, rewardsDesc: 'Medalla Platino · 250 BC · 4 Tickets' },
  { code: 'ORO', tier: RANKED_TIERS.ORO, rewardsDesc: 'Medalla Oro · 150 BC · 2 Tickets' },
  { code: 'PLATA', tier: RANKED_TIERS.PLATA, rewardsDesc: 'Medalla Plata · 75 BC · 1 Ticket' },
  { code: 'BRONCE', tier: RANKED_TIERS.BRONCE, rewardsDesc: 'Medalla Bronce · 25 BC' }
]

onMounted(() => {
  socialStore.fetchLeaderboard()
})

async function fetchPodium() {
  if (!gameStore.db) return
  podiumLoading.value = true
  try {
    const { data, error } = await gameStore.db
      .from('competition_results')
      .select('*')
      .order('ended_at', { ascending: false })
      .limit(COMPETITION_RESULTS_LIMIT) as { data: { event_id?: string; winners?: string | RankedPodiumWinner[] }[] | null; error: unknown }

    if (!error && data && data.length > 0) {
      const rankedRow = data.find(r => r.event_id?.startsWith('ranked_'))
      if (rankedRow?.winners) {
        const parsed = typeof rankedRow.winners === 'string' ? JSON.parse(rankedRow.winners) : rankedRow.winners
        if (Array.isArray(parsed)) {
          podiumWinners.value = parsed as RankedPodiumWinner[]
        }
      }
    }
  } catch (err) {
    logger.warn('SocialRankings', `Error fetching podium: ${(err as Error).message}`)
  } finally {
    podiumLoading.value = false
  }
}

function setTab(tab: SocialRankingsTab) {
  activeTab.value = tab
  if (tab === 'podium' && podiumWinners.value.length === 0) {
    fetchPodium()
  }
}

function handleChallengePlayer(player: LeaderboardEntry) {
  modalStore.open('PvPChallenge', {
    opponentId: player.id,
    opponentName: player.username,
    friend: {
      id: player.id,
      username: player.username,
      isOnline: player.isOnline,
      avatar: player.avatar_style || 'trainer_red',
      elo: player.elo
    }
  })
}

function handleSearchRanked() {
  livePvPStore.startSearch()
}

function handleCancelSearch() {
  livePvPStore.cancelSearch()
}

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
    <!-- SUB-TABS NAVIGATION -->
    <div class="subtabs-bar">
      <button
        id="tab-pvp-season"
        v-gsap-hover="'button'"
        class="subtab-btn"
        :class="{ active: activeTab === 'season' }"
        @click="setTab('season')"
      >
        <span class="tab-icon emoji">🏆</span>
        <span class="tab-text">TEMPORADA</span>
      </button>
      <button
        id="tab-pvp-leaderboard"
        v-gsap-hover="'button'"
        class="subtab-btn"
        :class="{ active: activeTab === 'leaderboard' }"
        @click="setTab('leaderboard')"
      >
        <span class="tab-icon emoji">📊</span>
        <span class="tab-text">RANKING</span>
      </button>
      <button
        id="tab-pvp-podium"
        v-gsap-hover="'button'"
        class="subtab-btn"
        :class="{ active: activeTab === 'podium' }"
        @click="setTab('podium')"
      >
        <span class="tab-icon emoji">👑</span>
        <span class="tab-text">SALÓN DE LA FAMA</span>
      </button>
      <button
        id="tab-pvp-theater"
        v-gsap-hover="'button'"
        class="subtab-btn"
        :class="{ active: activeTab === 'theater' }"
        @click="setTab('theater')"
      >
        <span class="tab-icon emoji">🎭</span>
        <span class="tab-text">TEATRO</span>
      </button>
    </div>

    <!-- TAB 1: TEMPORADA -->
    <div
      v-if="activeTab === 'season'"
      class="tab-pane season-pane"
    >
      <div class="season-hero-card">
        <div class="season-header">
          <span class="emoji season-icon">🏆</span>
          <div class="season-title-box">
            <span class="season-label">TEMPORADA COMPETITIVA</span>
            <h3 class="season-name">
              TEMPORADA 1: RENACER DE KANTO
            </h3>
          </div>
        </div>

        <div class="player-rank-status">
          <div
            class="tier-badge-large"
            :style="{ borderColor: currentTier.color }"
          >
            <img
              v-if="currentTier.sprite"
              :src="currentTier.sprite"
              :alt="currentTier.name"
              class="tier-sprite-large"
            >
            <span
              v-else
              class="tier-icon emoji"
            >{{ currentTier.icon }}</span>
            <div class="tier-info">
              <span
                class="tier-name"
                :style="{ color: currentTier.color }"
              >{{ currentTier.name }}</span>
              <span class="tier-elo">{{ currentElo }} LP</span>
            </div>
          </div>
          <div
            v-if="nextTier"
            class="tier-progress-info"
          >
            <span class="progress-label">Siguiente Rango: <strong>{{ nextTier.name }}</strong></span>
            <span class="progress-sub">Faltan {{ pointsToNextTier }} LP para ascender</span>
          </div>
          <div
            v-else
            class="tier-progress-info"
          >
            <span class="progress-label max-rank">¡RANGO MÁXIMO ALCANZADO!</span>
            <span class="progress-sub">Compite por el Top 1 del Salón de la Fama</span>
          </div>
        </div>

        <!-- MATCHMAKING CTA -->
        <div class="matchmaking-cta-box">
          <button
            v-if="!livePvPStore.isSearching"
            id="btn-start-ranked-matchmaking"
            v-gsap-hover="'button'"
            class="btn-ranked-search"
            @click="handleSearchRanked"
          >
            <span class="emoji">⚔️</span> BUSCAR COMBATE RANKED
          </button>
          <div
            v-else
            class="searching-status-box"
          >
            <div
              v-gsap-loop="'spin'"
              class="searching-spinner"
            />
            <span class="searching-text">Buscando rival en tu rango...</span>
            <button
              id="btn-cancel-ranked-matchmaking"
              v-gsap-hover="'button'"
              class="btn-cancel-search"
              @click="handleCancelSearch"
            >
              CANCELAR
            </button>
          </div>
        </div>

        <div class="season-rules-row">
          <div class="rule-box">
            <span class="rule-title">FORMATO</span>
            <span class="rule-val">6v6 Flat Level 50</span>
          </div>
          <div class="rule-box">
            <span class="rule-title">TIEMPO / TURNO</span>
            <span class="rule-val">60s</span>
          </div>
          <div class="rule-box">
            <span class="rule-title">ESCENARIO</span>
            <span class="rule-val">Gimnasio Celadon</span>
          </div>
        </div>
      </div>

      <!-- TIER REWARDS PREVIEW -->
      <div class="rewards-preview-card">
        <h4 class="rewards-title">
          <span class="emoji">🎁</span> RECOMPENSAS DE TEMPORADA
        </h4>
        <div class="tiers-rewards-grid">
          <div
            v-for="tier in displayTiers"
            :key="tier.code"
            class="tier-reward-row"
            :class="{ 'is-current': tier.tier.id === currentTier.id }"
          >
            <div class="tier-col">
              <img
                v-if="tier.tier.sprite"
                :src="tier.tier.sprite"
                :alt="tier.tier.name"
                class="tier-sprite-mini"
              >
              <span
                v-else
                class="tier-emoji"
              >{{ tier.tier.icon }}</span>
              <span
                class="tier-label"
                :style="{ color: tier.tier.color }"
              >{{ tier.tier.name }}</span>
            </div>
            <div class="reward-col">
              <span class="reward-desc">{{ tier.rewardsDesc }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: RANKING GLOBAL -->
    <div
      v-else-if="activeTab === 'leaderboard'"
      class="tab-pane leaderboard-pane"
    >
      <div
        v-if="socialStore.leaderboardLoading"
        class="loader"
      >
        <div
          v-gsap-loop="'spin'"
          class="spinner"
        />
        <p>Consultando el Salón Global...</p>
      </div>

      <div
        v-else-if="socialStore.leaderboard.length === 0"
        class="empty-state"
      >
        No hay datos disponibles en el Salón Global aún.
      </div>

      <div
        v-else
        class="leaderboard-list"
      >
        <div
          v-for="(player, index) in socialStore.leaderboard"
          :key="player.id"
          class="rank-card"
          :class="[`rank-${Number(index) + 1}`, { 'is-me': player.id === currentPlayerId }]"
        >
          <div class="rank-number">
            <span
              v-if="index === 0"
              class="medal-icon emoji"
            >🥇</span>
            <span
              v-else-if="index === 1"
              class="medal-icon emoji"
            >🥈</span>
            <span
              v-else-if="index === 2"
              class="medal-icon emoji"
            >🥉</span>
            <span
              v-else
              class="rank-digits"
            >{{ Number(index) + 1 }}</span>
          </div>

          <div class="rank-avatar">
            <TrainerAvatar
              :profile="player"
              :size="34"
            />
            <div
              v-if="player.isOnline"
              class="online-dot"
              title="Online"
            />
          </div>

          <div class="rank-info">
            <div class="player-name-row">
              <span
                v-gsap-nick="player.nick_style || 'normal'"
                class="player-name"
              >
                {{ player.username }}
              </span>
              <span
                v-if="player.id === currentPlayerId"
                class="me-tag"
              >(TÚ)</span>
              <span
                v-if="isFactionValid(player.faction)"
                class="faction-tag"
                :style="{ backgroundColor: getFactionColor(player.faction) }"
              >
                {{ getFactionLabel(player.faction) }}
              </span>
            </div>
            <div class="player-meta">
              <span class="m-badge-level">Nv. {{ player.level }}</span> ·
              <span class="elo-val">{{ player.elo }} LP</span> ·
              <span class="tier-tag">{{ getEloTier(player.elo).name }}</span>
            </div>
          </div>

          <div class="rank-actions">
            <button
              v-if="player.id !== currentPlayerId"
              :id="`btn-challenge-player-${player.id}`"
              v-gsap-hover="'button'"
              class="btn-challenge"
              title="Desafiar en PvP"
              @click="handleChallengePlayer(player)"
            >
              <span class="emoji">⚔️</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: SALÓN DE LA FAMA (PODIO) -->
    <div
      v-else-if="activeTab === 'podium'"
      class="tab-pane podium-pane"
    >
      <SocialRankingsPodium
        :podium-winners="podiumWinners"
        :loading="podiumLoading"
      />
    </div>

    <!-- TAB 4: TEATRO DE REPETICIONES -->
    <div
      v-else-if="activeTab === 'theater'"
      class="tab-pane theater-pane"
    >
      <SocialRankingsTheater />
    </div>
  </div>
</template>

<style scoped src="./SocialRankings.styles.scss" lang="scss"></style>
