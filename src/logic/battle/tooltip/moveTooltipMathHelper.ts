/**
 * src/logic/battle/tooltip/moveTooltipMathHelper.ts
 *
 * Modular helper utilities for move tooltip special move modifiers,
 * weather accuracy overrides, and power calculations.
 */

import { WEATHER_MECHANICAL, type WeatherId, type WeatherMechanical } from '@/logic/weather/weatherRegistry.ts';
import type { PokemonMoveId } from '@/data/battle/moves.ts';
import type { PokemonType } from '@/data/battle/types.ts';
import { isItemId, type ItemId } from '@/data/inventory/items.ts';
import type { PureBattleWeather } from '@/logic/battle/battleMathTypes.ts';
import type { Move } from '@/types/pokemon/pokemon.ts';
import {
  LOW_HP_ABILITY_MULTIPLIER,
  STAB_STANDARD_MULTIPLIER,
  TECHNICIAN_POWER_CAP,
  SAND_FORCE_MULTIPLIER
} from '@/logic/constants/gameplay.ts';

const MIST_ACCURACY_PENALTY_PCT = 0.8;
const FOG_ACCURACY_PENALTY_PCT = 0.6;
const WEATHER_PENALIZED_ACCURACY_TEXT = 'Penalizado por Clima Soleado (Precisión 50%)';
const WEATHER_ADVERSE_PENALTY_TEXT = 'Penalizado por clima adverso (0.5x y requiere carga)';
const WEATHER_BALL_BOOST_TEXT = 'Tipo y potencia adaptados al clima (100 BP).';
export const WEATHER_RAIN_PENALTY_TEXT = 'Penalizado por Lluvia (0.5x)';
export const WEATHER_SUN_BOOST_TEXT = 'Potenciado por Sol (1.5x)';
export const WEATHER_SUN_PENALTY_TEXT = 'Penalizado por Sol (0.5x)';
export const WEATHER_RAIN_BOOST_TEXT = 'Potenciado por Lluvia (1.5x)';
const HELD_ITEM_TYPE_BOOST_MULTIPLIER = 1.2;
const SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER = 0.5;
const STAGE_MATH_BASE = 3;
const STAGE_MIN_BOUND = -6;
const STAGE_MAX_BOUND = 6;
export const THICK_FAT_REDUCTION_MULTIPLIER = 0.5;
export const STAGE_PRECISION_LIMIT = 100;
export const STAGE_PRECISION_FULL = 1000;
export const LOW_HP_THIRD_DIVISOR = 3;
export const BASE_POWER_MINIMAL_BOUND = 1;
export const DEFAULT_WEATHER_NEUTRAL_MULTIPLIER = 1;
const STAGE_PRECISION_SUN_PENALTY = 50;
export const CRIT_REDUCTION_ZERO = 0;
export const CRIT_PERCENT_SCALE = 100;

export interface PowerContext {
  powerList: { label: string; mult: number }[];
  currentPower: number;
}

function checkThunderOrHurricane(
  moveId: PokemonMoveId,
  isSunny: boolean,
  isRaining: boolean,
  isThunderstorm: boolean
): { type: string; text: string } | null {
  if (moveId !== 'thunder' && moveId !== 'hurricane') return null;
  if (isSunny) return { type: 'penalized', text: WEATHER_PENALIZED_ACCURACY_TEXT };
  if (isRaining || isThunderstorm) {
    const weatherName = isThunderstorm ? 'Tormenta Eléctrica' : 'Lluvia';
    return { type: 'boosted', text: `Potenciado por ${weatherName} (¡No falla!)` };
  }
  return null;
}

function checkSolarMove(
  moveId: PokemonMoveId,
  isSunny: boolean,
  mechWeather: WeatherMechanical
): { type: string; text: string } | null {
  if (moveId !== 'solarbeam' && moveId !== 'solarblade') return null;
  if (isSunny) return { type: 'boosted', text: 'Carga instantánea por Sol.' };
  if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return { type: 'penalized', text: WEATHER_ADVERSE_PENALTY_TEXT };
  return null;
}

