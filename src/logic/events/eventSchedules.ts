/**
 * src/logic/events/eventSchedules.ts
 *
 * Event Scheduling, Date Resolution, and Interval Predicates.
 * Handles weekly recurring schedules, monthly triggers, and active time windows.
 */

import { logger } from '@/logic/utils/logger.ts';
import { getArgDateString, normalizeZonedDateTime } from '@/logic/utils/timeUtils.ts';
import { MINUTES_PER_HOUR, HOURS_PER_DAY, MINUTES_PER_DAY, DAYS_PER_WEEK } from '@/logic/constants/gameplay.ts';
import type { Event, EventConfig, WeeklyRotationEntry } from './eventEngine.ts';
import type { PokemonCompetitionTrophy } from '@/types/pokemon/pokemon.ts';

export { getArgDateString };

export interface EventTimeWindow {
  start: Temporal.Instant;
  end: Temporal.Instant;
}

export interface UpcomingEventOccurrence {
  event: Event;
  startInstant: Temporal.Instant;
  endInstant: Temporal.Instant;
  dateLabel: string;
  dayName: string;
  timeLabel: string;
  isActiveNow: boolean;
  startsInLabel: string;
}

export const safeParse = (val: string | object | null | undefined): Record<string, unknown> => {
  if (typeof val === 'string') {
    try {
      const parsed: unknown = JSON.parse(val);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, unknown>; // open-record: Generic key-value data dictionary container
      }
      return {};
    } catch (_e) {
      return {};
    }
  }
  if (typeof val === 'object' && val !== null) {
    return val as Record<string, unknown>; // open-record: Generic key-value data dictionary container
  }
  return {};
};

const WEEK_1_MAX_DAY = 7;
const WEEK_2_MAX_DAY = 14;
const WEEK_3_MAX_DAY = 21;

const END_OF_DAY_HOUR_THRESHOLD = 23.99;
const END_OF_DAY_HOUR = 23;
const END_OF_DAY_MINUTE = 59;
const END_OF_DAY_SECOND = 59;
const END_OF_DAY_MS = 999;

/**
 * Returns the ISO week-of-month (1-4) for a given ZonedDateTime.
 * Week 1 = days 1-7, Week 2 = days 8-14, Week 3 = days 15-21, Week 4 = days 22+.
 */
export function getWeekOfMonth(zdt: Temporal.ZonedDateTime): 1 | 2 | 3 | 4 {
  const day = zdt.day;
  if (day <= WEEK_1_MAX_DAY) return 1;
  if (day <= WEEK_2_MAX_DAY) return 2;
  if (day <= WEEK_3_MAX_DAY) return 3;
  return 4;
}

/**
 * Returns true if the given ZonedDateTime falls on the last Saturday or Sunday of its month.
 */
export function isLastWeekendOfMonth(zdt: Temporal.ZonedDateTime): boolean {
  const jsDay = zdt.dayOfWeek % 7; // 0=Sun, 6=Sat
  if (jsDay !== 0 && jsDay !== 6) return false;
  const nextWeek = zdt.add({ days: 7 });
  return nextWeek.month !== zdt.month;
}

/**
 * Returns true if the given ZonedDateTime falls on the last Sunday of its month.
 */
export function isLastSundayOfMonth(zdt: Temporal.ZonedDateTime): boolean {
  const jsDay = zdt.dayOfWeek % 7; // 0=Sun
  if (jsDay !== 0) return false;
  const nextWeek = zdt.add({ days: 7 });
  return nextWeek.month !== zdt.month;
}

/**
 * Returns true if the given ZonedDateTime falls on Saturday or Sunday of Week 2 (days 8-14) of its month.
 */
export function isSecondWeekendOfMonth(zdt: Temporal.ZonedDateTime): boolean {
  const jsDay = zdt.dayOfWeek % 7; // 0=Sun, 6=Sat
  if (jsDay !== 0 && jsDay !== 6) return false;
  return getWeekOfMonth(zdt) === 2;
}

/**
 * Returns true if the given ZonedDateTime matches the configured monthly trigger.
 */
function isMonthlyTriggerMatch(trigger: string | undefined, zdt: Temporal.ZonedDateTime): boolean {
  if (trigger === 'last_sunday') return isLastSundayOfMonth(zdt);
  if (trigger === 'second_weekend') return isSecondWeekendOfMonth(zdt);
  if (trigger === 'last_weekend') return isLastWeekendOfMonth(zdt);
  return false;
}

