import type { DisplayText } from '@francogp/auditor';

import { PALDEA_GENERATION_NUM } from '@/logic/constants/gameplay.ts';
import { toID } from '@/logic/utils/strings.ts';

import { type WeatherId, type ShowdownWeatherId } from './weatherRegistry.ts';

/**
 * Returns the localized weather name in Spanish for a given official Showdown weather ID.
 */
type ClearWeatherAlias = 'none' | 'clear' | 'null';
const CLEAR_WEATHER_ALIASES: ReadonlySet<string> = new Set<ClearWeatherAlias>([
  'none',
  'clear',
  'null'
]);

function isClearWeatherAlias(id: string): id is ClearWeatherAlias {
  return CLEAR_WEATHER_ALIASES.has(id);
}

export function getLocalizedWeatherName(
  officialWeatherId: ShowdownWeatherId | WeatherId,
  gen: number
): string {
  if (isClearWeatherAlias(officialWeatherId)) return 'Despejado';
  const lower = toID(officialWeatherId);

  const localizedMap: Partial<Record<ShowdownWeatherId, string>> = {
    sunnyday: 'Sol',
    raindance: 'Lluvia',
    sandstorm: 'T. Arena',
    hail: gen >= PALDEA_GENERATION_NUM ? 'Nieve' : 'Granizo',
    snow: 'Nieve',
    desolateland: 'Sol Abrasador',
    primordialsea: 'Lluvia Torrencial',
    deltastream: 'Turbulencias'
  };

  const entry = (localizedMap as Record<DisplayText, string | undefined>)[lower]; // open-record: Localized weather dictionary
  return entry || 'Despejado';
}

const OFFICIAL_TO_VISUAL_MAP: Record<DisplayText, string> = {
  // open-record: Loose showdown/alias weather id to visual id map
  raindance: 'rain',
  rain: 'rain',
  sunnyday: 'sun',
  sun: 'sun',
  sandstorm: 'sandstorm',
  snowscape: 'snow',
  snow: 'snow',
  desolateland: 'intense_sun',
  intensesun: 'intense_sun',
  primordialsea: 'heavy_rain',
  heavyrain: 'heavy_rain',
  deltastream: 'strong_winds',
  strongwinds: 'strong_winds',
  fog: 'fog'
};

/**
 * Maps an official Showdown weather ID back to a Poké Vicio visual/environmental weather ID.
 */
export function mapOfficialToVisualWeather(
  officialWeather: string | null | undefined,
  gen: number
): string {
  if (!officialWeather) return 'clear';
  const lower = toID(officialWeather);
  if (lower === 'hail') {
    return gen >= PALDEA_GENERATION_NUM ? 'snow' : 'hail';
  }

  return OFFICIAL_TO_VISUAL_MAP[lower] || 'clear';
}
