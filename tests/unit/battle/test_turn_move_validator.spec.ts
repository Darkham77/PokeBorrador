import { describe, it, expect } from 'vitest'
import {
  resolvePlayerForcedMoveIndex,
  evaluateMoveValidityAndLock
} from '@/logic/battle/helpers/turnMoveValidator'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { BattleContext } from '@/types/battle/battleContext'

describe('turnMoveValidator', () => {
  it('resolves locked move from volatileCounters', () => {
    const tackleMove: Move = { id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, power: 40, acc: 100, type: 'normal', cat: 'physical' }
    const emberMove: Move = { id: 'ember', name: 'Ascuas', pp: 25, maxPP: 25, power: 40, acc: 100, type: 'fire', cat: 'special' }

    const dummyPokemon = {
      moves: [tackleMove, emberMove],
      lastMove: emberMove,
      volatileCounters: { lockedmove: 2 },
    } as unknown as Pokemon

    const result = resolvePlayerForcedMoveIndex(dummyPokemon, 0)
    expect(result.finalMoveIndex).toBe(1)
    expect(result.isRecharge).toBe(false)
  })

  it('validates PP and returns false if PP is 0', () => {
    const emptyMove: Move = { id: 'tackle', name: 'Placaje', pp: 0, maxPP: 35, power: 40, acc: 100, type: 'normal', cat: 'physical' }
    const dummyPokemon = {
      moves: [emptyMove, { id: 'scratch', name: 'Arañazo', pp: 10 }],
      volatileCounters: {},
    } as unknown as Pokemon

    let logged = false
    const mockStore = {
      addLog: () => { logged = true },
    } as unknown as BattleContext

    const validity = evaluateMoveValidityAndLock(dummyPokemon, 0, false, mockStore)
    expect(validity.isValid).toBe(false)
    expect(logged).toBe(true)
  })

  it('allows Struggle if moveIndex is -1', () => {
    const dummyPokemon = {
      moves: [],
      volatileCounters: {},
    } as unknown as Pokemon

    const mockStore = {
      addLog: () => {},
    } as unknown as BattleContext

    const validity = evaluateMoveValidityAndLock(dummyPokemon, -1, false, mockStore)
    expect(validity.isValid).toBe(true)
    expect(validity.isStruggle).toBe(true)
  })
})
