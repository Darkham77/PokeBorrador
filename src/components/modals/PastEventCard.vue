<script setup lang="ts">
import { computed, watch } from 'vue'
import { gsap } from 'gsap'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import type { PastEventHistoryItem, PastCompetitionWinner } from '@/types/system/stores'
import { getEventDisplayName, type Event as GameEvent } from '@/logic/events/eventEngine'
import { useChatCosmeticsStore } from '@/stores/social/chatCosmetics'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import { isAwardClaimable } from '@/logic/events/eventValidators'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PastEventWinnerItem from './PastEventWinnerItem.vue'

interface Props {
  item: PastEventHistoryItem
}

interface Emits {
  (e: 'claim', awardId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const eventStore = useEventStore()
const chatCosmetics = useChatCosmeticsStore()
const modalStore = useModalStore()

const HOVER_ANIMATION_DURATION_SEC = 0.2
const HOVER_TRANSLATE_Y_PX = -2

const matchingEvent = computed<GameEvent | null>(() => {
  return eventStore.allEvents.find(e => e.id === props.item.event_id) || null
})

const displayName = computed<string>(() => {
  if (props.item.event_id.startsWith('custom_') || props.item.event_name?.startsWith('custom_')) {
    return 'Evento desconocido'
  }
  if (matchingEvent.value) {
    return getEventDisplayName(matchingEvent.value)
  }
  return props.item.event_name || 'Evento desconocido'
})

const canOpenDetail = computed<boolean>(() => {
  return displayName.value !== 'Evento desconocido' && matchingEvent.value !== null
})

const openEventDetail = () => {
  if (!canOpenDetail.value || !matchingEvent.value) return
  const fullEvent: GameEvent & { ended_at?: string } = {
    ...matchingEvent.value,
    name: matchingEvent.value.name || props.item.event_name,
    description: matchingEvent.value.description || props.item.event_description,
    icon: matchingEvent.value.icon || props.item.event_icon,
    schedule: matchingEvent.value.schedule || props.item.event_schedule,
    start_at: matchingEvent.value.start_at || props.item.start_at,
    end_at: matchingEvent.value.end_at || props.item.end_at,
    ended_at: props.item.ended_at
  }
  modalStore.open('EventDetail', {
    event: fullEvent
  })
}

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
      y: HOVER_TRANSLATE_Y_PX,
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(btn, {
      y: 0,
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform'
    })
  }
}

const onDiscardHover = (event: MouseEvent, isEntering: boolean) => {
  onBtnHover(event, isEntering)
}

const onDiscardClick = (awardId?: string) => {
  if (!awardId) return
  if (modalStore.isOpen('Confirm')) return
  modalStore.open('Confirm', {
    title: '¿DESCARTAR RECOMPENSA?',
    message: `¿Estás seguro de que deseas descartar la recompensa de "${displayName.value}"? Esta acción no se puede deshacer y se eliminará permanentemente.`,
    confirmText: 'DESCARTAR',
    cancelText: 'CANCELAR',
    type: 'danger',
    variant: 'retro',
    onConfirm: async () => {
      await eventStore.discardAward(awardId)
    }
  })
}

