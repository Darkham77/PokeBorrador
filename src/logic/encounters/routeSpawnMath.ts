import { isPokemonSpeciesId, requirePokemonSpeciesId, type PokemonSpeciesId, isLegendaryPokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getWeatherFamily } from '@/data/system/weatherFamilies.ts';
import { redistributeWeatherSpawns } from '@/logic/utils/routeSpawnHelpers';
import { getWeatherMultiplier } from '@/logic/weather/weatherUtils';
import { getGMT3Date } from '@/logic/utils/timeUtils';
import { DAY_PHASES, type DayPhase } from '@/types/system/time';
import type { MapLocation } from '@/types/pokemon/encounters';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { resolveWeeklyRotation, safeParse, type Event as GameEvent, type EventConfig } from '@/logic/events/eventEngine';
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry';
import {
  DEFAULT_EXCLUSIVE_SPAWN_WEIGHT,
  DEFAULT_VISITOR_SPAWN_WEIGHT,
  LEGENDARY_RATE_CAP_DENOMINATOR,
  DEFAULT_SPAWN_RATE_WEIGHT,
  DEFAULT_WEATHER_MULTIPLIER_NORMAL
} from '@/logic/constants/encounters';

export type WeightedSpeciesSource = PokemonSpeciesId[] | Partial<Record<PokemonSpeciesId, number>> | Record<string, number>;

export function getSpeciesEntries(source: WeightedSpeciesSource): Array<{ id: PokemonSpeciesId; weight?: number }> {
  if (Array.isArray(source)) return source.map(id => ({ id }));
  return Object.entries(source).map(([rawId, weight]) => ({
    id: requirePokemonSpeciesId(rawId),
    weight,
  }));
}

function requireWeatherFamilyId(weather: WeatherId): WeatherId {
  const family = getWeatherFamily(weather);
  if (!family) throw new Error(`[routeSpawnMath] Weather '${weather}' has no registered family`);
  return requireWeatherId(family);
}

export interface EncounterTicketOptions {
  articunoTicketSecs?: number;
  mewtwoTicketSecs?: number;
}

const ARTICUNO_TICKET_SPAWN_WEIGHT = 1;
const MEWTWO_TICKET_SPAWN_WEIGHT = 0.1;

function populateBaseSpawns(
  loc: MapLocation,
  cycle: DayPhase,
  pool: PokemonSpeciesId[],
  rates: number[]
): void {
  const cyclePool = loc.wild?.[cycle] || loc.wild?.day || [];
  const cycleRates = loc.rates?.[cycle] || loc.rates?.day || [];

  cyclePool.forEach((id: PokemonSpeciesId, index: number) => {
    pool.push(id);
    rates.push(cycleRates[index] !== undefined ? cycleRates[index] : DEFAULT_SPAWN_RATE_WEIGHT);
  });
}

function resolveWeatherConfig(loc: MapLocation, weather: WeatherId) {
  if (weather === 'clear') return undefined;
  let wConfig = loc.weather?.[weather];
  if (!wConfig) {
    const family = requireWeatherFamilyId(weather);
    if (loc.weather?.[family]) {
      wConfig = loc.weather[family];
    }
  }
  return wConfig;
}

function injectWeatherEntries(
  entries: Array<{ id: PokemonSpeciesId; weight?: number }>,
  cycle: DayPhase,
  weather: WeatherId,
  defaultWeight: number,
  pool: PokemonSpeciesId[],
  rates: number[]
): void {
  entries.forEach(({ id, weight }) => {
    if (id === 'castform' && cycle === 'night' && getWeatherFamily(weather) === 'sun') {
      return;
    }
    if (!pool.includes(id)) {
      pool.push(id);
      rates.push(weight !== undefined ? weight : defaultWeight);
    }
  });
}

function injectWeatherSpawns(
  loc: MapLocation,
  cycle: DayPhase,
  weather: WeatherId,
  pool: PokemonSpeciesId[],
  rates: number[]
): void {
  const wConfig = resolveWeatherConfig(loc, weather);
  if (!wConfig) return;

  if (wConfig.exclusive) {
    injectWeatherEntries(getSpeciesEntries(wConfig.exclusive), cycle, weather, DEFAULT_EXCLUSIVE_SPAWN_WEIGHT, pool, rates);
  }
  if (wConfig.visitors) {
    injectWeatherEntries(getSpeciesEntries(wConfig.visitors), cycle, weather, DEFAULT_VISITOR_SPAWN_WEIGHT, pool, rates);
  }
}