export function getSpecialMoveModifier(
  moveId: PokemonMoveId,
  weather: WeatherId | undefined,
  mechWeather: WeatherMechanical
): { type: string; text: string } | null {
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN;
  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN;
  const isSnowing = mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL;
  const isThunderstorm = weather?.toLowerCase() === 'thunderstorm';

  const thunderRes = checkThunderOrHurricane(moveId, isSunny, isRaining, isThunderstorm);
  if (thunderRes) return thunderRes;

  if (moveId === 'blizzard' && isSnowing) {
    return { type: 'boosted', text: 'Potenciado por Granizo/Nieve (¡No falla!)' };
  }

  const solarRes = checkSolarMove(moveId, isSunny, mechWeather);
  if (solarRes) return solarRes;

  if (moveId === 'weatherball' && mechWeather !== WEATHER_MECHANICAL.CLEAR) {
    return { type: 'boosted', text: WEATHER_BALL_BOOST_TEXT };
  }
  return null;
}

const WEATHER_TYPE_POWER_MODS: Readonly<Partial<Record<WeatherMechanical, Readonly<Partial<Record<PokemonType, { mult: number; label: string }>>>>>> = {
  [WEATHER_MECHANICAL.SUN]: {
    fire: { mult: 1.5, label: 'Clima (Sol)' },
    water: { mult: 0.5, label: 'Clima (Sol)' }
  },
  [WEATHER_MECHANICAL.RAIN]: {
    water: { mult: 1.5, label: 'Clima (Lluvia)' },
    fire: { mult: 0.5, label: 'Clima (Lluvia)' }
  }
} as const;

export function applyWeatherPowerMod(
  moveType: PokemonType,
  mechWeather: WeatherMechanical,
  ctx: PowerContext,
  moveId?: PokemonMoveId
): void {
  const weatherMod = WEATHER_TYPE_POWER_MODS[mechWeather]?.[moveType];
  if (weatherMod) {
    ctx.powerList.push({ label: weatherMod.label, mult: weatherMod.mult });
    ctx.currentPower *= weatherMod.mult;
  }

  const isSolarMove = moveId === 'solarbeam' || moveId === 'solarblade';
  const isAdverse = mechWeather !== WEATHER_MECHANICAL.SUN && mechWeather !== WEATHER_MECHANICAL.CLEAR;
  if (isSolarMove && isAdverse) {
    ctx.powerList.push({ label: 'Clima Adverso', mult: SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER });
    ctx.currentPower *= SOLARBEAM_CLIMATE_PENALTY_MULTIPLIER;
  }
}

const LOW_HP_PINCH_ABILITIES: Readonly<Record<string, string>> = {
  overgrow: 'grass',
  blaze: 'fire',
  torrent: 'water',
  swarm: 'bug'
} as const;

const SAND_FORCE_BOOSTED_TYPES = ['rock', 'ground', 'steel'] as const;
type SandForceBoostedType = (typeof SAND_FORCE_BOOSTED_TYPES)[number];
const SAND_FORCE_BOOSTED_SET: ReadonlySet<string> = new Set(SAND_FORCE_BOOSTED_TYPES);

function isSandForceBoostedType(type: string): type is SandForceBoostedType {
  return SAND_FORCE_BOOSTED_SET.has(type);
}

function resolvePinchAbilityMultiplier(ability: string, moveType: string, isLowHp: boolean): number {
  if (isLowHp && LOW_HP_PINCH_ABILITIES[ability] === moveType) {
    return LOW_HP_ABILITY_MULTIPLIER;
  }
  return DEFAULT_WEATHER_NEUTRAL_MULTIPLIER;
}

