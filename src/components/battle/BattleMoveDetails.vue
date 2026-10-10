<script setup lang="ts">
import { computed } from 'vue'
import type { Move } from '@/types/pokemon/pokemon'
import { ACCURACY_INFINITE_SENTINEL } from '@/logic/constants/gameplay'
import BattleMoveStatItem from './BattleMoveStatItem.vue'
import BattleMoveCategoryItem from './BattleMoveCategoryItem.vue'

interface Props {
  move: Move
  moveData: Move | null
  finalPower: number
  finalAccuracy: number
}

const props = defineProps<Props>()

const isInfiniteAccuracy = computed(() => props.moveData?.acc === ACCURACY_INFINITE_SENTINEL)
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
      :is-infinite="isInfiniteAccuracy"
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
  border-top: 1px solid Rgb(255 255 255 / 8%);
  padding-top: 6px;
}
</style>