function extractEventSpecies(ev: GameEvent): PokemonSpeciesId[] {
  const cfg = safeParse(ev.config) as EventConfig;
  if (!ev.active || !cfg?.ignoreTimeRestrictions) return [];
  const rotation = cfg.rotationTheme === 'weekly_4' && cfg.weeklyRotations ? resolveWeeklyRotation(cfg, getGMT3Date()) : null;
  const rawSpecies = rotation?.species ?? cfg.species;
  if (!rawSpecies || rawSpecies === '*') return [];
  return rawSpecies
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(isPokemonSpeciesId);
}

function injectSingleEventSpecies(
  spId: PokemonSpeciesId,
  loc: MapLocation,
  pool: PokemonSpeciesId[],
  rates: number[]
): void {
  if (pool.includes(spId)) return;
  const wild = loc.wild || {};
  for (const c of DAY_PHASES) {
    const cp = wild[c];
    if (!cp) continue;
    const idx = cp.indexOf(spId);
    if (idx !== -1) {
      pool.push(spId);
      const originalRates = loc.rates?.[c] || [];
      rates.push(originalRates[idx] || DEFAULT_VISITOR_SPAWN_WEIGHT);
      break;
    }
  }
}

function injectEventSpawns(
  loc: MapLocation,
  activeEvents: GameEvent[],
  pool: PokemonSpeciesId[],
  rates: number[]
): void {
  if (!activeEvents || activeEvents.length === 0) return;
  for (const ev of activeEvents) {
    const speciesList = extractEventSpecies(ev);
    for (const spId of speciesList) {
      injectSingleEventSpecies(spId, loc, pool, rates);
    }
  }
}

function injectTicketSpawns(
  loc: MapLocation,
  tickets: EncounterTicketOptions | undefined,
  pool: PokemonSpeciesId[],
  rates: number[]
): void {
  if (tickets?.articunoTicketSecs && tickets.articunoTicketSecs > 0 && loc.id === 'seafoam_islands') {
    if (!pool.includes('articuno')) {
      pool.push('articuno');
      rates.push(ARTICUNO_TICKET_SPAWN_WEIGHT);
    }
  }

  if (tickets?.mewtwoTicketSecs && tickets.mewtwoTicketSecs > 0 && loc.id === 'cerulean_cave') {
    if (!pool.includes('mewtwo')) {
      pool.push('mewtwo');
      rates.push(MEWTWO_TICKET_SPAWN_WEIGHT);
    }
  }
}

export function getEncounterPool(
  loc: MapLocation,
  cycle: DayPhase,
  weather: WeatherId,
  activeEvents: GameEvent[] = [],
  tickets?: EncounterTicketOptions
): { pool: PokemonSpeciesId[]; rates: number[] } {
  const pool: PokemonSpeciesId[] = [];
  const rates: number[] = [];

  populateBaseSpawns(loc, cycle, pool, rates);
  injectWeatherSpawns(loc, cycle, weather, pool, rates);
  injectEventSpawns(loc, activeEvents, pool, rates);
  injectTicketSpawns(loc, tickets, pool, rates);

  return { pool, rates };
}

/**
 * Caps the weight/rate of legendary species so that their final probability does not exceed 1%.
 * Balances the other rates proportionally.
 */
export function clampLegendaryRates(pool: PokemonSpeciesId[], rates: number[]): void {
  const legendaryIndices: number[] = [];
  let sumOtherRates = 0;

  for (let i = 0; i < pool.length; i++) {
    const spId = pool[i];
    if (spId && isLegendaryPokemonSpeciesId(spId)) {
      legendaryIndices.push(i);
    } else {
      sumOtherRates += rates[i] || 0;
    }
  }

  if (legendaryIndices.length === 0) return;
  if (sumOtherRates === 0) return;

  const cap = sumOtherRates / LEGENDARY_RATE_CAP_DENOMINATOR;

  legendaryIndices.forEach(idx => {
    if ((rates[idx] || 0) > cap) {
      rates[idx] = cap;
    }
  });
}

