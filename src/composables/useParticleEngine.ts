import { onUnmounted } from 'vue'
import { gsap } from 'gsap'

/**
 * useParticleEngine.ts
 * Motor modular para efectos de partículas alrededor de sprites.
 * Gestiona el azar, el escalado relativo y la orquestación de GSAP.
 */

export interface ParticleSystemOptions {
  /** Cantidad de partículas a animar (opcional si se pasan elementos) */
  count?: number
  /** Rango de escala relativa (ej: [0.5, 1.2]) */
  scaleRange?: [number, number]
  /** Rango de partículas activas (ej: [2, 5]) */
  activeRange?: [number, number]
  /** Desactivar la aleatorización inicial de posición */
  disableInitialRandomize?: boolean
  /** Desactivar la aleatorización de posición en cada repetición del loop */
  disableRandomizeOnRepeat?: boolean
  /** Semilla para desincronizar animaciones */
  seed?: number
  /** Rango de aparición en el contenedor (en %) */
  area?: { x: [number, number]; y: [number, number] }
  /** Duración base de la vida de una partícula */
  duration?: number
  /** Delay entre repeticiones */
  repeatDelay?: number
  /** Callback para inicializar cada partícula (estilos iniciales, etc) */
  onInit?: (el: HTMLElement, index: number) => void
  /** Callback en cada repetición (ideal para re-aleatorizar posición) */
  onRepeat?: (el: HTMLElement, index: number) => void
  /** Definición de los tweens principales de GSAP */
  createTweens: (el: HTMLElement, index: number, delay: number) => gsap.core.Tween[]
}

export function useParticleEngine() {
  const activeTweens: gsap.core.Tween[] = []

  const killAll = () => {
    activeTweens.forEach(t => t.kill())
    activeTweens.length = 0
  }

  const randomizePosition = (el: HTMLElement, area: { x: [number, number]; y: [number, number] }) => {
    const randomLeft = area.x[0] + (Math.random() * (area.x[1] - area.x[0]))
    const randomTop = area.y[0] + (Math.random() * (area.y[1] - area.y[0]))
    gsap.set(el, { left: `${randomLeft}%`, top: `${randomTop}%` })
  }

  const randomizeSize = (el: HTMLElement, range: [number, number]) => {
    const randomScale = range[0] + (Math.random() * (range[1] - range[0]))
    gsap.set(el, { scale: randomScale })
  }

  const initSystem = (elements: HTMLElement[], options: ParticleSystemOptions) => {
    killAll()
    
    if (!elements.length) return

    const {
      area = { x: [10, 90], y: [10, 90] },
      onInit,
      onRepeat,
      createTweens
    } = options

    elements.forEach((el) => {
      if (!el) return
      
      // Limpiar tweens previos y ocultar inmediatamente para evitar "flashes" de estados previos
      gsap.killTweensOf(el)
      gsap.set(el, { visibility: 'hidden', opacity: 0, scale: 0 })

      // 1. Posicionamiento y tamaño inicial azaroso (opcional)
      if (!options.disableInitialRandomize) {
        randomizePosition(el, area)
        // Solo aleatorizamos tamaño si NO se van a crear tweens inmediatamente 
        // o si no estamos usando un sistema de escala animada.
        if (options.scaleRange && !options.createTweens) {
          randomizeSize(el, options.scaleRange)
        }
      }
    })

    // 1.1 Visibilidad inicial (Solo al nacer)
    if (options.activeRange) {
      const [min, max] = options.activeRange
      const initialCount = gsap.utils.random(min, max, 1)
      elements.forEach((el, i) => {
        gsap.set(el, { visibility: i < initialCount ? 'visible' : 'hidden' })
      })
    } else {
      // Si no hay rango activo, todos son visibles por defecto (ej. Shiny, Tácticos)
      elements.forEach(el => gsap.set(el, { visibility: 'visible' }))
    }
      
    elements.forEach((el, i) => {
      if (!el) return
      
      // 2. Lifecycle hooks
      if (onInit) onInit(el, i)

      // 3. Delay azaroso para desincronizar el "nacimiento"
      const randomDelay = Math.random() * 2

      // 4. Inyectar lógica de re-posicionamiento en el loop si el usuario lo desea
      // 4. Inyectar lógica de re-posicionamiento en el loop si el usuario lo desea
      const wrappedOnRepeat = () => {
        const isHidden = gsap.getProperty(el, 'autoAlpha') === 0
        
        // 1. Re-calcular visibilidad INDIVIDUAL para evitar cortes bruscos en el grupo
        let shouldBeVisible = true
        if (options.activeRange) {
          const [min, max] = options.activeRange
          const activeCount = elements.filter(e => e !== el && gsap.getProperty(e, 'visibility') === 'visible').length
          
          if (activeCount >= max) {
            shouldBeVisible = false
          } else if (activeCount < min) {
            shouldBeVisible = true
          } else {
            shouldBeVisible = Math.random() > 0.4
          }
          
          // SEGURIDAD: Solo ocultamos si la partícula está en un punto de "baja visibilidad"
          // para evitar desapariciones bruscas en mitad de un pulso de escala/opacidad.
          const currentScale = gsap.getProperty(el, 'scale') as number
          const currentOpacity = gsap.getProperty(el, 'opacity') as number
          const isSafeToHide = currentScale < 0.3 || currentOpacity < 0.3
          
          if (!shouldBeVisible && !isSafeToHide) {
             // Si el sistema quiere ocultarla pero no es seguro, la dejamos visible un ciclo más
             shouldBeVisible = true
          }

          const wasHidden = gsap.getProperty(el, 'visibility') === 'hidden'
          
          gsap.set(el, { 
            visibility: shouldBeVisible ? 'visible' : 'hidden',
            opacity: shouldBeVisible ? (gsap.getProperty(el, 'opacity') === 0 ? 1 : undefined) : 0
          })

          // Si la partícula acaba de "nacer" (pasa de hidden a visible), reiniciamos sus tweens
          // para que la animación empiece siempre desde el principio.
          if (shouldBeVisible && wasHidden) {
            gsap.getTweensOf(el).forEach(t => t.restart())
          }
        }

        // 2. Re-posicionar SOLO si es invisible (oculta por sistema o por lógica)
        if (!options.disableRandomizeOnRepeat && (isHidden || !shouldBeVisible)) {
          randomizePosition(el, area)
          if (options.scaleRange) {
            randomizeSize(el, options.scaleRange)
          }
        }

        if (onRepeat) onRepeat(el, i)
      }

      // 5. Crear y registrar tweens
      const tweens = createTweens(el, i, randomDelay)
      
      // Intentar inyectar el onRepeat en el primer tween si es un loop
      if (tweens.length > 0) {
        const primaryTween = tweens[0]
        if (primaryTween) {
          primaryTween.eventCallback('onRepeat', wrappedOnRepeat)
        }
      }

      activeTweens.push(...tweens)
    })
  }

  onUnmounted(killAll)

  return {
    initSystem,
    killAll,
    randomizePosition
  }
}
