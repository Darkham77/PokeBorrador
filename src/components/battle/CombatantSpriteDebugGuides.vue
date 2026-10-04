<script setup lang="ts">
defineProps<{
  showGuides: boolean
  naturalSize: { w: number; h: number }
  isAnimated: boolean
  displaySize: number
  debugShowPokeRadius: boolean
  fxRadius: number
}>()
</script>

<template>
  <!-- Guía de tamaño real (Debug) -->
  <div 
    v-if="showGuides && naturalSize.w > 0" 
    class="guide-real-size"
    :style="isAnimated ? {
      width: '100%',
      height: '100%'
    } : {
      width: naturalSize.w + 'px',
      height: naturalSize.h + 'px'
    }"
  >
    <span v-if="isAnimated">{{ Math.round(displaySize) }}x{{ Math.round(displaySize) }}</span>
    <span v-else>{{ naturalSize.w }}x{{ naturalSize.h }}</span>
  </div>

  <!-- Radio del Pokémon (Debug) — centrado DENTRO del wrapper del sprite -->
  <div
    v-if="debugShowPokeRadius"
    class="debug-poke-radius-sprite"
    :style="{
      width: (fxRadius * 2) + '%',
      height: (fxRadius * 2) + '%'
    }"
  >
    <span class="debug-poke-radius-label">POKE (Radius: {{ fxRadius.toFixed(1) }}%)</span>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.guide-real-size {
  position: absolute;
  top: 0;
  left: 0;
  z-index: var(--z-navigation);
  border: 1px dashed Rgb(255 100 0 / 70%);
  pointer-events: none;

  span {
    @include pixelated;

    position: absolute;
    right: 4px;
    bottom: 2px;
    padding: 1px 3px;
    background: Rgb(0 0 0 / 60%);
    color: Rgb(255 180 0 / 100%);
    font-size: 9px;
    transform: Scale(calc(1 / var(--camera-scale, 1)));
    transform-origin: bottom right;
  }
}

.debug-poke-radius-sprite {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: calc(var(--z-hud) - 1);
  display: flex;
  justify-content: center;
  align-items: center;
  border: 3px solid #0ff;
  border-radius: 50%;
  background: Rgb(0 255 255 / 15%);
  transform: Translate(-50%, -50%);
  pointer-events: none;

  .debug-poke-radius-label {
    position: absolute;
    top: -16px;
    left: 50%;
    z-index: var(--z-modal-step);
    padding: 2px 5px;
    border: 1px solid #0ff;
    border-radius: 3px;
    background: Rgb(0 0 0 / 90%);
    color: #0ff;
    font-family: monospace, sans-serif;
    font-size: 10px;
    font-weight: bold;
    line-height: 1.2;
    transform: Translatex(-50%) Scale(calc(1 / var(--camera-scale, 1)));
    transform-origin: center bottom;
    white-space: nowrap;
  }
}
</style>
