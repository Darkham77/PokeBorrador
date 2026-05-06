export function registerMapTools(debug, { map, ui }) {
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
    id: 'map-force-dominance',
    label: 'DOMINIO GLOBAL',
    command: 'setDominance',
    category: 'map',
    action: (faction) => {
      const winnerMap = {}
      if (faction && faction !== 'none') {
        map.maps.forEach(m => { winnerMap[m.id] = { winner_faction: faction } })
      }
      map.mapWinners = winnerMap
      ui.notify(`Dominio: ${faction || 'NEUTRAL'}`, '🚩')
    },
    description: 'Fuerza el bando dominante en todo el mapa.'
  })

  debug.register({
    id: 'map-set-weather',
    label: 'FIJAR CLIMA',
    command: 'setWeather',
    category: 'time',
    action: (w) => {
      map.setGlobalWeather(w)
      ui.notify(`Clima: ${w ? w.toUpperCase() : 'RESETEADO'}`, '🌥️')
    },
    description: 'Cambia el clima global.'
  })

  debug.register({
    id: 'map-set-cycle',
    label: 'FIJAR CICLO',
    command: 'setCycle',
    category: 'time',
    action: (c) => {
      map.setGlobalCycle(c)
      ui.notify(`Ciclo: ${c ? c.toUpperCase() : 'REAL'}`, '⌛')
    },
    description: 'Fuerza un ciclo horario (morning, day, dusk, night) o null para real.'
  })
}
