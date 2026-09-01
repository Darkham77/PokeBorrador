import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { getDayCycle } from '@/logic/utils/timeUtils'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { PokemonType } from '@/data/battle/types'
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

/**
 * Extracts unified weather and environment properties for combat calculations.
 */
export function getCombatEnvState(
  attacker: Pokemon | null | undefined,
  defender: Pokemon | null | undefined,
  weatherState: { type?: string; visual?: string; turns?: number } | null | undefined,
  isGym: boolean
): CombatEnvState {
  const isAclimatacion = attacker?.ability === 'cloudnine' || defender?.ability === 'cloudnine'
  const activeWeather = isGym || isAclimatacion ? null : weatherState
  const wType = activeWeather?.type
  const mechWeather = isGym || isAclimatacion ? WEATHER_MECHANICAL.CLEAR : getMechanicalWeather(wType)
  const cycle = getDayCycle()

  const isRaining = !isGym && !isAclimatacion && mechWeather === WEATHER_MECHANICAL.RAIN
  const isSunny = !isGym && !isAclimatacion && mechWeather === WEATHER_MECHANICAL.SUN
  const isSnowing = !isGym && !isAclimatacion && (mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL)
  const isDayTime = cycle === 'day' || cycle === 'morning'
  const isNightTime = cycle === 'night' || cycle === 'dusk'

  const isSunActive = !isGym && !isAclimatacion && (isSunny || (mechWeather === WEATHER_MECHANICAL.CLEAR && isDayTime))
  const isRainActive = !isGym && !isAclimatacion && (isRaining || (mechWeather === WEATHER_MECHANICAL.CLEAR && isNightTime))
  const isThunderstorm = wType === 'thunderstorm'

  return {
    isSunActive,
    isRainActive,
    isSnowing,
    isRaining,
    isSunny,
    mechWeather,
    weatherType: wType,
    isThunderstorm
  }
}

/**
 * Calculates final move power applying STAB, weather, time cycles, abilities, and items.
 */
export function calculateFinalPower(
  md: { type: string; power?: number; id?: string; cat?: string } | null,
  attacker: Pokemon | null | undefined,
  defender: Pokemon | null | undefined,
  weatherState: { type?: string; visual?: string; turns?: number } | null | undefined,
  isGym: boolean
): number {
  if (!md || md.power === undefined || md.power === 0) return md?.power || 0
  let power = md.power
  if (!attacker) return power

  const isAclimatacion = attacker?.ability === 'cloudnine' || defender?.ability === 'cloudnine'
  const weather = isGym || isAclimatacion ? null : weatherState
  const mechWeather = isGym || isAclimatacion ? WEATHER_MECHANICAL.CLEAR : getMechanicalWeather(weather?.type)
  const cycle = getDayCycle()
  const moveType = md.type as PokemonType

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

export function calculateFinalAccuracy(
  md: { id?: string; acc?: number } | null,
  attacker: Pokemon | null | undefined,
  defender: Pokemon | null | undefined,
  weatherState: { type?: string } | null | undefined,
  isGym: boolean,
  accStage: number,
  evaStage: number
): number {
  if (!md || md.acc === undefined || md.acc === NEVER_MISS_ACCURACY_THRESHOLD) return md?.acc || 0
  let acc = md.acc

  const isAclimatacion = attacker?.ability === 'cloudnine' || defender?.ability === 'cloudnine'
  const weather = isGym || isAclimatacion ? null : weatherState?.type
  const mechWeather = isGym || isAclimatacion ? WEATHER_MECHANICAL.CLEAR : getMechanicalWeather(weather)
  const cycle = getDayCycle()
  const isSunActive = !isGym && !isAclimatacion && (mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning')))
  const isRainActive = !isGym && !isAclimatacion && (mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk')))

  const isThunderstorm = weather === 'thunderstorm'
  if ((isRainActive || isThunderstorm) && (md.id === 'thunder' || md.id === 'hurricane')) {
    acc = 100
  } else if (isSunActive && (md.id === 'thunder' || md.id === 'hurricane')) {
    acc = SUN_ACCURACY_PENALIZED_THUNDER_HURRICANE
  } else if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && md.id === 'blizzard') {
    acc = 100
  } else if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather === "mist" || weather === "mist_visual"
    acc = Math.floor(md.acc * (isMist ? 0.8 : 0.6))
  }

  const clampedAccStage = Math.max(-6, Math.min(6, accStage))
  const clampedEvaStage = Math.max(-6, Math.min(6, evaStage))
  const netStage = Math.max(-6, Math.min(6, clampedAccStage - clampedEvaStage))
  let multiplier = 1
  if (netStage >= 0) {
    multiplier = (3 + netStage) / 3
  } else {
    multiplier = 3 / (3 - netStage)
  }
  acc = acc * multiplier
  return Math.max(0, Math.min(100, Math.round(acc)))
}

/**
 * Determines whether the move is boosted or penalized under current weather/env.
 */
export function calculateMoveModifier(
  md: { id?: string; type: string; cat?: string } | null,
  isBattleActive: boolean,
  env: CombatEnvState
): 'boosted' | 'penalized' | null {
  if (!md || !isBattleActive) return null
  const moveId = md.id || ''

  // 1. Accuracy Boosted
  if (moveId === 'thunder' || moveId === 'hurricane') {
    if (env.isSunny) return 'penalized'
    if (env.isRaining) return 'boosted'
  }

  if (moveId === 'blizzard') {
    if (env.isSnowing) return 'boosted'
  }

  // 2. Solar Moves
  if (moveId === 'solarbeam' || moveId === 'solarblade') {
    if (env.mechWeather !== WEATHER_MECHANICAL.CLEAR && !env.isSunActive) return 'penalized'
    if (env.isSunActive) return 'boosted'
  }

  // 3. Weather Ball
  if (moveId === 'weather_ball') {
    if (env.mechWeather !== WEATHER_MECHANICAL.CLEAR) return 'boosted'
  }

  // 4. Accuracy Penalties (Fog)
  if (env.mechWeather === WEATHER_MECHANICAL.FOG) {
    return 'penalized'
  }

  if (md.cat === 'status') return null

  // 5. Elemental
  if (md.type === 'fire') {
    if (env.isRaining) return 'penalized'
    if (env.isSunActive) return 'boosted'
  }
  if (md.type === 'water') {
    if (env.isSunny) return 'penalized'
    if (env.isRainActive) return 'boosted'
  }

  return null
}
