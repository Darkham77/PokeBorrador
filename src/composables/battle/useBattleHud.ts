import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useGameStore } from '@/stores/game'
import type { useBattleStore } from '@/stores/battle/battle'
import type { useBattleAnimations } from '@/composables/battle/useBattleAnimations'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

/**
 * Composable para gestionar la visibilidad y estados del HUD en combate.
 * Centraliza la lógica de supresión para evitar interferencias entre bandos.
 */
/**
 * Pure calculation helpers for HUD states to keep cyclomatic complexity low.
 */
function isSeatCapturing(seat: unknown): boolean {
  if (!seat || typeof seat !== 'object') return false
  const s = seat as { entry?: { isCaptureActive?: boolean; isAnimatingCapture?: boolean; animState?: string }; exit?: { isCaptureActive?: boolean; isAnimatingCapture?: boolean; animState?: string } }
  return !!(
    s.entry?.isCaptureActive || s.entry?.isAnimatingCapture || 
    s.exit?.isCaptureActive || s.exit?.isAnimatingCapture ||
    s.entry?.animState === 'catching' || s.exit?.animState === 'catching'
  )
}

const INIT_FSM_STATES_SET: ReadonlySet<string> = new Set<string>(['INITIALIZING', 'CONTEXT_SETUP', 'SEARCH_PHASE', 'FIRST_INTRO']); // runtime-set
const SILHOUETTE_FSM_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(['ENTRY_ANIM', 'ENCOUNTER_ANIM', 'PARALLEL_PREP', 'PARALLEL_ENTRY', 'SILHOUETTE_MODE', 'COMBAT_OR_FLEE']); // runtime-set

function checkScrambleState(subState: string | null | undefined, state: string | null | undefined): boolean {
  if (state && INIT_FSM_STATES_SET.has(state)) return true;
  return !!subState && SILHOUETTE_FSM_SUBSTATES_SET.has(subState);
}

const TECHNICAL_FSM_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(['RECEIVE_CONFIG', 'WEIGHT_CALCULATION', 'INJECT_FILTERS', 'READY_FOR_GEN']); // runtime-set
const TRAINER_VISIBLE_FSM_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(['ENCOUNTER_TYPE_CHECK', 'TRAINER_ENTRY', 'T_VISUAL', 'SHOW_DIALOGS', 'TRAINER_ENCOUNTER', 'RETREAT_AND_FADEOUT', 'T_RETREAT']); // runtime-set

function checkEnemyTechnicalHidden(subState: string | null | undefined, state: string | null | undefined, isTrainer: boolean): boolean {
  if (subState === 'GEN_TEAMS' || subState === 'MINIGAME_CHECK') return true;
  
  if (state === 'SEARCH_PHASE') {
    if (subState && TECHNICAL_FSM_SUBSTATES_SET.has(subState)) return true;
  }

  return isTrainer && !!subState && TRAINER_VISIBLE_FSM_SUBSTATES_SET.has(subState);
}

function checkFloatingState(p: { id?: string | number; ability?: string } | Pokemon | undefined | null): boolean {
  if (!p || p.id === undefined || p.id === null) return false;
  const data = pokemonDataProvider.getPokemonData(String(p.id));
  if (!data) return false;
  if (data.isFloating !== undefined) return data.isFloating;
  
  return data.type === 'flying' || data.type2 === 'flying' || p.ability === 'levitate';
}

const SILHOUETTE_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(['PARALLEL_PREP', 'PARALLEL_ENTRY', 'BUSH_VISIBLE', 'SILHOUETTE_MODE', 'COMBAT_OR_FLEE']); // runtime-set

const BUSH_BEHIND_STATES_SET: ReadonlySet<string> = new Set<string>(['ACTIVE_BATTLE', 'REORDER_TEAM', 'LEVEL_UP_MODAL', 'REWARDS_PHASE']); // runtime-set
const BUSH_BEHIND_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(['ENCOUNTER_ANIM', 'PARALLEL_JUMP', 'JUMP_SHADOW', 'REVEAL_COLORS', 'BUSH_FADE']); // runtime-set

const JUMPING_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(['ENCOUNTER_ANIM', 'PARALLEL_JUMP', 'JUMP_SHADOW']); // runtime-set
const PLAYER_TECH_HIDDEN_SET: ReadonlySet<string> = new Set<string>(['TRAINER_ENTRY', 'T_VISUAL']); // runtime-set

