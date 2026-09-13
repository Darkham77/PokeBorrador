import { describe, it, expect } from 'vitest'
import { HeuristicAI } from '@/logic/battle/ai/heuristicAI'
import { cleanCapturedPokemonForStorage } from '@/logic/battle/battleCatchProcessor'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

describe('Wild Ditto Canonical Behavior & Storage Cleansing (Tier 1 RED Reproduction)', () => {
  it('forces wild Ditto to choose "transform" on Turn 1 regardless of heuristics', () => {
    const ai = new HeuristicAI()
    const wildDitto = makePokemon('ditto', 51, { bypassWhitelist: true }) as Pokemon
    // Add a high-damage move to ensure heuristic damage/power calculation does NOT choose it over transform
    wildDitto.moves.push({
      id: 'hyperbeam',
      name: 'Híper Rayo',
      type: 'normal',
      cat: 'special',
      power: 150,
      acc: 90,
      pp: 5,
      maxPP: 5
    } as Move)

    const playerMon = makePokemon('pikachu', 50, { bypassWhitelist: true }) as Pokemon

    // Test multiple iterations to ensure random roll / error rate does not bypass transform
    for (let i = 0; i < 20; i++) {
      const chosenMove = ai.decideMove(
        wildDitto,
        playerMon,
        { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 },
        true // isWild = true
      )

      expect(chosenMove).not.toBeNull()
      expect(chosenMove?.id).toBe('transform')
    }
  })

  it('restores captured transformed Ditto to "ditto" with "transform" move and passes validation', () => {
    const transformedDitto = makePokemon('ditto', 51, { bypassWhitelist: true }) as Pokemon
    
    // Simulate Ditto being transformed during battle into a Pokémon with copied moves (e.g., Swift)
    transformedDitto.isTransformed = true
    transformedDitto.moves = [
      {
        id: 'swift',
        name: 'Rapidez',
        type: 'normal',
        cat: 'special',
        power: 60,
        acc: 100,
        pp: 5,
        maxPP: 5
      } as Move
    ]

    // cleanCapturedPokemonForStorage MUST clean transformed Ditto without throwing:
    // [pokemonFactory] Movimiento ilegal "swift" para especie ditto
    const cleaned = cleanCapturedPokemonForStorage(transformedDitto, null, 'pokeball')

    expect(cleaned.id).toBe('ditto')
    expect(cleaned.isTransformed).toBe(false)
    expect(cleaned.moves.length).toBeGreaterThan(0)
    expect(cleaned.moves[0]?.id).toBe('transform')
    expect(cleaned.moves.some(m => m?.id === 'swift')).toBe(false)
  })
})
