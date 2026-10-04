<script setup lang="ts">
import { computed } from 'vue'
import { getUpcomingEventOccurrences, getEventDisplayName, type Event as GameEvent, type UpcomingEventOccurrence } from '@/logic/events/eventEngine'
import { getServerInstant, GAME_TIMEZONE } from '@/logic/utils/timeUtils'

interface Props {
  allEvents: GameEvent[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  openEventDetail: [event: GameEvent, occurrence?: UpcomingEventOccurrence]
}>()

const upcomingOccurrences = computed(() => {
  return getUpcomingEventOccurrences(props.allEvents || [], getServerInstant(), 7)
})

interface UpcomingDayGroup {
  dateKey: string
  dateLabel: string
  dayName: string
  isToday: boolean
  occurrences: UpcomingEventOccurrence[]
}

const upcomingDayGroups = computed<UpcomingDayGroup[]>(() => {
  const groups: UpcomingDayGroup[] = []
  const map = new Map<string, UpcomingDayGroup>()

  for (const occ of upcomingOccurrences.value) {
    const zdt = occ.startInstant.toZonedDateTimeISO(GAME_TIMEZONE)
    const dateKey = `${zdt.year}-${String(zdt.month).padStart(2, '0')}-${String(zdt.day).padStart(2, '0')}`
    
    const group = map.getOrInsertComputed(dateKey, () => {
      const newGroup: UpcomingDayGroup = {
        dateKey,
        dateLabel: occ.dateLabel,
        dayName: occ.dayName,
        isToday: occ.dateLabel === 'Hoy',
        occurrences: []
      }
      groups.push(newGroup)
      return newGroup
    })
    group.occurrences.push(occ)
  }

  return groups
})
</script>

<template>
  <div
    id="upcoming-events-schedule-section"
    class="events-section-block upcoming-section"
  >
    <div class="events-section-header">
      <div class="section-title-wrap">
        <h3 class="events-section-title">
          <span class="emoji section-title-icon">📅</span>
          <span>PRÓXIMOS EVENTOS (7 DÍAS)</span>
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
            @click.stop="emit('openEventDetail', occ.event, occ)"
          >
            <div class="upcoming-left-column">
              <div class="upcoming-badge-time">
                <span class="time-tag pixelated">{{ occ.timeLabel }}</span>
              </div>

              <div class="upcoming-main-info">
                <div class="upcoming-icon emoji">
                  {{ occ.event.icon || '🎁' }}
                </div>
                <div class="upcoming-texts">
                  <span class="upcoming-title pixelated">{{ getEventDisplayName(occ.event, occ) }}</span>
                  <span class="upcoming-desc">{{ occ.event.description }}</span>
                </div>
              </div>
            </div>

            <div class="upcoming-right-column">
              <span
                v-if="occ.isActiveNow"
                class="status-live pixelated"
              ><span class="emoji">🟢</span> ACTIVO AHORA</span>
              <span
                v-else
                class="status-starts pixelated"
              >{{ occ.startsInLabel }}</span>
              <button
                class="retro-btn details-btn pixelated"
                @click.stop="emit('openEventDetail', occ.event, occ)"
              >
                REGLAS Y PREMIOS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.events-section-block {
  display: flex;
  flex-direction: column;
}

.events-section-header {
  margin-bottom: 12px;

  .events-section-title {
    @include pixelated;

    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    color: var(--yellow);
    font-size: 11px;
    line-height: 1.35;

    .section-title-icon {
      font-size: 12px;
    }
  }
}

.no-events {
  padding: 40px;
  border: 1px dashed Rgb(255 255 255 / 10%);
  border-radius: 12px;
  background: Rgb(255 255 255 / 2%);
  color: var(--gray);
  font-size: 12px;
  text-align: center;
  grid-column: 1 / -1;
  font-style: italic;
}

.details-btn {
  padding: 4px 8px;
  border: 1px solid Rgb(255 255 255 / 15%);
  border-radius: 6px;
  background: Rgb(255 255 255 / 6%);
  color: var(--white);
  font-size: 7px;
  cursor: pointer;
  box-shadow: 0 2px 0 Rgb(0 0 0 / 40%);

  &:hover:not(:disabled) {
    background: Rgb(255 255 255 / 12%);
    transform: Translatey(-1px);
    border-color: Rgb(255 255 255 / 30%);
  }

  &:active:not(:disabled) {
    transform: Translatey(1px);
    box-shadow: 0 0 0 transparent;
  }
}

.upcoming-section {
  margin-top: 24px;
  margin-bottom: 24px;
}

.section-title-wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;

