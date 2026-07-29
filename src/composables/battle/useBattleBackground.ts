import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { MAP_ROUTE_MAPPING, isBattleMapAssetId, requireBattleMapAssetId, requireMapRouteId } from '@/data/world/map-assets'

const CYCLE_SUFFIXES = {
  // English keys
  morning: '_amanecer',
  dawn: '_amanecer',
  day: '_dia',
  dusk: '_atardecer',
  night: '_noche',
  // Spanish keys (fallbacks)
  amanecer: '_amanecer',
  dia: '_dia',
  atardecer: '_atardecer',
  noche: '_noche'
} as const

type BattleBackgroundCycle = keyof typeof CYCLE_SUFFIXES
const BATTLE_BACKGROUND_CYCLES = [
  'morning',
  'dawn',
  'day',
  'dusk',
  'night',
  'amanecer',
  'dia',
  'atardecer',
  'noche',
] as const satisfies readonly BattleBackgroundCycle[]

function requireBattleBackgroundCycle(value: string): BattleBackgroundCycle {
  const cycle = BATTLE_BACKGROUND_CYCLES.find(candidate => candidate === value)
  if (cycle) return cycle
  throw new Error(`[useBattleBackground] Invalid battle background cycle: ${value}`)
}

export function useBattleBackground() {
  /**
   * Returns the asset URL for a given location and time of day.
   * @param {string} locationId 
   * @param {string} cycle - morning | day | dusk | night
   * @param {boolean} _isFishing - Unused (same as normal battle background)
   * @returns {{ url: string, isBakedIn: boolean }}
   */
  function getBackgroundUrl(locationId: string, cycle = 'day', _isFishing = false) {
    const baseName = locationId === 'gym' || locationId === 'pvp'
      ? 'gimnasio'
      : MAP_ROUTE_MAPPING[requireMapRouteId(locationId)]

    const suffix = CYCLE_SUFFIXES[requireBattleBackgroundCycle(cycle.toLowerCase())] // text-ok

    let fileName = `${baseName}${suffix}`
    let isBakedIn = false

    if (isBattleMapAssetId(fileName)) {
      // The cycle-suffixed file exists
      isBakedIn = suffix !== '_dia'
    } else {
      // Fallback to day version
      const dayFileName = `${baseName}_dia`
      if (isBattleMapAssetId(dayFileName)) {
        fileName = dayFileName
        isBakedIn = false
      } else if (isBattleMapAssetId(baseName)) {
        // Fallback to base name without suffix
        fileName = baseName
        isBakedIn = false
      } else {
        throw new Error(`[useBattleBackground] No battle background asset for location ${locationId} and cycle ${cycle}`)
      }
    }

    return {
      url: getAssetUrl(ASSET_TYPES.BATTLE_BG, requireBattleMapAssetId(fileName)),
      isBakedIn
    }
  }

  return {
    getBackgroundUrl
  }
}
