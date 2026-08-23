import type { StatIDExceptHP } from '@/logic/pokemon/statsMath'
import type { PurePokemon, PureBattleWeather, PureBattleStages } from './battleMathTypes.ts'
import type { DayPhase } from '@/logic/utils/timeUtils'
import { ACTIVE_GENERATION } from '@/data/system/constants'

const DEFAULT_FALLBACK_STAT = 10
const SNOW_ICE_DEF_MULTIPLIER = 1.5
const SANDSTORM_ROCK_SPD_MULTIPLIER = 1.5
const COLDWAVE_NON_ICE_SPE_MULTIPLIER = 0.5

const HUGE_POWER_ATK_MULTIPLIER = 2.0
const GUTS_STATUS_ATK_MULTIPLIER = 1.5
const BURN_STATUS_ATK_MULTIPLIER = 0.5
const MARVEL_SCALE_DEF_MULTIPLIER = 1.5
const SOLAR_POWER_SPA_MULTIPLIER = 1.5
const SPEED_BOOST_WEATHER_MULTIPLIER = 2.0

const CHOICE_SCARF_SPE_MULTIPLIER = 1.5
const CHOICE_BAND_ATK_MULTIPLIER = 1.5
const CHOICE_SPECS_SPA_MULTIPLIER = 1.5
const EVIOLITE_DEF_SPD_MULTIPLIER = 1.5
const LIGHT_BALL_MULTIPLIER = 2.0
const THICK_CLUB_ATK_MULTIPLIER = 2.0
const DEEP_SEA_TOOTH_SPA_MULTIPLIER = 2.0
const DEEP_SEA_SCALE_SPD_MULTIPLIER = 2.0
const SOUL_DEW_SPECIAL_MULTIPLIER = 1.5
const IRON_BALL_SPE_MULTIPLIER = 0.5

const PARALYSIS_SPEED_MULTIPLIER_GEN7_PLUS = 0.5
const PARALYSIS_SPEED_MULTIPLIER_LEGACY = 0.25
const TAILWIND_SPE_MULTIPLIER = 2.0
const SWAMP_SPE_MULTIPLIER = 0.25

export const STAGE_MULTIPLIERS_MAP: Record<string, number> = {
  '-6': 2 / 8, '-5': 2 / 7, '-4': 2 / 6, '-3': 2 / 5, '-2': 2 / 4, '-1': 2 / 3,
  '0': 1.0, '1': 3 / 2, '2': 4 / 2, '3': 5 / 2, '4': 6 / 2, '5': 7 / 2, '6': 8 / 2
}

export interface StatModifierSource {
  name: string
  mult: number
  type: 'stage' | 'weather' | 'ability' | 'item' | 'status' | 'field'
}

export interface DetailedStatBreakdown {
  statKey: StatIDExceptHP
  base: number
  final: number
  stage: number
  stageMult: number
  weatherMult: number
  abilityMult: number
  itemMult: number
  statusMult: number
  fieldMult: number
  isUp: boolean
  isDown: boolean
  sources: StatModifierSource[]
}

import { getMechanicalWeather } from '../weather/weatherRegistry.ts'

export interface StatBreakdownOptions {
  isGym?: boolean
  dayCycle?: DayPhase
  sideConditions?: Record<string, unknown>
  fieldConditions?: Record<string, unknown>
}

/**
 * Calculates a complete stat breakdown with all modular modifiers.
 */
