import { gsap } from 'gsap'

const activeHoveredElements = new Set<HTMLElement>()

/**
 * Resolves a CSS variable string like var(--blue) to its corresponding hex/rgb color code.
 * Falls back to local Pokevicio theme standard colors if DOM queries fail.
 */
function resolveCssColor(colorStr: string, element?: HTMLElement): string {
  if (!colorStr) return '#0a84ff'
  const color = colorStr.trim()

  if (color.startsWith('var(')) {
    const match = color.match(/var\(([^)]+)\)/)
    if (match && match[1]) {
      const varName = match[1].trim()
      let value = ''
      if (typeof window !== 'undefined') {
        if (element) {
          value = window.getComputedStyle(element).getPropertyValue(varName).trim()
        } else {
          value = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
        }
      }
      if (value) {
        return resolveCssColor(value, element)
      }
    }
  }

  if (color.startsWith('--')) {
    let value = ''
    if (typeof window !== 'undefined') {
      if (element) {
        value = window.getComputedStyle(element).getPropertyValue(color).trim()
      } else {
        value = window.getComputedStyle(document.documentElement).getPropertyValue(color).trim()
      }
    }
    if (value) return resolveCssColor(value, element)
  }

  const fallbackColors: Record<string, string> = {
    'var(--blue)': '#0a84ff',
    'var(--red)': '#ff453a',
    'var(--yellow)': '#ffd60a',
    'var(--green)': '#32d74b',
    'var(--purple)': '#bf5af2',
    'var(--coin-gold)': '#FFD700',
    'var(--pokecenter-pink)': '#ff3366',
    'var(--text)': '#f5f5f7',
    'var(--gray)': '#86868b',
    '--blue': '#0a84ff',
    '--red': '#ff453a',
    '--yellow': '#ffd60a',
    '--green': '#32d74b',
    '--purple': '#bf5af2',
    '--coin-gold': '#FFD700',
    '--pokecenter-pink': '#ff3366',
    '--text': '#f5f5f7',
    '--gray': '#86868b',
    'blue': '#0a84ff',
    'red': '#ff453a',
    'yellow': '#ffd60a',
    'green': '#32d74b',
    'purple': '#bf5af2'
  }

  if (fallbackColors[color]) return fallbackColors[color]
  return color
}

/**
 * Converts a hex color to a transparent rgba color string.
 */
