// src/composables/events/useEventDetailBonuses.ts
import { computed, type Ref, type ComputedRef } from 'vue';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import {
  resolveEventSubCompetitions,
  type Event as GameEvent,
  type EventConfig,
  type ResolvedSubCompetition,
  type UpcomingEventOccurrence
} from '@/logic/events/eventEngine';
import type { EventRewardType } from '@/types/system/stores';
import {
  buildCoreBonuses,
  buildSpeciesBonuses,
  buildActivityBonuses,
  buildMinigameBuffBonuses,
  formatWeeklySchedule,
  formatDateRangeSchedule,
  formatEndedAtSchedule,
  resolveInvolvedSpecies
} from './eventDetailBonusesHelper.ts';

export interface Prize extends Record<string, unknown> { // open-record: Generic key-value data dictionary container
  type?: EventRewardType;
  amount?: number;
  qty?: number;
  money?: number;
  battleCoins?: number;
  item?: string;
  items?: Record<string, number>;
  species?: string;
  shiny?: boolean;
  level?: number;
}

export interface ExtendedEventConfig extends EventConfig {
  hasCompetition?: boolean;
  prizes?: {
    first?: Prize;
    second?: Prize;
    third?: Prize;
  };
  sortBy?: string;
}

export interface BonusItem {
  label: string;
  color: string;
  value: string;
}

export interface Schedule {
  type?: string;
  days?: number[];
  startHour?: number;
  endHour?: number;
}

export function useEventDetailBonuses(
  event: GameEvent,
  cfg: Ref<ExtendedEventConfig>,
  targetZdt: ComputedRef<Temporal.ZonedDateTime>,
  effectiveSpeciesString: ComputedRef<string | null>,
  occurrence?: UpcomingEventOccurrence
) {
  const sched = computed<Schedule>(() => {
    if (typeof event.schedule === 'string') {
      try {
        return JSON.parse(event.schedule) as Schedule;
      } catch (_e) {
        return {};
      }
    } else if (event.schedule && typeof event.schedule === 'object') {
      return event.schedule as Schedule;
    }
    return {};
  });

  const prizes = computed<{ first?: Prize; second?: Prize; third?: Prize } | null>(() => {
    const c = cfg.value;
    if (c.hasCompetition !== true || !c.prizes) return null;
    return c.prizes;
  });

  const subCompetitions = computed<ResolvedSubCompetition[]>(() => {
    if (cfg.value.hasCompetition !== true) return [];
    return resolveEventSubCompetitions(event, targetZdt.value);
  });

  const involvedSpecies = computed<PokemonSpeciesId[]>(() => {
    return resolveInvolvedSpecies(effectiveSpeciesString.value, prizes.value, subCompetitions.value);
  });

  const activeBonuses = computed<BonusItem[]>(() => {
    const bonuses: BonusItem[] = [];
    const c = cfg.value;

    bonuses.push(...buildCoreBonuses(c));

    const resolvedSpecies = involvedSpecies.value;
    const spNames = resolvedSpecies.length > 0
      ? resolvedSpecies.map(s => s.toUpperCase()).join(', ') // domain-ok: UI uppercase formatted species list string
      : (effectiveSpeciesString.value && effectiveSpeciesString.value !== '*' ? effectiveSpeciesString.value.toUpperCase() : null); // domain-ok: Open dynamic text or non-domain string payload

    bonuses.push(...buildSpeciesBonuses(c, spNames));
    bonuses.push(...buildActivityBonuses(c));
    bonuses.push(...buildMinigameBuffBonuses(c.minigameBuffs));

    if (c.requireCaughtDuringEvent) {
      bonuses.push({ label: '🕒 Solo se aceptan Pokémon capturados durante este evento', color: 'rgba(250, 204, 21, 1)', value: 'REGLA' });
    }

    return bonuses;
  });

  const scheduleText = computed(() => {
    if (occurrence) {
      const occ = occurrence;
      const dayPrefix = occ.dateLabel === 'Hoy' || occ.dateLabel === 'Mañana'
        ? `${occ.dateLabel} (${occ.dayName})`
        : `${occ.dateLabel} · ${occ.dayName}`;
      return `${dayPrefix} · ${occ.timeLabel} (ARG)`;
    }
    if (event.manual) return '🟢 Evento activo ahora mismo';

    const weekly = formatWeeklySchedule(sched.value);
    if (weekly) return weekly;

    const range = formatDateRangeSchedule(event.start_at, event.end_at);
    if (range) return range;

    const eventWithEndedAt = event as (GameEvent & { ended_at?: string });
    return formatEndedAtSchedule(eventWithEndedAt.ended_at);
  });

  return {
    prizes,
    subCompetitions,
    involvedSpecies,
    activeBonuses,
    scheduleText
  };
}
