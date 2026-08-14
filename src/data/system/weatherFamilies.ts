import { WEATHER_MECHANICAL, WEATHER_REGISTRY, toRegisteredWeatherId, type WeatherMechanical } from '../../logic/weather/weatherRegistry.ts';

/**
 * Returns the canonical weather family (WeatherMechanical) for a given weather active state.
 * Accepts both game tokens ('rain', 'storm', 'mist') and Showdown weather condition IDs ('raindance', 'sunnyday', 'desolateland', etc.).
 */
export function getWeatherFamily(weather: string): WeatherMechanical | null { // result-ok
  if (!weather) return null;
  const weatherId = toRegisteredWeatherId(weather);
  if (weatherId === null) return null;

  // 1. Direct lookup in central WEATHER_REGISTRY
  const registryEntry = WEATHER_REGISTRY[weatherId];
  if (registryEntry?.mech) {
    return registryEntry.mech;
  }

  // 2. Fallback for special tokens mapping to CLEAR family
  if (weatherId === 'none' || weatherId === 'null') {
    return WEATHER_MECHANICAL.CLEAR;
  }

  return null;
}
