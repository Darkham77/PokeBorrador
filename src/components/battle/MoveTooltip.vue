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

  min-width: 220px;
  max-width: 260px;
  padding: 2px;
  color: rgb(255 255 255 / 95%);
  font-size: 9px;
  line-height: 1.5;
}

.move-desc {
  overflow-wrap: break-word;
}

.move-details-calc {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgb(255 255 255 / 20%);
}

.calc-section-title {
  @include calc-section-title-mixin;
}
</style>
