import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { getDayCycle } from '@/logic/utils/timeUtils'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { PokemonType } from '@/data/battle/types'
import type { PokemonMoveId, MoveCategory } from '@/data/battle/moves'
import type { PureBattleWeather } from '@/logic/battle/battleMathTypes'
import {
  calculateStabMultiplier,
  calculateWeatherAndCyclePowerMultiplier,
  calculateAbilityPowerMultiplier,
  calculateItemPowerMultiplier,
} from './movePowerMultipliers.ts'

export interface CombatEnvState {
  isSunActive: boolean;
  isRainActive: boolean;
  isSnowing: boolean;
  isRaining: boolean;
  isSunny: boolean;
  mechWeather: string;
  weatherType?: string;
  isThunderstorm: boolean;
}

const SUPPRESSED_COMBAT_ENV: CombatEnvState = Object.freeze({
  isSunActive: false,
  isRainActive: false,
  isSnowing: false,
  isRaining: false,
  isSunny: false,
  mechWeather: WEATHER_MECHANICAL.CLEAR,
  weatherType: undefined,
  isThunderstorm: false,
});

function isWeatherSuppressed(
  attacker: Pokemon | null | undefined,
  defender: Pokemon | null | undefined,
  isGym: boolean
): boolean {
  if (isGym) return true;
  return attacker?.ability === 'cloudnine' || defender?.ability === 'cloudnine';
}

/**
 * Extracts unified weather and environment properties for combat calculations.
 */
export function getCombatEnvState(
  attacker: Pokemon | null | undefined,
  defender: Pokemon | null | undefined,
  weatherState: PureBattleWeather | null | undefined,
  isGym: boolean
): CombatEnvState {
  if (isWeatherSuppressed(attacker, defender, isGym)) {
    return SUPPRESSED_COMBAT_ENV;
  }

  const wType = weatherState?.type;
  const mechWeather = getMechanicalWeather(wType);
  const cycle = getDayCycle();
  const isDayTime = cycle === 'day' || cycle === 'morning';
  const isNightTime = cycle === 'night' || cycle === 'dusk';
  const isClear = mechWeather === WEATHER_MECHANICAL.CLEAR;
  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN;
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN;

  return {
    isSunActive: isSunny || (isClear && isDayTime),
    isRainActive: isRaining || (isClear && isNightTime),
    isSnowing: mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL,
    isRaining,
    isSunny,
    mechWeather,
    weatherType: wType,
    isThunderstorm: wType === 'thunderstorm',
  };
}

export interface MoveCalculationData {
  type: PokemonType
  power?: number
  id?: PokemonMoveId
  cat?: MoveCategory
}

/**
 * Calculates final move power applying STAB, weather, time cycles, abilities, and items.
 */
export function calculateFinalPower(
  md: MoveCalculationData | null,
  attacker: Pokemon | null | undefined,
  defender: Pokemon | null | undefined,
  weatherState: PureBattleWeather | null | undefined,
  isGym: boolean
): number {
  if (!md || md.power === undefined || md.power === 0) return md?.power || 0
  let power = md.power
  if (!attacker) return power

  const isAclimatacion = attacker?.ability === 'cloudnine' || defender?.ability === 'cloudnine'
  const weather = isGym || isAclimatacion ? null : weatherState
  const mechWeather = isGym || isAclimatacion ? WEATHER_MECHANICAL.CLEAR : getMechanicalWeather(weather?.type)
  const cycle = getDayCycle()
  const moveType = md.type

  // 1. STAB
  power *= calculateStabMultiplier(moveType, attacker)

  // 2. Weather & Day cycle
  power *= calculateWeatherAndCyclePowerMultiplier(moveType, md.id, weather, mechWeather, cycle)

  // 3. Abilities (Attacker & Defender)
  power *= calculateAbilityPowerMultiplier(moveType, md.power, attacker, defender, weather, mechWeather)

  // 4. Item
  power *= calculateItemPowerMultiplier(moveType, md.cat, attacker.heldItem)

  return Math.max(0, Math.round(power))
}

/**
 * Calculates final move accuracy applying stages, weather, and specific move/environment rules.
 */
const NEVER_MISS_ACCURACY_THRESHOLD = 1000
const SUN_ACCURACY_PENALIZED_THUNDER_HURRICANE = 50

