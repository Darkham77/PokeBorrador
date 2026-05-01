import { ref, computed, nextTick, watch } from 'vue'
import { gameBus } from '@/logic/gameBus'

export function useBattleAnimations(battleStore, enemyRef) {
  // Estados de Entrada Salvaje
  const isWildEntryAnimation = ref(false)
  const isEmerging = ref(false)
  const isWildSilhouette = ref(false)
  const wildRevealActive = ref(false)
  const upcomingIsEmerging = ref(false)
  const isWildSilhouetteHalfway = ref(false)
  const isInitialLoad = ref(true)

  // Estados de Captura / Debilitamiento
  const isCaptureSequenceActive = ref(false)
  const caughtPokemonSnapshot = ref(null) 
  const isFaintInProgress = ref(false)
  const faintedPokemonSnapshot = ref(null)

  // Estados de Energía y Poké Ball
  const playerAnimState = ref(null) 
  const enemyAnimState = ref(null)
  const activePokeballId = ref('pokeball')
  const catchSparkles = ref([])

  const playerIsShaking = ref(false)
  const playerIsBlinking = ref(false)
  const enemyIsShaking = ref(false)
  const enemyIsBlinking = ref(false)

  const isIntroInProgress = computed(() => {
    return isWildEntryAnimation.value || 
           wildRevealActive.value || 
           isEmerging.value || 
           upcomingIsEmerging.value || 
           playerAnimState.value !== null || 
           enemyAnimState.value !== null ||
           isCaptureSequenceActive.value
  })

  const revealWildPokemon = (isInstant = false) => {
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
    
    setTimeout(() => {
      isWildSilhouette.value = false
      isWildEntryAnimation.value = false
      wildRevealActive.value = false
    }, 600)
  }

  const triggerWildEmergence = () => {
    if (wildRevealActive.value) return

    isWildEntryAnimation.value = true
    isEmerging.value = true
    isWildSilhouette.value = true
    wildRevealActive.value = true
    isWildSilhouetteHalfway.value = false
    
    setTimeout(() => { isWildSilhouetteHalfway.value = true }, 1100)

    setTimeout(() => { 
      isWildEntryAnimation.value = false
      isEmerging.value = false
      isWildSilhouette.value = false 
      wildRevealActive.value = false
      isWildSilhouetteHalfway.value = false
    }, 2200)
  }

  const triggerCatchSparkles = (side) => {
    const count = 5 // Reducido a menos de la mitad (original era 12)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const dist = 60 + Math.random() * 40
      catchSparkles.value.push({
        id: Date.now() + i,
        side,
        tx: `${Math.cos(angle) * dist}px`,
        ty: `${Math.sin(angle) * dist}px`,
        delay: `${Math.random() * 0.2}s`
      })
    }
    setTimeout(() => {
      catchSparkles.value = catchSparkles.value.filter(s => s.side !== side)
    }, 1200)
  }

  const handleReleaseRequest = (detail) => {
    const side = detail?.side || detail
    if (side === 'player') playerAnimState.value = 'releasing'
    else enemyAnimState.value = 'releasing'
    setTimeout(() => {
      if (side === 'player') playerAnimState.value = null
      else enemyAnimState.value = null
    }, 800)
  }

  const handleCatchRequest = (detail) => {
    const side = detail?.side || detail
    if (detail?.ballId) activePokeballId.value = detail.ballId
    
    if (side === 'player') playerAnimState.value = 'catching'
    else enemyAnimState.value = 'catching'
    setTimeout(() => {
      if (side === 'player') playerAnimState.value = 'trapped'
      else enemyAnimState.value = 'trapped'
    }, 800)
  }

  const handleShakeRequest = (detail) => {
    const side = detail?.side || detail
    if (side === 'player') {
      playerIsShaking.value = false
      playerIsBlinking.value = false
      nextTick(() => { 
        playerIsShaking.value = true 
        playerIsBlinking.value = true
      })
      setTimeout(() => { 
        playerIsShaking.value = false 
        playerIsBlinking.value = false
      }, 600)
    } else {
      enemyIsShaking.value = false
      enemyIsBlinking.value = false
      nextTick(() => { 
        enemyIsShaking.value = true 
        enemyIsBlinking.value = true
      })
      setTimeout(() => { 
        enemyIsShaking.value = false 
        enemyIsBlinking.value = false
      }, 600)
    }
  }

  const initListeners = () => {
    gameBus.on('PLAY_RELEASE_ENERGY', (e) => handleReleaseRequest(e.detail || e))
    gameBus.on('PLAY_CATCH_ENERGY', (e) => handleCatchRequest(e.detail || e))
    gameBus.on('CATCH_SHAKE', (e) => handleShakeRequest(e.detail || e))
    gameBus.on('CATCH_SUCCESS', (e) => {
      const detail = e.detail || e
      const side = detail?.side || detail
      isCaptureSequenceActive.value = true
      caughtPokemonSnapshot.value = enemyRef.value ? { ...enemyRef.value } : null
      triggerCatchSparkles(side)
      
      // Reset visual de la Poké Ball (1.0s) - Como pidió el usuario
      setTimeout(() => {
        if (side === 'player') playerAnimState.value = null
        else enemyAnimState.value = null
      }, 1000)

      // Reset del estado de captura (2.0s) - 1s de bola + 1s de vacío
      setTimeout(() => {
        isCaptureSequenceActive.value = false
        caughtPokemonSnapshot.value = null
      }, 2000)
    })
    
    gameBus.on('START_BATTLE', (e) => {
      const detail = e.detail || e
      // Resetear estados al iniciar un nuevo combate
      isCaptureSequenceActive.value = false
      caughtPokemonSnapshot.value = null
      activePokeballId.value = 'pokeball'
      
      if (detail.animationPhase === 1 || !detail.animationPhase) {
        triggerWildEmergence()
      } else if (detail.animationPhase === 3) {
        revealWildPokemon()
      }
    })

    watch(() => battleStore.upcomingPokemon, (newVal) => {
      if (newVal && battleStore.isSearching) {
        upcomingIsEmerging.value = true
        setTimeout(() => { upcomingIsEmerging.value = false }, 1200)
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
    activePokeballId,
    catchSparkles,
    playerIsShaking,
    playerIsBlinking,
    enemyIsShaking,
    enemyIsBlinking,
    isIntroInProgress,
    revealWildPokemon,
    triggerWildEmergence,
    triggerCatchSparkles,
    initListeners
  }
}
