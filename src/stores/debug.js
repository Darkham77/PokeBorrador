import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { useMapStore } from './map'
import { usePvPStore } from './pvp'
import { useBreedingStore } from './breeding'

export const useDebugStore = defineStore('debug', () => {
  const auth = useAuthStore()
  const game = useGameStore()
  const ui = useUIStore()
  const map = useMapStore()
  const pvp = usePvPStore()

  const tools = ref([])

  const canAccess = computed(() => {
    if (auth.sessionMode === 'offline') return true
    return auth.user?.role === 'admin'
  })

  function securityCheck() {
    if (auth.sessionMode === 'online' && auth.user?.role !== 'admin') {
      console.error('[SECURITY] Unauthorized debug access detected. Banning user and force logout.')
      const userId = auth.user?.id
      if (userId) {
        game.db.from('profiles').update({ 
          is_banned: true, 
          ban_reason: 'Intento de uso indebido de herramientas de debug' 
        }).eq('id', userId).then(() => {
          console.log('[SECURITY] DB Ban applied.')
        })
      }
      auth.logout()
      return false
    }
    return true
  }

  function register(config) {
    const existingIdx = tools.value.findIndex(t => t.id === config.id)
    if (existingIdx !== -1) {
      tools.value[existingIdx] = config // Update action/config
    } else {
      tools.value.push(config)
    }
    updateGlobalProxy()
  }

  function unregister(id) {
    tools.value = tools.value.filter(t => t.id !== id)
    updateGlobalProxy()
  }

  function updateGlobalProxy() {
    if (typeof window === 'undefined') return
    if (!canAccess.value) {
      delete window.__VITE_DEBUG__
      return
    }
    if (!window.__VITE_DEBUG__) window.__VITE_DEBUG__ = {}

    tools.value.forEach(tool => {
      window.__VITE_DEBUG__[tool.command] = (...args) => {
        if (securityCheck()) {
          return tool.action(...args)
        }
      }
    })
  }

  // Initialize Core Tools
  function init() {
    console.log('[DEBUG] Initializing debug tools...');
    // STATS
    register({
      id: 'core-set-money',
      label: 'FIJAR DINERO',
      command: 'setMoney',
      category: 'stats',
      action: (val) => { 
        game.state.money = parseInt(val) || 0
        ui.notify(`Debug: Dinero fijado en ₽${game.state.money}`, '💰')
        game.saveGame(false)
      },
      description: 'Establece el dinero del jugador.'
    })

    register({
      id: 'core-set-level',
      label: 'FIJAR NIVEL',
      command: 'setLevel',
      category: 'stats',
      action: (val) => { 
        game.state.trainerLevel = parseInt(val) || 1
        ui.notify(`Debug: Nivel fijado en ${game.state.trainerLevel}`, '📈')
        game.saveGame(false)
      },
      description: 'Establece el nivel del entrenador.'
    })

    register({
      id: 'core-set-elo',
      label: 'FIJAR ELO',
      command: 'setElo',
      category: 'stats',
      action: (val) => { 
        pvp.elo = parseInt(val) || 1000
        ui.notify(`Debug: ELO fijado en ${pvp.elo}`, '⚔️')
        game.db.from('profiles').update({ elo_rating: pvp.elo }).eq('id', auth.user.id)
      },
      description: 'Establece el ELO de combate.'
    })

    register({
      id: 'core-set-badges',
      label: 'FIJAR MEDALLAS',
      command: 'setBadges',
      category: 'stats',
      action: (val) => { 
        game.state.badges = parseInt(val) || 0
        ui.notify(`Debug: Medallas fijadas en ${game.state.badges}`, '🎖️')
        game.saveGame(false)
      },
      description: 'Establece la cantidad de medallas (0-8).'
    })

    // MAP
    register({
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

    register({
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

    register({
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

    register({
      id: 'map-set-weather',
      label: 'FIJAR CLIMA',
      command: 'setWeather',
      category: 'time',
      action: (w) => {
        map.setGlobalWeather(w)
        ui.notify(`Clima: ${w.toUpperCase()}`, '🌥️')
      },
      description: 'Cambia el clima global.'
    })

    register({
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

    // POKEMON
    register({
      id: 'poke-set-pokedex-mode',
      label: 'MODO POKEDEX',
      command: 'setPokedexMode',
      category: 'pokes',
      action: async (mode) => {
        if (mode === 'real') {
          ui.debugPokedexMode = null
          await game.loadGame()
          ui.notify('Pokedex REAL RESTAURADA', '✅')
        } else {
          ui.debugPokedexMode = mode // 'none', 'seen', or 'caught'
          ui.notify(`Pokedex modo: ${mode.toUpperCase()}`, '👁️')
        }
      },
      description: 'Cambia el modo de visualización de la pokedex (none, seen, caught, real).'
    })

    register({
      id: 'poke-sync-pokedex',
      label: 'SINCRONIZAR POKEDEX',
      command: 'syncPokedex',
      category: 'pokes',
      action: async (force = false) => {
        if (!force && !confirm('¿Sincronizar pokedex con colección actual?')) return
        
        const caughtIds = new Set()
        const seenIds = new Set()
        game.state.team.forEach(p => { if (p?.id) { caughtIds.add(p.id); seenIds.add(p.id) } })
        if (game.state.box) {
          game.state.box.forEach(p => { if (p?.id) { caughtIds.add(p.id); seenIds.add(p.id) } })
        }
        game.state.pokedex = Array.from(caughtIds)
        game.state.seenPokedex = Array.from(seenIds)
        await game.saveGame(false)
        ui.notify('Pokedex sincronizada', '🔄')
      },
      description: 'Recalcula la pokedex según los pokemon poseídos.'
    })

    // TIME
    register({
      id: 'core-set-mock-time',
      label: 'SET MOCK TIME',
      command: 'setMockTime',
      category: 'time',
      action: (d) => game.db.setMockTime(d),
      description: 'Simula una fecha/hora específica.'
    })

    register({
      id: 'core-reset-time',
      label: 'RESET TIME',
      command: 'resetTime',
      category: 'time',
      action: () => game.db.resetTime(),
      description: 'Restaura la hora real.'
    })

    // ITEMS
    register({
      id: 'item-add',
      label: 'AÑADIR ITEM',
      command: 'addItem',
      category: 'items',
      action: (name, qty = 10) => {
        game.state.inventory[name] = (game.state.inventory[name] || 0) + qty
        ui.notify(`Debug: +${qty} ${name}`, '🎒')
        game.saveGame(false)
      },
      description: 'Añade una cantidad de un item a la mochila.'
    })

    // MISSIONS
    register({
      id: 'mission-regenerate',
      label: 'REGENERAR MISIONES',
      command: 'regenerateMissions',
      category: 'missions',
      action: () => {
        const breeding = useBreedingStore()
        const today = new Date().toISOString().split('T')[0]
        breeding.regenerateMissions(today)
        ui.notify('Misiones de Guardería regeneradas', '📜')
      },
      description: 'Fuerza la regeneración de las misiones diarias de la guardería.'
    })

    register({
      id: 'mission-clear',
      label: 'LIMPIAR MISIONES',
      command: 'clearMissions',
      category: 'missions',
      action: () => {
        game.state.daycare_missions = []
        ui.notify('Misiones de Guardería eliminadas', '🗑️')
        game.saveGame(false)
      },
      description: 'Elimina todas las misiones actuales de la guardería.'
    })

    updateGlobalProxy()
  }

  // Watch for access changes to refresh proxy
  watch(canAccess, () => updateGlobalProxy())

  // Run init
  init()

  return {
    tools,
    canAccess,
    securityCheck,
    register,
    unregister,
    updateGlobalProxy
  }
})
