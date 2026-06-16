import { ROUTE_WEATHER_TABLES } from '@/data/weather-tables';
import { getDayCycle } from '@/logic/utils/timeUtils';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { WEATHER_REGISTRY } from './weatherRegistry';

type WeatherProbabilityTable = Record<string, number>;
type SeasonWeatherTable = Record<string, WeatherProbabilityTable>;

const WEATHER_BUFF_MULTIPLIER = 1.5;
const WEATHER_DEBUFF_MULTIPLIER = 0.4;
const WEATHER_BLOCK_MULTIPLIER = 0;

import { mulberry32, hashString } from '../utils/math.ts';






/**
 * Deterministically calculates the weather for a given route, season, and epoch hour.
 * 
 * @param {string} mapId - The route identifier.
 * @param {string} seasonId - The season identifier (spring, summer, autumn, winter).
 * @param {number} epochHour - The continuous epoch hour.
 * @param {string} [forcedCycle] - Optional forced cycle for debug/testing.
 * @returns {string} The weather string (e.g., 'clear', 'rain', 'snow').
 */
export function getRouteWeather(mapId: string, seasonId: string, epochHour: number, forcedCycle?: string): string {
  // 1. Get Probability Table
  const routeTables = (ROUTE_WEATHER_TABLES as Record<string, Record<string, Record<string, number> | Record<string, Record<string, number>>>>)[mapId];
  if (!routeTables || !routeTables[seasonId]) {
    return 'clear'; // Fallback for missing tables
  }
  
  // Use forced cycle if provided, otherwise calculate based on epochHour
  const cycle = forcedCycle || getDayCycle(epochHour * 3600000);
  const seasonTable = routeTables[seasonId] as unknown as SeasonWeatherTable;
  if (!seasonTable) return 'clear';
  
  // Get the specific table for the cycle, or fallback to the season root if not using cycles yet
  const table = seasonTable[cycle as keyof SeasonWeatherTable] || (seasonTable as unknown as WeatherProbabilityTable);
  
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
 * Determina el multiplicador de spawn de una especie basado en el clima actual.
 */
export function getWeatherMultiplier(id: string, weather: string): number {
  const pData = pokemonDataProvider.getPokemonData(id);
  if (!pData || !weather || weather === 'clear') return 1.0;
  
  const types: string[] = []
  if (Array.isArray(pData.type)) {
    types.push(...pData.type.map(t => t.toLowerCase()))
  } else if (pData.type) {
    types.push(pData.type.toLowerCase())
  }
  if (pData.type2) {
    types.push(pData.type2.toLowerCase())
  }
  const w = weather.toLowerCase();
  
  const entry = WEATHER_REGISTRY[w];
  const mods = entry?.modifiers;
  if (!mods) return 1.0;

  if (mods.block?.some(t => types.includes(t))) return WEATHER_BLOCK_MULTIPLIER;
  if (mods.boost?.some(t => types.includes(t))) return WEATHER_BUFF_MULTIPLIER;
  if (mods.debuff?.some(t => types.includes(t))) return WEATHER_DEBUFF_MULTIPLIER;

  return 1.0;
}
