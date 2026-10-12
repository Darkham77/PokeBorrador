import { gsap } from 'gsap'

/**
 * Composable to manage GSAP micro-animations on inputs during focus and hover.
 * Complies with the GSAP-first mandate for visual effects and UI transitions.
 */
export function useInputAnimations() {
  const handleInputEnter = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLInputElement
    if (document.activeElement !== el) {
      gsap.to(el, {
        borderColor: 'rgba(191, 90, 242, 0.4)',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        duration: 0.2
      })
    }
  }

  const handleInputLeave = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLInputElement
    if (document.activeElement !== el) {
      gsap.to(el, {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        duration: 0.2
      })
    }
  }

  const handleInputFocus = (e: FocusEvent) => {
    const el = e.currentTarget as HTMLInputElement
    gsap.to(el, {
      borderColor: '#bf5af2',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      duration: 0.2
    })
  }

  const handleInputBlur = (e: FocusEvent) => {
    const el = e.currentTarget as HTMLInputElement
    gsap.to(el, {
      borderColor: 'rgba(255, 255, 255, 0.12)',
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      duration: 0.2
    })
  }

  return {
    handleInputEnter,
    handleInputLeave,
    handleInputFocus,
    handleInputBlur
  }
}
