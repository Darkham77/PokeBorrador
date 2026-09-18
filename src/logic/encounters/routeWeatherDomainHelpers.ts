import type { MapLocation, MapLocationWeatherConfig } from '@/types/pokemon/encounters';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import { getWeatherFamily } from '@/data/system/weatherFamilies';

/**
 * Resolves the canonical weather spawn configuration for a map location.
 * First checks for an exact match against the active WeatherId (e.g., 'coldwave', 'heatwave', 'rain').
 * If not present, falls back to the mechanical weather family (e.g., 'storm' -> 'rain', 'heavy_rain' -> 'rain').
 */
export function getMapWeatherConfig(
  map: MapLocation | null | undefined,
  weather: WeatherId | null | undefined
): MapLocationWeatherConfig | null {
  if (!map?.weather || !weather) return null;

  // 1. Direct match by WeatherId
  const directConfig = map.weather[weather];
  if (directConfig) {
    return directConfig;
  }

  // 2. Mechanical family fallback
  const family = getWeatherFamily(weather);
  if (family && map.weather[family]) {
    return map.weather[family] ?? null;
  }

  return null;
}
