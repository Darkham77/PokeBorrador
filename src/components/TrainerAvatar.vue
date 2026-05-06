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

const cls = computed(() => {
  if (!props.playerClass) return null;
  return (PLAYER_CLASSES as any)[props.playerClass] || null;
});

const borderColor = computed(() => {
  if (props.borderOverride) return props.borderOverride;
  if (props.level >= 20) return 'var(--yellow)';
  if (props.level >= 10) return 'var(--silver)';
  return 'var(--bronze)';
});

const avatarClass = computed(() => {
  return props.avatarStyle ? ` ${props.avatarStyle}` : '';
});

const avatarStyles = computed((): CSSProperties => {
  const sizePx = props.size;
  const bColor = borderColor.value;
  
  const baseStyles: CSSProperties = {
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
      background: 'var(--bg-card)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${sizePx / 2}px`
    };
  }

  const bgSize = cls.value.faceScale || 'cover';
  const bgPos = cls.value.facePos || 'center';
  const displayUrl = getAssetUrl(ASSET_TYPES.TRAINER, cls.value.avatarSpriteId || cls.value.id);

  return {
    ...baseStyles,
    backgroundColor: 'transparent',
    backgroundImage: `Radial-Gradient(circle, ${cls.value.color}44 0%, transparent 80%), url('${displayUrl}')`,
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
    animation-delay: Calc(var(--avatar-seed, 0) * -1.5s);
  }
}

@keyframes blinkRed {
  0%, 100% { box-shadow: 0 0 5px var(--red); border-color: var(--red); }
  50% { box-shadow: 0 0 15px var(--red); border-color: var(--red-light); }
}
</style>
