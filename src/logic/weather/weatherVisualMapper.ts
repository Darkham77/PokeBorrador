import { toID } from '@/logic/utils/strings.ts';
import { PALDEA_GENERATION_NUM } from '@/logic/constants/gameplay.ts';
import { type WeatherId, type ShowdownWeatherId } from './weatherRegistry.ts';

/**
 * Returns the localized weather name in Spanish for a given official Showdown weather ID.
 */
export function getLocalizedWeatherName(
  officialWeatherId: ShowdownWeatherId | WeatherId,
  gen: number
): string {
  if (officialWeatherId === 'none' || officialWeatherId === 'clear' || officialWeatherId === 'null')
    return 'Despejado';
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

  const entry = (localizedMap as Record<string, string | undefined>)[lower]; // open-record: Localized weather dictionary
  return entry || 'Despejado';
}

const OFFICIAL_TO_VISUAL_MAP: Record<string, string> = {
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
