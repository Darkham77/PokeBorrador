import { kantoWeather } from '../weather/kanto/index.ts';
import type { WeatherId } from '@/logic/weather/weatherRegistry.ts';
import type { DayPhase } from '@/logic/utils/timeUtils';

export type WeatherSeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherTableRouteId = keyof typeof kantoWeather;
export type WeatherChanceTable = Partial<Record<WeatherId, number>>;
export type RouteWeatherTable = Record<WeatherSeasonId, Record<DayPhase, WeatherChanceTable>>;

export const WEATHER_SEASON_IDS = ['spring', 'summer', 'autumn', 'winter'] as const satisfies readonly WeatherSeasonId[];
export const WEATHER_CYCLE_IDS = ['morning', 'day', 'dusk', 'night'] as const satisfies readonly DayPhase[];

/**
 * Main repository for all regional weather tables.
 * This file acts as a router that aggregates modularized regional data.
 */
export const ROUTE_WEATHER_TABLES: Record<WeatherTableRouteId, RouteWeatherTable> = {
  ...kantoWeather
};

export function isWeatherTableRouteId(value: string): value is WeatherTableRouteId {
  return Object.hasOwn(ROUTE_WEATHER_TABLES, value);
}

export function requireWeatherTableRouteId(value: string): WeatherTableRouteId {
  if (isWeatherTableRouteId(value)) return value;
  throw new Error(`[weather-tables] Unknown weather table route id: ${value}`);
}

function isWeatherSeasonId(value: string): value is WeatherSeasonId {
  return WEATHER_SEASON_IDS.some(id => id === value);
}

export function requireWeatherSeasonId(value: string): WeatherSeasonId {
  if (isWeatherSeasonId(value)) return value;
  throw new Error(`[weather-tables] Unknown weather season id: ${value}`);
}
