// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { filterAndSortPokemon, type PokemonFilterCriteria } from '@/logic/pokemon/pokemonSelectionFilter'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'

describe('pokemonSelectionFilter - allowedSpecies', () => {
  const baseCriteria: PokemonFilterCriteria = {
    searchQuery: '',
    sortBy: 'recent',
    sortOrder: 'desc',
    activeTags: []
  }

  const createMockPoke = (species: string, uid: string, level: number, nickname?: string): Pokemon => {
    const p = makePokemon(requirePokemonSpeciesId(species), level, { bypassWhitelist: true })!;
    p.uid = uid;
    if (nickname) p.nickname = nickname;
    return p;
  };

  const pokes = [
    { pokemon: createMockPoke('pikachu', 'u1', 10), _source: 'team' as const, index: 0 },
    { pokemon: createMockPoke('magikarp', 'u2', 39, 'Chispa'), _source: 'team' as const, index: 1 },
    { pokemon: createMockPoke('gyarados', 'u3', 45), _source: 'box' as const, index: 0 },
    { pokemon: createMockPoke('pidgey', 'u4', 5), _source: 'box' as const, index: 1 }
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
