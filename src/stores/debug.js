// [PureVue-Ignore-Length]
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { useMapStore } from './map'
import { usePvPStore } from './pvp'
import { useBreedingStore } from './breeding'
import { useModalStore } from './modals'
import { useErrorStore } from './errorStore'
import { SHOP_ITEMS } from '@/data/items'

export const useDebugStore = defineStore('debug', () => {
  const auth = useAuthStore()
  const game = useGameStore()
  const ui = useUIStore()
  const map = useMapStore()
  const pvp = usePvPStore()
  const modalStore = useModalStore()
  const errorStore = useErrorStore()

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

    register({
      id: 'core-set-faction',
      label: 'FIJAR BANDO',
      command: 'setFaction',
      category: 'stats',
      action: (f) => {
        game.state.faction = f === 'none' ? null : f
        ui.notify(`Debug: Bando cambiado a ${f ? f.toUpperCase() : 'LIBRE'}`, '🚩')
        game.saveGame(false)
      },
      description: 'Cambia el bando del jugador (poder, union, none).'
    })

    register({
      id: 'core-set-class',
      label: 'FIJAR CLASE',
      command: 'setPlayerClass',
      category: 'stats',
      action: (c) => {
        game.state.playerClass = c === 'none' ? null : c
        ui.notify(`Debug: Clase cambiada a ${c ? c.toUpperCase() : 'RESETEADA'}`, '🎓')
        game.saveGame(false)
      },
      description: 'Cambia la clase del entrenador (entrenador, criador, cazabichos, rocket, none).'
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
        ui.notify(`Clima: ${w ? w.toUpperCase() : 'RESETEADO'}`, '🌥️')
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

    register({
      id: 'poke-reset-db',
      label: 'RESET DB POKEDEX',
      command: 'resetPokedexDB',
      category: 'pokes',
      action: async (force = false) => {
        if (!force && !confirm('⚠️ PELIGRO: Esto borrará TODO el progreso de tu Pokedex (Avistados y Capturados) de forma PERMANENTE. ¿Continuar?')) return
        game.state.pokedex = []
        game.state.seenPokedex = []
        await game.saveGame(false)
        ui.notify('Pokedex reseteada en la base de datos', '🧹')
      },
      description: 'Borra todo el progreso persistente de la pokedex.'
    })

    register({
      id: 'poke-create',
      label: 'CREAR POKEMON (CLI)',
      command: 'createPokemon',
      category: 'pokes',
      action: async (params = {}) => {
        const { pokemonDebugService } = await import('@/logic/debug/pokemonDebugService')
        const p = pokemonDebugService.generate(params)
        await pokemonDebugService.executeProtocol(p, params.protocol || 'catch')
        return p
      },
      description: 'Construye e inyecta un pokemon personalizado (protocolos: catch, hatch, hatch_anim).'
    })

    register({
      id: 'poke-encounter',
      label: 'FORZAR ENCUENTRO (CLI)',
      command: 'spawnEncounter',
      category: 'pokes',
      action: async (params = {}) => {
        const { pokemonDebugService } = await import('@/logic/debug/pokemonDebugService')
        const p = pokemonDebugService.generate(params)
        await pokemonDebugService.triggerEncounter(p, params.mapId || 'plains')
      },
      description: 'Inicia un combate contra un pokemon personalizado en la ruta especificada.'
    })

    register({
      id: 'poke-start-battle',
      label: 'INICIAR COMBATE (SIMPLE)',
      command: 'startBattle',
      category: 'pokes',
      action: async (id = 'pikachu', level = 5, shiny = false) => {
        const { pokemonDebugService } = await import('@/logic/debug/pokemonDebugService')
        
        if (id === 'wild') {
          const { generateEncounter } = await import('@/logic/encounters')
          const encounter = await generateEncounter(useMapStore().currentLocationId || 'plains', useGameStore().state)
          if (encounter && encounter.pokemon) {
            await pokemonDebugService.triggerEncounter(encounter.pokemon)
          }
          return
        }

        const p = pokemonDebugService.generate({ id, level, isShiny: shiny })
        await pokemonDebugService.triggerEncounter(p)
      },
      description: 'Inicia un combate rápido contra un pokemon específico.'
    })

    register({
      id: 'poke-debug-catch-anim',
      label: 'TEST ANIM CAPTURA',
      command: 'playCatchAnim',
      category: 'pokes',
      action: (side = 'enemy') => {
        const { phaserBridge } = require('@/logic/phaserBridge')
        phaserBridge.sendCommand('BattleScene', 'PLAY_CATCH_ENERGY', { side })
        ui.notify(`Debug: Animación Captura (${side})`, '⚡')
      },
      description: 'Ejecuta la nueva animación de captura (energía) sobre un sprite.'
    })

    register({
      id: 'poke-debug-release-anim',
      label: 'TEST ANIM SALIDA',
      command: 'playReleaseAnim',
      category: 'pokes',
      action: (side = 'enemy') => {
        const { useBattleStore } = require('./battle')
        const { phaserBridge } = require('@/logic/phaserBridge')
        const battle = useBattleStore()
        const pokemon = side === 'player' ? battle.player : battle.enemy
        if (!pokemon) return ui.notify('No hay pokemon activo', '❌')
        phaserBridge.sendCommand('BattleScene', 'PLAY_RELEASE_ENERGY', { side, pokemon })
        ui.notify(`Debug: Animación Salida (${side})`, '✨')
      },
      description: 'Ejecuta la nueva animación de salida (energía) sobre un sprite.'
    })

    register({
      id: 'poke-clear-pvp',
      label: 'LIMPIAR EQUIPO PVP',
      command: 'clearPvpTeam',
      category: 'pokes',
      action: async (force = false) => {
        if (!force && !confirm('¿Limpiar equipo PVP de forma permanente?')) return
        ui.pvpAutoFillDisabled = true
        game.state.pvpTeam = []
        await game.saveGame(false)
        ui.notify('Equipo PVP limpiado y auto-rellenado desactivado', '🧹')
      },
      description: 'Limpia los slots del equipo PVP y desactiva el auto-rellenado.'
    })

    register({
      id: 'poke-clear-war',
      label: 'LIMPIAR EQUIPO GUERRA',
      command: 'clearWarTeam',
      category: 'pokes',
      action: async (force = false) => {
        if (!force && !confirm('¿Limpiar equipo de Guerra de forma permanente?')) return
        ui.warAutoFillDisabled = true
        game.state.warTeam = []
        await game.saveGame(false)
        ui.notify('Equipo de Guerra limpiado y auto-rellenado desactivado', '🧹')
      },
      description: 'Limpia los slots del equipo de Guerra y desactiva el auto-rellenado.'
    })

    register({
      id: 'poke-force-starter',
      label: 'FORZAR PANTALLA INICIAL',
      command: 'forceStarterScreen',
      category: 'pokes',
      action: () => {
        game.state.starterChosen = false
        ui.notify('Debug: Pantalla de Iniciales forzada', '🛡️')
      },
      description: 'Fuerza la aparición de la pantalla de selección de Pokémon inicial.'
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

    register({
      id: 'time-add-hours',
      label: 'AÑADIR HORAS',
      command: 'addHours',
      category: 'time',
      action: (h) => {
        const current = game.db.getTimeOffset()
        game.db.setTimeOffset(current + (h * 3600 * 1000))
        ui.notify(`Debug: +${h} horas añadidas`, '⏩')
        window.dispatchEvent(new CustomEvent('time-sync-update'))
      },
      description: 'Añade una cantidad de horas al offset de tiempo actual.'
    })

    register({
      id: 'time-add-weeks',
      label: 'AÑADIR SEMANAS',
      command: 'addWeeks',
      category: 'time',
      action: (w) => {
        const current = game.db.getTimeOffset()
        // 1 week = 7 days * 24 hours * 3600 seconds * 1000 ms
        game.db.setTimeOffset(current + (w * 7 * 24 * 3600 * 1000))
        ui.notify(`Debug: +${w} semanas añadidas`, '⏩')
        window.dispatchEvent(new CustomEvent('time-sync-update'))
      },
      description: 'Añade semanas completas para simular cambios de estación.'
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

    register({
      id: 'item-fill-all',
      label: 'LLENAR MOCHILA',
      command: 'fillInventory',
      category: 'items',
      action: (qty = 50) => {
        SHOP_ITEMS.forEach(item => {
          game.state.inventory[item.name] = qty
        })
        ui.notify(`Debug: Mochila llena (${SHOP_ITEMS.length} tipos de objetos)`, '🎒')
        game.saveGame(false)
      },
      description: 'Añade una cantidad de TODOS los objetos de la base de datos.'
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

    // MODALS
    register({
      id: 'modal-test-stack',
      label: 'TEST MODAL STACK',
      command: 'testModalStack',
      category: 'modals',
      action: async (count = 5) => {
        for (let i = 1; i <= count; i++) {
          modalStore.open('DebugStackTest', { number: i })
          if (i < count) await new Promise(resolve => setTimeout(resolve, 500))
        }
      },
      description: 'Abre múltiples ventanas modales secuencialmente para probar el sistema de capas.'
    })

    register({
      id: 'modal-close-all',
      label: 'CERRAR TODO',
      command: 'closeAllModals',
      category: 'modals',
      action: () => {
        modalStore.closeAll()
        ui.notify('Todas las ventanas cerradas', '🚪')
      },
      description: 'Cierra todas las ventanas modales activas.'
    })

    register({
      id: 'modal-test-pos',
      label: 'TEST MODAL POS',
      command: 'openTestModal',
      category: 'modals',
      action: (type = 'center') => {
        modalStore.open('DebugStackTest', { 
          number: Math.floor(Math.random() * 100),
          type 
        })
      },
      description: 'Abre un modal de prueba con el posicionamiento especificado (top, down, left, right, fullscreen, center).'
    })

    register({
      id: 'core-trigger-error',
      label: 'DISPARAR ERROR',
      command: 'triggerTestError',
      category: 'modals',
      action: () => {
        errorStore.setError(new Error('Error de prueba desde CLI Debug'), {
          type: 'CLI Test Error',
          source: 'debugStore.js'
        })
      },
      description: 'Simula un error global para probar el sistema de logs y notificaciones.'
    })

    register({
      id: 'admin-save-event',
      label: 'SAVE EVENT',
      command: 'saveEvent',
      category: 'admin',
      action: async (eventData) => {
        const { error } = await game.db.from('events_config').upsert(eventData)
        if (error) throw error
        ui.notify('Evento guardado (CLI)', '✅')
        const eventStoreModule = await import('./events')
        if (eventStoreModule && eventStoreModule.useEventStore) {
          const eventStore = eventStoreModule.useEventStore()
          await eventStore.fetchEvents()
        }
      },
      description: 'Guarda o actualiza la configuración de un evento.'
    })

    register({
      id: 'admin-save-ranked-rules',
      label: 'SAVE RANKED RULES',
      command: 'saveRankedRules',
      category: 'admin',
      action: async (rules) => {
        const { error } = await game.db.from('ranked_rules_config').upsert({
          id: 'current',
          season_name: rules.seasonName,
          config: { ...rules },
          updated_at: new Date().toISOString()
        })
        if (error) throw error
        ui.notify('Reglas Ranked guardadas (CLI)', '🏆')
      },
      description: 'Guarda las reglas actuales de la temporada Ranked.'
    })

    register({
      id: 'admin-close-season',
      label: 'CLOSE RANKED SEASON',
      command: 'closeRankedSeason',
      category: 'admin',
      action: async (seasonName) => {
        const { data, error } = await game.db.rpc('fn_award_ranked_season_automated', {
          target_season_name: seasonName
        })
        if (error) throw error
        ui.notify(`Temporada cerrada: ${data.players_count} premiados`, '🏆')
      },
      description: 'Cierra la temporada Ranked actual y entrega premios automáticamente.'
    })

    register({
      id: 'emergency-factory-reset',
      label: 'FACTORY RESET LOCAL',
      command: 'factoryResetLocal',
      category: 'emergency',
      action: () => {
        localStorage.clear()
        sessionStorage.clear()
        window.location.reload()
      },
      description: 'Limpia todo el estado local (localStorage/sessionStorage) y reinicia la página.'
    })

    register({
      id: 'emergency-force-sync',
      label: 'FORCE SYNC CLOUD',
      command: 'forceSyncCloud',
      category: 'emergency',
      action: async () => {
        await game.save(true)
        ui.notify('Sincronización forzada completada', '🔄')
      },
      description: 'Fuerza el guardado inmediato en la nube saltándose el debounce.'
    })

    // NAVIGATION
    register({
      id: 'nav-tab',
      label: 'NAVEGAR A TABS',
      command: 'navigate',
      category: 'navigation',
      action: (tabId) => {
        ui.activeTab = tabId
        ui.notify(`Navegando a: ${tabId.toUpperCase()}`, '🚀')
      },
      description: 'Cambia la pestaña principal activa (map, pc, battle, etc).'
    })

    register({
      id: 'nav-modal-open',
      label: 'ABRIR MODAL',
      command: 'openModal',
      category: 'navigation',
      action: (name, props = {}) => {
        ui.open(name, props)
      },
      description: 'Abre cualquier ventana modal por su nombre.'
    })

    register({
      id: 'nav-modal-close',
      label: 'CERRAR MODAL',
      command: 'closeModal',
      category: 'navigation',
      action: (name) => {
        if (name) ui.close(name)
        else ui.closeModal()
      },
      description: 'Cierra una modal específica o la de más arriba.'
    })

    register({
      id: 'nav-library-tab',
      label: 'TABS DE LIBRERÍA',
      command: 'setLibraryTab',
      category: 'navigation',
      action: (tabId) => {
        ui.libraryTab = tabId
      },
      description: 'Cambia la pestaña activa dentro de la Librería/Pokedex.'
    })

    register({
      id: 'nav-inspect-poke',
      label: 'INSPECCIONAR POKE',
      command: 'inspectPokemon',
      category: 'navigation',
      action: (index, context = 'team') => {
        const pokes = context === 'team' ? game.state.team : game.state.box
        const p = pokes[index]
        if (p) ui.openPokemonDetail(p, index, context)
        else console.warn(`[DEBUG] No hay pokemon en ${context}[${index}]`)
      },
      description: 'Abre el detalle de un pokemon específico por índice y contexto.'
    })

    register({
      id: 'nav-hud-group',
      label: 'TOGGLE HUD GROUP',
      command: 'toggleHud',
      category: 'navigation',
      action: (group) => {
        ui.toggleHudGroup(group)
      },
      description: 'Alterna la visibilidad de grupos del HUD (MARKET, POKEMON, etc).'
    })

    register({
      id: 'core-get-game-store',
      label: 'OBTENER GAME STORE',
      command: 'getGameStore',
      category: 'core',
      action: () => game,
      description: 'Retorna la instancia reactiva del game store para inspección.'
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
