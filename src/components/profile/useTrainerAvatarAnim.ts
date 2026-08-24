/**
 * src/components/profile/useTrainerAvatarAnim.ts
 * 
 * GSAP animations and IntersectionObserver lifecycle for TrainerAvatar.
 */

import { type Ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import gsap from 'gsap';
import {
  AVATAR_CLASS_SPIN_DURATIONS_SEC,
  AVATAR_TYPE_SPIN_DURATIONS_SEC,
  AVATAR_SHADOW_DURATIONS_SEC,
  FULL_ROTATION_DEG
} from '@/logic/constants/animations';

const GHOST_MIN_OPACITY = 0.78;
const BLINK_RED_PULSE_DUR_SEC = 0.75;
const GHOST_FADE_DURATION_SEC = 1;
const INTERSECTION_OBSERVER_THRESHOLD_PCT = 0.05;
const REVERSE_ROTATION_DEG = -360;
const GHOST_FADE_INITIAL_OPACITY = 1;
const HEX_PARSING_RADIX = 16;
const DEFAULT_WHITE_RGB_STRING = '255, 255, 255';

interface SpinConfig {
  duration: number;
  rotationDir?: number;
}

const SPIN_CONFIGS: Record<string, SpinConfig> = {
  fire: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.cazabichos! },
  water: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.criador! },
  electric: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.rocket!, rotationDir: REVERSE_ROTATION_DEG },
  psychic: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.entrenador! },
  dark: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.union! },
  ghost: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.poder! },
  ice: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.admin! },
  dragon: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.master! },
  legend: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.cazabichos!, rotationDir: REVERSE_ROTATION_DEG },
  master: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.master! },
  cazabichos: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.cazabichos! },
  criador: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.criador! },
  rocket: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.rocket! },
  entrenador: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.entrenador! },
  union: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.union! },
  poder: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.poder! },
  admin: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.admin! }
};

interface ShadowConfig {
  from: string;
  to: string;
  duration: number;
  steps?: boolean;
}

