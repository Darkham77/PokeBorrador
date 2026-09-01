<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">
import { useMoveTooltip } from '@/composables/battle/useMoveTooltip'
import MoveTooltipDamage from './MoveTooltipDamage.vue'
import MoveTooltipStatus from './MoveTooltipStatus.vue'
import MoveTooltipStatsGrid from './MoveTooltipStatsGrid.vue'
import MoveTooltipDetails from './MoveTooltipDetails.vue'
import MoveTooltipTactical from './MoveTooltipTactical.vue'
import MoveTooltipModifiers from './MoveTooltipModifiers.vue'
import MoveTooltipFieldEffects from './MoveTooltipFieldEffects.vue'
import { useBattleStore } from '@/stores/battle/battle'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

interface Props {
  move: Move
  playerInfo?: Pokemon | null
}

const props = defineProps<Props>()

const battleStore = useBattleStore()

const {
  activeDetails,
  parsedStatusEffect,
  moveDescriptionText
} = useMoveTooltip(() => props.move, () => props.playerInfo)

</script>


<template>
  <div class="move-tooltip-rich">
    <div class="move-desc">
      {{ moveDescriptionText }}
    </div>

    <!-- Advanced Combat Calculations Dashboard -->
    <div
      v-if="battleStore.isBattleActive && activeDetails"
      class="move-details-calc"
    >
      <div class="calc-section-title">
        ESTADÍSTICAS EN COMBATE
      </div>
      <!-- Premium Grid Layout for Stats -->
      <MoveTooltipStatsGrid :active-details="activeDetails" />

      <!-- Speed & Special Mechanics Section -->
      <MoveTooltipDetails
        :active-details="activeDetails"
        :move-id="props.move.id"
      />

      <!-- Tactical Modifiers Section (Assault Vest, Eviolite, Leech Seed, Foresight, Tera) -->
      <MoveTooltipTactical :active-details="activeDetails" />

      <!-- Status Effect Details -->
      <MoveTooltipStatus
        v-if="activeDetails.isStatus && parsedStatusEffect"
        :parsed-status-effect="parsedStatusEffect"
      />

      <!-- Active Modifiers & Formula Breakdown Section -->
      <MoveTooltipModifiers :active-details="activeDetails" />

      <!-- Estimated Damage Section -->
      <MoveTooltipDamage :active-details="activeDetails" />

      <!-- Field Conditions & Effects Section (Recovery, Recoil, Field, Smogon) -->
      <MoveTooltipFieldEffects :active-details="activeDetails" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/components/_move-tooltip-shared.scss" as *;

.move-tooltip-rich {
  @include pixelated;
  font-size: 9px;
  line-height: 1.5;
  color: Rgba(255, 255, 255, 0.95);
  max-width: 260px;
  min-width: 220px;
  padding: 2px;
}

.move-desc {
  word-break: break-word;
}

.move-modifier {
  @include pixelated;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid Rgba(255, 255, 255, 0.15);
  font-size: $tooltip-stat-val-size;
  
  &.boosted { color: var(--yellow); }
  &.penalized { color: $red; }
}

.move-details-calc {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed Rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.calc-section-title {
  @include calc-section-title-mixin;
}

.modifiers-section {
  background: Rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  padding: 4px 6px;
  border: 1px dotted Rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 2px;
}

.breakdown-item {
  font-size: $tooltip-breakdown-item-size;
  color: Rgba(255, 255, 255, 0.6);

  .boosted { color: #10B981; font-weight: bold; }
  .penalized { color: #EF4444; font-weight: bold; }
}

.formula-breakdown-box {
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 5px 6px;
  border: 1px dashed Rgba(255, 255, 255, 0.08);

  .formula-text {
    font-size: $tooltip-formula-text-size;
    color: #aeaebe;
    
    .boosted {
      color: #10B981;
      text-shadow: 0 0 2px Rgba(16, 185, 129, 0.4);
      font-weight: bold;
    }
    
    .penalized {
      color: #EF4444;
      text-shadow: 0 0 2px Rgba(239, 68, 68, 0.4);
      font-weight: bold;
    }
    
    .total-result {
      color: var(--yellow);
      font-size: $tooltip-formula-result-size;
      text-shadow: 0 0 3px Rgba(255, 214, 10, 0.3);
    }
  }
}

.extra-effect-section {
  @include extra-effect-section-mixin;
}

.smogon-desc-text {
  font-size: $tooltip-smogon-desc-size !important;
}
</style>
