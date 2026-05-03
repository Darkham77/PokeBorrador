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
  const playerCaptureActive = ref(false)
  const enemyCaptureActive = ref(false)
  const isCaptureSequenceActive = computed(() => playerCaptureActive.value || enemyCaptureActive.value)
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
    
    setTimeout(() => { isWildSilhouetteHalfway.value = true }, 550)

    setTimeout(() => { 
      isWildEntryAnimation.value = false
      isEmerging.value = false
      isWildSilhouette.value = false 
      wildRevealActive.value = false
      isWildSilhouetteHalfway.value = false
    }, 1100)
  }

  const triggerCatchSparkles = (side) => {
    const count = 8 // Subido un poco para que se vea más lleno
    for (let i = 0; i < count; i++) {
      // Alternar bando para asegurar dispersión equilibrada
      const direction = i % 2 === 0 ? -1 : 1
      const tx = direction * (60 + Math.random() * 120) 
      const ty = -(60 + Math.random() * 40) 
      const tf = ty + (90 + Math.random() * 40) 
      const scale = 0.5 + Math.random() * 0.8 // Variación de tamaño
      
      catchSparkles.value.push({
        id: `sparkle-${side}-${Date.now()}-${i}-${Math.random()}`,
        side,
        tx: tx, // Pasar solo número
        ty: ty, 
        tf: tf,
        scale,
        delay: `${Math.random() * 0.2}s` // Ráfaga más compacta (0.2s max)
      })
    }
    setTimeout(() => {
      catchSparkles.value = catchSparkles.value.filter(s => s.side !== side)
    }, 1200) 
  }

  const handleReleaseRequest = (detail) => {
    const side = detail?.side || detail
    
    // Limpiar estados de captura inmediatamente al liberar
    if (side === 'player') playerCaptureActive.value = false
    else enemyCaptureActive.value = false

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

  const handleFaintAnim = (e) => {
    const data = e?.detail || e
    const side = typeof data === 'string' ? data : (data?.side || 'enemy')
    if (side === 'enemy') {
      faintedPokemonSnapshot.value = enemyRef.value ? { ...enemyRef.value, side: 'enemy' } : { side: 'enemy' }
      isFaintInProgress.value = true
      setTimeout(() => { isFaintInProgress.value = false; faintedPokemonSnapshot.value = null }, 1300)
    } else {
      faintedPokemonSnapshot.value = { side: 'player' }
      isFaintInProgress.value = true
      setTimeout(() => { isFaintInProgress.value = false; faintedPokemonSnapshot.value = null }, 1300)
    }
  }

  const initListeners = () => {
    gameBus.on('PLAY_CATCH_ENERGY', (e) => {
      const data = e?.detail || e
      handleCatchRequest(data)
    })
    gameBus.on('PLAY_WITHDRAW', (e) => {
      const data = e?.detail || e
      handleCatchRequest(data)
    })
    gameBus.on('PLAY_RELEASE_ENERGY', (e) => handleReleaseRequest(e.detail || e))
    gameBus.on('PLAY_SEND_OUT', (e) => handleReleaseRequest(e.detail || e))
    
    gameBus.on('CATCH_SHAKE', (e) => {
      const data = e?.detail || e
      handleShakeRequest(data)
    })
    
    gameBus.on('POKEMON_FAINT', (e) => handleFaintAnim(e))
    gameBus.on('PLAY_FAINT', (e) => handleFaintAnim(e))

    gameBus.on('PLAY_ATTACK_ANIM', (e) => {
      const data = e?.detail || e
      const side = typeof data === 'string' ? data : (data?.side || 'player')
      const cat = data?.cat || 'physical'
      
      battleStore.attackerSide = side
      battleStore.activeMove = { cat, side } 
      
      setTimeout(() => {
        battleStore.attackerSide = null
        battleStore.activeMove = null
      }, 500)
    })

    gameBus.on('CATCH_SUCCESS', (e) => {
      const data = e?.detail || e
      const side = typeof data === 'string' ? data : (data?.side || 'enemy')
      
      if (side === 'player') playerCaptureActive.value = true
      else enemyCaptureActive.value = true
      
      const targetRef = side === 'player' ? battleStore.player : enemyRef.value
      caughtPokemonSnapshot.value = targetRef ? { ...targetRef } : null
      triggerCatchSparkles(side)
      
      setTimeout(() => {
        if (side === 'player') playerAnimState.value = null
        else enemyAnimState.value = null
      }, 1000)

      setTimeout(() => {
        playerCaptureActive.value = false
        enemyCaptureActive.value = false
        caughtPokemonSnapshot.value = null
      }, 2000)
    })
    
    gameBus.on('START_BATTLE', (e) => {
      const detail = e.detail || e
      // Resetear estados al iniciar un nuevo combate
      playerCaptureActive.value = false
      enemyCaptureActive.value = false
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
    playerCaptureActive,
    enemyCaptureActive,
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
