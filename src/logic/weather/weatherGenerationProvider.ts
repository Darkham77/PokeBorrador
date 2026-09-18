import { toID } from '@/logic/utils/strings.ts';
import { isWeatherId, type WeatherId, type ShowdownWeatherId } from './weatherRegistry.ts';

/**
 * Weather Generation Provider
 * Maps visual/environmental climates to official Showdown weather IDs
 * based on the active generation ruleset, and provides localized names.
 */

const PALDEA_GENERATION_NUM = 9;
const KALOS_GENERATION_NUM = 6;
const SINNOH_GENERATION_NUM = 4;

type WeatherOfficialResolver = (gen: number) => ShowdownWeatherId;

const WEATHER_OFFICIAL_MAP: Partial<Record<WeatherId, WeatherOfficialResolver>> = {
  heavy_rain: (gen) => (gen >= KALOS_GENERATION_NUM ? 'primordialsea' : 'raindance'),
  intense_sun: (gen) => (gen >= KALOS_GENERATION_NUM ? 'desolateland' : 'sunnyday'),
  strong_winds: (gen) => (gen >= KALOS_GENERATION_NUM ? 'deltastream' : 'none'),
  rain: () => 'raindance',
  storm: () => 'raindance',
  sun: () => 'sunnyday',
  heatwave: () => 'sunnyday',
  sandstorm: () => 'sandstorm',
  dust_storm: () => 'sandstorm',
  snow: (gen) => (gen >= PALDEA_GENERATION_NUM ? 'snow' : 'hail'),
  hail: (gen) => (gen >= PALDEA_GENERATION_NUM ? 'snow' : 'hail'),
  blizzard: (gen) => (gen >= PALDEA_GENERATION_NUM ? 'snow' : 'hail'),
  cold: (gen) => (gen >= PALDEA_GENERATION_NUM ? 'snow' : 'hail'),
  coldwave: (gen) => (gen >= PALDEA_GENERATION_NUM ? 'snow' : 'hail'),
  fog: (gen) => (gen >= SINNOH_GENERATION_NUM ? 'fog' : 'none'),
  mist: (gen) => (gen >= SINNOH_GENERATION_NUM ? 'fog' : 'none'),
};

export function mapVisualToOfficialWeather(visualWeather: string | null | undefined, gen: number): ShowdownWeatherId {
  if (!visualWeather) return 'none';
  const lower = isWeatherId(visualWeather) ? visualWeather : null;
  if (!lower) return 'none';

  const resolver = WEATHER_OFFICIAL_MAP[lower];
  return resolver ? resolver(gen) : 'none';
}

/**
 * Returns the localized weather name in Spanish for a given official Showdown weather ID
 * depending on the generation.
 */
export function getLocalizedWeatherName(officialWeatherId: ShowdownWeatherId | WeatherId, gen: number): string {
  if (officialWeatherId === 'none' || officialWeatherId === 'clear' || officialWeatherId === 'null') return 'Despejado';
  const lower = toID(officialWeatherId);

  const localizedMap: Record<string, string> = {
    sunnyday: 'Sol',
    raindance: 'Lluvia',
    sandstorm: 'T. Arena',
    hail: gen >= PALDEA_GENERATION_NUM ? 'Nieve' : 'Granizo', // spanish-ok: UI Spanish text localization label
    snow: 'Nieve',
    desolateland: 'Sol Abrasador',
    primordialsea: 'Lluvia Torrencial',
    deltastream: 'Turbulencias'
  };

  return localizedMap[lower] || 'Despejado';
}

const COMBAT_DESCRIPTIONS: Record<string, (gen: number) => string> = {
  raindance: () => '▲ Potencia Agua (x1.5)\n▼ Debilita Fuego (x0.5)\n• Efecto: Trueno 100% precisión',
  sunnyday: () => '▲ Potencia Fuego (x1.5)\n▼ Debilita Agua (x0.5)\n• Efecto: Rayo Solar sin carga',
  sandstorm: (gen) => (gen >= SINNOH_GENERATION_NUM
    ? '▲ Potencia Especial Roca (x1.5)\n▼ Debilita a no Roca/Tierra/Acero (1/16 HP por turno)'
    : '▼ Debilita a no Roca/Tierra/Acero (1/16 HP por turno)'),
  hail: () => '▼ Debilita a no Hielo (1/16 HP por turno)\n• Efecto: Ventisca 100% precisión',
  snow: () => '▲ Potencia Defensa Hielo (x1.5)\n• Efecto: Ventisca 100% precisión',
  desolateland: () => '▲ Potencia Fuego (x1.5)\n▼ Bloquea Agua (x0)\n• Efecto: Rayo Solar sin carga',
  primordialsea: () => '▲ Potencia Agua (x1.5)\n▼ Bloquea Fuego (x0)\n• Efecto: Trueno 100% precisión',
  deltastream: () => '▲ Bloquea debilidades Volador',
  fog: (gen) => (gen >= SINNOH_GENERATION_NUM
    ? '▼ Reduce la precisión de todos los movimientos (x0.6)\n• Efecto: Meteorobola dobla potencia'
    : 'Sin efectos en combate.')
};

/**
 * Returns the combat description dynamically based on the mapped Showdown weather and generation rules.
 */
export function getWeatherCombatDescription(visualWeather: string | null | undefined, gen: number): string {
  const officialWeather = mapVisualToOfficialWeather(visualWeather, gen);
  const lower = toID(officialWeather);

  const descFn = COMBAT_DESCRIPTIONS[lower];
  return descFn ? descFn(gen) : 'Sin efectos en combate.';
}

const OFFICIAL_TO_VISUAL_MAP: Record<string, (gen: number) => string> = {
  raindance: () => 'rain',
  rain: () => 'rain',
  sunnyday: () => 'sun',
  sun: () => 'sun',
  sandstorm: () => 'sandstorm',
  hail: (gen) => (gen >= PALDEA_GENERATION_NUM ? 'snow' : 'hail'),
  snowscape: () => 'snow', // spanish-ok: UI Spanish text localization label
  snow: () => 'snow',
  desolateland: () => 'intense_sun',
  intensesun: () => 'intense_sun',
  primordialsea: () => 'heavy_rain',
  heavyrain: () => 'heavy_rain',
  deltastream: () => 'strong_winds',
  strongwinds: () => 'strong_winds',
  fog: () => 'fog'
};

/**
 * Maps an official Showdown weather ID back to a Poké Vicio visual/environmental weather ID.
 */
export function mapOfficialToVisualWeather(officialWeather: string | null | undefined, gen: number): string {
  if (!officialWeather) return 'clear';
  const lower = toID(officialWeather);

  const visualFn = OFFICIAL_TO_VISUAL_MAP[lower];
  return visualFn ? visualFn(gen) : 'clear';
}
