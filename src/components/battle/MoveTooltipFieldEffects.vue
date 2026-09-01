<script setup lang="ts">
import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'

defineProps<{
  activeDetails: ActiveMoveDetails
}>()
</script>

<template>
  <div>
    <!-- Recovery Section (drain moves: Absorb, Drain Punch…) -->
    <div
      v-if="activeDetails.recovery && activeDetails.recovery.text"
      class="extra-effect-section recovery-section"
    >
      <div class="calc-section-title">
        RECUPERACIÓN
      </div>
      <div class="extra-effect-row">
        <span class="emoji">💚</span>
        <span class="extra-effect-text boosted">{{ activeDetails.recovery.text }}</span>
      </div>
    </div>

    <!-- Recoil Section (flare blitz, take down…) -->
    <div
      v-if="activeDetails.recoil && activeDetails.recoil.text"
      class="extra-effect-section recoil-section"
    >
      <div class="calc-section-title">
        RETROCESO
      </div>
      <div class="extra-effect-row">
        <span class="emoji">🔥</span>
        <span class="extra-effect-text penalized">{{ activeDetails.recoil.text }}</span>
      </div>
    </div>

    <!-- Field Conditions Section -->
    <div
      v-if="activeDetails.fieldConditions && activeDetails.fieldConditions.length > 0"
      class="extra-effect-section field-section"
    >
      <div class="calc-section-title">
        CONDICIONES DE CAMPO
      </div>
      <div
        v-for="cond in activeDetails.fieldConditions"
        :key="cond"
        class="field-condition-row"
      >
        <span class="emoji">◆</span>
        <span class="field-condition-text">{{ cond }}</span>
      </div>
    
      <!-- Smogon Calculator Description -->
      <div
        v-if="activeDetails.smogonDesc"
        class="formula-breakdown-box smogon-desc-box"
        style="margin-top: 4px;"
      >
        <div class="calc-section-title">
          ANÁLISIS COMPLETO (SMOGON)
        </div>
        <div
          class="formula-text smogon-desc-text"
          style="text-shadow: none; font-size: 7px; line-height: 1.2;"
        >
          {{ activeDetails.smogonDesc }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/_move-tooltip-shared.scss" as *;
</style>