function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '').trim()
  if (c.length === 3) {
    const r = c.charAt(0)
    const g = c.charAt(1)
    const b = c.charAt(2)
    c = r + r + g + g + b + b
  }
  if (c.length === 6) {
    const r = parseInt(c.substring(0, 2), 16)
    const g = parseInt(c.substring(2, 4), 16)
    const b = parseInt(c.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return hex
}

/**
 * Parses any color format (variable, hex, rgb) to an rgba equivalent with custom alpha opacity.
 */
function parseToRgba(colorStr: string, alpha: number, element?: HTMLElement): string {
  const resolved = resolveCssColor(colorStr, element)
  if (resolved.startsWith('#')) {
    return hexToRgba(resolved, alpha)
  }
  if (resolved.startsWith('rgb')) {
    const match = resolved.match(/\d+/g)
    if (match && match.length >= 3 && match[0] && match[1] && match[2]) {
      return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`
    }
  }
  return resolved
}

function is3DButton(el: HTMLElement): boolean {
  if (!el) return false
  return el.classList.contains('btn-confirm') || 
         Array.from(el.classList).some(cls => cls.startsWith('btn-vicio'))
}

function getElementShadowColorAndDepth(el: HTMLElement): { color: string; depth: number; blur: string } {
  // If we already have the base shadow cached, return it!
  if (el.dataset.baseShadowColor && el.dataset.baseShadowDepth) {
    return {
      color: el.dataset.baseShadowColor,
      depth: parseFloat(el.dataset.baseShadowDepth),
      blur: el.dataset.baseShadowBlur || '1.5px'
    }
  }

  const computed = typeof window !== 'undefined' ? window.getComputedStyle(el).boxShadow : ''
  if (!computed || computed === 'none') {
    const defaultVal = { color: 'rgba(0,0,0,0)', depth: 0, blur: '1.5px' }
    el.dataset.baseShadowColor = defaultVal.color
    el.dataset.baseShadowDepth = String(defaultVal.depth)
    el.dataset.baseShadowBlur = defaultVal.blur
    return defaultVal
  }

  // Parse color (supports color at the beginning or end of the shadow segment)
  const colorMatch = computed.match(/(rgba?\(.*?\))/)
  if (colorMatch && colorMatch[1]) {
    const color = colorMatch[1]
    const rest = computed.replace(color, '').trim().split(/\s+/)
    const cleanOffsets = rest.filter(val => val && !val.includes('rgba') && !val.includes('rgb'))
    const yOffset = parseFloat(cleanOffsets[1] || '0')
    const blur = cleanOffsets[2] || '1.5px'
    
    // Cache the base stylesheet values so they never drift during active animations!
    el.dataset.baseShadowColor = color
    el.dataset.baseShadowDepth = String(yOffset)
    el.dataset.baseShadowBlur = blur

    return { color, depth: yOffset, blur }
  }

  const fallback = { color: 'rgba(0,0,0,0)', depth: 0, blur: '1.5px' }
  el.dataset.baseShadowColor = fallback.color
  el.dataset.baseShadowDepth = String(fallback.depth)
  el.dataset.baseShadowBlur = fallback.blur
  return fallback
}

export function initGlobalHoverSystem() {
  if (typeof window === 'undefined') return

  const selectors = '.pc-banner, .egg-hud-card, .egg-card, .pokemon-display-card, .box-pokemon-card, .team-swap-card, .pokemon-summary-card, .unified-card, .interactive-pill, .trainer-card, .class-card, .item-node, .pv-tooltip-trigger, .friend-card, .map-row, .hud-pill, .shop-item-card, .bc-shop-item-card, .hud-nav-btn, .list-item, .market-item-wrapper, .quick-item-card, .gym-card, .pdx-pokemon-card, .inventory-item-card, .trainer-avatar-container, .badge-icon, .main-sprite, .edit-nick-btn, .upd-tab-btn, .info-item, .map-pill, .location-tag, .faction-status-pill, .dom-badge, .btn-catch-ball, button, [role="button"], .btn-confirm, .btn-cancel'

  // Listen to mouseover (bubbles)
  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement | null
    if (!target) return

    // Find all interactive ancestors matching our interactive selectors
    const currentInteractive = new Set<HTMLElement>()
    let curr: HTMLElement | null = target
    while (curr && curr !== document.body) {
      if (curr.matches(selectors)) {
        currentInteractive.add(curr)
      }
      curr = curr.parentElement
    }

    // 1. Trigger leave for elements no longer hovered (use copy to prevent iteration skips)
    for (const el of [...activeHoveredElements]) {
      if (!currentInteractive.has(el)) {
        triggerLeave(el)
        activeHoveredElements.delete(el)
      }
    }

    // 2. Trigger enter for new elements
    for (const el of currentInteractive) {
      if (!activeHoveredElements.has(el)) {
        triggerEnter(el)
        activeHoveredElements.add(el)
      }
    }
  })

  // Clear all when mouse leaves document entirely
  document.addEventListener('mouseleave', () => {
    for (const el of activeHoveredElements) {
      triggerLeave(el)
    }
    activeHoveredElements.clear()
  })

  // Click/press scaling feedback
  document.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    const el = target.closest<HTMLElement>(selectors)
    if (el && !el.dataset.gsapHover && !el.dataset.gsapCustomHover) {
      const isCloseBtn = el.classList.contains('modal-close-btn') || el.classList.contains('modal-close-btn-floating')
      const isConfirm = is3DButton(el)
      const isCancel = el.classList.contains('btn-cancel')
      const isRetro = !!el.closest('.variant-retro') && !Array.from(el.classList).some(cls => cls.startsWith('btn-vicio'))
      const is3D = isConfirm || (isCancel && isRetro)

      if (isCloseBtn) {
        gsap.to(el, {
          scale: 0.9,
          duration: 0.08,
          ease: 'power1.out',
          overwrite: 'auto'
        })
      } else if (is3D) {
        const shadowInfo = getElementShadowColorAndDepth(el)
        if (isRetro) {
          gsap.to(el, {
            x: 0,
            y: 0,
            boxShadow: `2px 2px 1.5px ${shadowInfo.color}`,
            duration: 0.08,
            ease: 'power1.out',
            overwrite: 'auto'
          })
        } else {
          const targetDepth = Math.max(0, shadowInfo.depth - 2)
          gsap.to(el, {
            y: 2,
            boxShadow: `0 ${targetDepth}px 1.5px ${shadowInfo.color}`,
            duration: 0.08,
            ease: 'power1.out',
            overwrite: 'auto'
          })
        }
      } else {
        gsap.to(el, {
          scale: 0.96,
          duration: 0.08,
          ease: 'power1.out',
          overwrite: 'auto'
        })
      }
    }
  })

  document.addEventListener('mouseup', (e) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    const el = target.closest<HTMLElement>(selectors)
    if (el && activeHoveredElements.has(el) && !el.dataset.gsapHover && !el.dataset.gsapCustomHover) {
      triggerEnter(el)
    }
  })
}

function triggerEnter(el: HTMLElement) {
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

function triggerLeave(el: HTMLElement) {
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
