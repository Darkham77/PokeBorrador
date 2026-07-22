<script setup lang="ts">
import gsap from 'gsap'

defineProps<{
  isGlobalFadeActive: boolean
}>()

function onEnter(el: Element, done: () => void) {
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out', onComplete: done })
}

function onLeave(el: Element, done: () => void) {
  gsap.to(el, { opacity: 0, duration: 0.4, ease: 'power1.out', onComplete: done })
}
</script>

<template>
  <Transition
    :css="false"
    @enter="onEnter"
    @leave="onLeave"
  >
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
  z-index: calc(var(--z-overlay) - 1);
  pointer-events: none;
}
</style>
