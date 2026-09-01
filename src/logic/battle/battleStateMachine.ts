import { ref } from 'vue';
import { gsap } from 'gsap';
import { logger } from '../utils/logger.ts';

const MS_PER_SECOND = 1000;

export const BATTLE_STATES = {
  CONTEXT_SETUP: 'CONTEXT_SETUP',
  INITIALIZING: 'INITIALIZING',
  FIRST_INTRO: 'FIRST_INTRO',
  SEARCH_PHASE: 'SEARCH_PHASE',
  ACTIVE_BATTLE: 'ACTIVE_BATTLE',
  REWARDS_PHASE: 'REWARDS_PHASE',
  LEVEL_UP_MODAL: 'LEVEL_UP_MODAL',
  REORDER_TEAM: 'REORDER_TEAM',
  EXIT_BATTLE: 'EXIT_BATTLE'
} as const;

export type BattleStateName = typeof BATTLE_STATES[keyof typeof BATTLE_STATES];
const BATTLE_STATES_SET: ReadonlySet<string> = new Set(Object.values(BATTLE_STATES)); // runtime-set

function isBattleStateName(val: string): val is BattleStateName {
  return BATTLE_STATES_SET.has(val);
}

export const BATTLE_SUBSTATES = {
  WAIT_INPUT: 'WAIT_INPUT',
  EXEC_TURN: 'EXEC_TURN',
  CATCH_PROCESS: 'CATCH_PROCESS',
  CATCH_SHAKE: 'CATCH_SHAKE',
  CATCH_BREAK: 'CATCH_BREAK',
  CATCH_SUCCESS: 'CATCH_SUCCESS',
  PLAYER_FAINT_SEQ: 'PLAYER_FAINT_SEQ',
  ESCAPE_PROCESS: 'ESCAPE_PROCESS',
  EMPTY_WAIT: 'EMPTY_WAIT',
  ANIM_SYNC: 'ANIM_SYNC',
  DISTRIBUTE_XP: 'DISTRIBUTE_XP',
  ENTRY_ANIM: 'ENTRY_ANIM',
  WAIT_LOG_QUEUE: 'WAIT_LOG_QUEUE',
  COMBAT_OR_FLEE: 'COMBAT_OR_FLEE',
  ENCOUNTER_ANIM: 'ENCOUNTER_ANIM',
  RECEIVE_CONFIG: 'RECEIVE_CONFIG',
  CHECK_PERSISTENCE: 'CHECK_PERSISTENCE',
  PRELOAD_COORDS: 'PRELOAD_COORDS',
  PRELOAD_FINAL_COORDS: 'PRELOAD_FINAL_COORDS',
  TURN_ENGINE: 'TURN_ENGINE',
  ENEMY_REPLACEMENT_SEQ: 'ENEMY_REPLACEMENT_SEQ',
  BUILD_QUEUE: 'BUILD_QUEUE',
  POP_ACTION: 'POP_ACTION',
  APPLY_MOVE: 'APPLY_MOVE',
  FLEE_ATTEMPT: 'FLEE_ATTEMPT',
  EVAL_HP: 'EVAL_HP',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  EVAL_CONTINUE: 'EVAL_CONTINUE',
  ENEMY_DEFEAT: 'ENEMY_DEFEAT',
  TYPE_CHECK: 'TYPE_CHECK',
  NEXT_PICK_TYPE: 'NEXT_PICK_TYPE',
  ADD_TO_STORAGE: 'ADD_TO_STORAGE',
  PLAY_ENEMY_FAINT: 'PLAY_ENEMY_FAINT',
  PLAY_ESCAPE_ANIM: 'PLAY_ESCAPE_ANIM',
  CLEANUP_MEMORY: 'CLEANUP_MEMORY',
  CHECK_REMAINING: 'CHECK_REMAINING',
  STABILIZE_STAGE: 'STABILIZE_STAGE',
  AI_NEXT_PICK: 'AI_NEXT_PICK',
  SELECT_COUNTER: 'SELECT_COUNTER',
  CHECK_OUTCOME: 'CHECK_OUTCOME',
  WAIT_LOG_QUEUE_ONLY: 'WAIT_LOG_QUEUE_ONLY',
  CHECK_PENDING: 'CHECK_PENDING',
  SHOW_CHOICE: 'SHOW_CHOICE',
  PARALLEL_PREP: 'PARALLEL_PREP',
  MINIGAME_CHECK: 'MINIGAME_CHECK',
  RECALL_FLOW: 'RECALL_FLOW',
  CHECK_TEAM: 'CHECK_TEAM',
  HAS_HEALTHY: 'HAS_HEALTHY',
  SWITCH_MENU: 'SWITCH_MENU',
  POKEMON_CALL: 'POKEMON_CALL',
  ALL_FAINTED: 'ALL_FAINTED',
  DEFEAT_SCREEN: 'DEFEAT_SCREEN',
  SWITCHING: 'SWITCHING',
  POKEMON_RECALL: 'POKEMON_RECALL',
  RENDER_BALL: 'RENDER_BALL',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  ENERGY_RECALL: 'ENERGY_RECALL',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  ENERGY_RELEASE: 'ENERGY_RELEASE',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  POKEMON_APPEAR: 'POKEMON_APPEAR',
  VACATE_SEAT: 'VACATE_SEAT',
  FADEOUT_BALL: 'FADEOUT_BALL',
  OCCUPY_SEAT: 'OCCUPY_SEAT',
  ENCOUNTER_TYPE_CHECK: 'ENCOUNTER_TYPE_CHECK',
  WILD_ENTRY: 'WILD_ENTRY',
  TRAINER_ENTRY: 'TRAINER_ENTRY',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  PARALLEL_ENTRY: 'PARALLEL_ENTRY',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  T_VISUAL: 'T_VISUAL',
  WILD_ENCOUNTER: 'WILD_ENCOUNTER',
  TRAINER_ENCOUNTER: 'TRAINER_ENCOUNTER',
  RETREAT_AND_FADEOUT: 'RETREAT_AND_FADEOUT',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  DIALOG_FADEOUT: 'DIALOG_FADEOUT',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  T_RETREAT: 'T_RETREAT',
  CHECK_BINOCULARS: 'CHECK_BINOCULARS',
  PARALLEL_JUMP: 'PARALLEL_JUMP',
  JUMP_SHADOW: 'JUMP_SHADOW',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  JUMP_COLOR: 'JUMP_COLOR',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  BUSH_FADE: 'BUSH_FADE',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  REVEAL_COLORS: 'REVEAL_COLORS',
  ENTRY_CHECK: 'ENTRY_CHECK',
  DEFEAT_WAIT: 'DEFEAT_WAIT',
  EXECUTE_CLEANUP: 'EXECUTE_CLEANUP',
  CLEAR_UI: 'CLEAR_UI',
  TRIGGER_CLOSE: 'TRIGGER_CLOSE',
  RESET_FLAGS: 'RESET_FLAGS',
  UPDATE_BUTTON: 'UPDATE_BUTTON',
  BUSH_VISIBLE: 'BUSH_VISIBLE',
  SILHOUETTE_MODE: 'SILHOUETTE_MODE',
  INJECT_FILTERS: 'INJECT_FILTERS',
  READY_FOR_GEN: 'READY_FOR_GEN',
  VACATE_ALL_SEATS: 'VACATE_ALL_SEATS',
  APPLY_ITEM_MODIFIERS: 'APPLY_ITEM_MODIFIERS',
  WEIGHT_CALCULATION: 'WEIGHT_CALCULATION',
  ASYNC_THREAD: 'ASYNC_THREAD',
  CHECK_CONTEXT: 'CHECK_CONTEXT',
  GEN_TEAMS: 'GEN_TEAMS',
  MARK_EVENT: 'MARK_EVENT',
  SET_SEARCH_FLAG: 'SET_SEARCH_FLAG',
  FIND_HEALTHY: 'FIND_HEALTHY',
  CHECK_ACTIVE_SEAT: 'CHECK_ACTIVE_SEAT',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  WAIT_TIMER: 'WAIT_TIMER',
  SHOW_DIALOGS: 'SHOW_DIALOGS',
  AUTO_BATTLE_CHECK: 'AUTO_BATTLE_CHECK',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  RESET_STALE_VARIABLES: 'RESET_STALE_VARIABLES',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  PLAY_MINIGAME: 'PLAY_MINIGAME',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  MINIGAME_MODAL: 'MINIGAME_MODAL',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  MINIGAME_RESULT: 'MINIGAME_RESULT',
  PREPARATION: 'PREPARATION',
  REORDER_TEAM: 'REORDER_TEAM',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  COLLECT_CHOICES: 'COLLECT_CHOICES',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  SEND_TO_WORKER: 'SEND_TO_WORKER',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  EXECUTE_TURN_SIMULATOR: 'EXECUTE_TURN_SIMULATOR',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  RETURN_LOGS: 'RETURN_LOGS',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  PLAYBACK_LOGS: 'PLAYBACK_LOGS',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  POP_LOG_LINE: 'POP_LOG_LINE',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  PARSE_LINE: 'PARSE_LINE',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  PLAY_ANIMATION: 'PLAY_ANIMATION',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  CALC_ESCAPE_CHANCE: 'CALC_ESCAPE_CHANCE',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  ESCAPE_FAILED: 'ESCAPE_FAILED',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  DELEGATE_WORKER: 'DELEGATE_WORKER',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  FILTER_RECOIL_LOGS: 'FILTER_RECOIL_LOGS',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  PLAY_ENEMY_COUNTERATTACK: 'PLAY_ENEMY_COUNTERATTACK',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  PARALLEL_ESCAPE_EXECUTION: 'PARALLEL_ESCAPE_EXECUTION',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  FORCED_SWITCH_SEQ: 'FORCED_SWITCH_SEQ',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  DETECT_TRIGGER: 'DETECT_TRIGGER',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  PHAZING_EJECTION: 'PHAZING_EJECTION',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  VOLUNTARY_WITHDRAW: 'VOLUNTARY_WITHDRAW',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  RESOLVE_MOVE_ANIM: 'RESOLVE_MOVE_ANIM',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  PLAY_EXPULSION_ANIM: 'PLAY_EXPULSION_ANIM',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  AWAIT_EXPULSION_TWEEN: 'AWAIT_EXPULSION_TWEEN',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  AWAIT_RECALL_TWEEN: 'AWAIT_RECALL_TWEEN',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  VACATE_SEAT_VOLUNTARY: 'VACATE_SEAT_VOLUNTARY',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  INCOMING_POKEMON_CALL: 'INCOMING_POKEMON_CALL',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  CHECK_SEAT_OWNER: 'CHECK_SEAT_OWNER',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  TRAINER_OR_DRAG_CALL: 'TRAINER_OR_DRAG_CALL',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  PLAYER_MANUAL_MENU: 'PLAYER_MANUAL_MENU',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  LOG_ENTRANCE: 'LOG_ENTRANCE',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  HANDLE_RELEASE_ANIM: 'HANDLE_RELEASE_ANIM',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  AWAIT_RELEASE_TWEEN: 'AWAIT_RELEASE_TWEEN',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  APPLY_HAZARDS: 'APPLY_HAZARDS',
  // fsm-unused-ok: Subestado Mermaid documental de micro-paso en diagrama de flujo
  OPEN_SWITCH_MENU: 'OPEN_SWITCH_MENU'
} as const;

