import { ref, computed, watch, toValue, type MaybeRefOrGetter } from 'vue';
import { gameBus } from '@/logic/events/gameBus';
import type { useBattleStore } from '@/stores/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { useBattleCaptureAnimations } from '@/composables/battle/useBattleCaptureAnimations';
import { isTrainerTransitionActive, useBattleTrainerAnimations } from '@/composables/battle/useBattleTrainerAnimations';
import { useBattleWildAnimations } from '@/composables/battle/useBattleWildAnimations';
import {
  dispatchBattleAnimationState,
  type BattleAnimationContext
} from './battleAnimationStateDispatcher.ts';

export function useBattleAnimations(
  battleStore: ReturnType<typeof useBattleStore>, 
  enemyRef: MaybeRefOrGetter<Pokemon | null | undefined>
) {
  // 1. Capture Domain delegation
  const captureAnims = useBattleCaptureAnimations(battleStore, enemyRef)
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
  } = captureAnims

  // 2. Trainer Domain delegation
  const trainerAnims = useBattleTrainerAnimations(seats, battleStore)
  const {
    trainerAnimState,
    isTrainerVisible,
    triggerTrainerEntry,
    triggerTrainerDialogs,
    triggerTrainerRetreat,
    triggerTrainerExit,
    triggerPokemonCall,
    resetTrainerStates
  } = trainerAnims

  // 3. Wild Domain delegation
  const wildAnims = useBattleWildAnimations(enemyRef)
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
  } = wildAnims

  // 4. Global transition
  const isGlobalFadeActive = ref(false)

  const isIntroInProgress = computed(() => {
    const s = toValue(battleStore.currentFsmState)
    return s === 'INITIALIZING' ||
           s === 'FIRST_INTRO' ||
           isWildEntryAnimation.value || 
           wildRevealActive.value || 
           isEmerging.value || 
           upcomingIsEmerging.value || 
           isTrainerTransitionActive(trainerAnimState.value) ||
           isCaptureSequenceActive.value
  })

  const isPlayerSpriteSuppressed = computed(() => {
    return !toValue(battleStore.player)
  })

  const resetAll = () => {
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

  const registeredListeners: { event: string; callback: EventListener }[] = []

  const addBusListener = (event: string, callback: EventListener) => {
    gameBus.on(event, callback)
    registeredListeners.push({ event, callback })
  }

  const cleanupListeners = () => {
    if (captureAnims.cleanupListeners) {
      captureAnims.cleanupListeners()
    }
    while (registeredListeners.length > 0) {
      const entry = registeredListeners.pop()
      if (entry) {
        gameBus.off(entry.event, entry.callback)
      }
    }
  }

  const initListeners = () => {
    cleanupListeners()

    if (captureAnims.initListeners) {
      captureAnims.initListeners()
    }

    const handleWithdrawRequest = captureAnims.handleWithdrawRequest
    addBusListener('PLAY_CATCH_ENERGY', ((e: Event) => handleCatchRequest((e as CustomEvent).detail as Parameters<typeof handleCatchRequest>[0])) as EventListener)
    addBusListener('PLAY_WITHDRAW', ((e: Event) => handleWithdrawRequest((e as CustomEvent).detail as Parameters<typeof handleWithdrawRequest>[0])) as EventListener)
    addBusListener('PLAY_RELEASE_ENERGY', ((e: Event) => handleReleaseRequest((e as CustomEvent).detail as Parameters<typeof handleReleaseRequest>[0])) as EventListener)
    addBusListener('PLAY_SEND_OUT', ((e: Event) => handleReleaseRequest((e as CustomEvent).detail as Parameters<typeof handleReleaseRequest>[0])) as EventListener)
    
    addBusListener('PLAY_DAMAGE', ((e: Event) => handleShakeRequest((e as CustomEvent).detail as Parameters<typeof handleShakeRequest>[0])) as EventListener)
    addBusListener('PLAY_BLINK', ((e: Event) => handleBlinkRequest((e as CustomEvent).detail as Parameters<typeof handleBlinkRequest>[0])) as EventListener)
    addBusListener('PLAY_FLINCH', ((e: Event) => handleFlinchRequest((e as CustomEvent).detail as Parameters<typeof handleFlinchRequest>[0])) as EventListener)
    addBusListener('PLAY_HEAL', ((e: Event) => handleHealRequest((e as CustomEvent).detail as Parameters<typeof handleHealRequest>[0])) as EventListener)
    
    addBusListener('CATCH_SHAKE', ((e: Event) => {
      const detail = (e as CustomEvent<Record<string, unknown>>).detail
      const side = (typeof detail === 'string' ? detail : (detail?.side as string | undefined)) || 'enemy'
      handleShakeRequest({ side, isCapture: true })
      handleBlinkRequest(side)
    }) as EventListener)
    
    addBusListener('CATCH_SUCCESS', ((e: Event) => {
      const data = (e as CustomEvent).detail as string | { side?: string } | undefined
      const side = typeof data === 'string' ? data : (data?.side || 'enemy')
      playCatchCelebration(side)
    }) as EventListener)
    
    addBusListener('POKEMON_FAINT', ((e: Event) => handleFaintAnim((e as CustomEvent).detail as Parameters<typeof handleFaintAnim>[0])) as EventListener)
    addBusListener('PLAY_FAINT', ((e: Event) => handleFaintAnim((e as CustomEvent).detail as Parameters<typeof handleFaintAnim>[0])) as EventListener)
    addBusListener('ENCOUNTER_ANIM', (() => triggerSearchEncounter()) as EventListener)

    addBusListener('PLAY_ESCAPE_ANIM', ((e: Event) => {
      const data = (e as CustomEvent).detail as string | { side?: string; type?: string; pokemon?: Pokemon } | undefined
      const side = typeof data === 'string' ? data : (data?.side || 'player')
      const type = (typeof data === 'object' && data?.type) || 'flee'
      const pokemon = (typeof data === 'object' && data?.pokemon) || (side === 'player' ? toValue(battleStore.player) : toValue(battleStore.enemy))

      if ((side === 'player' && type === 'flee') || type === 'withdraw') {
        handleWithdrawRequest({ side: 'player', pokemon: pokemon || undefined })
        return
      }

      gameBus.emit('TRIGGER_COMBATANT_ESCAPE', { side, pokemon: pokemon || undefined, type })
    }) as EventListener)

    addBusListener('START_BATTLE', ((_e: Event) => {
      Object.keys(seats.value).forEach(side => {
        const seat = seats.value[side]
        if (seat) {
          seat.entry.isCaptureActive = false
          seat.entry.ballId = 'pokeball'
          seat.entry.animState = null
          seat.exit.isCaptureActive = false
          seat.exit.ballId = 'pokeball'
          seat.exit.animState = null
        }
      })
      resetCaptureStates()
    }) as EventListener)
  }

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
  }
}
