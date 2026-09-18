import { gsap } from 'gsap'
import { is3DButton, getElementShadowColorAndDepth, HOVER_DURATION_200MS_CLASSES, hasVisualBorders, resolveCssColor, parseToRgba } from './hoverHelpers.ts'
import { getHoverLeaveStrategy } from './hoverStrategies.ts'

const ACTIVE_ELEMENT_HOVER_LEAVE_SCALE = 0.98
const DEFAULT_HOVER_LEAVE_DURATION_SEC = 0.15
const FAST_HOVER_LEAVE_DURATION_SEC = 0.12
const HOVER_GLOW_GRADIENT_STOP_PERCENT = 70

function handleCloseButtonLeave(el: HTMLElement): void {
  const wrapper = el.querySelector('.close-icon-wrapper')
  if (!wrapper) return

  const isSolid = el.classList.contains('is-solid')
  const isYellowSolid = el.classList.contains('is-yellow-solid')
  
  const targetBg = isSolid ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.05)'
  const targetBorder = isSolid ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'
  
  const tweenVars: gsap.TweenVars = {
    rotation: 0,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto',
    onComplete: () => {
      gsap.set(wrapper, { clearProps: 'transform,rotation,backgroundColor,borderColor' })
    }
  }
  
  if (!isYellowSolid) {
    tweenVars.backgroundColor = targetBg
    tweenVars.borderColor = targetBorder
  }
  
  gsap.to(wrapper, tweenVars)
}

function resolveButtonLeaveShadow(el: HTMLElement, isConfirm: boolean, isRetro: boolean): string | null {
  const shadowInfo = getElementShadowColorAndDepth(el)
  if (isRetro) {
    return isConfirm ? `4px 4px 1.5px ${shadowInfo.color}` : null
  }
  if (isConfirm && !el.classList.contains('is-danger')) {
    return `0 ${shadowInfo.depth}px 1.5px ${shadowInfo.color}`
  }
  if (el.classList.contains('is-danger')) {
    return '0 4px 15px rgba(220, 38, 38, 0.4)'
  }
  return null
}

function buildElementClearVars(
  el: HTMLElement,
  targetBorderColor: string | null,
  targetBoxShadow: string | null,
  propsToClear: string,
  hasXTranslation: boolean
): gsap.TweenVars {
  const targetScale = el.classList.contains('is-active') ? ACTIVE_ELEMENT_HOVER_LEAVE_SCALE : 1

  const clearVars: gsap.TweenVars = {
    scale: targetScale,
    y: 0,
    duration: 0.1,
    ease: 'power1.out',
    overwrite: 'auto',
    onComplete: () => {
      gsap.set(el, { clearProps: propsToClear })
    }
  }

  if (hasXTranslation) clearVars.x = 0
  if (el.classList.contains('btn-catch-ball')) {
    clearVars.rotation = 0
    clearVars.duration = DEFAULT_HOVER_LEAVE_DURATION_SEC
    clearVars.ease = 'power2.out'
  }
  if (targetBorderColor) clearVars.borderColor = targetBorderColor
  if (targetBoxShadow) clearVars.boxShadow = targetBoxShadow
  if (HOVER_DURATION_200MS_CLASSES.some(cls => el.classList.contains(cls))) {
    clearVars.duration = FAST_HOVER_LEAVE_DURATION_SEC
  }

  return clearVars
}

function resetEggVisuals(el: HTMLElement): void {
  const eggIcon = el.querySelector('.egg-icon')
  const eggTarget = eggIcon || el.querySelector('.egg-sprite') || el.querySelector('.egg-visual')
  if (eggTarget) {
    gsap.to(eggTarget, {
      scale: 1,
      rotation: 0,
      duration: DEFAULT_HOVER_LEAVE_DURATION_SEC,
      ease: 'power1.out',
      overwrite: 'auto',
      onComplete: () => {
        gsap.set(eggTarget, { clearProps: 'transform,scale,rotation' })
      }
    })
  }
}

