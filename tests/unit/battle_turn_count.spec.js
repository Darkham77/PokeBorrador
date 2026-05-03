/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'

// Mock dependencies
vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn(),
  ASSET_TYPES: { ITEM: 'item' }
}))

describe('Battle Store - Turn Count Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const gs = useGameStore()
    gs.state.trainerName = 'Tester'
    gs.state.team = [{ id: 'pikachu', uid: 'p1', hp: 100, maxHp: 100, status: null, moves: [] }]
  })

  it('should initialize turnCount at 1', async () => {
    const battle = useBattleStore()
    await battle._startBattle({ id: 'rattata', hp: 50, maxHp: 50, catchRate: 100 }, { locationId: 'test' })
    expect(battle.state.turnCount).toBe(1)
  })

  it('should increment turnCount after applyEndTurnEffects', async () => {
    const battle = useBattleStore()
    await battle._startBattle({ id: 'rattata', hp: 50, maxHp: 50 }, { locationId: 'test' })
    
    expect(battle.state.turnCount).toBe(1)
    
    // Simular el fin de un turno
    await battle.applyEndTurnEffects()
    
    expect(battle.state.turnCount).toBe(2)
    
    await battle.applyEndTurnEffects()
    expect(battle.state.turnCount).toBe(3)
  })

  it('should not increment turnCount if the battle is over', async () => {
    const battle = useBattleStore()
    await battle._startBattle({ id: 'rattata', hp: 50, maxHp: 50 }, { locationId: 'test' })
    
    battle.state.over = true
    await battle.applyEndTurnEffects()
    
    expect(battle.state.turnCount).toBe(1)
  })
})
