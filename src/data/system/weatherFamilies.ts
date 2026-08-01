import { WEATHER_MECHANICAL, WEATHER_REGISTRY, toRegisteredWeatherId, type WeatherId, type WeatherMechanical } from '../../logic/weather/weatherRegistry.ts';

export type WeatherFamilyKey = WeatherMechanical;

/**
 * Returns the canonical weather family (WeatherMechanical) for a given weather active state.
 * Accepts both game tokens ('rain', 'storm', 'mist') and Showdown weather condition IDs ('raindance', 'sunnyday', 'desolateland', etc.).
 */
export function getWeatherFamily(weather: WeatherId | string): WeatherFamilyKey | null {
  if (!weather) return null;
  const canonicalId = toRegisteredWeatherId(weather);
  const lower = canonicalId as WeatherId;

  // 1. Direct lookup in central WEATHER_REGISTRY
  const registryEntry = WEATHER_REGISTRY[lower as WeatherId];
  if (registryEntry?.mech) {
    return registryEntry.mech;
  }

  // 2. Fallback for special tokens mapping to CLEAR family
  if (lower === 'none' || lower === 'null') {
    return WEATHER_MECHANICAL.CLEAR;
  }

  return null;
}
