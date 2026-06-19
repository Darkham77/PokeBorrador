import { gsap } from 'gsap'

interface StatHoverClassMap {
  pvp?: { border: string; background: string }
  'highlight-war-points'?: { border: string; background: string }
  'highlight-war-coins'?: { border: string; background: string }
  [key: string]: { border: string; background: string } | undefined
}

const DEFAULT_CLASSES: StatHoverClassMap = {
  pvp: {
    border: 'rgba(236, 72, 153, 0.2)',
    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%)'
  },
  'highlight-war-points': {
    border: 'rgba(59, 130, 246, 0.2)',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%)'
  },
  'highlight-war-coins': {
    border: 'rgba(251, 191, 36, 0.2)',
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%)'
  }
}

export function useStatHover(classMap: StatHoverClassMap = DEFAULT_CLASSES) {
  const handleStatEnter = (e: MouseEvent) => {
    gsap.to(e.currentTarget, {
      y: -2,
      backgroundColor: 'rgba(30, 41, 59, 0.5)',
      borderColor: 'rgba(255, 214, 10, 0.2)',
      boxShadow: '0 0 0 1px rgba(255, 214, 10, 0.2)',
      duration: 0.2,
      ease: 'power2.out'
    })
  }

  const handleStatLeave = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement
    let baseBorderColor = 'rgba(255, 255, 255, 0.05)'
    let baseBackground = 'rgba(15, 23, 42, 0.95)'

    const keys = Object.keys(classMap) as Array<keyof StatHoverClassMap>
    for (const cls of keys) {
      if (el.classList.contains(cls as string)) {
        baseBorderColor = classMap[cls]!.border
        baseBackground = classMap[cls]!.background
        break
      }
    }

    gsap.to(el, {
      y: 0,
      background: baseBackground,
      borderColor: baseBorderColor,
      boxShadow: 'none',
      duration: 0.2,
      ease: 'power2.out',
      clearProps: 'y,background,borderColor,boxShadow'
    })
  }

  return { handleStatEnter, handleStatLeave }
}
