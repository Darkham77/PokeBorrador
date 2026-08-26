/**
 * Event Engine - Global Event Logic
 * Handles scheduled intervals, bonus multipliers, and competition validation.
 * 
 * Absolute isolation: This module does not store state or connect to DB.
 */

export interface EventConfig {
  expMult?: number;
  moneyMult?: number;
  bcMult?: number;
  shinyMult?: number;
  eggShinyMult?: number;
  hatchMult?: number;
  rivalMult?: number;
  trainerMult?: number;
  fishingMult?: number;
  species?: string;
  speciesRateMult?: number;
  speciesShinyMult?: number;
  ignoreTimeRestrictions?: boolean;
  banner?: string; // domain-ok
  metric?: string; // domain-ok
  hasCompetition?: boolean;
  sortBy?: string; // domain-ok
  requireCaughtDuringEvent?: boolean;
  catchStartDate?: string;
  catchEndDate?: string;
}

export interface EventTimeWindow {
  start: Temporal.Instant;
  end: Temporal.Instant;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  type?: 'competition' | 'boost';
  icon?: string;
  active: boolean;
  manual?: boolean;
  start_at?: string;
  end_at?: string;
  schedule?: string | Record<string, unknown>;
  config?: string | EventConfig;
}

export interface GlobalMultipliers {
  exp: number;
  money: number;
  bc: number;
  shiny: number;
  eggShiny: number;
  hatch: number;
  rival: number;
  trainer: number;
  fishing: number;
  catch: number;
}

const safeParse = (val: string | object | null | undefined): Record<string, unknown> => {
  if (typeof val === 'string') {
    try { return JSON.parse(val) as Record<string, unknown>; } catch (_e) { return {}; } // open-record
  }
  return (val as Record<string, unknown>) || {}; // open-record
};


import { logger } from '../utils/logger.ts'
import { getArgDateString, normalizeZonedDateTime } from '../utils/timeUtils.ts'
export { getArgDateString }

/**
 * Checks if an event is active based on current time (America/Argentina/Buenos_Aires).
 */
export function isEventActiveNow(event: Event, date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()): boolean {
  if (!event.active) return false
  if (event.manual) return true

  const zdt = normalizeZonedDateTime(date)

  // 1. Absolute date check
  if (event.start_at && event.end_at) {
    try {
      const start = Temporal.Instant.from(event.start_at)
      const end = Temporal.Instant.from(event.end_at)
      const current = zdt.toInstant()
      
      if (Temporal.Instant.compare(current, start) >= 0 && Temporal.Instant.compare(current, end) <= 0) {
        return true
      }
    } catch (e) {
      logger.warn('EventEngine', `Invalid date format in event: ${event.id}`, e)
    }
  }

  // 2. Weekly schedule check (Argentina Time UTC-3)
  const sched = safeParse(event.schedule)
  if (!sched || sched.type !== 'weekly' || !sched.days) return false

  // Mapping Temporal (1=Mon, 7=Sun) to JS (0=Sun, 1=Mon)
  const day = zdt.dayOfWeek % 7
  const hour = zdt.hour + zdt.minute / 60

  // Check if today is one of the scheduled days
  const isScheduledToday = (sched.days as number[]).includes(day)
  
  // Check if yesterday was one of the scheduled days (for midnight crossover)
  const yesterday = (day + 6) % 7
  const isScheduledYesterday = (sched.days as number[]).includes(yesterday)

  const start = (sched.startHour as number) ?? 0
  const end = (sched.endHour as number) ?? 24

  if (start < end) {
    // Normal range (e.g., 10 to 18)
    if (isScheduledToday && hour >= start && hour < end) return true
  } else {
    // Midnight crossover (e.g., 22 to 02)
    // 1. Current day after start (e.g., Monday 23:00)
    if (isScheduledToday && hour >= start) return true
    // 2. Next day before end (e.g., Tuesday 01:00)
    if (isScheduledYesterday && hour < end) return true
  }

  return false
}

