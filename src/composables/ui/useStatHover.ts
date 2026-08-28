import { gsap } from 'gsap'

interface StatHoverOptions {
  y?: number
  scale?: number
  brightness?: number
  duration?: number
}

const DEFAULT_HOVER_OPTIONS: Required<StatHoverOptions> = {
  y: -3,
  scale: 1.02,
  brightness: 1.18,
  duration: 0.22
}

/**
 * Shared GSAP composable for smooth, non-destructive stat card hover animations.
 * Elevates the card and enhances brightness without wiping out underlying CSS gradients or borders.
 */
export function useStatHover(_ignoredClassMap?: unknown, options: StatHoverOptions = {}) {
  const cfg = { ...DEFAULT_HOVER_OPTIONS, ...options }

  const handleStatEnter = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement | null
    if (!el) return
    if (!el.style.filter) {
      gsap.set(el, { filter: 'brightness(1)' })
    }
    gsap.to(el, {
      y: cfg.y,
      scale: cfg.scale,
      filter: `brightness(${cfg.brightness})`,
      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
      duration: cfg.duration,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }

  const handleStatLeave = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement | null
    if (!el) return
    gsap.to(el, {
      y: 0,
      scale: 1,
      filter: 'brightness(1)',
      boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
      duration: cfg.duration,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }

  return { handleStatEnter, handleStatLeave }
}

