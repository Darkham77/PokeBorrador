import { makePokemon } from '@/logic/pokemonFactory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useUIStore } from '@/stores/ui'
import { useLoadingStore } from '@/stores/loading'

export function usePokemonActions(state, scheduleSave, autoFillPvpTeam, autoFillWarTeam) {
  function registerPokedex(id, caught = false) {
    if (!state.seenPokedex.includes(id)) state.seenPokedex.push(id)
    if (caught && !state.pokedex.includes(id)) state.pokedex.push(id)
  }

  async function chooseStarter(id) {
    const loadingStore = useLoadingStore()
    loadingStore.start('choose_starter', 'Preparando aventura...', 'Asignando primer compañero', true)
    
    const uiStore = useUIStore()
    const starter = makePokemon(id, 5)
    
    addPokemon(starter, { notify: false })
    state.starterChosen = true
    uiStore.activeTab = 'map'
    
    const speciesData = pokemonDataProvider.getPokemonData(id)
    uiStore.notify(`¡${speciesData.name} es tu compañero! ¡Buena suerte!`, '🎉')
    
    await scheduleSave() // Save immediately
    loadingStore.finish('choose_starter')
  }

  function addPokemon(pokemon, options = { notify: true }) {
    if (!pokemon) return false
    registerPokedex(pokemon.id, true)

    let target = 'team'
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

  function removePokemon(uid) {
    const teamIdx = state.team.findIndex(p => p.uid === uid)
    if (teamIdx !== -1) {
      state.team.splice(teamIdx, 1)
      autoFillPvpTeam()
      scheduleSave()
      return true
    }
    const boxIdx = state.box.findIndex(p => p.uid === uid)
    if (boxIdx !== -1) {
      state.box.splice(boxIdx, 1)
      autoFillPvpTeam()
      autoFillWarTeam()
      scheduleSave()
      return true
    }
    return false
  }

  function reorderTeam(draggedIndex, targetIndex) {
    if (draggedIndex === targetIndex) return
    const newTeam = [...state.team]
    const [moved] = newTeam.splice(draggedIndex, 1)
    newTeam.splice(targetIndex, 0, moved)
    state.team = newTeam
    scheduleSave()
  }

  function reorderMoves(pokemon, fromIndex, toIndex) {
    if (fromIndex === toIndex || !pokemon || !pokemon.moves) return
    const newMoves = [...pokemon.moves]
    const [moved] = newMoves.splice(fromIndex, 1)
    newMoves.splice(toIndex, 0, moved)
    pokemon.moves = newMoves
    scheduleSave()
  }

  function sendToBox(index) {
    if (state.team.length <= 1) {
      useUIStore().notify('No puedes quedarte sin Pokémon en el equipo.', '⚠️')
      return false
    }
    const p = state.team[index]
    
    // Heal on storage
    p.hp = p.maxHp
    p.status = null
    p.sleepTurns = 0
    p.moves?.forEach(m => { m.pp = m.maxPP })

    state.team.splice(index, 1)
    state.box.push(p)
    useUIStore().notify(`¡${p.name} fue enviado a la Caja PC!`, '📦')
    autoFillPvpTeam()
    autoFillWarTeam()
    scheduleSave()
    return true
  }

  return { registerPokedex, chooseStarter, addPokemon, removePokemon, reorderTeam, reorderMoves, sendToBox }
}