/**
 * Resolves the active config (species, banner, title) for a rotation event based on current week of month or target species.
 */
export function resolveWeeklyRotation( // domain-ok: Open dynamic text or non-domain string payload
  cfg: EventConfig,
  zdtOrSpecies?: Temporal.ZonedDateTime | string | null
): WeeklyRotationEntry | null {
  if (cfg.rotationTheme !== 'weekly_4' || !cfg.weeklyRotations) return null;

  // 1. If a species name is provided, match by species
  if (typeof zdtOrSpecies === 'string' && zdtOrSpecies.trim().length > 0) {
    const targetSp = zdtOrSpecies.trim().toLowerCase();
    for (const rotation of Object.values(cfg.weeklyRotations)) {
      if (!rotation || !rotation.species) continue;
      const rotSpecies = rotation.species.split(',').map(s => s.trim().toLowerCase());
      if (rotSpecies.includes(targetSp)) {
        return rotation;
      }
    }
  }

  // 2. Otherwise match by week of month from ZonedDateTime
  const zdt = (zdtOrSpecies && typeof zdtOrSpecies === 'object' && 'day' in zdtOrSpecies)
    ? zdtOrSpecies
    : normalizeZonedDateTime();
  const week = getWeekOfMonth(zdt);
  return (cfg.weeklyRotations[String(week)] as WeeklyRotationEntry | undefined) ?? null;
}

/**
 * Single source of truth for resolving an event's display name directly from its database row (event.config / event.name).
 * Supports resolving by specific occurrence, ZonedDateTime, or specific Pokemon species ID / name.
 */
export function getEventDisplayName(
  event: Event,
  zdtOrOccurrenceOrSpecies?: Temporal.ZonedDateTime | UpcomingEventOccurrence | string | null
): string {
  const cfg = safeParse(event.config) as EventConfig;

  // 1. If species string is passed, resolve directly by rotation species
  if (typeof zdtOrOccurrenceOrSpecies === 'string' && zdtOrOccurrenceOrSpecies.trim().length > 0) {
    const rotationBySpecies = resolveWeeklyRotation(cfg, zdtOrOccurrenceOrSpecies);
    if (rotationBySpecies?.title) return rotationBySpecies.title;
  }

  let zdt: Temporal.ZonedDateTime;

  if (zdtOrOccurrenceOrSpecies && typeof zdtOrOccurrenceOrSpecies === 'object' && 'startInstant' in zdtOrOccurrenceOrSpecies) {
    zdt = normalizeZonedDateTime(zdtOrOccurrenceOrSpecies.startInstant);
  } else if (zdtOrOccurrenceOrSpecies && typeof zdtOrOccurrenceOrSpecies === 'object' && 'day' in zdtOrOccurrenceOrSpecies) {
    zdt = zdtOrOccurrenceOrSpecies;
  } else {
    const upcoming = getUpcomingEventOccurrences([event], normalizeZonedDateTime().toInstant(), 7);
    if (upcoming.length > 0 && upcoming[0]) {
      zdt = normalizeZonedDateTime(upcoming[0].startInstant);
    } else {
      zdt = normalizeZonedDateTime();
    }
  }

  const rotation = resolveWeeklyRotation(cfg, zdt);
  return rotation?.title || event.name;
}

/**
 * Resolves the thematic competition name for a trophy awarded to a Pokemon.
 * Tries matching by species first, then by awarded date, with fallback to event name or trophy.eventName.
 */
export function resolveTrophyDisplayName(
  trophy: PokemonCompetitionTrophy,
  allEvents: readonly Event[],
  speciesOrName?: string
): string {
  const event = allEvents.find(e => e.id === trophy.eventId);
  if (!event) return trophy.eventName;

  if (speciesOrName) {
    const bySpecies = getEventDisplayName(event, speciesOrName);
    if (bySpecies && bySpecies !== event.name) {
      return bySpecies;
    }
  }

  if (trophy.awardedAt) {
    try {
      const zdt = Temporal.Instant.fromEpochMilliseconds(trophy.awardedAt).toZonedDateTimeISO(normalizeZonedDateTime().timeZoneId);
      const byDate = getEventDisplayName(event, zdt);
      if (byDate && byDate !== event.name) {
        return byDate;
      }
    } catch (err) {
      logger.warn('[eventSchedules] Error parseando trophy.awardedAt:', trophy.awardedAt, err);
    }
  }

  return getEventDisplayName(event, null) || trophy.eventName;
}

