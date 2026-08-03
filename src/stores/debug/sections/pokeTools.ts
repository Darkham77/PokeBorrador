import type { DebugSystem } from '@/stores/debug'

import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useBreedingStore } from '@/stores/breeding'
import { POKEMON_STAT_KEYS } from '@/types/pokemon/pokemon'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { POKEMON_DB } from '@/data/pokemon/pokemonDB'
import { EVOLUTION_TABLE, TRADE_EVOLUTIONS, getStoneEvolution } from '@/data/pokemon/evolutionData'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'

export function registerPokeTools(debug: DebugSystem) {
  const game = useGameStore()
  const ui = useUIStore()
  const mapStore = useMapStore()
  const breedingStore = useBreedingStore()

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
        ui.debugPokedexMode = mode as 'caught' | 'seen' | 'none' | null
        ui.notify(`Pokedex modo: ${mode.toUpperCase()}`, '👁️') // text-ok
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
      
      const caughtIds = new Set<PokemonSpeciesId>()
      const seenIds = new Set<PokemonSpeciesId>()
      game.state.team.forEach((p: Pokemon) => { if (p?.id) { caughtIds.add(p.id); seenIds.add(p.id) } })
      if (game.state.box) {
        game.state.box.forEach((p: Pokemon) => { if (p?.id) { caughtIds.add(p.id); seenIds.add(p.id) } })
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
    action: async (params: Record<string, unknown> = {}) => {
      const { pokemonDebugService } = await import('@/logic/debug/pokemonDebugService')
      const p = pokemonDebugService.generate(params)
      await pokemonDebugService.executeProtocol(p, (params.protocol as string) || 'catch')
      return p
    },
    description: 'Construye e inyecta un pokemon personalizado (protocolos: catch, hatch, hatch_anim).'
  })

  debug.register({
    id: 'poke-encounter',
    label: 'FORZAR ENCUENTRO (CLI)',
    command: 'spawnEncounter',
    category: 'pokes',
    action: async (params: Record<string, unknown> = {}) => {
      const { pokemonDebugService } = await import('@/logic/debug/pokemonDebugService')
      const p = pokemonDebugService.generate(params)
      await pokemonDebugService.triggerEncounter(p, (params.mapId as string) || 'plains')
    },
    description: 'Inicia un combate contra un pokemon personalizado en la ruta especificada.'
  })

  debug.register({
    id: 'poke-start-battle',
    label: 'INICIAR COMBATE (SIMPLE)',
    command: 'startBattle',
    category: 'pokes',
    action: async (id: string = 'pikachu', level: number = 5, shiny: boolean = false) => {
      const { pokemonDebugService } = await import('@/logic/debug/pokemonDebugService')
      
      if (id === 'wild') {
        const { generateEncounter } = await import('@/logic/encounters/encounters')
        const encounter = await generateEncounter(mapStore.currentMap || 'plains', game.state)
        if (encounter && (encounter as { pokemon: Pokemon }).pokemon) {
          await pokemonDebugService.triggerEncounter((encounter as { pokemon: Pokemon }).pokemon)
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
    action: async (force: boolean = false) => {
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
      game.state.team.forEach((p: Pokemon) => {
        if (p) {
          p.hp = p.maxHp
          if (p.moves) p.moves.forEach((m) => { if (m) m.pp = m.maxPP })
          p.status = ''
        }
      })
      ui.notify('Equipo curado', '💊')
    },
    description: 'Cura completamente a todos los Pokémon del equipo.'
  })

  debug.register({
    id: 'poke-test-evolution',
    label: 'PROBAR EVOLUCIÓN (CLI)',
    command: 'testEvolution',
    category: 'pokes',
    action: (slotIndex: number = 0, targetSpeciesId?: string, itemName?: string) => {
      const pokemon = game.state.team[slotIndex]
      if (!pokemon) {
        ui.notify('No hay un Pokémon en la ranura especificada', '❌')
        return
      }

      let target = targetSpeciesId
      let item = itemName || ''

      if (!target) {
        // 1. Buscar en tabla de nivel
        const levelEvo = (EVOLUTION_TABLE as Record<string, { to: string }>)[pokemon.id] // open-record
        if (levelEvo) {
          target = levelEvo.to
        } else {
          // 2. Buscar en tabla de piedras (eevee y formas con múltiples variantes usan patrón {species}_{disambiguator})
          const stoneEvo = getStoneEvolution(pokemon.id)
          if (stoneEvo) {
            target = stoneEvo.to
            item = stoneEvo.stone
          } else {
            // 3. Buscar en tabla de intercambio
            const tradeEvo = (TRADE_EVOLUTIONS as Record<string, string>)[pokemon.id] // open-record
            if (tradeEvo) {
              target = tradeEvo
            }
          }
        }
      }

      if (!target) {
        ui.notify(`${pokemon.name} no tiene una evolución debug resoluble.`, '❌')
        return
      }

      ui.notify(`Iniciando evolución de ${pokemon.name} a ${target}...`, '✨')
      ui.startEvolution(pokemon, target, item)
    },
    description: 'Dispara la escena de evolución animada para el Pokémon en la ranura indicada (índice 0-5), autodetectando la evolución natural por defecto.'
  })

  debug.register({
    id: 'breeding-debug-eggs',
    label: 'VER DETALLES DE HUEVOS (CLI)',
    command: 'debugEggs',
    category: 'pokes',
    action: () => {
      const db = POKEMON_DB
      
      const warehouse = breedingStore.warehouseEggs.map(e => ({
        id: e.id,
        especie: db[e.species]?.name || e.species,
        nivel: e.level,
        naturaleza: e.nature,
        shiny: e.isShiny ? '✨ SÍ' : 'NO',
        ivs: `HP: ${e.ivs.hp}, ATK: ${e.ivs.atk}, DEF: ${e.ivs.def}, SPA: ${e.ivs.spa}, SPD: ${e.ivs.spd}, SPE: ${e.ivs.spe}`,
        costo: `₽${e.inherited_ivs?._cost || e.cost || 0}`,
        escaneado: e.inherited_ivs?._scanned ? 'SÍ' : 'NO'
      }))

      const backpack = (game.state.eggs || []).map(e => ({
        uid: e.uid,
        especie: db[e.id]?.name || e.id,
        pasosRestantes: e.steps,
        listo: e.ready ? '🐣 SÍ' : 'NO',
        shiny: e.isShiny ? '✨ SÍ' : 'NO',
        naturaleza: e.nature || 'N/A',
        ivs: e.ivs ? `HP: ${e.ivs.hp || 0}, ATK: ${e.ivs.atk || 0}, DEF: ${e.ivs.def || 0}, SPA: ${e.ivs.spa || 0}, SPD: ${e.ivs.spd || 0}, SPE: ${e.ivs.spe || 0}` : 'Desconocido',
        escaneado: e.scanned ? 'SÍ' : 'NO'
      }))

      console.group('🥚 [DEBUG] DETALLES DE HUEVOS ACTIVOS')
      console.debug('--- EN ALMACÉN DE GUARDERÍA ---')
      if (warehouse.length > 0) {
        console.table(warehouse)
      } else {
        console.debug('No hay huevos en el almacén de la guardería.')
      }

      console.debug('--- EN LA MOCHILA ---')
      if (backpack.length > 0) {
        console.table(backpack)
      } else {
        console.debug('No hay huevos en la mochila.')
      }
      console.groupEnd()

      ui.notify('Detalles de huevos impresos en consola', '🥚')
      return { warehouseEggs: breedingStore.warehouseEggs, backpackEggs: game.state.eggs }
    },
    description: 'Imprime en la consola de desarrollo la lista detallada y las propiedades secretas de todos los huevos.'
  })

  debug.register({
    id: 'breeding-scan-egg',
    label: 'ESCANEAR HUEVO (CLI)',
    command: 'scanEgg',
    category: 'pokes',
    action: (idOrAll?: string) => {
      const db = POKEMON_DB
      let scannedCount = 0

      const scanAll = !idOrAll || idOrAll.toLowerCase() === 'all' // text-ok

      // Scan warehouse eggs
      breedingStore.warehouseEggs.forEach(e => {
        if (scanAll || e.id === idOrAll) {
          if (!e.inherited_ivs) e.inherited_ivs = {}
          e.inherited_ivs._scanned = true
          scannedCount++
        }
      })
      if (breedingStore.saveWarehouseEggs) {
        breedingStore.saveWarehouseEggs()
      }

      // Scan backpack eggs
      if (game.state.eggs) {
        game.state.eggs.forEach(e => {
          if (scanAll || e.uid === idOrAll || e.id === idOrAll) {
            e.scanned = true
            
            // Calculate total IV
            const eggIvs = e.ivs || {}
            const totalIv = POKEMON_STAT_KEYS.reduce((acc, key) => {
              const val = eggIvs[key]
              return acc + (typeof val === 'number' ? val : 0)
            }, 0)

            e.predictedInfo = {
              name: db[e.id]?.name || 'Huevo Pokémon',
              ivTotal: totalIv
            }
            scannedCount++
          }
        })
      }

      if (scannedCount > 0) {
        ui.notify(`Se han escaneado ${scannedCount} huevo(s)`, '🔍')
        game.saveGame(false)
      } else {
        ui.notify('No se encontró ningún huevo para escanear', '❌')
      }
    },
    description: 'Escanea un huevo por ID/UID en almacén o mochila, o todos si se omite el argumento.'
  })

  debug.register({
    id: 'breeding-walk-eggs',
    label: 'CAMINAR HUEVOS (CLI)',
    command: 'walkEggs',
    category: 'pokes',
    action: () => {
      const eggs = game.state.eggs || []
      if (eggs.length === 0) {
        ui.notify('No hay huevos en la mochila para caminar', '❌')
        return
      }
      eggs.forEach(e => {
        e.steps = 0
        e.ready = true
      })
      ui.notify('¡Huevos en la mochila listos para eclosionar!', '🚶')
      game.saveGame(false)
    },
    description: 'Reduce a 0 los pasos de todos los huevos en la mochila y los deja listos para abrir.'
  })
}
