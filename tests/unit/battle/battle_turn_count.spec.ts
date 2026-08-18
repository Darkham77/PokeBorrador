/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBattleStore } from '@/stores/battle/battle'
import { useGameStore } from '@/stores/game'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { testResetShowdownWorker } from '@/logic/battle/orchestrator'

// Mock dependencies
class DummyWorker {
  postMessage(data: unknown) {
    const msg = data as { type?: string };
    if (msg?.type === 'INIT_BATTLE') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({ data: { type: 'INIT_SUCCESS' } } as MessageEvent)
        }
      }, 0)
    } else if (msg?.type === 'EXECUTE_TURN') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              type: 'TURN_SUCCESS',
              payload: { logs: [], isOver: false, winner: null }
            }
          } as MessageEvent)
        }
      }, 0)
    } else if (msg?.type === 'CHECK_TRAPPED') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              type: 'CHECK_TRAPPED_RESPONSE',
              payload: { isTrapped: false }
            }
          } as MessageEvent)
        }
      }, 0)
    }
  }
  terminate() {}
  onmessage: ((ev: MessageEvent) => void) | null = null
}

describe('Battle Store - Turn Count Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('Worker', DummyWorker)
    const gs = useGameStore()
    gs.state.trainer = 'Tester'
    gs.state.team = [{ id: 'pikachu', uid: 'p1', hp: 100, maxHp: 100, status: null, ability: 'static', nature: 'hardy', gender: 'M', vigor: 100, maxVigor: 100, moves: [{ id: 'tackle', name: 'Tackle' }] } as unknown as Pokemon]
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should initialize turnCount at 1', async () => {
    const battle = useBattleStore()
    await battle._startBattle({ id: 'rattata', hp: 50, maxHp: 50, catchRate: 100, ability: 'runaway', nature: 'hardy', gender: 'M', vigor: 100, maxVigor: 100, moves: [{ id: 'tackle' }] } as unknown as Pokemon, { locationId: 'route1', wasSearching: false })
    expect(battle.state!.turnCount).toBe(1)
  })

  it('should increment turnCount after applyEndTurnEffects', async () => {
    testResetShowdownWorker()
    const battle = useBattleStore()
    battle.state = {
      turnCount: 1,
      over: false,
      player: { id: 'pikachu', uid: 'p1', hp: 100, maxHp: 100, ability: 'static', nature: 'hardy', gender: 'M', vigor: 100, maxVigor: 100, moves: [{ id: 'tackle' }] } as unknown as Pokemon,
      enemy: { id: 'rattata', uid: 'e1', hp: 50, maxHp: 50, ability: 'runaway', nature: 'hardy', gender: 'M', vigor: 100, maxVigor: 100, moves: [{ id: 'tackle' }] } as unknown as Pokemon,
      weather: { type: 'clear', visual: 'clear', turns: -1 }
    } as any
    battle.fsm.currentState = 'ACTIVE_BATTLE'
    
    expect(battle.state!.turnCount).toBe(1)
    
    // Simular el fin de un turno
    await battle.applyEndTurnEffects()
    
    expect(battle.state!.turnCount).toBe(2)
    
    await battle.applyEndTurnEffects()
    expect(battle.state!.turnCount).toBe(3)
  })

  it('should not increment turnCount if the battle is over', async () => {
    testResetShowdownWorker()
    const battle = useBattleStore()
    battle.state = {
      turnCount: 1,
      over: true,
      player: { id: 'pikachu', uid: 'p1', hp: 100, maxHp: 100, ability: 'static', nature: 'hardy', gender: 'M', vigor: 100, maxVigor: 100, moves: [{ id: 'tackle' }] } as unknown as Pokemon,
      enemy: { id: 'rattata', uid: 'e1', hp: 50, maxHp: 50, ability: 'runaway', nature: 'hardy', gender: 'M', vigor: 100, maxVigor: 100, moves: [{ id: 'tackle' }] } as unknown as Pokemon,
      weather: { type: 'clear', visual: 'clear', turns: -1 }
    } as any
    battle.fsm.currentState = 'ACTIVE_BATTLE'
    
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
      ability: 'static',
      nature: 'hardy',
      gender: 'M',
      vigor: 100,
      maxVigor: 100,
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
      ability: 'runaway',
      nature: 'hardy',
      gender: 'M',
      vigor: 100,
      maxVigor: 100,
      ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: [{ id: 'tackle' }]
    } as unknown as Pokemon

    await battle._startBattle(enemy, { locationId: 'route1', wasSearching: false })
    
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
      ability: 'runaway',
      nature: 'hardy',
      gender: 'M',
      vigor: 100,
      maxVigor: 100,
      ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: [{ id: 'tackle' }]
    } as unknown as Pokemon

    await battle._startBattle(enemy, { locationId: 'route1', wasSearching: true })
    expect(battle.currentFsmState).toBe('SEARCH_PHASE')
  })
})

