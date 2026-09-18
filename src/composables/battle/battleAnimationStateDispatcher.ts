import type { Ref } from 'vue';
import { gsap } from 'gsap';
import { logger } from '@/logic/utils/logger';
import type { useBattleStore } from '@/stores/battle/battle';
import type { TrainerAnimationState } from './useBattleTrainerAnimations.ts';

export interface BattleAnimSeatState {
  entry: { animState?: string | null; pokemonUid?: string | null };
  exit: { animState?: string | null; pokemonUid?: string | null };
}

export interface BattleAnimationContext {
  battleStore: ReturnType<typeof useBattleStore>;
  isGlobalFadeActive: Ref<boolean>;
  isWildSilhouette: Ref<boolean>;
  wildRevealActive: Ref<boolean>;
  isWildEntryAnimation: Ref<boolean>;
  isEmerging: Ref<boolean>;
  upcomingIsEmerging: Ref<boolean>;
  silhouetteOpacity: Ref<number>;
  trainerAnimState: Ref<TrainerAnimationState | null>;
  isTrainerVisible: Ref<boolean>;
  seats: Ref<Record<string, BattleAnimSeatState>>;
  resetAll: () => void;
  isTrainerTransitionActive: (state: TrainerAnimationState | null) => boolean;
}

const CLEANUP_STATES = ['CONTEXT_SETUP', 'EXIT_BATTLE'] as const;
const CLEANUP_STATES_SET: ReadonlySet<string> = new Set<string>(CLEANUP_STATES); // runtime-set: Fast O(1) membership lookup set

const DEFEAT_SUBSTATES = ['DEFEAT_SCREEN', 'DEFEAT_WAIT'] as const;
const DEFEAT_SUBSTATES_SET: ReadonlySet<string> = new Set<string>(DEFEAT_SUBSTATES); // runtime-set: Fast O(1) membership lookup set

function checkIsTrainer(state: { isTrainer?: boolean; isGym?: boolean; isPvP?: boolean } | null | undefined): boolean {
  if (!state) return false;
  return Boolean(state.isTrainer || state.isGym || state.isPvP);
}

function clearSeatAnimStates(seatsMap: Record<string, BattleAnimSeatState>): void {
  for (const seat of Object.values(seatsMap)) {
    if (seat) {
      seat.entry.animState = null;
      seat.exit.animState = null;
    }
  }
}

function clearOrphanSeatAnimStates(seatsMap: Record<string, BattleAnimSeatState>): void {
  for (const seat of Object.values(seatsMap)) {
    if (seat) {
      if (!seat.entry.pokemonUid) seat.entry.animState = null;
      if (!seat.exit.pokemonUid) seat.exit.animState = null;
    }
  }
}

function handleParallelPrep(ctx: BattleAnimationContext): void {
  const isTrainer = checkIsTrainer(ctx.battleStore.state);
  ctx.isWildSilhouette.value = !isTrainer;
  ctx.wildRevealActive.value = !isTrainer;
  ctx.isWildEntryAnimation.value = false;
}

function handlePokemonCall(ctx: BattleAnimationContext): void {
  ctx.isWildSilhouette.value = false;
  ctx.wildRevealActive.value = false;
  ctx.isWildEntryAnimation.value = false;
  ctx.isEmerging.value = false;
  ctx.silhouetteOpacity.value = 1;
}

function handleEntryAnim(ctx: BattleAnimationContext): void {
  ctx.isWildSilhouette.value = true;
  ctx.wildRevealActive.value = true;
  ctx.isWildEntryAnimation.value = false;

  const stateObj = ctx.battleStore.state;
  if (stateObj && !stateObj.isTrainer && !stateObj.isGym) {
    ctx.silhouetteOpacity.value = 0;
    gsap.killTweensOf(ctx.silhouetteOpacity);
    gsap.to(ctx.silhouetteOpacity, {
      value: 1,
      delay: 0.2,
      duration: 0.4,
      ease: 'power1.inOut'
    });
  } else if (stateObj && (stateObj.isTrainer || stateObj.isGym)) {
    ctx.isWildSilhouette.value = false;
    ctx.wildRevealActive.value = false;
    ctx.isTrainerVisible.value = true;
    ctx.trainerAnimState.value = 'entering';
  }
}

function handleWildJump(ctx: BattleAnimationContext): void {
  ctx.isWildEntryAnimation.value = true;
  ctx.wildRevealActive.value = true;
  ctx.silhouetteOpacity.value = 1;
  ctx.isWildSilhouette.value = true;
  ctx.isEmerging.value = true;
}

