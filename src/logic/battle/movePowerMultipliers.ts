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

export function calculateWeatherAndCyclePowerMultiplier(
  moveType: PokemonType,
  moveId?: PokemonMoveId,
  weather?: PureBattleWeather | null,
  mechWeather: WeatherMechanical = WEATHER_MECHANICAL.CLEAR,
  cycle?: DayPhase
): number {
  let weatherMult = 1

  if (weather && weather.turns !== 0) {
    const wType = weather.type || weather.visual || 'clear'
    if (mechWeather === WEATHER_MECHANICAL.SUN) {
      if (moveType === 'fire') weatherMult = BASE_STAB_MULT
      if (moveType === 'water') weatherMult = (wType === 'heatwave') ? 0 : HALF_DAMAGE_MULTIPLIER
    } else if (mechWeather === WEATHER_MECHANICAL.RAIN) {
      if (moveType === 'water') weatherMult = BASE_STAB_MULT
      if (moveType === 'fire') weatherMult = HALF_DAMAGE_MULTIPLIER
    } else if (wType === 'thunderstorm') {
      if (moveType === 'electric' || moveType === 'dragon') weatherMult = BASE_STAB_MULT
    }
  }

  // Solar Beam reduction in non-sun/non-clear weather
  if (moveId === 'solarbeam' && weather && weather.turns !== 0) {
    const isSun = mechWeather === WEATHER_MECHANICAL.SUN
    const isClear = mechWeather === WEATHER_MECHANICAL.CLEAR && weather.type !== 'thunderstorm'
    if (!isSun && !isClear) {
      weatherMult *= HALF_DAMAGE_MULTIPLIER
    }
  }

  // Day cycle bonus
  if (weatherMult === 1 && (mechWeather === WEATHER_MECHANICAL.CLEAR || !weather)) {
    if ((cycle === 'day' || cycle === 'morning') && moveType === 'fire') weatherMult = DAY_CYCLE_BOOST_MULTIPLIER
    if ((cycle === 'night' || cycle === 'dusk') && moveType === 'water') weatherMult = DAY_CYCLE_BOOST_MULTIPLIER
  }

  return weatherMult
}

export function calculateAbilityPowerMultiplier(
  moveType: PokemonType,
  movePower: number,
  attacker: Pokemon,
  defender: Pokemon | null | undefined,
  weather: { type?: string; turns?: number } | null | undefined,
  mechWeather: string
): number {
  let abilMult = 1
  const isLowHp = attacker.hp <= (attacker.maxHp / LOW_HP_PINCH_RATIO_ONE_THIRD)

  if (isLowHp) {
    if (attacker.ability === 'blaze' && moveType === 'fire') abilMult = BASE_STAB_MULT
    if (attacker.ability === 'torrent' && moveType === 'water') abilMult = BASE_STAB_MULT
    if (attacker.ability === 'overgrow' && moveType === 'grass') abilMult = BASE_STAB_MULT
    if (attacker.ability === 'swarm' && moveType === 'bug') abilMult = BASE_STAB_MULT
  }

  if (attacker.ability === 'technician' && movePower <= TECHNICIAN_MAX_POWER_CAP) {
    abilMult *= BASE_STAB_MULT
  }

  if (weather && weather.turns !== 0 && attacker.ability === 'sandforce' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
    if (moveType === 'ground' || moveType === 'rock' || moveType === 'steel') {
      abilMult *= SAND_FORCE_MULTIPLIER
    }
  }

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
