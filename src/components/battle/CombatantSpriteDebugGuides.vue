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
  border: 1px dashed Rgba(255, 100, 0, 0.7);
  pointer-events: none;
  z-index: var(--z-navigation);

  span {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 9px;
    color: Rgba(255, 180, 0, 1);
    background: Rgba(0, 0, 0, 0.6);
    padding: 1px 3px;
    @include pixelated;
    transform: Scale(calc(1 / var(--camera-scale, 1)));
    transform-origin: bottom right;
  }
}

.debug-poke-radius-sprite {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: Translate(-50%, -50%);
  border: 3px solid #00ffff;
  background: Rgba(0, 255, 255, 0.15);
  border-radius: 50%;
  pointer-events: none;
  z-index: calc(var(--z-hud) - 1);
  display: flex;
  align-items: center;
  justify-content: center;

  .debug-poke-radius-label {
    position: absolute;
    top: -16px;
    left: 50%;
    transform: Translatex(-50%) Scale(calc(1 / var(--camera-scale, 1)));
    transform-origin: center bottom;
    background: Rgba(0, 0, 0, 0.9);
    color: #00ffff;
    font-family: monospace, sans-serif;
    font-size: 10px;
    line-height: 1.2;
    font-weight: bold;
    padding: 2px 5px;
    border-radius: 3px;
    white-space: nowrap;
    border: 1px solid #00ffff;
    z-index: var(--z-modal-step);
  }
}
</style>
