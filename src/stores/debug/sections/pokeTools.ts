export function registerPokeTools(debug: any, { game, ui, mapStore }: { game: any, ui: any, mapStore: any }) {
  debug.register({
    id: 'poke-set-pokedex-mode',
    label: 'MODO POKEDEX',
    command: 'setPokedexMode',
    category: 'pokes',
    action: async (mode: string) => {
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

  debug.register({
    id: 'poke-sync-pokedex',
    label: 'SINCRONIZAR POKEDEX',
    command: 'syncPokedex',
    category: 'pokes',
    action: async (force = false) => {
      if (!force && !confirm('¿Sincronizar pokedex con colección actual?')) return
      
      const caughtIds = new Set()
      const seenIds = new Set()
      game.state.team.forEach((p: any) => { if (p?.id) { caughtIds.add((p as any).id); seenIds.add((p as any).id) } })
      if (game.state.box) {
        game.state.box.forEach((p: any) => { if (p?.id) { caughtIds.add((p as any).id); seenIds.add((p as any).id) } })
      }
      game.state.pokedex = Array.from(caughtIds)
      game.state.seenPokedex = Array.from(seenIds)
      await game.saveGame(false)
      ui.notify('Pokedex sincronizada', '🔄')
    },
    description: 'Recalcula la pokedex según los pokemon poseídos.'
  })

  debug.register({
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

  debug.register({
    id: 'poke-create',
    label: 'CREAR POKEMON (CLI)',
    command: 'createPokemon',
    category: 'pokes',
    action: async (params: any = {}) => {
      const { pokemonDebugService } = await import('@/logic/debug/pokemonDebugService')
      const p = pokemonDebugService.generate(params)
      await pokemonDebugService.executeProtocol(p, params.protocol || 'catch')
      return p
    },
    description: 'Construye e inyecta un pokemon personalizado (protocolos: catch, hatch, hatch_anim).'
  })

  debug.register({
    id: 'poke-encounter',
    label: 'FORZAR ENCUENTRO (CLI)',
    command: 'spawnEncounter',
    category: 'pokes',
    action: async (params: any = {}) => {
      const { pokemonDebugService } = await import('@/logic/debug/pokemonDebugService')
      const p = pokemonDebugService.generate(params)
      await pokemonDebugService.triggerEncounter(p, params.mapId || 'plains')
    },
    description: 'Inicia un combate contra un pokemon personalizado en la ruta especificada.'
  })

  debug.register({
    id: 'poke-start-battle',
    label: 'INICIAR COMBATE (SIMPLE)',
    command: 'startBattle',
    category: 'pokes',
    action: async (id = 'pikachu', level = 5, shiny = false) => {
      const { pokemonDebugService } = await import('@/logic/debug/pokemonDebugService')
      
      if (id === 'wild') {
        const { generateEncounter } = await import('@/logic/encounters')
        const encounter = await generateEncounter(mapStore.currentLocationId || 'plains', game.state)
        if (encounter && (encounter as any).pokemon) {
          await pokemonDebugService.triggerEncounter((encounter as any).pokemon)
        }
        return
      }

      const p = pokemonDebugService.generate({ id, level, isShiny: shiny })
      await pokemonDebugService.triggerEncounter(p)
    },
    description: 'Inicia un combate rápido contra un pokemon específico.'
  })

  debug.register({
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

  debug.register({
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

  debug.register({
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

  debug.register({
    id: 'poke-heal-all',
    label: 'CURAR EQUIPO',
    command: 'healAll',
    category: 'pokes',
    action: () => {
      game.state.team.forEach((p: any) => {
        if (p) {
          p.hp = p.maxHp
          if (p.moves) (p.moves as any[]).forEach((m: any) => { if (m) m.pp = m.maxPP })
          p.status = null
        }
      })
      ui.notify('Equipo curado', '💊')
    },
    description: 'Cura completamente a todos los Pokémon del equipo.'
  })
}
