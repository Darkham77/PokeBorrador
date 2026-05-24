import { makePokemon } from '@/logic/pokemonFactory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useUIStore } from '@/stores/ui'
import { useEventStore } from '@/stores/events'
import type { GameState } from '@/types/game'
import type { Pokemon, PokemonEgg } from '@/types/pokemon'

export function useBreedingActions(
  state: GameState, 
  scheduleSave: () => Promise<void>, 
  addPokemon: (pokemon: Pokemon, options?: { notify: boolean }) => { success: boolean, target: 'team' | 'box' | null }
) {
  function hatchEggs() {
    if (!state.eggs || state.eggs.length === 0) return false
    let anyReady = false
    const eventStore = useEventStore()
    const evHatchMult = (eventStore.globalMultipliers?.hatch || 1) - 1
    const hatchMult = 1 + evHatchMult
    
    state.eggs.forEach((egg: PokemonEgg) => {
      if (!egg.ready && typeof egg.steps === 'number' && egg.steps > 0) {
        egg.steps -= hatchMult
        if (egg.steps <= 0) {
          egg.steps = 0
          egg.ready = true
          anyReady = true
          useUIStore().notify('¡Un Huevo Pokémon está listo para eclosionar!', '🥚')
        }
      }
    })
    return anyReady
  }

  async function executeHatch(egg: PokemonEgg) {
    const { recalcPokemonStats } = await import('@/logic/pokemonFactory')
    
    const speciesId = egg.pokemonId || egg.id
    const p = makePokemon(speciesId, 1, {
      isShiny: egg.isShiny,
      isGuardian: egg.isGuardian,
      nature: egg.nature,
      abilitySlot: egg.abilitySlot,
      gender: egg.gender
    })

    if (!p) throw new Error(`Failed to create pokemon from egg ${speciesId}`)

    if (egg.ivs) {
      p.ivs = { ...p.ivs, ...egg.ivs }
    }
    
    if (egg.movesAtBirth) {
      p.moves = egg.movesAtBirth.map(mName => {
        const mData = pokemonDataProvider.getMoveData(mName)
        return { name: mName, pp: mData?.pp || 35, maxPP: mData?.pp || 35 }
      })
    }
    
    p.obtainedMethod = 'egg'
    recalcPokemonStats(p)
    p.hp = p.maxHp

    state.eggs = state.eggs.filter(e => e.uid !== egg.uid)
    addPokemon(p, { notify: false })

    await scheduleSave()
    return p
  }

  return { hatchEggs, executeHatch }
}
