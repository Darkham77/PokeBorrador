<script setup lang="ts">
/**
 * src/components/breeding/HatchEggCrackStage.vue
 *
 * Interactive egg stage and glowing ring visualization for hatching scene.
 */
import EggSprite from '@/components/common/EggSprite.vue';

interface Props {
  tint?: string;
}

defineProps<Props>();
</script>

<template>
  <div class="egg-stage-wrapper">
    <div class="egg-sprite">
      <EggSprite
        size="120"
        :tint="tint"
      />
    </div>
    <div class="glow-ring" />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/hatch-animation-modal";
</style>
