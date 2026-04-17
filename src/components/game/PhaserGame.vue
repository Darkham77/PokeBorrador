<script setup>
import { onMounted, onUnmounted, shallowRef } from 'vue';
import Phaser from 'phaser';
import { phaserConfig } from '@/phaser/config';
import { phaserBridge } from '@/logic/phaserBridge';

/**
 * PhaserGame.vue
 * The bridge component between Vue and the Phaser Engine.
 */

const gameInstance = shallowRef(null);
const containerRef = shallowRef(null);

onMounted(() => {
  // Merge config with the container element
  const config = {
    ...phaserConfig,
    parent: containerRef.value
  };

  // Initialize Phaser
  gameInstance.value = new Phaser.Game(config);
  
  // Register the instance in the global bridge for cross-communication
  phaserBridge.setGame(gameInstance.value);
  
  console.log('[PhaserGame] Instance initialized');
});

onUnmounted(() => {
  if (gameInstance.value) {
    gameInstance.value.destroy(true);
    gameInstance.value = null;
    phaserBridge.setGame(null);
    console.log('[PhaserGame] Instance destroyed');
  }
});

// Expose the instance if needed by parent components (rarely used, prefer bridge)
defineExpose({
  game: gameInstance
});
</script>

<template>
  <div
    id="phaser-container"
    ref="containerRef"
    class="phaser-container"
  />
</template>

<style scoped>
.phaser-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  /* Ensure the canvas doesn't have an unwanted border/background */
  background: transparent;
}

:deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
  object-fit: contain;
  image-rendering: pixelated;
}
</style>
