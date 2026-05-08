
import { ROUTE_WEATHER_TABLES } from '@/data/weather-tables';
import { getServerTime, getDayCycle } from '@/logic/timeUtils';

/**
 * Simple 32-bit hash function (DJB2) for string to number.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 PRNG
 * Fast, high quality PRNG for JavaScript
 * @param {number} a - The seed
 * @returns {function} A function that returns a float between 0 (inclusive) and 1 (exclusive)
 */
export function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Deterministically calculates the weather for a given route, season, and epoch hour.
 * 
 * @param {string} mapId - The route identifier.
 * @param {string} seasonId - The season identifier (spring, summer, autumn, winter).
 * @param {number} epochHour - The continuous epoch hour.
 * @returns {string} The weather string (e.g., 'clear', 'rain', 'snow').
 */
export function getRouteWeather(mapId: string, seasonId: string, epochHour: number): string {
  // 1. Get Probability Table
  const routeTables = (ROUTE_WEATHER_TABLES as Record<string, Record<string, Record<string, number> | Record<string, Record<string, number>>>>)[mapId];
  if (!routeTables || !routeTables[seasonId]) {
    return 'clear'; // Fallback for missing tables
  }
  
  // Calculate cycle based on epochHour (continuous hours from epoch)
  const cycle = getDayCycle(epochHour * 3600000);
  const seasonTable = routeTables[seasonId];
  
  // Get the specific table for the cycle, or fallback to the season root if not using cycles yet
  const table = seasonTable[cycle] || seasonTable;
  
  // 2. Generate Deterministic Seed
  const mapHash = hashString(mapId);
  // Mix map hash and epoch hour to ensure different maps have different weather at the same hour
  const seed = (mapHash + epochHour) >>> 0;
  
  // 3. Initialize PRNG and discard first few values to break seed correlation
  const prng = mulberry32(seed);
  prng();
  prng();
  prng();
  const randNum = prng() * 100; // 0 to 99.999...
  
  // 4. Iterate and accumulate probabilities
  let cumulative = 0;
  for (const [weather, prob] of Object.entries(table as Record<string, number>)) {
    cumulative += prob;
    if (randNum < cumulative) {
      return weather;
    }
  }
  
  // Fallback in case table probabilities don't sum to 100 or something goes wrong
  return 'clear'; 
}

/**
 * Gets the current epoch hour for deterministic math.
 */
export function getCurrentEpochHour(): number {
  return Math.floor(getServerTime() / 3600000);
}
