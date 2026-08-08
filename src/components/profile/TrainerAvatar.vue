<script setup lang="ts">
/**
 * TrainerAvatar.vue
 */
const GHOST_MIN_OPACITY = 0.78
const BLINK_RED_PULSE_DUR_SEC = 0.75
const GHOST_FADE_DURATION_SEC = 1
const CONTAINER_BORDER_WIDTH_PX = 2
const INTERSECTION_OBSERVER_THRESHOLD_PCT = 0.05
const AVATAR_BOX_SHADOW_DIVISOR = 4
const AVATAR_FONT_SIZE_DIVISOR = 2
const FACE_WRAPPER_Z_INDEX = 2
const BORDER_WHITE_OPACITY_LOW = 0.25
const SHADOW_WHITE_OPACITY_SUBTLE = 0.08
const SQUARE_FRAME_BORDER_RADIUS_PX = 6
const GHOST_FADE_INITIAL_OPACITY = 1
const BORDER_RADIUS_CIRCLE_PCT = '50%'
const REVERSE_ROTATION_DEG = -360
const HEX_ALPHA_OPAQUE_SUFFIX = '44';
const HEX_PARSING_RADIX = 16;
import { computed, type CSSProperties, ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { PLAYER_CLASSES } from '@/data/player/playerClasses';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import gsap from 'gsap';
import { DEFAULT_AVATAR_SIZE_PX, AVATAR_CLASS_SPIN_DURATIONS_SEC, AVATAR_TYPE_SPIN_DURATIONS_SEC, AVATAR_SHADOW_DURATIONS_SEC, FULL_ROTATION_DEG } from '@/logic/constants/animations';

interface Props {
  playerClass?: string | null
  level?: number
  size?: number
  avatarStyle?: string
  borderOverride?: string | null
  gender?: string | null
  profile?: {
    playerClass?: string | null
    player_class?: string | null
    level?: number | null
    trainer_level?: number | null
    avatarStyle?: string | null
    avatar_style?: string | null
    gender?: string | null
  } | null
}

const props = withDefaults(defineProps<Props>(), {
  playerClass: null,
  level: 1,
  size: DEFAULT_AVATAR_SIZE_PX,
  avatarStyle: '',
  borderOverride: null,
  gender: 'h',
  profile: null
});

const resolvedPlayerClass = computed(() => {
  if (props.profile) {
    return props.profile.playerClass || props.profile.player_class || props.playerClass;
  }
  return props.playerClass;
});

const resolvedLevel = computed(() => {
  if (props.profile) {
    return props.profile.level || props.profile.trainer_level || props.level;
  }
  return props.level;
});

const resolvedAvatarStyle = computed(() => {
  if (props.profile) {
    return props.profile.avatarStyle || props.profile.avatar_style || props.avatarStyle;
  }
  return props.avatarStyle;
});

const resolvedGender = computed((): 'h' | 'm' | undefined => {
  if (props.profile) {
    const g = props.profile.gender || props.gender;
    return g === 'm' ? 'm' : (g === 'h' ? 'h' : undefined);
  }
  return props.gender === 'm' ? 'm' : (props.gender === 'h' ? 'h' : undefined);
});

interface PlayerClass {
  id: string
  name: string
  color: string
  avatarSpriteId?: string
  faceScale?: string
  facePos?: string
}

const cls = computed(() => {
  const pClass = resolvedPlayerClass.value;
  if (!pClass) return null;
  return (PLAYER_CLASSES as Record<string, PlayerClass>)[pClass] || null; // open-record
});

const borderColor = computed(() => {
  if (props.borderOverride) return props.borderOverride;
  return `rgba(255, 255, 255, ${BORDER_WHITE_OPACITY_LOW})`;
});

const shadowColor = computed(() => {
  if (props.borderOverride) return `${props.borderOverride}${HEX_ALPHA_OPAQUE_SUFFIX}`;
  return `rgba(255, 255, 255, ${SHADOW_WHITE_OPACITY_SUBTLE})`;
});

const avatarClass = computed(() => {
  const style = resolvedAvatarStyle.value;
  if (!style || 
      style === 'null' || 
      style === 'undefined' || 
      style === 'none' || 
      style === 'default' || 
      style === 'sin-marco' || 
      !style.trim()) {
    return '';
  }
  return ` ${style}`;
});

const hasFrame = computed(() => {
  const style = resolvedAvatarStyle.value;
  return !!(style && 
         style !== 'null' && 
         style !== 'undefined' && 
         style !== 'none' && 
         style !== 'default' && 
         style !== 'sin-marco' && 
         style.trim());
});

const isSquare = computed(() => {
  if (!hasFrame.value) return false;
  const style = resolvedAvatarStyle.value;
  return style ? style.includes('sq') : false;
});

// Outer container styles
const containerStyles = computed((): CSSProperties => {
  const sizePx = props.size;
  const bColor = borderColor.value;
  const sColor = shadowColor.value;
  
  return {
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    minWidth: `${sizePx}px`,
    minHeight: `${sizePx}px`,
    position: 'relative',
    flexShrink: 0,
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderWidth: `${CONTAINER_BORDER_WIDTH_PX}px`,
    background: 'transparent',
    ...(hasFrame.value ? {} : {
      borderRadius: BORDER_RADIUS_CIRCLE_PCT,
      borderColor: bColor,
      boxShadow: `0 0 ${sizePx / AVATAR_BOX_SHADOW_DIVISOR}px ${sColor}`
    })
  };
});

// Inner face wrapper styles
const faceStyles = computed((): CSSProperties => {
  const sizePx = props.size;
  const rad = isSquare.value ? `${SQUARE_FRAME_BORDER_RADIUS_PX}px` : BORDER_RADIUS_CIRCLE_PCT;
  
  const baseStyles: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    borderRadius: rad,
    zIndex: FACE_WRAPPER_Z_INDEX,
    fontSize: `${sizePx / AVATAR_FONT_SIZE_DIVISOR}px`
  };

  if (!cls.value) {
    return {
      ...baseStyles,
      background: 'var(--bg-card)'
    };
  }

  const bgSize = cls.value.faceScale || 'cover';
  const bgPos = cls.value.facePos || 'center';
  const displayUrl = getAssetUrl(ASSET_TYPES.TRAINER, cls.value.avatarSpriteId || cls.value.id, { 
    trainerSuffix: 'avatar',
    gender: resolvedGender.value || 'h'
  });

  const dynamicStyles: CSSProperties = {
    ...baseStyles,
    backgroundColor: cls.value.color,
    backgroundImage: `url('${displayUrl}')`,
    backgroundSize: bgSize,
    backgroundPosition: bgPos,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    '--avatar-seed': Math.random()
  };
  return dynamicStyles;
});

