import { describe, it, expect } from 'vitest'
import {
  POKEMON_SORT_OPTIONS,
  isSortOptionActive
} from '../../../src/logic/constants/pokemonSortConstants.ts'
import { filterAndSortPokemon } from '../../../src/logic/pokemon/pokemonSelectionFilter.ts'
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts'

describe('PokemonSortBar & Pokemon Sort Constants', () => {
  it('should enforce that all sort options have exactly 3 characters in shortLabel', () => {
    for (const opt of POKEMON_SORT_OPTIONS) {
      expect(opt.shortLabel.length, `Option ${opt.id} shortLabel "${opt.shortLabel}" must be exactly 3 characters`).toBe(3)
    }
  })

  it('should enforce that all sort options have an emoji icon and descriptions', () => {
    for (const opt of POKEMON_SORT_OPTIONS) {
      expect(opt.icon.trim().length, `Option ${opt.id} must have a non-empty icon`).toBeGreaterThan(0)
      expect(opt.label.trim().length, `Option ${opt.id} must have a non-empty label`).toBeGreaterThan(0)
      expect(opt.desc.trim().length, `Option ${opt.id} must have a non-empty description`).toBeGreaterThan(0)
    }
  })

  it('should correctly match active sort keys and aliases with isSortOptionActive', () => {
    const totOpt = POKEMON_SORT_OPTIONS.find((o) => o.id === 'tot')!
    expect(isSortOptionActive(totOpt, 'tot')).toBe(true)
    expect(isSortOptionActive(totOpt, 'TOT')).toBe(true)
    expect(isSortOptionActive(totOpt, 'bst')).toBe(true)
    expect(isSortOptionActive(totOpt, 'level')).toBe(false)

    const ivsOpt = POKEMON_SORT_OPTIONS.find((o) => o.id === 'ivs')!
    expect(isSortOptionActive(ivsOpt, 'ivs')).toBe(true)
    expect(isSortOptionActive(ivsOpt, 'tier')).toBe(true)
    expect(isSortOptionActive(ivsOpt, 'recent')).toBe(false)

    const dexOpt = POKEMON_SORT_OPTIONS.find((o) => o.id === 'pokedex')!
    expect(isSortOptionActive(dexOpt, 'pokedex')).toBe(true)
    expect(isSortOptionActive(dexOpt, 'pdex')).toBe(true)

    const criOpt = POKEMON_SORT_OPTIONS.find((o) => o.id === 'hatched')!
    expect(isSortOptionActive(criOpt, 'hatched')).toBe(true)
    expect(isSortOptionActive(criOpt, 'egg')).toBe(true)
  })

  it('should sort Pokemon correctly using standard and alias keys in filterAndSortPokemon', () => {
    const mockP1: Pokemon = {
      uid: 'p1',
      id: 'bulbasaur',
      species: 'bulbasaur',
      name: 'Bulbasaur',
      level: 15,
      exp: 0,
      expNeeded: 100,
      hp: 45,
      maxHp: 45,
      atk: 45,
      def: 45,
      spa: 45,
      spd: 45,
      spe: 45,
      type: 'grass',
      type2: 'poison',
      status: '',
      isShiny: false,
      nature: 'hardy',
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: [],
      friendship: 70,
      obtainedMethod: 'wild',
      obtainedAt: 100
    }

    const mockP2: Pokemon = {
      uid: 'p2',
      id: 'pikachu',
      species: 'pikachu',
      name: 'Pikachu',
      level: 25,
      exp: 0,
      expNeeded: 100,
      hp: 35,
      maxHp: 35,
      atk: 35,
      def: 35,
      spa: 35,
      spd: 35,
      spe: 35,
      type: 'electric',
      status: '',
      isShiny: false,
      nature: 'hardy',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: [],
      friendship: 150,
      obtainedMethod: 'egg',
      obtainedAt: 200
    }

    const sourceList = [
      { pokemon: mockP1, _source: 'box' as const, index: 0 },
      { pokemon: mockP2, _source: 'box' as const, index: 1 }
    ]

    // Level desc
    const sortedByLevel = filterAndSortPokemon(sourceList, {
      searchQuery: '',
      sortBy: 'level',
      sortOrder: 'desc',
      activeTags: []
    })
    expect(sortedByLevel[0]!.pokemon.uid).toBe('p2')

    // IVs desc (using 'ivs')
    const sortedByIvs = filterAndSortPokemon(sourceList, {
      searchQuery: '',
      sortBy: 'ivs',
      sortOrder: 'desc',
      activeTags: []
    })
    expect(sortedByIvs[0]!.pokemon.uid).toBe('p2')

    // Total power desc (using 'tot' alias)
    const sortedByTot = filterAndSortPokemon(sourceList, {
      searchQuery: '',
      sortBy: 'tot',
      sortOrder: 'desc',
      activeTags: []
    })
    expect(sortedByTot[0]!.pokemon.uid).toBe('p2')

    // Hatched desc (using 'hatched')
    const sortedByHatched = filterAndSortPokemon(sourceList, {
      searchQuery: '',
      sortBy: 'hatched',
      sortOrder: 'desc',
      activeTags: []
    })
    expect(sortedByHatched[0]!.pokemon.uid).toBe('p2')

    // Pokedex asc (Bulbasaur #1 vs Pikachu #25)
    const sortedByPokedex = filterAndSortPokemon(sourceList, {
      searchQuery: '',
      sortBy: 'pokedex',
      sortOrder: 'asc',
      activeTags: []
    })
    expect(sortedByPokedex[0]!.pokemon.uid).toBe('p1')
  })
})
