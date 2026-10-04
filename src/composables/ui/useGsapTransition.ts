import { toValue, type MaybeRefOrGetter } from 'vue'
import gsap from 'gsap'

export type TransitionType = 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom'

export interface GsapTransitionOptions {
  type?: MaybeRefOrGetter<TransitionType>
  duration?: MaybeRefOrGetter<number>
  easeEnter?: MaybeRefOrGetter<string>
  easeLeave?: MaybeRefOrGetter<string>
  yOffset?: MaybeRefOrGetter<number | string>
  xOffset?: MaybeRefOrGetter<number | string>
  scaleOffset?: MaybeRefOrGetter<number>
}

const DEFAULT_TRANSITION_OFFSET_PX = 15 as const
const DEFAULT_TRANSITION_SCALE = 0.95 as const
const DEFAULT_ENTER_DURATION_SEC = 0.3 as const
const DEFAULT_LEAVE_DURATION_SEC = 0.25 as const

/**
 * useGsapTransition
 * Returns a set of GSAP-powered Transition hooks for Vue's <Transition :css="false">.
 */
export function useGsapTransition(options: GsapTransitionOptions = {}) {
  const onBeforeEnter = (el: Element) => {
    const type = toValue(options.type) || 'fade'
    const yOffset = toValue(options.yOffset) ?? DEFAULT_TRANSITION_OFFSET_PX
    const xOffset = toValue(options.xOffset) ?? DEFAULT_TRANSITION_OFFSET_PX
    const scaleOffset = toValue(options.scaleOffset) ?? DEFAULT_TRANSITION_SCALE

    const fromVars: gsap.TweenVars = { opacity: 0 }

    if (type === 'slide-up') {
      fromVars.y = yOffset
    } else if (type === 'slide-down') {
      fromVars.y = typeof yOffset === 'number' ? -yOffset : `-${yOffset}`
    } else if (type === 'slide-left') {
      fromVars.x = xOffset
    } else if (type === 'slide-right') {
      fromVars.x = typeof xOffset === 'number' ? -xOffset : `-${xOffset}`
    } else if (type === 'zoom') {
      fromVars.scale = scaleOffset
    }

    gsap.set(el, fromVars)
  }

  const onEnter = (el: Element, done: () => void) => {
    const duration = toValue(options.duration) ?? DEFAULT_ENTER_DURATION_SEC
    const ease = toValue(options.easeEnter) ?? 'power2.out'

    gsap.to(el, {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration,
      ease,
      onComplete: done
    })
  }

  const onLeave = (el: Element, done: () => void) => {
    const type = toValue(options.type) || 'fade'
    const duration = toValue(options.duration) ?? DEFAULT_LEAVE_DURATION_SEC
    const ease = toValue(options.easeLeave) ?? 'power2.in'
    const yOffset = toValue(options.yOffset) ?? DEFAULT_TRANSITION_OFFSET_PX
    const xOffset = toValue(options.xOffset) ?? DEFAULT_TRANSITION_OFFSET_PX
    const scaleOffset = toValue(options.scaleOffset) ?? DEFAULT_TRANSITION_SCALE

    const toVars: gsap.TweenVars = {
      opacity: 0,
      duration,
      ease,
      onComplete: done
    }

    if (type === 'slide-up') {
      toVars.y = yOffset
    } else if (type === 'slide-down') {
      toVars.y = typeof yOffset === 'number' ? -yOffset : `-${yOffset}`
    } else if (type === 'slide-left') {
      toVars.x = xOffset
    } else if (type === 'slide-right') {
      toVars.x = typeof xOffset === 'number' ? -xOffset : `-${xOffset}`
    } else if (type === 'zoom') {
      toVars.scale = scaleOffset
    }

    gsap.to(el, toVars)
  }

  return {
    beforeEnter: onBeforeEnter,
    enter: onEnter,
    leave: onLeave
  }
}