function applyWeatherAccuracyModifier(
  baseAcc: number,
  moveId: PokemonMoveId,
  weather: string | null | undefined,
  mechWeather: string,
  isSunActive: boolean,
  isRainActive: boolean
): number {
  const isThunderstorm = weather === 'thunderstorm'
  if ((isRainActive || isThunderstorm) && (moveId === 'thunder' || moveId === 'hurricane')) {
    return 100
  }
  if (isSunActive && (moveId === 'thunder' || moveId === 'hurricane')) {
    return SUN_ACCURACY_PENALIZED_THUNDER_HURRICANE
  }
  if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && moveId === 'blizzard') {
    return 100
  }
  if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather === 'mist' || weather === 'mist_visual'
    return Math.floor(baseAcc * (isMist ? 0.8 : 0.6))
  }
  return baseAcc
}

function calculateNetAccuracyStageMultiplier(accStage: number, evaStage: number): number {
  const clampedAccStage = Math.max(-6, Math.min(6, accStage))
  const clampedEvaStage = Math.max(-6, Math.min(6, evaStage))
  const netStage = Math.max(-6, Math.min(6, clampedAccStage - clampedEvaStage))
  return netStage >= 0 ? (3 + netStage) / 3 : 3 / (3 - netStage)
}

export function calculateFinalAccuracy(
  md: { id?: PokemonMoveId; acc?: number } | null,
  attacker: Pokemon | null | undefined,
  defender: Pokemon | null | undefined,
  weatherState: { type?: string } | null | undefined,
  isGym: boolean,
  accStage: number,
  evaStage: number
): number {
  if (!md || md.acc === undefined || md.acc === NEVER_MISS_ACCURACY_THRESHOLD) return md?.acc || 0

  const isAclimatacion = attacker?.ability === 'cloudnine' || defender?.ability === 'cloudnine'
  const weather = isGym || isAclimatacion ? null : weatherState?.type
  const mechWeather = isGym || isAclimatacion ? WEATHER_MECHANICAL.CLEAR : getMechanicalWeather(weather)
  const cycle = getDayCycle()
  const isSunActive = !isGym && !isAclimatacion && (mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning')))
  const isRainActive = !isGym && !isAclimatacion && (mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk')))

  const weatherAcc = md.id
    ? applyWeatherAccuracyModifier(md.acc, md.id, weather, mechWeather, isSunActive, isRainActive)
    : md.acc
  const multiplier = calculateNetAccuracyStageMultiplier(accStage, evaStage)
  const finalAcc = weatherAcc * multiplier

  return Math.max(0, Math.min(100, Math.round(finalAcc)))
}

function checkMoveSpecificModifier(moveId: PokemonMoveId, env: CombatEnvState): 'boosted' | 'penalized' | null {
  if (moveId === 'thunder' || moveId === 'hurricane') {
    if (env.isSunny) return 'penalized'
    if (env.isRaining) return 'boosted'
  }
  if (moveId === 'blizzard') {
    if (env.isSnowing) return 'boosted'
  }
  if (moveId === 'solarbeam' || moveId === 'solarblade') {
    if (env.mechWeather !== WEATHER_MECHANICAL.CLEAR && !env.isSunActive) return 'penalized'
    if (env.isSunActive) return 'boosted'
  }
  if (moveId === 'weatherball') {
    if (env.mechWeather !== WEATHER_MECHANICAL.CLEAR) return 'boosted'
  }
  return null
}

function checkTypeWeatherModifier(moveType: string, env: CombatEnvState): 'boosted' | 'penalized' | null {
  if (moveType === 'fire') {
    if (env.isRaining) return 'penalized'
    if (env.isSunActive) return 'boosted'
  }
  if (moveType === 'water') {
    if (env.isSunny) return 'penalized'
    if (env.isRainActive) return 'boosted'
  }
  return null
}

/**
 * Determines whether the move is boosted or penalized under current weather/env.
 */
export function calculateMoveModifier(
  md: { id?: PokemonMoveId; type: string; cat?: string } | null,
  isBattleActive: boolean,
  env: CombatEnvState
): 'boosted' | 'penalized' | null {
  if (!md || !isBattleActive) return null

  const specific = md.id ? checkMoveSpecificModifier(md.id, env) : null
  if (specific) return specific

  if (env.mechWeather === WEATHER_MECHANICAL.FOG) {
    return 'penalized'
  }

  if (md.cat === 'status') return null

  return checkTypeWeatherModifier(md.type, env)
}
