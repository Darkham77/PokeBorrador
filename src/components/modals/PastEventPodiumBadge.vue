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
  justify-content: center;
  align-items: center;
  gap: 3px;
  min-width: 32px;
  flex-shrink: 0;

  .medal {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    line-height: 1;
  }

  .pos-text {
    @include pixelated;

    color: var(--gray-light);
    font-size: 8px;
  }
}
</style>
