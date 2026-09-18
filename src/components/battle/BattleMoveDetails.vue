<script setup lang="ts">
import type { Move } from '@/types/pokemon/pokemon'
import BattleMoveStatItem from './BattleMoveStatItem.vue'
import BattleMoveCategoryItem from './BattleMoveCategoryItem.vue'

interface Props {
  move: Move
  moveData: Move | null
  finalPower: number
  finalAccuracy: number
}

defineProps<Props>()
</script>

<template>
  <div class="move-details-row">
    <BattleMoveStatItem
      label="POT:"
      :value="finalPower"
      :base-value="moveData?.power || 0"
    />
    <BattleMoveStatItem
      label="PREC:"
      :value="finalAccuracy"
      :base-value="moveData?.acc || 0"
      :is-infinite="moveData?.acc === 1000"
    />
    <BattleMoveCategoryItem
      :move="move"
      :move-data="moveData"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/tokens/colors" as *;
@use "@/styles/components/_move-detail-item.scss" as *;

.move-details-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  width: 100%;
  margin-top: auto;
  border-top: 1px solid Rgba(255, 255, 255, 0.08);
  padding-top: 6px;
}
</style>
