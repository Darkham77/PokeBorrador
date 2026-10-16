import { onUnmounted, getCurrentInstance } from 'vue';
import { gsap } from 'gsap';
import type { ParticleShape } from '@/data/battle/fx-configs';

const PARTICLE_CENTER_PERCENT = 50;
const RECT_DEFAULT_Y_RANGE: [number, number] = [-10, 10];
const REPEAT_VISIBILITY_PROBABILITY_60_PCT = 0.4;
const CIRCLE_DEFAULT_MAX_RADIUS = 40;
const RECT_DEFAULT_MIN_AREA_PERCENT = 10;
const RECT_DEFAULT_MAX_AREA_PERCENT = 90;
const RANDOM_DELAY_MAX_SECS_LIMIT = 2;

/**
 * useParticleEngine.ts
 * Modular engine for particle effects around sprites.
 * Handles randomness, relative scaling, and GSAP orchestration.
 */

export interface ParticleSystemOptions {
  /** Particle count to animate (optional if elements are passed) */
  count?: number;
  /** Distribution shape: 'rect' (box) or 'circle' (orbit) */
  shape?: ParticleShape;
  /** Relative scale range (e.g. [0.5, 1.2]) */
  scaleRange?: [number, number];
  /** Active particle range (e.g. [2, 5]) */
  activeRange?: [number, number];
  /** Disable initial position randomization */
  disableInitialRandomize?: boolean;
  /** Disable position randomization on loop repeats */
  disableRandomizeOnRepeat?: boolean;
  /** Seed to desynchronize animations */
  seed?: number;
  /**
   * Spawn area range in container (in %)
   * If shape='rect': { x: [minX, maxX], y: [minY, maxY] }
   * If shape='circle': { x: [minRadius, maxRadius] } -> Radius relative to center (50,50)
   */
  area?: { x: [number, number]; y?: [number, number] };
  /** Spawn center offset (in %, e.g. { x: 0, y: -50 }) */
  offset?: { x: number; y: number };
  /** Base particle lifetime duration */
  duration?: number;
  /** Delay between repetitions */
  repeatDelay?: number;
  /** Callback to initialize each particle (initial styles, etc.) */
  onInit?: (el: HTMLElement, index: number) => void;
  /** Callback on each repetition (ideal for re-randomizing position) */
  onRepeat?: (el: HTMLElement, index: number) => void;
  /** Primary GSAP tweens or timelines creation function */
  createTweens: (el: HTMLElement, index: number, delay: number) => gsap.core.Animation[];
}

