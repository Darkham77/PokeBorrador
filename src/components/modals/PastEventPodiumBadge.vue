<script setup lang="ts">
import { getRankMedal, getRankLabel } from './pastEventMetricFormatter'

defineProps<{
  rank?: string | number
}>()
</script>

<template>
  <div class="rank-badge">
    <span class="emoji medal">{{ getRankMedal(rank) }}</span>
    <span class="pos-text">{{ getRankLabel(rank) }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.rank-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 32px;
  justify-content: center;
  flex-shrink: 0;

  .medal {
    font-size: 14px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .pos-text {
    @include pixelated;
    font-size: 8px;
    color: var(--gray-light);
  }
}
</style>
