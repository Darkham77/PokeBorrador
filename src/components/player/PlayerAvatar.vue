<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { PLAYER_CLASSES } from '@/data/playerClasses';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';

interface Props {
  classId?: string | null
  size?: number
  customBorder?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  classId: null,
  size: 40,
  customBorder: null
})

const gameStore = useGameStore() as any;

const activeClassId = computed(() => props.classId || gameStore.state.playerClass);
const cls = computed(() => activeClassId.value ? PLAYER_CLASSES[activeClassId.value] : null);

const trainerLevel = computed(() => gameStore.state.trainerLevel || 1);

const borderColor = computed(() => {
  if (props.customBorder) return props.customBorder;
  if (trainerLevel.value >= 20) return 'Rgba(255, 215, 0, 1)'; // Gold
  if (trainerLevel.value >= 10) return 'Rgba(192, 192, 192, 1)'; // Silver
  return 'Rgba(205, 127, 50, 1)'; // Bronze
});

const avatarUrl = computed(() => {
  if (!cls.value) return null;
  const spriteId = cls.value.avatarSpriteId || cls.value.id;
  return getAssetUrl(ASSET_TYPES.TRAINER, spriteId);
});

const containerStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  minWidth: `${props.size}px`,
  minHeight: `${props.size}px`,
  borderColor: borderColor.value,
  boxShadow: `0 0 ${props.size / 4}px ${borderColor.value}66`,
  backgroundImage: cls.value ? `Radial-Gradient(circle, ${cls.value.color}44 0%, transparent 80%), url('${avatarUrl.value}')` : 'none'
}));
</script>

<template>
  <div 
    class="player-avatar"
    :style="containerStyle"
    :class="{ 'no-class': !cls }"
  >
    <span
      v-if="!cls"
      :style="{ fontSize: `${size/2}px` }"
    >🧢</span>
  </div>
</template>

<style scoped lang="scss">
.player-avatar {
  border-radius: 50%;
  border: 2px solid;
  background-color: Rgba(30, 41, 59, 1);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;

  &.no-class {
    background: Rgba(30, 41, 59, 1);
  }
}
</style>