// GSAP Animations Integration
const containerRef = ref<HTMLElement | null>(null);
const frameRef = ref<HTMLElement | null>(null);
let activeTimeline: gsap.core.Timeline | null = null;

const ELEMENT_COLORS: Record<string, { base: string, light: string }> = {
  normal: { base: '#9ca3af', light: '#cbd5e1' },
  fire: { base: '#ef4444', light: '#f87171' },
  water: { base: '#3b82f6', light: '#60a5fa' },
  grass: { base: '#22c55e', light: '#4ade80' },
  electric: { base: '#eab308', light: '#fef08a' },
  ice: { base: '#38bdf8', light: '#7dd3fc' },
  fighting: { base: '#ea580c', light: '#fb923c' },
  poison: { base: '#a855f7', light: '#c084fc' },
  ground: { base: '#ca8a04', light: '#facc15' },
  flying: { base: '#67e8f9', light: '#a5f3fc' },
  psychic: { base: '#ec4899', light: '#f472b6' },
  bug: { base: '#84cc16', light: '#a3e635' },
  rock: { base: '#b45309', light: '#d97706' },
  ghost: { base: '#6366f1', light: '#818cf8' },
  dragon: { base: '#4f46e5', light: '#6366f1' },
  dark: { base: '#1e1b4b', light: '#312e81' },
  steel: { base: '#64748b', light: '#94a3b8' },
  fairy: { base: '#f472b6', light: '#f9a8d4' }
};

