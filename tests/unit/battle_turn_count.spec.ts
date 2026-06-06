/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import type { Pokemon } from '@/types/pokemon'

// Mock dependencies
vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn(),
  ASSET_TYPES: { ITEM: 'item' }
}))

describe('Battle Store - Turn Count Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const gs = useGameStore()
    gs.state.trainer = 'Tester'
    gs.state.team = [{ id: 'pikachu', uid: 'p1', hp: 100, maxHp: 100, status: null, moves: [] } as unknown as Pokemon]
  })

  it('should initialize turnCount at 1', async () => {
    const battle = useBattleStore()
    await battle._startBattle({ id: 'rattata', hp: 50, maxHp: 50, catchRate: 100 } as unknown as Pokemon, { locationId: 'test', wasSearching: false })
    expect(battle.state!.turnCount).toBe(1)
  })

  it('should increment turnCount after applyEndTurnEffects', async () => {
    const battle = useBattleStore()
    await battle._startBattle({ id: 'rattata', hp: 50, maxHp: 50 } as unknown as Pokemon, { locationId: 'test', wasSearching: false })
    
    expect(battle.state!.turnCount).toBe(1)
    
    // Simular el fin de un turno
    await battle.applyEndTurnEffects()
    
    expect(battle.state!.turnCount).toBe(2)
    
    await battle.applyEndTurnEffects()
    expect(battle.state!.turnCount).toBe(3)
  })

  it('should not increment turnCount if the battle is over', async () => {
    const battle = useBattleStore()
    await battle._startBattle({ id: 'rattata', hp: 50, maxHp: 50 } as unknown as Pokemon, { locationId: 'test', wasSearching: false })
    
    battle.state!.over = true
    await battle.applyEndTurnEffects()
    
    expect(battle.state!.turnCount).toBe(1)
  })

  it('should execute status move without locking', async () => {
    const battle = useBattleStore()
    const pokemon = { 
      id: 'pikachu', 
      uid: 'p1', 
      hp: 50, 
      maxHp: 100, 
      atk: 50,
      def: 50,
      spa: 50,
      spd: 50,
      spe: 50,
      level: 50,
      status: null, 
      ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: [
        { id: 'recover', name: 'Recuperación', type: 'psychic', cat: 'status', pp: 10, effect: 'heal_50' }
      ] 
    } as unknown as Pokemon
    const gs = useGameStore()
    gs.state.team = [pokemon]
    
    const enemy = {
      id: 'rattata',
      hp: 50,
      maxHp: 50,
      atk: 50,
      def: 50,
      spa: 50,
      spd: 50,
      spe: 50,
      level: 50,
      status: null,
      ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: []
    } as unknown as Pokemon

    await battle._startBattle(enemy, { locationId: 'test', wasSearching: false })
    
    // Execute move index 0 (Recuperación)
    await battle.executeMove(0)
    
    expect(battle.isProcessing).toBe(false)
  })

  it('should initialize battle with wasSearching true and reach SEARCH_PHASE', async () => {
    const battle = useBattleStore()
    const enemy = {
      id: 'rattata',
      hp: 50,
      maxHp: 50,
      atk: 50,
      def: 50,
      spa: 50,
      spd: 50,
      spe: 50,
      level: 5,
      status: null,
      ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: []
    } as unknown as Pokemon

    await battle._startBattle(enemy, { locationId: 'route1', wasSearching: true })
    expect(battle.currentFsmState).toBe('SEARCH_PHASE')
  })
})

