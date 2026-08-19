// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { filterAndSortPokemon, type PokemonFilterCriteria } from '@/logic/pokemon/pokemonSelectionFilter'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('pokemonSelectionFilter - allowedSpecies', () => {
  const baseCriteria: PokemonFilterCriteria = {
    searchQuery: '',
    sortBy: 'recent',
    sortOrder: 'desc',
    activeTags: []
  }

  const pokes = [
    { pokemon: { uid: 'u1', id: 'pikachu', species: 'pikachu', name: 'Pikachu', level: 10 } as Pokemon, _source: 'team' as const, index: 0 },
    { pokemon: { uid: 'u2', id: 'magikarp', species: 'magikarp', name: 'Magikarp', nickname: 'Chispa', level: 39 } as Pokemon, _source: 'team' as const, index: 1 },
    { pokemon: { uid: 'u3', id: 'gyarados', species: 'gyarados', name: 'Gyarados', level: 45 } as Pokemon, _source: 'box' as const, index: 0 },
    { pokemon: { uid: 'u4', id: 'pidgey', species: 'pidgey', name: 'Pidgey', level: 5 } as Pokemon, _source: 'box' as const, index: 1 }
  ]

  it('filters strictly to the allowed species', () => {
    const res = filterAndSortPokemon(pokes, {
      ...baseCriteria,
      allowedSpecies: ['magikarp']
    })

    expect(res).toHaveLength(1)
    expect(res[0]?.pokemon.id).toBe('magikarp')
  })

  it('handles multiple allowed species', () => {
    const res = filterAndSortPokemon(pokes, {
      ...baseCriteria,
      allowedSpecies: ['magikarp', 'gyarados']
    })

    expect(res).toHaveLength(2)
    const species = res.map(r => r.pokemon.id)
    expect(species).toContain('magikarp')
    expect(species).toContain('gyarados')
  })

  it('filters by single species', () => {
    const res = filterAndSortPokemon(pokes, {
      ...baseCriteria,
      allowedSpecies: ['gyarados']
    })

    expect(res).toHaveLength(1)
    expect(res[0]?.pokemon.id).toBe('gyarados')
  })

  it('returns all when allowedSpecies is null or empty', () => {
    const resNull = filterAndSortPokemon(pokes, {
      ...baseCriteria,
      allowedSpecies: null
    })
    expect(resNull).toHaveLength(4)

    const resEmpty = filterAndSortPokemon(pokes, {
      ...baseCriteria,
      allowedSpecies: []
    })
    expect(resEmpty).toHaveLength(4)
  })
})
