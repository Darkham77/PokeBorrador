<script setup lang="ts">
import { computed } from 'vue'
import { getUpcomingEventOccurrences, type Event as GameEvent, type UpcomingEventOccurrence } from '@/logic/events/eventEngine'
import { getServerInstant, GAME_TIMEZONE } from '@/logic/utils/timeUtils'

interface Props {
  allEvents: GameEvent[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  openEventDetail: [event: GameEvent]
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
</script>

<template>
  <div class="events-section-block upcoming-section">
    <div class="events-section-header">
      <div class="section-title-wrap">
        <h3 class="events-section-title">
          <span class="section-title-icon">📅</span>
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
            @click.stop="emit('openEventDetail', occ.event)"
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
              ><span class="emoji-inline">🟢</span> ACTIVO AHORA</span>
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
    display: inline-flex;
    align-items: center;
    gap: 6px;
    @include pixelated;
    font-size: 11px;
    color: var(--yellow);
    margin: 0;
    line-height: 1.35;

    .section-title-icon {
      font-size: 12px;
    }
  }
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

.details-btn {
  font-size: 7px;
  padding: 4px 8px;
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
}

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
    gap: 4px;
  }
}

.upcoming-event-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
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
    flex: 1 1 200px;
    min-width: 0;
  }

  .upcoming-badge-time {
    display: flex;
    align-items: center;
    gap: 8px;

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
      flex-shrink: 0;
    }

    .upcoming-texts {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;

      .upcoming-title {
        font-size: 11px;
        color: var(--white);
        line-height: 1.35;
      }

      .upcoming-desc {
        font-size: 9px;
        color: var(--gray);
        line-height: 1.35;
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
      line-height: 1.35;
    }

    .status-starts {
      font-size: 8px;
      color: var(--yellow);
      background: Rgba(250, 204, 21, 0.1);
      border: 1px solid Rgba(250, 204, 21, 0.2);
      padding: 3px 8px;
      border-radius: 4px;
      line-height: 1.35;
    }

    .details-btn {
      font-size: 7px;
      padding: 4px 8px;
    }
  }
}

@media (max-width: 480px) {
  .upcoming-event-card {
    padding: 8px 10px;
    gap: 8px 10px;

    .upcoming-main-info {
      gap: 8px;
    }

    .upcoming-right-column {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding-top: 4px;
      border-top: 1px dashed Rgba(255, 255, 255, 0.06);
    }
  }
}
</style>
