import { gsap } from 'gsap'
import { resolveCssColor, parseToRgba, is3DButton, getElementShadowColorAndDepth } from './hoverHelpers.ts'

export function triggerLeave(el: HTMLElement) {
  if (el.dataset.gsapHover || el.dataset.gsapCustomHover) return

  const isCloseBtn = el.classList.contains('modal-close-btn') || el.classList.contains('modal-close-btn-floating')
  const isConfirm = is3DButton(el)
  const isCancel = el.classList.contains('btn-cancel')
  const isRetro = !!el.closest('.variant-retro') && !Array.from(el.classList).some(cls => cls.startsWith('btn-vicio'))

  let propsToClear = 'transform,scale,y'
  const hasXTranslation = el.classList.contains('friend-card') || 
    el.classList.contains('map-row') || 
    el.classList.contains('pc-banner') || 
    (el.closest('.hud-submenu') && el.classList.contains('hud-nav-btn')) ||
    isRetro

  if (hasXTranslation) {
    propsToClear += ',x'
  }

  let targetBorderColor: string | null = null
  let targetBoxShadow: string | null = null  

  if (isCloseBtn) {
    propsToClear += ',rotation'
    const wrapper = el.querySelector('.close-icon-wrapper')
    if (wrapper) {
      const isSolid = el.classList.contains('is-solid')
      const isYellowSolid = el.classList.contains('is-yellow-solid')
      
      let targetBg = 'rgba(255, 255, 255, 0.05)'
      let targetBorder = 'rgba(255, 255, 255, 0.05)'
      
      if (isSolid) {
        targetBg = 'rgba(15, 23, 42, 0.95)'
        targetBorder = 'rgba(255, 255, 255, 0.1)'
      }
      
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
  } else if (isConfirm || (isCancel && isRetro)) {
    propsToClear += ',boxShadow'
    const shadowInfo = getElementShadowColorAndDepth(el)
    if (isRetro) {
      if (isConfirm) {
        targetBoxShadow = `4px 4px 1.5px ${shadowInfo.color}`
      }
    } else {
      if (isConfirm && !el.classList.contains('is-danger')) {
        targetBoxShadow = `0 ${shadowInfo.depth}px 1.5px ${shadowInfo.color}`
      } else if (el.classList.contains('is-danger')) {
        targetBoxShadow = '0 4px 15px rgba(220, 38, 38, 0.4)'
      }
    }
  }

  const hasVisualBorders = el.classList.contains('hud-nav-btn') ||
    el.classList.contains('pc-banner') ||
    el.classList.contains('egg-hud-card') ||
    el.classList.contains('egg-card') ||
    el.classList.contains('pokemon-display-card') ||
    el.classList.contains('box-pokemon-card') ||
    el.classList.contains('team-swap-card') ||
    el.classList.contains('pokemon-summary-card') ||
    el.classList.contains('unified-card') ||
    el.classList.contains('list-item') ||
    el.classList.contains('quick-item-card') ||
    el.classList.contains('gym-card') ||
    el.classList.contains('inventory-item-card') ||
    el.classList.contains('shop-item-card') ||
    el.classList.contains('bc-shop-item-card') ||
    el.classList.contains('market-item-wrapper') ||
    el.classList.contains('info-item') ||
    (el.closest('.hud-submenu') && el.classList.contains('hud-nav-btn'))

  if (hasVisualBorders) {
    propsToClear += ',borderColor,boxShadow'
    
    targetBorderColor = 'rgba(255, 255, 255, 0.12)'
    targetBoxShadow = '0 10px 40px rgba(0, 0, 0, 0.8)'

    if (
      el.classList.contains('pokemon-display-card') ||
      el.classList.contains('box-pokemon-card') ||
      el.classList.contains('team-swap-card') ||
      el.classList.contains('pokemon-summary-card') ||
      el.classList.contains('unified-card')
    ) {
      const tierColor = el.style.getPropertyValue('--tier-color') || 'rgba(255, 255, 255, 0.12)'
      const resolvedTierColor = resolveCssColor(tierColor, el)
      
      if (el.classList.contains('is-active')) {
        targetBorderColor = resolvedTierColor
        targetBoxShadow = `0 0 20px ${parseToRgba(resolvedTierColor, 0.4, el)}, inset 0 0 10px ${parseToRgba(resolvedTierColor, 0.2, el)}`
      } else if (el.classList.contains('selected')) {
        const blueResolved = resolveCssColor('var(--blue)', el)
        targetBorderColor = blueResolved
        targetBoxShadow = `inset 0 0 0 4px ${blueResolved}, 0 0 20px ${parseToRgba(blueResolved, 0.4, el)}`
      } else {
        targetBorderColor = resolvedTierColor
        targetBoxShadow = '0 10px 40px rgba(0, 0, 0, 0.8)'
      }
    } else if (el.classList.contains('pc-banner')) {
      if (el.classList.contains('event-banner') && el.classList.contains('active')) {
        targetBorderColor = resolveCssColor('rgba(255, 214, 10, 0.8)', el)
        targetBoxShadow = '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 214, 10, 0.25)'
      } else {
        targetBorderColor = 'rgba(255, 255, 255, 0.08)'
        targetBoxShadow = 'none'
      }
    } else if (el.classList.contains('quick-item-card')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.1)'
      targetBoxShadow = 'none'
    } else if (el.classList.contains('active')) {
      if (el.classList.contains('hud-nav-btn')) {
        const yellowResolved = resolveCssColor('var(--yellow)', el)
        targetBorderColor = yellowResolved
        targetBoxShadow = `0 0 0 2px ${yellowResolved}, 0 0 30px ${parseToRgba(yellowResolved, 0.45, el)}, inset 0 0 12px ${parseToRgba(yellowResolved, 0.1, el)}`
      }
    } else if (el.classList.contains('hud-nav-btn')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.08)'
      targetBoxShadow = '0 6px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
    } else if (el.classList.contains('inventory-item-card')) {
      if (el.classList.contains('tier-rare')) targetBorderColor = 'rgba(59, 130, 246, 0.2)'
      else if (el.classList.contains('tier-epic')) targetBorderColor = 'rgba(168, 85, 247, 0.2)'
      else if (el.classList.contains('tier-legend')) targetBorderColor = 'rgba(245, 158, 11, 0.2)'
      else targetBorderColor = 'rgba(255, 255, 255, 0.05)'
      targetBoxShadow = '0 10px 40px rgba(0, 0, 0, 0.8)'
    } else if (el.classList.contains('gym-card')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.08)'
      targetBoxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)'
    } else if (el.classList.contains('egg-hud-card')) {
      if (el.classList.contains('is-ready')) {
        targetBorderColor = 'rgba(34, 197, 94, 0.3)'
        targetBoxShadow = '0 8px 24px rgba(0, 0, 0, 0.45), 0 0 12px rgba(34, 197, 94, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.06)'
      } else {
        targetBorderColor = 'rgba(255, 255, 255, 0.08)'
        targetBoxShadow = '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.06)'
      }
    } else if (el.classList.contains('egg-card')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.08)'
      targetBoxShadow = '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.06)'
    } else if (el.classList.contains('shop-item-card') || el.classList.contains('market-item-wrapper')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.08)'
      targetBoxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)'
    } else if (el.classList.contains('bc-shop-item-card')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.08)'
      targetBoxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)'
    } else if (el.classList.contains('info-item')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.05)'
      targetBoxShadow = 'inset 0 1px 1px rgba(255, 255, 255, 0.03)'
    }
  }

  let targetScale = 1
  if (el.classList.contains('is-active')) {
    targetScale = 0.98
  }

  const clearVars: gsap.TweenVars = {
    scale: targetScale,
    y: 0,
    duration: 0.15,
    ease: 'power1.out',
    overwrite: 'auto',
    onComplete: () => {
      gsap.set(el, { clearProps: propsToClear })
    }
  }

  if (hasXTranslation) {
    clearVars.x = 0
  }

  if (el.classList.contains('btn-catch-ball')) {
    clearVars.rotation = 0
    clearVars.duration = 0.2
    clearVars.ease = 'power2.out'
  }

  if (targetBorderColor) clearVars.borderColor = targetBorderColor
  if (targetBoxShadow) clearVars.boxShadow = targetBoxShadow

  if (
    el.classList.contains('pc-banner') || 
    el.classList.contains('egg-hud-card') || 
    el.classList.contains('egg-card') ||
    el.classList.contains('pokemon-display-card') || 
    el.classList.contains('box-pokemon-card') || 
    el.classList.contains('team-swap-card') ||
    el.classList.contains('pokemon-summary-card') ||
    el.classList.contains('unified-card') ||
    el.classList.contains('friend-card') ||
    el.classList.contains('map-row') ||
    el.classList.contains('shop-item-card') ||
    el.classList.contains('bc-shop-item-card') ||
    el.classList.contains('market-item-wrapper') ||
    el.classList.contains('list-item') ||
    el.classList.contains('quick-item-card') ||
    el.classList.contains('gym-card') ||
    el.classList.contains('inventory-item-card') ||
    el.classList.contains('info-item')
  ) {
    clearVars.duration = 0.2
  }

  gsap.to(el, clearVars)

  if (el.classList.contains('egg-hud-card')) {
    const eggIcon = el.querySelector('.egg-icon')
    if (eggIcon) {
      gsap.to(eggIcon, {
        scale: 1,
        rotation: 0,
        duration: 0.15,
        ease: 'power1.out',
        overwrite: 'auto',
        onComplete: () => {
          gsap.set(eggIcon, { clearProps: 'transform,scale,rotation' })
        }
      })
    }
  } else if (el.classList.contains('egg-card')) {
    const eggVisual = el.querySelector('.egg-visual')
    if (eggVisual) {
      gsap.to(eggVisual, {
        scale: 1,
        rotation: 0,
        duration: 0.15,
        ease: 'power1.out',
        overwrite: 'auto',
        onComplete: () => {
          gsap.set(eggVisual, { clearProps: 'transform,scale,rotation' })
        }
      })
    }
  } else if (el.classList.contains('inventory-item-card')) {
    const sprite = el.querySelector('.item-sprite')
    if (sprite) {
      gsap.to(sprite, {
        scale: 1,
        duration: 0.15,
        ease: 'power1.out',
        overwrite: 'auto',
        onComplete: () => {
          gsap.set(sprite, { clearProps: 'transform,scale' })
        }
      })
    }
  } else if (el.classList.contains('edit-nick-btn')) {
    gsap.to(el, {
      opacity: 0.6,
      duration: 0.15,
      ease: 'power1.out',
      overwrite: 'auto',
      onComplete: () => {
        gsap.set(el, { clearProps: 'opacity' })
      }
    })
  }
}