export function calculateDetailedStatBreakdown(
  pokemon: PurePokemon,
  statKey: StatIDExceptHP,
  stages: PureBattleStages = {},
  weather: PureBattleWeather | null = null,
  options: StatBreakdownOptions = {}
): DetailedStatBreakdown {
  const { isGym = false, dayCycle = 'day', sideConditions = {}, fieldConditions = {} } = options

  const isMoveWeather = !!(weather && weather.type !== 'clear' && weather.type !== 'none' && weather.turns !== -1)
  const mechWeather = (isGym && !isMoveWeather) ? 'clear' : getMechanicalWeather(weather?.type)
  const rawWeatherType = weather?.type || 'clear'

  // 1. Base Stat
  let base = (pokemon[statKey as keyof PurePokemon] as number) || DEFAULT_FALLBACK_STAT
  if (statKey === 'spa' && !pokemon.spa) base = pokemon.atk ?? DEFAULT_FALLBACK_STAT
  if (statKey === 'spd' && !pokemon.spd) base = pokemon.def ?? DEFAULT_FALLBACK_STAT
  if (statKey === 'atk' && !pokemon.atk) base = pokemon.spa ?? DEFAULT_FALLBACK_STAT
  if (statKey === 'def' && !pokemon.def) base = pokemon.spd ?? DEFAULT_FALLBACK_STAT

  const sources: StatModifierSource[] = []
  const pTypes = [pokemon.type, pokemon.type2].filter(Boolean)
  const pokeId = (pokemon.id || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const abId = (pokemon.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const itemId = (pokemon.heldItem || '').toLowerCase().replace(/[^a-z0-9]/g, '')

  // 2. Weather Multipliers
  let weatherMult = 1.0
  if (statKey === 'def') {
    const isSnowBoost = mechWeather === 'snow' || (mechWeather === 'hail' && ACTIVE_GENERATION >= 9)
    if (isSnowBoost && pTypes.includes('ice')) {
      weatherMult = SNOW_ICE_DEF_MULTIPLIER
      sources.push({ name: 'Nieve / Ola Frío (Def Hielo)', mult: SNOW_ICE_DEF_MULTIPLIER, type: 'weather' })
    }
  } else if (statKey === 'spd') {
    if (mechWeather === 'sandstorm' && pTypes.includes('rock')) {
      weatherMult = SANDSTORM_ROCK_SPD_MULTIPLIER
      sources.push({ name: 'Tormenta de Arena (SpD Roca)', mult: SANDSTORM_ROCK_SPD_MULTIPLIER, type: 'weather' })
    }
  } else if (statKey === 'spe') {
    if (rawWeatherType === 'coldwave' && !pTypes.includes('ice')) {
      weatherMult = COLDWAVE_NON_ICE_SPE_MULTIPLIER
      sources.push({ name: 'Ola Frío (Penalización)', mult: COLDWAVE_NON_ICE_SPE_MULTIPLIER, type: 'weather' })
    }
  }

  // 3. Stage Multiplier (STG)
  const rawStage = (stages as Record<string, number | undefined>)[statKey] ?? 0; // open-record
  const stage = Math.max(-6, Math.min(6, rawStage))
  const stageMult = (STAGE_MULTIPLIERS_MAP[String(stage)] as number) ?? 1.0
  if (stage !== 0) {
    sources.push({ name: `Nivel de Combate (${stage > 0 ? `+${stage}` : stage})`, mult: stageMult, type: 'stage' })
  }

  // 4. Ability Multipliers
  let abilityMult = 1.0
  const isSun = ((!isGym || isMoveWeather) && mechWeather === 'sun') || (dayCycle === 'day' && (!weather || weather.type === 'clear' || weather.type === 'none'))
  const isRain = (!isGym || isMoveWeather) && mechWeather === 'rain'
  const isElectricTerrain = !!fieldConditions['electricterrain']
  const isGrassyTerrain = !!fieldConditions['grassyterrain']

  if (statKey === 'atk') {
    if (abId === 'hugepower' || abId === 'purepower') {
      abilityMult = HUGE_POWER_ATK_MULTIPLIER
      sources.push({ name: 'Potencia / Energía Pura', mult: HUGE_POWER_ATK_MULTIPLIER, type: 'ability' })
    } else if (abId === 'guts' && pokemon.status) {
      abilityMult = GUTS_STATUS_ATK_MULTIPLIER
      sources.push({ name: 'Agallas (Estado)', mult: GUTS_STATUS_ATK_MULTIPLIER, type: 'ability' })
    } else if (abId === 'toxicboost' && (pokemon.status === 'psn' || pokemon.status === 'tox')) {
      abilityMult = GUTS_STATUS_ATK_MULTIPLIER
      sources.push({ name: 'Ímpetu Tóxico (Veneno)', mult: GUTS_STATUS_ATK_MULTIPLIER, type: 'ability' })
    } else if (abId === 'hustle') {
      abilityMult = GUTS_STATUS_ATK_MULTIPLIER
      sources.push({ name: 'Entusiasmo', mult: GUTS_STATUS_ATK_MULTIPLIER, type: 'ability' })
    }
  } else if (statKey === 'def') {
    if (abId === 'marvelscale' && pokemon.status) {
      abilityMult = MARVEL_SCALE_DEF_MULTIPLIER
      sources.push({ name: 'Escama Especial (Estado)', mult: MARVEL_SCALE_DEF_MULTIPLIER, type: 'ability' })
    } else if (abId === 'grasspelt' && isGrassyTerrain) {
      abilityMult = MARVEL_SCALE_DEF_MULTIPLIER
      sources.push({ name: 'Manto Frondoso (Campo Hierba)', mult: MARVEL_SCALE_DEF_MULTIPLIER, type: 'ability' })
    } else if (abId === 'furcoat') {
      abilityMult = HUGE_POWER_ATK_MULTIPLIER
      sources.push({ name: 'Pelaje Recio', mult: HUGE_POWER_ATK_MULTIPLIER, type: 'ability' })
    }
  } else if (statKey === 'spa') {
    if (abId === 'solarpower' && isSun) {
      abilityMult = SOLAR_POWER_SPA_MULTIPLIER
      sources.push({ name: 'Poder Solar (Sol)', mult: SOLAR_POWER_SPA_MULTIPLIER, type: 'ability' })
    } else if (abId === 'flareboost' && (pokemon.status === 'brn' || pokemon.status === 'burn')) {
      abilityMult = SOLAR_POWER_SPA_MULTIPLIER
      sources.push({ name: 'Ímpetu Ardiente (Quemadura)', mult: SOLAR_POWER_SPA_MULTIPLIER, type: 'ability' })
    }
  } else if (statKey === 'spe') {
    if (abId === 'chlorophyll' && isSun) {
      abilityMult = SPEED_BOOST_WEATHER_MULTIPLIER
      sources.push({ name: 'Clorofila (Sol)', mult: SPEED_BOOST_WEATHER_MULTIPLIER, type: 'ability' })
    } else if (abId === 'swiftswim' && isRain) {
      abilityMult = SPEED_BOOST_WEATHER_MULTIPLIER
      sources.push({ name: 'Nado Rápido (Lluvia)', mult: SPEED_BOOST_WEATHER_MULTIPLIER, type: 'ability' })
    } else if (abId === 'sandrush' && mechWeather === 'sandstorm') {
      abilityMult = SPEED_BOOST_WEATHER_MULTIPLIER
      sources.push({ name: 'Ímpetu Arena (Arena)', mult: SPEED_BOOST_WEATHER_MULTIPLIER, type: 'ability' })
    } else if (abId === 'slushrush' && (mechWeather === 'snow' || mechWeather === 'hail')) {
      abilityMult = SPEED_BOOST_WEATHER_MULTIPLIER
      sources.push({ name: 'Quitanieves (Nieve)', mult: SPEED_BOOST_WEATHER_MULTIPLIER, type: 'ability' })
    } else if (abId === 'surgesurfer' && isElectricTerrain) {
      abilityMult = SPEED_BOOST_WEATHER_MULTIPLIER
      sources.push({ name: 'Cola Surf (Campo Eléctrico)', mult: SPEED_BOOST_WEATHER_MULTIPLIER, type: 'ability' })
    } else if (abId === 'quickfeet' && pokemon.status) {
      abilityMult = GUTS_STATUS_ATK_MULTIPLIER
      sources.push({ name: 'Pies Rápidos (Estado)', mult: GUTS_STATUS_ATK_MULTIPLIER, type: 'ability' })
    }
  }

  // 5. Held Item Multipliers
  let itemMult = 1.0
  if (statKey === 'spe') {
    if (itemId === 'choicescarf') {
      itemMult = CHOICE_SCARF_SPE_MULTIPLIER
      sources.push({ name: 'Pañuelo Elección', mult: CHOICE_SCARF_SPE_MULTIPLIER, type: 'item' })
    } else if (itemId === 'ironball' || itemId === 'machobrace') {
      itemMult = IRON_BALL_SPE_MULTIPLIER
      sources.push({ name: 'Brazal Firme / Bola Férrea', mult: IRON_BALL_SPE_MULTIPLIER, type: 'item' })
    }
  } else if (statKey === 'atk') {
    if (itemId === 'choiceband') {
      itemMult = CHOICE_BAND_ATK_MULTIPLIER
      sources.push({ name: 'Cinta Elección', mult: CHOICE_BAND_ATK_MULTIPLIER, type: 'item' })
    } else if (itemId === 'lightball' && pokeId === 'pikachu') {
      itemMult = LIGHT_BALL_MULTIPLIER
      sources.push({ name: 'Bola Luminosa (Pikachu)', mult: LIGHT_BALL_MULTIPLIER, type: 'item' })
    } else if (itemId === 'thickclub' && (pokeId === 'cubone' || pokeId === 'marowak')) {
      itemMult = THICK_CLUB_ATK_MULTIPLIER
      sources.push({ name: 'Hueso Grueso', mult: THICK_CLUB_ATK_MULTIPLIER, type: 'item' })
    }
  } else if (statKey === 'spa') {
    if (itemId === 'choicespecs') {
      itemMult = CHOICE_SPECS_SPA_MULTIPLIER
      sources.push({ name: 'Gafas Elección', mult: CHOICE_SPECS_SPA_MULTIPLIER, type: 'item' })
    } else if (itemId === 'lightball' && pokeId === 'pikachu') {
      itemMult = LIGHT_BALL_MULTIPLIER
      sources.push({ name: 'Bola Luminosa (Pikachu)', mult: LIGHT_BALL_MULTIPLIER, type: 'item' })
    } else if (itemId === 'deepseatooth' && pokeId === 'clamperl') {
      itemMult = DEEP_SEA_TOOTH_SPA_MULTIPLIER
      sources.push({ name: 'Diente Marino', mult: DEEP_SEA_TOOTH_SPA_MULTIPLIER, type: 'item' })
    } else if ((itemId === 'souldew' || itemId === 'soul_dew') && (pokeId === 'latios' || pokeId === 'latias') && ACTIVE_GENERATION <= 6) {
      itemMult = SOUL_DEW_SPECIAL_MULTIPLIER
      sources.push({ name: 'Rocío Bondad', mult: SOUL_DEW_SPECIAL_MULTIPLIER, type: 'item' })
    }
  } else if (statKey === 'spd') {
    if (itemId === 'eviolite' && pokemon.canEvolve) {
      itemMult = EVIOLITE_DEF_SPD_MULTIPLIER
      sources.push({ name: 'Mineral Evolutivo', mult: EVIOLITE_DEF_SPD_MULTIPLIER, type: 'item' })
    } else if (itemId === 'deepseascale' && pokeId === 'clamperl') {
      itemMult = DEEP_SEA_SCALE_SPD_MULTIPLIER
      sources.push({ name: 'Escama Marina', mult: DEEP_SEA_SCALE_SPD_MULTIPLIER, type: 'item' })
    } else if ((itemId === 'souldew' || itemId === 'soul_dew') && (pokeId === 'latios' || pokeId === 'latias') && ACTIVE_GENERATION <= 6) {
      itemMult = SOUL_DEW_SPECIAL_MULTIPLIER
      sources.push({ name: 'Rocío Bondad', mult: SOUL_DEW_SPECIAL_MULTIPLIER, type: 'item' })
    }
  } else if (statKey === 'def') {
    if (itemId === 'eviolite' && pokemon.canEvolve) {
      itemMult = EVIOLITE_DEF_SPD_MULTIPLIER
      sources.push({ name: 'Mineral Evolutivo', mult: EVIOLITE_DEF_SPD_MULTIPLIER, type: 'item' })
    }
  }

  // 6. Status Penalty Multipliers
  let statusMult = 1.0
  if (statKey === 'spe' && pokemon.status === 'par' && abId !== 'quickfeet') {
    statusMult = ACTIVE_GENERATION <= 6 ? PARALYSIS_SPEED_MULTIPLIER_LEGACY : PARALYSIS_SPEED_MULTIPLIER_GEN7_PLUS
    sources.push({ name: 'Parálisis (-50% Vel)', mult: statusMult, type: 'status' })
  } else if (statKey === 'atk' && (pokemon.status === 'brn' || pokemon.status === 'burn') && abId !== 'guts') {
    statusMult = BURN_STATUS_ATK_MULTIPLIER
    sources.push({ name: 'Quemadura (-50% Atq)', mult: BURN_STATUS_ATK_MULTIPLIER, type: 'status' })
  }

  // 7. Field / Side Multipliers
  let fieldMult = 1.0
  if (statKey === 'spe') {
    if (sideConditions['tailwind']) {
      fieldMult *= TAILWIND_SPE_MULTIPLIER
      sources.push({ name: 'Viento Afín (x2)', mult: TAILWIND_SPE_MULTIPLIER, type: 'field' })
    }
    if (sideConditions['swamp']) {
      fieldMult *= SWAMP_SPE_MULTIPLIER
      sources.push({ name: 'Vórtice Pantanoso (x0.25)', mult: SWAMP_SPE_MULTIPLIER, type: 'field' })
    }
  }

  // 8. Final Stat Value
  let finalVal = Math.floor(base * weatherMult)
  finalVal = Math.floor(finalVal * stageMult)
  finalVal = Math.floor(finalVal * abilityMult)
  finalVal = Math.floor(finalVal * itemMult)
  finalVal = Math.floor(finalVal * statusMult)
  finalVal = Math.floor(finalVal * fieldMult)
  const final = Math.max(1, finalVal)

  const isUp = final > base || stage > 0
  const isDown = final < base || stage < 0

  return {
    statKey,
    base,
    final,
    stage,
    stageMult,
    weatherMult,
    abilityMult,
    itemMult,
    statusMult,
    fieldMult,
    isUp,
    isDown,
    sources
  }
}
