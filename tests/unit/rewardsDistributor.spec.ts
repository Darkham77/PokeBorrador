import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateBattleRewards } from '@/logic/battle/rewardsDistributor'
import type { BattleContext } from '@/types/battleContext'

vi.mock('@/logic/utils/gsapHelpers', () => ({
  gsapSleep: vi.fn().mockResolvedValue(true)
}))

vi.mock('@/logic/battle/battleRewards.ts', () => ({
  calculateBaseExp: vi.fn().mockReturnValue(100),
  processExpGain: vi.fn().mockReturnValue({ gained: 50, levelUp: false, levelsGained: 0 }),
  calculateMoneyGain: vi.fn().mockReturnValue(200)
}))

vi.mock('@/logic/war/bonusEngine', () => ({
  getBattleRewardModifiers: vi.fn().mockReturnValue({ expMult: 1, moneyMult: 1 })
}))

interface MockContext {
  BATTLE_STATES: { REWARDS_PHASE: string; LEVEL_UP_MODAL: string };
  BATTLE_SUBSTATES: { DISTRIBUTE_XP: string; CHECK_PENDING: string; SHOW_CHOICE: string };
  activeBattle: {
    value: {
      _rewardCombatants: Record<string, unknown>[];
      enemy: Record<string, unknown>;
      player: Record<string, unknown>;
      locationId: string;
      difficulty: string;
      isTrainer: boolean;
      isGym: boolean;
      isPvP: boolean;
      rewardsProcessed: boolean;
      participants: string[];
      gymId?: string;
      rewardTM?: string;
    };
  };
  fsm: { transition: ReturnType<typeof vi.fn> };
  gs: {
    state: {
      stats: Record<string, unknown>;
      defeatedGyms: string[];
      badges: number;
      gymProgress: Record<string, unknown>;
      money: number;
      team: Record<string, unknown>[];
      inventory: Record<string, number>;
    };
    save: ReturnType<typeof vi.fn>;
    addTrainerExp: ReturnType<typeof vi.fn>;
  };
  warStore: { addPoints: ReturnType<typeof vi.fn>; mapDominance: Record<string, unknown> };
  eventStore: { globalMultipliers: { exp: number; money: number; bc: number }; submitCompetitionEntry: ReturnType<typeof vi.fn> };
  classStore: { getModifier: ReturnType<typeof vi.fn> };
  addLog: ReturnType<typeof vi.fn>;
  uiStore: { notify: ReturnType<typeof vi.fn> };
}

describe('rewardsDistributor - calculateBattleRewards', () => {
  let mockCtx: MockContext

  beforeEach(() => {
    mockCtx = {
      BATTLE_STATES: {
        REWARDS_PHASE: 'REWARDS_PHASE',
        LEVEL_UP_MODAL: 'LEVEL_UP_MODAL'
      },
      BATTLE_SUBSTATES: {
        DISTRIBUTE_XP: 'DISTRIBUTE_XP',
        CHECK_PENDING: 'CHECK_PENDING',
        SHOW_CHOICE: 'SHOW_CHOICE'
      },
      activeBattle: {
        value: {
          _rewardCombatants: [],
          enemy: { id: 'rattata', level: 10, isGuardian: false, uid: 'e1' },
          player: { id: 'pikachu', level: 10, uid: 'p1' },
          locationId: 'route1',
          difficulty: 'easy',
          isTrainer: false,
          isGym: false,
          isPvP: false,
          rewardsProcessed: false,
          participants: ['p1']
        }
      },
      fsm: {
        transition: vi.fn().mockResolvedValue(true)
      },
      gs: {
        state: {
          stats: {},
          defeatedGyms: [],
          badges: 0,
          gymProgress: {},
          money: 100,
          team: [{ uid: 'p1', level: 10, exp: 0, expNeeded: 100, name: 'Pikachu' }],
          inventory: {}
        },
        save: vi.fn().mockResolvedValue(true),
        addTrainerExp: vi.fn()
      },
      warStore: {
        addPoints: vi.fn().mockResolvedValue(true),
        mapDominance: {}
      },
      eventStore: {
        globalMultipliers: { exp: 1, money: 1, bc: 1 },
        submitCompetitionEntry: vi.fn().mockResolvedValue(true)
      },
      classStore: {
        getModifier: vi.fn().mockReturnValue(1)
      },
      addLog: vi.fn(),
      uiStore: {
        notify: vi.fn()
      }
    }
    vi.clearAllMocks()
  })

  it('should transition FSM to DISTRIBUTE_XP and distribute rewards', async () => {
    await calculateBattleRewards(mockCtx as unknown as BattleContext)
    
    expect(mockCtx.fsm.transition).toHaveBeenCalled()
    expect(mockCtx.gs.state.money).toBe(300) // 100 base + 200 gained
    expect(mockCtx.addLog).toHaveBeenCalledWith('¡Ganaste ₽200 en total!', 'log-info', 'player')
  })

  it('should award TM and badge on first gym victory', async () => {
    mockCtx.activeBattle.value.isGym = true
    mockCtx.activeBattle.value.gymId = 'pewter'
    mockCtx.activeBattle.value.rewardTM = 'MT39 Tumba Rocas'

    await calculateBattleRewards(mockCtx as unknown as BattleContext)

    expect(mockCtx.gs.state.defeatedGyms).toContain('pewter')
    expect(mockCtx.gs.state.badges).toBe(1)
    expect(mockCtx.gs.state.inventory['tm39']).toBe(1)
    expect(mockCtx.uiStore.notify).toHaveBeenCalledWith('¡Obtuviste MT39 Tumba Rocas!', '🎒')
    expect(mockCtx.uiStore.notify).toHaveBeenCalledWith('¡Ganaste la medalla del Gimnasio pewter!', '🏆')
  })

  it('should not award TM unconditionally on normal difficulty rematch, but test probability roll', async () => {
    mockCtx.activeBattle.value.isGym = true
    mockCtx.activeBattle.value.gymId = 'pewter'
    mockCtx.activeBattle.value.difficulty = 'normal'
    mockCtx.activeBattle.value.rewardTM = 'MT39 Tumba Rocas'
    mockCtx.gs.state.defeatedGyms = ['pewter']
    mockCtx.gs.state.gymProgress = { pewter: { easy: true, normal: false, hard: false, attempts: 1 } }
    mockCtx.gs.state.inventory['tm39'] = 1

    // Mock Math.random to return > 0.03 (no drop)
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)

    await calculateBattleRewards(mockCtx as unknown as BattleContext)

    // TM should still be 1 (not awarded)
    expect(mockCtx.gs.state.inventory['tm39']).toBe(1)

    // Mock Math.random to return < 0.03 (drop on Normal)
    randomSpy.mockReturnValue(0.01)

    await calculateBattleRewards(mockCtx as unknown as BattleContext)

    // TM should now be 2 (awarded via rematch drop chance)
    expect(mockCtx.gs.state.inventory['tm39']).toBe(2)
    randomSpy.mockRestore()
  })
})
