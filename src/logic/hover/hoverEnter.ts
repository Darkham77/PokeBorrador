import { gsap } from 'gsap'
import { getHoverEnterStrategy } from './hoverStrategies.ts'
import { calculateButtonHoverEnterVars, triggerChildHoverTransitions } from './hoverEnterChildren.ts'

const DEFAULT_HOVER_SCALE = 1.03 as const
const DEFAULT_HOVER_Y = -1.5 as const
const DEFAULT_HOVER_DURATION = 0.15 as const

const SELECTABLE_HOVER_EXCEPTIONS = [
  'box-pokemon-card',
  'pokemon-display-card',
  'quick-item-card',
  'inventory-item-card',
  'quick-card-override'
] as const
type SelectableHoverException = (typeof SELECTABLE_HOVER_EXCEPTIONS)[number]
const SELECTABLE_HOVER_EXCEPTIONS_SET: ReadonlySet<SelectableHoverException> = new Set<SelectableHoverException>(SELECTABLE_HOVER_EXCEPTIONS)

function isSelectableHoverException(el: HTMLElement): boolean {
  for (const cls of SELECTABLE_HOVER_EXCEPTIONS_SET) {
    if (el.classList.contains(cls)) return true
  }
  return false
}

function shouldSkipHoverEnter(el: HTMLElement): boolean {
  if (el.dataset.gsapHover || el.dataset.gsapCustomHover) return true
  if (el.matches(':disabled') || el.classList.contains('disabled') || el.hasAttribute('disabled')) return true
  if (el.classList.contains('selected') && !isSelectableHoverException(el)) return true
  return false
}

function isHoverButtonElement(el: HTMLElement): boolean {
  if (el.classList.contains('hud-sq-btn')) return false
  return (
    el.tagName === 'BUTTON' || 
    el.classList.contains('btn-confirm') || 
    el.classList.contains('btn-cancel') || 
    el.getAttribute('role') === 'button'
  )
}

function resolveStrategyHoverEnterVars(el: HTMLElement): gsap.TweenVars {
  const strategy = getHoverEnterStrategy(el)
  const tweenVars: gsap.TweenVars = {
    scale: strategy.scale ?? DEFAULT_HOVER_SCALE,
    y: strategy.y ?? DEFAULT_HOVER_Y,
    duration: strategy.duration ?? DEFAULT_HOVER_DURATION,
    ease: strategy.ease ?? 'power1.out',
    overwrite: 'auto'
  }
  if (strategy.x !== undefined) tweenVars.x = strategy.x
  if (strategy.rotation !== undefined) tweenVars.rotation = strategy.rotation
  if (strategy.borderColor) tweenVars.borderColor = strategy.borderColor
  if (strategy.boxShadow) tweenVars.boxShadow = strategy.boxShadow
  return tweenVars
}

export function triggerEnter(el: HTMLElement) {
  if (shouldSkipHoverEnter(el)) return

  const tweenVars = isHoverButtonElement(el)
    ? calculateButtonHoverEnterVars(el)
    : resolveStrategyHoverEnterVars(el)

  tweenVars.overwrite = 'auto'
  gsap.to(el, tweenVars)

  triggerChildHoverTransitions(el)
}
