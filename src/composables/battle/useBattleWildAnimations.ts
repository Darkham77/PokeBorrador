import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/events/gameBus'
import { awaitAnimation, createTimeline } from '@/logic/utils/gsapHelpers'
import type { Pokemon } from '@/types/pokemon/pokemon'

const EMERGE_JUMP_DURATION_SEC = 0.5
const EMERGE_SETTLE_DURATION_SEC = 0.3
const REVEAL_DURATION_SEC = 0.6

export function useBattleWildAnimations(
  enemyRef: MaybeRefOrGetter<Pokemon | null | undefined>
) {
  // Wild / Entry visual states
  const isWildEntryAnimation = ref(false)
  const isEmerging = ref(false)
  const isWildSilhouette = ref(false)
  const wildRevealActive = ref(false)
  const upcomingIsEmerging = ref(false)
  const isWildSilhouetteHalfway = ref(false)
  const isInitialLoad = ref(true)
  const silhouetteOpacity = ref(0)

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
    
    const enemy = toValue(enemyRef)
    if (enemy) {
      gameBus.emit('PLAY_CRY', { name: enemy.id })
    }

    const tl = createTimeline()
    tl.to({}, { duration: REVEAL_DURATION_SEC })
    tl.add(() => {
      isWildSilhouette.value = false
      isWildEntryAnimation.value = false
      wildRevealActive.value = false
      if (enemy?.isShiny) {
        gameBus.emit('PLAY_SOUND', 'shiny')
      }
    })
    return awaitAnimation(tl)
  }

  const triggerWildEmergence = () => Promise.resolve()

  const triggerSearchEncounter = () => {
    const tl = createTimeline()
    
    isWildEntryAnimation.value = true
    isWildSilhouette.value = true
    wildRevealActive.value = true
    isEmerging.value = false

    tl.to({}, { 
      duration: EMERGE_JUMP_DURATION_SEC, 
      onStart: () => { 
        isEmerging.value = true
      },
      onComplete: () => { 
        // Transition from silhouette to normal during mid-air jump
        isWildSilhouette.value = false
        wildRevealActive.value = false
      }
    })
    
    tl.to({}, {
      duration: EMERGE_SETTLE_DURATION_SEC,
      onComplete: () => {
        // On landing, conclude animation and ready for combat
        isWildEntryAnimation.value = false
        isEmerging.value = false
        const enemy = toValue(enemyRef)
        if (enemy?.isShiny) {
          gameBus.emit('PLAY_SOUND', 'shiny')
        }
      }
    })

    return awaitAnimation(tl)
  }

  const resetWildStates = () => {
    isWildEntryAnimation.value = false
    isEmerging.value = false
    isWildSilhouette.value = false
    wildRevealActive.value = false
    upcomingIsEmerging.value = false
    isInitialLoad.value = false
    gsap.killTweensOf(silhouetteOpacity)
    silhouetteOpacity.value = 0
  }

  return {
    isWildEntryAnimation,
    isEmerging,
    isWildSilhouette,
    wildRevealActive,
    upcomingIsEmerging,
    isWildSilhouetteHalfway,
    isInitialLoad,
    silhouetteOpacity,
    revealWildPokemon,
    triggerWildEmergence,
    triggerSearchEncounter,
    resetWildStates
  }
}
