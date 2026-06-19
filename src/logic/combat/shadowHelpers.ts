import { gsap } from 'gsap'
import { POKEMON_FEET_DATABASE } from '@/data/pokemon/pokemonFeetDatabase'

export function getPokemonFeetCoords(spriteUrl: string): { feetX: number; feetY: number } {
  let dbKey = spriteUrl || ''
  const base = import.meta.env.BASE_URL || '/'
  if (base !== '/' && dbKey.startsWith(base)) {
    dbKey = dbKey.slice(base.length - 1)
  }
  try {
    dbKey = decodeURIComponent(dbKey)
  } catch (_e) {
    // Ignore decode error
  }
  return POKEMON_FEET_DATABASE[dbKey] || { feetY: 0.9, feetX: 0.5 }
}

/**
 * Animación de entrada y oscilación para efectos en el suelo (Púas/Drenadoras)
 */
export const onGroundPopEnter = (el: Element, done: () => void) => {
  const isSpikes = el.classList.contains('spikes')
  gsap.fromTo(el,
    { scale: 0, y: isSpikes ? 10 : 20, rotation: isSpikes ? -10 : 0, opacity: 0 },
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
            y: -10,
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
            scale: 1.03,
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