interface SpinConfig {
  duration: number;
  rotationDir?: number;
}

const SPIN_CONFIGS: Record<string, SpinConfig> = {
  fire: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.fire! },
  water: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.water! },
  electric: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.electric! },
  psychic: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.psychic!, rotationDir: REVERSE_ROTATION_DEG },
  dark: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.dark! },
  ghost: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.ghost! },
  ice: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.ice!, rotationDir: REVERSE_ROTATION_DEG },
  dragon: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.dragon! },
  legend: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.legend! },
  master: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.master! },
  cazabichos: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.cazabichos! },
  criador: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.criador! },
  rocket: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.rocket! },
  entrenador: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.entrenador! },
  union: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.union! },
  poder: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.poder! },
  admin: { duration: AVATAR_CLASS_SPIN_DURATIONS_SEC.admin! }
};

const TYPE_SPIN_DURATIONS: Record<string, number> = AVATAR_TYPE_SPIN_DURATIONS_SEC;

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

const TYPE_SHADOW_DURATIONS: Record<string, number> = AVATAR_SHADOW_DURATIONS_SEC;

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

  // 1. Frame Background Rotation (for Rounds, squares do not spin or pulse frame elements)
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
      if (TYPE_SPIN_DURATIONS[typeName] !== undefined) {
        spinDuration = TYPE_SPIN_DURATIONS[typeName]!;
      }
    }

    activeTimeline.to(frameRef.value, {
      rotation: rotationDir,
      duration: spinDuration,
      repeat: -1,
      ease: 'none'
    }, 0);
  }

  // 2. Pulse Glow & Styling for Container Box Shadow
  let shadowAnim: ShadowConfig | null = null;
  const matchedShadowKey = Object.keys(SHADOW_CONFIGS).find(k => cleanStyle.includes(k));

  if (matchedShadowKey) {
    shadowAnim = SHADOW_CONFIGS[matchedShadowKey]!;
  } else if (cleanStyle.startsWith('type-')) {
    const typeName = cleanStyle.replace('type-', '');
    const colors = ELEMENT_COLORS[typeName];
    if (colors && TYPE_SHADOW_DURATIONS[typeName] !== undefined) {
      shadowAnim = {
        from: `0 0 0 3px ${colors.base}, 0 0 10px rgba(${hexToRgb(colors.base)}, 0.35), inset 0 0 5px rgba(${hexToRgb(colors.base)}, 0.15)`,
        to: `0 0 0 3px ${colors.light}, 0 0 22px rgba(${hexToRgb(colors.base)}, 0.7), inset 0 0 10px rgba(${hexToRgb(colors.base)}, 0.3)`,
        duration: TYPE_SHADOW_DURATIONS[typeName]!
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

const DEFAULT_WHITE_RGB_STRING = '255, 255, 255';

function hexToRgb(hex: string): string {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r: string, g: string, b: string) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? 
    `${parseInt(result[1]!, HEX_PARSING_RADIX)}, ${parseInt(result[2]!, HEX_PARSING_RADIX)}, ${parseInt(result[3]!, HEX_PARSING_RADIX)}` : 
    DEFAULT_WHITE_RGB_STRING;
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

defineExpose({
  resolvedLevel
});
</script>

<template>
  <div 
    ref="containerRef"
    class="trainer-avatar-container" 
    :class="avatarClass" 
    :style="containerStyles"
  >
    <div
      v-if="hasFrame"
      ref="frameRef"
      class="avatar-frame-bg"
    />
    <div 
      class="avatar-face-wrapper" 
      :style="faceStyles"
    >
      <template v-if="!cls">
        🧢
      </template>
    </div>
    <slot name="overlay" />
  </div>
</template>

<style scoped lang="scss">
.trainer-avatar-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.avatar-face-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
  height: 100%;
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
  line-height: 1 !important;
}

.avatar-frame-bg {
  position: absolute;
  pointer-events: none;
}
</style>
