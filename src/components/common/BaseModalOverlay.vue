<script setup lang="ts">
import { gsap } from 'gsap';
import { ANIM_TIMINGS } from '@/logic/utils/animationRegistry';

withDefaults(
  defineProps<{
    show?: boolean;
    overlayClasses?: Record<string, boolean> | string[]; // open-record: Dynamic CSS class boolean flags
  }>(),
  {
    show: false,
    overlayClasses: () => ({})
  }
);

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const onOverlayEnter = (el: Element, done: () => void) => {
  gsap.fromTo(
    el,
    { opacity: 0 },
    { opacity: 1, duration: ANIM_TIMINGS.MODAL_OPEN, ease: 'none', onComplete: done }
  );
};

const onOverlayLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, duration: ANIM_TIMINGS.MODAL_CLOSE, ease: 'none', onComplete: done });
};
</script>

<template>
  <Transition appear :css="false" @enter="onOverlayEnter" @leave="onOverlayLeave">
    <div
      v-if="show"
      id="base-modal-overlay-div-1"
      tabindex="-1"
      aria-hidden="true"
      class="modal-overlay"
      :class="overlayClasses"
      @click.stop="emit('click')"
    />
  </Transition>
</template>

<style lang="scss">
@use '@/styles/components/base-modal' as *;
</style>
