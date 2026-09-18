<script setup lang="ts">
import { computed } from 'vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { AnimatedSpriteData } from '@/data/pokemon/animatedSpriteDatabase'
import type { CombatantSpriteMode } from '@/types/battle/battle'

const PERCENT_MULTIPLIER = 100

const props = defineProps<{
  pokemon: Pokemon | null
  isSilhouette: boolean
  currentMode: CombatantSpriteMode
  idleImageUrl: string
  variationImageUrl: string
  frames: number
  variationMeta: AnimatedSpriteData | null
}>()

const emit = defineEmits<{
  (e: 'load', event: Event): void
  (e: 'error', event: Event): void
}>()

const filterStyle = computed(() => (props.isSilhouette ? undefined : 'var(--atmosphere-filter)'))

const idleStyle = computed(() => ({
  filter: filterStyle.value,
  width: `${props.frames * PERCENT_MULTIPLIER}%`
}))

const variationStyle = computed(() => ({
  filter: filterStyle.value,
  width: `${(props.variationMeta?.frames || 1) * PERCENT_MULTIPLIER}%`
}))
</script>

<template>
  <!-- Imagen IDLE (i) -->
  <img
    class="pokemon-combat-image pokemon-image-idle"
    :class="{ 
      'is-silhouette': props.isSilhouette,
      'active-mode': props.currentMode === 'idle'
    }"
    :src="props.idleImageUrl"
    :alt="props.pokemon?.name || 'Pokémon en combate'"
    :style="idleStyle"
    @load="emit('load', $event)"
    @error="emit('error', $event)"
  >

  <!-- Imagen VARIACIÓN (v) -->
  <img
    v-if="props.variationMeta && props.variationMeta.frames > 1"
    class="pokemon-combat-image pokemon-image-variation"
    :class="{ 
      'is-silhouette': props.isSilhouette,
      'active-mode': props.currentMode === 'variation'
    }"
    :src="props.variationImageUrl"
    :alt="props.pokemon?.name || 'Pokémon en combate'"
    :style="variationStyle"
    @load="emit('load', $event)"
    @error="emit('error', $event)"
  >
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.pokemon-combat-image {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  max-width: none;
  object-fit: fill;
  object-position: left center;
  flex-shrink: 0;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;

  image-rendering: -webkit-optimize-contrast !important;
  #{"image-rendering"}: crisp-edges !important;
  image-rendering: pixelated !important;
  -ms-interpolation-mode: nearest-neighbor !important;
  @include sprite-render;

  &.is-silhouette { 
    @include pokemon-silhouette;
  }

  &.active-mode {
    opacity: 1;
    pointer-events: auto;
    visibility: visible;
  }
}
</style>