function resetItemCardVisuals(el: HTMLElement): void {
  const sprite = el.querySelector('.item-sprite')
  if (sprite) {
    gsap.to(sprite, {
      scale: 1,
      duration: DEFAULT_HOVER_LEAVE_DURATION_SEC,
      ease: 'power1.out',
      overwrite: 'auto',
      onComplete: () => {
        gsap.set(sprite, { clearProps: 'transform,scale' })
      }
    })
  }
  const glow = el.querySelector('.item-bg-glow')
  if (glow) {
    const color = el.style.getPropertyValue('--tier-color') || 'rgba(148, 163, 184, 0.45)'
    const resolvedColor = resolveCssColor(color, el)
    const baseGlowColor = parseToRgba(resolvedColor, 0.18, el)
    gsap.to(glow, {
      backgroundImage: `radial-gradient(circle, ${baseGlowColor} 0%, transparent ${HOVER_GLOW_GRADIENT_STOP_PERCENT}%)`,
      scale: 0.8,
      opacity: 0.7,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }
}

function resetChildDecorations(el: HTMLElement): void {
  if (el.classList.contains('egg-hud-card') || el.classList.contains('egg-card')) {
    resetEggVisuals(el)
    return
  }

  if (el.classList.contains('inventory-item-card') || el.classList.contains('quick-item-card')) {
    resetItemCardVisuals(el)
    return
  }

  if (el.classList.contains('shop-item-card') || el.classList.contains('bc-shop-item-card') || el.classList.contains('war-shop-item-card')) {
    const img = el.querySelector('.item-visual-box img')
    if (img) {
      gsap.to(img, {
        scale: 1,
        y: 0,
        duration: DEFAULT_HOVER_LEAVE_DURATION_SEC,
        ease: 'power1.out',
        overwrite: 'auto',
        onComplete: () => {
          gsap.set(img, { clearProps: 'transform,scale,y' })
        }
      })
    }
    return
  }

  if (el.classList.contains('edit-nick-btn')) {
    gsap.to(el, {
      opacity: 0.6,
      duration: DEFAULT_HOVER_LEAVE_DURATION_SEC,
      ease: 'power1.out',
      overwrite: 'auto',
      onComplete: () => {
        gsap.set(el, { clearProps: 'opacity' })
      }
    })
  }
}

export function triggerLeave(el: HTMLElement) {
  if (el.dataset.gsapHover || el.dataset.gsapCustomHover) return

  const isCloseBtn = el.classList.contains('modal-close-btn') || el.classList.contains('modal-close-btn-floating')
  const isConfirm = is3DButton(el)
  const isCancel = el.classList.contains('btn-cancel')
  const isRetro = Boolean(el.closest('.variant-retro') && !Array.from(el.classList).some(cls => cls.startsWith('btn-vicio')))

  let propsToClear = 'transform,scale,y'
  const hasXTranslation = el.classList.contains('friend-card') || 
    el.classList.contains('trainer-card') || 
    el.classList.contains('map-row') || 
    Boolean(el.closest('.hud-submenu') && el.classList.contains('hud-nav-btn')) ||
    isRetro

  if (hasXTranslation) {
    propsToClear += ',x'
  }

  let targetBorderColor: string | null = null
  let targetBoxShadow: string | null = null  

  if (isCloseBtn) {
    propsToClear += ',rotation'
    handleCloseButtonLeave(el)
  } else if (isConfirm || (isCancel && isRetro)) {
    propsToClear += ',boxShadow'
    targetBoxShadow = resolveButtonLeaveShadow(el, isConfirm, isRetro)
  }

  if (hasVisualBorders(el)) {
    propsToClear += ',borderColor,boxShadow'
    const strategy = getHoverLeaveStrategy(el)
    targetBorderColor = strategy.targetBorderColor
    targetBoxShadow = strategy.targetBoxShadow
  }

  const clearVars = buildElementClearVars(el, targetBorderColor, targetBoxShadow, propsToClear, hasXTranslation)
  gsap.to(el, clearVars)
  resetChildDecorations(el)
}
