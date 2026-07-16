import type { DebugSystem } from '@/stores/debug'

import { useMapStore } from '@/stores/map'
import { useUIStore } from '@/stores/ui'
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
      const winnerMap: Record<string, { winner: string, union: number, poder: number }> = {}
      if (faction && faction !== 'none') {
        const unionPoints = faction === 'union' ? 100 : 0
        const poderPoints = faction === 'poder' ? 100 : 0
        map.maps.forEach((m: { id: string }) => { 
          winnerMap[m.id] = { winner: faction, union: unionPoints, poder: poderPoints } 
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
    action: (w: string) => {
      const weatherId = w === 'none' ? null : w
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
    action: (c: 'morning' | 'day' | 'dusk' | 'night' | null) => {
      map.forcedCycle = c
      ui.notify(`Debug: Ciclo forzado a ${c}`, '☀️')
    },
    description: 'Fuerza un ciclo día/noche específico.'
  })
}
