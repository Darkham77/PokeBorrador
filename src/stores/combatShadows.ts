import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { logger } from '@/logic/utils/logger'

/**
 * Combat Shadow Store
 * Centralized management for shadows in the virtual battle arena.
 */
interface FeetPoints {
  feetY: number;
  feetX: number;
}

interface CombatShadow {
  id: string;
  side: string;
  entityX: number;
  entityY: number;
  entitySize: number;
  width: string;
  isFlying: boolean;
  feetY: number;
  feetX: number;
  spriteUrl: string;
  visible: boolean;
  force?: boolean;
}

export const useCombatShadowStore = defineStore('combatShadows', () => {
  const activeShadows = reactive(new Map<string, CombatShadow>())
  const feetCache = reactive(new Map<string, FeetPoints>()) // Caché persistente de puntos de anclaje por spriteUrl

  async function detectFeetPoints(url: string): Promise<FeetPoints> {
    if (!url) return { feetY: 0.9, feetX: 0.5 }
    
    // Si ya está en caché, lo devolvemos inmediatamente
    if (feetCache.has(url)) return feetCache.get(url)!
    
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        // [PureVue-Ignore]
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve({ feetY: 0.9, feetX: 0.5 }); return }
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        try {
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
          
          // Buscamos los límites de la caja de colisión (bounding box) para centrar la sombra
          let minX = canvas.width, maxX = 0, lowestY = -1
          
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const index = (y * canvas.width + x) * 4
              const alpha = data[index + 3] || 0
              if (alpha > 50) {
                if (x < minX) minX = x
                if (x > maxX) maxX = x
                if (y > lowestY) lowestY = y
              }
            }
          }

          if (lowestY !== -1) {
            const centerX = (minX + maxX) / 2
            const result = { 
              feetY: lowestY / canvas.height, 
              feetX: centerX / canvas.width 
            }
            feetCache.set(url, result)
            resolve(result)
            return
          }
        } catch (err) {
          logger.warn('Shadow', 'Canvas data extraction failed', err)
        }
        resolve({ feetY: 0.9, feetX: 0.5 })
      }
      img.onerror = () => resolve({ feetY: 0.9, feetX: 0.5 })
      img.src = url
    })
  }

  async function requestShadow(id: string, options: Partial<CombatShadow> = {}) {
  const existing = activeShadows.get(id);
    
    // Bloqueo de propiedad: Si ya tiene una sombra activa para este sprite, no le damos otra (Evitar parpadeos)
    if (existing && options.spriteUrl === existing.spriteUrl && !options.force) {
      // Solo actualizamos visibilidad si cambió, sin disparar todo el proceso de re-creación
      if (options.visible !== undefined && existing.visible !== options.visible) {
        existing.visible = options.visible
      }
      return Promise.resolve(existing)
    }

    // Intentar obtener valores de la caché para evitar el salto inicial (Sync)
    const cachedPoints = options.spriteUrl ? feetCache.get(options.spriteUrl) : null
    
    let feetY = options.feetY || (cachedPoints?.feetY ?? (existing?.feetY ?? 0.9))
    // Si es volador, ignoramos el valor detectado y forzamos el suelo
    if (options.isFlying) feetY = 0.9
    
    const feetX = options.feetX || (cachedPoints?.feetX ?? (existing?.feetX ?? 0.5))
    const visible = options.visible !== undefined ? options.visible : true

    // Guardamos/actualizamos la sombra inmediatamente para que sea visible
    const newShadow = {
      id,
      side: options.side || 'generic',
      entityX: options.entityX ?? (existing?.entityX ?? 0),
      entityY: options.entityY ?? (existing?.entityY ?? 0),
      entitySize: options.entitySize ?? (existing?.entitySize ?? 300),
      width: options.width || (existing?.width ?? '70%'),
      isFlying: options.isFlying || false,
      feetY,
      feetX,
      spriteUrl: options.spriteUrl || existing?.spriteUrl || '',
      visible
    } as CombatShadow
    
    activeShadows.set(id, newShadow)

    // Si el sprite cambió y no estaba en caché, calculamos nuevos puntos de anclaje EN SEGUNDO PLANO
    if (options.spriteUrl && options.spriteUrl !== existing?.spriteUrl && !cachedPoints) {
      return detectFeetPoints(options.spriteUrl).then(points => {
        // Solo actualizamos si la sombra sigue existiendo y es del mismo sprite
        const current = activeShadows.get(id)
        if (current && current.spriteUrl === options.spriteUrl) {
          // Si es volador, forzamos el anclaje al suelo (90%) 
          // para que los items (pokebolas) no caigan "en el aire"
          const finalFeetY = current.isFlying ? 0.9 : points.feetY
          
          activeShadows.set(id, {
            ...current,
            feetY: finalFeetY,
            feetX: points.feetX
          })
        }
        return points
      })
    }

    return Promise.resolve(newShadow)
  }

  function showShadow(id: string) {
    if (!id) return
    const shadow = activeShadows.get(id)
    if (shadow) {
      shadow.visible = true
    }
  }

  function hideShadow(id: string) {
    if (!id) return
    const shadow = activeShadows.get(id)
    if (shadow) {
      shadow.visible = false
    }
  }

  function removeShadow(id: string) {
    activeShadows.delete(id)
  }

  function clearAll() {
    activeShadows.clear()
  }

  return {
    activeShadows,
    feetCache,
    detectFeetPoints,
    requestShadow,
    showShadow,
    hideShadow,
    removeShadow,
    clearAll
  }
})
