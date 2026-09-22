import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateBattleRewards } from '@/logic/battle/rewardsDistributor'
import { handleNpcBabyEggReward } from '@/logic/battle/rewards/npcEggRewardsHandler'
import { NPC_BABY_POKEMON_POOL, NPC_EGG_TINT } from '@/logic/constants/gameplay'
import { useBreedingActions } from '@/stores/game/actions/breedingActions'
import { incrementRecordKey } from '@/logic/utils/mapUtils'
import type { BattleContext } from '@/types/battle/battleContext'
import type { GameState } from '@/types/system/game'
import type { PokemonEgg } from '@/types/pokemon/pokemon'

vi.mock('@/logic/utils/gsapHelpers', () => ({
  gsapSleep: vi.fn().mockResolvedValue(true)
}))

vi.mock('@/logic/battle/battleRewards.ts', () => ({
  calculateBaseExp: vi.fn().mockReturnValue(100),
  processExpGain: vi.fn().mockReturnValue({ gained: 50, levelUp: false, levelsGained: 0 }),
  processEvGain: vi.fn().mockReturnValue(null),
  calculateMoneyGain: vi.fn().mockReturnValue(200)
}))

vi.mock('@/logic/war/bonusEngine', () => ({
  getBattleRewardModifiers: vi.fn().mockReturnValue({ expMult: 1, moneyMult: 1 })
}))

interface MockRewardsContext {
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
  inventoryStore: { addItem: ReturnType<typeof vi.fn> };
  addLog: ReturnType<typeof vi.fn>;
  uiStore: { notify: ReturnType<typeof vi.fn> };
}

