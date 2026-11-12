<script setup lang="ts">
import type { DisplayText } from '@francogp/auditor';
import { ref } from 'vue';

withDefaults(
  defineProps<{
    show?: boolean;
    isClosing?: boolean;
    overlayClasses?: Record<DisplayText, boolean> | string[];
  }>(),
  {
    show: false,
    isClosing: false,
    overlayClasses: () => ({})
  }
);

const emit = defineEmits<{
  pointerdown: [event: PointerEvent];
  pointerup: [event: PointerEvent];
  pointercancel: [];
}>();

const backdropEl = ref<HTMLElement | null>(null);

defineExpose({
  backdropEl
});
</script>

<template>
  <div
    v-if="show"
    id="base-modal-overlay-div-1"
    ref="backdropEl"
    tabindex="-1"
    aria-hidden="true"
    class="modal-overlay"
    :class="[overlayClasses, { 'is-closing': isClosing }]"
    @click.stop
    @pointerdown="emit('pointerdown', $event)"
    @pointerup="emit('pointerup', $event)"
    @pointercancel="emit('pointercancel')"
  />
</template>

<style lang="scss">
@use '@/styles/components/base-modal' as *;
</style>
