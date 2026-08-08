import { gsap } from 'gsap'

const MODIAL_ANIM_INITIAL_SCALE = 0.8;
const MODAL_ANIM_FULL_SCALE = 1;
const MODAL_ANIM_INVISIBLE_OPACITY = 0;
const MODAL_ANIM_FULL_OPACITY = 1;
const MODAL_ANIM_BACKDROP_ENTER_DURATION_SEC = 0.25;
const MODAL_ANIM_CARD_ENTER_DURATION_SEC = 0.35;
const MODAL_ANIM_CARD_LEAVE_DURATION_SEC = 0.25;
const MODAL_ANIM_BACKDROP_LEAVE_DURATION_SEC = 0.15;

export function useAdventureModalAnims() {
  const onModalEnter = (el: Element, done: () => void) => {
    const backdrop = el as HTMLElement
    const card = backdrop.querySelector('.adv-event-modal-card')
    if (!card) {
      done()
      return
    }
    gsap.set(backdrop, { opacity: MODAL_ANIM_INVISIBLE_OPACITY })
    gsap.set(card, { scale: MODIAL_ANIM_INITIAL_SCALE, opacity: MODAL_ANIM_INVISIBLE_OPACITY })
    const tl = gsap.timeline({ onComplete: done })
    tl.to(backdrop, { opacity: MODAL_ANIM_FULL_OPACITY, duration: MODAL_ANIM_BACKDROP_ENTER_DURATION_SEC, ease: 'power2.out' })
      .to(card, { scale: MODAL_ANIM_FULL_SCALE, opacity: MODAL_ANIM_FULL_OPACITY, duration: MODAL_ANIM_CARD_ENTER_DURATION_SEC, ease: 'back.out(1.5)' }, '-=0.1')
  }

  const onModalLeave = (el: Element, done: () => void) => {
    const backdrop = el as HTMLElement
    const card = backdrop.querySelector('.adv-event-modal-card')
    if (!card) {
      done()
      return
    }
    const tl = gsap.timeline({ onComplete: done })
    tl.to(card, { scale: MODIAL_ANIM_INITIAL_SCALE, opacity: MODAL_ANIM_INVISIBLE_OPACITY, duration: MODAL_ANIM_CARD_LEAVE_DURATION_SEC, ease: 'power2.in' })
      .to(backdrop, { opacity: MODAL_ANIM_INVISIBLE_OPACITY, duration: MODAL_ANIM_BACKDROP_LEAVE_DURATION_SEC, ease: 'power2.in' }, '-=0.1')
  }

  return {
    onModalEnter,
    onModalLeave
  }
}