function handleRevealColors(ctx: BattleAnimationContext): void {
  ctx.isWildEntryAnimation.value = true;
  ctx.wildRevealActive.value = false;
  ctx.isWildSilhouette.value = false;
  ctx.isEmerging.value = false;
}

function handleTrainerEntry(ctx: BattleAnimationContext): void {
  ctx.trainerAnimState.value = 'entering';
  ctx.isTrainerVisible.value = true;
}

function handleTrainerRetreat(ctx: BattleAnimationContext): void {
  ctx.trainerAnimState.value = 'retreating';
}

function handleWaitInput(ctx: BattleAnimationContext): void {
  ctx.isWildEntryAnimation.value = false;
  ctx.wildRevealActive.value = false;
  ctx.isEmerging.value = false;
  ctx.upcomingIsEmerging.value = false;
  ctx.isWildSilhouette.value = false;
  ctx.silhouetteOpacity.value = 1;
  if (ctx.isTrainerTransitionActive(ctx.trainerAnimState.value)) {
    ctx.trainerAnimState.value = 'idle';
  }
}

function handleEmptyWait(ctx: BattleAnimationContext): void {
  ctx.isEmerging.value = false;
  ctx.isWildEntryAnimation.value = false;
  ctx.wildRevealActive.value = false;
  ctx.isWildSilhouette.value = false;
  clearSeatAnimStates(ctx.seats.value);
}

const SUBSTATE_HANDLERS: Readonly<Record<string, (ctx: BattleAnimationContext) => void>> = {
  PARALLEL_PREP: handleParallelPrep,
  PARALLEL_ENTRY: handleParallelPrep,
  WILD_ENTRY: handleParallelPrep,
  COMBAT_OR_FLEE: handleParallelPrep,
  SILHOUETTE_MODE: handleParallelPrep,
  POKEMON_CALL: handlePokemonCall,
  ENTRY_ANIM: handleEntryAnim,
  PARALLEL_JUMP: handleWildJump,
  ENCOUNTER_ANIM: handleWildJump,
  JUMP_SHADOW: handleWildJump,
  JUMP_COLOR: handleWildJump,
  BUSH_FADE: handleWildJump,
  REVEAL_COLORS: handleRevealColors,
  TRAINER_ENTRY: handleTrainerEntry,
  T_VISUAL: handleTrainerEntry,
  T_RETREAT: handleTrainerRetreat,
  RETREAT_AND_FADEOUT: handleTrainerRetreat,
  WAIT_INPUT: handleWaitInput,
  EMPTY_WAIT: handleEmptyWait
};

function handleCleanupState(state: string, subState: string, ctx: BattleAnimationContext): void {
  ctx.isGlobalFadeActive.value = Boolean(state === 'EXIT_BATTLE' && !DEFEAT_SUBSTATES_SET.has(subState));
  const bState = ctx.battleStore.state;
  const isWild = bState ? !bState.isTrainer && !bState.isGym : false;
  const isSearching = Boolean(bState?.wasSearching || ctx.battleStore.isSearching);
  const wasPreCombatWild = isWild && !ctx.isWildEntryAnimation.value && isSearching;
  ctx.resetAll();
  if (wasPreCombatWild) {
    ctx.isWildSilhouette.value = true;
  }
}

function handleInitState(ctx: BattleAnimationContext): void {
  const isTrainer = checkIsTrainer(ctx.battleStore.state);
  ctx.isWildSilhouette.value = !isTrainer;
  ctx.wildRevealActive.value = !isTrainer;
  ctx.isWildEntryAnimation.value = false;
  ctx.isEmerging.value = false;
  ctx.silhouetteOpacity.value = 0;
  ctx.trainerAnimState.value = null;
  ctx.isTrainerVisible.value = false;
}

export function dispatchBattleAnimationState(
  state: string | null | undefined,
  sub: string | null | undefined,
  ctx: BattleAnimationContext
): void {
  if (!state) return;

  const subState = sub || '';
  if (CLEANUP_STATES_SET.has(state)) {
    handleCleanupState(state, subState, ctx);
    return;
  }

  if (sub) logger.debug('useBattleAnimations', `SubState: ${sub}`);

  if (state === 'INITIALIZING' || state === 'CONTEXT_SETUP') {
    handleInitState(ctx);
  }

  if (sub === null || sub === undefined) {
    clearOrphanSeatAnimStates(ctx.seats.value);
    ctx.isEmerging.value = false;
    ctx.isWildEntryAnimation.value = false;
    return;
  }

  const handler = SUBSTATE_HANDLERS[sub];
  if (handler) {
    handler(ctx);
  }
}
