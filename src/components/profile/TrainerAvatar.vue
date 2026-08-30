<script setup lang="ts">
/**
 * TrainerAvatar.vue
 */
const CONTAINER_BORDER_WIDTH_PX = 2
const AVATAR_BOX_SHADOW_DIVISOR = 4
const AVATAR_FONT_SIZE_DIVISOR = 2
const BORDER_WHITE_OPACITY_LOW = 0.2
const HEX_ALPHA_OPAQUE_SUFFIX = 'ff'
const SHADOW_WHITE_OPACITY_SUBTLE = 0.25
const BORDER_RADIUS_CIRCLE_PCT = '50%'
const SQUARE_FRAME_BORDER_RADIUS_PX = 6
import { computed, type CSSProperties, ref } from 'vue';
import { PLAYER_CLASSES } from '@/data/player/playerClasses';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { Z_LAYERS } from '@/logic/constants/visuals';
import { DEFAULT_AVATAR_SIZE_PX } from '@/logic/constants/animations';
import { useTrainerAvatarAnim } from './useTrainerAvatarAnim.ts';

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
    zIndex: Z_LAYERS.BASE + 2,
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

const ELEMENT_COLORS: Record<string, { base: string, light: string, frame: string }> = {
  normal: { base: '#9ca3af', light: '#cbd5e1', frame: '#9ca3af' },
  fire: { base: '#ef4444', light: '#f87171', frame: '#ef4444' },
  water: { base: '#3b82f6', light: '#60a5fa', frame: '#3b82f6' },
  grass: { base: '#22c55e', light: '#4ade80', frame: '#22c55e' },
  electric: { base: '#eab308', light: '#fef08a', frame: '#eab308' },
  ice: { base: '#38bdf8', light: '#7dd3fc', frame: '#38bdf8' },
  fighting: { base: '#ea580c', light: '#fb923c', frame: '#ea580c' },
  poison: { base: '#a855f7', light: '#c084fc', frame: '#a855f7' },
  ground: { base: '#ca8a04', light: '#facc15', frame: '#ca8a04' },
  flying: { base: '#67e8f9', light: '#a5f3fc', frame: '#67e8f9' },
  psychic: { base: '#ec4899', light: '#f472b6', frame: '#ec4899' },
  bug: { base: '#84cc16', light: '#a3e635', frame: '#84cc16' },
  rock: { base: '#b45309', light: '#d97706', frame: '#b45309' },
  ghost: { base: '#6366f1', light: '#818cf8', frame: '#6366f1' },
  dragon: { base: '#4f46e5', light: '#6366f1', frame: '#4f46e5' },
  dark: { base: '#1e1b4b', light: '#312e81', frame: '#1e1b4b' },
  steel: { base: '#64748b', light: '#94a3b8', frame: '#64748b' },
  fairy: { base: '#f472b6', light: '#f9a8d4', frame: '#f472b6' }
};

useTrainerAvatarAnim({
  containerRef,
  frameRef,
  resolvedAvatarStyle,
  isSquare,
  hasFrame,
  elementColors: ELEMENT_COLORS
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
        <span class="icon">🧢</span>
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
