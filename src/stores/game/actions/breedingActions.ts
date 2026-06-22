import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useUIStore } from '@/stores/ui'
import type { GameState } from '@/types/system/game'
import type { Pokemon, PokemonEgg } from '@/types/pokemon/pokemon'

export function useBreedingActions(
  state: GameState, 
  scheduleSave: () => Promise<void>, 
  addPokemon: (pokemon: Pokemon, options?: { notify: boolean }) => { success: boolean, target: 'team' | 'box' | null }
) {
  async function executeHatch(egg: PokemonEgg) {
    const { recalcPokemonStats } = await import('@/logic/pokemon/pokemonFactory')
    const { getEggSpecies } = await import('@/logic/breeding/breedingEngine')
    
    const rawSpeciesId = egg.pokemonId || egg.id
    const speciesId = getEggSpecies(rawSpeciesId)
    const p = makePokemon(speciesId, 1, {
      isShiny: egg.isShiny,
      isGuardian: egg.isGuardian,
      nature: egg.nature,
      abilitySlot: egg.abilitySlot,
      gender: egg.gender,
      obtainedMethod: 'egg',
      isNpcEgg: egg.isNpc
    })

    if (!p) throw new Error(`Failed to create pokemon from egg ${speciesId}`)

    if (egg.isAncestral) {
      p.isAncestral = true
      p.maxVigor = 0
      p.vigor = 0
    }

    if (egg.ivs) {
      p.ivs = { ...p.ivs, ...egg.ivs }
    }
    
    if (egg.movesAtBirth && egg.movesAtBirth.length > 0) {
      p.moves = egg.movesAtBirth.map(mName => {
        let mId = mName
        let mData = pokemonDataProvider.getMoveData(mName)
        if (!mData) {
          mId = pokemonDataProvider.getMoveIdBySpanishName(mName)
          mData = pokemonDataProvider.getMoveData(mId)
        }
        return { 
          id: mId, 
          name: mData.name, 
          pp: mData.pp, 
          maxPP: mData.pp 
        }
      })
    }
    
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

  return { executeHatch }
}
