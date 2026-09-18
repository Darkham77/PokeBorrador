import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { restoreBattleState } from '@/logic/battle/orchestratorRestoreHelper';
import * as searchLoop from '@/logic/battle/searchLoop';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';
import { BATTLE_UI_EVENTS, type BattleFlowCompletedDetail } from '@/types/battle/battleEvents';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState, BattleStages } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

vi.mock('@/logic/battle/orchestratorWorkerInitHelper', () => ({
  initWorkerForBattle: vi.fn().mockResolvedValue(undefined)
}));

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
  } as unknown as Pokemon;
}

function createMockStages(overrides: Partial<BattleStages> = {}): BattleStages {
  return {
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
    accuracy: 0,
    evasion: 0,
    reflect: 0,
    lightScreen: 0,
    safeguard: 0,
    mist: 0,
    spikes: 0,
    ...overrides
  };
}

function createMockBattleContext(): BattleContext {
  const p1 = makePokemon('bulbasaur', 10)!;
  p1.uid = 'p1-uid-1234';

  const fsm = {
    currentState: ref('EXIT_BATTLE'),
    currentSubState: ref(null),
    transition: vi.fn().mockImplementation((state, subState = null) => {
      fsm.currentState.value = state;
      fsm.currentSubState.value = subState;
      return Promise.resolve();
    }),
    canTransitionTo: vi.fn().mockReturnValue(true),
    is: vi.fn(),
    isSub: vi.fn()
  };

  return {
    fsm,
    activeBattle: ref<BattleState | null>(null),
    playerStages: ref(createMockStages()),
    enemyStages: ref(createMockStages()),
    battleLogs: ref([]),
    isProcessing: ref(true),
    gs: {
      state: {
        team: [p1],
        map: { currentMap: 'route1' },
        activeBattle: null
      },
      save: vi.fn().mockResolvedValue(undefined)
    },
    BATTLE_STATES: {
      INITIALIZING: 'INITIALIZING',
      SEARCH_PHASE: 'SEARCH_PHASE',
      ACTIVE_BATTLE: 'ACTIVE_BATTLE',
      EXIT_BATTLE: 'EXIT_BATTLE',
      REWARDS_PHASE: 'REWARDS_PHASE'
    },
    BATTLE_SUBSTATES: {
      WAIT_INPUT: 'WAIT_INPUT',
      COMBAT_OR_FLEE: 'COMBAT_OR_FLEE',
      MINIGAME_CHECK: 'MINIGAME_CHECK'
    }
  } as unknown as BattleContext;
}

