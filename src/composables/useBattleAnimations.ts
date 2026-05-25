import { ref, computed, watch, toValue, type MaybeRefOrGetter } from 'vue'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/gameBus'
import { logger } from '@/logic/utils/logger'
import { awaitAnimation, createTimeline } from '@/logic/utils/gsapHelpers'
import type { useBattleStore } from '@/stores/battle'
import type { Pokemon, Move } from '@/types/pokemon'
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
    handleFaintAnim,
    playCatchCelebration,
    playBallFadeOut,
    resetCaptureStates
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
    
    gsap.delayedCall(0.6, () => {
      isWildSilhouette.value = false
      isWildEntryAnimation.value = false
      wildRevealActive.value = false
    })
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
            gsap.delayedCall(0, () => {
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
          seats.value.player.animState = 'releasing'
          break

        case 'POKEMON_RECALL':
        case 'ENERGY_RECALL':
          seats.value.player.animState = 'catching'
          break

        case 'TRAINER_ENTRY':
        case 'T_VISUAL':
          trainerAnimState.value = 'entering'
          isTrainerVisible.value = true
          break
        
        case 'TRAINER_RETREAT':
          trainerAnimState.value = 'retreating'
          gsap.delayedCall(0.8, () => { isTrainerVisible.value = false; trainerAnimState.value = null })
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
            if (seat) seat.animState = null 
          })
          break

        case null:
          Object.keys(seats.value).forEach(side => { 
            const seat = seats.value[side]
            if (seat) seat.animState = null 
          })
          isEmerging.value = false
          isWildEntryAnimation.value = false
          break
      }
    }
  )

  const triggerWildEmergence = () => Promise.resolve()

  const triggerSearchEncounter = () => {
    const tl = createTimeline()
    
    isWildEntryAnimation.value = true
    isEmerging.value = false

    tl.to({}, { 
      duration: 0.6, 
      onStart: () => { isEmerging.value = true },
      onComplete: () => { wildRevealActive.value = false }
    })
    
    tl.to({}, {
      duration: 0.8,
      onComplete: () => { isWildSilhouette.value = false }
    })

    tl.to({}, {
      duration: 0.6,
      onComplete: () => {
        isWildEntryAnimation.value = false
        isEmerging.value = false
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
    
    gameBus.on('CATCH_SHAKE', (e: Event) => {
      handleShakeRequest((e as CustomEvent).detail)
      handleBlinkRequest((e as CustomEvent).detail)
    })
    
    gameBus.on('POKEMON_FAINT', (e: Event) => handleFaintAnim((e as CustomEvent).detail))
    gameBus.on('PLAY_FAINT', (e: Event) => handleFaintAnim((e as CustomEvent).detail))
    gameBus.on('ENCOUNTER_ANIM', () => triggerSearchEncounter())

    gameBus.on('PLAY_ATTACK_ANIM', (e: Event) => {
      const data = (e as CustomEvent).detail
      const side = (typeof data === 'string' ? data : (data?.side || 'player')) as 'player' | 'enemy'
      const cat = (data?.cat || 'physical')
      
      battleStore.attackerSide = side
      battleStore.activeMove = { 
        name: 'VisualMove', 
        pp: 1, 
        maxPP: 1, 
        cat: (cat || 'physical') as 'physical' | 'special' | 'status',
        side: side as 'player' | 'enemy'
      } as Move
      
      gsap.delayedCall(0.5, () => {
        battleStore.attackerSide = null
        battleStore.activeMove = null
      })
    })

    gameBus.on('CATCH_SUCCESS', (e: Event) => {
      const data = (e as CustomEvent).detail
      const side = typeof data === 'string' ? data : (data?.side || 'enemy')
      playCatchCelebration(side).then(() => playBallFadeOut(side))
    })
    
    gameBus.on('START_BATTLE', (_e) => {
      Object.keys(seats.value).forEach(side => {
        const seat = seats.value[side]
        if (seat) {
          seat.isCaptureActive = false
          seat.ballId = 'pokeball'
          seat.animState = null
        }
      })
      resetCaptureStates()
    })

    watch(() => battleStore.upcomingPokemon, (newVal) => {
      if (newVal && battleStore.isSearching) {
        upcomingIsEmerging.value = true
        gsap.delayedCall(1.2, () => { upcomingIsEmerging.value = false })
      }
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
    triggerCatchSparkles,
    initListeners,
    isPlayerSpriteSuppressed,
    handleFaintAnim,
    handleCatchRequest,
    handleReleaseRequest,
    handleShakeRequest,
    playCatchCelebration,
    playBallFadeOut
  }
}
