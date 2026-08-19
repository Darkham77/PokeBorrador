import { ref, computed, watch, toValue, type MaybeRefOrGetter } from 'vue'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/events/gameBus'
import { logger } from '@/logic/utils/logger'
import type { useBattleStore } from '@/stores/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { useBattleCaptureAnimations } from '@/composables/battle/useBattleCaptureAnimations'
import { isTrainerTransitionActive, useBattleTrainerAnimations } from '@/composables/battle/useBattleTrainerAnimations'
import { useBattleWildAnimations } from '@/composables/battle/useBattleWildAnimations'

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
    handleReleaseRequest,
    handleCatchRequest,
    handleShakeRequest,
    handleBlinkRequest,
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

  // FSM Watcher for sync
  watch(
    () => [toValue(battleStore.currentFsmState), toValue(battleStore.currentSubState)],
    ([state, sub]) => {
      if (!state) return

      const subState = sub || ''
      const isCleanupState = (['CONTEXT_SETUP', 'EXIT_BATTLE'] as const).includes(state as never) || subState === 'WAIT_INPUT'

      if (isCleanupState) {
        isGlobalFadeActive.value = (state === 'EXIT_BATTLE' && !['DEFEAT_SCREEN', 'DEFEAT_WAIT'].includes(String(subState)))
        resetAll()
        return
      }

      if (sub) logger.debug('useBattleAnimations', `SubState: ${sub}`);

      switch (sub) {
        case 'INITIALIZING':
          isWildSilhouette.value = true
          wildRevealActive.value = true
          isWildEntryAnimation.value = false
          isEmerging.value = false
          silhouetteOpacity.value = 0
          trainerAnimState.value = null
          isTrainerVisible.value = false
          break

        case 'PARALLEL_PREP':
        case 'PARALLEL_ENTRY':
        case 'WILD_ENTRY':
        case 'COMBAT_OR_FLEE':
        case 'SILHOUETTE_MODE':
          isWildSilhouette.value = true
          wildRevealActive.value = true
          isWildEntryAnimation.value = false
          break

        case 'ENTRY_ANIM': {
          isWildSilhouette.value = true
          wildRevealActive.value = true
          isWildEntryAnimation.value = false
          
          // GSAP: Animación reactiva de opacidad de la silueta si es salvaje (0.2s invisible, luego 0.4s fade-in)
          const stateObj = battleStore.state
          if (stateObj && !stateObj.isTrainer && !stateObj.isGym) {
            silhouetteOpacity.value = 0
            gsap.killTweensOf(silhouetteOpacity)
            gsap.to(silhouetteOpacity, {
              value: 1,
              delay: 0.2,
              duration: 0.4,
              ease: 'power1.inOut'
            })
          } else if (stateObj && (stateObj.isTrainer || stateObj.isGym)) {
            isWildSilhouette.value = false
            wildRevealActive.value = false
            isTrainerVisible.value = true
            trainerAnimState.value = 'entering'
          }
          break
        }
        
        case 'PARALLEL_JUMP':
        case 'ENCOUNTER_ANIM':
        case 'JUMP_SHADOW':
        case 'JUMP_COLOR':
        case 'BUSH_FADE':
          isWildEntryAnimation.value = true
          wildRevealActive.value = true 
          silhouetteOpacity.value = 1
          isWildSilhouette.value = true
          isEmerging.value = true
          break
        
        case 'REVEAL_COLORS':
          isWildEntryAnimation.value = true
          wildRevealActive.value = false 
          isWildSilhouette.value = false
          isEmerging.value = false
          break

         case 'TRAINER_ENTRY':
         case 'T_VISUAL':
           trainerAnimState.value = 'entering'
           isTrainerVisible.value = true
           break

         case 'T_RETREAT':
         case 'RETREAT_AND_FADEOUT':
           trainerAnimState.value = 'retreating'
           break

        case 'WAIT_INPUT':
          isWildEntryAnimation.value = false
          wildRevealActive.value = false
          isEmerging.value = false
          upcomingIsEmerging.value = false
          if (isTrainerTransitionActive(trainerAnimState.value)) {
            trainerAnimState.value = 'idle'
          }
          break

        case 'EMPTY_WAIT':
          isEmerging.value = false
          isWildEntryAnimation.value = false
          wildRevealActive.value = false
          isWildSilhouette.value = false
          trainerAnimState.value = null
          isTrainerVisible.value = false
          Object.keys(seats.value).forEach(side => { 
            const seat = seats.value[side]
            if (seat) {
              seat.entry.animState = null
              seat.exit.animState = null
            }
          })
          break

        case null:
          Object.keys(seats.value).forEach(side => { 
            const seat = seats.value[side]
            if (seat) {
              if (!seat.entry.pokemonUid) seat.entry.animState = null
              if (!seat.exit.pokemonUid) seat.exit.animState = null
            }
          })
          isEmerging.value = false
          isWildEntryAnimation.value = false
          break
      }
    }
  )

  const resetAll = () => {
    resetWildStates()
    resetTrainerStates()
    resetCaptureStates()
  }

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
      const data = (e as CustomEvent).detail as string | { side?: string; type?: string } | undefined
      const side = typeof data === 'string' ? data : (data?.side || 'player')
      const stateVal = toValue(battleStore.state)
      const isWild = stateVal ? (!stateVal.isTrainer && !stateVal.isGym) : true
      
      if (typeof data === 'object' && data?.type === 'forced-switch') {
        const pokemon = side === 'player' ? toValue(battleStore.player) : toValue(battleStore.enemy)
        handleWithdrawRequest({ side, pokemon: pokemon || undefined })
        return
      }

      if (side === 'player' || !isWild) {
        const pokemon = side === 'player' ? toValue(battleStore.player) : toValue(battleStore.enemy)
        handleCatchRequest({ side, pokemon: pokemon || undefined })
      } else {
        const type = (typeof data === 'object' && data?.type) || 'flee'
        const pokemon = toValue(battleStore.enemy)
        gameBus.emit('TRIGGER_COMBATANT_ESCAPE', { side: 'enemy', pokemon: pokemon || undefined, type })
      }
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
    triggerPokemonCall,
    triggerCatchSparkles,
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
    awaitTween
  }
}
