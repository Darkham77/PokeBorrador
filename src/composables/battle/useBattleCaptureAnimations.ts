import { ref, computed, toValue, type MaybeRefOrGetter } from 'vue'
import { gameBus } from '@/logic/events/gameBus'
import { awaitAnimation, createTimeline } from '@/logic/utils/gsapHelpers'
import type { useBattleStore } from '@/stores/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { useBattleSeats } from '@/composables/battle/useBattleSeats'
import { useBattleTweenRegistry } from '@/composables/battle/useBattleTweenRegistry'
import { useGameStore } from '@/stores/game'
import { logger } from '@/logic/utils/logger'

const CATCH_SPARKLE_DURATION_SEC = 1.5
const CATCH_CELEBRATION_DURATION_SEC = 1.5
const WILD_FAINT_ANIM_DURATION_SEC = 1.3

interface CatchSparkle {
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

  const {
    activeTweens,
    pendingTweenResolvers,
    initTweenRegistryListeners,
    cleanupTweenRegistryListeners,
    awaitTween
  } = useBattleTweenRegistry()

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

  const isCaptureSequenceActive = computed(() => {
    for (const [key, seat] of Object.entries(seats.value)) {
      if (seat.entry.isCaptureActive || seat.entry.isAnimatingCapture ||
          seat.exit.isCaptureActive || seat.exit.isAnimatingCapture) {
        console.debug(`[E2E-CAPTURE-ACTIVE] seat: ${key}, entry.isCaptureActive: ${seat.entry.isCaptureActive}, entry.isAnimatingCapture: ${seat.entry.isAnimatingCapture}, exit.isCaptureActive: ${seat.exit.isCaptureActive}, exit.isAnimatingCapture: ${seat.exit.isAnimatingCapture}`);
        return true;
      }
    }
    return false;
  })

  // fallow-ignore-next-line complexity
  const fixPokemonBallTagInSave = (pokemonUid: string) => {
    try {
      const gameStore = useGameStore()
      if (!gameStore?.state) return

      let pokemon = gameStore.state.team.find(p => p && p.uid === pokemonUid)
      if (!pokemon && gameStore.state.box) {
        pokemon = gameStore.state.box.find(p => p && p.uid === pokemonUid)
      }

      if (pokemon) {
        if (!pokemon.tags) {
          pokemon.tags = []
        }
        if (!pokemon.tags.some(t => t.startsWith('ball:'))) {
          pokemon.tags.push('ball:pokeball')
          logger.info('useBattleCaptureAnimations', `Fixed missing ball tag for pokemon uid=${pokemonUid} in save data. Added ball:pokeball.`)
          gameStore.scheduleSave()
        }
      }
    } catch (e) {
      logger.error('useBattleCaptureAnimations', `Failed to fix missing ball tag in save for pokemon uid=${pokemonUid}`, e)
    }
  }

  const triggerCatchSparkles = (side: string) => {
    const tl = createTimeline()
    const count = 12
    
    tl.to({}, {
      duration: CATCH_SPARKLE_DURATION_SEC,
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

  const initListeners = () => {
    initTweenRegistryListeners()
  }

  const cleanupListeners = () => {
    cleanupTweenRegistryListeners()
  }

  const resolveBallId = (pokemon: Pokemon | null | undefined): string => {
    if (!pokemon?.tags) return 'pokeball'
    const ballTag = pokemon.tags.find(t => t.startsWith('ball:'))
    if (!ballTag) {
      logger.warn('useBattleCaptureAnimations', `Pokemon uid=${pokemon.uid} has no ball: tag in tags. Falling back to pokeball.`)
      if (pokemon.uid) fixPokemonBallTagInSave(pokemon.uid)
      return 'pokeball'
    }
    const id = ballTag.split(':')[1]
    if (!id) {
      logger.warn('useBattleCaptureAnimations', `Invalid ball tag format for pokemon uid=${pokemon.uid}: "${ballTag}". Falling back to pokeball.`)
      if (pokemon.uid) fixPokemonBallTagInSave(pokemon.uid)
      return 'pokeball'
    }
    return id
  }

  // fallow-ignore-next-line complexity
  const handleReleaseRequest = async (detail: string | { side?: string, pokemon?: Pokemon }) => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'player')
    const pokemon = typeof detail === 'object' ? detail?.pokemon : null
    const seat = getSeat(side)
    const slot = seat.entry
    const exitSlot = seat.exit

    slot.ballId = resolveBallId(pokemon)

    const target = pokemon || (side === 'player' ? battleStore.player : toValue(enemyRef))
    const targetUid = pokemon?.uid || target?.uid || null

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

    const animKey = `${side}-${targetUid || 'active'}`
    await awaitTween(animKey)

    slot.animState = null
    slot.pokemonUid = null
  }

  const handleWithdrawRequest = async (detail: string | { side?: string, pokemon?: Pokemon }) => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'player')
    const pokemon = typeof detail === 'object' ? (detail as { pokemon?: Pokemon })?.pokemon : null
    const slot = getSeat(side).exit

    slot.ballId = resolveBallId(pokemon)

