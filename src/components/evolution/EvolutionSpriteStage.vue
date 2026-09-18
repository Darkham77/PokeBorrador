<script setup lang="ts">
import { computed } from 'vue';
import type { EvolutionStep } from './evolutionTypes';

const props = withDefaults(defineProps<{
  step: EvolutionStep;
  currentShowingSprite: 'from' | 'to';
  fromSprite: string;
  toSprite: string;
  oldName?: string;
  newName?: string;
  flashesDone?: number;
}>(), {
  oldName: '',
  newName: '',
  flashesDone: 0
});

const isFlashing = computed(() => props.step === 'flashing');
const isFlashOn = computed(() => props.flashesDone % 2 !== 0);

const isShowingFrom = computed(() => props.currentShowingSprite === 'from' || props.step === 'cancelled');
const isShowingTo = computed(() => props.currentShowingSprite === 'to' && props.step !== 'cancelled');

const resolvedFromAlt = computed(() => props.oldName || 'Pokémon pre-evolución');
const resolvedToAlt = computed(() => props.newName || 'Pokémon evolución');

const onImageError = (e: Event) => {
  const target = e.target as HTMLImageElement | null;
  if (target) target.style.display = 'none';
};
</script>

<template>
  <div class="sprite-stage">
    <div
      class="glow-bg"
      :class="step"
    />
    
    <img 
      v-if="isShowingFrom"
      :src="fromSprite"
      :alt="resolvedFromAlt"
      class="pokemon-sprite from" 
      :class="{ flashing: isFlashing, 'flash-on': isFlashOn }" 
      @error="onImageError"
    >

    <img 
      v-if="isShowingTo"
      :src="toSprite"
      :alt="resolvedToAlt"
      class="pokemon-sprite to" 
      :class="{ 'scale-in': step === 'transformed', flashing: isFlashing, 'flash-on': isFlashOn }"
      @error="onImageError"
    >
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/_evolution-scene.scss" as *;
</style>
