<script setup lang="ts">
/**
 * src/components/admin/debug/DebugTimeTab.vue
 * 
 * Simple wrapper for TimeDebugControls in the Admin Panel.
 */
import TimeDebugControls from './shared/TimeDebugControls.vue'
</script>

<template>
  <div class="debug-grid">
    <TimeDebugControls />
  </div>
</template>

<style scoped lang="scss">
// Inherits layout styles from debug.scss via TimeDebugControls
</style>
