<script setup lang="ts">
import type { MoveTooltipDetailsInfo } from '@/types/battle/tooltip'

defineProps<{
  activeDetails: MoveTooltipDetailsInfo
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
        <template v-if="activeDetails.power.base === activeDetails.power.final || activeDetails.power.final === '-'">
          {{ activeDetails.power.final }}
        </template>
        <template v-else>
          {{ activeDetails.power.base }} ➔ {{ activeDetails.power.final }}
          <span
            v-if="activeDetails.power.class === 'boosted'"
            class="arrow up"
          >▲</span>
          <span
            v-if="activeDetails.power.class === 'penalized'"
            class="arrow down"
          >▼</span>
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
        <template v-if="activeDetails.accuracy.base === activeDetails.accuracy.final">
          {{ activeDetails.accuracy.base === 1000 ? '♾️' : activeDetails.accuracy.base + '%' }}
        </template>
        <template v-else>
          {{ activeDetails.accuracy.base === 1000 ? '♾️' : activeDetails.accuracy.base + '%' }} ➔ 
          {{ activeDetails.accuracy.final === 1000 ? '♾️' : activeDetails.accuracy.final + '%' }}
          <span
            v-if="activeDetails.accuracy.class === 'boosted'"
            class="arrow up"
          >▲</span>
          <span
            v-if="activeDetails.accuracy.class === 'penalized'"
            class="arrow down"
          >▼</span>
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
      >-</span>
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
        <template v-if="activeDetails.attackerStat.base === activeDetails.attackerStat.final">
          {{ activeDetails.attackerStat.base }}
        </template>
        <template v-else>
          {{ activeDetails.attackerStat.base }} ➔ {{ activeDetails.attackerStat.final }}
          <span
            v-if="activeDetails.attackerStat.stage > 0"
            class="arrow up"
          >▲</span>
          <span
            v-if="activeDetails.attackerStat.stage < 0"
            class="arrow down"
          >▼</span>
        </template>
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
        <template v-if="activeDetails.defenderStat.base === activeDetails.defenderStat.final">
          {{ activeDetails.defenderStat.base }}
        </template>
        <template v-else>
          {{ activeDetails.defenderStat.base }} ➔ {{ activeDetails.defenderStat.final }}
          <span
            v-if="activeDetails.defenderStat.stage > 0"
            class="arrow up"
          >▲</span>
          <span
            v-if="activeDetails.defenderStat.stage < 0"
            class="arrow down"
          >▼</span>
        </template>
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
  display: inline-flex;
  align-items: center;
  font-size: 8px;
  margin-right: 1px;
  
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