/**
 * Returns the final, fully adjusted pool and rates for ground encounters.
 */
export function getFinalGroundRates(
  loc: MapLocation,
  cycle: DayPhase,
  weather: WeatherId,
  activeEvents: GameEvent[],
  tickets?: EncounterTicketOptions
): { pool: PokemonSpeciesId[]; rates: number[] } {
  const { pool, rates } = getEncounterPool(loc, cycle, weather, activeEvents, tickets);

  if (weather !== 'clear') {
    let wConfig = loc.weather?.[weather];
    if (!wConfig) {
      const family = requireWeatherFamilyId(weather);
      if (loc.weather?.[family]) {
        wConfig = loc.weather[family];
      }
    }
    const exclusives = wConfig?.exclusive ? getSpeciesEntries(wConfig.exclusive).map(entry => entry.id) : [];
    redistributeWeatherSpawns(rates, pool, weather, exclusives);
  }

  clampLegendaryRates(pool, rates);

  return { pool, rates };
}

export function applyAtmosphericStatus(pokemon: Pokemon, loc: MapLocation, weather: WeatherId, selectedId: PokemonSpeciesId): void {
  let weatherCfg = loc.weather?.[weather];
  if (!weatherCfg && weather !== 'clear') {
    const family = requireWeatherFamilyId(weather);
    if (loc.weather?.[family]) {
      weatherCfg = loc.weather[family];
    }
  }
  const visitors = weatherCfg?.visitors ? getSpeciesEntries(weatherCfg.visitors).map(entry => entry.id) : [];
  const exclusives = weatherCfg?.exclusive ? getSpeciesEntries(weatherCfg.exclusive).map(entry => entry.id) : [];
  const isVisitor = Boolean(weatherCfg?.visitors && visitors.includes(selectedId));
  const isExclusive = Boolean(weatherCfg?.exclusive && exclusives.includes(selectedId));
  const multiplier = getWeatherMultiplier(selectedId, weather);
  const isBuffed = !isVisitor && !isExclusive && multiplier > DEFAULT_WEATHER_MULTIPLIER_NORMAL;
  const isDebuffed = !isVisitor && !isExclusive && multiplier < DEFAULT_WEATHER_MULTIPLIER_NORMAL && multiplier > 0;
  
  if (isVisitor || isExclusive || isBuffed || isDebuffed) {
    pokemon.isAtmospheric = true;
    pokemon.weatherOrigin = weather;
    if (isDebuffed) pokemon.isWeatherStruggling = true;
  }
}

export interface SpawnPoolResult {
  generic: PokemonSpeciesId[]
  specific: PokemonSpeciesId[]
  rates: Partial<Record<PokemonSpeciesId, number>>
}

export function getMapSpawnPoolData(
  loc: MapLocation,
  cycle: DayPhase,
  activeWeather: WeatherId,
  activeEvents: GameEvent[] = []
): SpawnPoolResult {
  if (!loc.wild) {
    return { generic: [], specific: [], rates: {} };
  }

  const { pool, rates } = getEncounterPool(loc, cycle, activeWeather, activeEvents);

  const baseWild = loc.wild[cycle] || loc.wild.day || [];
  const generic: PokemonSpeciesId[] = [];
  const specific: PokemonSpeciesId[] = [];
  const ratesMap: Partial<Record<PokemonSpeciesId, number>> = {};

  pool.forEach((id: PokemonSpeciesId, index: number) => {
    ratesMap[id] = rates[index] || DEFAULT_SPAWN_RATE_WEIGHT;
    if (baseWild.includes(id)) {
      generic.push(id);
    } else {
      specific.push(id);
    }
  });

  if (loc.fishing) {
    loc.fishing.pool.forEach((id: PokemonSpeciesId, index: number) => {
      if (!generic.includes(id) && !specific.includes(id)) {
        generic.push(id);
        ratesMap[id] = loc.fishing!.rates[index] || DEFAULT_SPAWN_RATE_WEIGHT;
      }
    });
  }

  return { generic, specific, rates: ratesMap };
}
