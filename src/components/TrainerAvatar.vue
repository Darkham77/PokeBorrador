<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import { PLAYER_CLASSES } from '@/data/playerClasses';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';

interface Props {
  playerClass?: string | null
  level?: number
  size?: number
  avatarStyle?: string
  borderOverride?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  playerClass: null,
  level: 1,
  size: 40,
  avatarStyle: '',
  borderOverride: null
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
  if (!props.playerClass) return null;
  return (PLAYER_CLASSES as Record<string, PlayerClass>)[props.playerClass] || null;
});

const borderColor = computed(() => {
  if (props.borderOverride) return props.borderOverride;
  return 'rgba(255, 255, 255, 0.25)';
});

const shadowColor = computed(() => {
  if (props.borderOverride) return `${props.borderOverride}44`;
  return 'rgba(255, 255, 255, 0.08)';
});

const avatarClass = computed(() => {
  return props.avatarStyle ? ` ${props.avatarStyle}` : '';
});

// Check if current avatarStyle is a square style
const isSquare = computed(() => {
  return props.avatarStyle ? props.avatarStyle.includes('sq') : false;
});

// Outer container styles (MUST be transparent so it doesn't cover negative z-index pseudo-elements)
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
    borderWidth: '2px',
    background: 'transparent', // Always transparent to allow glows underneath
    ...(props.avatarStyle ? {} : {
      borderRadius: '50%',
      borderColor: bColor,
      boxShadow: `0 0 ${sizePx / 4}px ${sColor}`
    })
  };
});

// Inner face wrapper styles (holds the actual face or cap graphic)
const faceStyles = computed((): CSSProperties => {
  const sizePx = props.size;
  const rad = isSquare.value ? '6px' : '50%';
  
  const baseStyles: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    borderRadius: rad,
    zIndex: 2, // Drawn on top of pseudo-element gradients and masks
    fontSize: `${sizePx / 2}px`
  };

  if (!cls.value) {
    return {
      ...baseStyles,
      background: 'var(--bg-card)'
    };
  }

  const bgSize = cls.value.faceScale || 'cover';
  const bgPos = cls.value.facePos || 'center';
  const displayUrl = getAssetUrl(ASSET_TYPES.TRAINER, cls.value.avatarSpriteId || cls.value.id, { trainerSuffix: 'avatar' });

  return {
    ...baseStyles,
    backgroundColor: '#1e293b',
    backgroundImage: `radial-gradient(circle, ${cls.value.color}44 0%, transparent 80%), url('${displayUrl}')`,
    backgroundSize: `cover, ${bgSize}`,
    backgroundPosition: `center, ${bgPos}`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    transition: 'background-position 0.2s',
    '--avatar-seed': Math.random()
  } as CSSProperties;
});
</script>

<template>
  <div 
    class="trainer-avatar-container" 
    :class="avatarClass" 
    :style="containerStyles"
  >
    <div 
      class="avatar-face-wrapper" 
      :style="faceStyles"
    >
      <template v-if="!cls">
        🧢
      </template>
      <slot name="overlay" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.trainer-avatar-container {
  display: flex;
  align-items: center;
  justify-content: center;

  &.blink-red {
    animation: blinkRed 1.5s infinite;
    animation-delay: calc(var(--avatar-seed, 0) * -1.5s);
  }
}

@keyframes blinkRed {
  0%, 100% { box-shadow: 0 0 5px var(--red); border-color: var(--red); }
  50% { box-shadow: 0 0 15px var(--red); border-color: var(--red-light); }
}
</style>
