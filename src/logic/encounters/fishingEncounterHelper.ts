import type { MapLocation, Encounter, EncounterOptions, EncounterState } from '@/types/pokemon/encounters'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { redistributeWeatherSpawns, applyFishingRodBudget } from '@/logic/utils/routeSpawnHelpers'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { clampLegendaryRates, selectFromPool, applyAtmosphericStatus } from './encounterHelpers.ts'

export function generateFishingEncounter(
  loc: MapLocation,
  weather: string,
  state: EncounterState,
  options: EncounterOptions
): Encounter | null {
  if (!loc.fishing) return null
  const pool = [...loc.fishing.pool]
  const rates = [...loc.fishing.rates]

  while (rates.length < pool.length) rates.push(10)

  const fishingType = state.fishingRodType || 'standard'
  applyFishingRodBudget(rates, pool, fishingType)

  const wConfig = loc.weather?.[weather]
  if (weather && weather !== 'clear' && wConfig) {
    if (wConfig.fishingExclusive) {
      const exclusives = Array.isArray(wConfig.fishingExclusive) ? wConfig.fishingExclusive : Object.keys(wConfig.fishingExclusive)
      exclusives.forEach(id => {
        if (!pool.includes(id)) {
          pool.push(id)
          const weight = Array.isArray(wConfig.fishingExclusive) ? 5 : ((wConfig.fishingExclusive as Record<string, number>)[id] || 5)
          rates.push(weight || 5)
        }
      })
    }
    if (wConfig.fishingVisitors) {
      const visitors = Array.isArray(wConfig.fishingVisitors) ? wConfig.fishingVisitors : Object.keys(wConfig.fishingVisitors)
      visitors.forEach(id => {
        if (!pool.includes(id)) {
          pool.push(id)
          const weight = Array.isArray(wConfig.fishingVisitors) ? -10 : -((wConfig.fishingVisitors as Record<string, number>)[id] || 10)
          rates.push(weight || -10)
        }
      })
    }
  }

  if (weather && weather !== 'clear') {
    const exclusives = wConfig?.fishingExclusive ? (Array.isArray(wConfig.fishingExclusive) ? wConfig.fishingExclusive : Object.keys(wConfig.fishingExclusive)) : []
    redistributeWeatherSpawns(rates, pool, weather, exclusives)
  }

  clampLegendaryRates(pool, rates)
  const selectedId = selectFromPool(pool, rates)
  const minLv = loc.fishing.lv[0] || 10
  const maxLv = loc.fishing.lv[1] || 20
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv
  const totalRate = rates.reduce((a, b) => a + b, 0)
  const rateIdx = pool.indexOf(selectedId)
  const rateVal = rates[rateIdx]
  const rarity = ((rateVal !== undefined ? rateVal : 0) / (totalRate || 1)) * 100

  const shinyMult = (options.shinyMultiplier || 1) * (fishingType === 'super' ? 1.5 : 1.0)
  const pokemon = makePokemon(selectedId, level, { shinyMultiplier: shinyMult }) as Pokemon
  if (pokemon) {
    applyAtmosphericStatus(pokemon, loc, weather, selectedId)
  }

  return {
    type: 'fishing',
    pokemon,
    rarity
  }
}
