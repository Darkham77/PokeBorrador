import { ref, type Ref } from 'vue'
import { awaitAnimation, createTimeline } from '@/logic/utils/gsapHelpers'
import type { SeatState } from '@/composables/useBattleSeats'

export function useBattleTrainerAnimations(seats: Ref<Record<string, SeatState>>) {
  // Trainer visual states
  const trainerAnimState = ref<string | null>(null) // 'entering' | 'retreating' | 'idle'
  const isTrainerVisible = ref(false)

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
    // ~0.4s fade-in + ~2.1s minimum read time = 2.5s total
    tl.to({}, { duration: 2.5 })
    return awaitAnimation(tl)
  }

  const triggerTrainerRetreat = (): Promise<void> => {
    trainerAnimState.value = 'retreating'
    const tl = createTimeline()
    tl.to({}, {
      duration: 0.8
    })
    return awaitAnimation(tl)
  }

  const triggerPokemonCall = (): Promise<void> => {
    if (seats.value?.seat1?.entry) {
      seats.value.seat1.entry.animState = 'releasing'
    }
    const tl = createTimeline()
    // Allow ~0.8s for the Poké Ball release animation
    tl.to({}, { duration: 0.8 })
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
    triggerPokemonCall,
    resetTrainerStates
  }
}
