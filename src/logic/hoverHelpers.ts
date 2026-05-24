

/**
 * Resolves a CSS variable string like var(--blue) to its corresponding hex/rgb color code.
 * Falls back to local Pokevicio theme standard colors if DOM queries fail.
 */
export function resolveCssColor(colorStr: string, element?: HTMLElement): string {
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
export function hexToRgba(hex: string, alpha: number): string {
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
export function parseToRgba(colorStr: string, alpha: number, element?: HTMLElement): string {
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

export function is3DButton(el: HTMLElement): boolean {
  if (!el) return false
  return el.classList.contains('btn-confirm') || 
         Array.from(el.classList).some(cls => cls.startsWith('btn-vicio'))
}

export function getElementShadowColorAndDepth(el: HTMLElement): { color: string; depth: number; blur: string } {
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
