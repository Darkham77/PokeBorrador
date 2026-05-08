
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBattleStateMachine, BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';

describe('battleStateMachine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE); // Start active
    
    const p = fsm.transition(BATTLE_SUBSTATES.CATCH_PROCESS);
    vi.runAllTimers();
    await p;

    // Direct transition to a substate implicitly implies ACTIVE_BATTLE
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
    
    // Initial state
    expect(fsm.currentState.value).toBe(BATTLE_STATES.EXIT_BATTLE);

    // Delayed transition
    const p = fsm.transition(BATTLE_STATES.INITIALIZING, null, 1000);
    
    // Right after call, state shouldn't have changed
    expect(fsm.currentState.value).toBe(BATTLE_STATES.EXIT_BATTLE);

    // Fast-forward half the time
    vi.advanceTimersByTime(500);
    expect(fsm.currentState.value).toBe(BATTLE_STATES.EXIT_BATTLE);

    // Fast-forward remaining time
    vi.advanceTimersByTime(500);
    await p;

    // Now it should be updated
    expect(fsm.currentState.value).toBe(BATTLE_STATES.INITIALIZING);
  });

  it('should clear previous timeout if a new transition is requested before it completes', async () => {
    const fsm = createBattleStateMachine();
    
    // Request a delayed transition
    const p1 = fsm.transition(BATTLE_STATES.INITIALIZING, null, 1000);
    
    // Request a different transition immediately (overriding the timeout)
    const p2 = fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, null, 500);

    vi.runAllTimers();
    await p2;

    // The state should be the second one, not the first
    expect(fsm.currentState.value).toBe(BATTLE_STATES.ACTIVE_BATTLE);
  });

  it('should trigger a console warning on unexpected transitions', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fsm = createBattleStateMachine();
    
    // Make sure we are in INITIALIZING
    const p1 = fsm.transition(BATTLE_STATES.INITIALIZING);
    vi.runAllTimers();
    await p1;

    // Transitioning from INITIALIZING -> LEVEL_UP_MODAL is not valid according to the validTransitions map
    const p2 = fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL);
    vi.runAllTimers();
    await p2;

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[FSM] Unexpected transition')
    );

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
