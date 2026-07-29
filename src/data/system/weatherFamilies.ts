import { WEATHER_MECHANICAL, WEATHER_REGISTRY, type WeatherId, type WeatherMechanical } from '../../logic/weather/weatherRegistry.ts';


const WEATHER_FAMILY_KEYS = [
  WEATHER_MECHANICAL.RAIN,
  WEATHER_MECHANICAL.SUN,
  WEATHER_MECHANICAL.SNOW,
] as const;

export type WeatherFamilyKey = (typeof WEATHER_FAMILY_KEYS)[number];

function weatherIdsForMechanical(...mechanics: readonly WeatherMechanical[]): WeatherId[] {
  return Object.values(WEATHER_REGISTRY)
    .filter(weather => mechanics.includes(weather.mech))
    .map(weather => weather.id);
}

export const WEATHER_FAMILIES: Record<WeatherFamilyKey, readonly WeatherId[]> = {
  [WEATHER_MECHANICAL.RAIN]: weatherIdsForMechanical(WEATHER_MECHANICAL.RAIN),
  [WEATHER_MECHANICAL.SUN]: weatherIdsForMechanical(WEATHER_MECHANICAL.SUN),
  [WEATHER_MECHANICAL.SNOW]: weatherIdsForMechanical(WEATHER_MECHANICAL.SNOW, WEATHER_MECHANICAL.HAIL),
};


/**
 * Returns the canonical weather family for a given weather active state.
 */
export function getWeatherFamily(weather: WeatherId | string): WeatherFamilyKey | null {
  if (!weather) return null;
  const lower = weather as WeatherId;
  for (const family of WEATHER_FAMILY_KEYS) {
    if (WEATHER_FAMILIES[family].some(member => member === lower)) return family;
  }
  return null;
}
