import { gsap } from 'gsap'
import { getHoverEnterStrategy } from './hoverStrategies.ts'
import { calculateButtonHoverEnterVars, triggerChildHoverTransitions } from './hoverEnterChildren.ts'

export function triggerEnter(el: HTMLElement) {
  if (el.dataset.gsapHover || el.dataset.gsapCustomHover) return
  if (
    el.classList.contains('selected') && 
    !el.classList.contains('box-pokemon-card') && 
    !el.classList.contains('pokemon-display-card') &&
    !el.classList.contains('quick-item-card') &&
    !el.classList.contains('inventory-item-card') &&
    !el.classList.contains('quick-card-override')
  ) return
  if (el.matches(':disabled') || el.classList.contains('disabled') || el.hasAttribute('disabled')) return

  const isButtonElement = (
    el.tagName === 'BUTTON' || 
    el.classList.contains('btn-confirm') || 
    el.classList.contains('btn-cancel') || 
    el.getAttribute('role') === 'button'
  ) && !el.classList.contains('hud-sq-btn')

  let tweenVars: gsap.TweenVars

  if (isButtonElement) {
    tweenVars = calculateButtonHoverEnterVars(el)
  } else {
    const strategy = getHoverEnterStrategy(el)
    tweenVars = {
      scale: strategy.scale ?? 1.03,
      y: strategy.y ?? -1.5,
      duration: strategy.duration ?? 0.15,
      ease: strategy.ease ?? 'power1.out',
      overwrite: 'auto'
    }
    if (strategy.x !== undefined) tweenVars.x = strategy.x
    if (strategy.rotation !== undefined) tweenVars.rotation = strategy.rotation
    if (strategy.borderColor) tweenVars.borderColor = strategy.borderColor
    if (strategy.boxShadow) tweenVars.boxShadow = strategy.boxShadow
  }

  tweenVars.overwrite = 'auto'
  gsap.to(el, tweenVars)

  triggerChildHoverTransitions(el)
}
