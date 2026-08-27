<script setup lang="ts">
import { computed, watch } from 'vue'
import { gsap } from 'gsap'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import type { PastEventHistoryItem, PastCompetitionWinner } from '@/types/system/stores'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useChatCosmeticsStore } from '@/stores/social/chatCosmetics'
import { getTierFromTotalIvs } from '@/logic/pokemon/tierEngine'
import { getPhysicalDimensionTier } from '@/logic/pokemon/physicalDimensionsMath'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

interface Props {
  item: PastEventHistoryItem
}

interface Emits {
  (e: 'claim', awardId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const uiStore = useUIStore()
const authStore = useAuthStore()
const gameStore = useGameStore()
const chatCosmetics = useChatCosmeticsStore()

const HOVER_ANIMATION_DURATION_SEC = 0.2
const HOVER_TRANSLATE_Y_PX = -2

watch(
  () => props.item.winners,
  (winners) => {
    if (winners && winners.length > 0) {
      const ids = winners.map((w) => w.player_id).filter(Boolean)
      chatCosmetics.fetchMissingCosmetics(ids)
    }
  },
  { immediate: true }
)

const openTrainerProfile = (userId?: string) => {
  if (userId) {
    uiStore.open('TrainerProfile', { userId })
  }
}

const getWinnerProfile = (w: PastCompetitionWinner) => {
  if (authStore.user?.id && w.player_id === authStore.user.id) {
    return {
      playerClass: gameStore.state.playerClass || 'entrenador',
      level: gameStore.state.trainerLevel || 1,
      avatarStyle: gameStore.state.avatar_style || '',
      nick_style: gameStore.state.nick_style || '',
      gender: gameStore.state.gender || 'h'
    }
  }
  const cached = chatCosmetics.profileCosmetics[w.player_id]
  const entryData = w.entry_data
  return {
    playerClass: cached?.player_class || w.player_class || entryData?.player_class || 'entrenador',
    level: cached?.trainer_level || w.player_level || entryData?.trainer_level || 1,
    avatarStyle: cached?.avatar_style || w.avatar_style || entryData?.avatar_style || '',
    nick_style: cached?.nick_style || w.nick_style || entryData?.nick_style || '',
    gender: cached?.gender || w.gender || entryData?.gender || 'h'
  }
}

const getWinnerNickStyle = (w: PastCompetitionWinner): string => {
  if (authStore.user?.id && w.player_id === authStore.user.id) {
    return gameStore.state.nick_style || 'normal'
  }
  const cached = chatCosmetics.profileCosmetics[w.player_id]
  const entryData = w.entry_data
  return cached?.nick_style || w.nick_style || entryData?.nick_style || 'normal'
}

const getWinnerName = (w: PastCompetitionWinner): string => {
  if (authStore.user?.id && w.player_id === authStore.user.id) {
    return gameStore.state.trainer || w.player_name || 'Entrenador'
  }
  const cached = chatCosmetics.profileCosmetics[w.player_id]
  return cached?.username || w.player_name || 'Entrenador'
}

const formatWinnerMetric = (w: PastCompetitionWinner, catId: string): string => {
  const data = w.entry_data

  if (catId === 'ivs') {
    const score = Number(w.score ?? data?.total_ivs ?? 0)
    const tierLabel = data?.tier_label || getTierFromTotalIvs(score).tier
    return `${score} / 186 IVs (${tierLabel})`
  }

  if (catId === 'weight') {
    const score = Number(w.score ?? data?.weight ?? 0)
    const speciesId = data?.species ? String(data.species) : undefined
    const spec = speciesId ? pokemonDataProvider.getPokemonData(speciesId, true) : null
    const baseWeight = spec?.weight || null
    const tier = baseWeight ? getPhysicalDimensionTier(score, baseWeight) : null

    const maxTarget = baseWeight ? (baseWeight * 1.15).toFixed(1) : null
    const minTarget = baseWeight ? (baseWeight * 0.85).toFixed(1) : null
    const isMinCategory = (w.category_name || '').toLowerCase().includes('miniatura') || (w.category_id || '').toLowerCase().includes('min')
    const targetRef = isMinCategory ? minTarget : maxTarget

    const tierStr = tier ? ` (${tier.label} · ${tier.name})` : data?.tier_label ? ` (${data.tier_label})` : ''
    const targetStr = targetRef ? ` / ${targetRef} kg` : ''
    return `${score.toFixed(1)} kg${targetStr}${tierStr}`
  }

  if (catId === 'height') {
    const score = Number(w.score ?? data?.height ?? 0)
    const speciesId = data?.species ? String(data.species) : undefined
    const spec = speciesId ? pokemonDataProvider.getPokemonData(speciesId, true) : null
    const baseHeight = spec?.height || null
    const tier = baseHeight ? getPhysicalDimensionTier(score, baseHeight) : null

    const maxTarget = baseHeight ? (baseHeight * 1.15).toFixed(1) : null
    const minTarget = baseHeight ? (baseHeight * 0.85).toFixed(1) : null
    const isMinCategory = (w.category_name || '').toLowerCase().includes('miniatura') || (w.category_id || '').toLowerCase().includes('min')
    const targetRef = isMinCategory ? minTarget : maxTarget

    const tierStr = tier ? ` (${tier.label} · ${tier.name})` : data?.tier_label ? ` (${data.tier_label})` : ''
    const targetStr = targetRef ? ` / ${targetRef} m` : ''
    return `${score.toFixed(1)} m${targetStr}${tierStr}`
  }

  if (catId === 'level') {
    const score = Number(w.score ?? data?.level ?? 1)
    return `Nv. ${score} / 100`
  }

  if (data?.display_value) {
    return String(data.display_value)
  }
  if (data?.displayValue) {
    return String(data.displayValue)
  }

  return `${w.score ?? 0}`
}

const onBtnHover = (event: MouseEvent, isEntering: boolean) => {
  const btn = event.currentTarget as HTMLElement
  if (!btn || btn.hasAttribute('disabled')) return
  if (isEntering) {
    gsap.to(btn, {
      background: '#22c55e',
      y: HOVER_TRANSLATE_Y_PX,
      borderColor: '#86efac',
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(btn, {
      background: '#16a34a',
      y: 0,
      borderColor: '#4ade80',
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform,background,borderColor'
    })
  }
}

const formatDate = (isoString?: string): string => {
  if (!isoString) return ''
  try {
    const instant = Temporal.Instant.from(isoString)
    const zdt = instant.toZonedDateTimeISO(GAME_TIMEZONE)
    const day = String(zdt.day).padStart(2, '0')
    const month = String(zdt.month).padStart(2, '0')
    const hour = String(zdt.hour).padStart(2, '0')
    const minute = String(zdt.minute).padStart(2, '0')
    return `${day}/${month} · ${hour}:${minute} hs`
  } catch {
    return isoString
  }
}

interface WeeklyScheduleData {
  type?: string; // domain-ok
  days?: number[];
  startHour?: number;
  endHour?: number;
}

const parseSchedule = (raw?: string | object): WeeklyScheduleData | null => {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as WeeklyScheduleData
    } catch {
      return null
    }
  }
  return raw as WeeklyScheduleData
}

const formatEventScheduleWindow = (item: PastEventHistoryItem): string => {
  let datePrefix = ''
  if (item.ended_at) {
    try {
      const instant = Temporal.Instant.from(item.ended_at)
      const zdt = instant.toZonedDateTimeISO(GAME_TIMEZONE)
      const day = String(zdt.day).padStart(2, '0')
      const month = String(zdt.month).padStart(2, '0')
      datePrefix = `${day}/${month}`
    } catch {
      datePrefix = ''
    }
  }

  // 1. Check schedule object (e.g. startHour, endHour)
  const sched = parseSchedule(item.event_schedule)
  if (sched && (typeof sched.startHour === 'number' || typeof sched.endHour === 'number')) {
    const startH = typeof sched.startHour === 'number' ? sched.startHour : 0
    const endH = typeof sched.endHour === 'number' ? sched.endHour : 24
    const formatH = (hr: number) => {
      const h = Math.floor(hr)
      const m = Math.round((hr % 1) * 60)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    const timeRange = `De ${formatH(startH)} a ${formatH(endH)} hs`
    return datePrefix ? `${datePrefix} · ${timeRange}` : timeRange
  }

  // 2. Check absolute start_at & end_at
  if (item.start_at && item.end_at) {
    try {
      const sInstant = Temporal.Instant.from(item.start_at).toZonedDateTimeISO(GAME_TIMEZONE)
      const eInstant = Temporal.Instant.from(item.end_at).toZonedDateTimeISO(GAME_TIMEZONE)
      const sH = `${String(sInstant.hour).padStart(2, '0')}:${String(sInstant.minute).padStart(2, '0')}`
      const eH = `${String(eInstant.hour).padStart(2, '0')}:${String(eInstant.minute).padStart(2, '0')}`
      const timeRange = `De ${sH} a ${eH} hs`
      return datePrefix ? `${datePrefix} · ${timeRange}` : timeRange
    } catch {
      // ignore
    }
  }

  // 3. Fallback to single timestamp
  return formatDate(item.ended_at)
}

const getRankMedal = (rank?: string | number): string => {
  if (rank === 'first' || rank === 1 || rank === '1') return '🥇'
  if (rank === 'second' || rank === 2 || rank === '2') return '🥈'
  if (rank === 'third' || rank === 3 || rank === '3') return '🥉'
  return '🎖️'
}

const getRankLabel = (rank?: string | number): string => {
  if (rank === 'first' || rank === 1 || rank === '1') return '1º'
  if (rank === 'second' || rank === 2 || rank === '2') return '2º'
  if (rank === 'third' || rank === 3 || rank === '3') return '3º'
  return `${rank}º`
}

const onClaimClick = (awardId?: string) => {
  if (!awardId) return
  emit('claim', awardId)
}

interface CategoryGroup {
  categoryId: string;
  categoryName: string;
  winners: PastCompetitionWinner[];
}

const groupedWinners = computed<CategoryGroup[]>(() => {
  const groups: Record<string, CategoryGroup> = {}
  for (const w of props.item.winners) {
    const catId = w.category_id || 'ivs'
    const catName = w.category_name || (catId === 'weight' ? 'Masa y Peso' : catId === 'height' ? 'Envergadura y Altura' : 'Genética Superior (IVs)')
    if (!groups[catId]) {
      groups[catId] = {
        categoryId: catId,
        categoryName: catName,
        winners: []
      }
    }
    groups[catId]!.winners.push(w)
  }
  return Object.values(groups)
})

const getCategoryIcon = (catId: string) => {
  if (catId === 'ivs') return '🧬'
  if (catId === 'weight') return '⚖️'
  if (catId === 'height') return '📏'
  return '🏆'
}
</script>

<template>
  <div
    class="past-event-card"
    :class="{ 'user-won': item.isWinner }"
  >
    <!-- Card Top Bar -->
    <div class="card-top">
      <div class="event-meta">
        <span class="event-icon">{{ item.event_icon }}</span>
        <div class="event-title-group">
          <h4 class="event-name">
            {{ item.event_name }}
          </h4>
          <span class="event-date">{{ formatEventScheduleWindow(item) }}</span>
        </div>
      </div>

      <!-- Claim Status / Button -->
      <div class="award-action-slot">
        <button
          v-if="item.hasUnclaimedAward && item.myAward?.id"
          :id="'claim-past-award-btn-' + (item.myAward?.id || item.id)"
          class="retro-btn claim-btn"
          @mouseenter="onBtnHover($event, true)"
          @mouseleave="onBtnHover($event, false)"
          @click.stop="onClaimClick(item.myAward.id)"
        >
          RECLAMAR PREMIO 🎁
        </button>

        <div
          v-else-if="item.isClaimed"
          class="claimed-badge"
        >
          ✓ RECLAMADA
        </div>

        <div
          v-else-if="item.isWinner"
          class="winner-badge"
        >
          🏆 GANADOR
        </div>
      </div>
    </div>

    <!-- Podium / Winners grouped by category -->
    <div class="podium-box">
      <div class="podium-title">
        PODIO DE GANADORES
      </div>

      <div
        v-if="item.winners.length === 0"
        class="no-winners"
      >
        Sin participantes registrados en esta edición.
      </div>

      <div
        v-else
        class="categories-podium-list"
      >
        <div
          v-for="catGroup in groupedWinners"
          :key="catGroup.categoryId"
          class="category-podium-block"
        >
          <div class="category-block-header pixelated">
            <span class="cat-icon">{{ getCategoryIcon(catGroup.categoryId) }}</span>
            <span class="cat-name">{{ catGroup.categoryName }}</span>
          </div>

          <div class="winners-grid">
            <div
              v-for="(w, idx) in catGroup.winners"
              :key="w.player_id || idx"
              class="winner-item"
              :class="`rank-${w.rank || idx + 1}`"
            >
              <div class="rank-badge">
                <span class="medal">{{ getRankMedal(w.rank || idx + 1) }}</span>
                <span class="pos-text">{{ getRankLabel(w.rank || idx + 1) }}</span>
              </div>

              <!-- Clickable Avatar -->
              <div
                class="winner-avatar-wrap"
                :title="`Ver perfil de ${getWinnerName(w)}`"
                @click.stop="openTrainerProfile(w.player_id)"
              >
                <TrainerAvatar
                  :profile="getWinnerProfile(w)"
                  :size="26"
                />
              </div>

              <!-- Clickable Player Name -->
              <div
                class="winner-player-wrap"
                :title="`Ver perfil de ${getWinnerName(w)}`"
                @click.stop="openTrainerProfile(w.player_id)"
              >
                <span
                  v-gsap-nick="getWinnerNickStyle(w)"
                  class="player-name"
                  :class="getWinnerNickStyle(w)"
                >
                  {{ getWinnerName(w) }}
                </span>
              </div>

              <span
                v-if="w.entry_data?.name || w.score !== undefined"
                class="row-divider"
              >•</span>

              <!-- Pokemon & Metric Inline -->
              <div
                v-if="w.entry_data?.name || w.score !== undefined"
                class="winner-entry-inline"
              >
                <span
                  v-if="w.entry_data?.name"
                  class="entry-poke"
                  :class="{ shiny: w.entry_data.is_shiny }"
                >
                  {{ w.entry_data.is_shiny ? '✨ ' : '' }}{{ w.entry_data.nickname || w.entry_data.name }}
                </span>
                <span
                  v-if="w.score !== undefined || w.entry_data?.display_value"
                  class="score-val"
                >
                  {{ formatWinnerMetric(w, catGroup.categoryId) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.past-event-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px 14px;

  &.user-won {
    background: Rgba(34, 197, 94, 0.04);
    border-color: Rgba(34, 197, 94, 0.3);
  }
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 10px;

  .event-icon {
    font-size: 20px;
  }

  .event-title-group {
    display: flex;
    flex-direction: column;
  }

  .event-name {
    @include pixelated;
    font-size: 10px;
    color: var(--white);
    margin: 0 0 2px 0;
    line-height: 1.2;
  }

  .event-date {
    font-size: 9px;
    color: var(--gray);
  }
}

.award-action-slot {
  display: flex;
  align-items: center;
}

.retro-btn {
  @include pixelated;
  font-size: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;

  &.claim-btn {
    background: #16a34a;
    border-color: #4ade80;
    color: var(--white);
    font-weight: bold;
    box-shadow: 0 2px 0 #15803d, 0 0 10px Rgba(74, 222, 128, 0.25);
    text-shadow: 0 1px 2px Rgba(0, 0, 0, 0.5);

    &:hover:not(:disabled) {
      background: #22c55e;
      border-color: #86efac;
      box-shadow: 0 3px 0 #15803d, 0 0 14px Rgba(74, 222, 128, 0.4);
      transform: Translatey(-1px);
    }

    &:active:not(:disabled) {
      transform: Translatey(1px);
      box-shadow: 0 0 0 transparent;
    }
  }
}

.claimed-badge {
  @include pixelated;
  font-size: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background: Rgba(34, 197, 94, 0.15);
  border: 1px solid Rgba(34, 197, 94, 0.4);
  color: var(--green-bright);
}

.winner-badge {
  @include pixelated;
  font-size: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background: Rgba(255, 215, 0, 0.15);
  border: 1px solid Rgba(255, 215, 0, 0.4);
  color: var(--yellow);
}

.podium-box {
  background: Rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 8px 10px;
}

.podium-title {
  @include pixelated;
  font-size: 8px;
  color: var(--gray);
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.no-winners {
  font-size: 9px;
  color: var(--gray);
  font-style: italic;
  padding: 4px 0;
}

.categories-podium-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-podium-block {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .category-block-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 7px;
    color: var(--yellow);
    letter-spacing: 0.5px;
    border-bottom: 1px dashed Rgba(255, 255, 255, 0.08);
    padding-bottom: 3px;

    .cat-icon {
      font-size: 10px;
    }
  }
}

.winners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.winner-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  padding: 6px 12px;
  border-radius: 8px;
  min-height: 42px;
  box-sizing: border-box;

  &.rank-first,
  &.rank-1 {
    border-color: Rgba(255, 215, 0, 0.3);
    background: Rgba(255, 215, 0, 0.05);
  }

  &.rank-second,
  &.rank-2 {
    border-color: Rgba(192, 192, 192, 0.3);
    background: Rgba(192, 192, 192, 0.04);
  }

  &.rank-third,
  &.rank-3 {
    border-color: Rgba(205, 127, 50, 0.3);
    background: Rgba(205, 127, 50, 0.04);
  }
}

.rank-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;

  .medal {
    font-size: 14px;
    line-height: 1;
  }

  .pos-text {
    @include pixelated;
    font-size: 8px;
    color: var(--gray-light);
  }
}

.winner-avatar-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  flex-shrink: 0;
  cursor: pointer;
}

.winner-player-wrap {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;

  .player-name {
    font-size: 10px;
    font-weight: bold;
    color: var(--white);
    white-space: nowrap;

    &:hover:not([class*="custom-"]) {
      color: var(--yellow);
      text-shadow: 0 0 6px Rgba(250, 204, 21, 0.3);
    }
  }
}

.row-divider {
  color: Rgba(255, 255, 255, 0.2);
  font-size: 10px;
  flex-shrink: 0;
}

.winner-entry-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 8.5px;
  white-space: nowrap;
  min-width: 0;

  .entry-poke {
    color: var(--yellow);
    font-weight: bold;
  }

  .score-val {
    color: var(--green-bright);
    text-shadow: 0 0 6px Rgba(74, 222, 128, 0.25);
  }
}
</style>
