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
  banner?: string;
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
    try { return JSON.parse(val) as Record<string, unknown>; } catch (_e) { return {}; }
  }
  return (val as Record<string, unknown>) || {};
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

/**
 * Checks if a specific species has active boosts.
 */
export function getSpeciesBoosts(activeEvents: Event[], speciesId: string): { rate: number; shiny: number } {
  let rateMult = 1
  let shinyMult = 1
  const sId = speciesId.toLowerCase()

  for (const ev of activeEvents) {
    const cfg = safeParse(ev.config) as EventConfig;
    if (!cfg.species) continue

    const speciesList = cfg.species.split(',').map(s => s.trim().toLowerCase())
    if (speciesList.includes(sId)) {
      rateMult *= (cfg.speciesRateMult || 1)
      shinyMult *= (cfg.speciesShinyMult || 1)
    }
  }

  return { rate: rateMult, shiny: shinyMult }
}

/**
 * Validates if the new entry is better for a competition.
 * @param {string} sortBy (e.g., 'data.total_ivs', 'data.level')
 */
export function isNewEntryBetter(existingData: unknown, newData: unknown, sortBy: string = 'data.total_ivs'): boolean {
  if (!existingData) return true
  
  const getVal = (obj: unknown, path: string): number => {
    return path.split('.').reduce((acc, part) => (acc as Record<string, unknown>)?.[part], obj) as number || 0
  }

  const oldScore = getVal(existingData, sortBy)
  const newScore = getVal(newData, sortBy)

  return newScore > oldScore
}
