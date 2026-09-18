/**
 * tests/unit/battle/battle_fsm_and_turn_choices_suite.spec.ts
 * Consolidated domain test suite for Battle FSM and Turn Choices:
 * State machine transitions, timeouts, guards against stale turns in SEARCH_PHASE,
 * and Showdown turn choice generation / struggle fallbacks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { createBattleStateMachine, BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';
import { resolveTurnChoices } from '@/logic/battle/battleTurnChoiceHelper';
import { handleBattleFlowCompletion } from '@/logic/battle/searchLoop';
import { processFaint } from '@/logic/battle/resolution';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';

// =============================================================================
// 1. Battle State Machine Suite
// =============================================================================
describe('battleStateMachine Core Transitions & Helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with EXIT_BATTLE as the default state', () => {
    const fsm = createBattleStateMachine();
    expect(fsm.currentState.value).toBe(BATTLE_STATES.EXIT_BATTLE);
    expect(fsm.currentSubState.value).toBeNull();
  });

  it('should allow valid transitions sequentially', async () => {
    const fsm = createBattleStateMachine();

    // From EXIT_BATTLE -> INITIALIZING
    const p1 = fsm.transition(BATTLE_STATES.INITIALIZING);
    vi.runAllTimers();
    await p1;
    expect(fsm.currentState.value).toBe(BATTLE_STATES.INITIALIZING);

    // From INITIALIZING -> SEARCH_PHASE
    const p2 = fsm.transition(BATTLE_STATES.SEARCH_PHASE);
    vi.runAllTimers();
    await p2;
    expect(fsm.currentState.value).toBe(BATTLE_STATES.SEARCH_PHASE);

    // From SEARCH_PHASE -> ACTIVE_BATTLE
    const p3 = fsm.transition(BATTLE_STATES.ACTIVE_BATTLE);
    vi.runAllTimers();
    await p3;
    expect(fsm.currentState.value).toBe(BATTLE_STATES.ACTIVE_BATTLE);
  });

  it('should assign a substate when transitioning directly to a substate', async () => {
    const fsm = createBattleStateMachine();
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE);
    
    const p = fsm.transition(BATTLE_SUBSTATES.CATCH_PROCESS);
    vi.runAllTimers();
    await p;

    expect(fsm.currentState.value).toBe(BATTLE_STATES.ACTIVE_BATTLE);
    expect(fsm.currentSubState.value).toBe(BATTLE_SUBSTATES.CATCH_PROCESS);
  });

  it('should assign a substate when transitioning to ACTIVE_BATTLE with a substate argument', async () => {
    const fsm = createBattleStateMachine();
    
    const p = fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT);
    vi.runAllTimers();
    await p;

    expect(fsm.currentState.value).toBe(BATTLE_STATES.ACTIVE_BATTLE);
    expect(fsm.currentSubState.value).toBe(BATTLE_SUBSTATES.WAIT_INPUT);
  });

  it('should clear the substate when transitioning out of ACTIVE_BATTLE', async () => {
    const fsm = createBattleStateMachine();
    
    const p1 = fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EXEC_TURN);
    vi.runAllTimers();
    await p1;

    expect(fsm.currentSubState.value).toBe(BATTLE_SUBSTATES.EXEC_TURN);

    const p2 = fsm.transition(BATTLE_STATES.REWARDS_PHASE);
    vi.runAllTimers();
    await p2;

    expect(fsm.currentState.value).toBe(BATTLE_STATES.REWARDS_PHASE);
    expect(fsm.currentSubState.value).toBeNull();
  });

  it('should handle delayed transitions correctly', async () => {
    const fsm = createBattleStateMachine();
    
    expect(fsm.currentState.value).toBe(BATTLE_STATES.EXIT_BATTLE);

    const p = fsm.transition(BATTLE_STATES.INITIALIZING, null, 1000);
    expect(fsm.currentState.value).toBe(BATTLE_STATES.EXIT_BATTLE);

    vi.advanceTimersByTime(500);
    expect(fsm.currentState.value).toBe(BATTLE_STATES.EXIT_BATTLE);

    vi.advanceTimersByTime(500);
    await p;

    expect(fsm.currentState.value).toBe(BATTLE_STATES.INITIALIZING);
  });

  it('should clear previous timeout if a new transition is requested before it completes', async () => {
    const fsm = createBattleStateMachine();
    
    fsm.transition(BATTLE_STATES.INITIALIZING, null, 1000);
    const p2 = fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, null, 500);

    vi.runAllTimers();
    await p2;

    expect(fsm.currentState.value).toBe(BATTLE_STATES.ACTIVE_BATTLE);
  });

  it('should trigger a console warning on unexpected transitions', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fsm = createBattleStateMachine();
    
    const p1 = fsm.transition(BATTLE_STATES.INITIALIZING);
    vi.runAllTimers();
    await p1;

    const p2 = fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL);
    vi.runAllTimers();
    await p2;

    expect(consoleSpy.mock.calls.length).toBeGreaterThan(0);
    expect(consoleSpy.mock.calls[0]![0]).toMatch(/\[FSM\].*Unexpected transition/);

    consoleSpy.mockRestore();
  });

  it('should expose isState and isSubState computed helpers properly', async () => {
    const fsm = createBattleStateMachine();
    
    const p = fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CATCH_PROCESS);
    vi.runAllTimers();
    await p;

    expect(fsm.isState(BATTLE_STATES.ACTIVE_BATTLE)).toBe(true);
    expect(fsm.isState(BATTLE_STATES.REWARDS_PHASE)).toBe(false);
    
    expect(fsm.isSubState(BATTLE_SUBSTATES.CATCH_PROCESS)).toBe(true);
    expect(fsm.isSubState(BATTLE_SUBSTATES.WAIT_INPUT)).toBe(false);
  });
});

// =============================================================================
// 2. Battle Stale Flow Safety Suite
// =============================================================================
describe('Battle Stale Flow Safety Tests', () => {
  let mockCtx: BattleContext;

  beforeEach(() => {
    mockCtx = {
      activeBattle: {
        value: {
          locationId: 'route1',
          _initialEnemy: null,
          enemy: null,
          player: { uid: 'vaporeon', name: 'Vaporeon', hp: 0, maxHp: 100 } as unknown as Pokemon,
          isFishing: false,
          isArchaeology: false,
          over: false,
          rewardsProcessed: false,
          _rewardCombatants: []
        }
      },
      debugLoopPokemon: { value: null },
      isProcessing: { value: false },
      faintedSides: { value: new Set<string>() },
      gs: { state: {} },
      fsm: {
        currentState: { value: BATTLE_STATES.SEARCH_PHASE },
        currentSubState: { value: BATTLE_SUBSTATES.COMBAT_OR_FLEE },
        transition: vi.fn(async (s, sub) => {
          mockCtx.fsm.currentState.value = s;
          if (sub) (mockCtx.fsm.currentSubState as { value: string | null }).value = sub;
        })
      },
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      clearLogs: vi.fn(),
      addLog: vi.fn(),
      clearVolatileStatus: vi.fn()
    } as unknown as BattleContext;
  });

  it('should ignore processFaint if FSM has already moved to SEARCH_PHASE', async () => {
    await processFaint(mockCtx, 'player');

    expect(mockCtx.fsm.transition).not.toHaveBeenCalledWith(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ);
    expect(mockCtx.faintedSides.value.has('player')).toBe(false);
  });

  it('should ignore applyEndTurnEffects if FSM state is not ACTIVE_BATTLE', async () => {
    const { applyEndTurnEffects } = await import('@/logic/battle/battleFlow');
    
    mockCtx.activeBattle.value!.enemy = { uid: 'zubat', name: 'Zubat', hp: 50, maxHp: 50, type: 'poison' } as unknown as Pokemon;
    mockCtx.activeBattle.value!.weather = { type: 'sandstorm', visual: 'sandstorm', turns: 5 };
    mockCtx.playerStages = { value: {} } as unknown as import('vue').Ref<import('@/types/battle/battle').BattleStages>;
    mockCtx.enemyStages = { value: {} } as unknown as import('vue').Ref<import('@/types/battle/battle').BattleStages>;

    await applyEndTurnEffects(mockCtx);

    expect(mockCtx.activeBattle.value!.enemy.hp).toBe(50);
  });

  it('should transition to COMBAT_OR_FLEE when entering search phase and keep logs intact', async () => {
    mockCtx.fsm.currentState.value = BATTLE_STATES.ACTIVE_BATTLE;
    
    await handleBattleFlowCompletion(mockCtx, 'search');

    expect(mockCtx.clearLogs).not.toHaveBeenCalled();
    expect(mockCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE);
  });
});

// =============================================================================
// 3. Battle Turn Choice Helper Suite
// =============================================================================
describe('battleTurnChoiceHelper - resolveTurnChoices', () => {
  it('should generate valid p1 and p2 move choices for normal turn', async () => {
    const mockPlayer = {
      uid: 'p1',
      name: 'Pikachu',
      hp: 100,
      maxHp: 100,
      moves: [{ id: 'thunderbolt', name: 'Thunderbolt', pp: 15 }],
    } as unknown as Pokemon;

    const mockEnemy = {
      uid: 'p2',
      name: 'Charmander',
      hp: 100,
      maxHp: 100,
      moves: [{ id: 'flamethrower', name: 'Flamethrower', pp: 15 }],
    } as unknown as Pokemon;

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
    } as unknown as BattleContext;

    const move = mockPlayer.moves[0] as Move;
    const eMove = mockEnemy.moves[0] as Move;

    const choices = await resolveTurnChoices(
      mockStore,
      mockPlayer,
      mockEnemy,
      move,
      false,
      true,
      false,
      eMove
    );

    expect(choices.p1Choice).toBe('move thunderbolt');
    expect(choices.p2Choice).toBe('move flamethrower');
    expect(choices.p1Skip).toBe(false);
  });

  it('should fall back to struggle when no moves available', async () => {
    const mockPlayer = {
      uid: 'p1',
      name: 'Magikarp',
      hp: 50,
      maxHp: 50,
      moves: [],
    } as unknown as Pokemon;

    const mockEnemy = {
      uid: 'p2',
      name: 'Caterpie',
      hp: 50,
      maxHp: 50,
      moves: [],
    } as unknown as Pokemon;

    const mockStore = {
      activeBattle: ref({
        player: mockPlayer,
        enemy: mockEnemy,
      }),
      enemyStages: ref({}),
      playerStages: ref({}),
    } as unknown as BattleContext;

    const choices = await resolveTurnChoices(
      mockStore,
      mockPlayer,
      mockEnemy,
      null,
      true,
      true,
      false,
      null
    );

    expect(choices.p1Choice).toBe('struggle');
    expect(choices.p2Choice).toBe('struggle');
  });
});
