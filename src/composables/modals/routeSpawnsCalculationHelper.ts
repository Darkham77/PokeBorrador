import { TYPE_TRANSLATIONS, type PokemonType } from '@/data/battle/types';
import { GAME_RATIOS } from '@/data/system/constants';
import type { MapLocation } from '@/types/pokemon/encounters';
import type { WeatherId } from '@/logic/weather/weatherRegistry';

export const ARCHAEOLOGY_CAVE_BASE_WEIGHT = 10;
export const ARCHAEOLOGY_MOUNTAIN_BASE_WEIGHT = 5;
const RAINY_FISHING_CLIMATE_MULTIPLIER = 1.20;
export const EQUIPPED_TOOL_WEIGHT_BONUS = 600;
export const BASE_GROUND_WEIGHT = 100;
const FISHING_WEIGHT_RATIO_MULTIPLIER = 100;

export interface ExtendedMapLocation extends MapLocation {
  isVolcanic?: boolean;
  isSwamp?: boolean;
  isArctic?: boolean;
  isForest?: boolean;
  isCoastal?: boolean;
  isMountain?: boolean;
  isPlains?: boolean;
  isUrban?: boolean;
}

export interface RouteSpawnWeights {
  ground: number;
  fishing: number;
  archaeology: number;
  total: number;
  baseGround: number;
  baseFishing: number;
  baseArchaeology: number;
  baseTotal: number;
}

const RAINY_WEATHERS = ['rain', 'heavy_rain', 'storm', 'thunderstorm'] as const;
type RainyWeather = (typeof RAINY_WEATHERS)[number];
const SPAWN_CALC_RAINY_WEATHERS_SET: ReadonlySet<RainyWeather> = new Set<RainyWeather>(RAINY_WEATHERS); // runtime-set: Fast O(1) membership lookup set

export function calculateFishingWeight(
  hasFishing: boolean,
  weather: WeatherId,
  hasFishingRod: boolean,
  eventFishingBonus: number = 1
): { active: number; base: number } {
  if (!hasFishing) {
    return { active: 0, base: 0 };
  }

  const isRainy = SPAWN_CALC_RAINY_WEATHERS_SET.has(weather.toLowerCase() as RainyWeather); // text-ok: UI text display localization string
  const climateFishingMultiplier = isRainy ? RAINY_FISHING_CLIMATE_MULTIPLIER : 1.0;
  const fishingBonus = eventFishingBonus * climateFishingMultiplier;

  const base = GAME_RATIOS.encounters.fishing * FISHING_WEIGHT_RATIO_MULTIPLIER;
  let active = base * fishingBonus;
  if (hasFishingRod) {
    active += EQUIPPED_TOOL_WEIGHT_BONUS;
  }

  return { active, base };
}

export function calculateArchaeologyWeight(
  hasArchaeology: boolean,
  isCave: boolean,
  isMountain: boolean,
  hasPickaxeOrBrush: boolean
): { active: number; base: number } {
  if (!hasArchaeology) {
    return { active: 0, base: 0 };
  }

  const base = isCave ? ARCHAEOLOGY_CAVE_BASE_WEIGHT : (isMountain ? ARCHAEOLOGY_MOUNTAIN_BASE_WEIGHT : 0);
  let active = base;
  if (hasPickaxeOrBrush) {
    active += EQUIPPED_TOOL_WEIGHT_BONUS;
  }

  return { active, base };
}

export function computeActiveWeights(
  map: ExtendedMapLocation,
  weather: WeatherId,
  hasFishingRod: boolean,
  hasPickaxeOrBrush: boolean,
  eventFishingBonus: number = 1
): RouteSpawnWeights {
  const groundWeight = BASE_GROUND_WEIGHT;

  const { active: fishingWeight, base: baseFishingWeight } = calculateFishingWeight(
    Boolean(map.fishing),
    weather,
    hasFishingRod,
    eventFishingBonus
  );

  const { active: archWeight, base: baseArchWeight } = calculateArchaeologyWeight(
    Boolean(map.archaeology),
    Boolean(map.isCave),
    Boolean(map.isMountain),
    hasPickaxeOrBrush
  );

  return {
    ground: groundWeight,
    fishing: fishingWeight,
    archaeology: archWeight,
    total: groundWeight + fishingWeight + archWeight,
    baseGround: groundWeight,
    baseFishing: baseFishingWeight,
    baseArchaeology: baseArchWeight,
    baseTotal: groundWeight + baseFishingWeight + baseArchWeight,
  };
}

