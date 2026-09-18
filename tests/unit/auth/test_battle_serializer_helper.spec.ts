import { describe, it, expect } from 'vitest'
import { serializeActiveBattle } from '@/logic/auth/battleSerializerHelper'
import type { GameState } from '@/types/system/game'
import type { BattleState } from '@/types/battle/battle'

describe('battleSerializerHelper', () => {
  it('returns null if no active battle or battle is over', () => {
    const state = { activeBattle: null } as unknown as GameState
    expect(serializeActiveBattle(state)).toBeNull()

    const stateOver = { activeBattle: { over: true } } as unknown as GameState
    expect(serializeActiveBattle(stateOver)).toBeNull()
  })

  it('serializes pvp battle state cleanly', () => {
    const pvpBattle: Partial<BattleState> = {
      isPvP: true,
      trainerName: 'RivalAsh',
      locationId: 'route1',
      over: false,
    }
    const state = { activeBattle: pvpBattle } as unknown as GameState
    const res = serializeActiveBattle(state)

    expect(res).toBeDefined()
    expect(res?.isPvP).toBe(true)
    expect(res?.trainerName).toBe('RivalAsh')
    expect(res?.turnCount).toBe(1)
  })

  it('serializes pvp battle with pvpOpponentName fallback and single enemy mon', () => {
    const pvpBattle = {
      isPvP: true,
      pvpOpponentName: 'Gary',
      enemy: { id: 'pikachu', hp: 100, maxHp: 100 },
      over: false,
    } as unknown as BattleState
    const state = { activeBattle: pvpBattle } as unknown as GameState
    const res = serializeActiveBattle(state)

    expect(res?.trainerName).toBe('Gary')
    expect(res?.enemyTeam).toHaveLength(1)
  })

  it('defaults pvp trainerName to Rival when none provided', () => {
    const pvpBattle = {
      isPvP: true,
      over: false,
    } as unknown as BattleState
    const state = { activeBattle: pvpBattle } as unknown as GameState
    const res = serializeActiveBattle(state)

    expect(res?.trainerName).toBe('Rival')
  })

  it('serializes search phase active battle cleanly', () => {
    const searchingBattle: Partial<BattleState> = {
      wasSearching: true,
      locationId: 'route1',
      over: false,
    }
    const state = { activeBattle: searchingBattle } as unknown as GameState
    const res = serializeActiveBattle(state)

    expect(res).toBeDefined()
    expect(res?.wasSearching).toBe(true)
    expect(res?.locationId).toBe('route1')
  })
})
