<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { onMounted, computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import EventCard from './EventCard.vue'
import PastEventsList from './PastEventsList.vue'
import WorldEventsUpcomingSchedule from './WorldEventsUpcomingSchedule.vue'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import { storeToRefs } from 'pinia'
import EventPendingAwardsBanner from '@/components/events/EventPendingAwardsBanner.vue'
import { getUpcomingEventOccurrences, type Event as GameEvent, type UpcomingEventOccurrence } from '@/logic/events/eventEngine'
import { getServerInstant } from '@/logic/utils/timeUtils'

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
const { allEvents, activeEvents, pastEvents, isLoading } = storeToRefs(eventStore)

const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

const upcomingOccurrences = computed<UpcomingEventOccurrence[]>(() => {
  if (!allEvents.value || allEvents.value.length === 0) return []
  return getUpcomingEventOccurrences(allEvents.value, getServerInstant(), 14)
})

const upcomingEventsToFillModal = computed<UpcomingEventOccurrence[]>(() => {
  const activeCount = activeEvents.value.length
  // When activeCount is odd (e.g. 1 or 3 in a 2-column grid), fill 1 slot to complete the row
  const neededSlots = activeCount % 2 !== 0 ? 1 : 0
  if (neededSlots === 0) return []

  const activeIds = new Set(activeEvents.value.map(e => e.id))
  return upcomingOccurrences.value
    .filter(occ => !activeIds.has(occ.event.id))
    .slice(0, neededSlots)
})

const openEventDetail = (event: GameEvent, occurrence?: UpcomingEventOccurrence) => {
  modalStore.open('EventDetail', {
    event,
    occurrence
  })
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
          <span class="emoji">🏆</span>
          <div class="title-text-wrap">
            <span class="main-title">EVENTOS MUNDIALES</span>
            <span class="sub-title">Compite con entrenadores de todo el mundo</span>
          </div>
        </div>
        <button
          id="events-modal-refresh-btn"
          class="retro-btn refresh"
          :disabled="isLoading"
          @click.stop="eventStore.fetchEvents()"
        >
          REFRESCAR
        </button>
      </div>
    </template>

    <div class="events-modal-content-inner custom-scrollbar">
      <!-- PENDING AWARDS BOX (Canonical Reusable Component) -->
      <EventPendingAwardsBanner />

      <!-- ACTIVE EVENTS GRID -->
      <div class="events-section-block">
        <div class="events-section-header">
          <h3 class="events-section-title">
            <span class="emoji">⚡</span> EVENTOS ACTIVOS AHORA
          </h3>
        </div>

        <div class="events-grid">
          <div
            v-if="activeEvents.length === 0 && upcomingEventsToFillModal.length === 0"
            class="no-events"
          >
            {{ isLoading ? 'Cargando eventos...' : 'No hay eventos activos en este momento.' }}
          </div>

          <!-- Active Events -->
          <EventCard
            v-for="event in activeEvents"
            :key="event.id"
            :event="event"
          />

          <!-- Future Events (Fill gap when 1 or 3 active events) -->
          <EventCard
            v-for="occ in upcomingEventsToFillModal"
            :key="occ.event.id + '_' + occ.startInstant.epochMilliseconds"
            :event="occ.event"
            :occurrence="occ"
          />
        </div>
      </div>

      <!-- UPCOMING 7-DAY SCHEDULE -->
      <WorldEventsUpcomingSchedule
        :all-events="allEvents"
        @open-event-detail="openEventDetail"
      />

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
  min-width: 0;

  .title-icon {
    font-size: 24px;
    filter: Drop-Shadow(0 0 8px Rgba(255, 215, 0, 0.4));
    flex-shrink: 0;
  }

  .title-text-wrap {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .main-title {
    @include pixelated;
    font-size: 14px;
    color: var(--yellow);
    text-shadow: 0 2px 0 var(--black);
    line-height: 1.35;
  }

  .sub-title {
    font-size: 10px;
    color: var(--gray);
    margin-top: 2px;
    line-height: 1.3;
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

  @include event-award-action-buttons;
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

    &.is-legacy {
      background: Rgba(239, 68, 68, 0.04);
      border-color: Rgba(239, 68, 68, 0.2);
    }

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

    .award-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .legacy-badge {
      @include pixelated;
      font-size: 7px;
      padding: 2px 6px;
      border-radius: 4px;
      background: Rgba(239, 68, 68, 0.15);
      border: 1px solid Rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      letter-spacing: 0.5px;
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

    .award-actions-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
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
    line-height: 1.35;
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

@media (max-width: 480px) {
  .events-modal-content-inner {
    padding: 12px 8px;
  }

  .events-title-group {
    gap: 8px;

    .main-title {
      font-size: 12px;
    }

    .sub-title {
      font-size: 9px;
    }
  }

  .events-grid {
    grid-template-columns: 1fr;
  }
}
</style>
