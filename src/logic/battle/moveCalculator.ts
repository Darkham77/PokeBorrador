import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { getDayCycle } from '@/logic/utils/timeUtils'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { PokemonType } from '@/data/battle/types'

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

  // 1. STAB
  const moveType = md.type as PokemonType;
  let stab = (moveType === attacker.type || moveType === attacker.type2) ? 1.5 : 1
  if (attacker.ability === 'adaptability' && stab > 1) stab = 2
  power *= stab

  // 2. Weather
  let weatherMult = 1
  if (weather && weather.turns !== 0) {
    const wType = (weather.type || weather.visual || 'clear')
    if (mechWeather === WEATHER_MECHANICAL.SUN) {
      if (moveType === 'fire') weatherMult = 1.5
      if (moveType === 'water') weatherMult = (wType === 'heatwave') ? 0 : 0.5
    } else if (mechWeather === WEATHER_MECHANICAL.RAIN) {
      if (moveType === 'water') weatherMult = 1.5
      if (moveType === 'fire') weatherMult = (wType === 'storm' || wType === 'heavy_rain' || wType === 'raindance') ? 0.5 : 0.5
    } else if (wType === 'thunderstorm') {
      if (moveType === 'electric' || moveType === 'dragon') weatherMult = 1.5
    }
  }

  // Solar Beam
  if (md.id === 'solarbeam' && weather && weather.turns !== 0) {
    const isSun = mechWeather === WEATHER_MECHANICAL.SUN
    const isClear = mechWeather === WEATHER_MECHANICAL.CLEAR && weather.type !== 'thunderstorm'
    if (!isSun && !isClear) {
      weatherMult *= 0.5
    }
  }

  // Day cycle
  if (weatherMult === 1 && (mechWeather === WEATHER_MECHANICAL.CLEAR || !weather)) {
    if ((cycle === 'day' || cycle === 'morning') && moveType === 'fire') weatherMult = 1.2
    if ((cycle === 'night' || cycle === 'dusk') && moveType === 'water') weatherMult = 1.2
  }

  power *= weatherMult

  // 3. Ability
  let abilMult = 1
  const isLowHp = attacker.hp <= (attacker.maxHp / 3)
  if (isLowHp) {
    if (attacker.ability === 'blaze' && moveType === 'fire') abilMult = 1.5
    if (attacker.ability === 'torrent' && moveType === 'water') abilMult = 1.5
    if (attacker.ability === 'overgrow' && moveType === 'grass') abilMult = 1.5
    if (attacker.ability === 'swarm' && moveType === 'bug') abilMult = 1.5
  }
  if (attacker.ability === 'technician' && md.power <= 60) {
    abilMult *= 1.5
  }
  if (weather && weather.turns !== 0 && attacker.ability === 'sandforce' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
    if (moveType === 'ground' || moveType === 'rock' || moveType === 'steel') {
      abilMult *= 1.3
    }
  }
  power *= abilMult

  // 4. Defender Ability
  if (defender && defender.ability === 'thickfat' && (moveType === 'fire' || moveType === 'ice')) {
    power *= 0.5
  }

  // 5. Item
  let itemMult = 1
  if (attacker.heldItem) {
    const h = attacker.heldItem
    const typeBoosters: Record<string, string> = {
      charcoal: 'fire',
      magnet: 'electric',
      mystic_water: 'water',
      miracle_seed: 'grass',
      black_belt: 'fighting',
      twisted_spoon: 'psychic',
      spell_tag: 'ghost',
      silver_powder: 'bug',
      poison_barb: 'poison'
    }
    if (typeBoosters[h] === moveType) itemMult = 1.2
    if (h === 'choiceband' && md.cat === 'physical') itemMult = 1.5
  }
  power *= itemMult

  return Math.max(0, Math.round(power))
}

/**
 * Calculates final move accuracy applying stages, weather, and specific move/environment rules.
 */
export function calculateFinalAccuracy(
  md: { id?: string; acc?: number } | null,
  attacker: Pokemon | null | undefined,
  defender: Pokemon | null | undefined,
  weatherState: { type?: string } | null | undefined,
  isGym: boolean,
  accStage: number,
  evaStage: number
): number {
  if (!md || md.acc === undefined || md.acc === 1000) return md?.acc || 0
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
    acc = 50
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
