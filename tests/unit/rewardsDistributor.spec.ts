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
  BATTLE_STATES: { REWARDS_PHASE: string };
  BATTLE_SUBSTATES: { DISTRIBUTE_XP: string };
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
    };
  };
  fsm: { transition: ReturnType<typeof vi.fn> };
  gs: {
    state: {
      stats: Record<string, unknown>;
      defeatedGyms: string[];
      gymProgress: Record<string, unknown>;
      money: number;
      team: Record<string, unknown>[];
    };
    save: ReturnType<typeof vi.fn>;
    addTrainerExp: ReturnType<typeof vi.fn>;
  };
  warStore: { addPoints: ReturnType<typeof vi.fn> };
  eventStore: { globalMultipliers: { exp: number; money: number; bc: number } };
  classStore: { getModifier: ReturnType<typeof vi.fn> };
  addLog: ReturnType<typeof vi.fn>;
}

describe('rewardsDistributor - calculateBattleRewards', () => {
  let mockCtx: MockContext

  beforeEach(() => {
    mockCtx = {
      BATTLE_STATES: {
        REWARDS_PHASE: 'REWARDS_PHASE'
      },
      BATTLE_SUBSTATES: {
        DISTRIBUTE_XP: 'DISTRIBUTE_XP'
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
          gymProgress: {},
          money: 100,
          team: [{ uid: 'p1', level: 10, exp: 0, expNeeded: 100, name: 'Pikachu' }]
        },
        save: vi.fn().mockResolvedValue(true),
        addTrainerExp: vi.fn()
      },
      warStore: {
        addPoints: vi.fn().mockResolvedValue(true)
      },
      eventStore: {
        globalMultipliers: { exp: 1, money: 1, bc: 1 }
      },
      classStore: {
        getModifier: vi.fn().mockReturnValue(1)
      },
      addLog: vi.fn()
    }
    vi.clearAllMocks()
  })

  it('should transition FSM to DISTRIBUTE_XP and distribute rewards', async () => {
    await calculateBattleRewards(mockCtx as unknown as BattleContext)
    
    expect(mockCtx.fsm.transition).toHaveBeenCalled()
    expect(mockCtx.gs.state.money).toBe(300) // 100 base + 200 gained
    expect(mockCtx.addLog).toHaveBeenCalledWith('¡Ganaste ₽200 en total!', 'log-info', 'player')
  })
})
