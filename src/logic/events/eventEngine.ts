/**
 * Event Engine - Global Event Logic
 * Handles scheduled intervals, bonus multipliers, and competition validation.
 * 
 * Absolute isolation: This module does not store state or connect to DB.
 */

export const SUB_COMPETITION_METRICS = ['total_ivs', 'weight', 'height', 'level', 'stat_iv', 'friendship'] as const;
export type SubCompetitionMetric = (typeof SUB_COMPETITION_METRICS)[number];

export const SUB_COMPETITION_ORDERS = ['max', 'min', 'auto'] as const;
export type SubCompetitionOrder = (typeof SUB_COMPETITION_ORDERS)[number];

export const RESOLVED_SUB_COMPETITION_ORDERS = ['max', 'min'] as const;
export type ResolvedSubCompetitionOrder = (typeof RESOLVED_SUB_COMPETITION_ORDERS)[number];

export interface SubCompetitionFilters {
  natures?: string[];
  abilities?: string[];
  gender?: PokemonGender;
  minLevel?: number;
  maxLevel?: number;
  isShinyOnly?: boolean;
}

export interface SubCompetitionConfig {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  metric: SubCompetitionMetric;
  targetStat?: PokemonStatKey;
  order?: SubCompetitionOrder;
  filters?: SubCompetitionFilters;
  prizes?: {
    first?: Record<string, unknown>; // open-record
    second?: Record<string, unknown>; // open-record
    third?: Record<string, unknown>; // open-record
  };
}

export interface SubCompetitionEvaluationResult {
  score: number;
  displayValue: string;
  tierLabel?: string;
  ivs?: Pokemon['ivs'];
}

export interface MinigameEventBuffs {
  encounterRateMult?: number;
  successRateMult?: number;
  rareDropMult?: number;
  shinyMult?: number;
  expMult?: number;
  scoreMult?: number;
  [key: string]: unknown;
}

export interface EventConfig {
  expMult?: number;
  moneyMult?: number;
  bcMult?: number;
  catchRateMult?: number;
  shinyMult?: number;
  eggShinyMult?: number;
  hatchMult?: number;
  rivalMult?: number;
  trainerMult?: number;
  fishingMult?: number;
  archaeologyMult?: number;
  bugCatchingMult?: number;
  casinoLuckyMult?: number;
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
  subCompetitions?: SubCompetitionConfig[];
  minigameBuffs?: Record<string, MinigameEventBuffs>;
  customRules?: Array<{ label: string; value: string; color?: string }>;
  prizes?: {
    first?: Record<string, unknown>; // open-record
    second?: Record<string, unknown>; // open-record
    third?: Record<string, unknown>; // open-record
  };
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
  catch: number;
  catchRate: number;
  shiny: number;
  eggShiny: number;
  hatch: number;
  rival: number;
  trainer: number;
  fishing: number;
  archaeology: number;
  bugCatching: number;
  casinoLucky: number;
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
    catch: 1,
    catchRate: 1,
    shiny: 1,
    eggShiny: 1,
    hatch: 1,
    rival: 1,
    trainer: 1,
    fishing: 1,
    archaeology: 1,
    bugCatching: 1,
    casinoLucky: 1
  }

  for (const ev of activeEvents) {
    const cfg = safeParse(ev.config) as EventConfig;
    multipliers.exp *= (cfg.expMult || 1)
    multipliers.money *= (cfg.moneyMult || 1)
    multipliers.bc *= (cfg.bcMult || 1)
    multipliers.catch *= (cfg.catchRateMult || 1)
    multipliers.catchRate *= (cfg.catchRateMult || 1)
    multipliers.shiny *= (cfg.shinyMult || 1)
    multipliers.eggShiny *= (cfg.eggShinyMult || 1)
    multipliers.hatch *= (cfg.hatchMult || 1)
    multipliers.rival *= (cfg.rivalMult || 1)
    multipliers.trainer *= (cfg.trainerMult || 1)
    multipliers.fishing *= (cfg.fishingMult || 1)
    multipliers.archaeology *= (cfg.archaeologyMult || 1)
    multipliers.bugCatching *= (cfg.bugCatchingMult || 1)
    multipliers.casinoLucky *= (cfg.casinoLuckyMult || 1)
  }

  return multipliers
}

