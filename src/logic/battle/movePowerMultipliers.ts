import type { Pokemon } from '@/types/pokemon/pokemon'
import type { PokemonType } from '@/data/battle/types'
import { WEATHER_MECHANICAL, type WeatherMechanical } from '@/logic/weather/weatherRegistry'
import type { PokemonMoveId } from '@/data/battle/moves'
import type { DayPhase } from '@/logic/utils/timeUtils'
import type { PureBattleWeather } from './battleMathTypes.ts'

const BASE_STAB_MULT = 1.5
const ADAPTABILITY_STAB_MULTIPLIER = 2
const LOW_HP_PINCH_RATIO_ONE_THIRD = 3
const TECHNICIAN_MAX_POWER_CAP = 60
const DAY_CYCLE_BOOST_MULTIPLIER = 1.2
const ITEM_TYPE_BOOST_MULTIPLIER = 1.2
const CHOICE_BAND_MULTIPLIER = 1.5
const HALF_DAMAGE_MULTIPLIER = 0.5
const SAND_FORCE_MULTIPLIER = 1.3

const TYPE_BOOSTING_ITEMS: Record<string, string> = {
  charcoal: 'fire',
  magnet: 'electric',
  mystic_water: 'water',
  miracle_seed: 'grass',
  black_belt: 'fighting',
  twisted_spoon: 'psychic',
  spell_tag: 'ghost',
  silver_powder: 'bug',
  poison_barb: 'poison',
}

export function calculateStabMultiplier(
  moveType: PokemonType,
  attacker: Pokemon
): number {
  let stab = (moveType === attacker.type || moveType === attacker.type2) ? BASE_STAB_MULT : 1
  if (attacker.ability === 'adaptability' && stab > 1) stab = ADAPTABILITY_STAB_MULTIPLIER
  return stab
}

const PINCH_ABILITIES_MAP: Readonly<Record<string, PokemonType>> = {
  blaze: 'fire',
  torrent: 'water',
  overgrow: 'grass',
  swarm: 'bug',
}

function resolveSunMultiplier(moveType: PokemonType, wType: string): number {
  if (moveType === 'fire') return BASE_STAB_MULT
  if (moveType === 'water') return wType === 'heatwave' ? 0 : HALF_DAMAGE_MULTIPLIER
  return 1
}

function resolveRainMultiplier(moveType: PokemonType): number {
  if (moveType === 'water') return BASE_STAB_MULT
  if (moveType === 'fire') return HALF_DAMAGE_MULTIPLIER
  return 1
}

function resolveWeatherElementalMultiplier(
  mechWeather: WeatherMechanical,
  wType: string,
  moveType: PokemonType
): number {
  if (mechWeather === WEATHER_MECHANICAL.SUN) {
    return resolveSunMultiplier(moveType, wType)
  }
  if (mechWeather === WEATHER_MECHANICAL.RAIN) {
    return resolveRainMultiplier(moveType)
  }
  if (wType === 'thunderstorm' && (moveType === 'electric' || moveType === 'dragon')) {
    return BASE_STAB_MULT
  }
  return 1
}

function isSolarbeamReducedInWeather(
  weather: PureBattleWeather,
  mechWeather: WeatherMechanical
): boolean {
  if (weather.turns === 0) return false
  const isSun = mechWeather === WEATHER_MECHANICAL.SUN
  const isClear = mechWeather === WEATHER_MECHANICAL.CLEAR && weather.type !== 'thunderstorm'
  return !isSun && !isClear
}

function calculateDirectWeatherMultiplier(
  moveType: PokemonType,
  moveId?: PokemonMoveId,
  weather?: PureBattleWeather | null,
  mechWeather: WeatherMechanical = WEATHER_MECHANICAL.CLEAR
): number {
  if (!weather || weather.turns === 0) return 1
  const wType = weather.type || weather.visual || 'clear'
  let weatherMult = resolveWeatherElementalMultiplier(mechWeather, wType, moveType)

  if (moveId === 'solarbeam' && isSolarbeamReducedInWeather(weather, mechWeather)) {
    weatherMult *= HALF_DAMAGE_MULTIPLIER
  }

  return weatherMult
}

function calculateDayCycleMultiplier(
  moveType: PokemonType,
  cycle?: DayPhase
): number {
  if ((cycle === 'day' || cycle === 'morning') && moveType === 'fire') return DAY_CYCLE_BOOST_MULTIPLIER
  if ((cycle === 'night' || cycle === 'dusk') && moveType === 'water') return DAY_CYCLE_BOOST_MULTIPLIER
  return 1
}

export function calculateWeatherAndCyclePowerMultiplier(
  moveType: PokemonType,
  moveId?: PokemonMoveId,
  weather?: PureBattleWeather | null,
  mechWeather: WeatherMechanical = WEATHER_MECHANICAL.CLEAR,
  cycle?: DayPhase
): number {
  const weatherMult = calculateDirectWeatherMultiplier(moveType, moveId, weather, mechWeather)
  if (weatherMult === 1 && (mechWeather === WEATHER_MECHANICAL.CLEAR || !weather)) {
    return calculateDayCycleMultiplier(moveType, cycle)
  }
  return weatherMult
}

function calculateAttackerAbilityMultiplier(
  moveType: PokemonType,
  movePower: number,
  attacker: Pokemon,
  weather: { type?: string; turns?: number } | null | undefined,
  mechWeather: string
): number {
  let abilMult = 1
  const isLowHp = attacker.hp <= (attacker.maxHp / LOW_HP_PINCH_RATIO_ONE_THIRD)

  if (isLowHp && attacker.ability && PINCH_ABILITIES_MAP[attacker.ability] === moveType) {
    abilMult = BASE_STAB_MULT
  }

  if (attacker.ability === 'technician' && movePower <= TECHNICIAN_MAX_POWER_CAP) {
    abilMult *= BASE_STAB_MULT
  }

  if (weather && weather.turns !== 0 && attacker.ability === 'sandforce' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
    if (moveType === 'ground' || moveType === 'rock' || moveType === 'steel') {
      abilMult *= SAND_FORCE_MULTIPLIER
    }
  }

  return abilMult
}

export function calculateAbilityPowerMultiplier(
  moveType: PokemonType,
  movePower: number,
  attacker: Pokemon,
  defender: Pokemon | null | undefined,
  weather: { type?: string; turns?: number } | null | undefined,
  mechWeather: string
): number {
  let abilMult = calculateAttackerAbilityMultiplier(moveType, movePower, attacker, weather, mechWeather)

  if (defender && defender.ability === 'thickfat' && (moveType === 'fire' || moveType === 'ice')) {
    abilMult *= HALF_DAMAGE_MULTIPLIER
  }

  return abilMult
}

export function calculateItemPowerMultiplier(
  moveType: PokemonType,
  moveCategory: string | undefined,
  heldItem: string | null | undefined
): number {
  if (!heldItem) return 1
  let itemMult = 1

  if (TYPE_BOOSTING_ITEMS[heldItem] === moveType) itemMult = ITEM_TYPE_BOOST_MULTIPLIER
  if (heldItem === 'choiceband' && moveCategory === 'physical') itemMult = CHOICE_BAND_MULTIPLIER

  return itemMult
}
