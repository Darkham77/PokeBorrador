<script setup lang="ts">
import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'
import {
  formatStatValueDisplay,
  getArrowForStage
} from './moveTooltipStatsGridHelper.ts'

type CombatStat = NonNullable<ActiveMoveDetails['attackerStat']>

defineProps<{
  stat: CombatStat
}>()
</script>

<template>
  <div class="stat-box">
    <span class="stat-lbl">{{ stat.name }}</span>
    <span
      class="stat-val"
      :class="stat.class"
    >
      {{ formatStatValueDisplay(stat.base, stat.final) }}
      <span
        v-if="getArrowForStage(stat.stage).show"
        class="emoji arrow"
        :class="getArrowForStage(stat.stage).isUp ? 'up' : 'down'"
      >{{ getArrowForStage(stat.stage).isUp ? '▲' : '▼' }}</span>
    </span>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/components/_move-tooltip-shared.scss" as *;

.arrow {
  @include arrow-mixin;
}
</style>
