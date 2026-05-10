import { gsap } from 'gsap'

/**
 * Utility to convert a GSAP animation or timeline into a Promise.
 * Useful for awaiting animations in FSM transitions.
 */
export const awaitAnimation = (anim: gsap.core.Animation): Promise<void> => {
  return new Promise((resolve) => {
    anim.eventCallback('onComplete', resolve)
  })
}

/**
 * Kill all active tweens on a specific target to prevent memory leaks.
 */
export const killTweens = (target: string | object) => {
  gsap.killTweensOf(target)
}

/**
 * Creates a standard timeline with common defaults.
 */
export const createTimeline = (vars?: gsap.TimelineVars) => {
  return gsap.timeline({
    ...vars,
    defaults: {
      ease: 'power2.out',
      duration: 0.4,
      ...vars?.defaults
    }
  })
}

/**
 * Asynchronous pause tied to the GSAP clock.
 * Responds to gsap.globalTimeline.timeScale().
 */
export const gsapSleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    gsap.delayedCall(ms / 1000, resolve)
  })
}
