import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { GameState } from '@/types/system/game'
import type { Pokemon, PokemonEgg, PokemonStorageLocation } from '@/types/pokemon/pokemon'
import { CRIADOR_VIGOR_RESTORE_CHANCE } from '@/logic/constants/gameplay'
import { gameBus } from '@/logic/events/gameBus.ts'

export function useBreedingActions(
  state: GameState, 
  scheduleSave: () => Promise<void>, 
  addPokemon: (pokemon: Pokemon, options?: { notify: boolean }) => { success: boolean, target: PokemonStorageLocation | null }
) {
  async function executeHatch(egg: PokemonEgg) {
    const { recalcPokemonStats } = await import('@/logic/pokemon/pokemonFactory')
    const { getEggSpecies } = await import('@/logic/breeding/breedingEngine')
    
    const rawSpeciesId = egg.pokemonId || egg.id
    const speciesId = getEggSpecies(rawSpeciesId)
    const isDebugMode = typeof window !== 'undefined' && Boolean(window.__VITE_DEBUG__ || window.location?.search?.includes('debug'))
    const p = makePokemon(speciesId, 1, {
      isShiny: egg.isShiny,
      isGuardian: egg.isGuardian,
      nature: egg.nature,
      abilitySlot: egg.abilitySlot,
      gender: egg.gender,
      obtainedMethod: 'egg',
      isNpcEgg: egg.isNpc,
      bypassWhitelist: isDebugMode
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
      p.moves = egg.movesAtBirth.map(mId => {
        const mData = pokemonDataProvider.getMoveData(mId)
        return { 
          id: mId, 
          name: mData.name, 
          pp: mData.pp, 
          maxPP: mData.pp 
        }
      })
    }
    
    recalcPokemonStats(p, isDebugMode)
    p.hp = p.maxHp

    state.eggs = state.eggs.filter(e => e.uid !== egg.uid)
    addPokemon(p, { notify: false })

    // Criador: Eclosión Vigor (15% chance to restore vigor to a daycare parent)
    if (state.playerClass === 'criador' && Math.random() < CRIADOR_VIGOR_RESTORE_CHANCE) {
      gameBus.emit('CRIADOR_ECLOSION_VIGOR')
    }

    await scheduleSave()
    return p
  }

  return { executeHatch }
}