const SHADOW_CONFIGS: Record<string, ShadowConfig> = {
  fire: {
    from: '0 0 0 3px #ff4400, 0 0 12px rgba(255, 68, 0, 0.4), inset 0 0 6px rgba(255, 68, 0, 0.2)',
    to: '0 0 0 3px #ff8800, 0 0 24px rgba(255, 68, 0, 0.8), inset 0 0 12px rgba(255, 68, 0, 0.4)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.fire!
  },
  water: {
    from: '0 0 0 3px #0088ff, 0 0 10px rgba(0, 136, 255, 0.35), inset 0 0 5px rgba(0, 136, 255, 0.15)',
    to: '0 0 0 3px #44eeff, 0 0 20px rgba(0, 136, 255, 0.7), inset 0 0 10px rgba(0, 136, 255, 0.3)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.water!
  },
  electric: {
    from: '0 0 0 3px #ffe040, 0 0 14px rgba(255, 204, 0, 0.5)',
    to: '0 0 0 3px #ffffff, 0 0 20px rgba(255, 238, 0, 0.58)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.electric!,
    steps: true
  },
  psychic: {
    from: '0 0 0 3px #cc00ff, 0 0 10px rgba(204, 0, 255, 0.35), inset 0 0 5px rgba(204, 0, 255, 0.15)',
    to: '0 0 0 3px #ff44ff, 0 0 22px rgba(204, 0, 255, 0.7), inset 0 0 10px rgba(204, 0, 255, 0.3)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.psychic!
  },
  dark: {
    from: '0 0 0 3px #7700bb, 0 0 10px rgba(119, 0, 187, 0.35), inset 0 0 5px rgba(119, 0, 187, 0.15)',
    to: '0 0 0 3px #9900cc, 0 0 22px rgba(119, 0, 187, 0.7), inset 0 0 10px rgba(119, 0, 187, 0.3)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.dark!
  },
  ghost: {
    from: '0 0 0 3px #8855ff, 0 0 10px rgba(136, 85, 255, 0.35), inset 0 0 5px rgba(136, 85, 255, 0.15)',
    to: '0 0 0 3px #cc88ff, 0 0 22px rgba(136, 85, 255, 0.7), inset 0 0 10px rgba(136, 85, 255, 0.3)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.ghost!
  },
  ice: {
    from: '0 0 0 3px #88eeff, 0 0 10px rgba(136, 238, 255, 0.35), inset 0 0 5px rgba(136, 238, 255, 0.15)',
    to: '0 0 0 3px #ffffff, 0 0 20px rgba(136, 238, 255, 0.75), inset 0 0 10px rgba(136, 238, 255, 0.3)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.ice!
  },
  dragon: {
    from: '0 0 0 3px #4466ff, 0 0 10px rgba(68, 102, 255, 0.35), inset 0 0 5px rgba(68, 102, 255, 0.15)',
    to: '0 0 0 3px #ff4400, 0 0 22px rgba(68, 102, 255, 0.7), inset 0 0 10px rgba(68, 102, 255, 0.3)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.dragon!
  },
  legend: {
    from: '0 0 0 3px #ffdd00, 0 0 18px rgba(255, 170, 0, 0.5)',
    to: '0 0 0 3px #ffffff, 0 0 28px #ffdd00, 0 0 44px rgba(255, 136, 0, 0.25)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.legend!
  },
  master: {
    from: '0 0 0 3px #aaaaaa, 0 0 10px rgba(170, 170, 170, 0.3), inset 0 0 5px rgba(170, 170, 170, 0.15)',
    to: '0 0 0 3px #ffffff, 0 0 22px rgba(255, 255, 255, 0.65), inset 0 0 10px rgba(255, 255, 255, 0.3)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.master!
  },
  cazabichos: {
    from: '0 0 0 3px #22c55e, 0 0 10px rgba(34, 197, 94, 0.35), inset 0 0 5px rgba(34, 197, 94, 0.15)',
    to: '0 0 0 3px #4ade80, 0 0 22px rgba(34, 197, 94, 0.7), inset 0 0 10px rgba(34, 197, 94, 0.3)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.cazabichos!
  },
  criador: {
    from: '0 0 0 3px #a855f7, 0 0 10px rgba(168, 85, 247, 0.35), inset 0 0 5px rgba(168, 85, 247, 0.15)',
    to: '0 0 0 3px #c084fc, 0 0 22px rgba(168, 85, 247, 0.7), inset 0 0 10px rgba(168, 85, 247, 0.3)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.criador!
  },
  rocket: {
    from: '0 0 0 3px #ef4444, 0 0 10px rgba(239, 68, 68, 0.35), inset 0 0 5px rgba(239, 68, 68, 0.15)',
    to: '0 0 0 3px #b91c1c, 0 0 22px rgba(239, 68, 68, 0.7), inset 0 0 10px rgba(239, 68, 68, 0.3)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.rocket!
  },
  entrenador: {
    from: '0 0 0 3px #3b82f6, 0 0 10px rgba(59, 130, 246, 0.35), inset 0 0 5px rgba(59, 130, 246, 0.15)',
    to: '0 0 0 3px #60a5fa, 0 0 22px rgba(59, 130, 246, 0.7), inset 0 0 10px rgba(59, 130, 246, 0.3)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.entrenador!
  },
  union: {
    from: '0 0 0 3px #1e40af, 0 0 10px rgba(30, 64, 175, 0.35), inset 0 0 5px rgba(30, 64, 175, 0.15)',
    to: '0 0 0 3px #fbbf24, 0 0 22px rgba(251, 191, 36, 0.6), inset 0 0 10px rgba(251, 191, 36, 0.25)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.union!
  },
  poder: {
    from: '0 0 0 3px #991b1b, 0 0 10px rgba(153, 27, 27, 0.35), inset 0 0 5px rgba(153, 27, 27, 0.15)',
    to: '0 0 0 3px #f97316, 0 0 22px rgba(249, 115, 22, 0.6), inset 0 0 10px rgba(249, 115, 22, 0.25)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.poder!
  },
  admin: {
    from: '0 0 0 3px #ef4444, 0 0 12px rgba(239, 68, 68, 0.45), inset 0 0 6px rgba(239, 68, 68, 0.2)',
    to: '0 0 0 3px #facc15, 0 0 28px rgba(239, 68, 68, 0.85), inset 0 0 14px rgba(239, 68, 68, 0.4)',
    duration: AVATAR_SHADOW_DURATIONS_SEC.admin!
  }
};

function hexToRgb(hex: string): string {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r: string, g: string, b: string) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? 
    `${parseInt(result[1]!, HEX_PARSING_RADIX)}, ${parseInt(result[2]!, HEX_PARSING_RADIX)}, ${parseInt(result[3]!, HEX_PARSING_RADIX)}` : 
    DEFAULT_WHITE_RGB_STRING;
}

export interface UseTrainerAvatarAnimParams {
  containerRef: Ref<HTMLElement | null>;
  frameRef: Ref<HTMLElement | null>;
  resolvedAvatarStyle: Ref<string>;
  isSquare: Ref<boolean>;
  hasFrame: Ref<boolean>;
  elementColors: Record<string, { base: string; light: string; frame: string }>;
}