/**
 * Calculates global multipliers from a list of active events.
 */
export function getGlobalMultipliers(activeEvents: Event[]): GlobalMultipliers {
  const multipliers: GlobalMultipliers = {
    exp: 1,
    money: 1,
    bc: 1,
    shiny: 1,
    eggShiny: 1,
    hatch: 1,
    rival: 1,
    trainer: 1,
    fishing: 1,
    catch: 1
  }

  for (const ev of activeEvents) {
    const cfg = safeParse(ev.config) as EventConfig;
    multipliers.exp *= (cfg.expMult || 1)
    multipliers.money *= (cfg.moneyMult || 1)
    multipliers.bc *= (cfg.bcMult || 1)
    multipliers.shiny *= (cfg.shinyMult || 1)
    multipliers.eggShiny *= (cfg.eggShinyMult || 1)
    multipliers.hatch *= (cfg.hatchMult || 1)
    multipliers.rival *= (cfg.rivalMult || 1)
    multipliers.trainer *= (cfg.trainerMult || 1)
    multipliers.fishing *= (cfg.fishingMult || 1)
  }

  return multipliers
}

import { isPokemonSpeciesId, requirePokemonSpeciesId } from '@/data/pokemon/pokedex';

/**
 * Checks if a specific species has active boosts.
 */
export function getSpeciesBoosts(activeEvents: Event[], speciesId: string): { rate: number; shiny: number } {
  let rateMult = 1
  let shinyMult = 1
  const sId = requirePokemonSpeciesId(speciesId)

  for (const ev of activeEvents) {
    const cfg = safeParse(ev.config) as EventConfig;
    if (!cfg.species) continue

    const speciesList = cfg.species.split(',').map(s => s.trim()).filter(isPokemonSpeciesId)
    if (speciesList.includes(sId)) {
      rateMult *= (cfg.speciesRateMult || 1)
      shinyMult *= (cfg.speciesShinyMult || 1)
    }
  }

  return { rate: rateMult, shiny: shinyMult }
}

import type { Pokemon } from '@/types/pokemon/pokemon';

/**
 * Validates if the new entry is better for a competition.
 * @param {string} sortBy (e.g., 'data.total_ivs', 'data.level')
 */
export function isNewEntryBetter(existingData: unknown, newData: unknown, sortBy: string = 'data.total_ivs'): boolean {
  if (!existingData) return true
  
  const getVal = (obj: unknown, path: string): number => {
    return path.split('.').reduce((acc, part) => (acc as Record<string, unknown>)?.[part], obj) as number || 0 // open-record
  }

  const oldScore = getVal(existingData, sortBy)
  const newScore = getVal(newData, sortBy)

  return newScore > oldScore
}

/**
 * Calculates the start and end Instant of the current active window for an event.
 */
