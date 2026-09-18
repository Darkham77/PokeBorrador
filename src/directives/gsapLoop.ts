import type { Directive } from 'vue';
import gsap from 'gsap';

import { SCALE_DEFAULT_BASE_FACTOR } from '@/logic/constants/visuals';

// Map to keep track of animations for cleanup
const activeAnimations = new Map<HTMLElement, gsap.core.Tween | gsap.core.Timeline>();

const GSAP_OBSERVER_THRESHOLD_PCT = 0.05;
const SPINNER_FULL_ROTATION_DEG = 360;
const OPACITY_DEFAULT_FULL_LEVEL = 1;
const DEFAULT_PULSE_SCALE_BOOST = 1.05;
const DEFAULT_BLINK_MIN_OPACITY = 0.75;

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
}, { threshold: GSAP_OBSERVER_THRESHOLD_PCT });

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

const DEFAULT_BOUNCE_Y_OFFSET = -8 as const;
const DEFAULT_FLOAT_Y_OFFSET = -6 as const;
const DEFAULT_FLOAT_ROTATION_DEG = 2 as const;
const DEFAULT_FLOAT_DURATION_SEC = 3 as const;
const DEFAULT_BLINK_DIM_COLOR = '#888888' as const;
const DEFAULT_FALLBACK_TEXT_COLOR = '#ffffff' as const;

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

type AnimationExtraVars = Record<string, string | number | boolean | undefined>;

function extractExtraVars(optObj: GsapLoopOptions): AnimationExtraVars {
  const extraVars: AnimationExtraVars = { ...optObj };
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
  return extraVars;
}

function isTransformEffect(effect: string): boolean {
  return effect === 'spin' || effect === 'pulse' || effect === 'bounce' || effect === 'float';
}

function ensureInlineBlockDisplay(el: HTMLElement, effect: string): void {
  if (isTransformEffect(effect)) {
    const computedStyle = window.getComputedStyle(el);
    if (computedStyle.display === 'inline') {
      el.style.display = 'inline-block';
    }
  }
}

function buildSpinAnimation(el: HTMLElement, duration: number, ease: string, extraVars: AnimationExtraVars): gsap.core.Tween {
  return gsap.to(el, {
    rotation: SPINNER_FULL_ROTATION_DEG,
    duration,
    ease,
    repeat: -1,
    ...extraVars
  });
}

function buildPulseAnimation(el: HTMLElement, optObj: GsapLoopOptions, duration: number, ease: string, extraVars: AnimationExtraVars): gsap.core.Tween {
  return gsap.fromTo(
    el,
    { scale: SCALE_DEFAULT_BASE_FACTOR },
    { scale: optObj.scale || DEFAULT_PULSE_SCALE_BOOST, duration, yoyo: true, repeat: -1, ease, ...extraVars }
  );
}

function buildPulseShadowAnimation(el: HTMLElement, optObj: GsapLoopOptions, duration: number, extraVars: AnimationExtraVars): gsap.core.Tween {
  const shadowColor = optObj.color || 'rgba(59, 130, 246, 0.4)';
  return gsap.fromTo(
    el,
    { boxShadow: `0 0 0 0 ${shadowColor}` },
    { boxShadow: optObj.boxShadow || '0 0 0 10px rgba(59, 130, 246, 0)', duration, repeat: -1, ease: 'power1.out', ...extraVars }
  );
}

function buildBlinkAnimation(el: HTMLElement, optObj: GsapLoopOptions, duration: number, ease: string, extraVars: AnimationExtraVars): gsap.core.Tween {
  const hasText = el.innerText && el.innerText.trim().length > 0;
  if (hasText) {
    const origColor = window.getComputedStyle(el).color || DEFAULT_FALLBACK_TEXT_COLOR;
    return gsap.fromTo(
      el,
      { color: origColor },
      { color: DEFAULT_BLINK_DIM_COLOR, duration, yoyo: true, repeat: -1, ease, ...extraVars }
    );
  }
  return gsap.fromTo(
    el,
    { opacity: OPACITY_DEFAULT_FULL_LEVEL },
    { opacity: optObj.opacity !== undefined ? optObj.opacity : DEFAULT_BLINK_MIN_OPACITY, duration, yoyo: true, repeat: -1, ease, ...extraVars }
  );
}

