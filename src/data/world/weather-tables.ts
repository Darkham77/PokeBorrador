import { kantoWeather } from '../weather/kanto/index.ts';

/**
 * Main repository for all regional weather tables.
 * This file acts as a router that aggregates modularized regional data.
 */
export const ROUTE_WEATHER_TABLES: Record<string, Record<string, Record<string, Record<string, number>>>> = {
  ...kantoWeather
};
