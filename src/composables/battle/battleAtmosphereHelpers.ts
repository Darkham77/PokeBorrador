/**
 * src/composables/battle/battleAtmosphereHelpers.ts
 *
 * Helpers for resolving arena lighting cycles, field condition visuals, and weather tiers.
 */

import type { DayPhase } from '@/types/system/time'
import { isMapRouteId, getAvailableCyclesForMap, requireMapRouteId, type MapRouteId } from '@/data/world/map-assets'
import type { BattleState } from '@/types/battle/battle'
import type { Gym } from '@/data/world/gyms'
import type { MapLocation } from '@/types/pokemon/encounters'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { requireWeatherSeasonId, isWeatherTableRouteId, type WeatherSeasonId } from '@/data/world/weather-tables'

const FIELD_TERRAIN_KEYS = [
  'electricterrain',
  'grassyterrain',
  'mistyterrain',
  'psychicterrain',
  'trickroom',
  'gravity'
] as const

const SIDE_FIELD_KEYS = ['mist', 'stealthrock', 'toxicspikes'] as const

function resolveFixedOrGymCycles(
  battle: BattleState | null | undefined,
  gymConfig: Gym | null
): readonly DayPhase[] | null {
  if (battle?.fixedCycle) return [battle.fixedCycle]
  if (gymConfig?.fixedCycle) return [gymConfig.fixedCycle]
  if (battle?.isGym || Boolean(gymConfig) || battle?.locationId === 'gym') {
    return ['day']
  }
  return null
}

function resolveEnvironmentalFallbackCycles(
  battle: BattleState | null | undefined,
  mapLocationConfig: MapLocation | null,
  available: readonly DayPhase[]
): readonly DayPhase[] {
  if (battle?.isCave || battle?.isCrystalCave || mapLocationConfig?.isCave || mapLocationConfig?.isCrystalCave) {
    return ['night']
  }
  if (battle?.isIndoors || mapLocationConfig?.isIndoors) {
    return ['day']
  }
  return available.length > 0 ? available : ['day']
}

export function resolveBattleSupportedCycles(
  battle: BattleState | null | undefined,
  gymConfig: Gym | null,
  mapLocationConfig: MapLocation | null
): readonly DayPhase[] {
  const fixed = resolveFixedOrGymCycles(battle, gymConfig)
  if (fixed) return fixed

  const explicit = mapLocationConfig?.supportedCycles
  if (explicit && explicit.length > 0) {
    return explicit
  }

  const locId = battle?.locationId || 'route1'
  const available = isMapRouteId(locId) ? getAvailableCyclesForMap(locId) : []
  if (available.length > 1) {
    return available
  }

  return resolveEnvironmentalFallbackCycles(battle, mapLocationConfig, available)
}

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

export interface WeatherToggleConfig {
  weatherEnabled?: boolean
}

export function resolveActiveCombatWeather(battleWeather?: CombatWeatherState): string | null {
  if (!battleWeather) return null
  if (battleWeather.type && battleWeather.type !== 'clear' && battleWeather.type !== 'none') {
    return battleWeather.visual || battleWeather.type
  }
  return null
}

export function isNaturalWeatherBlocked(
  isAllowed: boolean,
  mapLocationConfig: WeatherToggleConfig | null,
  gymConfig: WeatherToggleConfig | null,
  locationId: MapRouteId
): boolean {
  if (!isAllowed) return true
  if (mapLocationConfig?.weatherEnabled === false || gymConfig?.weatherEnabled === false) return true
  return !isMapRouteId(locationId) || !isWeatherTableRouteId(locationId)
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
