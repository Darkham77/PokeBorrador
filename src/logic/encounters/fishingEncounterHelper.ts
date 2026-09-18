import type { MapLocation, Encounter, EncounterOptions, EncounterState } from '@/types/pokemon/encounters'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { redistributeWeatherSpawns, applyFishingRodBudget } from '@/logic/utils/routeSpawnHelpers'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { clampLegendaryRates, selectFromPool, applyAtmosphericStatus, getSpeciesEntries } from './encounterHelpers.ts'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { resolveFieldEncounterModifiers } from '@/logic/rules/fieldRulesCoordinator'

const DEFAULT_FISHING_POOL_WEIGHT = 10 as const;
const DEFAULT_FISHING_VISITOR_WEIGHT_OFFSET = -10 as const;
const DEFAULT_FISHING_EXCLUSIVE_WEIGHT = 5 as const;
const DEFAULT_FISHING_MIN_LV = 10 as const;
const DEFAULT_FISHING_MAX_LV = 20 as const;
const SUPER_ROD_SHINY_MULT = 1.5 as const;
const STANDARD_ROD_SHINY_MULT = 1.0 as const;
const PERCENTAGE_FACTOR = 100 as const;

function applyWeatherFishingSpawns(
  pool: PokemonSpeciesId[],
  rates: number[],
  weather: WeatherId,
  loc: MapLocation
): void {
  const wConfig = loc.weather?.[weather]
  if (weather && weather !== 'clear' && wConfig) {
    if (wConfig.fishingExclusive) {
      const exclusives = getSpeciesEntries(wConfig.fishingExclusive)
      exclusives.forEach(({ id, weight }) => {
        if (!pool.includes(id)) {
          pool.push(id)
          rates.push(weight ?? DEFAULT_FISHING_EXCLUSIVE_WEIGHT)
        }
      })
    }
    if (wConfig.fishingVisitors) {
      const visitors = getSpeciesEntries(wConfig.fishingVisitors)
      visitors.forEach(({ id, weight }) => {
        if (!pool.includes(id)) {
          pool.push(id)
          rates.push(weight !== undefined ? -weight : DEFAULT_FISHING_VISITOR_WEIGHT_OFFSET)
        }
      })
    }
  }

  if (weather && weather !== 'clear') {
    const exclusives: PokemonSpeciesId[] = wConfig?.fishingExclusive
      ? getSpeciesEntries(wConfig.fishingExclusive).map(entry => entry.id)
      : []
    redistributeWeatherSpawns(rates, pool, weather, exclusives)
  }
}

export function generateFishingEncounter(
  loc: MapLocation,
  weather: WeatherId,
  state: EncounterState,
  options: EncounterOptions
): Encounter | null {
  if (!loc.fishing) return null
  const pool = [...loc.fishing.pool]
  const rates = [...loc.fishing.rates]

  while (rates.length < pool.length) rates.push(DEFAULT_FISHING_POOL_WEIGHT)

  const fishingType = state.fishingRodType || 'standard'
  applyFishingRodBudget(rates, pool, fishingType)

  applyWeatherFishingSpawns(pool, rates, weather, loc)

  clampLegendaryRates(pool, rates)
  const selectedId = selectFromPool(pool, rates)
  const minLv = loc.fishing.lv[0] || DEFAULT_FISHING_MIN_LV
  const maxLv = loc.fishing.lv[1] || DEFAULT_FISHING_MAX_LV
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv
  const totalRate = rates.reduce((a, b) => a + b, 0)
  const rateIdx = pool.indexOf(selectedId)
  const rateVal = rates[rateIdx]
  const rarity = ((rateVal !== undefined ? rateVal : 0) / (totalRate || 1)) * PERCENTAGE_FACTOR

  const modifiers = resolveFieldEncounterModifiers({
    team: state.team,
    mapId: loc.id,
    loc,
    weather,
    playerClass: state.playerClass,
    classData: state.classData,
    faction: state.faction,
    dominanceData: options.dominanceData,
    options
  })

  const shinyMult = (options.shinyMultiplier || 1) * (fishingType === 'super' ? SUPER_ROD_SHINY_MULT : STANDARD_ROD_SHINY_MULT) * (modifiers.shinyMultiplier || 1)
  const pokemon = makePokemon(selectedId, level, {
    nature: modifiers.natureOverride ?? undefined,
    gender: modifiers.genderOverride ?? undefined,
    heldItemRates: modifiers.heldItemRates,
    shinyMultiplier: shinyMult,
    ivFloor: modifiers.ivFloor,
    mapId: loc.id
  }) as Pokemon
  if (pokemon) {
    applyAtmosphericStatus(pokemon, loc, weather, selectedId)
  }

  return {
    type: 'fishing',
    pokemon,
    rarity
  }
}
