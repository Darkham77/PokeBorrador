import { gsap } from 'gsap'
import { gameBus } from '@/logic/events/gameBus'
import type { Pokemon } from '@/types/pokemon/pokemon'

export function triggerEmergenceTimeline(getTargetEl: () => HTMLElement | null) {
  const target = getTargetEl()
  if (!target) return
  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(target, { clearProps: 'transform' })
    }
  })
  tl.to(target, { y: 8, scaleX: 1.2, scaleY: 0.75, duration: 0.1, ease: 'power1.in' })
    .to(target, { y: -60, scaleX: 0.85, scaleY: 1.2, duration: 0.3, ease: 'power2.out' })
    .to(target, { y: 0, scaleX: 1.1, scaleY: 0.9, duration: 0.2, ease: 'bounce.out' })
    .to(target, { scaleX: 1, scaleY: 1, duration: 0.1 })
}

export function triggerFaintTimeline(
  isFainting: boolean,
  getSpriteEl: () => HTMLElement | null,
  getShadowEl: () => HTMLElement | null,
  pokemon?: Pokemon | null
) {
  const spriteEl = getSpriteEl()
  const shadowEl = getShadowEl()

  if (isFainting && spriteEl) {
    const tl = gsap.timeline()
    tl.add(() => {
      if (pokemon) {
        gameBus.emit('PLAY_CRY', { name: pokemon.id || pokemon.name, isFaint: true })
      }
    })
    gsap.set(spriteEl, { transition: 'none' })
    if (shadowEl) {
      gsap.set(shadowEl, { display: 'none' })
    }
    tl.addLabel('fallStart')
    tl.to(spriteEl, { y: 60, duration: 1.0, ease: 'power2.in' }, 'fallStart')

    const blinkPattern = [
      { t: 0.05, op: 0 }, { t: 0.13, op: 1 },
      { t: 0.21, op: 0 }, { t: 0.29, op: 1 },
      { t: 0.37, op: 0 }, { t: 0.45, op: 1 },
      { t: 0.53, op: 0 }, { t: 0.61, op: 1 },
      { t: 0.69, op: 0 }, { t: 0.77, op: 1 },
      { t: 0.85, op: 0 }, { t: 0.93, op: 1 },
      { t: 0.98, op: 0 }
    ]
    blinkPattern.forEach(b => {
      tl.set(spriteEl, { opacity: b.op }, `fallStart+=${b.t}`)
    })
  } else if (!isFainting && spriteEl) {
    gsap.set(spriteEl, { clearProps: 'opacity,y,transition' })
    if (shadowEl) {
      gsap.set(shadowEl, { clearProps: 'display' })
    }
  }
}
