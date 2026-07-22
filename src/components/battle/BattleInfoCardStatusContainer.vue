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