    const target = pokemon || (side === 'player' ? battleStore.player : toValue(enemyRef))
    const targetUid = pokemon?.uid || target?.uid || null

    slot.pokemonUid = targetUid
    slot.isCaptureActive = false
    slot.animState = 'catching'
    gameBus.emit('PLAY_SOUND', 'ballHit')

    const animKey = `${side}-${targetUid || 'active'}`
    await awaitTween(animKey)

    slot.animState = null
    slot.pokemonUid = null
  }

  // fallow-ignore-next-line complexity
  const handleCatchRequest = async (detail: string | { side?: string, ballId?: string, pokemon?: Pokemon }) => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'enemy')
    const pokemon = typeof detail === 'object' ? (detail as { pokemon?: Pokemon })?.pokemon : null
    const slot = getSeat(side).exit

    if (typeof detail === 'object' && detail?.ballId) {
      slot.ballId = detail.ballId
    } else if (pokemon?.tags) {
      const ballTag = pokemon.tags.find(t => t.startsWith('ball:'))
      if (ballTag) {
        const id = ballTag.split(':')[1]
        if (id) {
          slot.ballId = id
        } else {
          logger.warn('useBattleCaptureAnimations', `Invalid ball tag format on pokemon uid=${pokemon.uid}: "${ballTag}". Falling back to pokeball.`)
          slot.ballId = 'pokeball'
          if (pokemon.uid) fixPokemonBallTagInSave(pokemon.uid)
        }
      } else {
        logger.warn('useBattleCaptureAnimations', `Pokemon uid=${pokemon.uid} has no ball: tag in tags. Falling back to pokeball.`)
        slot.ballId = 'pokeball'
        if (pokemon.uid) fixPokemonBallTagInSave(pokemon.uid)
      }
    } else {
      logger.warn('useBattleCaptureAnimations', `handleCatchRequest called with no ballId and no tags for pokemon. Falling back to pokeball.`)
      slot.ballId = 'pokeball'
      if (pokemon?.uid) fixPokemonBallTagInSave(pokemon.uid)
    }

    const target = pokemon || (side === 'player' ? battleStore.player : toValue(enemyRef))
    caughtPokemonSnapshot.value = target ? { ...target } : null

    const targetUid = pokemon?.uid || target?.uid || null
    slot.pokemonUid = targetUid

    const isFainted = target ? target.hp === 0 : false
    if (isFainted) {
      slot.animState = 'trapped'
      slot.isCaptureActive = false
      slot.isAnimatingCapture = false
      return
    }

    slot.animState = 'catching'
    slot.isCaptureActive = false
    slot.isAnimatingCapture = true
    gameBus.emit('PLAY_SOUND', 'ballHit')

    const animKey = `${side}-${targetUid || 'active'}`
    await awaitTween(animKey)

    slot.animState = 'trapped'
    slot.isAnimatingCapture = false
  }

const GSAP_CAPTURE_SHAKE_ACTIVE_DUR_SEC = 0.60
const GSAP_CAPTURE_SHAKE_REST_DUR_SEC = 0.40
const GSAP_CAPTURE_BLINK_DUR_SEC = 0.48

  const handleShakeRequest = (detail: string | { side?: string }): Promise<void> => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'enemy')
    const seat = getSeat(side)
    if (seat) {
      seat.entry.isShaking = true 
      seat.exit.isShaking = true 
      const tl = createTimeline()
      tl.to({}, { duration: GSAP_CAPTURE_SHAKE_ACTIVE_DUR_SEC })
      tl.add(() => { 
        seat.entry.isShaking = false 
        seat.exit.isShaking = false 
      })
      tl.to({}, { duration: GSAP_CAPTURE_SHAKE_REST_DUR_SEC })
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
      tl.to({}, { duration: GSAP_CAPTURE_BLINK_DUR_SEC })
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

  // fallow-ignore-next-line complexity
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
    
    const pokemon = side === 'player' ? battleStore.player : toValue(enemyRef)

    faintedPokemonSnapshot.value = side === 'enemy' 
      ? (toValue(enemyRef) ? { ...toValue(enemyRef), side: 'enemy' } : { side: 'enemy' })
      : (battleStore.player ? { ...battleStore.player, side: 'player' } : { side: 'player' })
      
    isFaintInProgress.value = true
    const tl = createTimeline()
    tl.add(() => {
      if (pokemon) {
        gameBus.emit('PLAY_CRY', { name: pokemon.id || pokemon.name, isFaint: true })
      }
    })
    
    if (hasTrainer) {
      const slot = getSeat(side).exit
      slot.animState = 'catching'
      tl.add(() => {
        gameBus.emit('PLAY_SOUND', 'ballHit')
      })
      
      slot.pokemonUid = pokemon?.uid || null
      slot.ballId = resolveBallId(pokemon)


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
        duration: WILD_FAINT_ANIM_DURATION_SEC,
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
      duration: CATCH_CELEBRATION_DURATION_SEC,
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
    
    seat.entry.isCaptureActive = false 
    seat.exit.isCaptureActive = false 
    seat.entry.animState = null
    seat.exit.animState = null
    
    await awaitTween(`ball-fadeout-${side}`)
    
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
    handleWithdrawRequest,
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
