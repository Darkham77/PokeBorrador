import { ref, toValue, type MaybeRefOrGetter, watch } from 'vue'
import { gsap } from 'gsap'
import { gameBus } from '@/logic/events/gameBus'
import { awaitAnimation, createTimeline } from '@/logic/utils/gsapHelpers'
import type { Pokemon } from '@/types/pokemon/pokemon'

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

  // Watch silhouette mode: trigger battle cry immediately when leaving silhouette/shadow state
  watch(isWildSilhouette, (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      const enemy = toValue(enemyRef)
      if (enemy) {
        gameBus.emit('PLAY_CRY', { name: enemy.id || enemy.name })
      }
    }
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
    
    const tl = createTimeline()
    tl.to({}, { duration: 0.6 })
    tl.add(() => {
      isWildSilhouette.value = false
      isWildEntryAnimation.value = false
      wildRevealActive.value = false
      const enemy = toValue(enemyRef)
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
    isEmerging.value = false

    tl.to({}, { 
      duration: 0.5, 
      onStart: () => { isEmerging.value = true },
      onComplete: () => { wildRevealActive.value = false }
    })
    
    tl.to({}, {
      duration: 0.4,
      onComplete: () => { isWildSilhouette.value = false }
    })

    tl.to({}, {
      duration: 0.3,
      onComplete: () => {
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
