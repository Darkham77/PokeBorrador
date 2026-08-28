<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { onMounted, computed } from 'vue'
import { gsap } from 'gsap'
import BaseModal from '@/components/common/BaseModal.vue'
import EventCard from './EventCard.vue'
import PastEventsList from './PastEventsList.vue'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import { storeToRefs } from 'pinia'
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue'
import { getUpcomingEventOccurrences, type Event as GameEvent, type UpcomingEventOccurrence } from '@/logic/events/eventEngine'
import { getServerInstant, GAME_TIMEZONE } from '@/logic/utils/timeUtils'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  close: []
}>()

const eventStore = useEventStore()
const modalStore = useModalStore()
const { allEvents, activeEvents, pastEvents, pendingAwards, isLoading } = storeToRefs(eventStore)

const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

const upcomingOccurrences = computed(() => {
  return getUpcomingEventOccurrences(allEvents.value || [], getServerInstant(), 7)
})

interface UpcomingDayGroup {
  dateKey: string;
  dateLabel: string;
  dayName: string;
  isToday: boolean;
  occurrences: UpcomingEventOccurrence[];
}

const upcomingDayGroups = computed<UpcomingDayGroup[]>(() => {
  const groups: UpcomingDayGroup[] = []
  const map = new Map<string, UpcomingDayGroup>()

  for (const occ of upcomingOccurrences.value) {
    const zdt = occ.startInstant.toZonedDateTimeISO(GAME_TIMEZONE)
    const dateKey = `${zdt.year}-${String(zdt.month).padStart(2, '0')}-${String(zdt.day).padStart(2, '0')}`
    
    let group = map.get(dateKey)
    if (!group) {
      group = {
        dateKey,
        dateLabel: occ.dateLabel,
        dayName: occ.dayName,
        isToday: occ.dateLabel === 'Hoy',
        occurrences: []
      }
      map.set(dateKey, group)
      groups.push(group)
    }
    group.occurrences.push(occ)
  }

  return groups
})

const openEventDetail = (event: GameEvent) => {
  modalStore.open('EventDetail', {
    event
  })
}

const getEventDisplayName = (eventId: string): string => {
  const ev = (allEvents.value || []).find(e => e.id === eventId)
  if (ev?.name) return ev.name
  if (eventId === 'hora_magikarp') return 'Hora de Pesca del Magikarp'
  return eventId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) // text-ok
}

const parsePrize = (rawPrize: unknown): Record<string, unknown> => {
  if (!rawPrize) return {}
  if (typeof rawPrize === 'string') {
    try {
      return JSON.parse(rawPrize) as Record<string, unknown> // open-record
    } catch {
      return {}
    }
  }
  if (typeof rawPrize === 'object') {
    return rawPrize as Record<string, unknown> // open-record
  }
  return {}
}

