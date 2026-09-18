/**
 * src/components/common/statusParticleHelpers.ts
 *
 * GSAP particle timeline and tween builder for status condition FX.
 */

import { gsap } from 'gsap'
import type { EffectSettings, WobbleConfig } from '@/data/battle/fx-configs'
import { OPACITY_ZERO } from '@/logic/constants/visuals'

export interface FXData {
  type: string
  emoji: string
  category?: string
  isField?: boolean
  active?: boolean
}

export type FXCategoryKind = 'primary' | 'secondary' | 'tactical' | 'field'

const STATUS_PARTICLE_MIN_SCALE = 0.05 as const
const DEFAULT_RANDOM_SCALE_MIN = 0.6 as const
const DEFAULT_RANDOM_SCALE_MAX = 1.3 as const
const STATUS_GROW_DUR_RATIO = 0.8 as const
const DEFAULT_PARTICLE_DURATION_SEC = 0.8 as const
const STATUS_GROW_MAX_SCALE_MULT = 1.2 as const
const PARTICLE_HALF_DURATION_DIVISOR = 2 as const
const OFFSET_PERCENT_MARGIN = '10%' as const
const CENTER_PERCENT_OFFSET = -50 as const
const STAGGER_INITIAL_DELAY_NONE = 0 as const

function resolveParticleDurations(settings: EffectSettings) {
  const totalDur = settings.duration || DEFAULT_PARTICLE_DURATION_SEC
  const baseGrowDur = settings.growDuration || (totalDur / PARTICLE_HALF_DURATION_DIVISOR)
  const baseShrinkDur = totalDur - baseGrowDur

  if (!settings.randomizeVars) {
    return { growDur: baseGrowDur, shrinkDur: baseShrinkDur }
  }

  return {
    growDur: () => gsap.utils.random(baseGrowDur * STATUS_GROW_DUR_RATIO, baseGrowDur * STATUS_GROW_MAX_SCALE_MULT),
    shrinkDur: () => gsap.utils.random(baseShrinkDur * STATUS_GROW_DUR_RATIO, baseShrinkDur * STATUS_GROW_MAX_SCALE_MULT)
  }
}

function resolveGrowScale(settings: EffectSettings, spriteScale: number) {
  const maxScale = spriteScale * settings.mult
  if (!settings.randomizeVars) {
    return maxScale
  }
  const range = typeof settings.randomizeVars === 'object'
    ? settings.randomizeVars
    : { min: DEFAULT_RANDOM_SCALE_MIN, max: DEFAULT_RANDOM_SCALE_MAX }
  return () => maxScale * gsap.utils.random(range.min, range.max)
}

function applyParticleInitialState(el: HTMLElement, settings: EffectSettings): void {
  gsap.set(el, {
    opacity: settings.useFade ? OPACITY_ZERO : settings.targetOpacity,
    y: OFFSET_PERCENT_MARGIN,
    scale: STATUS_PARTICLE_MIN_SCALE,
    xPercent: CENTER_PERCENT_OFFSET,
    yPercent: CENTER_PERCENT_OFFSET,
    x: 0,
    rotation: 0,
    imageRendering: 'auto',
    webkitFontSmoothing: 'none'
  })
}

function applyParticleWobble(el: HTMLElement, wobble: WobbleConfig | boolean): void {
  if (typeof wobble !== 'object') return
  const isYoyo = wobble.yoyo !== false
  const ease = wobble.ease || 'sine.inOut'

  if (isYoyo) {
    gsap.fromTo(
      el,
      { xPercent: CENTER_PERCENT_OFFSET - wobble.x, rotation: -wobble.rotation },
      {
        xPercent: CENTER_PERCENT_OFFSET + wobble.x,
        rotation: wobble.rotation,
        duration: wobble.duration,
        repeat: -1,
        yoyo: true,
        ease
      }
    )
  } else {
    gsap.to(el, {
      rotation: wobble.rotation,
      duration: wobble.duration,
      repeat: -1,
      ease: 'none'
    })
  }
}

export function createStatusParticleTimeline(
  el: HTMLElement,
  index: number,
  delay: number,
  settings: EffectSettings,
  typeKey: string,
  spriteScale: number
): gsap.core.Timeline[] {
  const finalDelay = delay + (settings.stagger ? index * settings.stagger : STAGGER_INITIAL_DELAY_NONE)
  const tl = gsap.timeline({ repeat: -1, delay: finalDelay, repeatRefresh: true })

  const { growDur, shrinkDur } = resolveParticleDurations(settings)
  const growScale = resolveGrowScale(settings, spriteScale)
  const growEase = settings.growDuration ? 'power4.out' : (typeKey === 'paralysis' ? 'none' : 'sine.inOut')
  const shrinkEase = settings.growDuration ? 'power1.inOut' : (typeKey === 'paralysis' ? 'none' : 'sine.inOut')

  applyParticleInitialState(el, settings)

  const resetProps: gsap.TweenVars = {
    scale: STATUS_PARTICLE_MIN_SCALE,
    opacity: settings.useFade ? OPACITY_ZERO : settings.targetOpacity,
    xPercent: CENTER_PERCENT_OFFSET,
    yPercent: CENTER_PERCENT_OFFSET,
    y: OFFSET_PERCENT_MARGIN
  }
  if (!settings.wobble) resetProps.rotation = 0
  tl.set(el, resetProps)

  const growDurVal = typeof growDur === 'function' ? growDur() : growDur
  const shrinkDurVal = typeof shrinkDur === 'function' ? shrinkDur() : shrinkDur

  tl.to(el, {
    opacity: settings.targetOpacity,
    scale: growScale,
    duration: growDurVal,
    ease: growEase,
    force3D: true
  })

  tl.to(el, {
    scale: STATUS_PARTICLE_MIN_SCALE,
    opacity: settings.useFade ? 0 : settings.targetOpacity,
    duration: shrinkDurVal,
    ease: shrinkEase,
    force3D: true
  })

  applyParticleWobble(el, settings.wobble)

  return [tl]
}