/**
 * Checks if an event is active based on current time (America/Argentina/Buenos_Aires).
 */
function isAbsoluteEventActive(event: Event, current: Temporal.Instant): boolean {
  if (!event.start_at || !event.end_at) return false;
  try {
    const start = Temporal.Instant.from(event.start_at);
    const end = Temporal.Instant.from(event.end_at);
    return Temporal.Instant.compare(current, start) >= 0 && Temporal.Instant.compare(current, end) <= 0;
  } catch (e) {
    logger.warn('EventEngine', `Invalid date format in event: ${event.id}`, e);
    return false;
  }
}

function isMonthlyScheduleActive(sched: Record<string, unknown>, zdt: Temporal.ZonedDateTime): boolean {
  const trigger = sched.trigger as string | undefined;
  if (!isMonthlyTriggerMatch(trigger, zdt)) return false;
  const startHour = (sched.startHour as number) ?? 0;
  const endHour = (sched.endHour as number) ?? END_OF_DAY_HOUR_THRESHOLD;
  const hour = zdt.hour + zdt.minute / MINUTES_PER_HOUR;
  return hour >= startHour && hour < endHour;
}

const PREVIOUS_DAY_OFFSET = 6;

function isWeeklyScheduleActive(sched: Record<string, unknown>, zdt: Temporal.ZonedDateTime): boolean {
  if (!sched.days || sched.type !== 'weekly') return false;
  const day = zdt.dayOfWeek % DAYS_PER_WEEK;
  const hour = zdt.hour + zdt.minute / MINUTES_PER_HOUR;
  const isScheduledToday = (sched.days as number[]).includes(day);
  const yesterday = (day + PREVIOUS_DAY_OFFSET) % DAYS_PER_WEEK;
  const isScheduledYesterday = (sched.days as number[]).includes(yesterday);

  const start = (sched.startHour as number) ?? 0;
  const end = (sched.endHour as number) ?? HOURS_PER_DAY;

  if (start < end) {
    return isScheduledToday && hour >= start && hour < end;
  }
  return (isScheduledToday && hour >= start) || (isScheduledYesterday && hour < end);
}

/**
 * Checks if an event is active based on current time (America/Argentina/Buenos_Aires).
 */
export function isEventActiveNow(event: Event, date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()): boolean {
  if (!event.active) return false;
  if (event.manual) return true;

  const zdt = normalizeZonedDateTime(date);
  if (isAbsoluteEventActive(event, zdt.toInstant())) {
    return true;
  }

  const sched = safeParse(event.schedule);
  if (!sched) return false;

  if (sched.type === 'monthly') {
    return isMonthlyScheduleActive(sched, zdt);
  }

  return isWeeklyScheduleActive(sched, zdt);
}

