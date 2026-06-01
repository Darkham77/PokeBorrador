import { ref, computed, watch, toValue, type MaybeRefOrGetter } from 'vue'
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
        'INITIALIZING', 
        'SEARCH_PHASE', 
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
          break

        case 'PARALLEL_PREP':
        case 'PARALLEL_ENTRY':
        case 'ENTRY_ANIM':
        case 'WILD_ENTRY':
        case 'BUSH_IDLE':
        case 'BUSH_VISIBLE':
        case 'SILHOUETTE_MODE':
          isWildSilhouette.value = true
          wildRevealActive.value = true
          isWildEntryAnimation.value = false
          break
        
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

        case 'POKEMON_CALL':
        case 'ENERGY_RELEASE':
          // Only set via FSM if no UID-tracked animation is already in progress
          // (handleReleaseRequest manages this directly when switching)
          if (!seats.value.seat1.entry.pokemonUid) {
            seats.value.seat1.entry.animState = 'releasing'
          }
          break;

        case 'POKEMON_RECALL':
        case 'ENERGY_RECALL':
          // Only set via FSM if no UID-tracked animation is already in progress
          // (handleCatchRequest manages this directly when switching)
          if (!seats.value.seat1.exit.pokemonUid) {
            seats.value.seat1.exit.animState = 'catching'
          }
          break;

        case 'TRAINER_ENTRY':
        case 'T_VISUAL':
          // Visual state set reactively by the FSM watcher (fallback for direct substate transitions)
          // Timing is now owned by triggerTrainerEntry() in the bridge
          trainerAnimState.value = 'entering'
          isTrainerVisible.value = true
          break
        case 'TRAINER_RETREAT':
          if (trainerAnimState.value !== 'retreating') {
            trainerAnimState.value = 'retreating'
            const tl = createTimeline()
            tl.to({}, { duration: 0.8 })
            tl.add(() => {
              isTrainerVisible.value = false
              trainerAnimState.value = null
            })
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
    // ~0.4s fade-in + ~0.8s minimum read time = 1.2s total
    tl.to({}, { duration: 1.2 })
    return awaitAnimation(tl)
  }

  const triggerTrainerRetreat = (): Promise<void> => {
    trainerAnimState.value = 'retreating'
    const tl = createTimeline()
    tl.to({}, {
      duration: 0.8,
      onComplete: () => {
        isTrainerVisible.value = false
        trainerAnimState.value = null
      }
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
  }

  const initListeners = () => {
    gameBus.on('PLAY_CATCH_ENERGY', (e: Event) => handleCatchRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_WITHDRAW', (e: Event) => handleCatchRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_RELEASE_ENERGY', (e: Event) => handleReleaseRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_SEND_OUT', (e: Event) => handleReleaseRequest((e as CustomEvent).detail))
    
    gameBus.on('PLAY_DAMAGE', (e: Event) => handleShakeRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_BLINK', (e: Event) => handleBlinkRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_HEAL', (e: Event) => handleHealRequest((e as CustomEvent).detail))
    
    gameBus.on('CATCH_SHAKE', (e: Event) => {
      handleShakeRequest((e as CustomEvent).detail)
      handleBlinkRequest((e as CustomEvent).detail)
    })
    
    gameBus.on('CATCH_SUCCESS', (e: Event) => {
      const data = (e as CustomEvent).detail
      const side = typeof data === 'string' ? data : (data?.side || 'enemy')
      playCatchCelebration(side)
    })
    
    gameBus.on('POKEMON_FAINT', (e: Event) => handleFaintAnim((e as CustomEvent).detail))
    gameBus.on('PLAY_FAINT', (e: Event) => handleFaintAnim((e as CustomEvent).detail))
    gameBus.on('ENCOUNTER_ANIM', () => triggerSearchEncounter())

    gameBus.on('PLAY_ESCAPE_ANIM', (e: Event) => {
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
    })

    // PLAY_ATTACK_ANIM: orquestación delegada completamente a battleTurn.ts.
    // store.attackerSide.value y store.activeMove.value son seteados y limpiados
    // de forma determinista por runPlayerAction/runEnemyAction via awaitTween.
    // No se registra ningún listener aquí para evitar sobrescritura y carrera de limpieza.


    gameBus.on('START_BATTLE', (_e) => {
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
    })

  }

  return {
    isWildEntryAnimation,
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
    awaitTween
  }
}
