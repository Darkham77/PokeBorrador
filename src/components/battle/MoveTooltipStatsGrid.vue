<script setup lang="ts">
import { computed } from 'vue'
import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'
import MoveTooltipCombatStatBox from './MoveTooltipCombatStatBox.vue'
import MoveTooltipPowerAccuracyBox from './MoveTooltipPowerAccuracyBox.vue'
import {
  formatPowerDisplay,
  formatAccuracyDisplay,
  getArrowForClass,
  INFINITE_ACCURACY_VALUE
} from './moveTooltipStatsGridHelper.ts'

const props = defineProps<{
  activeDetails: ActiveMoveDetails
}>()

const powerData = computed(() => {
  const p = props.activeDetails.power
  if (props.activeDetails.isStatus || p.base === 0) return { isDash: true }
  return {
    isDash: false,
    text: formatPowerDisplay(p.base, p.final),
    arrow: getArrowForClass(p.class)
  }
})

const accuracyData = computed(() => {
  const a = props.activeDetails.accuracy
  if (a.base === INFINITE_ACCURACY_VALUE && a.final === INFINITE_ACCURACY_VALUE) return { isInfinity: true }
  return {
    isInfinity: false,
    text: formatAccuracyDisplay(a.base, a.final),
    arrow: getArrowForClass(a.class)
  }
})
</script>

<template>
  <div class="combat-stats-grid">
    <!-- Power Box -->
    <MoveTooltipPowerAccuracyBox
      label="POTENCIA"
      :css-class="activeDetails.power.class"
      :is-dash="powerData.isDash"
      :text="powerData.text"
      :arrow="powerData.arrow"
    />
    
    <!-- Accuracy Box -->
    <MoveTooltipPowerAccuracyBox
      label="PRECISIÓN"
      :css-class="activeDetails.accuracy.class"
      :is-infinity="accuracyData.isInfinity"
      :text="accuracyData.text"
      :arrow="accuracyData.arrow"
    />

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
    <MoveTooltipCombatStatBox
      v-if="activeDetails.attackerStat"
      :stat="activeDetails.attackerStat"
    />

    <!-- Defender Stat Box -->
    <MoveTooltipCombatStatBox
      v-if="activeDetails.defenderStat"
      :stat="activeDetails.defenderStat"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/components/_move-tooltip-shared.scss" as *;

.combat-stats-grid {
  @include combat-stats-grid-mixin;
}
</style>
