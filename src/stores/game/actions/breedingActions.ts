import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useUIStore } from '@/stores/ui'
import { useEventStore } from '@/stores/events'
import type { GameState } from '@/types/system/game'
import type { Pokemon, PokemonEgg } from '@/types/pokemon/pokemon'

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
    const { recalcPokemonStats } = await import('@/logic/pokemon/pokemonFactory')
    
    const speciesId = egg.pokemonId || egg.id
    const p = makePokemon(speciesId, 1, {
      isShiny: egg.isShiny,
      isGuardian: egg.isGuardian,
      nature: egg.nature,
      abilitySlot: egg.abilitySlot,
      gender: egg.gender
    })

    if (!p) throw new Error(`Failed to create pokemon from egg ${speciesId}`)

    if (egg.isAncestral) {
      p.isAncestral = true
    }

    if (egg.ivs) {
      p.ivs = { ...p.ivs, ...egg.ivs }
    }
    
    if (egg.movesAtBirth && egg.movesAtBirth.length > 0) {
      p.moves = egg.movesAtBirth.map(mName => {
        const mData = pokemonDataProvider.getMoveData(mName)
        const mId = mData?.id || pokemonDataProvider.resolveMoveId(mName) || mName
        return { id: mId, name: mData?.name || mName, pp: mData?.pp || 35, maxPP: mData?.pp || 35 }
      })
    }
    
    p.obtainedMethod = 'egg'
    recalcPokemonStats(p)
    p.hp = p.maxHp

    state.eggs = state.eggs.filter(e => e.uid !== egg.uid)
    addPokemon(p, { notify: false })

    // Criador: Eclosión Vigor (15% chance to restore vigor to a daycare parent)
    if (state.playerClass === 'criador' && Math.random() < 0.15) {
      try {
        const breedingStore = (await import('@/stores/breeding')).useBreedingStore()
        const healthyParents = breedingStore.slots.filter(s => s && s.pokemon)
        if (healthyParents.length > 0) {
          const chosenSlot = healthyParents[Math.floor(Math.random() * healthyParents.length)]
          if (chosenSlot && chosenSlot.pokemon) {
            const parent = chosenSlot.pokemon
            const prevVigor = parent.vigor ?? 20
            parent.vigor = Math.min(20, prevVigor + 5)
            useUIStore().notify(`¡Eclosión Vigorosa! Su progenitor ${parent.name} recuperó +5 de vigor.`, '❤️')
          }
        }
      } catch (e) {
        console.error('Failed to restore parent vigor:', e)
      }
    }

    await scheduleSave()
    return p
  }

  return { hatchEggs, executeHatch }
}
