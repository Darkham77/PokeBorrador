import { kantoWeather } from '../weather/kanto/index.ts';
import type { WeatherId } from '@/logic/weather/weatherRegistry.ts';

export type WeatherSeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherCycleId = 'morning' | 'day' | 'dusk' | 'night';
export type WeatherTableRouteId = keyof typeof kantoWeather;
export type WeatherChanceTable = Partial<Record<WeatherId, number>>;
export type RouteWeatherTable = Record<WeatherSeasonId, Record<WeatherCycleId, WeatherChanceTable>>;

export const WEATHER_SEASON_IDS = ['spring', 'summer', 'autumn', 'winter'] as const satisfies readonly WeatherSeasonId[];
export const WEATHER_CYCLE_IDS = ['morning', 'day', 'dusk', 'night'] as const satisfies readonly WeatherCycleId[];

/**
 * Main repository for all regional weather tables.
 * This file acts as a router that aggregates modularized regional data.
 */
export const ROUTE_WEATHER_TABLES = {
  ...kantoWeather
} satisfies Record<WeatherTableRouteId, RouteWeatherTable>;

export function isWeatherTableRouteId(value: string): value is WeatherTableRouteId {
  return Object.hasOwn(ROUTE_WEATHER_TABLES, value);
}

export function requireWeatherTableRouteId(value: string): WeatherTableRouteId {
  if (isWeatherTableRouteId(value)) return value;
  throw new Error(`[weather-tables] Unknown weather table route id: ${value}`);
}

export function isWeatherSeasonId(value: string): value is WeatherSeasonId {
  return WEATHER_SEASON_IDS.some(id => id === value);
}

export function requireWeatherSeasonId(value: string): WeatherSeasonId {
  if (isWeatherSeasonId(value)) return value;
  throw new Error(`[weather-tables] Unknown weather season id: ${value}`);
}

export function isWeatherCycleId(value: string): value is WeatherCycleId {
  return WEATHER_CYCLE_IDS.some(id => id === value);
}

export function requireWeatherCycleId(value: string): WeatherCycleId {
  if (isWeatherCycleId(value)) return value;
  throw new Error(`[weather-tables] Unknown weather cycle id: ${value}`);
}
