import { ANIM_TIMINGS, ANIM_EASES } from '@/logic/utils/animationRegistry'
import { awaitAnimation, createTimeline } from '@/logic/utils/gsapHelpers'

/**
 * useAnimationSync
 * 
 * Centralized orchestrator for battle animations.
 * Provides a Promise-based API for the FSM to synchronize with visual effects.
 */
export function useAnimationSync() {
  
  /**
   * Generic runner for registered animations.
   * In the future, this will look up sequences in a registry.
   */
  const play = async (animationId: string, target: object) => {
    // Example implementation for common animations
    switch (animationId) {
      case 'SHAKE': {
        const tlShake = createTimeline()
        tlShake.to(target, { 
          x: -10, 
          duration: ANIM_TIMINGS.DAMAGE_SHAKE / 4, 
          ease: ANIM_EASES.LINEAR 
        })
        .to(target, { 
          x: 10, 
          duration: ANIM_TIMINGS.DAMAGE_SHAKE / 2, 
          ease: ANIM_EASES.LINEAR 
        })
        .to(target, { 
          x: 0, 
          duration: ANIM_TIMINGS.DAMAGE_SHAKE / 4, 
          ease: ANIM_EASES.LINEAR 
        })
        return awaitAnimation(tlShake)
      }

      case 'BLINK': {
        const tlBlink = createTimeline()
        tlBlink.to(target, { 
          opacity: 0, 
          duration: 0.1, 
          repeat: 3, 
          yoyo: true 
        })
        return awaitAnimation(tlBlink)
      }

      default:
        console.warn(`Animation ${animationId} not implemented in useAnimationSync`)
        return Promise.resolve()
    }
  }

  return {
    play
  }
}
