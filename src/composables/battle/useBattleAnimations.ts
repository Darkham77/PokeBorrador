import {
  ref,
  computed,
  watch,
  toValue,
  type ComputedRef,
  type Ref,
  type MaybeRefOrGetter
} from 'vue';

import {
  useBattleCaptureAnimations,
  type UseBattleCaptureAnimationsReturn
} from '@/composables/battle/useBattleCaptureAnimations';
import {
  isTrainerTransitionActive,
  useBattleTrainerAnimations
} from '@/composables/battle/useBattleTrainerAnimations';
import { useBattleWildAnimations } from '@/composables/battle/useBattleWildAnimations';
import { gameBus } from '@/logic/events/gameBus';
import type { useBattleStore } from '@/stores/battle/battle';
import type { BattleSide } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

import {
  dispatchBattleAnimationState,
  type BattleAnimationContext
} from './battleAnimationStateDispatcher.ts';

export interface UseBattleAnimationsReturn
  extends
    Omit<UseBattleCaptureAnimationsReturn, 'resetCaptureStates'>,
    Omit<ReturnType<typeof useBattleWildAnimations>, 'resetWildStates'> {
  trainerAnimState: ReturnType<typeof useBattleTrainerAnimations>['trainerAnimState'];
  isTrainerVisible: ReturnType<typeof useBattleTrainerAnimations>['isTrainerVisible'];
  isGlobalFadeActive: Ref<boolean>;
  isIntroInProgress: ComputedRef<boolean>;
  resetAll: () => void;
  revealWildPokemon: () => Promise<void>;
  triggerWildEmergence: (onComplete?: () => void) => Promise<void>;
  triggerSearchEncounter: () => Promise<void>;
  triggerTrainerEntry: (type?: string, onComplete?: () => void) => Promise<void>;
  triggerTrainerDialogs: (dialogs?: string[]) => Promise<void>;
  triggerTrainerRetreat: (onComplete?: () => void) => Promise<void>;
  triggerTrainerExit: (onComplete?: () => void) => Promise<void>;
  triggerPokemonCall: (options?: { onComplete?: () => void }) => Promise<void>;
  isPlayerSpriteSuppressed: ComputedRef<boolean>;
  triggerFlinchAnim: (side: BattleSide) => Promise<void>;
}

