<script setup lang="ts">
import { useBattleStore } from '@/stores/battle'

const battleStore = useBattleStore()

const zoomIn = () => {
  const current = battleStore.debugZoom
  if (current < 1.0) {
    const nextZoom = Math.min(1.0, Math.round((current + 0.1) * 10) / 10)
    battleStore.debugZoom = nextZoom
  }
}

const zoomOut = () => {
  const current = battleStore.debugZoom
  if (current > 0.5) {
    const nextZoom = Math.max(0.5, Math.round((current - 0.1) * 10) / 10)
    battleStore.debugZoom = nextZoom
  }
}
</script>

<template>
  <div class="camera-zoom-controls">
    <button
      class="zoom-btn"
      :disabled="battleStore.debugZoom >= 1.0"
      @click.stop="zoomIn"
    >
      +
    </button>
    <button
      class="zoom-btn"
      :disabled="battleStore.debugZoom <= 0.5"
      @click.stop="zoomOut"
    >
      -
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.camera-zoom-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
  z-index: calc(var(--z-base) + 40);
  pointer-events: auto;
  @include pixelated;
}

.zoom-btn {
  @include btn-vicio('neutral', 'sm');
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  font-size: 10px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
</style>
