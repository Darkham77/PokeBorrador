import { ref, type Ref } from 'vue'
import { awaitAnimation, createTimeline } from '@/logic/utils/gsapHelpers'
import type { useBattleStore } from '@/stores/battle/battle'
import type { SeatState } from '@/composables/battle/useBattleSeats'
import {
  TRAINER_ENTER_DURATION_SEC,
  TRAINER_EXIT_DURATION_SEC
} from '@/logic/constants/animations'

const _TRAINER_ANIMATION_STATES = ['entering', 'retreating', 'standing', 'idle', 'exiting'] as const

export type TrainerAnimationState = (typeof _TRAINER_ANIMATION_STATES)[number]

export function isTrainerTransitionActive(state: TrainerAnimationState | null): boolean {
  return state === 'entering' || state === 'retreating' || state === 'exiting'
}

export function useBattleTrainerAnimations(
  seats: Ref<Record<string, SeatState>>,
  battleStore: ReturnType<typeof useBattleStore>
) {
  // Trainer visual states
  const trainerAnimState = ref<TrainerAnimationState | null>(null)
  const isTrainerVisible = ref(false)



  const triggerTrainerEntry = (): Promise<void> => {
    trainerAnimState.value = 'entering'
    isTrainerVisible.value = true
    const tl = createTimeline()
    // Allow ~1s for the trainer sprite slide-in to settle visually, or 2.5s for rival presentation
    const isRival = battleStore.state?.isRival || false
    const duration = isRival ? 2.5 : 1.0
    tl.to({}, { duration })
    tl.add(() => { trainerAnimState.value = 'idle' })
    return awaitAnimation(tl)
  }

  const triggerTrainerDialogs = (): Promise<void> => {
    const tl = createTimeline()
    // ~0.4s fade-in + ~2.1s minimum read time = 2.5s total
    const TRAINER_DIALOG_DURATION_SEC = 2.5
    tl.to({}, { duration: TRAINER_DIALOG_DURATION_SEC })
    return awaitAnimation(tl)
  }

  const triggerTrainerRetreat = (): Promise<void> => {
    trainerAnimState.value = 'retreating'
    const tl = createTimeline()
    tl.to({}, {
      duration: TRAINER_ENTER_DURATION_SEC
    })
    return awaitAnimation(tl)
  }

  const triggerTrainerExit = (): Promise<void> => {
    trainerAnimState.value = 'exiting'
    const tl = createTimeline()
    tl.to({}, {
      duration: TRAINER_EXIT_DURATION_SEC
    })
    tl.add(() => {
      trainerAnimState.value = null
      isTrainerVisible.value = false
    })
    return awaitAnimation(tl)
  }

  const triggerPokemonCall = (): Promise<void> => {
    if (seats.value?.seat2?.entry) {
      seats.value.seat2.entry.animState = 'releasing'
    }
    const tl = createTimeline()
    // Allow ~0.8s for the Poké Ball release animation
    tl.to({}, { duration: TRAINER_ENTER_DURATION_SEC })
    return awaitAnimation(tl)
  }

  const resetTrainerStates = () => {
    trainerAnimState.value = null
    isTrainerVisible.value = false
  }

  return {
    trainerAnimState,
    isTrainerVisible,
    triggerTrainerEntry,
    triggerTrainerDialogs,
    triggerTrainerRetreat,
    triggerTrainerExit,
    triggerPokemonCall,
    resetTrainerStates
  }
}
