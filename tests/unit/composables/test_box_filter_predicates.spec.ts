import { describe, it, expect } from 'vitest'
import {
  matchesCoreFilters,
  matchesIvFilters,
  matchesEvFilters,
  matchesTagsFilter,
  matchesFriendshipFilters,
  matchesTotalPowerFilter,
  matchesAllBoxFilters,
  type BoxFilterStateData
} from '@/composables/pokemon/boxFilterPredicates'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('boxFilterPredicates', () => {
  const baseFilter: BoxFilterStateData = {
    search: '',
    tier: 'all',
    type: 'all',
    levelMin: 1,
    levelMax: 100,
    ivTotalMin: 0,
    ivTotalMax: 186,
    ivAny31: false,
    ivMin: 0,
    ivMax: 31,
    ivHP: 0,
    ivATK: 0,
    ivDEF: 0,
    ivSPA: 0,
    ivSPD: 0,
    ivSPE: 0,
    evHP: 0,
    evATK: 0,
    evDEF: 0,
    evSPA: 0,
    evSPD: 0,
    evSPE: 0,
    bstMin: 0,
    bstMax: 9999,
    tags: [],
    friendshipMin: 0,
    friendshipMax: 255,
    friendshipSealTier: 'all',
    friendshipEvoReady: false,
    friendshipMaxOnly: false,
  }

  const dummyPokemon: Pokemon = {
    id: 'pikachu',
    name: 'Pikachu',
    level: 50,
    type: 'electric',
    ivs: { hp: 31, atk: 20, def: 20, spa: 20, spd: 20, spe: 31 },
    evs: { hp: 100, atk: 0, def: 0, spa: 0, spd: 0, spe: 150 },
    friendship: 150,
    hp: 100,
    maxHp: 100,
    moves: [],
    tags: ['favorite'],
  } as unknown as Pokemon

  it('matches core filters (level, search, type)', () => {
    expect(matchesCoreFilters(dummyPokemon, baseFilter)).toBe(true)
    expect(matchesCoreFilters(dummyPokemon, { ...baseFilter, levelMin: 60 })).toBe(false)
    expect(matchesCoreFilters(dummyPokemon, { ...baseFilter, search: 'pika' })).toBe(true)
    expect(matchesCoreFilters(dummyPokemon, { ...baseFilter, search: 'char' })).toBe(false)
    expect(matchesCoreFilters(dummyPokemon, { ...baseFilter, type: 'electric' })).toBe(true)
    expect(matchesCoreFilters(dummyPokemon, { ...baseFilter, type: 'water' })).toBe(false)
  })

  it('matches IV filters and checks for max 31 IV', () => {
    expect(matchesIvFilters(dummyPokemon, baseFilter)).toBe(true)
    expect(matchesIvFilters(dummyPokemon, { ...baseFilter, ivAny31: true })).toBe(true)
    expect(matchesIvFilters(dummyPokemon, { ...baseFilter, ivHP: 31 })).toBe(true)
    expect(matchesIvFilters(dummyPokemon, { ...baseFilter, ivATK: 25 })).toBe(false)
  })

  it('matches EV filters', () => {
    expect(matchesEvFilters(dummyPokemon, baseFilter)).toBe(true)
    expect(matchesEvFilters(dummyPokemon, { ...baseFilter, evHP: 50 })).toBe(true)
    expect(matchesEvFilters(dummyPokemon, { ...baseFilter, evHP: 150 })).toBe(false)
  })

  it('matches tags filters', () => {
    expect(matchesTagsFilter(dummyPokemon, [])).toBe(true)
    expect(matchesTagsFilter(dummyPokemon, ['favorite'])).toBe(true)
    expect(matchesTagsFilter(dummyPokemon, ['shiny'])).toBe(false)
  })

  it('matches friendship and total power filters', () => {
    expect(matchesFriendshipFilters(dummyPokemon, baseFilter)).toBe(true)
    expect(matchesFriendshipFilters(dummyPokemon, { ...baseFilter, friendshipMin: 200 })).toBe(false)
    expect(matchesTotalPowerFilter(dummyPokemon, 0, 1000)).toBe(true)
    expect(matchesTotalPowerFilter(dummyPokemon, 1500, 2000)).toBe(false)
  })

  it('matches all box filters cleanly', () => {
    expect(matchesAllBoxFilters(dummyPokemon, baseFilter)).toBe(true)
    expect(matchesAllBoxFilters(dummyPokemon, { ...baseFilter, levelMin: 80 })).toBe(false)
  })
})