export function resolveAttackerAbilityMultiplier(
  ability: string,
  moveType: string,
  basePower: number,
  mechWeather: string,
  isLowHp: boolean
): number {
  let abilMult = resolvePinchAbilityMultiplier(ability, moveType, isLowHp);
  if (ability === 'technician' && basePower <= TECHNICIAN_POWER_CAP) abilMult *= 1.5;
  if (ability === 'sandforce' && mechWeather === WEATHER_MECHANICAL.SANDSTORM && isSandForceBoostedType(moveType)) {
    abilMult *= SAND_FORCE_MULTIPLIER;
  }
  return abilMult;
}

export function resolveHeldItemMultiplier(
  h: string,
  move: Move,
  moveType: string,
  heldItemBoosters: Readonly<Partial<Record<ItemId, PokemonType>>>,
  ctx: PowerContext
): number {
  const canonicalKey = h.replace(/_/g, '');
  const itemKey: ItemId | null = isItemId(h) ? h : (isItemId(canonicalKey) ? canonicalKey : null);
  if (itemKey && heldItemBoosters[itemKey] === moveType) {
    return HELD_ITEM_TYPE_BOOST_MULTIPLIER;
  }
  if (h === 'choiceband') {
    if (move.cat === 'physical') return STAB_STANDARD_MULTIPLIER;
    ctx.powerList.push({ label: 'Objeto (choiceband - Solo Físico)', mult: DEFAULT_WEATHER_NEUTRAL_MULTIPLIER });
  }
  return DEFAULT_WEATHER_NEUTRAL_MULTIPLIER;
}

export function resolveThunderHurricaneAccuracy(
  mechWeather: WeatherMechanical,
  weather: PureBattleWeather | null | undefined,
  accList: { label: string; mult: number | string }[]
): number | null {
  if (mechWeather === WEATHER_MECHANICAL.RAIN || weather?.type === 'thunderstorm') {
    accList.push({ label: 'Lluvia (¡No falla!)', mult: '100%' });
    return STAGE_PRECISION_LIMIT;
  }
  if (mechWeather === WEATHER_MECHANICAL.SUN) {
    accList.push({ label: 'Sol (Precisión 50%)', mult: '0.5' });
    return STAGE_PRECISION_SUN_PENALTY;
  }
  return null;
}

export function resolveBlizzardAccuracy(
  mechWeather: WeatherMechanical,
  accList: { label: string; mult: number | string }[]
): number | null {
  if (mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) {
    accList.push({ label: 'Nieve (¡No falla!)', mult: '100%' });
    return STAGE_PRECISION_LIMIT;
  }
  return null;
}

export function resolveFogAccuracy(
  mechWeather: WeatherMechanical,
  weather: PureBattleWeather | null | undefined,
  baseAcc: number,
  accList: { label: string; mult: number | string }[]
): number {
  if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather?.type === 'mist' || weather?.type === 'mist_visual';
    const factor = isMist ? MIST_ACCURACY_PENALTY_PCT : FOG_ACCURACY_PENALTY_PCT;
    accList.push({ label: 'Niebla/Bruma', mult: factor });
    return Math.floor(baseAcc * factor);
  }
  return baseAcc;
}

export function applyStageAccuracyModifier(
  currentAcc: number,
  accStage: number,
  evaStage: number,
  accList: { label: string; mult: number | string }[]
): number {
  const netStage = Math.max(STAGE_MIN_BOUND, Math.min(STAGE_MAX_BOUND, accStage - evaStage));
  if (netStage === 0) return currentAcc;

  const factor = netStage >= 0
    ? (STAGE_MATH_BASE + netStage) / STAGE_MATH_BASE
    : STAGE_MATH_BASE / (STAGE_MATH_BASE - netStage);
  const sign = netStage > 0 ? '+' : '';
  accList.push({ label: `Modificador Rango (${sign}${netStage})`, mult: Number(factor.toFixed(3)) });
  return currentAcc * factor;
}
