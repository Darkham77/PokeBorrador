import { ref, computed, watch, toValue, type MaybeRefOrGetter } from 'vue'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/gameBus'
import { logger } from '@/logic/utils/logger'
import { awaitAnimation, createTimeline } from '@/logic/utils/gsapHelpers'
import type { useBattleStore } from '@/stores/battle'
import type { Pokemon, Move } from '@/types/pokemon'

export interface CatchSparkle {
  id: string;
  side: string;
  tx: number;
  ty: number;
  tf: number;
  scale: number;
  delay: string;
}

export function useBattleAnimations(
  battleStore: ReturnType<typeof useBattleStore>, 
  enemyRef: MaybeRefOrGetter<Pokemon | null | undefined>
) {
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
  const caughtPokemonSnapshot = ref<Pokemon | null>(null) 
  const isFaintInProgress = ref(false)
  const faintedPokemonSnapshot = ref<(Partial<Pokemon> & { side: string }) | null>(null)
  // Estados de Energía y Poké Ball
  const playerAnimState = ref<'catching' | 'trapped' | 'releasing' | null>(null)
  const enemyAnimState = ref<'catching' | 'trapped' | 'releasing' | null>(null)
  const activePokeballId = ref('pokeball')
  const catchSparkles = ref<CatchSparkle[]>([])

  const playerIsShaking = ref(false)
  const playerIsBlinking = ref(false)
  const enemyIsShaking = ref(false)
  const enemyIsBlinking = ref(false)

  // Estados de Entrenador
  const trainerAnimState = ref<string | null>(null) // 'entering' | 'retreating' | 'idle'
  const isTrainerVisible = ref(false)

  // Transiciones Globales
  const isGlobalFadeActive = ref(false)

  const isIntroInProgress = computed(() => {
    const s = toValue(battleStore.fsm.currentState)
    return s === 'INITIALIZING' ||
           s === 'FIRST_INTRO' ||
           isWildEntryAnimation.value || 
           wildRevealActive.value || 
           isEmerging.value || 
           upcomingIsEmerging.value || 
           playerAnimState.value !== null || 
           enemyAnimState.value !== null ||
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

  // Sincroniza las banderas de animación visual con el estado lógico de la FSM.
  watch(
    () => [toValue(battleStore.fsm.currentState), toValue(battleStore.fsm.currentSubState)],
    ([state, sub]) => {
      if (!state) return

      // CASOS DE LIMPIEZA GLOBAL (Garantiza estado puro al iniciar o volver a búsqueda)
      const subState = sub || ''
      const isCleanupState = [
        'INITIALIZING', 
        'SEARCH_PHASE', 
        'CONTEXT_SETUP', 
        'EXIT_BATTLE'
      ].includes(state) || subState === 'WAIT_INPUT'

      if (isCleanupState) {
        isGlobalFadeActive.value = (state === 'EXIT_BATTLE')
        isWildEntryAnimation.value = false
        isEmerging.value = false
        wildRevealActive.value = false
        upcomingIsEmerging.value = false
        isWildSilhouette.value = false
        playerAnimState.value = null
        enemyAnimState.value = null
        trainerAnimState.value = null
        isTrainerVisible.value = false
        
        // Limpieza profunda de estados de desmayo y captura
        isFaintInProgress.value = false
        faintedPokemonSnapshot.value = null
        playerCaptureActive.value = false
        enemyCaptureActive.value = false
        caughtPokemonSnapshot.value = null
        return
      }

      if (sub) logger.debug('useBattleAnimations', `SubState: ${sub}`);

      switch (sub) {
        // 1. ENTRADA PARALELA (Búsqueda o Primer Encuentro)
        case 'INITIALIZING':
          isWildSilhouette.value = true
          wildRevealActive.value = true
          isWildEntryAnimation.value = false
          isEmerging.value = false // RESET AL ATERRIZAR
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
          // Mantenemos isEmerging como esté (evita parpadeos)
          break
        
        // 2. SALTO PARALELO (Salto + Desvanecimiento de Arbustos)
        case 'PARALLEL_JUMP':
        case 'ENCOUNTER_ANIM':
        case 'JUMP_SHADOW':
        case 'JUMP_COLOR':
        case 'BUSH_FADE':
          logger.debug('useBattleAnimations', 'TRIGGER JUMP');
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
          isEmerging.value = false // RESET AL ATERRIZAR
          break

        // 3. GESTIÓN DE Poké Ball (LLAMADO / RETIRO)
        case 'POKEMON_CALL':
        case 'ENERGY_RELEASE':
          playerAnimState.value = 'releasing'
          break

        case 'POKEMON_RECALL':
        case 'ENERGY_RECALL':
          playerAnimState.value = 'catching'
          break

        // 4. GESTIÓN DE ENTRENADORES (VISUAL OVERLAY)
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
          playerAnimState.value = null
          enemyAnimState.value = null
          trainerAnimState.value = null
          isTrainerVisible.value = false
          break

        case null:
          playerAnimState.value = null
          enemyAnimState.value = null
          isEmerging.value = false
          isWildEntryAnimation.value = false
          break
      }
    }
  )

  // Funciones legacy para mantener compatibilidad con BattleArenaView.vue (se pueden limpiar luego)
  const triggerWildEmergence = () => Promise.resolve()

  // SEARCH_PHASE → ENCOUNTER_ANIM: Solo el jump + reveal.
  const triggerSearchEncounter = () => {
    const tl = createTimeline()
    
    isWildEntryAnimation.value = true
    isEmerging.value = false

    // 1. ENCOUNTER_JUMP & BUSH_FADE (600ms)
    tl.to({}, { 
      duration: 0.6, 
      onStart: () => { isEmerging.value = true },
      onComplete: () => { wildRevealActive.value = false }
    })
    
    // 2. REVEAL_COLORS (800ms -> total 1400ms)
    tl.to({}, {
      duration: 0.8,
      onComplete: () => { isWildSilhouette.value = false }
    })

    // 3. CLEANUP (600ms -> total 2000ms)
    tl.to({}, {
      duration: 0.6,
      onComplete: () => {
        isWildEntryAnimation.value = false
        isEmerging.value = false
      }
    })

    return awaitAnimation(tl)
  }

  const triggerCatchSparkles = (side: string) => {
    const count = 8 // Subido un poco para que se vea más lleno
    for (let i = 0; i < count; i++) {
      // Alternar bando para asegurar dispersión equilibrada
      const direction = i % 2 === 0 ? -1 : 1
      const tx = direction * (60 + Math.random() * 120) 
      const ty = -(60 + Math.random() * 40) 
      const tf = ty + (90 + Math.random() * 40) 
      const scale = 0.5 + Math.random() * 0.8 // Variación de tamaño
      
      catchSparkles.value.push({
        id: `sparkle-${side}-${Temporal.Now.instant().epochMilliseconds}-${i}-${Math.random()}`,
        side,
        tx: tx, // Pasar solo número
        ty: ty, 
        tf: tf,
        scale,
        delay: `${Math.random() * 0.2}s` // Ráfaga más compacta (0.2s max)
      })
    }
    gsap.delayedCall(1.2, () => {
      catchSparkles.value = catchSparkles.value.filter(s => s.side !== side)
    })
  }

  const handleReleaseRequest = (detail: string | { side?: string }) => {
    const side = typeof detail === 'string' ? detail : detail?.side
    
    if (side === 'player') playerCaptureActive.value = false
    else enemyCaptureActive.value = false

    if (side === 'player') playerAnimState.value = 'releasing'
    else enemyAnimState.value = 'releasing'
    
    return gsap.delayedCall(0.8, () => {
      if (side === 'player') playerAnimState.value = null
      else enemyAnimState.value = null
    })
  }

  const handleCatchRequest = (detail: string | { side?: string, ballId?: string }) => {
    const side = typeof detail === 'string' ? detail : detail?.side
    if (typeof detail === 'object' && detail?.ballId) activePokeballId.value = detail.ballId
    
    if (side === 'player') playerAnimState.value = 'catching'
    else enemyAnimState.value = 'catching'

    return gsap.delayedCall(0.8, () => {
      if (side === 'player') playerAnimState.value = 'trapped'
      else enemyAnimState.value = 'trapped'
    })
  }

  const handleShakeRequest = (detail: string | { side?: string }) => {
    const side = typeof detail === 'string' ? detail : detail?.side
    if (side === 'player') {
      playerIsShaking.value = true 
      playerIsBlinking.value = true
      gsap.delayedCall(0.6, () => { 
        playerIsShaking.value = false 
        playerIsBlinking.value = false
      })
    } else {
      enemyIsShaking.value = true 
      enemyIsBlinking.value = true
      gsap.delayedCall(0.6, () => { 
        enemyIsShaking.value = false 
        enemyIsBlinking.value = false
      })
    }
  }

  const handleFaintAnim = (e: string | { side?: string } | { detail?: string | { side: string } }) => {
    if (isFaintInProgress.value) return 
    
    const data = typeof e === 'object' 
      ? (e && 'detail' in e ? e.detail : e) 
      : e
    const side = typeof data === 'string' 
      ? data 
      : (data && 'side' in data ? (data as { side: string }).side : 'enemy')
    
    faintedPokemonSnapshot.value = side === 'enemy' 
      ? (toValue(enemyRef) ? { ...toValue(enemyRef), side: 'enemy' } : { side: 'enemy' })
      : { side: 'player' }
      
    isFaintInProgress.value = true
    gsap.delayedCall(1.3, () => { 
      isFaintInProgress.value = false 
      faintedPokemonSnapshot.value = null 
    })
  }

  const initListeners = () => {
    gameBus.on('PLAY_CATCH_ENERGY', (e: Event) => handleCatchRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_WITHDRAW', (e: Event) => handleCatchRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_RELEASE_ENERGY', (e: Event) => handleReleaseRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_SEND_OUT', (e: Event) => handleReleaseRequest((e as CustomEvent).detail))
    
    gameBus.on('CATCH_SHAKE', (e: Event) => handleShakeRequest((e as CustomEvent).detail))

    gameBus.on('PLAY_DAMAGE', (e: Event) => handleShakeRequest((e as CustomEvent).detail))
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
      
      if (side === 'player') playerCaptureActive.value = true
      else enemyCaptureActive.value = true
      
      const targetRef = side === 'player' ? battleStore.player : toValue(enemyRef)
      caughtPokemonSnapshot.value = targetRef ? { ...targetRef } as Pokemon : null
      triggerCatchSparkles(side)
      
      gsap.delayedCall(1.0, () => {
        if (side === 'player') playerAnimState.value = null
        else enemyAnimState.value = null
      })

      gsap.delayedCall(2.0, () => {
        playerCaptureActive.value = false
        enemyCaptureActive.value = false
        caughtPokemonSnapshot.value = null
      })
    })
    
    gameBus.on('START_BATTLE', (_e) => {
      // Solo resetear estado de captura/ball.
      // La orquestación de animaciones de intro (ENTRY_ANIM / ENCOUNTER_ANIM)
      // es responsabilidad exclusiva del watcher FSM en BattleArenaView.vue.
      playerCaptureActive.value = false
      enemyCaptureActive.value = false
      caughtPokemonSnapshot.value = null
      activePokeballId.value = 'pokeball'
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
    activePokeballId,
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
    revealWildPokemon,
    triggerWildEmergence,
    triggerSearchEncounter,
    triggerCatchSparkles,
    initListeners,
    isPlayerSpriteSuppressed,
    handleFaintAnim,
    handleCatchRequest,
    handleReleaseRequest,
    handleShakeRequest
  }
}