const SPANISH_TYPE_ENTRIES = Object.entries(TYPE_TRANSLATIONS) as [PokemonType, string][];
const SPANISH_TYPE_MAP: Record<string, PokemonType> = Object.fromEntries([
  ...SPANISH_TYPE_ENTRIES.map(([eng, esp]) => [esp.toLowerCase(), eng]), // text-ok: UI text display localization string
  ['electrico', 'electric'],
  ['dragon', 'dragon'],
  ['psiquico', 'psychic']
]);

const SPANISH_TYPES_REGEX = /\b(normal|fuego|agua|planta|eléctrico|electrico|hielo|lucha|veneno|tierra|volador|psíquico|psiquico|bicho|roca|fantasma|dragón|dragon|siniestro|acero|hada)\b/gi;

interface WeatherLinePrefix {
  typeClass: string;
  icon: string;
  label: string;
  restOfSentence: string;
}

function detectWeatherLinePrefix(sentence: string): WeatherLinePrefix {
  const lowerSentence = sentence.toLowerCase(); // text-ok: UI text display localization string

  if (lowerSentence.startsWith('potencia')) {
    return { typeClass: 'boost', icon: '▲ ', label: 'POTENCIA:', restOfSentence: sentence.substring(8).trim() };
  }
  if (lowerSentence.startsWith('debilita')) {
    return { typeClass: 'debuff', icon: '▼ ', label: 'DEBILITA:', restOfSentence: sentence.substring(8).trim() };
  }
  if (lowerSentence.startsWith('penaliza')) {
    return { typeClass: 'debuff', icon: '▼ ', label: 'PENALIZA:', restOfSentence: sentence.substring(8).trim() };
  }
  if (lowerSentence.startsWith('bloquea')) {
    return { typeClass: 'block', icon: 'block', label: 'BLOQUEA:', restOfSentence: sentence.substring(7).trim() };
  }
  if (lowerSentence.startsWith('efecto:')) {
    return { typeClass: 'effect', icon: '⚡ ', label: 'EFECTO:', restOfSentence: sentence.substring(7).trim() };
  }

  return { typeClass: '', icon: '', label: '', restOfSentence: sentence };
}

export interface ParsedWeatherDescriptionLine {
  segments: { text: string; isType: boolean; type: string }[];
  typeClass: string;
  icon: string;
  label: string;
}

export function parseWeatherDescription(desc: string): ParsedWeatherDescriptionLine[] {
  if (!desc) return [];

  const sentences = desc.split(/\n|\.\s+/).map(s => s.trim()).filter(Boolean);
  return sentences.map(sentence => {
    const currentSentence = sentence.replace(/^[▲▼•]\s*/u, '').trim();
    const { typeClass, icon, label, restOfSentence } = detectWeatherLinePrefix(currentSentence);

    const parts = restOfSentence.split(SPANISH_TYPES_REGEX);
    const segments = parts.filter(Boolean).map(part => {
      const lower = part.toLowerCase(); // text-ok: UI text display localization string
      const typeKey = SPANISH_TYPE_MAP[lower];
      return {
        text: part,
        isType: Boolean(typeKey),
        type: typeKey ?? '',
      };
    });

    return { segments, typeClass, icon, label };
  });
}

export function formatTerrainTags(m: ExtendedMapLocation): string {
  const tags: string[] = []; // no-domain: Non-domain utility collection or data structure
  if (m.isCrystalCave) tags.push('💎 Cueva de Cristal');
  if (m.isCave) tags.push('🧗 Cueva');
  if (m.isVolcanic) tags.push('🌋 Volcánico');
  if (m.isSwamp) tags.push('🐊 Pantano');
  if (m.isArctic) tags.push('❄️ Ártico');
  if (m.isForest) tags.push('🌲 Bosque');
  if (m.isCoastal) tags.push('🏖️ Costa');
  if (m.isMountain) tags.push('⛰️ Montaña');
  if (m.isPlains) tags.push('🌾 Llanura');
  if (m.isUrban) tags.push('🏙️ Urbano');
  if (m.isIndoors) tags.push('🏠 Interior');

  if (tags.length === 0) tags.push('🌲 Exterior');
  return tags.join(', ');
}
