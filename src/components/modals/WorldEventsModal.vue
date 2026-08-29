<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { onMounted, computed } from 'vue'
import { gsap } from 'gsap'
import BaseModal from '@/components/common/BaseModal.vue'
import EventCard from './EventCard.vue'
import PastEventsList from './PastEventsList.vue'
import WorldEventsUpcomingSchedule from './WorldEventsUpcomingSchedule.vue'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import { storeToRefs } from 'pinia'
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue'
import type { Event as GameEvent } from '@/logic/events/eventEngine'

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
</style>