const ENCOUNTER_EXCLUDE_STATES_SET: ReadonlySet<string> = new Set<string>(['ACTIVE_BATTLE', 'REORDER_TEAM', 'REWARDS_PHASE', 'LEVEL_UP_MODAL', 'EXIT_BATTLE']); // runtime-set
const ENCOUNTER_ANIM_STATES_SET: ReadonlySet<string> = new Set<string>(['catching', 'trapped', 'releasing']); // runtime-set
const ENCOUNTER_ACTIVE_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(['PARALLEL_ENTRY', 'PARALLEL_JUMP', 'ENTRY_ANIM', 'ENCOUNTER_ANIM', 'COMBAT_OR_FLEE', 'WILD_ENTRY', 'BUSH_FADE', 'REVEAL_COLORS']); // runtime-set

/**
 * Composable para gestionar la visibilidad y estados del HUD en combate.
 * Centraliza la lógica de supresión para evitar interferencias entre bandos.
 */
export function useBattleHud(
  animations: ReturnType<typeof useBattleAnimations>, 
  battleStore: ReturnType<typeof useBattleStore>, 
  enemyRef: MaybeRefOrGetter<Pokemon | null | undefined>
) {
  const {
    isFaintInProgress,
    faintedPokemonSnapshot,
    caughtPokemonSnapshot,
    seats
  } = animations;

  const isEnemyHudSuppressed = computed(() => {
    const s = toValue(battleStore.state);
    if (s?.minigame === 'archaeology') return true;

    const seat = seats.value.seat2;
    const isCapturing = isSeatCapturing(seat);
    const isFainted = (s?.enemy && s.enemy.hp <= 0) || 
                      (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'enemy');

    if (isCapturing || isFainted) return true;

    const isTrainer = s?.isTrainer || s?.isGym || s?.isPvP;
    const fsmState = toValue(battleStore.fsm?.currentState);
    const fsmSub = toValue(battleStore.fsm?.currentSubState);
    if (isTrainer) {
      if (fsmState === 'SEARCH_PHASE' || fsmState === 'INITIALIZING') return true;
      if (fsmState === 'FIRST_INTRO' && fsmSub !== 'POKEMON_CALL') return true;
    }

    return !s?.enemy;
  });

  const isPlayerHudSuppressed = computed(() => {
    const s = toValue(battleStore.state);
    const seat = seats.value.seat1;
    const isCapturing = isSeatCapturing(seat);
    const isFainted = (s?.player && s.player.hp <= 0) || 
                      (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'player');

    if (isCapturing || isFainted) return true;
    return !s?.player;
  });

  const activeEnemyHudData = computed(() => {
    const state = toValue(battleStore.fsm?.currentState);
    if (state === 'REWARDS_PHASE' || state === 'LEVEL_UP_MODAL') return null;

    const enemySeat = seats.value.seat2;
    if (isSeatCapturing(enemySeat) && caughtPokemonSnapshot.value) return caughtPokemonSnapshot.value;
    if (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'enemy') return faintedPokemonSnapshot.value;
    
    return toValue(enemyRef) || toValue(battleStore.state)?._initialEnemy;
  });

  const activePlayerHudData = computed(() => {
    if (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'player') return faintedPokemonSnapshot.value;
    return toValue(battleStore.state)?.player || null;
  });

  const activePlayerData = computed(() => activePlayerHudData.value);

  const gs = useGameStore();
  
  const isWildEncounter = computed(() => {
    const state = toValue(battleStore.state);
    return state ? (!state.isTrainer && !state.isGym) : !!toValue(battleStore.isSearching);
  });

  const shouldScrambleEnemyData = computed(() => {
    const subState = toValue(battleStore.fsm?.currentSubState);
    const state = toValue(battleStore.fsm?.currentState);
    const inventory = gs.state.inventory || {};
    if (isWildEncounter.value && (inventory.binoculars || 0) > 0) return false;

    return checkScrambleState(subState, state);
  });

  const activeEnemyData = computed(() => {
    const s = toValue(battleStore.fsm?.currentState);
    const sub = toValue(battleStore.fsm?.currentSubState);

    if (s === 'REWARDS_PHASE' && sub === 'EMPTY_WAIT') return null;
    
    const realEnemy = activeEnemyHudData.value;
    if (!realEnemy && (s === 'FIRST_INTRO' || s === 'SEARCH_PHASE' || s === 'INITIALIZING')) {
      return toValue(battleStore.state)?._initialEnemy || null;
    }

    return realEnemy;
  });

  const activeEnemyIsSilhouette = computed(() => {
    const s = toValue(battleStore.state);
    if (s?.isTrainer || s?.isGym || s?.isPvP) return false;

    if (animations.isWildSilhouette.value) return true;
    if (toValue(battleStore.isSilhouetteMode)) return true;
    const state = toValue(battleStore.fsm?.currentState);
    if (state === 'SEARCH_PHASE') {
      if (s && !s.isTrainer && !s.isGym) return true;
    }
    const sub = toValue(battleStore.fsm?.currentSubState);
    return !!sub && SILHOUETTE_SUBSTATES_SET.has(sub);
  });

  const bushIsBehind = computed(() => {
    if (animations.isEmerging.value || animations.isWildEntryAnimation.value) return true;
    const state = toValue(battleStore.currentFsmState) || (battleStore.fsm?.currentState ? toValue(battleStore.fsm.currentState) : null);
    if (state && BUSH_BEHIND_STATES_SET.has(state)) return true;

    const sub = toValue(battleStore.currentSubState) || (battleStore.fsm?.currentSubState ? toValue(battleStore.fsm.currentSubState) : null);
    return sub !== null && BUSH_BEHIND_SUBSTATES_SET.has(String(sub));
  });

  const enemyIsJumping = computed(() => {
    const sub = toValue(battleStore.currentSubState) || (battleStore.fsm?.currentSubState ? toValue(battleStore.fsm.currentSubState) : null);
    if (!sub) return false;
    return animations.isEmerging.value && JUMPING_SUBSTATES_SET.has(sub);
  });

  const isInstantBush = computed(() => {
    if (animations.isInitialLoad.value) return true;
    if (toValue(battleStore.isSearching)) return false;
    const sub = toValue(battleStore.fsm?.currentSubState);
    return toValue(battleStore.fsm?.currentState) === 'FIRST_INTRO' || sub === 'PREPARATION' || sub === 'ENTRY_ANIM';
  });

  const enemyIsFloating = computed(() => checkFloatingState(activeEnemyData.value));

  const isEnemyTechnicalHidden = computed(() => {
    const sub = toValue(battleStore.fsm?.currentSubState);
    const state = toValue(battleStore.fsm?.currentState);
    const battleState = toValue(battleStore.state);
    const isTrainer = !!(battleState?.isTrainer || battleState?.isGym);
    return checkEnemyTechnicalHidden(sub, state, isTrainer);
  });

  const isPlayerTechnicalHidden = computed(() => {
    const sub = toValue(battleStore.currentSubState);
    const state = toValue(battleStore.state);
    const isTrainer = state?.isTrainer || state?.isGym;
    return !!isTrainer && !!sub && PLAYER_TECH_HIDDEN_SET.has(sub);
  });

  const shouldShowEncounterLayers = computed(() => {
    const state = toValue(battleStore.fsm?.currentState);
    if (state && ENCOUNTER_EXCLUDE_STATES_SET.has(state)) {
      return false;
    }

    const animState = animations.enemyAnimState.value;
    if (animState && ENCOUNTER_ANIM_STATES_SET.has(animState)) return false;
    if (animations.isCaptureSequenceActive.value || animations.isFaintInProgress.value) return false;
    if (enemyIsFloating.value) return false;

    const fsmSub = toValue(battleStore.fsm?.currentSubState);
    if (fsmSub && ENCOUNTER_ACTIVE_SUBSTATES_SET.has(fsmSub)) {
      return isWildEncounter.value;
    }

    return isWildEncounter.value && (toValue(battleStore.isSearching) || animations.wildRevealActive.value);
  });

  return {
    isEnemyHudSuppressed,
    isPlayerHudSuppressed,
    activeEnemyHudData,
    shouldScrambleEnemyData,
    activeEnemyData,
    activePlayerData,
    activeEnemyIsSilhouette,
    bushIsBehind,
    enemyIsJumping,
    isInstantBush,
    enemyIsFloating,
    isWildEncounter,
    isEnemyTechnicalHidden,
    isPlayerTechnicalHidden,
    shouldShowEncounterLayers
  };
}

