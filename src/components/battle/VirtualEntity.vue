<script setup lang="ts">
import { useVirtualPosition } from '@/composables/ui/useVirtualPosition'

/**
 * VirtualEntity
 * Standard wrapper for any element that exists within the 3000x3000px virtual world.
 * Automatically handles coordinate mapping and scaling.
 */
interface Props {
  x: number | string
  y: number | string
  w?: number | string
  h?: number | string
  zIndex?: number | string
}

const props = defineProps<Props>()

const { styles } = useVirtualPosition(
  () => Number(props.x),
  () => Number(props.y),
  () => props.w !== undefined ? Number(props.w) : undefined,
  () => props.h !== undefined ? Number(props.h) : undefined
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
@use "@/styles/core/tools" as *;

.virtual-entity {
  pointer-events: none; // Default to pass-through, children can enable
  user-select: none;
  @include pixelated;
  
  & > * {
    pointer-events: auto;
  }
}
</style>
