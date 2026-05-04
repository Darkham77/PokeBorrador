import { ref } from 'vue';

export const BATTLE_STATES = {
  INITIALIZING: 'INITIALIZING',
  FIRST_INTRO: 'FIRST_INTRO',
  SEARCH_PHASE: 'SEARCH_PHASE',
  ACTIVE_BATTLE: 'ACTIVE_BATTLE',
  REWARDS_PHASE: 'REWARDS_PHASE',
  LEVEL_UP_MODAL: 'LEVEL_UP_MODAL',
  POST_BATTLE_STABILIZATION: 'POST_BATTLE_STABILIZATION',
  REORDER_TEAM: 'REORDER_TEAM',
  EXIT_BATTLE: 'EXIT_BATTLE'
};

export const BATTLE_SUBSTATES = {
  WAIT_INPUT: 'WAIT_INPUT',
  EXEC_TURN: 'EXEC_TURN',
  CATCH_PROCESS: 'CATCH_PROCESS',
  CATCH_SHAKE: 'CATCH_SHAKE',
  CATCH_BREAK: 'CATCH_BREAK',
  CATCH_SUCCESS: 'CATCH_SUCCESS',
  ENEMY_FAINT: 'ENEMY_FAINT',
  PLAYER_FAINT_SEQ: 'PLAYER_FAINT_SEQ',
  ESCAPE_PROCESS: 'ESCAPE_PROCESS',
  // Reward Phase Sub-states (The Void Standard)
  VOID_STATE: 'VOID_STATE',
  DISTRIBUTE_XP: 'DISTRIBUTE_XP',
  // Search Phase Sub-states
  ENTRY_ANIM: 'ENTRY_ANIM',    // Bushes gradual + silueta estática
  BUSH_IDLE: 'BUSH_IDLE',      // Silueta estática esperando click en Buscar
  ENCOUNTER_ANIM: 'ENCOUNTER_ANIM' // Jump + reveal (disparado al hacer click en Buscar)
};

export function createBattleStateMachine() {
  const currentState = ref(BATTLE_STATES.EXIT_BATTLE);
  const currentSubState = ref(null);
  let transitionTimeout = null;

  // Simple strict transitions check based on the Mermaid diagram.
  // Using a loose map for flexibility but ensuring logical flow.
  const validTransitions = {
    [BATTLE_STATES.INITIALIZING]: [BATTLE_STATES.FIRST_INTRO, BATTLE_STATES.SEARCH_PHASE],
    [BATTLE_STATES.FIRST_INTRO]: [BATTLE_STATES.ACTIVE_BATTLE],
    [BATTLE_STATES.SEARCH_PHASE]: [BATTLE_STATES.ACTIVE_BATTLE, BATTLE_STATES.EXIT_BATTLE],
    [BATTLE_STATES.ACTIVE_BATTLE]: [BATTLE_STATES.REWARDS_PHASE, BATTLE_STATES.EXIT_BATTLE, BATTLE_STATES.POST_BATTLE_STABILIZATION, 'ENEMY_FAINT', 'PLAYER_FAINT_SEQ'], 
    [BATTLE_STATES.REWARDS_PHASE]: [BATTLE_STATES.POST_BATTLE_STABILIZATION, BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.VOID_STATE, BATTLE_SUBSTATES.DISTRIBUTE_XP],
    [BATTLE_STATES.POST_BATTLE_STABILIZATION]: [BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_STATES.REORDER_TEAM, BATTLE_STATES.SEARCH_PHASE, BATTLE_STATES.EXIT_BATTLE],
    [BATTLE_STATES.LEVEL_UP_MODAL]: [BATTLE_STATES.POST_BATTLE_STABILIZATION, BATTLE_STATES.SEARCH_PHASE],
    [BATTLE_STATES.REORDER_TEAM]: [BATTLE_STATES.POST_BATTLE_STABILIZATION, BATTLE_STATES.SEARCH_PHASE, BATTLE_STATES.ACTIVE_BATTLE, BATTLE_STATES.EXIT_BATTLE],
    [BATTLE_SUBSTATES.ENEMY_FAINT]: [BATTLE_STATES.REWARDS_PHASE],
    [BATTLE_SUBSTATES.PLAYER_FAINT_SEQ]: [BATTLE_STATES.ACTIVE_BATTLE, BATTLE_STATES.EXIT_BATTLE],
    [BATTLE_SUBSTATES.ESCAPE_PROCESS]: [BATTLE_STATES.REWARDS_PHASE],
    [BATTLE_STATES.EXIT_BATTLE]: [BATTLE_STATES.INITIALIZING]
  };

  /**
   * Translates to a specific state or substate.
   * If a delay is provided, returns a Promise that resolves when the transition happens.
   */
  const transition = (newState, newSubState = null, delayMs = 0) => {
    return new Promise((resolve) => {
      if (transitionTimeout) {
        clearTimeout(transitionTimeout);
        transitionTimeout = null;
      }

      const executeTransition = () => {
        // Validation check (can be expanded for strict enforcement)
        if (Object.values(BATTLE_STATES).includes(newState)) {
          const isSameState = currentState.value === newState;
          if (!isSameState && validTransitions[currentState.value] && !validTransitions[currentState.value].includes(newState) && newState !== BATTLE_STATES.EXIT_BATTLE) {
            console.warn(`[FSM] Unexpected transition: ${currentState.value} -> ${newState}`);
          }
          currentState.value = newState;
        } else if (Object.values(BATTLE_SUBSTATES).includes(newState)) {
          // If a substate is requested directly, imply ACTIVE_BATTLE
          currentState.value = BATTLE_STATES.ACTIVE_BATTLE;
          newSubState = newState;
        }

        if (newSubState) {
          currentSubState.value = newSubState;
        } else if (currentState.value !== BATTLE_STATES.ACTIVE_BATTLE) {
          currentSubState.value = null; // Clear substate if leaving ACTIVE_BATTLE
        }

        console.log(`[Battle FSM] Transitioned to ${currentState.value}${currentSubState.value ? ' (' + currentSubState.value + ')' : ''}`);
        resolve();
      };

      if (delayMs > 0) {
        transitionTimeout = setTimeout(executeTransition, delayMs);
      } else {
        executeTransition();
      }
    });
  };

  const isState = (state) => currentState.value === state;
  const isSubState = (subState) => currentSubState.value === subState;

  return {
    currentState,
    currentSubState,
    transition,
    isState,
    isSubState
  };
}
