import { ref, computed, watch, toValue, type MaybeRefOrGetter } from 'vue'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/gameBus'
import { logger } from '@/logic/utils/logger'
import { awaitAnimation, createTimeline } from '@/logic/utils/gsapHelpers'
import type { useBattleStore } from '@/stores/battle'
import type { Pokemon } from '@/types/pokemon'
import { useBattleCaptureAnimations } from '@/composables/useBattleCaptureAnimations'

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

  // 2. Wild / Entry visual states
  const isWildEntryAnimation = ref(false)
  const isEmerging = ref(false)
  const isWildSilhouette = ref(false)
  const wildRevealActive = ref(false)
  const upcomingIsEmerging = ref(false)
  const isWildSilhouetteHalfway = ref(false)
  const isInitialLoad = ref(true)
  const silhouetteOpacity = ref(0)

  // 3. Trainer visual states
  const trainerAnimState = ref<string | null>(null) // 'entering' | 'retreating' | 'idle'
  const isTrainerVisible = ref(false)

  // 4. Global transition
  const isGlobalFadeActive = ref(false)

  const isIntroInProgress = computed(() => {
    const s = toValue(battleStore.fsm.currentState)
    return s === 'INITIALIZING' ||
           s === 'FIRST_INTRO' ||
           isWildEntryAnimation.value || 
           wildRevealActive.value || 
           isEmerging.value || 
           upcomingIsEmerging.value || 
           trainerAnimState.value !== null ||
           isCaptureSequenceActive.value
  })

  const isPlayerSpriteSuppressed = computed(() => {
    return !toValue(battleStore.player)
  })

  const revealWildPokemon = async (isInstant = false) => {
    if (isInstant) {
      isWildSilhouette.value = false
      isWildEntryAnimation.value = false
      wildRevealActive.value = false
      return
    }

    wildRevealActive.value = true
    isWildSilhouette.value = true
    isWildEntryAnimation.value = true
    isEmerging.value = false 
    
    const tl = createTimeline()
    tl.to({}, { duration: 0.6 })
    tl.add(() => {
      isWildSilhouette.value = false
      isWildEntryAnimation.value = false
      wildRevealActive.value = false
      const enemy = toValue(enemyRef)
      if (enemy?.isShiny) {
        gameBus.emit('PLAY_SOUND', 'shiny')
      }
    })
    return awaitAnimation(tl)
  }

  // FSM Watcher for sync
  watch(
    () => [toValue(battleStore.fsm.currentState), toValue(battleStore.fsm.currentSubState)],
    ([state, sub]) => {
      if (!state) return

      const subState = sub || ''
      const isCleanupState = [
        'CONTEXT_SETUP', 
        'EXIT_BATTLE'
      ].includes(state) || subState === 'WAIT_INPUT'

      if (isCleanupState) {
        isGlobalFadeActive.value = (state === 'EXIT_BATTLE')
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
          isWildSilhouette.value = true
          
          if (!isEmerging.value) {
            const tl = createTimeline()
            tl.add(() => {
              isEmerging.value = true
            })
          }
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
          // Only clear seats that don't have an active UID-tracked animation in progress
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

  const triggerWildEmergence = () => Promise.resolve()

  // --- Trainer flow bridge methods ---
  // Each method returns a GSAP-backed Promise so the orchestrator can await
  // real animation completion instead of guessing with hardcoded timers.

  const triggerTrainerEntry = (): Promise<void> => {
    trainerAnimState.value = 'entering'
    isTrainerVisible.value = true
    const tl = createTimeline()
    // Allow ~1s for the trainer sprite slide-in to settle visually
    tl.to({}, { duration: 1.0 })
    return awaitAnimation(tl)
  }

  const triggerTrainerDialogs = (): Promise<void> => {
    const tl = createTimeline()
    // ~0.4s fade-in + ~2.1s minimum read time = 2.5s total
    tl.to({}, { duration: 2.5 })
    return awaitAnimation(tl)
  }

  const triggerTrainerRetreat = (): Promise<void> => {
    trainerAnimState.value = 'retreating'
    const tl = createTimeline()
    tl.to({}, {
      duration: 0.8
    })
    return awaitAnimation(tl)
  }

  const triggerPokemonCall = (): Promise<void> => {
    seats.value.seat1.entry.animState = 'releasing'
    const tl = createTimeline()
    // Allow ~0.8s for the Poké Ball release animation
    tl.to({}, { duration: 0.8 })
    return awaitAnimation(tl)
  }

  const triggerSearchEncounter = () => {
    const tl = createTimeline()
    
    isWildEntryAnimation.value = true
    isEmerging.value = false

    tl.to({}, { 
      duration: 0.5, 
      onStart: () => { isEmerging.value = true },
      onComplete: () => { wildRevealActive.value = false }
    })
    
    tl.to({}, {
      duration: 0.4,
      onComplete: () => { isWildSilhouette.value = false }
    })

    tl.to({}, {
      duration: 0.3,
      onComplete: () => {
        isWildEntryAnimation.value = false
        isEmerging.value = false
        const enemy = toValue(enemyRef)
        if (enemy?.isShiny) {
          gameBus.emit('PLAY_SOUND', 'shiny')
        }
      }
    })

    return awaitAnimation(tl)
  }

  const resetAll = () => {
    isWildEntryAnimation.value = false
    isEmerging.value = false
    isWildSilhouette.value = false
    wildRevealActive.value = false
    upcomingIsEmerging.value = false
    isInitialLoad.value = false
    trainerAnimState.value = null
    isTrainerVisible.value = false
    resetCaptureStates()
    gsap.killTweensOf(silhouetteOpacity)
    silhouetteOpacity.value = 0
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

    addBusListener('PLAY_CATCH_ENERGY', ((e: Event) => handleCatchRequest((e as CustomEvent).detail)) as EventListener)
    addBusListener('PLAY_WITHDRAW', ((e: Event) => handleCatchRequest((e as CustomEvent).detail)) as EventListener)
    addBusListener('PLAY_RELEASE_ENERGY', ((e: Event) => handleReleaseRequest((e as CustomEvent).detail)) as EventListener)
    addBusListener('PLAY_SEND_OUT', ((e: Event) => handleReleaseRequest((e as CustomEvent).detail)) as EventListener)
    
    addBusListener('PLAY_DAMAGE', ((e: Event) => handleShakeRequest((e as CustomEvent).detail)) as EventListener)
    addBusListener('PLAY_BLINK', ((e: Event) => handleBlinkRequest((e as CustomEvent).detail)) as EventListener)
    addBusListener('PLAY_HEAL', ((e: Event) => handleHealRequest((e as CustomEvent).detail)) as EventListener)
    
    addBusListener('CATCH_SHAKE', ((e: Event) => {
      handleShakeRequest((e as CustomEvent).detail)
      handleBlinkRequest((e as CustomEvent).detail)
    }) as EventListener)
    
    addBusListener('CATCH_SUCCESS', ((e: Event) => {
      const data = (e as CustomEvent).detail
      const side = typeof data === 'string' ? data : (data?.side || 'enemy')
      playCatchCelebration(side)
    }) as EventListener)
    
    addBusListener('POKEMON_FAINT', ((e: Event) => handleFaintAnim((e as CustomEvent).detail)) as EventListener)
    addBusListener('PLAY_FAINT', ((e: Event) => handleFaintAnim((e as CustomEvent).detail)) as EventListener)
    addBusListener('ENCOUNTER_ANIM', (() => triggerSearchEncounter()) as EventListener)

    addBusListener('PLAY_ESCAPE_ANIM', ((e: Event) => {
      const data = (e as CustomEvent).detail
      const side = typeof data === 'string' ? data : (data?.side || 'player')
      const isWild = !battleStore.state?.isTrainer && !battleStore.state?.isGym
      
      if (side === 'player' || !isWild) {
        const pokemon = side === 'player' ? battleStore.state?.player : battleStore.state?.enemy
        handleCatchRequest({ side, pokemon: pokemon || undefined })
      } else {
        const type = data?.type || 'flee'
        const pokemon = battleStore.state?.enemy
        gameBus.emit('TRIGGER_COMBATANT_ESCAPE', { side: 'enemy', pokemon, type })
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
