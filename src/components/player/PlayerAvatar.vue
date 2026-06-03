<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { PLAYER_CLASSES } from '@/data/playerClasses';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';

interface Props {
  classId?: string | null
  playerClass?: string | null
  size?: number
  customBorder?: string | null
  gender?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  classId: undefined,
  playerClass: undefined,
  size: 40,
  customBorder: null,
  gender: null
})

interface PlayerClass {
  id: string
  name: string
  color: string
  avatarSpriteId?: string
}

const gameStore = useGameStore();

const activeClassId = computed(() => {
  if (props.classId !== undefined) return props.classId;
  if (props.playerClass !== undefined) return props.playerClass;
  return gameStore.state.playerClass;
});
const cls = computed(() => activeClassId.value ? (PLAYER_CLASSES as Record<string, PlayerClass>)[activeClassId.value] : null);

const borderColor = computed(() => {
  if (props.customBorder) return props.customBorder;
  return 'rgba(255, 255, 255, 0.25)';
});

const shadowColor = computed(() => {
  if (props.customBorder) return `${props.customBorder}44`;
  return 'rgba(255, 255, 255, 0.08)';
});

const avatarUrl = computed(() => {
  if (!cls.value) return null;
  const spriteId = cls.value.avatarSpriteId || cls.value.id;
  const resolvedGender = props.gender || gameStore.state.gender || 'h';
  return getAssetUrl(ASSET_TYPES.TRAINER, spriteId, { trainerSuffix: 'avatar', gender: resolvedGender });
});

const containerStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  minWidth: `${props.size}px`,
  minHeight: `${props.size}px`,
  borderColor: borderColor.value,
  boxShadow: `0 0 ${props.size / 4}px ${shadowColor.value}`,
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
  background-color: Rgba(30, 41, 59, 1);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  @include pixelated;
  
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
