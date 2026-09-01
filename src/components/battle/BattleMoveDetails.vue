<script setup lang="ts">
import type { Move } from '@/types/pokemon/pokemon'
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
    <div class="detail-item">
      <span class="d-label pixelated">POT:</span>
      <span 
        class="d-val pixelated"
        :class="{
          'stat-boosted': moveData && finalPower > (moveData.power || 0),
          'stat-penalized': moveData && finalPower < (moveData.power || 0)
        }"
      >
        {{ finalPower || '-' }}
        <span
          v-if="moveData && finalPower > (moveData.power || 0)"
          class="emoji arrow up"
        >▲</span>
        <span
          v-if="moveData && finalPower < (moveData.power || 0)"
          class="emoji arrow down"
        >▼</span>
      </span>
    </div>
    <div class="detail-item">
      <span class="d-label pixelated">PREC:</span>
      <span 
        class="d-val pixelated"
        :class="{
          'stat-boosted': moveData && moveData.acc !== 1000 && finalAccuracy > (moveData.acc || 0),
          'stat-penalized': moveData && moveData.acc !== 1000 && finalAccuracy < (moveData.acc || 0)
        }"
      >
        <span
          v-if="moveData && moveData.acc === 1000"
          class="emoji"
        >♾️</span>
        <template v-else>
          {{ finalAccuracy || '-' }}
          <span
            v-if="moveData && finalAccuracy > (moveData.acc || 0)"
            class="emoji arrow up"
          >▲</span>
          <span
            v-if="moveData && finalAccuracy < (moveData.acc || 0)"
            class="emoji arrow down"
          >▼</span>
        </template>
      </span>
    </div>
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
  
  .detail-item {
    @include move-detail-item;
  }
}

.stat-boosted {
  color: #10B981 !important;
  text-shadow: 0 0 2px Rgba(16, 185, 129, 0.4);
}

.stat-penalized {
  color: #EF4444 !important;
  text-shadow: 0 0 2px Rgba(239, 68, 68, 0.4);
}

.arrow {
  display: inline-block;
  font-size: 7px;
  margin-left: 1px;
  vertical-align: middle;
  line-height: 1;

  &.up {
    color: #10B981;
    text-shadow: 0 0 2px Rgba(16, 185, 129, 0.4);
  }
  &.down {
    color: #EF4444;
    text-shadow: 0 0 2px Rgba(239, 68, 68, 0.4);
  }
}
</style>
