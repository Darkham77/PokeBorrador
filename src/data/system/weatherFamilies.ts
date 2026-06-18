import { WEATHER_MECHANICAL, WEATHER_REGISTRY } from '../../logic/weather/weatherRegistry.ts';


// Extract dynamically from WEATHER_REGISTRY matching the mechanical weather types
export const WEATHER_FAMILIES: Record<string, string[]> = {
  [WEATHER_MECHANICAL.RAIN]: Object.keys(WEATHER_REGISTRY).filter(
    key => WEATHER_REGISTRY[key]?.mech === WEATHER_MECHANICAL.RAIN || key === 'thunderstorm'
  ),
  [WEATHER_MECHANICAL.SUN]: Object.keys(WEATHER_REGISTRY).filter(
    key => WEATHER_REGISTRY[key]?.mech === WEATHER_MECHANICAL.SUN
  ),
  [WEATHER_MECHANICAL.SNOW]: Object.keys(WEATHER_REGISTRY).filter(
    key => WEATHER_REGISTRY[key]?.mech === WEATHER_MECHANICAL.SNOW || WEATHER_REGISTRY[key]?.mech === WEATHER_MECHANICAL.HAIL
  )
};


/**
 * Returns the canonical weather family for a given weather active state.
 */
export function getWeatherFamily(weather: string): string | null {
  if (!weather) return null;
  const lower = weather.toLowerCase();
  for (const [family, members] of Object.entries(WEATHER_FAMILIES)) {
    if (members.includes(lower)) return family;
  }
  return null;
}