const onBtnHover = (event: MouseEvent, isEntering: boolean) => {
  const btn = event.currentTarget as HTMLElement
  if (!btn || btn.hasAttribute('disabled')) return
  const isClaim = btn.classList.contains('claim') || btn.classList.contains('claim-action-btn')
  if (isEntering) {
    gsap.to(btn, {
      background: isClaim ? '#22c55e' : 'rgba(255, 255, 255, 0.12)',
      y: -2,
      borderColor: isClaim ? '#86efac' : 'rgba(255, 255, 255, 0.2)',
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(btn, {
      background: isClaim ? '#16a34a' : 'rgba(255, 255, 255, 0.05)',
      y: 0,
      borderColor: isClaim ? '#4ade80' : 'rgba(255, 255, 255, 0.1)',
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform,background,borderColor'
    })
  }
}

onMounted(() => {
  eventStore.fetchEvents()
  eventStore.checkPendingAwards()
})
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '650px'"
    :height="isSmallScreen ? '100dvh' : 'auto'"
    variant="retro"
    padding="raw"
    accent-color="var(--yellow)"
    @close="emit('close')"
  >
    <template #header>
      <div class="events-modal-header">
        <div class="events-title-group">
          <span class="title-icon">🏆</span>
          <div class="title-text-wrap">
            <span class="main-title">EVENTOS MUNDIALES</span>
            <span class="sub-title">Compite con entrenadores de todo el mundo</span>
          </div>
        </div>
        <button
          id="events-modal-refresh-btn"
          class="retro-btn refresh"
          :disabled="isLoading"
          @mouseenter="onBtnHover($event, true)"
          @mouseleave="onBtnHover($event, false)"
          @click.stop="eventStore.fetchEvents()"
        >
          REFRESCAR
        </button>
      </div>
    </template>

    <div class="events-modal-content-inner custom-scrollbar">
      <!-- PENDING AWARDS BOX (Retro Reward Style) -->
      <div
        v-if="pendingAwards.length > 0"
        class="awards-box"
      >
        <div class="box-inner">
          <h3>🎁 RECOMPENSAS PENDIENTES</h3>
          <div class="awards-list">
            <div
              v-for="award in pendingAwards"
              :key="award.id"
              class="award-item"
            >
              <div class="award-info">
                <span class="award-name">{{ getEventDisplayName(award.event_id || '') }}</span>
                <div class="award-pills-wrap">
                  <RewardPillsGroup :prize="parsePrize(award.prize)" />
                </div>
              </div>
              <button
                :id="'claim-pending-award-btn-' + award.id"
                class="retro-btn claim-action-btn"
                @mouseenter="onBtnHover($event, true)"
                @mouseleave="onBtnHover($event, false)"
                @click.stop="eventStore.claimAward(award.id)"
              >
                RECLAMAR
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ACTIVE EVENTS GRID -->
      <div class="events-section-block">
        <div class="events-section-header">
          <h3 class="events-section-title">
            ⚡ EVENTOS ACTIVOS AHORA
          </h3>
        </div>

        <div class="events-grid">
          <div
            v-if="activeEvents.length === 0"
            class="no-events"
          >
            {{ isLoading ? 'Cargando eventos...' : 'No hay eventos activos en este momento.' }}
          </div>

          <EventCard
            v-for="event in activeEvents"
            :key="event.id"
            :event="event"
          />
        </div>
      </div>

      <!-- UPCOMING 7-DAY SCHEDULE -->
      <div class="events-section-block upcoming-section">
        <div class="events-section-header">
          <div class="section-title-wrap">
            <h3 class="events-section-title">
              📅 PRÓXIMOS EVENTOS (7 DÍAS)
            </h3>
            <span class="events-section-subtitle">Calendario semanal (Hora Argentina ARG)</span>
          </div>
        </div>

        <div class="upcoming-events-grid">
          <div 
            v-if="upcomingDayGroups.length === 0" 
            class="no-events"
          >
            No hay eventos programados para los próximos 7 días.
          </div>

          <div
            v-for="group in upcomingDayGroups"
            :key="group.dateKey"
            class="upcoming-day-group"
          >
            <!-- Day Group Header Divider with Line -->
            <div class="day-group-header">
              <span
                class="day-group-badge pixelated"
                :class="{ 'is-today': group.isToday }"
              >
                {{ group.dateLabel }} · {{ group.dayName }}
              </span>
              <div class="day-group-line" />
            </div>

            <!-- Events List within the same day (Tighter gap) -->
            <div class="day-events-list">
              <div
                v-for="occ in group.occurrences"
                :key="`${occ.event.id}-${occ.startInstant.epochMilliseconds}`"
                class="upcoming-event-card"
                :class="{ 'is-active': occ.isActiveNow }"
                @click.stop="openEventDetail(occ.event)"
              >
                <div class="upcoming-left-column">
                  <div class="upcoming-badge-time">
                    <span class="time-tag pixelated">{{ occ.timeLabel }}</span>
                  </div>

                  <div class="upcoming-main-info">
                    <div class="upcoming-icon">
                      {{ occ.event.icon || '🎁' }}
                    </div>
                    <div class="upcoming-texts">
                      <span class="upcoming-title pixelated">{{ occ.event.name }}</span>
                      <span class="upcoming-desc">{{ occ.event.description }}</span>
                    </div>
                  </div>
                </div>

                <div class="upcoming-right-column">
                  <span
                    v-if="occ.isActiveNow"
                    class="status-live pixelated"
                  >🟢 ACTIVO AHORA</span>
                  <span
                    v-else
                    class="status-starts pixelated"
                  >{{ occ.startsInLabel }}</span>
                  <button class="retro-btn details-btn pixelated">
                    REGLAS Y PREMIOS
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PAST CONCLUDED EVENTS & REWARDS HISTORY -->
      <PastEventsList
        :past-events="pastEvents"
        :is-loading="isLoading"
      />
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.events-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 48px; // Leave space for BaseModal close button
}

.events-title-group {
  display: flex;
  align-items: center;
  gap: 12px;

  .title-icon {
    font-size: 24px;
    filter: Drop-Shadow(0 0 8px Rgba(255, 215, 0, 0.4));
  }

  .title-text-wrap {
    display: flex;
    flex-direction: column;
  }

  .main-title {
    @include pixelated;
    font-size: 14px;
    color: var(--yellow);
    text-shadow: 0 2px 0 var(--black);
    line-height: 1.2;
  }

  .sub-title {
    font-size: 10px;
    color: var(--gray);
    margin-top: 2px;
  }
}

.events-modal-content-inner {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
}

.retro-btn {
  @include pixelated;
  font-size: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  background: Rgba(255, 255, 255, 0.06);
  color: var(--white);
  cursor: pointer;
  box-shadow: 0 2px 0 Rgba(0, 0, 0, 0.4);

  &:hover:not(:disabled) {
    background: Rgba(255, 255, 255, 0.12);
    border-color: Rgba(255, 255, 255, 0.3);
    transform: Translatey(-1px);
  }

  &:active:not(:disabled) {
    transform: Translatey(1px);
    box-shadow: 0 0 0 transparent;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.refresh {
    font-size: 8px;
    padding: 5px 10px;
    background: Rgba(255, 255, 255, 0.08);
    border-color: Rgba(255, 255, 255, 0.2);
    color: var(--yellow);

    &:hover:not(:disabled) {
      background: Rgba(250, 204, 21, 0.15);
      border-color: Rgba(250, 204, 21, 0.4);
    }
  }

  &.claim-action-btn {
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
    }
  }
}

/* REWARD BOX */
.awards-box {
  background: Rgba(34, 197, 94, 0.06);
  border: 1px solid Rgba(34, 197, 94, 0.25);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;

  .box-inner {
    background: Rgba(0, 0, 0, 0.35);
    border-radius: 8px;
    padding: 12px;
  }

  h3 {
    @include pixelated;
    font-size: 9px;
    color: var(--green-bright);
    margin-bottom: 10px;
  }

  .award-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    background: Rgba(255, 255, 255, 0.03);
    border: 1px solid Rgba(255, 255, 255, 0.06);
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .award-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .award-name {
      font-weight: bold;
      font-size: 11px;
      color: var(--white);
    }

    .award-pills-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
  }
}

