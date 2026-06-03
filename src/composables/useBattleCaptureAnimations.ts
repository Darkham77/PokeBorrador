import { ref, computed, toValue, type MaybeRefOrGetter } from 'vue'
import gsap from 'gsap'
import { gameBus } from '@/logic/gameBus'
import { awaitAnimation, createTimeline } from '@/logic/utils/gsapHelpers'
import type { useBattleStore } from '@/stores/battle'
import type { Pokemon } from '@/types/pokemon'
import { useBattleSeats } from '@/composables/useBattleSeats'

export interface CatchSparkle {
  id: string;
  side: string;
  tx: number;
  ty: number;
  tf: number;
  scale: number;
  delay: string;
}

export function useBattleCaptureAnimations(
  battleStore: ReturnType<typeof useBattleStore>,
  enemyRef: MaybeRefOrGetter<Pokemon | null | undefined>
) {
  const caughtPokemonSnapshot = ref<Pokemon | null>(null)
  const isFaintInProgress = ref(false)
  const faintedPokemonSnapshot = ref<(Partial<Pokemon> & { side: string }) | null>(null)
  const catchSparkles = ref<CatchSparkle[]>([])

  const {
    seats,
    getSeat,
    getSeatProperty
  } = useBattleSeats()

  const playerAnimState = computed(() => seats.value.seat1.entry.animState)
  const enemyAnimState = computed(() => seats.value.seat2.entry.animState)
  const playerActivePokeballId = computed(() => seats.value.seat1.entry.ballId)
  const enemyActivePokeballId = computed(() => seats.value.seat2.entry.ballId)
  const playerCaptureActive = computed(() => seats.value.seat1.entry.isCaptureActive)
  const enemyCaptureActive = computed(() => seats.value.seat2.entry.isCaptureActive)
  const playerIsShaking = computed(() => seats.value.seat1.entry.isShaking)
  const playerIsBlinking = computed(() => seats.value.seat1.entry.isBlinking)
  const enemyIsShaking = computed(() => seats.value.seat2.entry.isShaking)
  const enemyIsBlinking = computed(() => seats.value.seat2.entry.isBlinking)

  const isCaptureSequenceActive = computed(() => 
    Object.values(seats.value).some(seat => 
      seat.entry.isCaptureActive || seat.entry.isAnimatingCapture ||
      seat.exit.isCaptureActive || seat.exit.isAnimatingCapture
    )
  )

  const triggerCatchSparkles = (side: string) => {
    const tl = createTimeline()
    const count = 12
    
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

  const activeTweens = new Map<string, gsap.core.Tween | gsap.core.Timeline>()
  // Pending resolvers: set when awaitTween is called before the component has mounted.
  // Resolved immediately by the REGISTER_TWEEN handler when the component fires the event.
  const pendingTweenResolvers = new Map<string, () => void>()

  const onRegisterTween = (e: Event) => {
    const data = (e as CustomEvent).detail
    if (data && data.key && data.tween) {
      activeTweens.set(data.key, data.tween)
      // Unblock any awaitTween call that was already waiting for this key
      const resolver = pendingTweenResolvers.get(data.key)
      if (resolver) {
        pendingTweenResolvers.delete(data.key)
        resolver()
      }
    }
  }

  const initListeners = () => {
    cleanupListeners()
    gameBus.on('REGISTER_TWEEN', onRegisterTween)
  }

  const cleanupListeners = () => {
    gameBus.off('REGISTER_TWEEN', onRegisterTween)
    activeTweens.clear()
    pendingTweenResolvers.clear()
  }


  /**
   * Awaits a GSAP tween registered by BattleCombatant via REGISTER_TWEEN.
   *
   * - If the tween is already registered (component was mounted): awaits it directly.
   * - If not yet registered (component just mounting): blocks on an event-driven Promise
   *   that resolves the instant the component fires REGISTER_TWEEN — no polling.
   * - GSAP delayedCall acts as a 2-second safety fallback (not setTimeout).
   */
  const awaitTween = async (animKey: string): Promise<void> => {
    // Fast path: tween already registered
    const existing = activeTweens.get(animKey)
    if (existing) {
      await existing
      activeTweens.delete(animKey)
      return
    }

    // Slow path: wait for the component to fire REGISTER_TWEEN
    const fallback = { timer: null as ReturnType<typeof gsap.delayedCall> | null }
    await new Promise<void>(resolve => {
      pendingTweenResolvers.set(animKey, resolve)
      // Safety: if component never mounts or has no sprite, unblock after 2s via GSAP (not setTimeout)
      fallback.timer = gsap.delayedCall(2, () => {
        if (pendingTweenResolvers.has(animKey)) {
          pendingTweenResolvers.delete(animKey)
          resolve()
        }
      })
    })
    fallback.timer?.kill()

    // Now await the actual GSAP tween (native GSAP coordination)
    const tween = activeTweens.get(animKey)
    if (tween) {
      await tween
      activeTweens.delete(animKey)
    }
  }


  const handleReleaseRequest = async (detail: string | { side?: string, pokemon?: Pokemon }) => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'player')
    const pokemon = typeof detail === 'object' ? detail?.pokemon : null
    const seat = getSeat(side)
    const slot = seat.entry
    const exitSlot = seat.exit

    if (pokemon?.tags) {
      const ballTag = pokemon.tags.find(t => t.startsWith('ball:'))
      if (ballTag) {
        const id = ballTag.split(':')[1]
        if (id) slot.ballId = id
      }
    } else {
      slot.ballId = 'pokeball'
    }

    const target = pokemon || (side === 'player' ? battleStore.player : toValue(enemyRef))
    const targetUid = pokemon?.uid || target?.uid || null

    // Reset exit slot if this pokemon is breaking free/releasing from it
    if (exitSlot.pokemonUid === targetUid) {
      exitSlot.animState = null
      exitSlot.pokemonUid = null
      exitSlot.isCaptureActive = false
      exitSlot.isAnimatingCapture = false
    }

    slot.pokemonUid = targetUid
    slot.isCaptureActive = false
    slot.animState = 'releasing'
    gameBus.emit('PLAY_SOUND', 'ballHit')

    // Poll until the component mounts, registers the tween, and completes the animation.
    // Uses retry loop because newly-mounted BattleCombatant components have spriteRef=null
    // on the first animState watch tick, delaying tween registration by 1-2 frames.
    const animKey = `${side}-${targetUid || 'active'}`
    await awaitTween(animKey)

    slot.animState = null
    slot.pokemonUid = null
  }

  const handleCatchRequest = async (detail: string | { side?: string, ballId?: string, pokemon?: Pokemon }) => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'enemy')
    const pokemon = typeof detail === 'object' ? (detail as { pokemon?: Pokemon })?.pokemon : null
    const slot = getSeat(side).exit

    if (typeof detail === 'object' && detail?.ballId) {
      const id = detail.ballId.toLowerCase()
        .replace(/ /g, '')
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/bola/g, 'ball')
        .replace(/_/g, '') 
        .replace(/superball/g, 'greatball')
      
      slot.ballId = id
    } else if (pokemon?.tags) {
      const ballTag = pokemon.tags.find(t => t.startsWith('ball:'))
      if (ballTag) {
        const id = ballTag.split(':')[1]
        if (id) slot.ballId = id
      }
    } else {
      slot.ballId = 'pokeball'
    }
    
    const target = pokemon || (side === 'player' ? battleStore.player : toValue(enemyRef))
    caughtPokemonSnapshot.value = target ? { ...target } : null

    const targetUid = pokemon?.uid || target?.uid || null
    slot.pokemonUid = targetUid
    slot.animState = 'catching'
    slot.isCaptureActive = false
    slot.isAnimatingCapture = true
    gameBus.emit('PLAY_SOUND', 'ballHit')

    // Poll until the component registers the tween and the animation completes.
    const animKey = `${side}-${targetUid || 'active'}`
    await awaitTween(animKey)

    slot.animState = 'trapped'
  }

  const handleShakeRequest = (detail: string | { side?: string }): Promise<void> => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'enemy')
    const seat = getSeat(side)
    if (seat) {
      seat.entry.isShaking = true 
      seat.exit.isShaking = true 
      const tl = createTimeline()
      // La animación de balanceo físico de la Poké Ball en el componente dura 0.60s
      tl.to({}, { duration: 0.60 })
      tl.add(() => { 
        seat.entry.isShaking = false 
        seat.exit.isShaking = false 
      })
      // Pausa dramática añadida al timeline de GSAP para sincronizar de forma pura
      tl.to({}, { duration: 0.40 })
      return awaitAnimation(tl)
    }
    return Promise.resolve()
  }

  const handleBlinkRequest = (detail: string | { side?: string }): Promise<void> => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'enemy')
    const seat = getSeat(side)
    if (seat) {
      seat.entry.isBlinking = true
      seat.exit.isBlinking = true
      const tl = createTimeline()
      tl.add(() => {
        gameBus.emit('PLAY_SOUND', 'statusDamage')
      })
      tl.to({}, { duration: 0.48 })
      tl.add(() => { 
        seat.entry.isBlinking = false 
        seat.exit.isBlinking = false 
      })
      return awaitAnimation(tl)
    }
    return Promise.resolve()
  }

  const handleHealRequest = async (detail: string | { side?: string }) => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'player')
    const seat = getSeat(side)
    if (seat) {
      seat.entry.isHealing = true
      seat.exit.isHealing = true
      const tl = createTimeline()
      tl.add(() => {
        gameBus.emit('PLAY_SOUND', 'heal')
      })
      tl.to({}, { duration: 0.6 })
      tl.add(() => {
        seat.entry.isHealing = false
        seat.exit.isHealing = false
      })
      await awaitAnimation(tl)
    }
  }

  const handleFaintAnim = (e: string | { side?: string; isFaint?: boolean; pokemon?: Pokemon } | { detail?: string | { side: string; isFaint?: boolean; pokemon?: Pokemon } }) => {
    if (isFaintInProgress.value) return Promise.resolve() 
    
    const data = typeof e === 'object' 
      ? (e && 'detail' in e ? e.detail : e) 
      : e
    const side = typeof data === 'string' 
      ? data 
      : (data && 'side' in data ? (data as { side: string }).side : 'enemy')

    const hasTrainer = side === 'player' || 
                       !!battleStore.state?.isTrainer || 
                       !!battleStore.state?.isGym
    
    faintedPokemonSnapshot.value = side === 'enemy' 
      ? (toValue(enemyRef) ? { ...toValue(enemyRef), side: 'enemy' } : { side: 'enemy' })
      : (battleStore.player ? { ...battleStore.player, side: 'player' } : { side: 'player' })
      
    isFaintInProgress.value = true
    const tl = createTimeline()
    tl.add(() => {
      gameBus.emit('PLAY_SOUND', 'faint')
    })
    
    if (hasTrainer) {
      const slot = getSeat(side).exit
      slot.animState = 'catching'
      tl.add(() => {
        gameBus.emit('PLAY_SOUND', 'ballHit')
      })
      
      const pokemon = side === 'player' ? battleStore.player : toValue(enemyRef)
      slot.pokemonUid = pokemon?.uid || null
      if (pokemon?.tags) {
        const ballTag = pokemon.tags.find(t => t.startsWith('ball:'))
        if (ballTag) {
          const id = ballTag.split(':')[1]
          if (id) slot.ballId = id
        }
      } else {
        slot.ballId = 'pokeball'
      }

      tl.to({}, {
        duration: 0.5,
        onComplete: () => {
          slot.animState = 'trapped'
        }
      })
      tl.to({}, {
        duration: 0.5,
        onComplete: () => {
          isFaintInProgress.value = false 
          faintedPokemonSnapshot.value = null 
          slot.pokemonUid = null
          slot.animState = null
        }
      })
    } else {
      tl.to({}, {
        duration: 1.3,
        onComplete: () => {
          isFaintInProgress.value = false 
          faintedPokemonSnapshot.value = null 
        }
      })
    }
    
    return awaitAnimation(tl)
  }

  const playCatchCelebration = (side: string) => {
    const seat = getSeat(side)
    if (seat) {
      seat.entry.isCaptureActive = true
      seat.exit.isCaptureActive = true
    }
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

  const playBallFadeOut = async (side: string) => {
    const seat = getSeat(side)
    if (!seat) return
    
    // Desencadenar la transición de salida en Vue cambiando las propiedades reactivas del asiento
    seat.entry.isCaptureActive = false 
    seat.exit.isCaptureActive = false 
    seat.entry.animState = null
    seat.exit.animState = null
    
    // Esperar el tween de GSAP de salida registrado por onBallLeave
    await awaitTween(`ball-fadeout-${side}`)
    
    // Limpieza final tras completarse el desvanecimiento de GSAP
    seat.entry.isAnimatingCapture = false
    seat.exit.isAnimatingCapture = false
    caughtPokemonSnapshot.value = null
  }

  const resetCaptureStates = () => {
    caughtPokemonSnapshot.value = null
    isFaintInProgress.value = false
    faintedPokemonSnapshot.value = null
    activeTweens.clear()
    pendingTweenResolvers.clear()
    
    Object.keys(seats.value).forEach(side => {
      const seat = seats.value[side]
      if (seat) {
        seat.entry.animState = null
        seat.entry.ballId = 'pokeball'
        seat.entry.isCaptureActive = false
        seat.entry.isAnimatingCapture = false
        seat.entry.isShaking = false
        seat.entry.isBlinking = false

        seat.exit.animState = null
        seat.exit.ballId = 'pokeball'
        seat.exit.isCaptureActive = false
        seat.exit.isAnimatingCapture = false
        seat.exit.isShaking = false
        seat.exit.isBlinking = false
      }
    })
  }

  const getPokemonAnimState = (side: string, pokemon?: Pokemon | null) => getSeatProperty(side, pokemon, 'animState', null, battleStore.player?.uid, battleStore.enemy?.uid)
  const getPokemonBallId = (side: string, pokemon?: Pokemon | null) => getSeatProperty(side, pokemon, 'ballId', 'pokeball', battleStore.player?.uid, battleStore.enemy?.uid)
  const getPokemonCaptureActive = (side: string, pokemon?: Pokemon | null) => getSeatProperty(side, pokemon, 'isCaptureActive', false, battleStore.player?.uid, battleStore.enemy?.uid)
  const getPokemonIsShaking = (side: string, pokemon?: Pokemon | null) => getSeatProperty(side, pokemon, 'isShaking', false, battleStore.player?.uid, battleStore.enemy?.uid)
  const getPokemonIsBlinking = (side: string, pokemon?: Pokemon | null) => getSeatProperty(side, pokemon, 'isBlinking', false, battleStore.player?.uid, battleStore.enemy?.uid)
  const getPokemonIsHealing = (side: string, pokemon?: Pokemon | null) => getSeatProperty(side, pokemon, 'isHealing', false, battleStore.player?.uid, battleStore.enemy?.uid)

  return {
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
    awaitTween,
    initListeners,
    cleanupListeners
  }

}
