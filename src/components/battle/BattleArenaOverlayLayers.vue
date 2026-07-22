<script setup lang="ts">
defineProps<{
  isGlobalFadeActive: boolean
}>()
</script>

<template>
  <Transition name="fade-overlay">
    <div
      v-if="isGlobalFadeActive"
      class="global-transition-overlay"
    />
  </Transition>
</template>

<style scoped lang="scss">
.global-transition-overlay {
  position: absolute;
  inset: 0;
  background: #000;
  z-index: 9999;
  pointer-events: none;
}
.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.4s ease;
}
.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}
</style>
