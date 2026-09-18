<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSocialStore } from '@/stores/social/social'
import { useLivePvPStore } from '@/stores/livePvP'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { usePvPStore } from '@/stores/pvp'
import SocialRankingsLeaderboardTab from '@/components/social/SocialRankingsLeaderboardTab.vue'
import SocialRankingsPodium from '@/components/social/SocialRankingsPodium.vue'
import SocialRankingsTheater from '@/components/social/SocialRankingsTheater.vue'
import SocialRankingsSeasonTab from '@/components/social/SocialRankingsSeasonTab.vue'
import { getEloTier, RANKED_TIERS } from '@/logic/pvp/rankedEngine'
import { DEFAULT_INITIAL_ELO } from '@/logic/constants/gameplay'
import { logger } from '@/logic/utils/logger'
import type { RankedPodiumWinner, SocialRankingsTab } from '@/types/battle/pvp'

const COMPETITION_RESULTS_LIMIT = 20 as const
const activeTab = ref<SocialRankingsTab>('season')
const socialStore = useSocialStore()
const livePvPStore = useLivePvPStore()
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

function handleSearchRanked() {
  livePvPStore.startSearch()
}

function handleCancelSearch() {
  livePvPStore.cancelSearch()
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
    <SocialRankingsSeasonTab
      v-if="activeTab === 'season'"
      :current-tier="currentTier"
      :current-elo="currentElo"
      :next-tier="nextTier"
      :points-to-next-tier="pointsToNextTier"
      :is-searching="livePvPStore.isSearching"
      :display-tiers="displayTiers"
      @search-ranked="handleSearchRanked"
      @cancel-search="handleCancelSearch"
    />

    <!-- TAB 2: RANKING GLOBAL -->
    <SocialRankingsLeaderboardTab
      v-else-if="activeTab === 'leaderboard'"
      :current-player-uid="currentPlayerId"
    />

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
