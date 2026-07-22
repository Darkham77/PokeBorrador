<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue'
import BattleInfoStats from './BattleInfoStats.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'

/* eslint-disable @typescript-eslint/no-explicit-any */
defineProps<{
  unifiedStatuses: any[]
  showStatsTable: boolean
  adminStatConfig: any[]
  getStatModifier: (key: string) => number
  getBreakdown: (key: string) => any
  pokemon?: Pokemon | null
}>()
/* eslint-enable @typescript-eslint/no-explicit-any */
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
        {{ status.emoji }}<span 
          v-if="status.stageValue !== undefined" 
          class="stage-arrow"
          :class="status.stageValue > 0 ? 'up' : 'down'"
        >{{ status.stageValue > 0 ? '▲' : '▼' }}{{ Math.abs(status.stageValue) }}</span>
        <span
          v-if="status.count"
          class="status-counter"
        >
          {{ status.count }}t
        </span>
      </div>

      <template
        v-if="status.isAdminOnly || (showStatsTable && status.emoji !== '🎒')"
        #content
      >
        <div class="status-pro-tooltip">
          <div 
            v-if="status.isAdminOnly"
            class="admin-only-disclaimer"
          >
            ⚠️ esto es visible solo para administradores
          </div>
          
          <template v-if="showStatsTable && status.emoji !== '🎒'">
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
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  position: relative;

  @media (max-width: 600px) {
    gap: 4px;
    margin-top: 6px;
  }
}

.status-pro-tooltip {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-only-disclaimer {
  @include pixelated;
  font-size: 7px;
  color: #ffd60a;
  background: Rgba(255, 214, 10, 0.15);
  border: 1px dashed Rgba(255, 214, 10, 0.4);
  padding: 4px;
  border-radius: 4px;
  text-align: center;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.tooltip-divider {
  height: 1px;
  background: Rgba(255, 255, 255, 0.1);
  margin: 4px 0;
}
</style>
