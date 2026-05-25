import { ref, computed, toValue, type MaybeRefOrGetter } from 'vue'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/gameBus'
import { awaitAnimation, createTimeline } from '@/logic/utils/gsapHelpers'
import type { useBattleStore } from '@/stores/battle'
import type { Pokemon } from '@/types/pokemon'

export interface CatchSparkle {
  id: string;
  side: string;
  tx: number;
  ty: number;
  tf: number;
  scale: number;
  delay: string;
}

interface SeatState {
  animState: 'catching' | 'trapped' | 'releasing' | null;
  ballId: string;
  isCaptureActive: boolean;
  isAnimatingCapture: boolean;
  isShaking: boolean;
  isBlinking: boolean;
}

export function useBattleCaptureAnimations(
  battleStore: ReturnType<typeof useBattleStore>,
  enemyRef: MaybeRefOrGetter<Pokemon | null | undefined>
) {
  const caughtPokemonSnapshot = ref<Pokemon | null>(null)
  const isFaintInProgress = ref(false)
  const faintedPokemonSnapshot = ref<(Partial<Pokemon> & { side: string }) | null>(null)
  const catchSparkles = ref<CatchSparkle[]>([])

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
    enemy: createDefaultSeat()
  })

  // Explicit initialization to prevent types issue
  seats.value.player = createDefaultSeat()
  seats.value.enemy = createDefaultSeat()

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

  const handleReleaseRequest = (detail: string | { side?: string, pokemon?: Pokemon }) => {
    const side = typeof detail === 'string' ? detail : (detail?.side || 'player')
    const pokemon = typeof detail === 'object' ? detail?.pokemon : null
    
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

  const resetCaptureStates = () => {
    caughtPokemonSnapshot.value = null
    isFaintInProgress.value = false
    faintedPokemonSnapshot.value = null
    
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
    handleFaintAnim,
    playCatchCelebration,
    playBallFadeOut,
    resetCaptureStates
  }
}