/* SECTION HEADERS */
.events-section-block {
  display: flex;
  flex-direction: column;
}

.events-section-header {
  margin-bottom: 12px;

  .events-section-title {
    @include pixelated;
    font-size: 11px;
    color: var(--yellow);
    margin: 0;
    line-height: 1;
  }
}

/* GRID */
.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.no-events {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  background: Rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px dashed Rgba(255, 255, 255, 0.1);
  color: var(--gray);
  font-style: italic;
  font-size: 12px;
}

/* UPCOMING 7-DAY SCHEDULE STYLES */
.upcoming-section {
  margin-top: 24px;
  margin-bottom: 24px;
}

.section-title-wrap {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;

  .events-section-subtitle {
    font-size: 9px;
    color: var(--gray);
  }
}

.upcoming-events-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.upcoming-day-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .day-group-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 2px;
    padding: 0 4px;

    .day-group-badge {
      font-size: 8px;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 4px;
      background: Rgba(255, 255, 255, 0.08);
      color: Rgba(255, 255, 255, 0.85);
      border: 1px solid Rgba(255, 255, 255, 0.15);
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &.is-today {
        background: Rgba(74, 222, 128, 0.15);
        color: var(--green-bright);
        border-color: Rgba(74, 222, 128, 0.4);
      }
    }

    .day-group-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, Rgba(255, 255, 255, 0.2) 0%, Rgba(255, 255, 255, 0.03) 100%);
    }
  }

  .day-events-list {
    display: flex;
    flex-direction: column;
    gap: 4px; /* Tighter gap between events of the same day */
  }
}

.upcoming-event-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: Rgba(30, 41, 59, 0.6);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;

  &:hover {
    background: Rgba(30, 41, 59, 0.9);
    border-color: Rgba(250, 204, 21, 0.4);
    transform: Translatey(-2px);
    box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.3);
  }

  &.is-active {
    border-color: Rgba(74, 222, 128, 0.4);
    background: Rgba(22, 101, 52, 0.15);
  }

  .upcoming-left-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .upcoming-badge-time {
    display: flex;
    align-items: center;
    gap: 8px;

    .day-tag {
      font-size: 8px;
      padding: 3px 8px;
      border-radius: 4px;
      background: Rgba(250, 204, 21, 0.15);
      color: var(--yellow);
      border: 1px solid Rgba(250, 204, 21, 0.3);
    }

    .time-tag {
      font-size: 8px;
      color: Rgba(241, 245, 249, 0.8);
      background: Rgba(0, 0, 0, 0.3);
      padding: 3px 6px;
      border-radius: 4px;
      border: 1px solid Rgba(255, 255, 255, 0.05);
    }
  }

  .upcoming-main-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .upcoming-icon {
      font-size: 24px;
      line-height: 1;
      filter: Drop-Shadow(0 2px 6px Rgba(0, 0, 0, 0.4));
    }

    .upcoming-texts {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;

      .upcoming-title {
        font-size: 11px;
        color: var(--white);
        line-height: 1.2;
      }

      .upcoming-desc {
        font-size: 9px;
        color: var(--gray);
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .upcoming-right-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;

    .status-live {
      font-size: 8px;
      color: var(--green-bright);
      background: Rgba(74, 222, 128, 0.15);
      border: 1px solid Rgba(74, 222, 128, 0.3);
      padding: 3px 8px;
      border-radius: 4px;
    }

    .status-starts {
      font-size: 8px;
      color: var(--yellow);
      background: Rgba(250, 204, 21, 0.1);
      border: 1px solid Rgba(250, 204, 21, 0.2);
      padding: 3px 8px;
      border-radius: 4px;
    }

    .details-btn {
      font-size: 7px;
      padding: 4px 8px;
    }
  }
}
</style>
