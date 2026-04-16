<script setup>
import { computed } from 'vue';
import { PLAYER_CLASSES } from '@/logic/playerClasses.js';

const props = defineProps({
  playerClass: {
    type: String,
    default: null
  },
  level: {
    type: Number,
    default: 1
  },
  size: {
    type: Number,
    default: 40
  },
  avatarStyle: {
    type: String,
    default: ''
  },
  borderOverride: {
    type: String,
    default: null
  }
});

const cls = computed(() => {
  if (!props.playerClass) return null;
  return PLAYER_CLASSES[props.playerClass] || null;
});

const borderColor = computed(() => {
  if (props.borderOverride) return props.borderOverride;
  if (props.level >= 20) return '#ffd700'; // Gold
  if (props.level >= 10) return '#c0c0c0'; // Silver
  return '#cd7f32'; // Bronze
});

const avatarClass = computed(() => {
  return props.avatarStyle ? ` ${props.avatarStyle}` : '';
});

const avatarStyles = computed(() => {
  const sizePx = props.size;
  const bColor = borderColor.value;
  
  const baseStyles = {
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    minWidth: `${sizePx}px`,
    minHeight: `${sizePx}px`,
    borderRadius: '50%',
    border: `2px solid ${bColor}`,
    boxShadow: `0 0 ${sizePx / 4}px ${bColor}66`,
    position: 'relative',
    flexShrink: 0,
    boxSizing: 'border-box'
  };

  if (!cls.value) {
    return {
      ...baseStyles,
      background: '#1e293b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${sizePx / 2}px`
    };
  }

  const bgSize = cls.value.faceScale || 'cover';
  const bgPos = cls.value.facePos || 'center';
  const displayUrl = cls.value.avatarSprite || cls.value.sprite;

  return {
    ...baseStyles,
    backgroundColor: 'transparent',
    backgroundImage: `radial-gradient(circle, ${cls.value.color}44 0%, transparent 80%), url('${displayUrl}')`,
    backgroundSize: `cover, ${bgSize}`,
    backgroundPosition: `center, ${bgPos}`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    transition: 'background-position 0.2s'
  };
});
</script>

<template>
  <div 
    class="trainer-avatar-container" 
    :class="avatarClass" 
    :style="avatarStyles"
  >
    <template v-if="!cls">
      🧢
    </template>
    <slot name="overlay" />
  </div>
</template>

<style scoped lang="scss">
.trainer-avatar-container {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &.blink-red {
    animation: blinkRed 1.5s infinite;
  }
}

@keyframes blinkRed {
  0%, 100% { box-shadow: 0 0 5px #ef4444; border-color: #ef4444; }
  50% { box-shadow: 0 0 15px #ef4444; border-color: #f87171; }
}
</style>
