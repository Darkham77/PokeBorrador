/**
 * src/logic/weather/weatherMath.ts
 *
 * Pure math for weather and day-cycle determination.
 * Zero browser, Vue, Pinia, or Supabase dependencies.
 *
 * Extracted from weatherUtils.ts and timeUtils.ts for testability
 * with the native Node.js 26+ test runner.
 *
 * @module weatherMath
 */


// ── Day Cycle ────────────────────────────────────────────────────────────────

import type { DayPhase } from '../utils/timeUtils.ts';
import type { MapRouteId } from '@/data/world/map-assets';
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry';
import type { WeatherSeasonId } from '@/data/world/weather-tables';
export type { DayPhase };

/**
 * Deterministically maps an epoch-millisecond timestamp to a day phase.
 * Cycle is 8 hours: 0-1=morning, 2-3=day, 4-5=dusk, 6-7=night.
 */
import { ONE_HOUR_MS } from '@/logic/constants/items.ts'

const DAY_CYCLE_TOTAL_HOURS = 8;
const SECONDS_PER_HOUR = 3600;
export const PROBABILITY_PERCENT_SCALE = 100;
const WEATHER_SESSION_SEED_RANGE = 1000;

/**
 * Deterministically maps an epoch-millisecond timestamp to a day phase.
 * Cycle is 8 hours: 0-1=morning, 2-3=day, 4-5=dusk, 6-7=night.
 */
export function getDayCyclePure(nowMs: number): DayPhase {
  const instant = Temporal.Instant.fromEpochMilliseconds(nowMs);
  const totalHours = Math.floor(Number(instant.epochNanoseconds / BigInt(1e9)) / SECONDS_PER_HOUR);
  const phase = totalHours % DAY_CYCLE_TOTAL_HOURS;

  if (phase < 2) return 'morning';
  if (phase < 4) return 'day';
  if (phase < 6) return 'dusk';
  return 'night';
}

// ── Herramientas Matemáticas Globales ────────────────────────────────────────

import { mulberry32, hashString } from '../utils/math.ts';
export { mulberry32, hashString };




// ── Route Weather ─────────────────────────────────────────────────────────────


/**
 * A nested weather table: seasonId → DayPhase → weatherType → probability (%)
 */
export type WeatherTable = Record<
  string,
  Record<string, Record<string, number> | Record<string, Record<string, number>>>
>;

/**
 * Deterministically calculates the weather for a given route, season, and epoch hour.
 * All inputs are passed in — zero external dependencies.
 *
 * @param tables - The full ROUTE_WEATHER_TABLES data object
 * @param mapId  - The route identifier
 * @param seasonId - The season identifier (spring, summer, autumn, winter)
 * @param epochHour - The continuous epoch hour (integer)
 */
export function getRouteWeatherPure(
  tables: WeatherTable,
  mapId: MapRouteId,
  seasonId: WeatherSeasonId,
  epochHour: number,
): WeatherId {
  const routeTables = tables[mapId];
  if (!routeTables || !routeTables[seasonId]) return 'clear';

  const cycle = getDayCyclePure(epochHour * ONE_HOUR_MS);
  const seasonTable = routeTables[seasonId]!;
  const table = seasonTable[cycle] ?? seasonTable;

  const mapHash = hashString(mapId);
  const seed = (mapHash + epochHour) >>> 0;

  const prng = mulberry32(seed);
  prng(); prng(); prng(); // discard correlated seeds
  const randNum = prng() * PROBABILITY_PERCENT_SCALE;

  let cumulative = 0;
  for (const [weather, prob] of Object.entries(table as Record<string, number>)) { // open-record: Generic key-value data dictionary container
    cumulative += prob;
    if (randNum < cumulative) return requireWeatherId(weather);
  }

  return 'clear';
}

// ── Global Session Weather Seed & AnimSeed ─────────────────────────────────────

import { MAPS_BY_ROUTE_ID } from '../../data/world/maps.ts';

function initSessionWeatherSeed(): number {
  const getCryptoRandom = (): number => {
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      const array = new Uint32Array(1);
      globalThis.crypto.getRandomValues(array);
      return array[0]! % WEATHER_SESSION_SEED_RANGE;
    }
    return 42;
  };

  if (typeof window !== 'undefined') {
    if (window.__WEATHER_SESSION_SEED__ === undefined) {
      window.__WEATHER_SESSION_SEED__ = getCryptoRandom();
    }
    return window.__WEATHER_SESSION_SEED__;
  }
  return getCryptoRandom();
}

const sessionWeatherSeed = initSessionWeatherSeed();

/**
 * Gets the shared session weather seed.
 */
export function getSessionWeatherSeed(): number {
  return sessionWeatherSeed;
}

/**
 * Deterministically computes the weather animation seed (0 to 1) for a map,
 * matching both map view and battle view.
 */
const WEATHER_SEED_MODULO_SCALE = 1000;

export function getWeatherAnimSeed(mapId: MapRouteId): number {
  const mapData = (MAPS_BY_ROUTE_ID as Record<string, { name: string }>)[mapId]; // open-record: Generic key-value data dictionary container
  const keyString = mapData?.name || mapId;
  const charSum = keyString.split('').reduce((acc, char, i) => {
    return acc + (char.charCodeAt(0) * (i + 1));
  }, 0);
  return Math.abs((charSum + sessionWeatherSeed) % WEATHER_SEED_MODULO_SCALE) / WEATHER_SEED_MODULO_SCALE;
}

