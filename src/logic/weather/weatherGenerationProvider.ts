import { toID } from '@pkmn/sim';

/**
 * Weather Generation Provider
 * Maps visual/environmental climates to official Showdown weather IDs
 * based on the active generation ruleset, and provides localized names.
 */

/**
 * Maps a Poké Vicio visual weather ID to its official Showdown weather ID
 * for a specific generation.
 */
export function mapVisualToOfficialWeather(visualWeather: string | null | undefined, gen: number): string {
  if (!visualWeather) return 'none';
  const lower = visualWeather.toLowerCase();

  // Gen 9 Mapping
  if (gen >= 9) {
    if (lower === 'heavy_rain') return 'primordialsea';
    if (lower === 'intense_sun') return 'desolateland';
    if (lower === 'strong_winds') return 'deltastream';
    if (['rain', 'storm'].includes(lower)) return 'raindance';
    if (['sun', 'heatwave'].includes(lower)) return 'sunnyday';
    if (['sandstorm', 'dust_storm'].includes(lower)) return 'sandstorm';
    if (['snow', 'hail', 'blizzard', 'cold', 'coldwave'].includes(lower)) return 'snow';
    if (['fog', 'mist'].includes(lower)) return 'fog';
    return 'none';
  }

  // Gen 6 - 8 Mapping
  if (gen >= 6) {
    if (lower === 'heavy_rain') return 'primordialsea';
    if (lower === 'intense_sun') return 'desolateland';
    if (lower === 'strong_winds') return 'deltastream';
    if (['rain', 'storm'].includes(lower)) return 'raindance';
    if (['sun', 'heatwave'].includes(lower)) return 'sunnyday';
    if (['sandstorm', 'dust_storm'].includes(lower)) return 'sandstorm';
    if (['snow', 'hail', 'blizzard', 'cold', 'coldwave'].includes(lower)) return 'hail';
    if (['fog', 'mist'].includes(lower)) return 'fog';
    return 'none';
  }

  // Gen 4 - 5 Mapping
  if (gen >= 4) {
    if (['rain', 'storm', 'heavy_rain'].includes(lower)) return 'raindance';
    if (['sun', 'heatwave', 'intense_sun'].includes(lower)) return 'sunnyday';
    if (['sandstorm', 'dust_storm'].includes(lower)) return 'sandstorm';
    if (['snow', 'hail', 'blizzard', 'cold', 'coldwave'].includes(lower)) return 'hail';
    if (['fog', 'mist'].includes(lower)) return 'fog';
    return 'none';
  }

  // Gen 3 Mapping (Gen 3 Default)
  if (['rain', 'storm', 'heavy_rain'].includes(lower)) return 'raindance';
  if (['sun', 'heatwave', 'intense_sun'].includes(lower)) return 'sunnyday';
  if (['sandstorm', 'dust_storm'].includes(lower)) return 'sandstorm';
  if (['snow', 'hail', 'blizzard', 'cold', 'coldwave'].includes(lower)) return 'hail';
  if (['fog', 'mist'].includes(lower)) return 'none'; // Niebla/Bruma no tienen efecto de combate en Gen 3 (Fog se introdujo en Gen 4)

  return 'none';
}

/**
 * Returns the localized weather name in Spanish for a given official Showdown weather ID
 * depending on the generation.
 */
export function getLocalizedWeatherName(weatherId: string | null | undefined, gen: number): string {
  if (!weatherId || weatherId === 'none') return 'Despejado';
  const lower = toID(weatherId);

  const localizedMap: Record<string, string> = {
    sunnyday: 'Sol',
    raindance: 'Lluvia',
    sandstorm: 'T. Arena',
    hail: gen >= 9 ? 'Nieve' : 'Granizo',
    snow: 'Nieve',
    desolateland: 'Sol Abrasador',
    primordialsea: 'Lluvia Torrencial',
    deltastream: 'Turbulencias'
  };

  return localizedMap[lower] || 'Despejado';
}

/**
 * Returns the combat description dynamically based on the mapped Showdown weather and generation rules.
 */
export function getWeatherCombatDescription(visualWeather: string | null | undefined, gen: number): string {
  const officialWeather = mapVisualToOfficialWeather(visualWeather, gen);
  const lower = toID(officialWeather);

  if (lower === 'raindance') {
    return '▲ Potencia Agua (x1.5)\n▼ Debilita Fuego (x0.5)\n• Efecto: Trueno 100% precisión';
  }
  if (lower === 'sunnyday') {
    return '▲ Potencia Fuego (x1.5)\n▼ Debilita Agua (x0.5)\n• Efecto: Rayo Solar sin carga';
  }
  if (lower === 'sandstorm') {
    if (gen >= 4) {
      return '▲ Potencia Especial Roca (x1.5)\n▼ Debilita a no Roca/Tierra/Acero (1/16 HP por turno)';
    }
    return '▼ Debilita a no Roca/Tierra/Acero (1/16 HP por turno)';
  }
  if (lower === 'hail') {
    return '▼ Debilita a no Hielo (1/16 HP por turno)\n• Efecto: Ventisca 100% precisión';
  }
  if (lower === 'snow') {
    return '▲ Potencia Defensa Hielo (x1.5)\n• Efecto: Ventisca 100% precisión';
  }
  if (lower === 'desolateland') {
    return '▲ Potencia Fuego (x1.5)\n▼ Bloquea Agua (x0)\n• Efecto: Rayo Solar sin carga';
  }
  if (lower === 'primordialsea') {
    return '▲ Potencia Agua (x1.5)\n▼ Bloquea Fuego (x0)\n• Efecto: Trueno 100% precisión';
  }
  if (lower === 'deltastream') {
    return '▲ Bloquea debilidades Volador';
  }
  if (lower === 'fog') {
    if (gen >= 4) {
      return '▼ Reduce la precisión de todos los movimientos (x0.6)\n• Efecto: Meteorobola dobla potencia';
    }
    return 'Sin efectos en combate.';
  }

  return 'Sin efectos en combate.';
}

/**
 * Maps an official Showdown weather ID back to a Poké Vicio visual/environmental weather ID.
 */
export function mapOfficialToVisualWeather(officialWeather: string | null | undefined, gen: number): string {
  if (!officialWeather) return 'clear';
  const lower = toID(officialWeather);

  if (lower === 'raindance' || lower === 'rain') return 'rain';
  if (lower === 'sunnyday' || lower === 'sun') return 'sun';
  if (lower === 'sandstorm') return 'sandstorm';
  if (lower === 'hail') return gen >= 9 ? 'snow' : 'hail';
  if (lower === 'snow') return 'snow';
  if (lower === 'desolateland' || lower === 'intensesun') return 'intense_sun';
  if (lower === 'primordialsea' || lower === 'heavyrain') return 'heavy_rain';
  if (lower === 'deltastream' || lower === 'strongwinds') return 'strong_winds';
  if (lower === 'fog') return 'fog';

  return 'clear';
}


