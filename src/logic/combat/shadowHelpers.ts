import { gsap } from 'gsap'
import { requireFeetDatabasePath, requireFeetPoints } from '@/data/pokemon/pokemonFeetDatabase'

const DEFAULT_SHADOW_WIDTH = 10;
const DEFAULT_SHADOW_HEIGHT = 7;

export function generatePixelShadow(w = DEFAULT_SHADOW_WIDTH, h = DEFAULT_SHADOW_HEIGHT): string {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.beginPath()
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  return canvas.toDataURL('image/png')
}

export function getPokemonFeetCoords(spriteUrl: string): { feetX: number; feetY: number } {
  let dbKey = spriteUrl || ''
  const base = import.meta.env.BASE_URL || '/'
  if (base !== '/' && dbKey.startsWith(base)) {
    dbKey = dbKey.slice(base.length - 1)
  }
  try {
    dbKey = decodeURIComponent(dbKey)
  } catch (e) {
    throw new Error(`[shadowHelpers] Error decoding spriteUrl '${dbKey}': ${String(e)}`)
  }
  return requireFeetPoints(requireFeetDatabasePath(dbKey))
}

/**
 * Animación de entrada y oscilación para efectos en el suelo (Púas/Drenadoras)
 */
const SPIKES_ENTRY_Y = 10
const OTHER_GROUND_ENTRY_Y = 20
const SPIKES_ENTRY_ROTATION = -10
const SPIKES_LEAVING_Y = -10
const ROOT_ITEM_HOVER_SCALE = 1.03

export const onGroundPopEnter = (el: Element, done: () => void) => {
  const isSpikes = el.classList.contains('spikes')
  gsap.fromTo(el,
    { scale: 0, y: isSpikes ? SPIKES_ENTRY_Y : OTHER_GROUND_ENTRY_Y, rotation: isSpikes ? SPIKES_ENTRY_ROTATION : 0, opacity: 0 },
    { 
      scale: 1, 
      y: isSpikes ? 0 : 5, 
      rotation: 0, 
      opacity: 1, 
      duration: isSpikes ? 0.4 : 0.6, 
      ease: 'back.out(1.7)', 
      onComplete: () => {
        done()
        if (isSpikes) {
          gsap.to(el.querySelectorAll('.spike-item'), {
            y: SPIKES_LEAVING_Y,
            scaleY: 1.1,
            scaleX: 0.9,
            duration: 0.8,
            yoyo: true,
            repeat: -1,
            ease: 'power1.inOut',
            stagger: 0.1
          })
        } else {
          gsap.to(el.querySelectorAll('.root-item'), {
            y: 2,
            scale: ROOT_ITEM_HOVER_SCALE,
            filter: 'brightness(1.2)',
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: 'power1.inOut'
          })
        }
      }
    }
  )
}
