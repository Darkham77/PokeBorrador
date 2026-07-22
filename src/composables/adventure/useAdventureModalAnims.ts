import { gsap } from 'gsap'

export function useAdventureModalAnims() {
  const onModalEnter = (el: Element, done: () => void) => {
    const backdrop = el as HTMLElement
    const card = backdrop.querySelector('.adv-event-modal-card')
    if (!card) {
      done()
      return
    }
    gsap.set(backdrop, { opacity: 0 })
    gsap.set(card, { scale: 0.8, opacity: 0 })
    const tl = gsap.timeline({ onComplete: done })
    tl.to(backdrop, { opacity: 1, duration: 0.25, ease: 'power2.out' })
      .to(card, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.5)' }, '-=0.1')
  }

  const onModalLeave = (el: Element, done: () => void) => {
    const backdrop = el as HTMLElement
    const card = backdrop.querySelector('.adv-event-modal-card')
    if (!card) {
      done()
      return
    }
    const tl = gsap.timeline({ onComplete: done })
    tl.to(card, { scale: 0.8, opacity: 0, duration: 0.25, ease: 'power2.in' })
      .to(backdrop, { opacity: 0, duration: 0.15, ease: 'power2.in' }, '-=0.1')
  }

  return {
    onModalEnter,
    onModalLeave
  }
}
