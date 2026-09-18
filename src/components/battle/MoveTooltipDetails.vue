<script setup lang="ts">
import { computed } from 'vue'
import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'
import type { PokemonMoveId } from '@/data/battle/moves'
import {
  resolveSpeedMatchup,
  resolveTacticalRows
} from './moveTooltipDetailsHelper.ts'

const props = defineProps<{
  activeDetails: ActiveMoveDetails
  moveId?: PokemonMoveId
}>()

const speedMatchup = computed(() => resolveSpeedMatchup(props.activeDetails.speedInfo))
const tacticalRows = computed(() => resolveTacticalRows(props.activeDetails.tacticalInfo, props.moveId))
</script>

<template>
  <div class="move-tooltip-details-extra">
    <!-- Speed Matchup Section -->
    <div
      v-if="speedMatchup"
      class="extra-effect-section speed-section"
    >
      <div class="calc-section-title">
        ORDEN DE TURNO
      </div>
      <div class="extra-effect-row">
        <span class="emoji">{{ speedMatchup.emoji }}</span>
        <span
          class="extra-effect-text"
          :class="speedMatchup.boosted ? 'boosted' : 'penalized'"
        >
          {{ speedMatchup.text }}
        </span>
        <span
          class="speed-values"
          style="color: rgba(255, 255, 255, 0.4); font-size: 6.5px; margin-left: 2px;"
        >
          ({{ speedMatchup.attackerSpeed }} vs {{ speedMatchup.defenderSpeed }} Vel)
        </span>
      </div>
    </div>

    <!-- Special Mechanics & Weights Section -->
    <div
      v-if="tacticalRows.length > 0"
      class="extra-effect-section mechanics-section"
    >
      <div class="calc-section-title">
        PROPIEDADES ESPECIALES
      </div>
      
      <div
        v-for="(row, idx) in tacticalRows"
        :key="idx"
        class="field-condition-row"
      >
        <span class="emoji">{{ row.emoji }}</span>
        <span
          class="field-condition-text"
          :class="{ penalized: row.penalized }"
        >{{ row.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/components/_move-tooltip-shared.scss" as *;

.move-tooltip-details-extra {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.calc-section-title {
  @include calc-section-title-mixin;
}

.extra-effect-section {
  @include extra-effect-section-mixin;
}

.speed-values {
  color: Rgba(255, 255, 255, 0.4);
  font-size: $tooltip-pct-range-size;
  margin-left: 2px;
}
</style>
