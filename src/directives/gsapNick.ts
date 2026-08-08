import type { Directive } from 'vue';
import gsap from 'gsap';

const INTERSECTION_THRESHOLD_RATIO = 0.05;
const OPACITY_SPARK_MIN_LEVEL = 0.7;
const SPARK_ANIM_DURATION_SEC = 0.25;

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
}, { threshold: INTERSECTION_THRESHOLD_RATIO });

/**
 * Custom Vue Directive to handle premium real-time GSAP animations
 * for user nicknames, replacing old performance-intensive CSS @keyframes.
 */
export const gsapNick: Directive = {
  mounted(el: HTMLElement, binding) {
    applyAnimation(el, binding.value);
  },
  updated(el: HTMLElement, binding) {
    if (binding.value !== binding.oldValue) {
      cleanupAnimation(el);
      applyAnimation(el, binding.value);
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
  gsap.set(el, { clearProps: 'textShadow,transform,y,opacity,backgroundPosition' });
}

function applyAnimation(el: HTMLElement, styleClass: unknown) {
  if (typeof styleClass !== 'string' || !styleClass.trim()) return;

  // Clean the style key to match the casing
  const cleanStyle = styleClass
    .replace('nt-class-', '')
    .replace('nt-type-', '')
    .replace('nt-faction-', '')
    .replace('nt-', '')
    .replace('nick-style-', '')
    .trim();

  let anim: gsap.core.Tween | gsap.core.Timeline | null = null;

  // Enforce inline-block for transforms to take effect correctly
  if (['water', 'flying', 'psychic', 'admin'].includes(cleanStyle)) {
    el.style.display = 'inline-block';
  }

  switch (cleanStyle) {
    case 'fire':
      anim = gsap.fromTo(el,
        { textShadow: '0 0 5px rgba(239, 68, 68, 1)' },
        { textShadow: '0 0 15px rgba(249, 115, 22, 1), 0 0 25px rgba(250, 204, 21, 1)', duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
      );
      break;

    case 'water':
    case 'flying':
      anim = gsap.fromTo(el,
        { y: 0 },
        { y: -2, duration: 1.5, yoyo: true, repeat: -1, ease: 'power1.inOut' }
      );
      break;

    case 'spark':
      anim = gsap.fromTo(el,
        { opacity: 1 },
        { opacity: OPACITY_SPARK_MIN_LEVEL, duration: SPARK_ANIM_DURATION_SEC, yoyo: true, repeat: -1, ease: 'steps(1)' }
      );
      break;

    case 'admin':
      anim = gsap.fromTo(el,
        { backgroundPosition: '0% center' },
        { backgroundPosition: '200% center', duration: 3, repeat: -1, ease: 'none' }
      );
      break;

    case 'cazabichos':
    case 'grass':
    case 'bug':
      anim = gsap.fromTo(el,
        { textShadow: '0 0 5px rgba(34, 197, 94, 0.6)' },
        { textShadow: '0 0 12px rgba(34, 197, 94, 0.8), 0 0 20px rgba(134, 239, 172, 0.4)', duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
      );
      break;

    case 'criador':
      anim = gsap.fromTo(el,
        { textShadow: '0 0 5px rgba(168, 85, 247, 0.6)' },
        { textShadow: '0 0 12px rgba(168, 85, 247, 0.8), 0 0 20px rgba(216, 180, 254, 0.4)', duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
      );
      break;

    case 'rocket':
      anim = gsap.fromTo(el,
        { textShadow: '0 0 6px #ef4444, 0 0 12px #991b1b' },
        { textShadow: '0 0 12px #ef4444, 0 0 24px #991b1b, 0 0 35px #000', duration: 1.5, yoyo: true, repeat: -1, ease: 'sine.inOut' }
      );
      break;

    case 'entrenador':
      anim = gsap.fromTo(el,
        { textShadow: '0 0 5px rgba(59, 130, 246, 0.6)' },
        { textShadow: '0 0 12px rgba(59, 130, 246, 0.8), 0 0 20px rgba(147, 197, 253, 0.4)', duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
      );
      break;

    case 'union':
      anim = gsap.fromTo(el,
        { textShadow: '0 0 4px #2563eb, 0 0 8px rgba(37, 99, 235, 0.5)' },
        { textShadow: '0 0 8px #2563eb, 0 0 16px rgba(37, 99, 235, 0.85), 0 0 22px rgba(255, 255, 255, 0.6)', duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut' }
      );
      break;

    case 'poder':
      anim = gsap.fromTo(el,
        { textShadow: '0 0 4px #ef4444, 0 0 8px rgba(239, 68, 68, 0.5)' },
        { textShadow: '0 0 8px #ef4444, 0 0 16px rgba(239, 68, 68, 0.85), 0 0 22px rgba(251, 191, 36, 0.6)', duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
      );
      break;

    case 'ice':
      anim = gsap.fromTo(el,
        { textShadow: '0 0 5px rgba(56, 189, 248, 0.6)' },
        { textShadow: '0 0 15px rgba(56, 189, 248, 0.9), 0 0 25px rgba(255, 255, 255, 0.8)', duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut' }
      );
      break;

    case 'psychic':
      anim = gsap.fromTo(el,
        { scale: 1, textShadow: '0 0 6px rgba(236, 72, 153, 0.5)' },
        { scale: 1.02, textShadow: '0 0 15px rgba(236, 72, 153, 0.9), 0 0 25px rgba(168, 85, 247, 0.6)', duration: 1.5, yoyo: true, repeat: -1, ease: 'sine.inOut' }
      );
      break;

    case 'poison':
      anim = gsap.fromTo(el,
        { opacity: 0.85, textShadow: '0 0 4px rgba(168, 85, 247, 0.4)' },
        { opacity: 1, textShadow: '0 0 12px rgba(168, 85, 247, 0.7)', duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
      );
      break;

    case 'fairy':
      anim = gsap.fromTo(el,
        { opacity: 0.9, textShadow: '0 0 6px rgba(244, 114, 182, 0.5)' },
        { opacity: 1, textShadow: '0 0 18px rgba(244, 114, 182, 0.9), 0 0 30px rgba(253, 244, 255, 0.7)', duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' }
      );
      break;

    default:
      // Normal/Fallback style, no animations needed
      break;
  }

  if (anim) {
    activeAnimations.set(el, anim);
    observer.observe(el);
  }
}