describe('Battle Rewards Distribution Suite', () => {
  describe('calculateBattleRewards Engine', () => {
    let mockCtx: MockRewardsContext

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
            enemy: { id: 'rattata', level: 10, isGuardian: false, uid: 'e1', ability: 'runaway', nature: 'hardy', gender: 'M', vigor: 100, maxVigor: 100, hp: 5, maxHp: 50, moves: [{ id: 'tackle', name: 'Tackle' }] },
            player: { id: 'pikachu', level: 10, uid: 'p1', ability: 'static', nature: 'hardy', gender: 'M', vigor: 100, maxVigor: 100, hp: 10, maxHp: 100, moves: [{ id: 'thunderbolt', name: 'Thunderbolt' }] },
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
            team: [{ id: 'pikachu', uid: 'p1', level: 10, exp: 0, expNeeded: 100, name: 'Pikachu', ability: 'static', nature: 'hardy', gender: 'M', vigor: 100, maxVigor: 100, hp: 10, maxHp: 100, moves: [{ id: 'thunderbolt', name: 'Thunderbolt' }], ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }],
            inventory: {}
          },
          save: vi.fn().mockResolvedValue(true),
          addTrainerExp: vi.fn()
        },
        inventoryStore: {
          addItem: vi.fn((id: string, qty: number = 1) => {
            incrementRecordKey(mockCtx.gs.state.inventory, id, qty)
          })
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
      mockCtx.activeBattle.value.rewardTM = 'tm39'

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
      mockCtx.activeBattle.value.rewardTM = 'tm39'
      mockCtx.gs.state.defeatedGyms = ['pewter']
      mockCtx.gs.state.gymProgress = { pewter: { easy: true, normal: false, hard: false, attempts: 1 } }
      mockCtx.gs.state.inventory['tm39'] = 1

      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)

      await calculateBattleRewards(mockCtx as unknown as BattleContext)

      expect(mockCtx.gs.state.inventory['tm39']).toBe(1)

      randomSpy.mockReturnValue(0.01)

      await calculateBattleRewards(mockCtx as unknown as BattleContext)

      expect(mockCtx.gs.state.inventory['tm39']).toBe(2)
      randomSpy.mockRestore()
    })
  })

  describe('NPC Baby Egg Rewards Logic', () => {
    let mockCtx: any
    let mockState: GameState

    beforeEach(() => {
      mockState = {
        eggs: [] as PokemonEgg[],
        team: [],
        box: [],
        money: 1000,
        inventory: {},
        playerClass: 'entrenador'
      } as unknown as GameState

      mockCtx = {
        activeBattle: {
          value: {
            isTrainer: true,
            isRival: false,
            isGym: false,
            isPvP: false
          }
        },
        gs: {
          state: mockState
        },
        uiStore: {
          notify: vi.fn()
        },
        eventStore: {
          globalMultipliers: { shiny: 1 }
        },
        addLog: vi.fn()
      }
    })

    it('should not award an egg in wild encounters (isTrainer: false)', () => {
      mockCtx.activeBattle.value.isTrainer = false
      mockCtx.activeBattle.value.isGym = false

      const awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value)
      expect(awarded).toBe(false)
      expect(mockState.eggs.length).toBe(0)
      expect(mockCtx.addLog).not.toHaveBeenCalled()
    })

    it('should not award an egg in Gym battles (isGym: true)', () => {
      mockCtx.activeBattle.value.isTrainer = true
      mockCtx.activeBattle.value.isGym = true

      vi.spyOn(Math, 'random').mockReturnValue(0.001)

      const awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value)
      expect(awarded).toBe(false)
      expect(mockState.eggs.length).toBe(0)
      expect(mockCtx.addLog).not.toHaveBeenCalled()

      vi.restoreAllMocks()
    })

    it('should not award an egg in PvP encounters (isPvP: true)', () => {
      mockCtx.activeBattle.value.isTrainer = true
      mockCtx.activeBattle.value.isPvP = true

      vi.spyOn(Math, 'random').mockReturnValue(0.001)

      const awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value)
      expect(awarded).toBe(false)
      expect(mockState.eggs.length).toBe(0)
      expect(mockCtx.addLog).not.toHaveBeenCalled()

      vi.restoreAllMocks()
    })

    it('should respect 2% drop rate for normal NPC trainers', () => {
      mockCtx.activeBattle.value.isTrainer = true
      mockCtx.activeBattle.value.isRival = false

      vi.spyOn(Math, 'random').mockReturnValue(0.021)
      let awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value)
      expect(awarded).toBe(false)
      expect(mockState.eggs.length).toBe(0)

      vi.spyOn(Math, 'random').mockReturnValue(0.015)
      awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value)
      expect(awarded).toBe(true)
      expect(mockState.eggs.length).toBe(1)

      const egg = mockState.eggs[0]
      expect(egg).toBeDefined()
      if (!egg) throw new Error('Expected egg to be defined')

      expect(egg.isNpc).toBe(true)
      expect(egg.tint).toBe(NPC_EGG_TINT)
      expect(NPC_BABY_POKEMON_POOL).toContain(egg.id)
      expect(mockCtx.addLog).toHaveBeenCalledWith(
        '¡El Entrenador te ha regalado un misterioso Huevo Pokémon!',
        'log-catch',
        'npc_egg'
      )
      expect(mockCtx.uiStore.notify).toHaveBeenCalledWith(
        '¡Recibiste un Huevo Pokémon (NPC)! 🥚',
        '🥚'
      )

      vi.restoreAllMocks()
    })

    it('should respect 5% drop rate for Rivals (isRival: true)', () => {
      mockCtx.activeBattle.value.isTrainer = true
      mockCtx.activeBattle.value.isRival = true

      vi.spyOn(Math, 'random').mockReturnValue(0.051)
      let awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value)
      expect(awarded).toBe(false)
      expect(mockState.eggs.length).toBe(0)

      vi.spyOn(Math, 'random').mockReturnValue(0.045)
      awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value)
      expect(awarded).toBe(true)
      expect(mockState.eggs.length).toBe(1)

      const egg = mockState.eggs[0]
      expect(egg).toBeDefined()
      if (!egg) throw new Error('Expected egg to be defined')

      expect(egg.isNpc).toBe(true)
      expect(egg.tint).toBe(NPC_EGG_TINT)
      expect(NPC_BABY_POKEMON_POOL).toContain(egg.id)
      expect(mockCtx.addLog).toHaveBeenCalledWith(
        '¡El Rival te ha regalado un misterioso Huevo Pokémon!',
        'log-catch',
        'npc_egg'
      )
      expect(mockCtx.uiStore.notify).toHaveBeenCalledWith(
        '¡Recibiste un Huevo Pokémon (Rival)! 🥚',
        '🥚'
      )

      vi.restoreAllMocks()
    })

    it('should hatch an NPC baby egg with full wild vigor (3 to 6)', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value)
      vi.restoreAllMocks()

      const egg = mockState.eggs[0]
      expect(egg).toBeDefined()
      if (!egg) throw new Error('Expected egg to be defined')
      expect(egg.isNpc).toBe(true)

      const scheduleSave = vi.fn().mockResolvedValue(undefined)
      const addPokemon = vi.fn((p) => {
        mockState.team.push(p)
        return { success: true, target: 'team' as const }
      })

      const { executeHatch } = useBreedingActions(mockState, scheduleSave, addPokemon)
      const hatched = await executeHatch(egg)

      expect(hatched).toBeDefined()
      expect(hatched.maxVigor).toBeGreaterThanOrEqual(3)
      expect(hatched.maxVigor).toBeLessThanOrEqual(6)
      expect(hatched.vigor).toBe(hatched.maxVigor)
    })

    it('should not award an egg if already carrying the maximum allowed NPC eggs (1)', () => {
      mockState.eggs = [
        {
          uid: 'npc-egg-1',
          id: 'pichu',
          steps: 100,
          ready: false,
          isNpc: true
        }
      ]

      vi.spyOn(Math, 'random').mockReturnValue(0.001)

      const awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value)
      expect(awarded).toBe(false)
      expect(mockState.eggs.length).toBe(1)
      expect(mockCtx.addLog).not.toHaveBeenCalled()

      vi.restoreAllMocks()
    })

    it('should not award an egg if all 7 incubator slots are filled', () => {
      mockState.eggs = Array.from({ length: 7 }, (_, i) => ({
        uid: `egg-${i}`,
        id: 'caterpie',
        steps: 100,
        ready: false
      }))

      vi.spyOn(Math, 'random').mockReturnValue(0.001)

      const awarded = handleNpcBabyEggReward(mockCtx as unknown as BattleContext, mockCtx.activeBattle.value)
      expect(awarded).toBe(false)
      expect(mockState.eggs.length).toBe(7)
      expect(mockCtx.addLog).not.toHaveBeenCalled()

      vi.restoreAllMocks()
    })
  })
})
