<script setup lang="ts">
/**
 * src/components/map/MapCardLockOverlay.vue
 *
 * Renders the locked overlay and reason label for locked or safari-restricted routes.
 */

withDefaults(defineProps<{
  isLocked?: boolean
  lockReason?: string
}>(), {
  isLocked: false,
  lockReason: ''
})
</script>

<template>
  <div
    v-if="isLocked"
    class="lock-overlay"
  >
    <span class="lock-text">{{ lockReason }}</span>
  </div>
</template>

<style scoped src="./MapCard.styles.scss" lang="scss"></style>