export function getEventCurrentWindow(
  event: Event,
  date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()
): EventTimeWindow | null {
  if (!event.active) return null;

  // 1. Absolute date check
  if (event.start_at && event.end_at) {
    try {
      const start = Temporal.Instant.from(event.start_at);
      const end = Temporal.Instant.from(event.end_at);
      return { start, end };
    } catch (e) {
      logger.warn('EventEngine', `Invalid date format in event: ${event.id}`, e);
    }
  }

  // 2. Weekly schedule check (Argentina Time UTC-3)
  const zdt = normalizeZonedDateTime(date);
  const sched = safeParse(event.schedule);
  if (!sched || sched.type !== 'weekly' || !sched.days) return null;

  // Mapping Temporal (1=Mon, 7=Sun) to JS (0=Sun, 1=Mon)
  const day = zdt.dayOfWeek % 7;
  const hour = zdt.hour + zdt.minute / 60;

  const isScheduledToday = (sched.days as number[]).includes(day);
  const yesterday = (day + 6) % 7;
  const isScheduledYesterday = (sched.days as number[]).includes(yesterday);

  const startHour = (sched.startHour as number) ?? 0;
  const endHour = (sched.endHour as number) ?? 24;

  const buildZdt = (baseZdt: Temporal.ZonedDateTime, hr: number, isEnd = false): Temporal.ZonedDateTime => {
    if (hr >= 24 || (isEnd && hr >= 23.99)) {
      return baseZdt.with({ hour: 23, minute: 59, second: 59, millisecond: 999, microsecond: 0, nanosecond: 0 });
    }
    const h = Math.floor(hr);
    const m = Math.round((hr % 1) * 60);
    return baseZdt.with({ hour: h, minute: m, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
  };

  if (startHour < endHour) {
    if (isScheduledToday && hour >= startHour && hour < endHour) {
      const startZdt = buildZdt(zdt, startHour, false);
      const endZdt = buildZdt(zdt, endHour, true);
      return { start: startZdt.toInstant(), end: endZdt.toInstant() };
    }
  } else {
    // Midnight crossover
    if (isScheduledToday && hour >= startHour) {
      const startZdt = buildZdt(zdt, startHour, false);
      const tomorrowZdt = zdt.add({ days: 1 });
      const endZdt = buildZdt(tomorrowZdt, endHour, true);
      return { start: startZdt.toInstant(), end: endZdt.toInstant() };
    }
    if (isScheduledYesterday && hour < endHour) {
      const yesterdayZdt = zdt.subtract({ days: 1 });
      const startZdt = buildZdt(yesterdayZdt, startHour, false);
      const endZdt = buildZdt(zdt, endHour, true);
      return { start: startZdt.toInstant(), end: endZdt.toInstant() };
    }
  }

  return null;
}

/**
 * Validates if a Pokémon is eligible to be entered/presented into an event based on its species and capture date.
 */
export function isPokemonEligibleForEvent(
  event: Event,
  pokemon: Pokemon,
  date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()
): { eligible: boolean; reason?: string } {
  if (!pokemon) {
    return { eligible: false, reason: 'Pokémon inexistente' };
  }

  const cfg = safeParse(event.config) as EventConfig;

  // 1. Check species if constrained
  if (cfg.species) {
    const allowedSpecies = cfg.species.split(',').map(s => s.trim().toLowerCase());
    const pokeSpecies = String(pokemon.species).toLowerCase();
    if (!allowedSpecies.includes(pokeSpecies)) {
      return { eligible: false, reason: `Especie no permitida. Requiere: ${cfg.species}` };
    }
  }

  // 2. Check capture date if constrained
  if (cfg.requireCaughtDuringEvent) {
    const rawObtainedAt = pokemon.obtainedAt;
    if (typeof rawObtainedAt !== 'number' || isNaN(rawObtainedAt) || rawObtainedAt <= 0) {
      return { eligible: false, reason: 'El Pokémon no tiene fecha de captura registrada' };
    }

    let startMs: number | null = null;
    let endMs: number | null = null;

    if (cfg.catchStartDate && cfg.catchEndDate) {
      try {
        startMs = Temporal.Instant.from(cfg.catchStartDate).epochMilliseconds;
        endMs = Temporal.Instant.from(cfg.catchEndDate).epochMilliseconds;
      } catch (e) {
        logger.warn('EventEngine', 'Invalid catchStartDate/catchEndDate format', e);
      }
    }

    if (startMs === null || endMs === null) {
      const window = getEventCurrentWindow(event, date);
      if (window) {
        startMs = window.start.epochMilliseconds;
        endMs = window.end.epochMilliseconds;
      }
    }

    if (startMs !== null && endMs !== null) {
      if (rawObtainedAt < startMs || rawObtainedAt > endMs) {
        return { eligible: false, reason: 'El Pokémon no fue capturado dentro del periodo del evento' };
      }
    }
  }

  return { eligible: true };
}