export function useParticleEngine() {
  const activeTweens: gsap.core.Animation[] = [];

  const killAll = () => {
    activeTweens.forEach((t) => t.kill());
    activeTweens.length = 0;
  };

  const randomizePosition = (
    el: HTMLElement,
    area: { x: [number, number]; y?: [number, number] },
    shape: ParticleShape = 'circle',
    offset?: { x: number; y: number }
  ) => {
    let baseLeft: number;
    let baseTop: number;

    if (shape === 'circle') {
      // Uniform circular distribution using polar coordinates
      const rMin = area.x[0];
      const rMax = area.x[1];
      const angle = Math.random() * 2 * Math.PI;

      // sqrt to ensure uniform area distribution
      const r = Math.sqrt(Math.random() * (rMax * rMax - rMin * rMin) + rMin * rMin);

      baseLeft = PARTICLE_CENTER_PERCENT + r * Math.cos(angle);
      baseTop = PARTICLE_CENTER_PERCENT + r * Math.sin(angle);
    } else {
      // Rectangular distribution centered at 50%
      const xRange = area.x;
      const yRange = area.y || RECT_DEFAULT_Y_RANGE;
      baseLeft = PARTICLE_CENTER_PERCENT + xRange[0] + Math.random() * (xRange[1] - xRange[0]);
      baseTop = PARTICLE_CENTER_PERCENT + yRange[0] + Math.random() * (yRange[1] - yRange[0]);
    }

    // Apply absolute offset
    const finalLeft = baseLeft + (offset?.x || 0);
    const finalTop = baseTop + (offset?.y || 0);

    gsap.set(el, { left: `${finalLeft}%`, top: `${finalTop}%` });
  };

  const randomizeSize = (el: HTMLElement, range: [number, number]) => {
    const randomScale = range[0] + Math.random() * (range[1] - range[0]);
    gsap.set(el, { scale: randomScale });
  };

  const initSystem = (elements: HTMLElement[], options: ParticleSystemOptions) => {
    // Kill all previously registered tweens and timelines to avoid leaks/accumulation
    killAll();

    // Kill any remaining individual tweens on elements for safety
    elements.forEach((el) => {
      if (el) gsap.killTweensOf(el);
    });

    if (!elements.length) return;

    const {
      shape = 'circle',
      area = (shape === 'circle'
        ? { x: [0, CIRCLE_DEFAULT_MAX_RADIUS] }
        : {
            x: [RECT_DEFAULT_MIN_AREA_PERCENT, RECT_DEFAULT_MAX_AREA_PERCENT],
            y: [RECT_DEFAULT_MIN_AREA_PERCENT, RECT_DEFAULT_MAX_AREA_PERCENT]
          }) as { x: [number, number]; y?: [number, number] },
      onInit,
      onRepeat,
      createTweens
    } = options;

    elements.forEach((el) => {
      if (!el) return;

      // Clear previous tweens and hide immediately to prevent flashing old states
      gsap.killTweensOf(el);
      gsap.set(el, { visibility: 'hidden', opacity: 0, scale: 0 });

      // 1. Initial random position and size (optional)
      if (!options.disableInitialRandomize) {
        randomizePosition(el, area, shape, options.offset);
        // Only randomize size if tweens are NOT created immediately
        // or if animated scale system is not used.
        if (options.scaleRange && !options.createTweens) {
          randomizeSize(el, options.scaleRange);
        }
      }
    });

    // 1.1 Initial visibility (spawn only)
    if (options.activeRange) {
      const [min, max] = options.activeRange;
      const initialCount = gsap.utils.random(min, max, 1);
      elements.forEach((el, i) => {
        gsap.set(el, { visibility: i < initialCount ? 'visible' : 'hidden' });
      });
    } else {
      // If no active range, all are visible by default (e.g. Shiny, Tactical)
      elements.forEach((el) => gsap.set(el, { visibility: 'visible' }));
    }

    elements.forEach((el, i) => {
      if (!el) return;

      // 2. Lifecycle hooks
      if (onInit) onInit(el, i);

      // 3. Random delay to desynchronize spawn
      const randomDelay = Math.random() * RANDOM_DELAY_MAX_SECS_LIMIT;

      // 4. Inject repositioning logic on loop repeat if configured
      const wrappedOnRepeat = () => {
        // 1. Recalculate individual visibility to prevent abrupt group cuts
        if (options.activeRange) {
          let shouldBeVisible: boolean;
          const [min, max] = options.activeRange;
          const activeCount = elements.filter(
            (e) => e !== el && e.style.visibility === 'visible'
          ).length;

          if (activeCount >= max) {
            shouldBeVisible = false;
          } else if (activeCount < min) {
            shouldBeVisible = true;
          } else {
            shouldBeVisible = Math.random() > REPEAT_VISIBILITY_PROBABILITY_60_PCT;
          }

          const wasHidden = el.style.visibility === 'hidden';

          gsap.set(el, {
            visibility: shouldBeVisible ? 'visible' : 'hidden',
            opacity: shouldBeVisible ? 1 : 0
          });

          // If particle just spawned (hidden to visible), restart its tweens
          // so animation starts cleanly from the beginning.
          if (shouldBeVisible && wasHidden) {
            gsap.getTweensOf(el).forEach((t) => t.restart());
          }
        }

        // 2. Reposition if not disabled
        if (!options.disableRandomizeOnRepeat) {
          randomizePosition(el, area, shape, options.offset);
          if (options.scaleRange) {
            randomizeSize(el, options.scaleRange);
          }
        }

        if (onRepeat) onRepeat(el, i);
      };

      // 5. Create and register tweens (or timelines)
      const tweens = createTweens(el, i, randomDelay);

      // Inject onRepeat callback into the primary tween if looping
      if (tweens.length > 0) {
        const primaryTween = tweens[0];
        if (primaryTween) {
          primaryTween.eventCallback('onRepeat', wrappedOnRepeat);
        }
      }

      activeTweens.push(...tweens);
    });
  };

  if (getCurrentInstance()) {
    onUnmounted(killAll);
  }

  return {
    initSystem,
    killAll,
    randomizePosition
  };
}
