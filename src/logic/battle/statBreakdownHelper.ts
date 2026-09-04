import type { StatIDExceptHP } from '@/logic/pokemon/statsMath'
import type { PokemonType } from '@/data/battle/types'
import type { ItemId } from '@/data/inventory/items'
import type { AbilityId } from '@/data/battle/abilities'
import type { PurePokemon, PureBattleWeather, PureBattleStages } from './battleMathTypes.ts'
import type { DayPhase } from '@/logic/utils/timeUtils'
import { ACTIVE_GENERATION } from '@/data/system/constants'
import { getMechanicalWeather, type WeatherId, type WeatherMechanical } from '../weather/weatherRegistry.ts'

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

export const STAT_MODIFIER_KINDS = ['stage', 'weather', 'ability', 'item', 'status', 'field'] as const;
export type StatModifierKind = (typeof STAT_MODIFIER_KINDS)[number];

export interface StatModifierSource {
  name: string
  mult: number
  type: StatModifierKind
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

export interface StatBreakdownOptions {
  isGym?: boolean
  dayCycle?: DayPhase
  sideConditions?: Record<string, unknown>
  fieldConditions?: Record<string, unknown>
}

function resolveWeatherModifier(
  statKey: StatIDExceptHP,
  pTypes: PokemonType[],
  mechWeather: WeatherMechanical,
  rawWeatherType: WeatherId | string,
  sources: StatModifierSource[]
): number {
  if (statKey === 'def') {
    const isSnowBoost = mechWeather === 'snow' || (mechWeather === 'hail' && ACTIVE_GENERATION >= 9)
    if (isSnowBoost && pTypes.includes('ice')) {
      sources.push({ name: 'Nieve / Ola Frío (Def Hielo)', mult: SNOW_ICE_DEF_MULTIPLIER, type: 'weather' })
      return SNOW_ICE_DEF_MULTIPLIER
    }
  } else if (statKey === 'spd') {
    if (mechWeather === 'sandstorm' && pTypes.includes('rock')) {
      sources.push({ name: 'Tormenta de Arena (SpD Roca)', mult: SANDSTORM_ROCK_SPD_MULTIPLIER, type: 'weather' })
      return SANDSTORM_ROCK_SPD_MULTIPLIER
    }
  } else if (statKey === 'spe') {
    if (rawWeatherType === 'coldwave' && !pTypes.includes('ice')) {
      sources.push({ name: 'Ola Frío (Penalización)', mult: COLDWAVE_NON_ICE_SPE_MULTIPLIER, type: 'weather' })
      return COLDWAVE_NON_ICE_SPE_MULTIPLIER
    }
  }
  return 1.0
}

function resolveAbilityModifier(
  statKey: StatIDExceptHP,
  abId: AbilityId,
  pokemon: PurePokemon,
  isSun: boolean,
  isRain: boolean,
  mechWeather: WeatherMechanical,
  isElectricTerrain: boolean,
  isGrassyTerrain: boolean,
  sources: StatModifierSource[]
): number {
  if (statKey === 'atk') {
    if (abId === 'hugepower' || abId === 'purepower') {
      sources.push({ name: 'Potencia / Energía Pura', mult: HUGE_POWER_ATK_MULTIPLIER, type: 'ability' })
      return HUGE_POWER_ATK_MULTIPLIER
    }
    if (abId === 'guts' && pokemon.status) {
      sources.push({ name: 'Agallas (Estado)', mult: GUTS_STATUS_ATK_MULTIPLIER, type: 'ability' })
      return GUTS_STATUS_ATK_MULTIPLIER
    }
    if (abId === 'toxicboost' && (pokemon.status === 'psn' || pokemon.status === 'tox')) {
      sources.push({ name: 'Ímpetu Tóxico (Veneno)', mult: GUTS_STATUS_ATK_MULTIPLIER, type: 'ability' })
      return GUTS_STATUS_ATK_MULTIPLIER
    }
    if (abId === 'hustle') {
      sources.push({ name: 'Entusiasmo', mult: GUTS_STATUS_ATK_MULTIPLIER, type: 'ability' }) // spanish-ok: UI Spanish text localization label
      return GUTS_STATUS_ATK_MULTIPLIER
    }
  } else if (statKey === 'def') {
    if (abId === 'marvelscale' && pokemon.status) {
      sources.push({ name: 'Escama Especial (Estado)', mult: MARVEL_SCALE_DEF_MULTIPLIER, type: 'ability' })
      return MARVEL_SCALE_DEF_MULTIPLIER
    }
    if (abId === 'grasspelt' && isGrassyTerrain) {
      sources.push({ name: 'Manto Frondoso (Campo Hierba)', mult: MARVEL_SCALE_DEF_MULTIPLIER, type: 'ability' })
      return MARVEL_SCALE_DEF_MULTIPLIER
    }
    if (abId === 'furcoat') {
      sources.push({ name: 'Pelaje Recio', mult: HUGE_POWER_ATK_MULTIPLIER, type: 'ability' }) // spanish-ok: UI Spanish text localization label
      return HUGE_POWER_ATK_MULTIPLIER
    }
  } else if (statKey === 'spa') {
    if (abId === 'solarpower' && isSun) {
      sources.push({ name: 'Poder Solar (Sol)', mult: SOLAR_POWER_SPA_MULTIPLIER, type: 'ability' })
      return SOLAR_POWER_SPA_MULTIPLIER
    }
    if (abId === 'flareboost' && pokemon.status === 'brn') {
      sources.push({ name: 'Ímpetu Ardiente (Quemadura)', mult: SOLAR_POWER_SPA_MULTIPLIER, type: 'ability' })
      return SOLAR_POWER_SPA_MULTIPLIER
    }
  } else if (statKey === 'spe') {
    if (abId === 'chlorophyll' && isSun) {
      sources.push({ name: 'Clorofila (Sol)', mult: SPEED_BOOST_WEATHER_MULTIPLIER, type: 'ability' })
      return SPEED_BOOST_WEATHER_MULTIPLIER
    }
    if (abId === 'swiftswim' && isRain) {
      sources.push({ name: 'Nado Rápido (Lluvia)', mult: SPEED_BOOST_WEATHER_MULTIPLIER, type: 'ability' })
      return SPEED_BOOST_WEATHER_MULTIPLIER
    }
    if (abId === 'sandrush' && mechWeather === 'sandstorm') {
      sources.push({ name: 'Ímpetu Arena (Arena)', mult: SPEED_BOOST_WEATHER_MULTIPLIER, type: 'ability' })
      return SPEED_BOOST_WEATHER_MULTIPLIER
    }
    if (abId === 'slushrush' && (mechWeather === 'snow' || mechWeather === 'hail')) {
      sources.push({ name: 'Quitanieves (Nieve)', mult: SPEED_BOOST_WEATHER_MULTIPLIER, type: 'ability' })
      return SPEED_BOOST_WEATHER_MULTIPLIER
    }
    if (abId === 'surgesurfer' && isElectricTerrain) {
      sources.push({ name: 'Cola Surf (Campo Eléctrico)', mult: SPEED_BOOST_WEATHER_MULTIPLIER, type: 'ability' })
      return SPEED_BOOST_WEATHER_MULTIPLIER
    }
    if (abId === 'quickfeet' && pokemon.status) {
      sources.push({ name: 'Pies Rápidos (Estado)', mult: GUTS_STATUS_ATK_MULTIPLIER, type: 'ability' })
      return GUTS_STATUS_ATK_MULTIPLIER
    }
  }
  return 1.0
}

function resolveItemModifier(
  statKey: StatIDExceptHP,
  itemId: ItemId,
  pokemon: PurePokemon,
  sources: StatModifierSource[]
): number {
  if (statKey === 'spe') {
    if (itemId === 'choicescarf') {
      sources.push({ name: 'Pañuelo Elección', mult: CHOICE_SCARF_SPE_MULTIPLIER, type: 'item' })
      return CHOICE_SCARF_SPE_MULTIPLIER
    }
    if (itemId === 'ironball') {
      sources.push({ name: 'Brazal Firme / Bola Férrea', mult: IRON_BALL_SPE_MULTIPLIER, type: 'item' })
      return IRON_BALL_SPE_MULTIPLIER
    }
  } else if (statKey === 'atk') {
    if (itemId === 'choiceband') {
      sources.push({ name: 'Cinta Elección', mult: CHOICE_BAND_ATK_MULTIPLIER, type: 'item' })
      return CHOICE_BAND_ATK_MULTIPLIER
    }
    if (itemId === 'lightball' && pokemon.id === 'pikachu') {
      sources.push({ name: 'Bola Luminosa (Pikachu)', mult: LIGHT_BALL_MULTIPLIER, type: 'item' })
      return LIGHT_BALL_MULTIPLIER
    }
    if (itemId === 'thickclub' && (pokemon.id === 'cubone' || pokemon.id === 'marowak')) {
      sources.push({ name: 'Hueso Grueso', mult: THICK_CLUB_ATK_MULTIPLIER, type: 'item' }) // spanish-ok: UI Spanish text localization label
      return THICK_CLUB_ATK_MULTIPLIER
    }
  } else if (statKey === 'spa') {
    if (itemId === 'choicespecs') {
      sources.push({ name: 'Gafas Elección', mult: CHOICE_SPECS_SPA_MULTIPLIER, type: 'item' })
      return CHOICE_SPECS_SPA_MULTIPLIER
    }
    if (itemId === 'lightball' && pokemon.id === 'pikachu') {
      sources.push({ name: 'Bola Luminosa (Pikachu)', mult: LIGHT_BALL_MULTIPLIER, type: 'item' })
      return LIGHT_BALL_MULTIPLIER
    }
    if (itemId === 'deepseatooth' && pokemon.id === 'clamperl') {
      sources.push({ name: 'Diente Marino', mult: DEEP_SEA_TOOTH_SPA_MULTIPLIER, type: 'item' }) // spanish-ok: UI Spanish text localization label
      return DEEP_SEA_TOOTH_SPA_MULTIPLIER
    }
    if (itemId === 'souldew' && (pokemon.id === 'latios' || pokemon.id === 'latias') && ACTIVE_GENERATION <= 6) {
      sources.push({ name: 'Rocío Bondad', mult: SOUL_DEW_SPECIAL_MULTIPLIER, type: 'item' }) // spanish-ok: UI Spanish text localization label
      return SOUL_DEW_SPECIAL_MULTIPLIER
    }
  } else if (statKey === 'spd') {
    if (itemId === 'eviolite' && pokemon.canEvolve) {
      sources.push({ name: 'Mineral Evolutivo', mult: EVIOLITE_DEF_SPD_MULTIPLIER, type: 'item' }) // spanish-ok: UI Spanish text localization label
      return EVIOLITE_DEF_SPD_MULTIPLIER
    }
    if (itemId === 'deepseascale' && pokemon.id === 'clamperl') {
      sources.push({ name: 'Escama Marino', mult: DEEP_SEA_SCALE_SPD_MULTIPLIER, type: 'item' }) // spanish-ok: UI Spanish text localization label
      return DEEP_SEA_SCALE_SPD_MULTIPLIER
    }
    if (itemId === 'souldew' && (pokemon.id === 'latios' || pokemon.id === 'latias') && ACTIVE_GENERATION <= 6) {
      sources.push({ name: 'Rocío Bondad', mult: SOUL_DEW_SPECIAL_MULTIPLIER, type: 'item' }) // spanish-ok: UI Spanish text localization label
      return SOUL_DEW_SPECIAL_MULTIPLIER
    }
  } else if (statKey === 'def') {
    if (itemId === 'eviolite' && pokemon.canEvolve) {
      sources.push({ name: 'Mineral Evolutivo', mult: EVIOLITE_DEF_SPD_MULTIPLIER, type: 'item' }) // spanish-ok: UI Spanish text localization label
      return EVIOLITE_DEF_SPD_MULTIPLIER
    }
  }
  return 1.0
}

function resolveStatusModifier(
  statKey: StatIDExceptHP,
  pokemon: PurePokemon,
  sources: StatModifierSource[]
): number {
  if (statKey === 'spe' && pokemon.status === 'par' && pokemon.ability !== 'quickfeet') {
    const mult = ACTIVE_GENERATION <= 6 ? PARALYSIS_SPEED_MULTIPLIER_LEGACY : PARALYSIS_SPEED_MULTIPLIER_GEN7_PLUS
    sources.push({ name: 'Parálisis (-50% Vel)', mult, type: 'status' })
    return mult
  }
  if (statKey === 'atk' && pokemon.status === 'brn' && pokemon.ability !== 'guts') {
    sources.push({ name: 'Quemadura (-50% Atq)', mult: BURN_STATUS_ATK_MULTIPLIER, type: 'status' })
    return BURN_STATUS_ATK_MULTIPLIER
  }
  return 1.0
}

function resolveFieldModifier(
  statKey: StatIDExceptHP,
  sideConditions: Record<string, unknown>,
  sources: StatModifierSource[]
): number {
  let mult = 1.0
  if (statKey === 'spe') {
    if (sideConditions['tailwind']) {
      mult *= TAILWIND_SPE_MULTIPLIER
      sources.push({ name: 'Viento Afín (x2)', mult: TAILWIND_SPE_MULTIPLIER, type: 'field' })
    }
    if (sideConditions['swamp']) {
      mult *= SWAMP_SPE_MULTIPLIER
      sources.push({ name: 'Vórtice Pantanoso (x0.25)', mult: SWAMP_SPE_MULTIPLIER, type: 'field' })
    }
  }
  return mult
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
  const pTypes = [pokemon.type, pokemon.type2].filter((t): t is PokemonType => Boolean(t))

  // 2. Weather Multipliers
  const weatherMult = resolveWeatherModifier(statKey, pTypes, mechWeather, rawWeatherType, sources)

  // 3. Stage Multiplier (STG)
  const rawStage = (stages as Record<string, number | undefined>)[statKey] ?? 0; // open-record: Generic key-value data dictionary container
  const stage = Math.max(-6, Math.min(6, rawStage))
  const stageMult = (STAGE_MULTIPLIERS_MAP[String(stage)] as number) ?? 1.0
  if (stage !== 0) {
    sources.push({ name: `Nivel de Combate (${stage > 0 ? `+${stage}` : stage})`, mult: stageMult, type: 'stage' })
  }

  // 4. Ability Multipliers
  const isSun = ((!isGym || isMoveWeather) && mechWeather === 'sun') || (dayCycle === 'day' && (!weather || weather.type === 'clear' || weather.type === 'none'))
  const isRain = (!isGym || isMoveWeather) && mechWeather === 'rain'
  const isElectricTerrain = Boolean(fieldConditions['electricterrain'])
  const isGrassyTerrain = Boolean(fieldConditions['grassyterrain'])
  const abilityMult = pokemon.ability ? resolveAbilityModifier(statKey, pokemon.ability, pokemon, isSun, isRain, mechWeather, isElectricTerrain, isGrassyTerrain, sources) : 1.0;

  // 5. Held Item Multipliers
  const itemMult = pokemon.heldItem ? resolveItemModifier(statKey, pokemon.heldItem, pokemon, sources) : 1.0;

  // 6. Status Penalty Multipliers
  const statusMult = resolveStatusModifier(statKey, pokemon, sources)

  // 7. Field / Side Multipliers
  const fieldMult = resolveFieldModifier(statKey, sideConditions, sources)

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
