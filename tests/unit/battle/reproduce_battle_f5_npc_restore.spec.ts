import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { BattleState } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleContext } from '@/types/battle/battleContext'

function createMockPokemon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'poke-test-uid-1',
    id: 'tentacruel',
    name: 'Tentacruel',
    hp: 0,
    maxHp: 100,
    level: 30,
    moves: [],
    type: ['water', 'poison'],
    stats: { hp: 100, atk: 70, def: 65, spa: 80, spd: 120, spe: 100 },
    status: '',
    fainted: true,
    ...overrides
  } as unknown as Pokemon
}

describe('Reproduce Bug: Battle F5 Restoration & NPC Trainer Termination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('FAILING TEST (RED): evaluateAndUseItem must NOT use Potion on a fainted Pokemon (hp <= 0)', async () => {
    const { evaluateAndUseItem } = await import('@/logic/battle/ai/heuristic/aiItemEvaluator')
    const faintedEnemy = createMockPokemon({ hp: 0, fainted: true })
    const activeBattleRef = ref<BattleState>({
      player: createMockPokemon({ uid: 'p1', id: 'gengar', name: 'Gengar', hp: 100, maxHp: 100, fainted: false }),
      enemy: faintedEnemy,
      enemyTeam: [faintedEnemy],
      enemyInventory: { potion: 2 },
      trainerName: 'Lara',
      isTrainer: true,
      over: false,
    } as unknown as BattleState)

    const ctx = {
      activeBattle: activeBattleRef,
      addLog: vi.fn(),
      animations: {
        handleHealRequest: vi.fn()
      }
    } as unknown as BattleContext

    const used = await evaluateAndUseItem(ctx, faintedEnemy)
    expect(used).toBe(false)
    expect(faintedEnemy.hp).toBe(0)
    expect(ctx.addLog).not.toHaveBeenCalledWith(expect.stringContaining('usó Poción en Tentacruel'), expect.anything(), expect.anything())
  })

  it('TEST (GREEN): handleBattleFlowCompletion("map") must clear activeBattle and persist respecting 60s rule', async () => {
    const { handleBattleFlowCompletion } = await import('@/logic/battle/searchLoop')
    const saveMock = vi.fn()
    const fsmMock = {
      transition: vi.fn().mockResolvedValue(undefined),
      currentState: ref('REWARDS_PHASE')
    }

    const ctx = {
      fsm: fsmMock,
      BATTLE_STATES: { EXIT_BATTLE: 'EXIT_BATTLE' },
      activeBattle: ref<BattleState>({
        trainerName: 'Lara',
        isTrainer: true,
        over: true
      } as unknown as BattleState),
      isProcessing: ref(false),
      clearLogs: vi.fn(),
      gs: {
        state: { activeBattle: {} as BattleState },
        save: saveMock
      }
    } as unknown as BattleContext

    await handleBattleFlowCompletion(ctx, 'map')

    expect(ctx.activeBattle.value).toBeNull()
    expect(ctx.gs.state.activeBattle).toBeNull()
    expect(saveMock).toHaveBeenCalledWith(false)
  })

  it('TEST (GREEN): syncAndPersist when battle.over = true must clear activeBattle and persist respecting 60s rule', async () => {
    const { syncAndPersist } = await import('@/logic/battle/battleStateSync')
    const saveMock = vi.fn()
    const activeBattleRef = ref<BattleState>({
      over: true,
      player: null,
      enemy: null,
      enemyTeam: []
    } as unknown as BattleState)

    const ctx = {
      activeBattle: activeBattleRef,
      gs: {
        state: { activeBattle: activeBattleRef.value, team: [] },
        save: saveMock
      }
    } as unknown as BattleContext

    syncAndPersist(ctx)
    expect(ctx.gs.state.activeBattle).toBeNull()
    expect(saveMock).toHaveBeenCalledWith(false)
  })

  it('FAILING TEST (RED): restoreBattleState must NOT restore when all enemyTeam Pokemon are fainted', async () => {
    const { restoreBattleState } = await import('@/logic/battle/orchestratorRestoreHelper')
    const fsmMock = {
      transition: vi.fn().mockResolvedValue(undefined),
      currentState: ref('INITIALIZING')
    }
    const saveMock = vi.fn()
    const deadEnemy = createMockPokemon({ hp: 0, fainted: true })

    const battleData = {
      isTrainer: true,
      trainerName: 'Lara',
      turnCount: 2,
      over: false,
      enemy: deadEnemy,
      enemyTeam: [deadEnemy],
      playerTeamIndex: 0
    }

    const ctx = {
      fsm: fsmMock,
      BATTLE_STATES: { EXIT_BATTLE: 'EXIT_BATTLE' },
      activeBattle: ref<BattleState | null>(null),
      isProcessing: ref(false),
      gs: {
        state: {
          activeBattle: battleData as unknown as BattleState,
          team: [createMockPokemon({ uid: 'p1', hp: 100, maxHp: 100, fainted: false })]
        },
        save: saveMock
      }
    } as unknown as BattleContext

    await restoreBattleState(ctx, battleData)

    expect(ctx.activeBattle.value).toBeNull()
    expect(ctx.gs.state.activeBattle).toBeNull()
    expect(fsmMock.transition).toHaveBeenCalledWith('EXIT_BATTLE')
  })

  it('TEST (GREEN): restoreBattleState must select alive Pokemon (Jolteon) when candidate at enemyTeamIndex is fainted (Tentacruel) and preserve enemyInventory', async () => {
    const { restoreBattleState } = await import('@/logic/battle/orchestratorRestoreHelper')
    const fsmMock = {
      transition: vi.fn().mockResolvedValue(undefined),
      currentState: ref('INITIALIZING')
    }
    const deadTentacruel = createMockPokemon({ uid: 't-1', id: 'tentacruel', name: 'Tentacruel', hp: 0, fainted: true })
    const aliveJolteon = createMockPokemon({ uid: 'j-2', id: 'jolteon', name: 'Jolteon', hp: 120, maxHp: 120, fainted: false })
    const playerMon = createMockPokemon({ uid: 'p-1', id: 'charizard', name: 'Charizard', hp: 150, maxHp: 150, fainted: false })

    const battleData = {
      isTrainer: true,
      trainerName: 'Lara',
      turnCount: 3,
      over: false,
      enemyTeamIndex: 0, // Points to fainted Tentacruel
      enemy: deadTentacruel,
      enemyTeam: [deadTentacruel, aliveJolteon],
      playerTeamIndex: 0,
      enemyInventory: { potion: 1, hyperpotion: 2 }
    }

    const ctx = {
      fsm: fsmMock,
      BATTLE_STATES: { ACTIVE_BATTLE: 'ACTIVE_BATTLE', EXIT_BATTLE: 'EXIT_BATTLE' },
      BATTLE_SUBSTATES: { WAIT_INPUT: 'WAIT_INPUT' },
      activeBattle: ref<BattleState | null>(null),
      playerStages: ref({}),
      enemyStages: ref({}),
      battleLogs: ref([]),
      isProcessing: ref(false),
      gs: {
        state: {
          activeBattle: battleData as unknown as BattleState,
          team: [playerMon]
        },
        save: vi.fn()
      }
    } as unknown as BattleContext

    await restoreBattleState(ctx, battleData)

    expect(ctx.activeBattle.value).not.toBeNull()
    // Must select alive Jolteon, NEVER dead Tentacruel
    expect(ctx.activeBattle.value?.enemy?.id).toBe('jolteon')
    expect(ctx.activeBattle.value?.enemy?.hp).toBe(120)
    expect(ctx.activeBattle.value?.enemyTeamIndex).toBe(1)
    // Must preserve remaining items in NPC's backpack
    expect(ctx.activeBattle.value?.enemyInventory).toEqual({ potion: 1, hyperpotion: 2 })
    expect(fsmMock.transition).toHaveBeenCalledWith('ACTIVE_BATTLE', 'WAIT_INPUT')
  })

  it('TEST (GREEN): executeEndBattle (PvP) must clear activeBattle and save respecting 60s rule', async () => {
    const { executeEndBattle } = await import('@/logic/pvp/livePvPEndBattleHandler')
    const saveMock = vi.fn()

    const mockCtx = {
      battleState: {
        active: true,
        phase: 'combat',
        isRanked: false,
        logs: ['Turn 1']
      },
      timerManager: {
        stopTurnTimer: vi.fn(),
        stopReconnectCountdown: vi.fn()
      },
      isReconnecting: ref(false),
      pvpStore: {
        recordMatchResult: vi.fn()
      },
      gameStore: {
        state: {
          activeBattle: { isPvP: true }
        },
        save: saveMock
      },
      authStore: {
        user: { user_metadata: { username: 'Player' } }
      },
      uiStore: {
        notify: vi.fn()
      },
      battleStore: {
        isBattleActive: false,
        endBattle: vi.fn()
      }
    }

    await executeEndBattle(true, 'Victoria', mockCtx as any)

    expect(mockCtx.gameStore.state.activeBattle).toBeNull()
    expect(saveMock).toHaveBeenCalledWith(false)
  })
})
