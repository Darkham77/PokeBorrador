import { describe, it, expect } from 'vitest'
import { resolveTurnChoices } from '@/logic/battle/battleTurnChoiceHelper'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import { ref } from 'vue'

describe('battleTurnChoiceHelper - resolveTurnChoices', () => {
  it('should generate valid p1 and p2 move choices for normal turn', async () => {
    const mockPlayer = {
      uid: 'p1',
      name: 'Pikachu',
      hp: 100,
      maxHp: 100,
      moves: [{ id: 'thunderbolt', name: 'Thunderbolt', pp: 15 }],
    } as unknown as Pokemon

    const mockEnemy = {
      uid: 'p2',
      name: 'Charmander',
      hp: 100,
      maxHp: 100,
      moves: [{ id: 'flamethrower', name: 'Flamethrower', pp: 15 }],
    } as unknown as Pokemon

    const mockStore = {
      activeBattle: ref({
        player: mockPlayer,
        enemy: mockEnemy,
        playerRequest: null,
        enemyRequest: null,
      }),
      enemyStages: ref({}),
      playerStages: ref({}),
      faintFlags: ref(new Set()),
    } as unknown as BattleContext

    const move = mockPlayer.moves[0] as Move
    const eMove = mockEnemy.moves[0] as Move

    const choices = await resolveTurnChoices(
      mockStore,
      mockPlayer,
      mockEnemy,
      move,
      false,
      true,
      false,
      eMove
    )

    expect(choices.p1Choice).toBe('move thunderbolt')
    expect(choices.p2Choice).toBe('move flamethrower')
    expect(choices.p1Skip).toBe(false)
  })

  it('should fall back to struggle when no moves available', async () => {
    const mockPlayer = {
      uid: 'p1',
      name: 'Magikarp',
      hp: 50,
      maxHp: 50,
      moves: [],
    } as unknown as Pokemon

    const mockEnemy = {
      uid: 'p2',
      name: 'Caterpie',
      hp: 50,
      maxHp: 50,
      moves: [],
    } as unknown as Pokemon

    const mockStore = {
      activeBattle: ref({
        player: mockPlayer,
        enemy: mockEnemy,
      }),
      enemyStages: ref({}),
      playerStages: ref({}),
    } as unknown as BattleContext

    const choices = await resolveTurnChoices(
      mockStore,
      mockPlayer,
      mockEnemy,
      null,
      true,
      true,
      false,
      null
    )

    expect(choices.p1Choice).toBe('struggle')
    expect(choices.p2Choice).toBe('struggle')
  })
})