  .events-section-subtitle {
    color: var(--gray);
    font-size: 9px;
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
    padding: 0 4px;
    margin-bottom: 2px;

    .day-group-badge {
      padding: 3px 8px;
      border: 1px solid Rgb(255 255 255 / 15%);
      border-radius: 4px;
      background: Rgb(255 255 255 / 8%);
      color: Rgb(255 255 255 / 85%);
      font-size: 8px;
      font-weight: bold;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &.is-today {
        background: Rgb(74 222 128 / 15%);
        color: var(--green-bright);
        border-color: Rgb(74 222 128 / 40%);
      }
    }

    .day-group-line {
      height: 1px;
      background: Linear-Gradient(90deg, Rgb(255 255 255 / 20%) 0%, Rgb(255 255 255 / 3%) 100%);
      flex: 1;
    }
  }

  .day-events-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}

.upcoming-event-card {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px 16px;
  padding: 10px 14px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: 10px;
  background: Rgb(30 41 59 / 60%);
  cursor: pointer;

  &:hover {
    background: Rgb(30 41 59 / 90%);
    transform: Translatey(-2px);
    border-color: Rgb(250 204 21 / 40%);
    box-shadow: 0 4px 12px Rgb(0 0 0 / 30%);
  }

  &.is-active {
    background: Rgb(22 101 52 / 15%);
    border-color: Rgb(74 222 128 / 40%);
  }

  .upcoming-left-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    flex: 1 1 200px;
  }

  .upcoming-badge-time {
    display: flex;
    align-items: center;
    gap: 8px;

    .time-tag {
      padding: 3px 6px;
      border: 1px solid Rgb(255 255 255 / 5%);
      border-radius: 4px;
      background: Rgb(0 0 0 / 30%);
      color: Rgb(241 245 249 / 80%);
      font-size: 8px;
    }
  }

  .upcoming-main-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .upcoming-icon {
      font-size: 24px;
      line-height: 1;
      filter: Drop-Shadow(0 2px 6px Rgb(0 0 0 / 40%));
      flex-shrink: 0;
    }

    .upcoming-texts {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;

      .upcoming-title {
        color: var(--white);
        font-size: 11px;
        line-height: 1.35;
      }

      .upcoming-desc {
        color: var(--gray);
        font-size: 9px;
        line-height: 1.45;
        padding-bottom: 2px;
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
      padding: 3px 8px;
      border: 1px solid Rgb(74 222 128 / 30%);
      border-radius: 4px;
      background: Rgb(74 222 128 / 15%);
      color: var(--green-bright);
      font-size: 8px;
      line-height: 1.35;
    }

    .status-starts {
      padding: 3px 8px;
      border: 1px solid Rgb(250 204 21 / 20%);
      border-radius: 4px;
      background: Rgb(250 204 21 / 10%);
      color: var(--yellow);
      font-size: 8px;
      line-height: 1.35;
    }

    .details-btn {
      padding: 4px 8px;
      font-size: 7px;
    }
  }
}

@media (width <= 480px) {
  .upcoming-event-card {
    gap: 8px 10px;
    padding: 8px 10px;

    .upcoming-main-info {
      gap: 8px;
    }

    .upcoming-right-column {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding-top: 4px;
      border-top: 1px dashed Rgb(255 255 255 / 6%);
    }
  }
}
</style>
