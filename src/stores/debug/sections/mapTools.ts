export function registerMapTools(debug: any, { map, ui }: { map: any, ui: any }) {
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
      const winnerMap: any = {}
      if (faction && faction !== 'none') {
        map.maps.forEach((m: any) => { winnerMap[m.id] = { winner: faction } })
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
      map.globalWeather = w
      ui.notify(`Debug: Clima forzado a ${w}`, '⛅')
    },
    description: 'Fuerza un clima específico en el mapa actual.'
  })

  debug.register({
    id: 'map-set-cycle',
    label: 'SET CYCLE',
    command: 'setCycle',
    category: 'map',
    action: (c: string) => {
      map.forcedCycle = c
      ui.notify(`Debug: Ciclo forzado a ${c}`, '☀️')
    },
    description: 'Fuerza un ciclo día/noche específico.'
  })
}
