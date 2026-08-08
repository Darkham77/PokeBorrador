import { toValue, type MaybeRefOrGetter } from 'vue'
import { gsap } from 'gsap'

const ENTRY_OFFSET_Y_PX = 10;
const ENTER_DURATION_SEC = 0.25;

/**
 * Composable para orquestar transiciones fluidas de grids o listas utilizando GSAP.
 * Cumple con el estándar de animaciones deterministicas y la directiva de no usar timers.
 * 
 * @param suppressAnimation Referencia reactiva o getter para omitir la animación (ej: durante cambios de pestaña)
 */
export function useGridTransitions(suppressAnimation: MaybeRefOrGetter<boolean>) {
  const onBeforeEnter = (el: Element) => {
    if (toValue(suppressAnimation)) return
    const item = el as HTMLElement
    gsap.set(item, {
      opacity: 0,
      scale: 0.9,
      y: ENTRY_OFFSET_Y_PX
    })
  }

  const onEnter = (el: Element, done: () => void) => {
    if (toValue(suppressAnimation)) {
      done()
      return
    }
    const item = el as HTMLElement
    gsap.to(item, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: ENTER_DURATION_SEC,
      ease: 'power2.out',
      onComplete: done
    })
  }

  const onLeave = (el: Element, done: () => void) => {
    if (toValue(suppressAnimation)) {
      done()
      return
    }
    const item = el as HTMLElement
    const rect = item.getBoundingClientRect()
    const parent = item.parentElement
    
    if (parent) {
      const parentRect = parent.getBoundingClientRect()
      const left = rect.left - parentRect.left
      const top = rect.top - parentRect.top
      
      gsap.set(item, {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: rect.width,
        height: rect.height,
        zIndex: 'var(--z-base)'
      })
    } else {
      gsap.set(item, {
        position: 'absolute',
        width: rect.width,
        height: rect.height,
        zIndex: 'var(--z-base)'
      })
    }
    
    gsap.to(item, {
      opacity: 0,
      scale: 0.9,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: done
    })
  }

  return {
    onBeforeEnter,
    onEnter,
    onLeave
  }
}