export type BattleSubStateName = typeof BATTLE_SUBSTATES[keyof typeof BATTLE_SUBSTATES];
const BATTLE_SUBSTATES_SET: ReadonlySet<string> = new Set(Object.values(BATTLE_SUBSTATES)); // runtime-set

export function isBattleSubStateName(val: string): val is BattleSubStateName {
  return BATTLE_SUBSTATES_SET.has(val);
}

export function createBattleStateMachine() {
  const currentState = ref<BattleStateName>(BATTLE_STATES.EXIT_BATTLE);
  const currentSubState = ref<BattleSubStateName | null>(null);
  let transitionCall: gsap.core.Animation | null = null;

  // Simple strict transitions check based on the Mermaid diagram.
  const validTransitions: Record<string, ReadonlySet<string>> = {
    [BATTLE_STATES.CONTEXT_SETUP]: new Set([BATTLE_STATES.INITIALIZING]),
    [BATTLE_STATES.INITIALIZING]: new Set([BATTLE_STATES.CONTEXT_SETUP, BATTLE_STATES.FIRST_INTRO, BATTLE_STATES.SEARCH_PHASE]),
    [BATTLE_STATES.FIRST_INTRO]: new Set([BATTLE_STATES.ACTIVE_BATTLE, BATTLE_STATES.REORDER_TEAM]),
    [BATTLE_STATES.SEARCH_PHASE]: new Set([BATTLE_STATES.ACTIVE_BATTLE, BATTLE_STATES.EXIT_BATTLE, BATTLE_STATES.INITIALIZING, BATTLE_STATES.FIRST_INTRO, BATTLE_STATES.REWARDS_PHASE]),
    [BATTLE_STATES.ACTIVE_BATTLE]: new Set([BATTLE_STATES.REWARDS_PHASE, BATTLE_STATES.EXIT_BATTLE, BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ, BATTLE_STATES.LEVEL_UP_MODAL]), 
    [BATTLE_STATES.REWARDS_PHASE]: new Set([BATTLE_STATES.REORDER_TEAM, BATTLE_STATES.SEARCH_PHASE, BATTLE_STATES.INITIALIZING, BATTLE_STATES.EXIT_BATTLE, BATTLE_SUBSTATES.EMPTY_WAIT, BATTLE_SUBSTATES.DISTRIBUTE_XP, BATTLE_STATES.LEVEL_UP_MODAL]),
    [BATTLE_STATES.LEVEL_UP_MODAL]: new Set([BATTLE_STATES.REWARDS_PHASE, BATTLE_STATES.SEARCH_PHASE, BATTLE_STATES.INITIALIZING, BATTLE_STATES.ACTIVE_BATTLE]),
    [BATTLE_STATES.REORDER_TEAM]: new Set([BATTLE_STATES.SEARCH_PHASE, BATTLE_STATES.INITIALIZING, BATTLE_STATES.ACTIVE_BATTLE, BATTLE_STATES.EXIT_BATTLE]),
    [BATTLE_SUBSTATES.ENEMY_DEFEAT]: new Set([BATTLE_STATES.REWARDS_PHASE]),
    [BATTLE_SUBSTATES.PLAYER_FAINT_SEQ]: new Set([BATTLE_STATES.ACTIVE_BATTLE, BATTLE_STATES.EXIT_BATTLE]),
    [BATTLE_SUBSTATES.ESCAPE_PROCESS]: new Set([BATTLE_STATES.REWARDS_PHASE, BATTLE_STATES.EXIT_BATTLE]),
    [BATTLE_STATES.EXIT_BATTLE]: new Set([BATTLE_STATES.CONTEXT_SETUP, BATTLE_STATES.INITIALIZING, BATTLE_STATES.ACTIVE_BATTLE, BATTLE_STATES.SEARCH_PHASE])
  };

  let pendingResolve: (() => void) | null = null;

  /**
   * Translates to a specific state or substate.
   * If a delay is provided, returns a Promise that resolves when the transition happens.
   */
  const transition = (newState: BattleStateName | BattleSubStateName, newSubState: BattleSubStateName | null = null, delayMs: number = 0): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (transitionCall) {
        transitionCall.kill();
        transitionCall = null;
        if (pendingResolve) {
          pendingResolve();
          pendingResolve = null;
        }
      }

      pendingResolve = resolve;

      const executeTransition = () => {
        pendingResolve = null;
        // Validation check (can be expanded for strict enforcement)
        if (newState && isBattleStateName(newState)) {
          const isSameState = currentState.value === newState;
          const allowedTransitions = validTransitions[currentState.value];
          if (!isSameState && allowedTransitions && !allowedTransitions.has(newState) && newState !== BATTLE_STATES.EXIT_BATTLE) {
            logger.warn('FSM', `Unexpected transition: ${currentState.value} -> ${newState}`);
          }
          currentState.value = newState;
        } else if (newState && isBattleSubStateName(newState)) {
          // Si recibimos un sub-estado como primer argumento, mantenemos el estado actual 
          newSubState = newState;
        }

        if (newSubState) {
          currentSubState.value = newSubState;
        } else if (newState && currentState.value !== BATTLE_STATES.ACTIVE_BATTLE) {
          currentSubState.value = null; // Solo limpiamos substate si estamos cambiando de fase principal
        }

        logger.debug('Battle FSM', `Transitioned to ${currentState.value}${currentSubState.value ? ' (' + currentSubState.value + ')' : ''}`);
        resolve(undefined);
      };

      if (delayMs > 0) {
        transitionCall = gsap.delayedCall(delayMs / MS_PER_SECOND, executeTransition);
      } else {
        executeTransition();
      }
    });
  };

  const isState = (state: string) => currentState.value === state;
  const isSubState = (subState: string | null) => currentSubState.value === subState;

  return {
    currentState,
    currentSubState,
    transition,
    isState,
    isSubState
  };
}
