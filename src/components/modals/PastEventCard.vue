<script setup lang="ts">
import { computed, watch } from 'vue'
import { gsap } from 'gsap'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import type { PastEventHistoryItem, PastCompetitionWinner } from '@/types/system/stores'
import { useChatCosmeticsStore } from '@/stores/social/chatCosmetics'
import PastEventWinnerItem from './PastEventWinnerItem.vue'

interface Props {
  item: PastEventHistoryItem
}

interface Emits {
  (e: 'claim', awardId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
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
  type?: string // domain-ok
  days?: number[]
  startHour?: number
  endHour?: number
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
    const isAllDay = startH === 0 && (endH >= 23.9 || endH === 24)
    const timeRange = isAllDay ? 'Todo el día' : `De ${formatH(startH)} a ${formatH(endH)} hs`
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

const onClaimClick = (awardId?: string) => {
  if (!awardId) return
  emit('claim', awardId)
}

interface CategoryGroup {
  categoryId: string
  categoryName: string
  winners: PastCompetitionWinner[]
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
            <PastEventWinnerItem
              v-for="(w, idx) in catGroup.winners"
              :key="w.player_id || idx"
              :winner="w"
              :category-id="catGroup.categoryId"
              :rank-index="idx"
            />
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
</style>