export function useBattleAnimations(
  battleStore: ReturnType<typeof useBattleStore>,
  enemyRef: MaybeRefOrGetter<Pokemon | null | undefined>
): UseBattleAnimationsReturn {
  // 1. Capture Domain delegation
  const captureAnims = useBattleCaptureAnimations(battleStore, enemyRef);
  const {
    caughtPokemonSnapshot,
    isFaintInProgress,
    faintedPokemonSnapshot,
    catchSparkles,
    isCriticalCaptureActive,
    seats,
    playerAnimState,
    enemyAnimState,
    playerActivePokeballId,
    enemyActivePokeballId,
    playerCaptureActive,
    enemyCaptureActive,
    playerIsShaking,
    playerIsBlinking,
    enemyIsShaking,
    enemyIsBlinking,
    isCaptureSequenceActive,
    triggerCatchSparkles,
    triggerCriticalCaptureFx,
    handleReleaseRequest,
    handleCatchRequest,
    handleShakeRequest,
    handleBlinkRequest,
    handleFlinchRequest,
    handleHealRequest,
    handleFaintAnim,
    playCatchCelebration,
    playBallFadeOut,
    resetCaptureStates,
    getPokemonAnimState,
    getPokemonBallId,
    getPokemonCaptureActive,
    getPokemonIsShaking,
    getPokemonIsBlinking,
    getPokemonIsHealing,
    awaitTween
  } = captureAnims;

  // 2. Trainer Domain delegation
  const trainerAnims = useBattleTrainerAnimations(seats, battleStore);
  const {
    trainerAnimState,
    isTrainerVisible,
    triggerTrainerEntry,
    triggerTrainerDialogs,
    triggerTrainerRetreat,
    triggerTrainerExit,
    triggerPokemonCall,
    resetTrainerStates
  } = trainerAnims;

  // 3. Wild Domain delegation
  const wildAnims = useBattleWildAnimations(enemyRef);
  const {
    isWildEntryAnimation,
    isEmerging,
    isWildSilhouette,
    wildRevealActive,
    upcomingIsEmerging,
    isWildSilhouetteHalfway,
    isInitialLoad,
    silhouetteOpacity,
    revealWildPokemon,
    triggerWildEmergence,
    triggerSearchEncounter,
    resetWildStates
  } = wildAnims;

  // 4. Global transition
  const isGlobalFadeActive = ref(false);

  const isIntroInProgress = computed(() => {
    const s = toValue(battleStore.currentFsmState);
    return (
      s === 'INITIALIZING' ||
      s === 'FIRST_INTRO' ||
      isWildEntryAnimation.value ||
      wildRevealActive.value ||
      isEmerging.value ||
      upcomingIsEmerging.value ||
      isTrainerTransitionActive(trainerAnimState.value) ||
      isCaptureSequenceActive.value
    );
  });

  const isPlayerSpriteSuppressed = computed(() => {
    return !toValue(battleStore.player);
  });

  const resetAll = (): void => {
    resetWildStates();
    resetTrainerStates();
    resetCaptureStates();
  };

  const animContext: BattleAnimationContext = {
    battleStore,
    isGlobalFadeActive,
    isWildSilhouette,
    wildRevealActive,
    isWildEntryAnimation,
    isEmerging,
    upcomingIsEmerging,
    silhouetteOpacity,
    trainerAnimState,
    isTrainerVisible,
    seats,
    resetAll,
    isTrainerTransitionActive
  };

  // FSM Watcher for sync
  watch(
    () => [toValue(battleStore.currentFsmState), toValue(battleStore.currentSubState)],
    ([state, sub]) => {
      dispatchBattleAnimationState(state, sub, animContext);
    },
    { immediate: true }
  );

  const registeredListeners: { event: string; callback: EventListener }[] = [];

  const addBusListener = (event: string, callback: EventListener): void => {
    gameBus.on(event, callback);
    registeredListeners.push({ event, callback });
  };

  const cleanupListeners = (): void => {
    if (captureAnims.cleanupListeners) {
      captureAnims.cleanupListeners();
    }
    while (registeredListeners.length > 0) {
      const entry = registeredListeners.pop();
      if (entry) {
        gameBus.off(entry.event, entry.callback);
      }
    }
  };

  const initListeners = (): void => {
    cleanupListeners();

    if (captureAnims.initListeners) {
      captureAnims.initListeners();
    }

    const handleWithdrawRequest = captureAnims.handleWithdrawRequest;
    addBusListener('PLAY_CATCH_ENERGY', (e: Event) =>
      handleCatchRequest((e as CustomEvent).detail as Parameters<typeof handleCatchRequest>[0])
    );
    addBusListener('PLAY_WITHDRAW', (e: Event) =>
      handleWithdrawRequest(
        (e as CustomEvent).detail as Parameters<typeof handleWithdrawRequest>[0]
      )
    );
    addBusListener('PLAY_RELEASE_ENERGY', (e: Event) =>
      handleReleaseRequest((e as CustomEvent).detail as Parameters<typeof handleReleaseRequest>[0])
    );
    addBusListener('PLAY_SEND_OUT', (e: Event) =>
      handleReleaseRequest((e as CustomEvent).detail as Parameters<typeof handleReleaseRequest>[0])
    );

    addBusListener('PLAY_DAMAGE', (e: Event) =>
      handleShakeRequest((e as CustomEvent).detail as Parameters<typeof handleShakeRequest>[0])
    );
    addBusListener('PLAY_BLINK', (e: Event) =>
      handleBlinkRequest((e as CustomEvent).detail as Parameters<typeof handleBlinkRequest>[0])
    );
    addBusListener('PLAY_FLINCH', (e: Event) =>
      handleFlinchRequest((e as CustomEvent).detail as Parameters<typeof handleFlinchRequest>[0])
    );
    addBusListener('PLAY_HEAL', (e: Event) =>
      handleHealRequest((e as CustomEvent).detail as Parameters<typeof handleHealRequest>[0])
    );

    addBusListener('CATCH_SHAKE', async (e: Event) => {
      const detail = (e as CustomEvent<Record<string, unknown>>).detail;
      const side =
        (typeof detail === 'string' ? detail : (detail?.side as string | undefined)) || 'enemy';
      await handleShakeRequest({ side, isCapture: true });
      await handleBlinkRequest(side);
    });

    addBusListener('CATCH_SUCCESS', async (e: Event) => {
      const data = (e as CustomEvent).detail as string | { side?: string } | undefined;
      const side = typeof data === 'string' ? data : data?.side || 'enemy';
      await playCatchCelebration(side);
    });

    addBusListener('POKEMON_FAINT', (e: Event) =>
      handleFaintAnim((e as CustomEvent).detail as Parameters<typeof handleFaintAnim>[0])
    );
    addBusListener('PLAY_FAINT', (e: Event) =>
      handleFaintAnim((e as CustomEvent).detail as Parameters<typeof handleFaintAnim>[0])
    );
    addBusListener('ENCOUNTER_ANIM', () => triggerSearchEncounter());

    addBusListener('PLAY_ESCAPE_ANIM', async (e: Event) => {
      const data = (e as CustomEvent).detail as
        | string
        | { side?: string; type?: string; pokemon?: Pokemon }
        | undefined;
      const side = typeof data === 'string' ? data : data?.side || 'player';
      const type = (typeof data === 'object' && data?.type) || 'flee';
      const pokemon =
        (typeof data === 'object' && data?.pokemon) ||
        (side === 'player' ? toValue(battleStore.player) : toValue(battleStore.enemy));

      if ((side === 'player' && type === 'flee') || type === 'withdraw') {
        await handleWithdrawRequest({ side: 'player', pokemon: pokemon || undefined });
        return;
      }

      gameBus.emit('TRIGGER_COMBATANT_ESCAPE', { side, pokemon: pokemon || undefined, type });
    });

    addBusListener('START_BATTLE', (_e: Event) => {
      Object.values(seats.value).forEach((seat) => {
        if (seat) {
          seat.entry.isCaptureActive = false;
          seat.entry.ballId = 'pokeball';
          seat.entry.animState = null;
          seat.exit.isCaptureActive = false;
          seat.exit.ballId = 'pokeball';
          seat.exit.animState = null;
        }
      });
      resetCaptureStates();
    });
  };

  return {
    isWildEntryAnimation,
    silhouetteOpacity,
    isEmerging,
    isWildSilhouette,
    wildRevealActive,
    upcomingIsEmerging,
    isWildSilhouetteHalfway,
    isInitialLoad,
    isCaptureSequenceActive,
    caughtPokemonSnapshot,
    isFaintInProgress,
    faintedPokemonSnapshot,
    seats,
    playerAnimState,
    enemyAnimState,
    playerActivePokeballId,
    enemyActivePokeballId,
    catchSparkles,
    playerCaptureActive,
    enemyCaptureActive,
    playerIsShaking,
    playerIsBlinking,
    enemyIsShaking,
    enemyIsBlinking,
    trainerAnimState,
    isTrainerVisible,
    isGlobalFadeActive,
    isIntroInProgress,
    resetAll,
    revealWildPokemon,
    triggerWildEmergence,
    triggerSearchEncounter,
    triggerTrainerEntry,
    triggerTrainerDialogs,
    triggerTrainerRetreat,
    triggerTrainerExit,
    triggerPokemonCall,
    triggerCatchSparkles,
    triggerCriticalCaptureFx,
    isCriticalCaptureActive,
    initListeners,
    cleanupListeners,
    isPlayerSpriteSuppressed,
    handleFaintAnim,
    handleCatchRequest,
    handleReleaseRequest,
    handleWithdrawRequest: captureAnims.handleWithdrawRequest,
    handleShakeRequest,
    playCatchCelebration,
    playBallFadeOut,
    getPokemonAnimState,
    getPokemonBallId,
    getPokemonCaptureActive,
    getPokemonIsShaking,
    getPokemonIsBlinking,
    getPokemonIsHealing,
    handleHealRequest,
    handleBlinkRequest,
    handleFlinchRequest,
    triggerFlinchAnim: handleFlinchRequest,
    awaitTween
  };
}
