/**
 * src/composables/battle/battleAtmosphereHelpers.ts
 *
 * Helpers for resolving arena lighting cycles, field condition visuals, and weather tiers.
 */

import type { DayPhase } from '@/types/system/time'
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { requireWeatherSeasonId, type WeatherSeasonId } from '@/data/world/weather-tables'

const FIELD_TERRAIN_KEYS = [
  'electricterrain',
  'grassyterrain',
  'mistyterrain',
  'psychicterrain',
  'trickroom',
  'gravity'
] as const

const SIDE_FIELD_KEYS = ['mist', 'stealthrock', 'toxicspikes'] as const

export function resolveActiveFieldCondition(fieldConditions?: Record<string, unknown>): string | null {
  if (!fieldConditions) return null
  for (const key of FIELD_TERRAIN_KEYS) {
    if (fieldConditions[key]) return key
  }
  return null
}

export function resolveActiveSideCondition(
  enemySide?: Record<string, unknown>,
  playerSide?: Record<string, unknown>
): string | null {
  for (const key of SIDE_FIELD_KEYS) {
    if (enemySide?.[key] || playerSide?.[key]) return key
  }
  return null
}

export interface CombatWeatherState {
  type?: string
  visual?: string
}

export function resolveActiveCombatWeather(battleWeather?: CombatWeatherState): string | null {
  if (!battleWeather) return null
  if (battleWeather.type && battleWeather.type !== 'clear' && battleWeather.type !== 'none') {
    return battleWeather.visual || battleWeather.type
  }
  return null
}

export function resolveAmbientWeather(
  globalWeather: string | null | undefined,
  locationId: MapRouteId,
  seasonId: WeatherSeasonId,
  epochHour: number,
  cycle: DayPhase
): string {
  if (globalWeather) return globalWeather
  return getRouteWeather(
    requireMapRouteId(locationId),
    requireWeatherSeasonId(seasonId),
    epochHour,
    cycle
  )
}
