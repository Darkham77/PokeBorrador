import type { DebugSystem } from '@/stores/debug'

import { useMapStore } from '@/stores/map'
import { useUIStore } from '@/stores/ui'
import type { DominanceInfo } from '@/types/system/stores'
import { requireFactionId } from '@/types/system/game'
import type { MapRouteId } from '@/data/world/map-assets'
import { requireMapRouteId } from '@/data/world/map-assets'
import { requireWeatherId } from '@/logic/weather/weatherRegistry'
import type { DayPhase } from '@/logic/utils/timeUtils'
export function registerMapTools(debug: DebugSystem) {
  const map = useMapStore()
  const ui = useUIStore()

  debug.register({
    id: 'map-toggle-grid',
    label: 'MOSTRAR BORDES',
    command: 'toggleGrid',
    category: 'map',
    action: () => {
      ui.isDebugGridMode = !ui.isDebugGridMode
      ui.notify(`Grilla: ${ui.isDebugGridMode ? 'ON' : 'OFF'}`, '🗺️')
    },
    description: 'Activa visualización de celdas en rutas.'
  })

  debug.register({
    id: 'map-toggle-perf',
    label: 'SIMPLIFICAR MAPA',
    command: 'togglePerf',
    category: 'map',
    action: () => {
      ui.isDebugPerformanceMode = !ui.isDebugPerformanceMode
      ui.notify(`Modo Perf: ${ui.isDebugPerformanceMode ? 'ON' : 'OFF'}`, '🚀')
    },
    description: 'Activa modo de alto rendimiento en el mapa.'
  })

  debug.register({
    id: 'map-set-dominance',
    label: 'DOMINIO GLOBAL',
    command: 'setDominance',
    category: 'map',
    action: (faction: string) => {
      const winnerMap: Partial<Record<MapRouteId, DominanceInfo>> = {}
      if (faction && faction !== 'none') {
        const factionId = requireFactionId(faction)
        const unionPoints = factionId === 'union' ? 100 : 0
        const poderPoints = factionId === 'poder' ? 100 : 0
        map.maps.forEach((m: { id: string }) => { 
          winnerMap[requireMapRouteId(m.id)] = { winner: factionId, union: unionPoints, poder: poderPoints } 
        })
      }
      map.mapWinners = winnerMap
      ui.notify(`Debug: Dominio global asignado a ${faction}`, '🚩')
    },
    description: 'Establece el bando dominante en todos los mapas.'
  })

  debug.register({
    id: 'map-set-weather',
    label: 'SET WEATHER',
    command: 'setWeather',
    category: 'map',
    action: (w: string | null) => {
      const weatherId = w === null || w === 'none' ? null : requireWeatherId(w)
      map.setGlobalWeather(weatherId)
      console.debug(`[VITE_DEBUG] Weather forced to: ${weatherId || 'deterministic'}`)
      ui.notify(`Debug: Clima forzado a ${w}`, '⛅')
      return `Clima forzado a ${w}`
    },
    description: 'Fuerza un clima específico en el mapa actual.'
  })

  debug.register({
    id: 'map-set-cycle',
    label: 'SET CYCLE',
    command: 'setCycle',
    category: 'map',
    action: (c: DayPhase | null) => {
      map.forcedCycle = c
      ui.notify(`Debug: Ciclo forzado a ${c}`, '☀️')
    },
    description: 'Fuerza un ciclo día/noche específico.'
  })
}
