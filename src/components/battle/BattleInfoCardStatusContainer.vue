<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue'
import BattleInfoStats from './BattleInfoStats.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'

import type { UnifiedStatusItem, AdminStatConfigItem } from '@/types/battle/status'

defineProps<{
  unifiedStatuses: UnifiedStatusItem[]
  showStatsTable: boolean
  adminStatConfig: AdminStatConfigItem[]
  getStatModifier: (key: string) => number
  getBreakdown: (key: string) => { base: number; final: number }
  pokemon?: Pokemon | null
}>()

function shouldShowTooltipContent(status: UnifiedStatusItem, showStatsTable: boolean): boolean {
  return Boolean(status.isAdminOnly || (showStatsTable && status.emoji !== '🎒'))
}

function shouldShowStatsTable(status: UnifiedStatusItem, showStatsTable: boolean): boolean {
  return Boolean(showStatsTable && status.emoji !== '🎒')
}
</script>

<template>
  <div class="status-container">
    <PVTooltip
      v-for="status in unifiedStatuses"
      :key="status.id"
      :title="status.title"
      :description="status.description"
      position="bottom"
    >
      <div
        class="m-status-tag"
        :class="[status.class, { 'is-boosted': status.isBoosted }]"
      >
        <span class="emoji">{{ status.emoji }}</span>
        <span 
          v-if="status.stageValue !== undefined" 
          class="stage-arrow"
          :class="status.stageValue > 0 ? 'up' : 'down'"
        ><span class="stage-glyph emoji">{{ status.stageValue > 0 ? '▲' : '▼' }}</span><span class="stage-num">{{ Math.abs(status.stageValue) }}</span></span>
        <span
          v-if="status.count"
          class="status-counter"
        >
          {{ status.count }}t
        </span>
      </div>

      <template
        v-if="shouldShowTooltipContent(status, showStatsTable)"
        #content
      >
        <div class="status-pro-tooltip">
          <div 
            v-if="status.isAdminOnly"
            class="admin-only-disclaimer"
          >
            <span class="emoji">⚠️</span> esto es visible solo para administradores
          </div>

          <template v-if="shouldShowStatsTable(status, showStatsTable)">
            <div class="tooltip-divider" />
            <BattleInfoStats
              :admin-stat-config="adminStatConfig"
              :get-stat-modifier="getStatModifier"
              :get-breakdown="getBreakdown"
              :pokemon="pokemon"
            />
          </template>
        </div>
      </template>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.status-container {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  width: 100%;
  min-height: 20px;
  margin-top: 4px;
  clear: both;

  @media (width <= 600px) {
    gap: 2px;
    min-height: 16px;
    margin-top: 3px;
  }
}

.status-pro-tooltip {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-only-disclaimer {
  @include pixelated;

  padding: 4px;
  border: 1px dashed rgb(255 214 10 / 40%);
  border-radius: 4px;
  background: rgb(255 214 10 / 15%);
  color: #ffd60a;
  font-size: 7px;
  text-align: center;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.tooltip-divider {
  height: 1px;
  margin: 4px 0;
  background: rgb(255 255 255 / 10%);
}
</style>
