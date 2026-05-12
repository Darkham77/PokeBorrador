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
  const caughtPokemonSnapshot = ref<Pokemon | null>(null) 
  const isFaintInProgress = ref(false)
  const faintedPokemonSnapshot = ref<(Partial<Pokemon> & { side: string }) | null>(null)
  const catchSparkles = ref<CatchSparkle[]>([])

  // --- ESTRUCTURA DE ASIENTOS (SEATS) ---
  interface SeatState {
    animState: 'catching' | 'trapped' | 'releasing' | null;
    ballId: string;
    isCaptureActive: boolean;
    isAnimatingCapture: boolean;
    isShaking: boolean;
    isBlinking: boolean;
  }

  const createDefaultSeat = (): SeatState => ({
    animState: null,
    ballId: 'pokeball',
    isCaptureActive: false,
    isAnimatingCapture: false,
    isShaking: false,
    isBlinking: false
  })

  const seats = ref<{
    player: SeatState;
    enemy: SeatState;
    [key: string]: SeatState;
  }>({
    player: createDefaultSeat(),
    enemy: enemyRef ? createDefaultSeat() : createDefaultSeat() // Forzar inferencia
  })

  // Inicialización explícita para evitar problemas de tipos
  seats.value.player = createDefaultSeat()
  seats.value.enemy = createDefaultSeat()

  // Aliases para compatibilidad
  const playerAnimState = computed(() => seats.value.player.animState)
  const enemyAnimState = computed(() => seats.value.enemy.animState)
  const playerActivePokeballId = computed(() => seats.value.player.ballId)
  const enemyActivePokeballId = computed(() => seats.value.enemy.ballId)
  const playerCaptureActive = computed(() => seats.value.player.isCaptureActive)
  const enemyCaptureActive = computed(() => seats.value.enemy.isCaptureActive)
  const playerIsShaking = computed(() => seats.value.player.isShaking)
  const playerIsBlinking = computed(() => seats.value.player.isBlinking)
  const enemyIsShaking = computed(() => seats.value.enemy.isShaking)
  const enemyIsBlinking = computed(() => seats.value.enemy.isBlinking)

  const isCaptureSequenceActive = computed(() => 
    seats.value.player.isCaptureActive || seats.value.enemy.isCaptureActive ||
    seats.value.player.isAnimatingCapture || seats.value.enemy.isAnimatingCapture
  )

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
        resetAll()
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
          seats.value.player.animState = 'releasing'
          break

        case 'POKEMON_RECALL':
        case 'ENERGY_RECALL':
          seats.value.player.animState = 'catching'
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
    const tl = createTimeline()
    const count = 12 // Más chispas para el festejo de captura
    
    tl.to({}, {
      duration: 1.5,
      onStart: () => {
        for (let i = 0; i < count; i++) {
          const direction = i % 2 === 0 ? -1 : 1
          const tx = direction * (60 + Math.random() * 120) 
          const ty = -(60 + Math.random() * 40) 
          const tf = ty + (90 + Math.random() * 40) 
          const scale = 0.5 + Math.random() * 0.8
          
          catchSparkles.value.push({
            id: `sparkle-${side}-${Temporal.Now.instant().epochMilliseconds}-${i}-${Math.random()}`,
            side,
            tx, ty, tf, scale,
            delay: `${Math.random() * 0.3}s`
          })
        }
      },
      onComplete: () => {
        catchSparkles.value = catchSparkles.value.filter(s => s.side !== side)
      }
    })
    
    return awaitAnimation(tl)
  }

  const handleReleaseRequest = (detail: string | { side?: string, pokemon?: Pokemon }) => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'player')
    const pokemon = typeof detail === 'object' ? detail?.pokemon : null
    
    // Extraer ballId del pokemon si tiene el tag ball:
    if (pokemon?.tags) {
      const ballTag = pokemon.tags.find(t => t.startsWith('ball:'))
      if (ballTag) {
        const id = ballTag.split(':')[1]
        if (id) seats.value[side]!.ballId = id
      }
    } else {
      seats.value[side]!.ballId = 'pokeball'
    }

    seats.value[side]!.isCaptureActive = false
    seats.value[side]!.animState = 'releasing'
    
    const tl = createTimeline()
    tl.to({}, {
      duration: 0.8,
      onComplete: () => {
        seats.value[side]!.animState = null
      }
    })
    return awaitAnimation(tl)
  }

  const handleCatchRequest = (detail: string | { side?: string, ballId?: string }) => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'enemy')
    if (typeof detail === 'object' && detail?.ballId) {
      // Normalizar ballId (ej: "Súper Bola" -> "superball")
      const id = detail.ballId.toLowerCase()
        .replace(/ /g, '')
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/bola/g, 'ball')
        .replace(/_/g, '') 
        .replace(/superball/g, 'greatball') // Mapeo directo a ID técnico
      
      seats.value[side]!.ballId = id
    }
    
    const target = side === 'player' ? battleStore.player : toValue(enemyRef)
    caughtPokemonSnapshot.value = target ? { ...target } : null

    seats.value[side]!.animState = 'catching'

    const tl = createTimeline()
    tl.to({}, {
      duration: 0.8,
      onComplete: () => {
        seats.value[side]!.animState = 'trapped'
      }
    })
    return awaitAnimation(tl)
  }

  const handleShakeRequest = (detail: string | { side?: string }) => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'enemy')
    const seat = seats.value[side]
    if (seat) {
      seat.isShaking = true 
      gsap.delayedCall(0.48, () => { seat.isShaking = false })
    }
  }

  const handleBlinkRequest = (detail: string | { side?: string }) => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'enemy')
    const seat = seats.value[side]
    if (seat) {
      seat.isBlinking = true
      gsap.delayedCall(0.48, () => { seat.isBlinking = false })
    }
  }

  const handleFaintAnim = (e: string | { side?: string; isFaint?: boolean } | { detail?: string | { side: string; isFaint?: boolean } }) => {
    if (isFaintInProgress.value) return Promise.resolve() 
    
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
    const tl = createTimeline()
    
    tl.to({}, {
      duration: 1.3,
      onComplete: () => {
        isFaintInProgress.value = false 
        faintedPokemonSnapshot.value = null 
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
    caughtPokemonSnapshot.value = null
    isFaintInProgress.value = false
    faintedPokemonSnapshot.value = null
    trainerAnimState.value = null
    isTrainerVisible.value = false
    
    Object.keys(seats.value).forEach(side => {
      const seat = seats.value[side]
      if (seat) {
        seat.animState = null
        seat.ballId = 'pokeball'
        seat.isCaptureActive = false
        seat.isAnimatingCapture = false
        seat.isShaking = false
        seat.isBlinking = false
      }
    })
  }

  const playCatchCelebration = (side: string) => {
    const tl = createTimeline()
    tl.to({}, {
      duration: 1.5,
      onStart: () => {
        gameBus.emit('PLAY_SOUND', 'caught')
        triggerCatchSparkles(side)
      }
    })
    return awaitAnimation(tl)
  }

  const playBallFadeOut = (side: string) => {
    const seat = seats.value[side]
    if (!seat) return Promise.resolve()
    
    const tl = createTimeline()
    tl.add(() => {
      seat.isCaptureActive = false 
    })
    tl.to({}, { duration: 0.4 })
    tl.add(() => {
      seat.isAnimatingCapture = false
      seat.animState = null
      caughtPokemonSnapshot.value = null
    })
    return awaitAnimation(tl)
  }

  const initListeners = () => {
    gameBus.on('PLAY_CATCH_ENERGY', (e: Event) => handleCatchRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_WITHDRAW', (e: Event) => handleCatchRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_RELEASE_ENERGY', (e: Event) => handleReleaseRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_SEND_OUT', (e: Event) => handleReleaseRequest((e as CustomEvent).detail))
    
    gameBus.on('PLAY_CATCH_ENERGY', (e: Event) => handleCatchRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_DAMAGE', (e: Event) => handleShakeRequest((e as CustomEvent).detail))
    gameBus.on('PLAY_BLINK', (e: Event) => handleBlinkRequest((e as CustomEvent).detail))
    
    // CATCH_SHAKE: La Pokéball debe sacudirse Y parpadear
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
      // Solo resetear estado de captura/ball.
      // La orquestación de animaciones de intro (ENTRY_ANIM / ENCOUNTER_ANIM)
      // es responsabilidad exclusiva del watcher FSM en BattleArenaView.vue.
      Object.keys(seats.value).forEach(side => {
        const seat = seats.value[side]
        if (seat) {
          seat.isCaptureActive = false
          seat.ballId = 'pokeball'
          seat.animState = null
        }
      })
      caughtPokemonSnapshot.value = null
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
