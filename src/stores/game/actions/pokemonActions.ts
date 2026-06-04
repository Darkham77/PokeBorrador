import { makePokemon, sanitizePokemon } from '@/logic/pokemonFactory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useUIStore } from '@/stores/ui'
import { useLoadingStore } from '@/stores/loading'
import type { GameState } from '@/types/game'
import type { Pokemon, PokemonEgg } from '@/types/pokemon'
import { SHOP_ITEMS } from '@/data/items'

export function usePokemonActions(
  state: GameState, 
  scheduleSave: () => Promise<void>, 
  autoFillPvpTeam: () => void, 
  autoFillWarTeam: () => void
) {
  function registerPokedex(id: string, caught = false) {
    if (!state.seenPokedex.includes(id)) state.seenPokedex.push(id)
    if (caught && !state.pokedex.includes(id)) state.pokedex.push(id)
  }
  
  async function chooseStarter(id: string) {
    const loadingStore = useLoadingStore()
    loadingStore.start('choose_starter', 'Preparando aventura...', 'Asignando primer compañero', true, '🎒')
    
    const uiStore = useUIStore()
    const starter = makePokemon(id, 5)
    
    if (starter) {
      addPokemon(starter, { notify: false })
      state.starterChosen = true
      uiStore.activeTab = 'map'
      
      const speciesData = pokemonDataProvider.getPokemonData(id)
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

    let target: 'team' | 'box' = 'team'
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
      state.team.splice(teamIdx, 1)
      autoFillPvpTeam()
      scheduleSave()
      return true
    }
    const boxIdx = state.box.findIndex(p => p.uid === uid)
    if (boxIdx !== -1) {
      const p = state.box[boxIdx]
      if (!p || p.onMission) return false
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

  function togglePokeTag(context: 'team' | 'box', index: number, tagId: string) {
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

  interface LegacyEgg extends PokemonEgg {
    pokemonId?: string;
  }

  function sanitizeAll() {
    state.team.forEach(p => p && sanitizePokemon(p))
    if (state.box) state.box.forEach(p => p && sanitizePokemon(p))

    // Inventory Self-Healing: convert IDs and legacy Spanish names to current official Spanish names
    if (state.inventory) {
      const healedInventory: Record<string, number> = {};
      for (const [key, qty] of Object.entries(state.inventory)) {
        let officialName = key;
        
        // Find in SHOP_ITEMS by name (case-insensitive) or id
        const item = SHOP_ITEMS.find(i => 
          i.name.toLowerCase() === key.toLowerCase() || 
          i.id.toLowerCase() === key.toLowerCase()
        );
        
        if (item) {
          officialName = item.name;
        } else {
          // Check legacy item IDs manually if not matched
          const legacyItemMap: Record<string, string> = {
            pocion: 'Poción',
            super_pocion: 'Súper Poción',
            hiper_pocion: 'Hiper Poción',
            pocion_max: 'Poción Máxima',
            piedra_fuego: 'Piedra Fuego',
            piedra_agua: 'Piedra Agua',
            piedra_trueno: 'Piedra Trueno',
            piedra_hoja: 'Piedra Hoja',
            piedra_luna: 'Piedra Lunar',
            piedra_solar: 'Piedra Solar',
            caramelo_vigor: 'Caramelo de vigor',
            repelente: 'Repelente'
          };
          const normKey = key.toLowerCase().trim();
          if (legacyItemMap[normKey]) {
            officialName = legacyItemMap[normKey];
          }
        }
        
        healedInventory[officialName] = (healedInventory[officialName] || 0) + qty;
      }
      state.inventory = healedInventory;
    }

    // Migración automática: Mover Pokémon del equipo ocupados (guardería, misión, defensa) a la caja PC
    const teamToKeep: Pokemon[] = []
    const teamToMove: Pokemon[] = []
    
    state.team.forEach(p => {
      if (!p) return
      if (p.inDaycare || p.onMission || p.onDefense) {
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
        const legacyEgg = egg as LegacyEgg;
        
        if (legacyEgg.pokemonId && legacyEgg.pokemonId !== legacyEgg.id) {
          if (!legacyEgg.uid) {
            legacyEgg.uid = `egg_${legacyEgg.id}`;
          }
          legacyEgg.id = legacyEgg.pokemonId;
        }
        
        if (!legacyEgg.uid) {
          const timestamp = Temporal.Now.instant().epochMilliseconds;
          legacyEgg.uid = `egg_${legacyEgg.id || 'unknown'}-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
        }
        
        if (legacyEgg.ready === undefined) {
          legacyEgg.ready = (legacyEgg.steps <= 0);
        }
      });
    }
  }

  return { registerPokedex, chooseStarter, addPokemon, removePokemon, reorderTeam, reorderMoves, sendToBox, togglePokeTag, sanitizeAll }
}
