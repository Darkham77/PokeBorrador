<script setup>
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { PLAYER_CLASSES } from '@/logic/playerClasses';

const props = defineProps({
  classId: {
    type: String,
    default: null
  },
  size: {
    type: Number,
    default: 40
  },
  customBorder: {
    type: String,
    default: null
  }
});

const gameStore = useGameStore();

const activeClassId = computed(() => props.classId || gameStore.state.playerClass);
const cls = computed(() => activeClassId.value ? PLAYER_CLASSES[activeClassId.value] : null);

const trainerLevel = computed(() => gameStore.state.trainerLevel || 1);

const borderColor = computed(() => {
  if (props.customBorder) return props.customBorder;
  if (trainerLevel.value >= 20) return '#ffd700'; // Gold
  if (trainerLevel.value >= 10) return '#c0c0c0'; // Silver
  return '#cd7f32'; // Bronze
});

const avatarUrl = computed(() => {
  if (!cls.value) return null;
  return cls.value.avatarSprite || cls.value.sprite;
});

const containerStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  minWidth: `${props.size}px`,
  minHeight: `${props.size}px`,
  borderColor: borderColor.value,
  boxShadow: `0 0 ${props.size / 4}px ${borderColor.value}66`,
  backgroundImage: cls.value ? `radial-gradient(circle, ${cls.value.color}44 0%, transparent 80%), url('${avatarUrl.value}')` : 'none'
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
  background-color: #1e293b;
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
    background: #1e293b;
  }
}
</style>
