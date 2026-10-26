import { gsap } from 'gsap';

export interface UseInputAnimationsReturn {
  readonly handleInputEnter: (e: MouseEvent) => void;
  readonly handleInputLeave: (e: MouseEvent) => void;
  readonly handleInputFocus: (e: FocusEvent) => void;
  readonly handleInputBlur: (e: FocusEvent) => void;
}

/**
 * Composable to manage GSAP micro-animations on inputs during focus and hover.
 * Complies with the GSAP-first mandate for visual effects and UI transitions.
 */
export function useInputAnimations(): UseInputAnimationsReturn {
  const handleInputEnter = (e: MouseEvent): void => {
    const el = e.currentTarget as HTMLInputElement;
    if (document.activeElement !== el) {
      gsap.to(el, {
        borderColor: 'rgba(191, 90, 242, 0.4)',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        duration: 0.2
      });
    }
  };

  const handleInputLeave = (e: MouseEvent): void => {
    const el = e.currentTarget as HTMLInputElement;
    if (document.activeElement !== el) {
      gsap.to(el, {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        duration: 0.2
      });
    }
  };

  const handleInputFocus = (e: FocusEvent): void => {
    const el = e.currentTarget as HTMLInputElement;
    gsap.to(el, {
      borderColor: '#bf5af2',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      duration: 0.2
    });
  };

  const handleInputBlur = (e: FocusEvent): void => {
    const el = e.currentTarget as HTMLInputElement;
    gsap.to(el, {
      borderColor: 'rgba(255, 255, 255, 0.12)',
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      duration: 0.2
    });
  };

  return {
    handleInputEnter,
    handleInputLeave,
    handleInputFocus,
    handleInputBlur
  };
}
