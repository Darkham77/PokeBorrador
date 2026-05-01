<script setup>
import { useVirtualPosition } from '@/composables/useVirtualPosition'

/**
 * VirtualEntity
 * Standard wrapper for any element that exists within the 3000x3000px virtual world.
 * Automatically handles coordinate mapping and scaling.
 */
const props = defineProps({
  x: { type: [Number, String], required: true },
  y: { type: [Number, String], required: true },
  w: { type: [Number, String], default: undefined },
  h: { type: [Number, String], default: undefined },
  zIndex: { type: [Number, String], default: undefined }
})

const { styles } = useVirtualPosition(
  () => props.x,
  () => props.y,
  () => props.w,
  () => props.h
)
</script>

<template>
  <div
    class="virtual-entity"
    :style="[styles, { zIndex }]"
  >
    <slot />
  </div>
</template>

<style scoped lang="scss">
.virtual-entity {
  pointer-events: none; // Default to pass-through, children can enable
  user-select: none;
  
  & > * {
    pointer-events: auto;
  }
}
</style>
