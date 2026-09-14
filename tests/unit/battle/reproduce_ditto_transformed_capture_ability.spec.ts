import { describe, it, expect } from 'vitest'
import { cleanCapturedPokemonForStorage } from '@/logic/battle/battleCatchProcessor'
import { makePokemon, validatePokemon } from '@/logic/pokemon/pokemonFactory'
import { cloneReactive } from '@/logic/utils/cloneUtils'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { AbilityId } from '@/data/battle/abilities'

describe('Ditto Transformed Capture Ability Reversion (Tier 1 RED Reproduction)', () => {
  it('reproduces crash when captured transformed Ditto has ability "pressure" from combat target', () => {
    // 1. Initial pure Ditto before combat
    const pureDitto = makePokemon('ditto', 27, { bypassWhitelist: true }) as Pokemon
    expect(pureDitto.id).toBe('ditto')
    expect(['limber', 'imposter']).toContain(pureDitto.ability) // Native base ability

    // 2. Transformed Ditto in combat against a Pokémon with 'pressure' (e.g. Zapdos, Corviknight, Mewtwo)
    const transformedDitto = cloneReactive(pureDitto) as Pokemon
    transformedDitto.isTransformed = true
    transformedDitto._originalId = 'ditto'
    transformedDitto._originalName = 'Ditto'
    transformedDitto._originalAbility = pureDitto.ability
    transformedDitto.id = 'zapdos'
    transformedDitto.name = 'Zapdos'
    transformedDitto.ability = 'pressure' as AbilityId
    transformedDitto.moves = [
      {
        id: 'thunderbolt',
        name: 'Rayo',
        type: 'electric',
        cat: 'special',
        power: 90,
        acc: 100,
        pp: 5,
        maxPP: 5
      } as Move
    ]

    // 3. If _initialEnemy is null or was tainted by memory reference sharing (as happened in searchLoop.ts):
    // cleanCapturedPokemonForStorage MUST clean transformed Ditto without throwing:
    // [pokemonFactory] Habilidad inválida o ilegal (pressure) para especie ditto
    const cleanedWithoutInitial = cleanCapturedPokemonForStorage(transformedDitto, null, 'pokeball')

    expect(cleanedWithoutInitial.id).toBe('ditto')
    expect(cleanedWithoutInitial.isTransformed).toBe(false)
    expect(['limber', 'imposter']).toContain(cleanedWithoutInitial.ability)
    expect(cleanedWithoutInitial.ability).not.toBe('pressure')
    expect(() => validatePokemon(cleanedWithoutInitial)).not.toThrow()
  })

  it('restores pure snapshot when clean initialEnemy snapshot is provided even if combat entity had pressure', () => {
    const pureDitto = makePokemon('ditto', 27, { bypassWhitelist: true }) as Pokemon
    pureDitto.ability = 'limber'
    const initialEnemySnapshot = cloneReactive(pureDitto) as Pokemon

    const inCombatDitto = cloneReactive(pureDitto) as Pokemon
    inCombatDitto.isTransformed = true
    inCombatDitto.id = 'mewtwo'
    inCombatDitto.name = 'Mewtwo'
    inCombatDitto.ability = 'pressure' as AbilityId
    inCombatDitto.hp = 10 // Damaged in combat

    const cleaned = cleanCapturedPokemonForStorage(inCombatDitto, initialEnemySnapshot, 'ultraball')

    expect(cleaned.id).toBe('ditto')
    expect(cleaned.ability).toBe('limber')
    expect(cleaned.isTransformed).toBe(false)
    expect(cleaned.moves[0]?.id).toBe('transform')
    expect(() => validatePokemon(cleaned)).not.toThrow()
  })
})
