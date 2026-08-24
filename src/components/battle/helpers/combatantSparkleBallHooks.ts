/**
 * src/components/battle/helpers/combatantSparkleBallHooks.ts
 * 
 * Vue transition hooks for shiny sparkles and Pokeball in/out animations.
 */

import { gsap } from 'gsap'
import { gameBus } from '@/logic/events/gameBus'
import type { BattleSide } from '@/types/battle/battle'
import {
  SPARKLE_FULL_ROTATION_DEG,
  SPARKLE_HORIZONTAL_DURATION_SEC,
  SPARKLE_FOUNTAIN_UP_DURATION_SEC,
  SPARKLE_FOUNTAIN_DOWN_DURATION_SEC,
  POKEBALL_APPEAR_DURATION_SEC
} from '@/logic/constants/animations'

const BALL_LEAVE_SCALE = 0.5
const BALL_LEAVE_DURATION_SEC = 0.2
const SPARKLE_CENTER_OFFSET_PERCENT = -50

export function onSparkleEnter(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  const tx = parseFloat(htmlEl.dataset.tx || '0')
  const ty = parseFloat(htmlEl.dataset.ty || '0')
  const tf = parseFloat(htmlEl.dataset.tf || '0')
  const delay = parseFloat((htmlEl.dataset.delay || '0s').replace('s', ''))
  const scale = parseFloat(htmlEl.dataset.scale || '1')

  gsap.set(htmlEl, { 
    x: 0, 
    y: 0, 
    xPercent: SPARKLE_CENTER_OFFSET_PERCENT, 
    yPercent: SPARKLE_CENTER_OFFSET_PERCENT, 
    scale: 0, 
    opacity: 1,
    rotation: 0
  })

  gsap.to(htmlEl, {
    x: tx,
    rotation: SPARKLE_FULL_ROTATION_DEG,
    duration: SPARKLE_HORIZONTAL_DURATION_SEC,
    delay: delay,
    ease: 'power1.out'
  })

  gsap.to(htmlEl, {
    y: ty,
    scale: scale,
    duration: SPARKLE_FOUNTAIN_UP_DURATION_SEC,
    delay: delay,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(htmlEl, {
        y: tf,
        opacity: 0,
        duration: SPARKLE_FOUNTAIN_DOWN_DURATION_SEC,
        ease: 'power2.in',
        onComplete: done
      })
    }
  })
}

export function onBallEnter(el: Element, done: () => void) {
  gsap.fromTo(el, 
    { opacity: 0, scale: 0.5 }, 
    { opacity: 1, scale: 1, duration: POKEBALL_APPEAR_DURATION_SEC, ease: 'back.out(1.7)', onComplete: done }
  )
}

export function onBallLeave(el: Element, side: BattleSide, done: () => void) {
  const tween = gsap.to(el, { 
    opacity: 0, 
    scale: BALL_LEAVE_SCALE, 
    duration: BALL_LEAVE_DURATION_SEC,
    ease: 'power2.in', 
    onComplete: done 
  })
  const animKey = `ball-fadeout-${side}`
  gameBus.emit('REGISTER_TWEEN', { key: animKey, tween })
}
