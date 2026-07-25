import type { Directive } from 'vue';
import gsap from 'gsap';

// Map to keep track of animations for cleanup
const activeAnimations = new Map<HTMLElement, gsap.core.Tween | gsap.core.Timeline>();

// Global IntersectionObserver to optimize CPU/GPU overhead by pausing animations when off-screen
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const el = entry.target as HTMLElement;
    const anim = activeAnimations.get(el);
    if (anim) {
      if (entry.isIntersecting) {
        anim.play();
      } else {
        anim.pause();
      }
    }
  });
}, { threshold: 0.05 });

/**
 * Custom Vue Directive to handle premium real-time looping GSAP animations.
 * Supports: 'spin', 'pulse', 'blink', 'blink-red', 'bounce'.
 */
export const gsapLoop: Directive = {
  mounted(el: HTMLElement, binding) {
    applyAnimation(el, binding.value as string | GsapLoopOptions);
  },
  updated(el: HTMLElement, binding) {
    // Basic comparison of configuration values
    const valString = JSON.stringify(binding.value);
    const oldValString = JSON.stringify(binding.oldValue);
    if (valString !== oldValString) {
      cleanupAnimation(el);
      applyAnimation(el, binding.value as string | GsapLoopOptions);
    }
  },
  unmounted(el: HTMLElement) {
    cleanupAnimation(el);
  }
};

function cleanupAnimation(el: HTMLElement) {
  observer.unobserve(el);
  const anim = activeAnimations.get(el);
  if (anim) {
    anim.kill();
    activeAnimations.delete(el);
  }
  // Clear GSAP animated properties to avoid residue styles
  gsap.set(el, { clearProps: 'transform,rotation,opacity,backgroundColor,boxShadow,y' });
}

interface GsapLoopOptions {
  effect: string
  duration?: number
  ease?: string
  active?: boolean
  scale?: number
  color?: string
  boxShadow?: string
  y?: number
  rotation?: number
  opacity?: number
  [key: string]: string | number | boolean | undefined
}

function applyAnimation(el: HTMLElement, options: string | GsapLoopOptions) {
  if (!options) return;

  const optObj = typeof options === 'string' ? { effect: options } : options;
  const effect = optObj.effect;
  const duration = optObj.duration || (effect === 'spin' ? 1 : effect === 'pulse' ? 2 : 1);
  const ease = optObj.ease || (effect === 'spin' ? 'none' : 'sine.inOut');
  const active = optObj.active !== false;

  if (!active) return;

  // Extract extra vars to pass to GSAP (e.g. delay)
  const extraVars: Record<string, string | number | boolean | undefined> = { ...optObj };
  delete extraVars.effect;
  delete extraVars.duration;
  delete extraVars.ease;
  delete extraVars.active;
  delete extraVars.scale;
  delete extraVars.color;
  delete extraVars.boxShadow;
  delete extraVars.y;
  delete extraVars.rotation;
  delete extraVars.opacity;

  let anim: gsap.core.Tween | gsap.core.Timeline | null = null;

  // Enforce inline-block for transforms to take effect correctly
  if (['spin', 'pulse', 'bounce', 'float'].includes(effect)) {
    const computedStyle = window.getComputedStyle(el);
    if (computedStyle.display === 'inline') {
      el.style.display = 'inline-block';
    }
  }

  switch (effect) {
    case 'spin':
      anim = gsap.to(el, {
        rotation: 360,
        duration,
        ease,
        repeat: -1,
        ...extraVars
      });
      break;

    case 'pulse':
      anim = gsap.fromTo(el,
        { scale: 1 },
        { scale: optObj.scale || 1.05, duration, yoyo: true, repeat: -1, ease, ...extraVars }
      );
      break;

    case 'pulse-shadow': {
      const shadowColor = optObj.color || 'rgba(59, 130, 246, 0.4)';
      anim = gsap.fromTo(el,
        { boxShadow: `0 0 0 0 ${shadowColor}` },
        { boxShadow: optObj.boxShadow || `0 0 0 10px rgba(59, 130, 246, 0)`, duration, repeat: -1, ease: 'power1.out', ...extraVars }
      );
      break;
    }

    case 'blink': {
      const hasText = el.innerText && el.innerText.trim().length > 0;
      if (hasText) {
        const origColor = window.getComputedStyle(el).color || '#ffffff';
        anim = gsap.fromTo(el,
          { color: origColor },
          { color: '#888888', duration, yoyo: true, repeat: -1, ease, ...extraVars }
        );
      } else {
        anim = gsap.fromTo(el,
          { opacity: 1 },
          { opacity: optObj.opacity !== undefined ? optObj.opacity : 0.75, duration, yoyo: true, repeat: -1, ease, ...extraVars }
        );
      }
      break;
    }

    case 'blink-red':
      anim = gsap.fromTo(el,
        { backgroundColor: 'rgba(239, 68, 68, 1)', boxShadow: '0 0 20px rgba(239, 68, 68, 1)' },
        { backgroundColor: 'rgba(153, 27, 27, 1)', boxShadow: '0 0 5px rgba(153, 27, 27, 1)', duration, yoyo: true, repeat: -1, ease, ...extraVars }
      );
      break;

    case 'bounce':
      anim = gsap.fromTo(el,
        { y: 0 },
        { y: optObj.y || -8, duration, yoyo: true, repeat: -1, ease: 'power1.inOut', ...extraVars }
      );
      break;

    case 'float':
      anim = gsap.fromTo(el,
        { y: 0, rotation: 0 },
        {
          y: optObj.y || -6,
          rotation: optObj.rotation !== undefined ? optObj.rotation : 2,
          duration: duration || 3,
          yoyo: true,
          repeat: -1,
          ease: ease || 'sine.inOut',
          ...extraVars
        }
      );
      break;

    default:
      console.warn(`[gsapLoop] Unknown effect: ${effect}`);
      break;
  }

  if (anim) {
    activeAnimations.set(el, anim);
    observer.observe(el);
  }
}