export function useTrainerAvatarAnim(params: UseTrainerAvatarAnimParams): void {
  const { containerRef, frameRef, resolvedAvatarStyle, isSquare, hasFrame, elementColors } = params;
  let activeTimeline: gsap.core.Timeline | null = null;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (activeTimeline) {
        if (entry.isIntersecting) {
          activeTimeline.play();
        } else {
          activeTimeline.pause();
        }
      }
    });
  }, { threshold: INTERSECTION_OBSERVER_THRESHOLD_PCT });

  function cleanAnimations() {
    if (containerRef.value) {
      observer.unobserve(containerRef.value);
    }
    if (activeTimeline) {
      activeTimeline.kill();
      activeTimeline = null;
    }
    if (containerRef.value) {
      gsap.set(containerRef.value, { clearProps: 'boxShadow,borderColor,opacity' });
    }
    if (frameRef.value) {
      gsap.set(frameRef.value, { clearProps: 'transform,rotation,opacity,scale' });
    }
  }

  function initAnimations() {
    cleanAnimations();
    
    if (!containerRef.value) return;
    observer.observe(containerRef.value);

    const styleClass = resolvedAvatarStyle.value || '';
    if (!styleClass.trim()) return;

    const cleanStyle = styleClass
      .replace('av-sq-', '')
      .replace('av-', '')
      .trim();

    activeTimeline = gsap.timeline({ repeat: -1 });

    if (frameRef.value && !isSquare.value) {
      let spinDuration = AVATAR_CLASS_SPIN_DURATIONS_SEC.cazabichos!;
      let rotationDir = FULL_ROTATION_DEG;

      const matchedSpinKey = Object.keys(SPIN_CONFIGS).find(k => cleanStyle.includes(k));
      if (matchedSpinKey) {
        const config = SPIN_CONFIGS[matchedSpinKey]!;
        spinDuration = config.duration;
        if (config.rotationDir !== undefined) {
          rotationDir = config.rotationDir;
        }
      }

      if (cleanStyle.startsWith('type-')) {
        const typeName = cleanStyle.replace('type-', '');
        if (AVATAR_TYPE_SPIN_DURATIONS_SEC[typeName] !== undefined) {
          spinDuration = AVATAR_TYPE_SPIN_DURATIONS_SEC[typeName]!;
        }
      }

      activeTimeline.to(frameRef.value, {
        rotation: rotationDir,
        duration: spinDuration,
        repeat: -1,
        ease: 'none'
      }, 0);
    }

    let shadowAnim: ShadowConfig | null = null;
    const matchedShadowKey = Object.keys(SHADOW_CONFIGS).find(k => cleanStyle.includes(k));

    if (matchedShadowKey) {
      shadowAnim = SHADOW_CONFIGS[matchedShadowKey]!;
    } else if (cleanStyle.startsWith('type-')) {
      const typeName = cleanStyle.replace('type-', '');
      const colors = elementColors[typeName];
      if (colors && AVATAR_SHADOW_DURATIONS_SEC[typeName] !== undefined) {
        shadowAnim = {
          from: `0 0 0 3px ${colors.base}, 0 0 10px rgba(${hexToRgb(colors.base)}, 0.35), inset 0 0 5px rgba(${hexToRgb(colors.base)}, 0.15)`,
          to: `0 0 0 3px ${colors.light}, 0 0 22px rgba(${hexToRgb(colors.base)}, 0.7), inset 0 0 10px rgba(${hexToRgb(colors.base)}, 0.3)`,
          duration: AVATAR_SHADOW_DURATIONS_SEC[typeName]!
        };
      }
    }

    if (cleanStyle.includes('ghost')) {
      activeTimeline.fromTo(containerRef.value,
        { opacity: GHOST_FADE_INITIAL_OPACITY },
        { opacity: GHOST_MIN_OPACITY, duration: GHOST_FADE_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' },
        0
      );
    }

    if (styleClass.includes('blink-red')) {
      shadowAnim = {
        from: '0 0 5px var(--red)',
        to: '0 0 15px var(--red)',
        duration: BLINK_RED_PULSE_DUR_SEC
      };
      activeTimeline.fromTo(containerRef.value,
        { borderColor: 'var(--red)' },
        { borderColor: 'var(--red-light)', duration: BLINK_RED_PULSE_DUR_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' },
        0
      );
    }

    if (shadowAnim) {
      const easeVal = shadowAnim.steps ? 'steps(1)' : 'sine.inOut';
      activeTimeline.fromTo(containerRef.value,
        { boxShadow: shadowAnim.from },
        { boxShadow: shadowAnim.to, duration: shadowAnim.duration, yoyo: true, repeat: -1, ease: easeVal },
        0
      );
    }
  }

  onMounted(() => {
    nextTick(() => {
      initAnimations();
    });
  });

  onUnmounted(() => {
    cleanAnimations();
  });

  watch(() => resolvedAvatarStyle.value, () => {
    nextTick(() => {
      initAnimations();
    });
  });

  watch(() => hasFrame.value, () => {
    nextTick(() => {
      initAnimations();
    });
  });
}
