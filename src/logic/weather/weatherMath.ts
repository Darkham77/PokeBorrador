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

export type DayPhase = 'morning' | 'day' | 'dusk' | 'night';

/**
 * Deterministically maps an epoch-millisecond timestamp to a day phase.
 * Cycle is 8 hours: 0-1=morning, 2-3=day, 4-5=dusk, 6-7=night.
 */
export function getDayCyclePure(nowMs: number): DayPhase {
  const instant = Temporal.Instant.fromEpochMilliseconds(nowMs);
  const totalHours = Math.floor(Number(instant.epochNanoseconds / BigInt(1e9)) / 3600);
  const phase = totalHours % 8;

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
  mapId: string,
  seasonId: string,
  epochHour: number,
): string {
  const routeTables = tables[mapId];
  if (!routeTables || !routeTables[seasonId]) return 'clear';

  const cycle = getDayCyclePure(epochHour * 3600000);
  const seasonTable = routeTables[seasonId]!;
  const table = seasonTable[cycle] ?? seasonTable;

  const mapHash = hashString(mapId);
  const seed = (mapHash + epochHour) >>> 0;

  const prng = mulberry32(seed);
  prng(); prng(); prng(); // discard correlated seeds
  const randNum = prng() * 100;

  let cumulative = 0;
  for (const [weather, prob] of Object.entries(table as Record<string, number>)) {
    cumulative += prob;
    if (randNum < cumulative) return weather;
  }

  return 'clear';
}

// ── Global Session Weather Seed & AnimSeed ─────────────────────────────────────

import { FIRE_RED_MAPS } from '../../data/maps.ts';

let sessionWeatherSeed = 500;
if (typeof window !== 'undefined') {
  const win = window as unknown as { __WEATHER_SESSION_SEED__?: number };
  if (win.__WEATHER_SESSION_SEED__ === undefined) {
    win.__WEATHER_SESSION_SEED__ = Math.random() * 1000;
  }
  sessionWeatherSeed = win.__WEATHER_SESSION_SEED__;
} else {
  sessionWeatherSeed = Math.random() * 1000;
}

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
export function getWeatherAnimSeed(mapId: string): number {
  const mapData = FIRE_RED_MAPS.find(m => m.id === mapId);
  const keyString = mapData?.name || mapId;
  const charSum = keyString.split('').reduce((acc, char, i) => {
    return acc + (char.charCodeAt(0) * (i + 1));
  }, 0);
  return Math.abs((charSum + sessionWeatherSeed) % 1000) / 1000;
}

