<script setup lang="ts">
import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'
import {
  formatPowerDisplay,
  formatAccuracyDisplay,
  formatStatValueDisplay,
  getArrowForClass,
  getArrowForStage
} from './moveTooltipStatsGridHelper.ts'

defineProps<{
  activeDetails: ActiveMoveDetails
}>()
</script>

<template>
  <div class="combat-stats-grid">
    <!-- Power Box -->
    <div class="stat-box">
      <span class="stat-lbl">POTENCIA</span>
      <span
        class="stat-val"
        :class="activeDetails.power.class"
      >
        <span
          v-if="activeDetails.isStatus || activeDetails.power.base === 0"
          class="dash-val"
        >-</span>
        <template v-else>
          {{ formatPowerDisplay(activeDetails.power.base, activeDetails.power.final) }}
          <span
            v-if="getArrowForClass(activeDetails.power.class).show"
            class="arrow"
            :class="getArrowForClass(activeDetails.power.class).isUp ? 'up' : 'down'"
          >{{ getArrowForClass(activeDetails.power.class).isUp ? '▲' : '▼' }}</span>
        </template>
      </span>
    </div>
    
    <!-- Accuracy Box -->
    <div class="stat-box">
      <span class="stat-lbl">PRECISIÓN</span>
      <span
        class="stat-val"
        :class="activeDetails.accuracy.class"
      >
        <span
          v-if="activeDetails.accuracy.base === 1000 && activeDetails.accuracy.final === 1000"
          class="infinity-val"
        >♾️</span>
        <template v-else>
          {{ formatAccuracyDisplay(activeDetails.accuracy.base, activeDetails.accuracy.final) }}
          <span
            v-if="getArrowForClass(activeDetails.accuracy.class).show"
            class="arrow"
            :class="getArrowForClass(activeDetails.accuracy.class).isUp ? 'up' : 'down'"
          >{{ getArrowForClass(activeDetails.accuracy.class).isUp ? '▲' : '▼' }}</span>
        </template>
      </span>
    </div>

    <!-- Effectiveness Box -->
    <div
      v-if="!activeDetails.isStatus"
      class="stat-box"
    >
      <span class="stat-lbl">EF. CONTRA RIVAL</span>
      <span
        v-if="activeDetails.effectiveness !== null"
        class="stat-val"
        :class="activeDetails.effectiveness.class"
      >
        x{{ activeDetails.effectiveness.value }}
      </span>
      <span
        v-else
        class="stat-val"
      ><span class="dash-val">-</span></span>
    </div>

    <!-- Critical Box -->
    <div
      v-if="!activeDetails.isStatus"
      class="stat-box"
    >
      <span class="stat-lbl">PROB. CRÍTICO</span>
      <span
        class="stat-val"
        :class="activeDetails.critChance.class"
      >
        {{ activeDetails.critChance.value }}%
      </span>
    </div>

    <!-- Attacker Stat Box -->
    <div
      v-if="activeDetails.attackerStat"
      class="stat-box"
    >
      <span class="stat-lbl">{{ activeDetails.attackerStat.name }}</span>
      <span
        class="stat-val"
        :class="activeDetails.attackerStat.class"
      >
        {{ formatStatValueDisplay(activeDetails.attackerStat.base, activeDetails.attackerStat.final) }}
        <span
          v-if="getArrowForStage(activeDetails.attackerStat.stage).show"
          class="arrow"
          :class="getArrowForStage(activeDetails.attackerStat.stage).isUp ? 'up' : 'down'"
        >{{ getArrowForStage(activeDetails.attackerStat.stage).isUp ? '▲' : '▼' }}</span>
      </span>
    </div>

    <!-- Defender Stat Box -->
    <div
      v-if="activeDetails.defenderStat"
      class="stat-box"
    >
      <span class="stat-lbl">{{ activeDetails.defenderStat.name }}</span>
      <span
        class="stat-val"
        :class="activeDetails.defenderStat.class"
      >
        {{ formatStatValueDisplay(activeDetails.defenderStat.base, activeDetails.defenderStat.final) }}
        <span
          v-if="getArrowForStage(activeDetails.defenderStat.stage).show"
          class="arrow"
          :class="getArrowForStage(activeDetails.defenderStat.stage).isUp ? 'up' : 'down'"
        >{{ getArrowForStage(activeDetails.defenderStat.stage).isUp ? '▲' : '▼' }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/components/_move-tooltip-shared.scss" as *;

.combat-stats-grid {
  @include combat-stats-grid-mixin;
}

.arrow {
  @include arrow-mixin;
}
</style>