describe('Battle Orchestrator & F5 State Restoration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('orchestratorRestoreHelper - Standard Combat Restoration', () => {
    let handleCompletionSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      handleCompletionSpy = vi.spyOn(searchLoop, 'handleBattleFlowCompletion').mockResolvedValue(undefined);
    });

    it('should faithfully restore active combat with exact enemy, HP, stages, and logs', async () => {
      const ctx = createMockBattleContext();
      const enemy = makePokemon('pidgey', 10)!;
      enemy.uid = 'enemy-uid-5678';
      enemy.hp = 15;

      const savedBattle: Partial<BattleState> = {
        player: ctx.gs.state.team[0],
        enemy,
        turnCount: 3,
        over: false,
        locationId: 'route1',
        wasSearching: true,
        playerStages: createMockStages({ atk: 1 }),
        enemyStages: createMockStages({ def: -1 }),
        battleLogs: [{ id: '1', msg: '¡Lanzallamas!', type: 'log-info', side: 'player', icon: null, iconType: null }]
      };

      await restoreBattleState(ctx, savedBattle);

      expect(ctx.activeBattle.value).not.toBeNull();
      expect(ctx.activeBattle.value?.enemy?.uid).toBe('enemy-uid-5678');
      expect(ctx.activeBattle.value?.turnCount).toBe(3);
      expect(ctx.playerStages.value.atk).toBe(1);
      expect(ctx.enemyStages.value.def).toBe(-1);
      expect(ctx.battleLogs.value.length).toBe(1);
      expect(ctx.fsm.currentState.value).toBe('ACTIVE_BATTLE');
      expect(ctx.fsm.currentSubState.value).toBe('WAIT_INPUT');
      expect(ctx.isProcessing.value).toBe(false);
    });

    it('should drop minigame states (fishing / archaeology) and return cleanly to search loop without persisting', async () => {
      const ctx = createMockBattleContext();

      const savedMinigame: Partial<BattleState> = {
        locationId: 'route1',
        minigame: 'fishing',
        wasSearching: true
      };

      await restoreBattleState(ctx, savedMinigame);

      expect(handleCompletionSpy).toHaveBeenCalledWith(ctx, 'search');
      expect(ctx.activeBattle.value?.minigame).toBeNull();
      expect(ctx.activeBattle.value?.wasSearching).toBe(true);
    });

    it('should restore search phase (bush mode) cleanly without launching active combat', async () => {
      const ctx = createMockBattleContext();

      const savedSearchMode: Partial<BattleState> = {
        locationId: 'route1',
        wasSearching: true,
        turnCount: 0,
        inSearchPhase: true
      };

      await restoreBattleState(ctx, savedSearchMode);

      expect(handleCompletionSpy).toHaveBeenCalledWith(ctx, 'search');
      expect(ctx.activeBattle.value?.wasSearching).toBe(true);
      expect(ctx.fsm.currentState.value).not.toBe('ACTIVE_BATTLE');
    });
  });

  describe('Search Phase F5 Restore (Wild vs Trainer Escapability)', () => {
    let handleCompletionSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      handleCompletionSpy = vi.spyOn(searchLoop, 'handleBattleFlowCompletion').mockResolvedValue(undefined);
    });

    it('restores wild encounter in search phase back to SEARCH_PHASE upon F5 when turnCount is 0', async () => {
      const ctx = createMockBattleContext();
      const wildPidgey = makePokemon('pidgey', 4)!;
      wildPidgey.uid = 'wild-pidgey-1';

      const savedBattle: Partial<BattleState> = {
        player: ctx.gs.state.team[0],
        enemy: wildPidgey,
        turnCount: 0,
        over: false,
        locationId: 'route1',
        wasSearching: true,
        isTrainer: false,
        isGym: false,
        battleHistory: []
      };

      await restoreBattleState(ctx, savedBattle);

      expect(handleCompletionSpy).toHaveBeenCalledWith(ctx, 'search');
      expect(ctx.activeBattle.value?.wasSearching).toBe(true);
      expect(ctx.fsm.transition).not.toHaveBeenCalledWith('ACTIVE_BATTLE', 'WAIT_INPUT');
    });

    it('restores trainer encounter upon F5 directly to ACTIVE_BATTLE:WAIT_INPUT to prevent escaping', async () => {
      const ctx = createMockBattleContext();
      const trainerDoduo = makePokemon('doduo', 4)!;
      trainerDoduo.uid = 'trainer-doduo-1';

      const savedBattle: Partial<BattleState> = {
        player: ctx.gs.state.team[0],
        enemy: trainerDoduo,
        enemyTeam: [trainerDoduo],
        turnCount: 0,
        over: false,
        locationId: 'route1',
        wasSearching: true,
        isTrainer: true,
        isGym: false,
        trainerName: 'Ornitólogo Ramón',
        battleHistory: []
      };

      await restoreBattleState(ctx, savedBattle);

      expect(ctx.fsm.transition).toHaveBeenCalledWith('ACTIVE_BATTLE', 'WAIT_INPUT');
      expect(handleCompletionSpy).not.toHaveBeenCalled();
      expect(ctx.activeBattle.value?.isTrainer).toBe(true);
    });

    it('restores in-progress wild combat (turnCount > 0) to ACTIVE_BATTLE:WAIT_INPUT', async () => {
      const ctx = createMockBattleContext();
      const wildPidgey = makePokemon('pidgey', 4)!;
      wildPidgey.uid = 'wild-pidgey-1';

      const savedBattle: Partial<BattleState> = {
        player: ctx.gs.state.team[0],
        enemy: wildPidgey,
        turnCount: 2,
        over: false,
        locationId: 'route1',
        wasSearching: true,
        isTrainer: false,
        isGym: false,
        battleHistory: [{ turnCount: 1, p1Choice: 'move 1', p2Choice: 'move 1' }]
      };

      await restoreBattleState(ctx, savedBattle);

      expect(ctx.fsm.transition).toHaveBeenCalledWith('ACTIVE_BATTLE', 'WAIT_INPUT');
    });
  });

  describe('NPC Trainer Termination & Edge Conditions', () => {
    it('evaluateAndUseItem must NOT use Potion on a fainted Pokemon (hp <= 0)', async () => {
      const { evaluateAndUseItem } = await import('@/logic/battle/ai/heuristic/aiItemEvaluator');
      const faintedEnemy = createMockPokemon({ hp: 0, fainted: true });
      const activeBattleRef = ref<BattleState>({
        player: createMockPokemon({ uid: 'p1', id: 'gengar', name: 'Gengar', hp: 100, maxHp: 100, fainted: false }),
        enemy: faintedEnemy,
        enemyTeam: [faintedEnemy],
        enemyInventory: { potion: 2 },
        trainerName: 'Lara',
        isTrainer: true,
        over: false,
      } as unknown as BattleState);

      const ctx = {
        activeBattle: activeBattleRef,
        addLog: vi.fn(),
        animations: {
          handleHealRequest: vi.fn()
        }
      } as unknown as BattleContext;

      const used = await evaluateAndUseItem(ctx, faintedEnemy);
      expect(used).toBe(false);
      expect(faintedEnemy.hp).toBe(0);
      expect(ctx.addLog).not.toHaveBeenCalledWith(expect.stringContaining('usó Poción en Tentacruel'), expect.anything(), expect.anything());
    });

    it('handleBattleFlowCompletion("map") must clear activeBattle and persist respecting 60s rule', async () => {
      const { handleBattleFlowCompletion } = await import('@/logic/battle/searchLoop');
      const saveMock = vi.fn();
      const fsmMock = {
        transition: vi.fn().mockResolvedValue(undefined),
        currentState: ref('REWARDS_PHASE')
      };

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
      } as unknown as BattleContext;

      await handleBattleFlowCompletion(ctx, 'map');

      expect(ctx.activeBattle.value).toBeNull();
      expect(ctx.gs.state.activeBattle).toBeNull();
      expect(saveMock).toHaveBeenCalledWith(false);
    });

    it('syncAndPersist when battle.over = true must clear activeBattle and persist respecting 60s rule', async () => {
      const { syncAndPersist } = await import('@/logic/battle/battleStateSync');
      const saveMock = vi.fn();
      const activeBattleRef = ref<BattleState>({
        over: true,
        player: null,
        enemy: null,
        enemyTeam: []
      } as unknown as BattleState);

      const ctx = {
        activeBattle: activeBattleRef,
        gs: {
          state: { activeBattle: activeBattleRef.value, team: [] },
          save: saveMock
        }
      } as unknown as BattleContext;

      syncAndPersist(ctx);
      expect(ctx.gs.state.activeBattle).toBeNull();
      expect(saveMock).toHaveBeenCalledWith(false);
    });

    it('restoreBattleState must NOT restore when all enemyTeam Pokemon are fainted', async () => {
      const fsmMock = {
        transition: vi.fn().mockResolvedValue(undefined),
        currentState: ref('INITIALIZING')
      };
      const saveMock = vi.fn();
      const deadEnemy = createMockPokemon({ hp: 0, fainted: true });

      const battleData = {
        isTrainer: true,
        trainerName: 'Lara',
        turnCount: 2,
        over: false,
        enemy: deadEnemy,
        enemyTeam: [deadEnemy],
        playerTeamIndex: 0
      };

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
      } as unknown as BattleContext;

      await restoreBattleState(ctx, battleData);

      expect(ctx.activeBattle.value).toBeNull();
      expect(ctx.gs.state.activeBattle).toBeNull();
      expect(fsmMock.transition).toHaveBeenCalledWith('EXIT_BATTLE');
    });

    it('restoreBattleState must select alive Pokemon (Jolteon) when candidate at enemyTeamIndex is fainted (Tentacruel) and preserve enemyInventory', async () => {
      const fsmMock = {
        transition: vi.fn().mockResolvedValue(undefined),
        currentState: ref('INITIALIZING')
      };
      const deadTentacruel = createMockPokemon({ uid: 't-1', id: 'tentacruel', name: 'Tentacruel', hp: 0, fainted: true });
      const aliveJolteon = createMockPokemon({ uid: 'j-2', id: 'jolteon', name: 'Jolteon', hp: 120, maxHp: 120, fainted: false });
      const playerMon = createMockPokemon({ uid: 'p-1', id: 'charizard', name: 'Charizard', hp: 150, maxHp: 150, fainted: false });

      const battleData = {
        isTrainer: true,
        trainerName: 'Lara',
        turnCount: 3,
        over: false,
        enemyTeamIndex: 0,
        enemy: deadTentacruel,
        enemyTeam: [deadTentacruel, aliveJolteon],
        playerTeamIndex: 0,
        enemyInventory: { potion: 1, hyperpotion: 2 }
      };

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
      } as unknown as BattleContext;

      await restoreBattleState(ctx, battleData);

      expect(ctx.activeBattle.value).not.toBeNull();
      expect(ctx.activeBattle.value?.enemy?.id).toBe('jolteon');
      expect(ctx.activeBattle.value?.enemy?.hp).toBe(120);
      expect(ctx.activeBattle.value?.enemyTeamIndex).toBe(1);
      expect(ctx.activeBattle.value?.enemyInventory).toEqual({ potion: 1, hyperpotion: 2 });
      expect(fsmMock.transition).toHaveBeenCalledWith('ACTIVE_BATTLE', 'WAIT_INPUT');
    });

    it('executeEndBattle (PvP) must clear activeBattle and save respecting 60s rule', async () => {
      const { executeEndBattle } = await import('@/logic/pvp/livePvPEndBattleHandler');
      const saveMock = vi.fn();

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
      };

      await executeEndBattle(true, 'Victoria', mockCtx as any);

      expect(mockCtx.gameStore.state.activeBattle).toBeNull();
      expect(saveMock).toHaveBeenCalledWith(false);
    });
  });

  describe('searchLoop - handleBattleFlowCompletion Flow', () => {
    let mockSearchCtx: BattleContext;

    beforeEach(() => {
      mockSearchCtx = {
        activeBattle: ref({
          locationId: 'route1',
          _initialEnemy: null,
          enemy: null,
          isFishing: false,
          isArchaeology: false,
          fled: true,
          playerFled: true
        }),
        debugLoopPokemon: ref(null),
        isProcessing: ref(false),
        gs: { state: {} },
        fsm: {
          currentState: ref(BATTLE_STATES.ACTIVE_BATTLE),
          transition: vi.fn(async (s: string) => {
            mockSearchCtx.fsm.currentState.value = s as any;
          })
        },
        BATTLE_STATES,
        BATTLE_SUBSTATES,
        clearLogs: vi.fn()
      } as unknown as BattleContext;
    });

    it('should generate active encounter directly during search loop', async () => {
      await searchLoop.handleBattleFlowCompletion(mockSearchCtx, 'search');
      
      expect(mockSearchCtx.activeBattle.value!._initialEnemy).toBeDefined();
      expect(mockSearchCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.INITIALIZING);
      expect(mockSearchCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PREPARATION);
    });

    it('should clear escape flags before returning to the search loop', async () => {
      await searchLoop.handleBattleFlowCompletion(mockSearchCtx, 'search');

      expect(mockSearchCtx.activeBattle.value!.fled).toBe(false);
      expect(mockSearchCtx.activeBattle.value!.playerFled).toBe(false);
    });

    it('emits battle-flow completion after the real map cleanup', async () => {
      const received: BattleFlowCompletedDetail[] = [];
      const onCompleted = (event: Event) => {
        received.push((event as CustomEvent<BattleFlowCompletedDetail>).detail);
      };
      if (typeof window !== 'undefined') {
        window.addEventListener(BATTLE_UI_EVENTS.FLOW_COMPLETED, onCompleted, { once: true });
      }

      await searchLoop.handleBattleFlowCompletion(mockSearchCtx, 'map');

      expect(mockSearchCtx.activeBattle.value).toBeNull();
      if (typeof window !== 'undefined') {
        expect(received).toEqual([{ destination: 'map' }]);
      }
    });
  });
});