function buildBlinkRedAnimation(el: HTMLElement, duration: number, ease: string, extraVars: AnimationExtraVars): gsap.core.Tween {
  return gsap.fromTo(
    el,
    { backgroundColor: 'rgba(239, 68, 68, 1)', boxShadow: '0 0 20px rgba(239, 68, 68, 1)' },
    { backgroundColor: 'rgba(153, 27, 27, 1)', boxShadow: '0 0 5px rgba(153, 27, 27, 1)', duration, yoyo: true, repeat: -1, ease, ...extraVars }
  );
}

function buildBounceAnimation(el: HTMLElement, optObj: GsapLoopOptions, duration: number, extraVars: AnimationExtraVars): gsap.core.Tween {
  return gsap.fromTo(
    el,
    { y: 0 },
    { y: optObj.y || DEFAULT_BOUNCE_Y_OFFSET, duration, yoyo: true, repeat: -1, ease: 'power1.inOut', ...extraVars }
  );
}

function buildFloatAnimation(el: HTMLElement, optObj: GsapLoopOptions, duration: number, ease: string, extraVars: AnimationExtraVars): gsap.core.Tween {
  return gsap.fromTo(
    el,
    { y: 0, rotation: 0 },
    {
      y: optObj.y || DEFAULT_FLOAT_Y_OFFSET,
      rotation: optObj.rotation !== undefined ? optObj.rotation : DEFAULT_FLOAT_ROTATION_DEG,
      duration: duration || DEFAULT_FLOAT_DURATION_SEC,
      yoyo: true,
      repeat: -1,
      ease: ease || 'sine.inOut',
      ...extraVars
    }
  );
}

function createLoopAnimation(
  effect: string,
  el: HTMLElement,
  optObj: GsapLoopOptions,
  duration: number,
  ease: string,
  extraVars: AnimationExtraVars
): gsap.core.Tween | gsap.core.Timeline | null {
  switch (effect) {
    case 'spin':
      return buildSpinAnimation(el, duration, ease, extraVars);
    case 'pulse':
      return buildPulseAnimation(el, optObj, duration, ease, extraVars);
    case 'pulse-shadow':
      return buildPulseShadowAnimation(el, optObj, duration, extraVars);
    case 'blink':
      return buildBlinkAnimation(el, optObj, duration, ease, extraVars);
    case 'blink-red':
      return buildBlinkRedAnimation(el, duration, ease, extraVars);
    case 'bounce':
      return buildBounceAnimation(el, optObj, duration, extraVars);
    case 'float':
      return buildFloatAnimation(el, optObj, duration, ease, extraVars);
    default:
      console.warn(`[gsapLoop] Unknown effect: ${effect}`);
      return null;
  }
}

function applyAnimation(el: HTMLElement, options: string | GsapLoopOptions) {
  if (!options) return;

  const optObj = typeof options === 'string' ? { effect: options } : options;
  const effect = optObj.effect;
  const duration = optObj.duration || (effect === 'spin' ? 1 : effect === 'pulse' ? 2 : 1);
  const ease = optObj.ease || (effect === 'spin' ? 'none' : 'sine.inOut');
  const active = optObj.active !== false;

  if (!active) return;

  const extraVars = extractExtraVars(optObj);
  ensureInlineBlockDisplay(el, effect);

  const anim = createLoopAnimation(effect, el, optObj, duration, ease, extraVars);
  if (anim) {
    activeAnimations.set(el, anim);
    observer.observe(el);
  }
}
