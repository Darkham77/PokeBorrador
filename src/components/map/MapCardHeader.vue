<script setup lang="ts">
defineProps<{
  name: string
  desc: string
  isFastMode?: boolean
  isPerformanceMode?: boolean
}>()
</script>

<template>
  <div
    v-if="!(isFastMode ?? isPerformanceMode)"
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

