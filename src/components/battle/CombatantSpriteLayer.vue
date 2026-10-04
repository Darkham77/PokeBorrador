<script setup lang="ts">
import CombatantSpriteAnimated from './CombatantSpriteAnimated.vue'
import CombatantSpriteDebugGuides from './CombatantSpriteDebugGuides.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { AnimatedSpriteData } from '@/data/pokemon/animatedSpriteDatabase'
import type { CombatantSpriteMode } from '@/types/battle/battle'

interface Props {
  pokemon: Pokemon | null
  isAnimated: boolean
  isSilhouette: boolean
  currentMode: CombatantSpriteMode
  idleImageUrl: string
  variationImageUrl: string
  imageUrl: string
  frames: number
  variationMeta: AnimatedSpriteData | null
  showGuides: boolean
  naturalSize: { w: number; h: number }
  displaySize: number
  debugShowPokeRadius: boolean
  fxRadius: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'load', event: Event): void
  (e: 'error', event: Event): void
}>()
</script>

<template>
  <div class="pokemon-atmosphere-wrapper">
    <!-- Wrapper para estados alterados y auras (recibe filtros en PVSpriteFX) con overflow visible -->
    <div class="pokemon-sprite-status-wrapper">
      <!-- Contenedor con overflow hidden que recorta exactamente un solo frame del spritesheet -->
      <div 
        v-if="props.isAnimated"
        class="pokemon-combat-image-wrapper"
      >
        <CombatantSpriteAnimated
          :pokemon="props.pokemon"
          :is-silhouette="props.isSilhouette"
          :current-mode="props.currentMode"
          :idle-image-url="props.idleImageUrl"
          :variation-image-url="props.variationImageUrl"
          :frames="props.frames"
          :variation-meta="props.variationMeta"
          @load="emit('load', $event)"
          @error="emit('error', $event)"
        />
      </div>

      <!-- Sprite estático: img directamente -->
      <img
        v-else
        class="pokemon-combat-image"
        :class="{ 'is-silhouette': props.isSilhouette }"
        :src="props.imageUrl"
        :alt="props.pokemon?.name || 'Pokémon en combate'"
        :style="{ filter: props.isSilhouette ? undefined : 'var(--atmosphere-filter)' }"
        @load="emit('load', $event)"
        @error="emit('error', $event)"
      >
    </div>

    <!-- Guías de Depuración y Tamaño Real -->
    <CombatantSpriteDebugGuides
      :show-guides="props.showGuides"
      :natural-size="props.naturalSize"
      :is-animated="props.isAnimated"
      :display-size="props.displaySize"
      :debug-show-poke-radius="props.debugShowPokeRadius"
      :fx-radius="props.fxRadius"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.pokemon-atmosphere-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.pokemon-sprite-status-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.pokemon-combat-image-wrapper {
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden !important;
}

.pokemon-combat-image {
  @include sprite-render;

  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  image-rendering: -webkit-optimize-contrast !important;
  image-rendering: pixelated !important;
  -ms-interpolation-mode: nearest-neighbor !important;

  &.is-silhouette { 
    @include pokemon-silhouette;
  }

  #{"image-rendering"}: crisp-edges !important;
}
</style>