import { isPokemonSpeciesId, requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import { hashString, mulberry32 } from '../utils/math.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import { getPokemonPhysicalWeight, getPokemonPhysicalHeight, getPhysicalDimensionTier } from '../pokemon/physicalDimensionsMath.ts';
import { getPokemonTier } from '../pokemon/tierEngine.ts';
import type { Pokemon, PokemonStatKey, PokemonGender } from '@/types/pokemon/pokemon';

/**
 * Returns the configured or default sub-competitions for an event.
 */
export function getDefaultSubCompetitions(event: Event): SubCompetitionConfig[] {
  const cfg = safeParse(event.config) as EventConfig;
  if (cfg.subCompetitions && Array.isArray(cfg.subCompetitions) && cfg.subCompetitions.length > 0) {
    return cfg.subCompetitions;
  }
  return [
    {
      id: 'ivs',
      name: 'Genética Superior (IVs)',
      description: 'Premia al Pokémon con mayor potencial genético (suma total de IVs).',
      metric: 'total_ivs',
      order: 'max'
    },
    {
      id: 'weight',
      name: 'Masa y Peso (Titán / Miniatura)',
      description: 'Premia al ejemplar con mayor o menor peso según el ciclo del evento.',
      metric: 'weight',
      order: 'auto'
    },
    {
      id: 'height',
      name: 'Envergadura y Altura (Gran Salto)',
      description: 'Premia al ejemplar con mayor o menor altura según el ciclo del evento.',
      metric: 'height',
      order: 'auto'
    }
  ];
}

/**
 * Resolves the deterministic direction ('max' | 'min') for a sub-competition.
 */
export function resolveSubCompetitionDirection(
  eventId: string,
  categoryId: string,
  configuredOrder?: SubCompetitionOrder,
  epochSeed: number = 0
): ResolvedSubCompetitionOrder {
  if (configuredOrder === 'min') return 'min';
  if (configuredOrder === 'max') return 'max';
  if (categoryId === 'ivs') return 'max';

  const hash = hashString(`${eventId}:${categoryId}:${epochSeed}`);
  const prng = mulberry32(hash);
  return prng() >= 0.5 ? 'max' : 'min';
}

/**
 * Evaluates a Pokémon instance against a sub-competition metric.
 */
export function evaluatePokemonForSubCompetition(
  pokemon: Pokemon,
  subComp: SubCompetitionConfig,
  _resolvedOrder: ResolvedSubCompetitionOrder = 'max'
): SubCompetitionEvaluationResult {
  if (!pokemon) {
    return { score: 0, displayValue: '0' };
  }

  if (subComp.metric === 'total_ivs') {
    const ivs = pokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
    const tier = getPokemonTier(pokemon);
    return {
      score: totalIvs,
      displayValue: `${totalIvs} / 186 (${tier.tier})`,
      ivs,
      tierLabel: tier.tier
    };
  }

  if (subComp.metric === 'stat_iv' && subComp.targetStat) {
    const ivs = pokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const statVal = ivs[subComp.targetStat] || 0;
    return {
      score: statVal,
      displayValue: `${statVal} / 31`,
      ivs
    };
  }

  if (subComp.metric === 'weight') {
    const weightNum = getPokemonPhysicalWeight(pokemon);
    const spec = pokemonDataProvider.getPokemonData(pokemon.id, true);
    const baseWeight = spec?.weight || null;
    const tier = getPhysicalDimensionTier(weightNum, baseWeight);
    const maxTarget = baseWeight ? (baseWeight * 1.15).toFixed(1) : null;
    const minTarget = baseWeight ? (baseWeight * 0.85).toFixed(1) : null;
    const targetRef = _resolvedOrder === 'min' ? minTarget : maxTarget;
    const targetStr = targetRef ? ` / ${targetRef} kg` : '';
    return {
      score: Number(weightNum.toFixed(1)),
      displayValue: `${weightNum.toFixed(1)} kg${targetStr} (${tier.label} · ${tier.name})`,
      tierLabel: `${tier.label} · ${tier.name}`
    };
  }

  if (subComp.metric === 'height') {
    const heightNum = getPokemonPhysicalHeight(pokemon);
    const spec = pokemonDataProvider.getPokemonData(pokemon.id, true);
    const baseHeight = spec?.height || null;
    const tier = getPhysicalDimensionTier(heightNum, baseHeight);
    const maxTarget = baseHeight ? (baseHeight * 1.15).toFixed(1) : null;
    const minTarget = baseHeight ? (baseHeight * 0.85).toFixed(1) : null;
    const targetRef = _resolvedOrder === 'min' ? minTarget : maxTarget;
    const targetStr = targetRef ? ` / ${targetRef} m` : '';
    return {
      score: Number(heightNum.toFixed(1)),
      displayValue: `${heightNum.toFixed(1)} m${targetStr} (${tier.label} · ${tier.name})`,
      tierLabel: `${tier.label} · ${tier.name}`
    };
  }

  if (subComp.metric === 'level') {
    const lvl = pokemon.level || 1;
    return {
      score: lvl,
      displayValue: `Nv. ${lvl} / 100`
    };
  }

  if (subComp.metric === 'friendship') {
    const friendship = pokemon.friendship || 0;
    return {
      score: friendship,
      displayValue: `${friendship} / 255`
    };
  }

  return {
    score: 0,
    displayValue: '0'
  };
}

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

/**
 * Calculates aggregated buffs for a specific minigame across all currently active events.
 */
export function getMinigameBuffs(activeEvents: Event[], minigameId: string): MinigameEventBuffs {
  let encounterRateMult = 1;
  let successRateMult = 1;
  let rareDropMult = 1;
  let shinyMult = 1;
  let expMult = 1;
  let scoreMult = 1;

  for (const ev of activeEvents) {
    const cfg = safeParse(ev.config) as EventConfig;
    if (cfg.minigameBuffs && cfg.minigameBuffs[minigameId]) {
      const mb = cfg.minigameBuffs[minigameId];
      if (mb.encounterRateMult) encounterRateMult *= mb.encounterRateMult;
      if (mb.successRateMult) successRateMult *= mb.successRateMult;
      if (mb.rareDropMult) rareDropMult *= mb.rareDropMult;
      if (mb.shinyMult) shinyMult *= mb.shinyMult;
      if (mb.expMult) expMult *= mb.expMult;
      if (mb.scoreMult) scoreMult *= mb.scoreMult;
    }
    // Direct shortcut mappings for standard minigames
    if (minigameId === 'fishing' && cfg.fishingMult) {
      encounterRateMult *= cfg.fishingMult;
    }
    if (minigameId === 'archaeology' && cfg.archaeologyMult) {
      rareDropMult *= cfg.archaeologyMult;
    }
    if (minigameId === 'bug_catching' && cfg.bugCatchingMult) {
      encounterRateMult *= cfg.bugCatchingMult;
    }
    if (minigameId === 'casino' && cfg.casinoLuckyMult) {
      rareDropMult *= cfg.casinoLuckyMult;
    }
  }

  return { encounterRateMult, successRateMult, rareDropMult, shinyMult, expMult, scoreMult };
}

/**
 * Validates if the new entry is better for a competition based on score, shiny advantage, and capture date.
 * Ranking precedence:
 * 1. Metric score comparison (based on order 'max' vs 'min')
 * 2. Shiny status (Shiny always beats non-shiny on tie)
 * 3. Older capture date (lower obtained_at timestamp beats newer capture on tie)
 * @param {string} sortBy (e.g., 'data.score', 'data.total_ivs')
 * @param {'max' | 'min'} order
 */
export function isNewEntryBetter(
  existingData: unknown,
  newData: unknown,
  sortBy: string = 'data.score',
  order: 'max' | 'min' = 'max'
): boolean {
  if (!existingData) return true;
  
  const toRecord = (obj: unknown): Record<string, unknown> | null => {
    return (obj && typeof obj === 'object') ? (obj as Record<string, unknown>) : null; // open-record
  };

  const getVal = (obj: unknown, path: string): number => {
    const rec = toRecord(obj);
    if (!rec) return 0;

    const directVal = path.split('.').reduce((acc: unknown, part: string) => toRecord(acc)?.[part], rec) as number | undefined;
    if (typeof directVal === 'number' && !isNaN(directVal)) return directVal;

    const strippedPath = path.startsWith('data.') ? path.slice(5) : path;
    const strippedVal = strippedPath.split('.').reduce((acc: unknown, part: string) => toRecord(acc)?.[part], rec) as number | undefined;
    if (typeof strippedVal === 'number' && !isNaN(strippedVal)) return strippedVal;

    const dataRec = toRecord(rec.data);
    const scoreVal = (rec.score ?? dataRec?.score ?? rec.total_ivs ?? dataRec?.total_ivs) as number | undefined;
    if (typeof scoreVal === 'number' && !isNaN(scoreVal)) return scoreVal;

    return 0;
  };

  const getIsShiny = (obj: unknown): boolean => {
    const rec = toRecord(obj);
    if (!rec) return false;
    const dataRec = toRecord(rec.data);
    return Boolean(rec.is_shiny ?? dataRec?.is_shiny ?? rec.isShiny);
  };

  const getObtainedAt = (obj: unknown): number => {
    const rec = toRecord(obj);
    if (!rec) return Infinity;
    const dataRec = toRecord(rec.data);
    const val = (rec.obtained_at ?? dataRec?.obtained_at ?? rec.obtainedAt) as number | null | undefined;
    return typeof val === 'number' && !isNaN(val) && val > 0 ? val : Infinity;
  };

  const oldScore = getVal(existingData, sortBy);
  const newScore = getVal(newData, sortBy);

  // 1. Primary: Score comparison based on order
  if (order === 'min') {
    if (newScore < oldScore) return true;
    if (newScore > oldScore) return false;
  } else {
    if (newScore > oldScore) return true;
    if (newScore < oldScore) return false;
  }

  // 2. Tiebreaker 1: Shiny advantage (Shiny always beats non-Shiny)
  const oldShiny = getIsShiny(existingData);
  const newShiny = getIsShiny(newData);
  if (newShiny && !oldShiny) return true;
  if (!newShiny && oldShiny) return false;

  // 3. Tiebreaker 2: Older capture date (lower timestamp beats higher timestamp)
  const oldObtainedAt = getObtainedAt(existingData);
  const newObtainedAt = getObtainedAt(newData);
  if (newObtainedAt < oldObtainedAt) return true;

  return false;
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
    } else {
      return { eligible: false, reason: 'El evento no tiene una franja horaria activa válida' };
    }
  }

  return { eligible: true };
}

