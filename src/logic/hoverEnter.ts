import { gsap } from 'gsap'
import { resolveCssColor, parseToRgba, is3DButton, getElementShadowColorAndDepth } from './hoverHelpers.ts'

export function triggerEnter(el: HTMLElement) {
  if (el.dataset.gsapHover || el.dataset.gsapCustomHover) return
  if (el.classList.contains('selected') && 
      !el.classList.contains('box-pokemon-card') && 
      !el.classList.contains('pokemon-display-card') &&
      !el.classList.contains('quick-item-card') &&
      !el.classList.contains('inventory-item-card') &&
      !el.classList.contains('quick-card-override')
  ) return
  if (el.matches(':disabled') || el.classList.contains('disabled') || el.hasAttribute('disabled')) return

  let scale = 1.03
  let y = -1.5
  let x = 0
  let rotation = 0
  let duration = 0.15
  let ease = 'power1.out'
  let borderColor: string | null = null
  let boxShadow: string | null = null

  const isSubmenuBtn = el.closest('.hud-submenu') && el.classList.contains('hud-nav-btn')

  if (isSubmenuBtn) {
    scale = 1
    y = 0
    x = 6
    duration = 0.15
    ease = 'power1.out'
    
    if (el.classList.contains('war-shop-nav-btn')) {
      const redResolved = resolveCssColor('var(--red)', el)
      borderColor = redResolved
      boxShadow = `0 0 0 2px ${redResolved}, 0 0 15px ${parseToRgba(redResolved, 0.3, el)}`
    } else {
      const yellowResolved = resolveCssColor('var(--yellow)', el)
      borderColor = yellowResolved
      boxShadow = `0 0 0 2px ${yellowResolved}, 0 0 15px ${parseToRgba(yellowResolved, 0.3, el)}`
    }
  } else if (el.classList.contains('hud-nav-btn')) {
    scale = 1.03
    y = -1.5
    duration = 0.15
    const yellowResolved = resolveCssColor('var(--yellow)', el)
    borderColor = yellowResolved
    boxShadow = `0 0 0 2px ${yellowResolved}, 0 0 15px ${parseToRgba(yellowResolved, 0.4, el)}`
  } else if (el.classList.contains('pc-banner')) {
    scale = 1
    x = 4
    y = 0
    duration = 0.2
    ease = 'power2.out'
    if (el.classList.contains('event-banner') && el.classList.contains('active')) {
      borderColor = resolveCssColor('var(--yellow)', el)
    } else {
      borderColor = 'rgba(255, 255, 255, 0.2)'
    }
    boxShadow = 'none'
  } else if (el.classList.contains('quick-item-card')) {
    scale = 1.02
    y = -4
    duration = 0.2
    ease = 'power2.out'
    const yellowResolved = resolveCssColor('var(--yellow)', el)
    borderColor = yellowResolved
    const glow80 = parseToRgba(yellowResolved, 0.2, el)
    const glow70 = parseToRgba(yellowResolved, 0.3, el)
    boxShadow = `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow80}, 0 0 20px ${glow70}`
  } else if (el.classList.contains('btn-catch-ball')) {
    scale = 1.1
    rotation = 5
    y = 0
    duration = 0.25
    ease = 'back.out(1.7)'
  } else if (
    el.classList.contains('egg-hud-card') || 
    el.classList.contains('egg-card') ||
    el.classList.contains('pokemon-display-card') || 
    el.classList.contains('box-pokemon-card') || 
    el.classList.contains('team-swap-card') ||
    el.classList.contains('pokemon-summary-card') ||
    el.classList.contains('unified-card') ||
    el.classList.contains('list-item') ||
    el.classList.contains('gym-card') ||
    el.classList.contains('inventory-item-card')
  ) {
    scale = 1.02
    y = -3
    duration = 0.2
    ease = 'power2.out'

    let color = 'var(--blue)'
    if (el.classList.contains('gym-card')) {
      color = 'var(--red)'
    } else {
      color = el.style.getPropertyValue('--tier-color') || 'var(--blue)'
    }

    const resolvedColor = resolveCssColor(color, el)
    borderColor = resolvedColor
    const glow80 = parseToRgba(resolvedColor, 0.2, el)
    const glow70 = parseToRgba(resolvedColor, 0.3, el)
    boxShadow = `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow80}, 0 0 20px ${glow70}`
  } else if (el.classList.contains('shop-item-card') || el.classList.contains('market-item-wrapper')) {
    scale = 1.02
    y = -6
    duration = 0.25
    ease = 'power2.out'
    const yellowResolved = resolveCssColor('var(--yellow)', el)
    borderColor = yellowResolved
    const glow10 = parseToRgba(yellowResolved, 0.1, el)
    const glow15 = parseToRgba(yellowResolved, 0.15, el)
    boxShadow = `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow10}, 0 0 20px ${glow15}`
  } else if (el.classList.contains('bc-shop-item-card')) {
    scale = 1.02
    y = -6
    duration = 0.25
    ease = 'power2.out'
    const purpleColor = '#c084fc'
    borderColor = purpleColor
    const glow10 = parseToRgba(purpleColor, 0.1, el)
    const glow15 = parseToRgba(purpleColor, 0.15, el)
    boxShadow = `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow10}, 0 0 20px ${glow15}`
  } else if (el.classList.contains('friend-card') || el.classList.contains('map-row')) {
    scale = 1
    y = 0
    x = 4
    duration = 0.2
    ease = 'power2.out'
  } else if (el.classList.contains('hud-pill')) {
    scale = 1.03
    y = -1.5
    duration = 0.15
  } else if (el.classList.contains('trainer-avatar-container')) {
    scale = 1.1
    y = -2
    duration = 0.2
    ease = 'power2.out'
  } else if (el.classList.contains('badge-icon')) {
    scale = 1.3
    y = 0
    duration = 0.12
    ease = 'power1.out'
  } else if (el.classList.contains('main-sprite')) {
    scale = 1.05
    y = -5
    duration = 0.2
    ease = 'power2.out'
  } else if (el.classList.contains('edit-nick-btn')) {
    scale = 1.2
    y = 0
    duration = 0.12
    ease = 'power1.out'
    gsap.to(el, {
      opacity: 1,
      duration: 0.12,
      ease: 'power1.out',
      overwrite: 'auto'
    })
  } else if (el.classList.contains('upd-tab-btn')) {
    if (el.classList.contains('active')) return
    scale = 1
    y = -1.5
    duration = 0.12
    ease = 'power1.out'
  } else if (el.classList.contains('info-item')) {
    scale = 1.02
    y = -2.5
    duration = 0.15
    ease = 'power1.out'
    const typeColor = el.style.getPropertyValue('--type-color') || 'var(--type-color)'
    const resolvedColor = resolveCssColor(typeColor, el)
    borderColor = resolvedColor
    const glowColor = parseToRgba(resolvedColor, 0.25, el)
    boxShadow = `0 10px 20px rgba(0, 0, 0, 0.3), 0 0 12px ${glowColor}`
  } else if (
    el.tagName === 'BUTTON' || 
    el.classList.contains('btn-confirm') || 
    el.classList.contains('btn-cancel') || 
    el.getAttribute('role') === 'button'
  ) {
    const isCloseBtn = el.classList.contains('modal-close-btn') || el.classList.contains('modal-close-btn-floating')
    const isConfirm = is3DButton(el)
    const isCancel = el.classList.contains('btn-cancel')
    const isRetro = !!el.closest('.variant-retro') && !Array.from(el.classList).some(cls => cls.startsWith('btn-vicio'))

    if (isCloseBtn) {
      scale = 1.1
      y = 0
      duration = 0.2
      ease = 'power2.out'
      
      const wrapper = el.querySelector('.close-icon-wrapper')
      if (wrapper) {
        const isSolid = el.classList.contains('is-solid')
        const isYellowSolid = el.classList.contains('is-yellow-solid')
        
        let targetBg = 'rgba(239, 68, 68, 0.2)'
        let targetBorder = 'rgba(239, 68, 68, 0.3)'
        
        if (isSolid) {
          targetBg = 'rgba(239, 68, 68, 0.95)'
          targetBorder = 'rgba(239, 68, 68, 0.2)'
        }
        
        const tweenVars: gsap.TweenVars = {
          rotation: 180,
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
    } else if (isConfirm || (isCancel && isRetro)) {
      const shadowInfo = getElementShadowColorAndDepth(el)
      if (isRetro) {
        x = -2
        y = -2
        scale = 1
        duration = 0.15
        ease = 'power1.out'
        if (isConfirm) {
          boxShadow = `6px 6px 1.5px ${shadowInfo.color}`
        }
      } else {
        x = 0
        y = -1
        scale = 1
        duration = 0.15
        ease = 'power1.out'
        
        if (isConfirm && !el.classList.contains('is-danger')) {
          const targetDepth = shadowInfo.depth + 1
          boxShadow = `0 ${targetDepth}px 1.5px ${shadowInfo.color}`
        } else if (el.classList.contains('is-danger')) {
          boxShadow = '0 6px 20px rgba(220, 38, 38, 0.5)'
        }
      }
    } else {
      scale = 1.03
      y = -1
      duration = 0.12
      ease = 'power1.out'
    }
  }

  const tweenVars: gsap.TweenVars = {
    scale,
    y,
    duration,
    ease,
    overwrite: 'auto'
  }

  if (x !== 0) {
    tweenVars.x = x
  }

  if (rotation !== 0) tweenVars.rotation = rotation
  if (borderColor) tweenVars.borderColor = borderColor
  if (boxShadow) tweenVars.boxShadow = boxShadow

  gsap.to(el, tweenVars)

  // Child specific transitions
  if (el.classList.contains('egg-hud-card')) {
    const eggIcon = el.querySelector('.egg-icon')
    if (eggIcon) {
      gsap.to(eggIcon, {
        scale: 1.1,
        rotation: 5,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto'
      })
    }
  } else if (el.classList.contains('egg-card')) {
    const eggVisual = el.querySelector('.egg-visual')
    if (eggVisual) {
      gsap.to(eggVisual, {
        scale: 1.1,
        rotation: 5,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto'
      })
    }
  } else if (el.classList.contains('inventory-item-card')) {
    const sprite = el.querySelector('.item-sprite')
    if (sprite) {
      gsap.to(sprite, {
        scale: 1.1,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto'
      })
    }
  }
}
