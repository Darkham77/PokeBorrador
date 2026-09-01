import { gsap } from 'gsap'
import { is3DButton, getElementShadowColorAndDepth, resolveCssColor, parseToRgba } from './hoverHelpers.ts'
import { GLOW_GRADIENT_STOP_PERCENT } from '@/logic/constants/visuals.ts'

const DEFAULT_HOVER_ENTER_SCALE = 1.03
const DEFAULT_HOVER_ENTER_DURATION_SEC = 0.15
const CLOSE_BTN_ROTATE_DEG = 180
const BUTTON_HOVER_DURATION_SEC = 0.12
const GLOW_GRADIENT_ALPHA = 0.35
const SHOP_ITEM_HOVER_SCALE = 1.25
const SHOP_ITEM_GLOW_HOVER_SCALE = 1.35

export function calculateButtonHoverEnterVars(el: HTMLElement): gsap.TweenVars {
  const isCloseBtn = el.classList.contains('modal-close-btn') || el.classList.contains('modal-close-btn-floating')
  const isConfirm = is3DButton(el)
  const isCancel = el.classList.contains('btn-cancel')
  const isRetro = !!el.closest('.variant-retro') && !Array.from(el.classList).some(cls => cls.startsWith('btn-vicio'))

  if (isCloseBtn) {
    const wrapper = el.querySelector('.close-icon-wrapper')
    if (wrapper) {
      const isSolid = el.classList.contains('is-solid')
      const isYellowSolid = el.classList.contains('is-yellow-solid')
      const targetBg = isSolid ? 'rgba(239, 68, 68, 0.95)' : 'rgba(239, 68, 68, 0.2)'
      const targetBorder = isSolid ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.3)'

      const tweenVars: gsap.TweenVars = {
        rotation: CLOSE_BTN_ROTATE_DEG,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto'
      }

      if (!isYellowSolid) {
        tweenVars.backgroundColor = targetBg
        tweenVars.borderColor = targetBorder
      }

      gsap.to(wrapper, tweenVars)
    }

    return { scale: 1.1, y: 0, duration: 0.2, ease: 'power2.out' }
  }

  if (isConfirm || (isCancel && isRetro)) {
    const shadowInfo = getElementShadowColorAndDepth(el)
    if (isRetro) {
      return {
        x: -2,
        y: -2,
        scale: 1,
        duration: DEFAULT_HOVER_ENTER_DURATION_SEC,
        ease: 'power1.out',
        ...(isConfirm ? { boxShadow: `6px 6px 1.5px ${shadowInfo.color}` } : {})
      }
    }

    let boxShadow: string | undefined
    if (isConfirm && !el.classList.contains('is-danger')) {
      const targetDepth = shadowInfo.depth + 1
      boxShadow = `0 ${targetDepth}px 1.5px ${shadowInfo.color}`
    } else if (el.classList.contains('is-danger')) {
      boxShadow = '0 6px 20px rgba(220, 38, 38, 0.5)'
    }

    return {
      x: 0,
      y: -1,
      scale: 1,
      duration: DEFAULT_HOVER_ENTER_DURATION_SEC,
      ease: 'power1.out',
      ...(boxShadow ? { boxShadow } : {})
    }
  }

  if (el.classList.contains('accordion-toggle') || el.classList.contains('no-scale-hover')) {
    return { scale: 1, y: 0, duration: BUTTON_HOVER_DURATION_SEC, ease: 'power1.out' }
  }

  return { scale: DEFAULT_HOVER_ENTER_SCALE, y: -1, duration: BUTTON_HOVER_DURATION_SEC, ease: 'power1.out' }
}

export function triggerChildHoverTransitions(el: HTMLElement): void {
  if (el.classList.contains('egg-hud-card')) {
    const eggIcon = el.querySelector('.egg-icon')
    if (eggIcon) {
      gsap.to(eggIcon, { scale: 1.1, rotation: 5, duration: 0.2, ease: 'power2.out', overwrite: 'auto' })
    }
  } else if (el.classList.contains('egg-card')) {
    const eggTarget = el.querySelector('.egg-sprite') || el.querySelector('.egg-visual')
    if (eggTarget) {
      gsap.to(eggTarget, { scale: 1.1, rotation: 5, duration: 0.2, ease: 'power2.out', overwrite: 'auto' })
    }
  } else if (el.classList.contains('inventory-item-card') || el.classList.contains('quick-item-card')) {
    const sprite = el.querySelector('.item-sprite')
    if (sprite) {
      gsap.to(sprite, { scale: 1.3, duration: 0.3, ease: 'power2.out', overwrite: 'auto' })
    }
    const glow = el.querySelector('.item-bg-glow')
    if (glow) {
      const color = el.style.getPropertyValue('--tier-color') || 'rgba(148, 163, 184, 0.45)'
      const resolvedColor = resolveCssColor(color, el)
      const hoverGlowColor = parseToRgba(resolvedColor, GLOW_GRADIENT_ALPHA, el)
      gsap.to(glow, {
        backgroundImage: `radial-gradient(circle, ${hoverGlowColor} 0%, transparent ${GLOW_GRADIENT_STOP_PERCENT}%)`,
        scale: SHOP_ITEM_GLOW_HOVER_SCALE,
        opacity: 1,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto'
      })
    }
  } else if (el.classList.contains('shop-item-card') || el.classList.contains('bc-shop-item-card') || el.classList.contains('war-shop-item-card')) {
    const img = el.querySelector('.item-visual-box img')
    if (img) {
      gsap.to(img, { scale: SHOP_ITEM_HOVER_SCALE, y: -4, duration: 0.3, ease: 'back.out(1.7)', overwrite: 'auto' })
    }
  }
}
