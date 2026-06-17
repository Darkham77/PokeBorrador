import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { MAP_ROUTE_MAPPING, AVAILABLE_BATTLE_MAPS } from '@/data/map-assets'

const CYCLE_SUFFIXES: Record<string, string> = {
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
    let baseName = MAP_ROUTE_MAPPING[locationId as keyof typeof MAP_ROUTE_MAPPING]
    if (!baseName) {
      if (locationId === 'gym' || locationId === 'pvp') {
        baseName = 'gimnasio'
      } else {
        baseName = 'ruta1' // Default fallback
      }
    }

    const suffix = CYCLE_SUFFIXES[cycle.toLowerCase()] || '_dia'
    const battleMapsSet = new Set<string>(AVAILABLE_BATTLE_MAPS)

    let fileName = `${baseName}${suffix}`
    let isBakedIn = false

    if (battleMapsSet.has(fileName)) {
      // The cycle-suffixed file exists
      isBakedIn = suffix !== '_dia'
    } else {
      // Fallback to day version
      const dayFileName = `${baseName}_dia`
      if (battleMapsSet.has(dayFileName)) {
        fileName = dayFileName
        isBakedIn = false
      } else if (battleMapsSet.has(baseName)) {
        // Fallback to base name without suffix
        fileName = baseName
        isBakedIn = false
      } else {
        // Ultimate fallback
        fileName = 'ruta1_dia'
        isBakedIn = false
      }
    }

    return {
      url: getAssetUrl(ASSET_TYPES.BATTLE_BG, fileName),
      isBakedIn
    }
  }

  return {
    getBackgroundUrl
  }
}
