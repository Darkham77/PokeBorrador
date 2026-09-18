/**
 * src/components/modals/debugWeatherTypes.ts
 *
 * Types for the Debug Weather Tables Modal.
 */

import type { WeatherTableRouteId, WeatherSeasonId } from '@/data/world/weather-tables'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import type { PokemonType } from '@/data/battle/types'
import type { DayPhase } from '@/types/system/time'

export type RegionId = 'kanto' | 'johto' | 'hoenn' | 'sinnoh'

export interface Region {
  id: RegionId
  name: string
  maps: readonly WeatherTableRouteId[]
}

export interface WeatherProbData {
  weather: WeatherId
  chance: number
  icon: string
  label: string
  visitors: { name: string; sprite: string }[]
  exclusive: { name: string; sprite: string }[]
  modifiers: { boost: readonly PokemonType[]; debuff: readonly PokemonType[]; block: readonly PokemonType[] } | null
  hasSpawns: boolean
}

export interface WeatherCycleData {
  cycleId: DayPhase
  label: string
  probs: WeatherProbData[]
}

export interface WeatherSeasonData {
  seasonId: WeatherSeasonId
  label: string
  cycles: WeatherCycleData[]
}

export interface PrecomputedRouteData {
  routeId: WeatherTableRouteId
  name: string
  seasons: WeatherSeasonData[]
}