/**
 * Validates if a Pokémon meets both global event requirements and specific sub-competition filters.
 * Filters default to 'any' / open when unconfigured.
 */
export function isPokemonEligibleForSubCompetition(
  event: Event,
  subComp: SubCompetitionConfig,
  pokemon: Pokemon,
  date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()
): { eligible: boolean; reason?: string } {
  if (!pokemon) {
    return { eligible: false, reason: 'Pokémon inexistente' };
  }

  // 1. Global event eligibility (species whitelist, catch period)
  const globalCheck = isPokemonEligibleForEvent(event, pokemon, date);
  if (!globalCheck.eligible) {
    return globalCheck;
  }

  // 2. Sub-competition specific filters (default to unrestricted 'any')
  const filters = subComp.filters;
  if (!filters) {
    return { eligible: true };
  }

  // Nature filter
  if (filters.natures && filters.natures.length > 0) {
    const pokeNature = pokemon.nature;
    if (!pokeNature || !filters.natures.includes(pokeNature)) {
      return { eligible: false, reason: `Naturaleza no permitida. Requiere: ${filters.natures.join(', ')}` };
    }
  }

  // Ability filter
  if (filters.abilities && filters.abilities.length > 0) {
    const pokeAbility = pokemon.ability;
    if (!pokeAbility || !filters.abilities.includes(pokeAbility)) {
      return { eligible: false, reason: `Habilidad no permitida. Requiere: ${filters.abilities.join(', ')}` };
    }
  }

  // Gender filter
  if (filters.gender !== undefined && filters.gender !== null) {
    if (pokemon.gender !== filters.gender) {
      return { eligible: false, reason: `Género no coincide. Requiere: ${filters.gender === 'm' ? 'Macho' : filters.gender === 'f' ? 'Hembra' : 'Sin género'}` };
    }
  }

  // Level filters
  if (filters.minLevel !== undefined && (pokemon.level || 1) < filters.minLevel) {
    return { eligible: false, reason: `Nivel insuficiente. Mínimo requerido: Nv. ${filters.minLevel}` };
  }
  if (filters.maxLevel !== undefined && (pokemon.level || 1) > filters.maxLevel) {
    return { eligible: false, reason: `Nivel excedido. Máximo permitido: Nv. ${filters.maxLevel}` };
  }

  // Shiny only filter
  if (filters.isShinyOnly && !pokemon.isShiny) {
    return { eligible: false, reason: 'Solo se admiten Pokémon Variocolor (Shiny)' };
  }

  return { eligible: true };
}

/**
 * Pre-filters a list of candidate Pokémon, returning only those eligible for the given sub-competition.
 */
export function getEligiblePokemonForSubCompetition(
  event: Event,
  subComp: SubCompetitionConfig,
  pokemonList: (Pokemon | null)[],
  date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()
): Pokemon[] {
  return pokemonList
    .filter((p): p is Pokemon => p !== null && p !== undefined)
    .filter(p => isPokemonEligibleForSubCompetition(event, subComp, p, date).eligible);
}

/**
 * Checks whether a given Pokémon UID is already registered in another sub-competition of the same event.
 */
export function isPokemonEnrolledInOtherSubCompetition(
  userEntries: Record<string, { event_id?: string; category_id?: string; pokemon_uid?: string } | undefined>,
  eventId: string,
  categoryId: string,
  pokemonUid: string
): boolean {
  if (!userEntries || !pokemonUid) return false;
  for (const entry of Object.values(userEntries)) {
    if (!entry) continue;
    if (entry.event_id === eventId && entry.pokemon_uid === pokemonUid) {
      const entryCategory = entry.category_id || 'ivs';
      if (entryCategory !== categoryId) {
        return true;
      }
    }
  }
  return false;
}

