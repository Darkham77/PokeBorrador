import { makePokemon } from '@/logic/pokemonFactory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useUIStore } from '@/stores/ui'
import { useEventStore } from '@/stores/events'

export function useBreedingActions(state, scheduleSave, addPokemon) {
  function hatchEggs() {
    if (!state.eggs || state.eggs.length === 0) return false
    let anyReady = false
    const eventStore = useEventStore() as any
    const evHatchMult = (eventStore.globalMultipliers?.hatch || 1) - 1
    const hatchMult = 1 + evHatchMult
    
    state.eggs.forEach(egg => {
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

  async function executeHatch(egg) {
    const { recalcPokemonStats } = await import('@/logic/pokemonFactory')
    
    const p = (makePokemon as any)(egg.id, 1, {
      isShiny: egg.isShiny,
      isGuardian: egg.isGuardian,
      nature: egg.nature,
      abilitySlot: egg.abilitySlot,
      gender: egg.gender
    })

    p.ivs = { ...p.ivs, ...egg.ivs }
    if (egg.movesAtBirth) {
      (p as any).moves = egg.movesAtBirth.map(mName => {
        const mData = pokemonDataProvider.getMoveData(mName) || {}
        return { name: mName, pp: mData.pp || 35, maxPP: mData.pp || 35 }
      })
    };
    (p as any).obtainedMethod = 'egg'
    recalcPokemonStats(p);
    (p as any).hp = (p as any).maxHp

    state.eggs = state.eggs.filter(e => e.uid !== egg.uid)
    addPokemon(p, { notify: false })

    await scheduleSave()
    return p
  }

  return { hatchEggs, executeHatch }
}