function buildWindowZdt(baseZdt: Temporal.ZonedDateTime, hr: number, isEnd = false): Temporal.ZonedDateTime {
  if (hr >= HOURS_PER_DAY || (isEnd && hr >= END_OF_DAY_HOUR_THRESHOLD)) {
    return baseZdt.with({ hour: END_OF_DAY_HOUR, minute: END_OF_DAY_MINUTE, second: END_OF_DAY_SECOND, millisecond: END_OF_DAY_MS, microsecond: 0, nanosecond: 0 });
  }
  const h = Math.floor(hr);
  const m = Math.round((hr % 1) * MINUTES_PER_HOUR);
  return baseZdt.with({ hour: h, minute: m, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
}

function getAbsoluteEventWindow(event: Event): EventTimeWindow | null {
  if (!event.start_at || !event.end_at) return null;
  try {
    const start = Temporal.Instant.from(event.start_at);
    const end = Temporal.Instant.from(event.end_at);
    return { start, end };
  } catch (e) {
    logger.warn('EventEngine', `Invalid date format in event: ${event.id}`, e);
    return null;
  }
}

function getMonthlyWeekendWindow(
  zdt: Temporal.ZonedDateTime,
  hour: number,
  startHour: number,
  endHour: number
): EventTimeWindow | null {
  const jsDay = zdt.dayOfWeek % 7; // 0=Sun, 6=Sat
  if (jsDay === 6 && hour >= startHour) {
    const startZdt = buildWindowZdt(zdt, startHour, false);
    const sundayZdt = zdt.add({ days: 1 });
    const endZdt = buildWindowZdt(sundayZdt, endHour, true);
    return { start: startZdt.toInstant(), end: endZdt.toInstant() };
  }
  if (jsDay === 0 && hour < endHour) {
    const saturdayZdt = zdt.subtract({ days: 1 });
    const startZdt = buildWindowZdt(saturdayZdt, startHour, false);
    const endZdt = buildWindowZdt(zdt, endHour, true);
    return { start: startZdt.toInstant(), end: endZdt.toInstant() };
  }
  return null;
}

function getMonthlyEventWindow(
  sched: Record<string, unknown>,
  zdt: Temporal.ZonedDateTime
): EventTimeWindow | null {
  const trigger = sched.trigger as string | undefined;
  if (!isMonthlyTriggerMatch(trigger, zdt)) return null;

  const startHour = (sched.startHour as number) ?? 0;
  const endHour = (sched.endHour as number) ?? 24;
  const hour = zdt.hour + zdt.minute / 60;

  if (trigger === 'last_sunday') {
    if (hour >= startHour && hour < endHour) {
      const startZdt = buildWindowZdt(zdt, startHour, false);
      const endZdt = buildWindowZdt(zdt, endHour, true);
      return { start: startZdt.toInstant(), end: endZdt.toInstant() };
    }
    return null;
  }

  if (trigger === 'second_weekend' || trigger === 'last_weekend') {
    return getMonthlyWeekendWindow(zdt, hour, startHour, endHour);
  }

  return null;
}

function getWeeklyEventWindow(
  sched: Record<string, unknown>,
  zdt: Temporal.ZonedDateTime
): EventTimeWindow | null {
  const day = zdt.dayOfWeek % 7;
  const hour = zdt.hour + zdt.minute / 60;
  const days = sched.days as number[];

  const isScheduledToday = days.includes(day);
  const yesterday = (day + 6) % 7;
  const isScheduledYesterday = days.includes(yesterday);

  const startHour = (sched.startHour as number) ?? 0;
  const endHour = (sched.endHour as number) ?? 24;

  if (startHour < endHour) {
    if (isScheduledToday && hour >= startHour && hour < endHour) {
      const startZdt = buildWindowZdt(zdt, startHour, false);
      const endZdt = buildWindowZdt(zdt, endHour, true);
      return { start: startZdt.toInstant(), end: endZdt.toInstant() };
    }
    return null;
  }

  // Midnight crossover
  if (isScheduledToday && hour >= startHour) {
    const startZdt = buildWindowZdt(zdt, startHour, false);
    const tomorrowZdt = zdt.add({ days: 1 });
    const endZdt = buildWindowZdt(tomorrowZdt, endHour, true);
    return { start: startZdt.toInstant(), end: endZdt.toInstant() };
  }
  if (isScheduledYesterday && hour < endHour) {
    const yesterdayZdt = zdt.subtract({ days: 1 });
    const startZdt = buildWindowZdt(yesterdayZdt, startHour, false);
    const endZdt = buildWindowZdt(zdt, endHour, true);
    return { start: startZdt.toInstant(), end: endZdt.toInstant() };
  }

  return null;
}

/**
 * Calculates the start and end Instant of the current active window for an event.
 */
export function getEventCurrentWindow(
  event: Event,
  date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()
): EventTimeWindow | null {
  if (!event.active) return null;

  const absolute = getAbsoluteEventWindow(event);
  if (absolute) return absolute;

  const zdt = normalizeZonedDateTime(date);
  const sched = safeParse(event.schedule);
  if (!sched) return null;

  if (sched.type === 'monthly') {
    return getMonthlyEventWindow(sched, zdt);
  }

  if (sched.type === 'weekly' && Array.isArray(sched.days)) {
    return getWeeklyEventWindow(sched, zdt);
  }

  return null;
}

function calculateStartsInLabel(isActive: boolean, startInst: Temporal.Instant, nowInstant: Temporal.Instant): string {
  if (isActive) return 'Activo ahora';
  const diffMinutes = Math.max(0, Math.floor(startInst.since(nowInstant).total({ unit: 'minute' })));
  if (diffMinutes < MINUTES_PER_HOUR) {
    return `En ${diffMinutes}m`;
  }
  if (diffMinutes < MINUTES_PER_DAY) {
    const h = Math.floor(diffMinutes / MINUTES_PER_HOUR);
    return `En ${h}h`;
  }
  const d = Math.floor(diffMinutes / MINUTES_PER_DAY);
  return `En ${d} día${d > 1 ? 's' : ''}`;
}

const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;
const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

function formatEventHour(hr: number): string {
  const h = Math.floor(hr);
  const m = Math.round((hr % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatEventTimeRange(startHour: number, endHour: number): string {
  const isAllDay = startHour === 0 && (endHour >= 23.9 || endHour === 24);
  return isAllDay ? 'Todo el día' : `${formatEventHour(startHour)} – ${formatEventHour(endHour)} hs`;
}

function buildDailyOccurrence(
  event: Event,
  targetDay: Temporal.ZonedDateTime,
  offset: number,
  startHour: number,
  endHour: number,
  nowInstant: Temporal.Instant,
  maxInstant: Temporal.Instant
): UpcomingEventOccurrence | null {
  const jsDay = targetDay.dayOfWeek % 7;
  const startZdt = targetDay.with({ hour: startHour, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
  const endZdt = startHour < endHour
    ? targetDay.with({ hour: endHour, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 })
    : targetDay.add({ days: 1 }).with({ hour: endHour, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });

  const startInst = startZdt.toInstant();
  const endInst = endZdt.toInstant();

  if (Temporal.Instant.compare(endInst, nowInstant) <= 0 || Temporal.Instant.compare(startInst, maxInstant) > 0) {
    return null;
  }

  const isActive = Temporal.Instant.compare(nowInstant, startInst) >= 0 && Temporal.Instant.compare(nowInstant, endInst) < 0;
  const shortDay = DAY_NAMES_SHORT[jsDay] ?? 'Día';
  const fullDay = DAY_NAMES_FULL[jsDay] ?? 'Día';
  const dateLabel = offset === 0 ? 'Hoy' : offset === 1 ? 'Mañana' : `${shortDay} ${targetDay.day}/${targetDay.month}`;

  return {
    event,
    startInstant: startInst,
    endInstant: endInst,
    dateLabel,
    dayName: fullDay,
    timeLabel: formatEventTimeRange(startHour, endHour),
    isActiveNow: isActive,
    startsInLabel: calculateStartsInLabel(isActive, startInst, nowInstant)
  };
}

function collectWeeklyOccurrences(
  event: Event,
  sched: Record<string, unknown>, // open-record: Generic key-value data dictionary container
  zdtNow: Temporal.ZonedDateTime,
  daysAhead: number,
  nowInstant: Temporal.Instant,
  maxInstant: Temporal.Instant
): UpcomingEventOccurrence[] {
  const occurrences: UpcomingEventOccurrence[] = [];
  if (!Array.isArray(sched.days)) return occurrences;
  const days = sched.days as number[];
  const startHour = (sched.startHour as number) ?? 0;
  const endHour = (sched.endHour as number) ?? 24;

  for (let offset = 0; offset <= daysAhead; offset++) {
    const targetDay = zdtNow.add({ days: offset });
    const jsDay = targetDay.dayOfWeek % 7;
    if (days.includes(jsDay)) {
      const occ = buildDailyOccurrence(event, targetDay, offset, startHour, endHour, nowInstant, maxInstant);
      if (occ) occurrences.push(occ);
    }
  }
  return occurrences;
}

function collectMonthlyOccurrences(
  event: Event,
  sched: Record<string, unknown>, // open-record: Generic key-value data dictionary container
  zdtNow: Temporal.ZonedDateTime,
  daysAhead: number,
  nowInstant: Temporal.Instant,
  maxInstant: Temporal.Instant
): UpcomingEventOccurrence[] {
  const occurrences: UpcomingEventOccurrence[] = [];
  const trigger = sched.trigger as string | undefined;
  const startHour = (sched.startHour as number) ?? 0;
  const endHour = (sched.endHour as number) ?? 24;

  for (let offset = 0; offset <= daysAhead; offset++) {
    const targetDay = zdtNow.add({ days: offset });
    if (isMonthlyTriggerMatch(trigger, targetDay)) {
      const occ = buildDailyOccurrence(event, targetDay, offset, startHour, endHour, nowInstant, maxInstant);
      if (occ) occurrences.push(occ);
    }
  }
  return occurrences;
}

function formatStaticDateLabels(
  startZdt: Temporal.ZonedDateTime,
  endZdt: Temporal.ZonedDateTime,
  startInst: Temporal.Instant,
  nowInstant: Temporal.Instant
): { dateLabel: string; timeLabel: string; fullDayStart: string } {
  const jsDayStart = startZdt.dayOfWeek % DAYS_PER_WEEK;
  const jsDayEnd = endZdt.dayOfWeek % DAYS_PER_WEEK;

  const isSameDay = startZdt.year === endZdt.year && startZdt.month === endZdt.month && startZdt.day === endZdt.day;
  const isStartOfDay = startZdt.hour === 0 && startZdt.minute === 0;
  const isEndOfDay = (endZdt.hour === END_OF_DAY_HOUR && endZdt.minute >= END_OF_DAY_MINUTE) || (endZdt.hour === 0 && endZdt.minute === 0);
  const isAllDay = isStartOfDay && isEndOfDay;

  const shortDayStart = DAY_NAMES_SHORT[jsDayStart] ?? 'Día';
  const shortDayEnd = DAY_NAMES_SHORT[jsDayEnd] ?? 'Día';
  const fullDayStart = DAY_NAMES_FULL[jsDayStart] ?? 'Día';

  const formatTime = (timeZdt: Temporal.ZonedDateTime) =>
    `${String(timeZdt.hour).padStart(2, '0')}:${String(timeZdt.minute).padStart(2, '0')}`;

  if (isSameDay) {
    const diffDays = Math.floor(startInst.since(nowInstant).total({ unit: 'day' }));
    const dateLabel = diffDays === 0 ? 'Hoy' : diffDays === 1 ? 'Mañana' : `${shortDayStart} ${startZdt.day}/${startZdt.month}`;
    const timeLabel = isAllDay ? 'Todo el día' : `${formatTime(startZdt)} – ${formatTime(endZdt)} hs`;
    return { dateLabel, timeLabel, fullDayStart };
  }

  return {
    dateLabel: `${shortDayStart} ${startZdt.day}/${startZdt.month} al ${shortDayEnd} ${endZdt.day}/${endZdt.month}`,
    timeLabel: isAllDay ? 'Todo el día' : `${formatTime(startZdt)} al ${formatTime(endZdt)} hs`,
    fullDayStart
  };
}

function collectStaticDateOccurrences(
  event: Event,
  nowInstant: Temporal.Instant,
  maxInstant: Temporal.Instant
): UpcomingEventOccurrence[] {
  const occurrences: UpcomingEventOccurrence[] = [];
  if (!event.start_at || !event.end_at) return occurrences;

  try {
    const startInst = Temporal.Instant.from(event.start_at);
    const endInst = Temporal.Instant.from(event.end_at);

    if (Temporal.Instant.compare(endInst, nowInstant) > 0 && Temporal.Instant.compare(startInst, maxInstant) <= 0) {
      const isActive = Temporal.Instant.compare(nowInstant, startInst) >= 0 && Temporal.Instant.compare(nowInstant, endInst) < 0;
      const startZdt = normalizeZonedDateTime(startInst);
      const endZdt = normalizeZonedDateTime(endInst);
      const { dateLabel, timeLabel, fullDayStart } = formatStaticDateLabels(startZdt, endZdt, startInst, nowInstant);

      occurrences.push({
        event,
        startInstant: startInst,
        endInstant: endInst,
        dateLabel,
        dayName: fullDayStart,
        timeLabel,
        isActiveNow: isActive,
        startsInLabel: calculateStartsInLabel(isActive, startInst, nowInstant)
      });
    }
  } catch (e) {
    logger.warn('EventEngine', `Invalid date format in event: ${event.id}`, e);
  }
  return occurrences;
}

/**
 * Calculates all upcoming and active event occurrences within the next X days (defaults to 7).
 */
export function getUpcomingEventOccurrences(
  events: Event[],
  nowInstant: Temporal.Instant = Temporal.Now.instant(),
  daysAhead = 7
): UpcomingEventOccurrence[] {
  const zdtNow = normalizeZonedDateTime(nowInstant);
  const occurrences: UpcomingEventOccurrence[] = [];
  const maxInstant = nowInstant.add({ hours: daysAhead * HOURS_PER_DAY });

  for (const event of events) {
    if (!event.active) continue;

    const sched = safeParse(event.schedule);
    if (sched && sched.type === 'weekly') {
      occurrences.push(...collectWeeklyOccurrences(event, sched, zdtNow, daysAhead, nowInstant, maxInstant));
    } else if (sched && sched.type === 'monthly') {
      occurrences.push(...collectMonthlyOccurrences(event, sched, zdtNow, daysAhead, nowInstant, maxInstant));
    } else if (event.start_at && event.end_at) {
      occurrences.push(...collectStaticDateOccurrences(event, nowInstant, maxInstant));
    }
  }

  return occurrences.sort((a, b) => Temporal.Instant.compare(a.startInstant, b.startInstant));
}
