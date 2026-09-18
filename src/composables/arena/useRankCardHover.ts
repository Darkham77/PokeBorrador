import { gsap } from 'gsap'

const RANK_CARD_HOVER_X_OFFSET = 4
export const RANK_ANIM_FAST_DURATION_SEC = 0.2

export function useRankCardHover() {
  const handleCardEnter = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement
    gsap.to(el, {
      x: RANK_CARD_HOVER_X_OFFSET,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderColor: 'rgba(251, 191, 36, 0.25)',
      duration: RANK_ANIM_FAST_DURATION_SEC,
      ease: 'power2.out'
    })
  }

  const handleCardLeave = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement
    let baseBorderColor = 'rgba(255, 255, 255, 0.05)'
    let baseBackground = 'rgba(255, 255, 255, 0.02)'

    if (el.classList.contains('rank-1')) {
      baseBorderColor = 'rgba(251, 191, 36, 0.35)'
      baseBackground = 'linear-gradient(90deg, rgba(251, 191, 36, 0.1), rgba(0, 0, 0, 0))'
    } else if (el.classList.contains('rank-2')) {
      baseBorderColor = 'rgba(148, 163, 184, 0.35)'
      baseBackground = 'linear-gradient(90deg, rgba(148, 163, 184, 0.1), rgba(0, 0, 0, 0))'
    } else if (el.classList.contains('rank-3')) {
      baseBorderColor = 'rgba(180, 83, 9, 0.35)'
      baseBackground = 'linear-gradient(90deg, rgba(180, 83, 9, 0.1), rgba(0, 0, 0, 0))'
    }

    gsap.to(el, {
      x: 0,
      backgroundColor: baseBackground,
      borderColor: baseBorderColor,
      duration: RANK_ANIM_FAST_DURATION_SEC,
      ease: 'power2.out',
      clearProps: 'x,background,borderColor'
    })
  }

  return {
    handleCardEnter,
    handleCardLeave
  }
}
