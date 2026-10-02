/**
 * auditor_fault_suite/triggers/bad_fsm.ts
 *
 * FAULT TRIGGER: FSM turn order violations, state desync and missing transitions.
 */

export enum BattleFsmBadState {
  INITIAL = 'INITIAL',
  SELECTING_ACTION = 'SELECTING_ACTION',
  EXECUTION = 'EXECUTION',
  ILLEGAL_STATE = 'ILLEGAL_STATE'
}

// Trigger: fsm-turn-order-violation (Jumping from INITIAL straight to EXECUTION)
export function transitionDirectToExecution(currentState: BattleFsmBadState): BattleFsmBadState {
  if (currentState === BattleFsmBadState.INITIAL) {
    return BattleFsmBadState.EXECUTION;
  }
  return currentState;
}

// Trigger: fsm-missing-transition-handler
export function handleUnknownStateTransition(state: BattleFsmBadState): string {
  switch (state) {
    case BattleFsmBadState.INITIAL:
      return 'Init';
    // Missing SELECTING_ACTION and EXECUTION handlers
    default:
      return 'Unknown';
  }
}
