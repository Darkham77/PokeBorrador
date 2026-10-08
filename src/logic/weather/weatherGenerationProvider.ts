import { SINNOH_GENERATION_NUM, KALOS_GENERATION_NUM, PALDEA_GENERATION_NUM } from '@/logic/constants/gameplay.ts';
import { isWeatherId, type WeatherId, type ShowdownWeatherId } from './weatherRegistry.ts';

const STATIC_OFFICIAL_MAP: Partial<Record<WeatherId, ShowdownWeatherId>> = {
  rain: 'raindance',
  storm: 'raindance',
  sun: 'sunnyday',
  heatwave: 'sunnyday',
  sandstorm: 'sandstorm',
  dust_storm: 'sandstorm'
};

export function mapVisualToOfficialWeather(visualWeather: string | null | undefined, gen: number): ShowdownWeatherId {
  if (!visualWeather) return 'none';
  const lower = isWeatherId(visualWeather) ? visualWeather : null;
  if (!lower) return 'none';

  const staticMatch = STATIC_OFFICIAL_MAP[lower];
  if (staticMatch) return staticMatch;

  if (lower === 'heavy_rain') return gen >= KALOS_GENERATION_NUM ? 'primordialsea' : 'raindance';
  if (lower === 'intense_sun') return gen >= KALOS_GENERATION_NUM ? 'desolateland' : 'sunnyday';
  if (lower === 'strong_winds') return gen >= KALOS_GENERATION_NUM ? 'deltastream' : 'none';
  if (lower === 'snow' || lower === 'hail' || lower === 'blizzard' || lower === 'cold' || lower === 'coldwave') {
    return gen >= PALDEA_GENERATION_NUM ? 'snow' : 'hail';
  }
  if (lower === 'fog' || lower === 'mist') {
    return gen >= SINNOH_GENERATION_NUM ? 'fog' : 'none';
  }

  return 'none';
}
