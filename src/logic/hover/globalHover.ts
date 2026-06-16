import { gsap } from 'gsap'
import { triggerEnter } from './hoverEnter.ts'
import { triggerLeave } from './hoverLeave.ts'
import { is3DButton, getElementShadowColorAndDepth } from './hoverHelpers.ts'

const activeHoveredElements = new Set<HTMLElement>()

export function initGlobalHoverSystem() {
  if (typeof window === 'undefined') return

  const selectors = '.pokecenter-banner, .pc-banner, .egg-hud-card, .egg-card, .pokemon-display-card, .box-pokemon-card, .team-swap-card, .pokemon-summary-card, .unified-card, .interactive-pill, .trainer-card, .class-card, .item-node, .pv-tooltip-trigger, .friend-card, .map-row, .hud-pill, .shop-item-card, .bc-shop-item-card, .war-shop-item-card, .hud-nav-btn, .list-item, .market-item-wrapper, .quick-item-card, .gym-card, .pdx-pokemon-card, .inventory-item-card, .trainer-avatar-container, .badge-icon, .main-sprite, .edit-nick-btn, .upd-tab-btn, .info-item, .map-pill, .location-tag, .faction-status-pill, .dom-badge, .btn-catch-ball, button, [role="button"], .btn-confirm, .btn-cancel'

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
