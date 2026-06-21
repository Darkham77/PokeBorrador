import type { Directive } from 'vue';
import gsap from 'gsap';

// Map to track active tweens/timelines for cleanup
const activeTweens = new Map<HTMLElement, gsap.core.Tween>();

interface GsapHoverOptions {
  scale?: number;
  x?: number;
  y?: number;
  rotation?: number;
  opacity?: number;
  duration?: number;
  ease?: string;
  pressEffect?: boolean;
  pressScale?: number;
  [key: string]: string | number | boolean | undefined;
}

interface GsapHoverElement extends HTMLElement {
  _gsapHoverEnter?: () => void;
  _gsapHoverLeave?: () => void;
  _gsapHoverDown?: () => void;
  _gsapHoverUp?: () => void;
}

/**
 * Custom Vue Directive to handle premium hover and press micro-interactions with GSAP.
 * Replaces legacy CSS transition animations to align with the pure GSAP standard.
 */
export const gsapHover: Directive = {
  mounted(el: HTMLElement, binding) {
    const hoverEl = el as GsapHoverElement;
    const options: GsapHoverOptions = getOptions(binding.value);
    el.dataset.gsapHover = 'true';
    
    // Save original styles/values if needed for resets
    const originalTransform = el.style.transform;
    
    const onMouseEnter = () => {
      // Clear previous tween on enter to avoid conflicts
      cleanupTween(el);
      
      const targetVars: gsap.TweenVars = {
        duration: options.duration ?? 0.2,
        ease: options.ease ?? 'power1.out',
        overwrite: 'auto'
      };

      if (options.scale !== undefined) targetVars.scale = options.scale;
      if (options.x !== undefined) targetVars.x = options.x;
      if (options.y !== undefined) targetVars.y = options.y;
      if (options.rotation !== undefined) targetVars.rotation = options.rotation;
      if (options.opacity !== undefined) targetVars.opacity = options.opacity;
      
      // Inject inline-block for inline elements to support transforms
      const computedStyle = window.getComputedStyle(el);
      if (computedStyle.display === 'inline') {
        el.style.display = 'inline-block';
      }

      const tween = gsap.to(el, targetVars);
      activeTweens.set(el, tween);
    };

    const onMouseLeave = () => {
      cleanupTween(el);
      
      const tween = gsap.to(el, {
        scale: 1,
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        duration: options.duration ?? 0.2,
        ease: options.ease ?? 'power1.out',
        overwrite: 'auto',
        onComplete: () => {
          // If transform was empty initially, clear inline style to avoid layout quirks
          if (!originalTransform) {
            gsap.set(el, { clearProps: 'transform,scale,rotation,x,y' });
          }
        }
      });
      activeTweens.set(el, tween);
    };

    const onMouseDown = () => {
      if (options.pressEffect === false) return;
      cleanupTween(el);
      const tween = gsap.to(el, {
        scale: options.pressScale ?? 0.95,
        duration: 0.08,
        ease: 'power1.out',
        overwrite: 'auto'
      });
      activeTweens.set(el, tween);
    };

    const onMouseUp = () => {
      if (options.pressEffect === false) return;
      cleanupTween(el);
      // Re-trigger hover animation state on mouse release
      onMouseEnter();
    };

    // Store references to remove listeners correctly on unmount
    hoverEl._gsapHoverEnter = onMouseEnter;
    hoverEl._gsapHoverLeave = onMouseLeave;
    hoverEl._gsapHoverDown = onMouseDown;
    hoverEl._gsapHoverUp = onMouseUp;

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseup', onMouseUp);
  },

  unmounted(el: HTMLElement) {
    cleanupTween(el);
    const hoverEl = el as GsapHoverElement;
    
    // Remove listeners
    if (hoverEl._gsapHoverEnter) el.removeEventListener('mouseenter', hoverEl._gsapHoverEnter);
    if (hoverEl._gsapHoverLeave) el.removeEventListener('mouseleave', hoverEl._gsapHoverLeave);
    if (hoverEl._gsapHoverDown) el.removeEventListener('mousedown', hoverEl._gsapHoverDown);
    if (hoverEl._gsapHoverUp) el.removeEventListener('mouseup', hoverEl._gsapHoverUp);
    
    // Clean properties from the element
    delete el.dataset.gsapHover;
    gsap.set(el, { clearProps: 'transform,scale,rotation,opacity,x,y' });
  }
};

function cleanupTween(el: HTMLElement) {
  const tween = activeTweens.get(el);
  if (tween) {
    tween.kill();
    activeTweens.delete(el);
  }
}

function getOptions(value: string | GsapHoverOptions | undefined): GsapHoverOptions {
  const defaults: GsapHoverOptions = {
    scale: 1.05,
    y: -2,
    duration: 0.15,
    ease: 'power1.out',
    pressEffect: true,
    pressScale: 0.95
  };

  if (!value) return defaults;
  if (typeof value === 'string') {
    switch (value) {
      case 'card':
        return { ...defaults, scale: 1.08, y: -4 };
      case 'button':
        return { ...defaults, scale: 1.03, y: -1 };
      case 'pill':
        return { ...defaults, scale: 1.05, y: -1.5 };
      default:
        return defaults;
    }
  }

  return { ...defaults, ...value };
}
