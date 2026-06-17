import { toValue, type MaybeRefOrGetter } from 'vue'
import { gsap } from 'gsap'

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
      y: 10
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
      duration: 0.25,
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
        zIndex: 0
      })
    } else {
      gsap.set(item, {
        position: 'absolute',
        width: rect.width,
        height: rect.height,
        zIndex: 0
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
