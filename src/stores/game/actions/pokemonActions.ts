import { makePokemon, validatePokemon } from '@/logic/pokemon/pokemonFactory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useUIStore } from '@/stores/ui'
import { useLoadingStore } from '@/stores/loading'
import type { GameState } from '@/types/system/game'
import type { Pokemon, PokemonEgg, PokemonStorageLocation } from '@/types/pokemon/pokemon'
import { BUFF_FIELDS, getItemById, getMaxBuffDuration, requireItemId } from '@/data/inventory/items'
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { logger } from '@/logic/utils/logger'
import { healStuckMissions } from '@/logic/player/missionRecovery'
import { healStuckEventPokemon } from '@/logic/player/eventRecovery'
import { getActivePinia } from 'pinia'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import type { CompetitionEntry } from '@/types/system/stores'
import { isPokemonBusy } from '@/logic/constants/tags'


export function usePokemonActions(
  state: GameState, 
  scheduleSave: () => Promise<void>, 
  autoFillPvpTeam: () => void, 
  autoFillWarTeam: () => void
) {
  function registerPokedex(id: PokemonSpeciesId, caught = false) {
    if (!state.seenPokedex.includes(id)) state.seenPokedex.push(id)
    if (caught && !state.pokedex.includes(id)) state.pokedex.push(id)
  }
  
  async function chooseStarter(id: string) {
    const speciesId = requirePokemonSpeciesId(id)
    const loadingStore = useLoadingStore()
    loadingStore.start('choose_starter', 'Preparando aventura...', 'Asignando primer compañero', true, '🎒')
    
    const uiStore = useUIStore()
    const starter = makePokemon(speciesId, 5)
    
    if (starter) {
      addPokemon(starter, { notify: false })
      state.starterChosen = true
      uiStore.activeTab = 'map'
      
      const speciesData = pokemonDataProvider.getPokemonData(speciesId)
      if (speciesData) {
        uiStore.notify(`¡${speciesData.name} es tu compañero! ¡Buena suerte!`, '🎉')
      }
    }
    
    await scheduleSave() // Save immediately
    loadingStore.finish('choose_starter')
  }

  function addPokemon(pokemon: Pokemon | null, options = { notify: true }) {
    if (!pokemon) return { success: false, target: null }
    registerPokedex(pokemon.id, true)

    let target: PokemonStorageLocation = 'team'
    if (state.team.length < 6) {
      state.team.push(pokemon)
    } else {
      state.box = state.box || []
      state.box.push(pokemon)
      target = 'box'
    }

    if (options.notify) {
      const location = target === 'team' ? 'tu equipo' : 'la Caja PC'
      useUIStore().notify(`¡${pokemon.name} se unió a ${location}!`, '✨')
    }

    scheduleSave()
    autoFillPvpTeam()
    autoFillWarTeam()
    return { success: true, target }
  }



  function removePokemon(uid: string) {
    const teamIdx = state.team.findIndex(p => p.uid === uid)
    if (teamIdx !== -1) {
      const p = state.team[teamIdx]
      if (p && isPokemonBusy(p)) return false
      state.team.splice(teamIdx, 1)
      autoFillPvpTeam()
      scheduleSave()
      return true
    }
    const boxIdx = state.box.findIndex(p => p != null && p.uid === uid)
    if (boxIdx !== -1) {
      const p = state.box[boxIdx]
      if (!p || isPokemonBusy(p)) return false
      state.box.splice(boxIdx, 1)
      autoFillPvpTeam()
      autoFillWarTeam()
      scheduleSave()
      return true
    }
    return false
  }

  function reorderTeam(draggedIndex: number, targetIndex: number) {
    if (draggedIndex === targetIndex) return
    const newTeam = [...state.team]
    const [moved] = newTeam.splice(draggedIndex, 1)
    if (!moved) return
    newTeam.splice(targetIndex, 0, moved)
    state.team = newTeam
    scheduleSave()
  }

  function reorderMoves(pokemon: Pokemon, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || !pokemon || !pokemon.moves) return
    const newMoves = [...pokemon.moves]
    const moved = newMoves[fromIndex]
    if (moved === undefined) return
    newMoves.splice(fromIndex, 1)
    newMoves.splice(toIndex, 0, moved);
    pokemon.moves = newMoves
    scheduleSave()
  }

  function sendToBox(index: number) {
    if (state.team.length <= 1) {
      useUIStore().notify('No puedes quedarte sin Pokémon en el equipo.', '⚠️')
      return false
    }
    const p = state.team[index];
    if (!p) return false;

    state.team.splice(index, 1)
    state.box.push(p)
    useUIStore().notify(`¡${p.name} fue enviado a la Caja PC!`, '📦')
    autoFillPvpTeam()
    autoFillWarTeam()
    scheduleSave()
    return true
  }

  function togglePokeTag(context: PokemonStorageLocation, index: number, tagId: string) {
    const p = context === 'team' ? state.team[index] : (state.box ? state.box[index] : null)
    if (!p) return
    
    if (!p.tags) p.tags = []
    const idx = p.tags.indexOf(tagId)
    if (idx > -1) {
      p.tags.splice(idx, 1)
    } else {
      p.tags.push(tagId)
    }
    scheduleSave()
  }

  function validateAll() {
    // Self-healing stuck Pokémon on mission
    if (state.classData) {
      const activeMission = (state.classData as { activeMission?: { targetPokemonUid?: string; targetPokemonIdx?: number; pokeUid?: string } | null }).activeMission
      const fixedAny = healStuckMissions(state.team, state.box, activeMission)
      if (fixedAny) {
        logger.info('SaveMigration', 'Self-healed stuck Pokémon on mission.')
        scheduleSave()
      }
    }

    // Self-healing stuck Pokémon on events
    const piniaActive = getActivePinia()
    const eventsState = piniaActive?.state?.value?.events as { allEvents?: GameEvent[]; userEntries?: Record<string, CompetitionEntry> } | undefined
    const fixedEvents = healStuckEventPokemon(state.team, state.box, eventsState?.allEvents, eventsState?.userEntries)
    if (fixedEvents) {
      logger.info('SaveMigration', 'Self-healed stuck Pokémon on event(s).')
      scheduleSave()
    }

    state.team.forEach(p => p && validatePokemon(p))
    if (state.box) state.box.forEach(p => p && validatePokemon(p))

    // Validate inventory: must strictly match official IDs, no runtime translation fallbacks allowed
    if (state.inventory) {
      for (const key of Object.keys(state.inventory)) {
        getItemById(requireItemId(key));
      }
    }
    // Migración automática: Mover Pokémon del equipo ocupados (guardería, misión, evento, defensa) a la caja PC
    const teamToKeep: Pokemon[] = []
    const teamToMove: Pokemon[] = []
    
    state.team.forEach(p => {
      if (!p) return
      if (p.inDaycare || p.onMission || p.onEvent || p.onDefense) {
        teamToMove.push(p)
      } else {
        teamToKeep.push(p)
      }
    })

    if (teamToMove.length > 0) {
      // Si moverlos a todos dejaría el equipo completamente vacío, preservamos el primero ocupado en el equipo
      if (teamToKeep.length === 0 && teamToMove.length > 0) {
        const first = teamToMove.shift()
        if (first) teamToKeep.push(first)
      }

      teamToMove.forEach(p => {
        state.box.push(p)
      })

      state.team = teamToKeep
      autoFillPvpTeam()
      autoFillWarTeam()
      scheduleSave()
    }
    
    if (state.eggs && Array.isArray(state.eggs)) {
      state.eggs.forEach((egg: PokemonEgg) => {
        if (!egg) return;
        const speciesId = requirePokemonSpeciesId(egg.id);
        if (egg.pokemonId && egg.pokemonId !== speciesId) {
          throw new Error(`[game] Invalid egg species data: id=${speciesId}, pokemonId=${egg.pokemonId}. Run a data migration instead of runtime patching.`);
        }
        if (!egg.uid) {
          throw new Error(`[game] Invalid egg ${speciesId}: missing uid.`);
        }
      });
    }

    // Saneamiento de timers de buffs activos del jugador (Basado en el valor máximo definido por los objetos en SHOP_ITEMS)
    BUFF_FIELDS.forEach(field => {
      const val = state[field]
      if (val !== undefined && typeof val === 'number') {
        const maxAllowedSecs = getMaxBuffDuration(field)
        if (val > maxAllowedSecs) {
          logger.warn('Self-Healing', `Timer corrupto detectado en ${field} (${val}s). Ajustando al máximo permitido por el objeto (${maxAllowedSecs}s).`);
          Reflect.set(state, field, maxAllowedSecs)
          scheduleSave()
        }
      }
    })
  }


  return { registerPokedex, chooseStarter, addPokemon, removePokemon, reorderTeam, reorderMoves, sendToBox, togglePokeTag, validateAll }
}