const onInfoBtnHover = (event: MouseEvent, isEntering: boolean) => {
  const btn = event.currentTarget as HTMLElement
  if (!btn || btn.hasAttribute('disabled')) return
  if (isEntering) {
    gsap.to(btn, {
      background: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'rgba(255, 215, 0, 0.5)',
      scale: 1.1,
      duration: HOVER_ANIMATION_DURATION_SEC,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(btn, {
      background: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(255, 255, 255, 0.15)',
      scale: 1,
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
    const year = String(zdt.year)
    const hour = String(zdt.hour).padStart(2, '0')
    const minute = String(zdt.minute).padStart(2, '0')
    return `${day}/${month}/${year} · ${hour}:${minute} hs`
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
  const scheduleSource = item.event_schedule || matchingEvent.value?.schedule
  const startAtSource = item.start_at || matchingEvent.value?.start_at
  const endAtSource = item.end_at || matchingEvent.value?.end_at
  const endedAtSource = item.ended_at || endAtSource

  // 1. Check absolute start_at & end_at
  if (startAtSource && endAtSource) {
    try {
      const sInstant = Temporal.Instant.from(startAtSource).toZonedDateTimeISO(GAME_TIMEZONE)
      const eInstant = Temporal.Instant.from(endAtSource).toZonedDateTimeISO(GAME_TIMEZONE)
      const sDay = String(sInstant.day).padStart(2, '0')
      const sMonth = String(sInstant.month).padStart(2, '0')
      const sYear = String(sInstant.year)
      const sH = `${String(sInstant.hour).padStart(2, '0')}:${String(sInstant.minute).padStart(2, '0')}`

      const eDay = String(eInstant.day).padStart(2, '0')
      const eMonth = String(eInstant.month).padStart(2, '0')
      const eYear = String(eInstant.year)
      const eH = `${String(eInstant.hour).padStart(2, '0')}:${String(eInstant.minute).padStart(2, '0')}`

      if (sDay === eDay && sMonth === eMonth && sYear === eYear) {
        return `${sDay}/${sMonth}/${sYear} · De ${sH} a ${eH} hs`
      }
      return `Del ${sDay}/${sMonth}/${sYear} ${sH} hs al ${eDay}/${eMonth}/${eYear} ${eH} hs`
    } catch {
      // ignore
    }
  }

  // 2. Check schedule object (e.g. startHour, endHour)
  const sched = parseSchedule(scheduleSource)
  if (sched && (typeof sched.startHour === 'number' || typeof sched.endHour === 'number')) {
    let datePrefix = ''
    if (endedAtSource) {
      try {
        const instant = Temporal.Instant.from(endedAtSource).toZonedDateTimeISO(GAME_TIMEZONE)
        const day = String(instant.day).padStart(2, '0')
        const month = String(instant.month).padStart(2, '0')
        const year = String(instant.year)
        datePrefix = `${day}/${month}/${year}`
      } catch {
        datePrefix = ''
      }
    }

    const startH = typeof sched.startHour === 'number' ? sched.startHour : 0
    const endH = typeof sched.endHour === 'number' ? sched.endHour : 24
    const formatH = (hr: number) => {
      const h = Math.floor(hr)
      const m = Math.round((hr % 1) * 60)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    const isAllDay = startH === 0 && (endH >= 23.9 || endH === 24)
    const timeRange = isAllDay ? 'De 00:00 a 23:59 hs' : `De ${formatH(startH)} a ${formatH(endH)} hs`
    return datePrefix ? `${datePrefix} · ${timeRange}` : timeRange
  }

  // 3. Fallback to single timestamp
  return formatDate(endedAtSource)
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
    let catName = w.category_name
    if (!catName || catName.includes('Genética') || catName.includes('Titán') || catName.includes('Miniatura') || catName.includes('Envergadura') || catName.includes('Gran Salto') || catName.includes('Masa')) {
      const speciesSuffix = catId.includes('_') ? ` (${catId.split('_').slice(1).join('_').toUpperCase()})` : ''
      catName = (
        catId.startsWith('weight') ? 'Mayor/Menor Peso' :
        catId.startsWith('height') ? 'Mayor/Menor Altura' :
        catId.startsWith('level') ? 'Mayor Nivel' :
        catId.startsWith('friendship') ? 'Mayor Amistad' :
        'Mayor IVs'
      ) + speciesSuffix
    }
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
  if (catId.startsWith('ivs')) return '🧬'
  if (catId.startsWith('weight')) return '⚖️'
  if (catId.startsWith('height')) return '📏'
  if (catId.startsWith('level')) return '📈'
  if (catId.startsWith('friendship')) return '💖'
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
        <span class="emoji event-icon">{{ item.event_icon }}</span>
        <div class="event-title-group">
          <div class="event-title-row">
            <h4 class="event-name">
              {{ displayName }}
            </h4>
            <PVTooltip
              :title="canOpenDetail ? 'Ver detalles y reglas del evento' : 'Detalles no disponibles (evento archivado)'"
              position="top"
            >
              <button
                :id="'past-event-info-btn-' + (item.id || item.event_id)"
                class="event-info-btn"
                :class="{ 'disabled-btn': !canOpenDetail }"
                :disabled="!canOpenDetail"
                @mouseenter="onInfoBtnHover($event, true)"
                @mouseleave="onInfoBtnHover($event, false)"
                @click.stop="openEventDetail"
              >
                <span class="emoji info-icon">ℹ️</span>
              </button>
            </PVTooltip>
          </div>
          <span class="event-date">{{ formatEventScheduleWindow(item) }}</span>
        </div>
      </div>

      <!-- Claim Status / Button -->
      <div class="award-action-slot">
        <template v-if="item.hasUnclaimedAward && item.myAward?.id">
          <button
            v-if="isAwardClaimable(item.myAward, eventStore.allEvents)"
            :id="'claim-past-award-btn-' + (item.myAward?.id || item.id)"
            class="retro-btn claim-btn"
            @mouseenter="onBtnHover($event, true)"
            @mouseleave="onBtnHover($event, false)"
            @click.stop="onClaimClick(item.myAward.id)"
          >
            <span class="emoji">🎁</span>
            RECLAMAR PREMIO
          </button>
          <button
            :id="'discard-past-award-btn-' + (item.myAward?.id || item.id)"
            class="retro-btn discard-btn"
            :class="{ 'only-action': !isAwardClaimable(item.myAward, eventStore.allEvents) }"
            @mouseenter="onDiscardHover($event, true)"
            @mouseleave="onDiscardHover($event, false)"
            @click.stop="onDiscardClick(item.myAward.id)"
          >
            <span class="emoji">🗑️</span>
            DESCARTAR
          </button>
        </template>

        <div
          v-else-if="item.isClaimed"
          class="claimed-badge"
        >
          <span class="emoji">✓</span> RECLAMADA
        </div>

        <div
          v-else-if="item.isWinner"
          class="winner-badge"
        >
          <span class="emoji">🏆</span> GANADOR
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
            <span class="emoji cat-icon">{{ getCategoryIcon(catGroup.categoryId) }}</span>
            <span class="cat-name">{{ catGroup.categoryName }}</span>
          </div>

          <div class="winners-list">
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
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 10px;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;

  .event-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .event-title-group {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .event-title-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
  }

  .event-name {
    @include pixelated;
    font-size: 10px;
    color: var(--white);
    margin: 0;
    line-height: 1.35;
    word-break: break-word;
  }

  .event-info-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    min-width: 20px;
    min-height: 20px;
    padding: 0;
    margin: 0;
    border-radius: 4px;
    background: Rgba(255, 255, 255, 0.08);
    border: 1px solid Rgba(255, 255, 255, 0.2);
    cursor: pointer;
    box-shadow: 0 1px 3px Rgba(0, 0, 0, 0.3);
    flex-shrink: 0;

    .info-icon {
      @include emoji-icon(11px);
    }

    &:hover:not(:disabled) {
      background: Rgba(255, 255, 255, 0.18);
      border-color: Rgba(250, 204, 21, 0.6);
      box-shadow: 0 0 8px Rgba(250, 204, 21, 0.3);
    }

    &:disabled,
    &.disabled-btn {
      opacity: 0.35;
      cursor: not-allowed;
      filter: Grayscale(100%);
      box-shadow: none;
      pointer-events: auto;
    }
  }

  .event-date {
    font-size: 9px;
    color: var(--gray);
    margin-top: 2px;
    line-height: 1.35;
  }
}

.award-action-slot {
  display: flex;
  align-items: center;
  gap: 8px;
}

.retro-btn {
  @include pixelated;
  font-size: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  line-height: 1;

  @include event-award-action-buttons;
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
  line-height: 1.35;
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
    line-height: 1.35;

    .cat-icon {
      font-size: 10px;
    }
  }
}

.winners-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

@media (max-width: 480px) {
  .past-event-card {
    padding: 10px 8px;
  }

  .podium-box {
    padding: 8px 6px;
  }
}
</style>
