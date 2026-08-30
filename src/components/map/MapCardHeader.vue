<script setup lang="ts">
defineProps<{
  name: string
  desc: string
  isPerformanceMode: boolean
}>()
</script>

<template>
  <div
    v-if="!isPerformanceMode"
    class="location-header"
  >
    <div class="location-name">
      {{ name }}
    </div>
    <div class="location-desc">
      {{ desc }}
    </div>
  </div>
</template>

<style scoped lang="scss" src="./MapCard.styles.scss"></style>

