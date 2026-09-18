import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useGameStore } from '@/stores/game';
import type { useBattleStore } from '@/stores/battle/battle';
import type { useBattleAnimations } from '@/composables/battle/useBattleAnimations';
import type { Pokemon } from '@/types/pokemon/pokemon';
import {
  checkEnemyTechnicalHidden,
  checkFloatingState,
  checkScrambleState,
  isBushBehindCheck,
  isCombatantFaintedOrCapturing,
  isEnemyHudSuppressedCheck,
  isEnemyJumpingCheck,
  isPlayerTechHiddenCheck,
  buildActiveEnemyData,
  buildActiveEnemyHudData,
  buildActiveEnemyIsSilhouette,
  shouldShowEncounterLayersCheck
} from './battleHudStateHelper.ts';

interface TrainerModeCheckable {
  isTrainer?: boolean;
  isGym?: boolean;
  isPvP?: boolean;
  isRival?: boolean;
}

function isTrainerMode(state: TrainerModeCheckable | null | undefined): boolean {
  if (!state) return false;
  return Boolean(state.isTrainer || state.isGym || state.isPvP || state.isRival);
}

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

  const isTrainer = computed(() => isTrainerMode(toValue(battleStore.state)));

  const isEnemyHudSuppressed = computed(() => {
    const s = toValue(battleStore.state);
    const fsmState = toValue(battleStore.fsm?.currentState);
    const fsmSub = toValue(battleStore.fsm?.currentSubState);
    const faintedSide = faintedPokemonSnapshot.value ? faintedPokemonSnapshot.value.side : undefined;

    return isEnemyHudSuppressedCheck(
      s ? s.minigame : undefined,
      fsmState,
      fsmSub,
      isTrainer.value,
      seats.value.seat2,
      s ? s.enemy : undefined,
      isFaintInProgress.value,
      faintedSide
    );
  });

  const isPlayerHudSuppressed = computed(() => {
    const s = toValue(battleStore.state);
    if (toValue(battleStore.fsm?.currentState) === 'CONTEXT_SETUP') return true;

    const player = s ? s.player : undefined;
    const faintedSide = faintedPokemonSnapshot.value ? faintedPokemonSnapshot.value.side : undefined;

    const isFaintedOrCapturing = isCombatantFaintedOrCapturing(
      seats.value.seat1,
      player,
      isFaintInProgress.value,
      faintedSide,
      'player'
    );
    return isFaintedOrCapturing || !player;
  });

  const activeEnemyHudData = computed(() => {
    return buildActiveEnemyHudData(
      toValue(battleStore.fsm?.currentState),
      toValue(battleStore.fsm?.currentSubState),
      isTrainer.value,
      seats.value.seat2,
      caughtPokemonSnapshot.value,
      isFaintInProgress.value,
      faintedPokemonSnapshot.value,
      toValue(enemyRef)
    );
  });

  const activePlayerHudData = computed(() => {
    if (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'player') return faintedPokemonSnapshot.value;
    const s = toValue(battleStore.state);
    return s ? s.player : null;
  });

  const activePlayerData = computed(() => activePlayerHudData.value);

  const gs = useGameStore();
  
  const isWildEncounter = computed(() => {
    const state = toValue(battleStore.state);
    return state ? (!state.isTrainer && !state.isGym) : Boolean(toValue(battleStore.isSearching));
  });

  const shouldScrambleEnemyData = computed(() => {
    const subState = toValue(battleStore.fsm?.currentSubState);
    const state = toValue(battleStore.fsm?.currentState);
    const inventory = gs.state.inventory || {};
    if (isWildEncounter.value && (inventory.binoculars || 0) > 0) return false;

    return checkScrambleState(subState, state);
  });

  const activeEnemyData = computed(() => {
    return buildActiveEnemyData(
      toValue(battleStore.fsm?.currentState),
      toValue(battleStore.fsm?.currentSubState),
      isTrainer.value,
      activeEnemyHudData.value
    );
  });

  const activeEnemyIsSilhouette = computed(() => {
    const s = toValue(battleStore.state);
    const isTrainerVal = s ? Boolean(s.isTrainer) : false;
    const isGymVal = s ? Boolean(s.isGym) : false;
    const isPvPVal = s ? Boolean(s.isPvP) : false;
    const wasSearchingVal = s ? Boolean(s.wasSearching) : false;

    return buildActiveEnemyIsSilhouette(
      isTrainerVal,
      isGymVal,
      isPvPVal,
      animations.isWildSilhouette.value,
      Boolean(toValue(battleStore.isSilhouetteMode)),
      wasSearchingVal,
      Boolean(toValue(battleStore.isSearching)),
      toValue(battleStore.currentFsmState) || toValue(battleStore.fsm?.currentState),
      toValue(battleStore.currentSubState) || toValue(battleStore.fsm?.currentSubState),
      animations.isWildEntryAnimation.value
    );
  });

  const bushIsBehind = computed(() => {
    const state = toValue(battleStore.currentFsmState) || (battleStore.fsm?.currentState ? toValue(battleStore.fsm.currentState) : null);
    const sub = toValue(battleStore.currentSubState) || (battleStore.fsm?.currentSubState ? toValue(battleStore.fsm.currentSubState) : null);
    return isBushBehindCheck(animations.isEmerging.value, animations.isWildEntryAnimation.value, state, sub ? String(sub) : null);
  });

  const enemyIsJumping = computed(() => {
    const sub = toValue(battleStore.currentSubState) || (battleStore.fsm?.currentSubState ? toValue(battleStore.fsm.currentSubState) : null);
    return isEnemyJumpingCheck(animations.isEmerging.value, sub);
  });

  const isInstantBush = computed(() => {
    if (animations.isInitialLoad.value) return true;
    if (toValue(battleStore.isSearching)) return false;
    const sub = toValue(battleStore.fsm?.currentSubState);
    const currentFsm = toValue(battleStore.fsm?.currentState);
    return currentFsm === 'FIRST_INTRO' || sub === 'PREPARATION' || sub === 'ENTRY_ANIM';
  });

  const enemyIsFloating = computed(() => checkFloatingState(activeEnemyData.value));

  const isEnemyTechnicalHidden = computed(() => {
    const sub = toValue(battleStore.fsm?.currentSubState);
    const state = toValue(battleStore.fsm?.currentState);
    const battleState = toValue(battleStore.state);
    const isTrainerModeFlag = Boolean(battleState?.isTrainer || battleState?.isGym);
    return checkEnemyTechnicalHidden(sub, state, isTrainerModeFlag);
  });

  const isPlayerTechnicalHidden = computed(() => {
    const sub = toValue(battleStore.currentSubState);
    const state = toValue(battleStore.state);
    const isTrainerModeFlag = Boolean(state?.isTrainer || state?.isGym);
    return isPlayerTechHiddenCheck(isTrainerModeFlag, sub);
  });

  const shouldShowEncounterLayers = computed(() => {
    const state = toValue(battleStore.fsm?.currentState);
    const animState = animations.enemyAnimState.value;
    const fsmSub = toValue(battleStore.fsm?.currentSubState);
    const isSearching = Boolean(toValue(battleStore.isSearching));

    return shouldShowEncounterLayersCheck(
      Boolean(activeEnemyData.value),
      state,
      animState,
      animations.isCaptureSequenceActive.value,
      animations.isFaintInProgress.value,
      enemyIsFloating.value,
      fsmSub,
      isWildEncounter.value,
      isSearching,
      animations.wildRevealActive.value
    );
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
