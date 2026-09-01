<script setup lang="ts">
import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'

defineProps<{
  activeDetails: ActiveMoveDetails
}>()
</script>

<template>
  <!-- Tactical Modifiers Section (Assault Vest, Eviolite, Leech Seed, Foresight, Tera) -->
  <div
    v-if="activeDetails.tacticalInfo && (activeDetails.tacticalInfo.hasAssaultVest || activeDetails.tacticalInfo.hasEviolite || activeDetails.tacticalInfo.isLeechSeedActive || activeDetails.tacticalInfo.isForesightActive || activeDetails.tacticalInfo.attackerTera || activeDetails.tacticalInfo.defenderTera)"
    class="extra-effect-section tactical-section"
  >
    <div class="calc-section-title">
      MODIFICADORES TÁCTICOS
    </div>

    <!-- Assault Vest -->
    <div
      v-if="activeDetails.tacticalInfo.hasAssaultVest"
      class="field-condition-row"
    >
      <span class="emoji">🛡️</span>
      <span class="field-condition-text penalized">Chaleco Asalto Rival: Activo (<span class="emoji">↓</span> daño especial)</span>
    </div>

    <!-- Eviolite -->
    <div
      v-if="activeDetails.tacticalInfo.hasEviolite"
      class="field-condition-row"
    >
      <span class="emoji">💎</span>
      <span class="field-condition-text penalized">Mineral Evolutivo Rival: Activo (<span class="emoji">↑</span> defensas)</span>
    </div>

    <!-- Leech Seed -->
    <div
      v-if="activeDetails.tacticalInfo.isLeechSeedActive"
      class="field-condition-row"
    >
      <span class="emoji">🌱</span>
      <span class="field-condition-text boosted">Drenadoras Activas (Drenaje pasivo)</span>
    </div>

    <!-- Foresight -->
    <div
      v-if="activeDetails.tacticalInfo.isForesightActive"
      class="field-condition-row"
    >
      <span class="emoji">👁️</span>
      <span class="field-condition-text boosted">Gran Ojo / Profecía Activo (Ignora inmunidad Fantasma)</span>
    </div>

    <!-- Attacker Tera -->
    <div
      v-if="activeDetails.tacticalInfo.attackerTera"
      class="field-condition-row"
    >
      <span class="emoji">🌟</span>
      <span class="field-condition-text boosted">Tu Tipo Tera: {{ activeDetails.tacticalInfo.attackerTera }}</span>
    </div>

    <!-- Defender Tera -->
    <div
      v-if="activeDetails.tacticalInfo.defenderTera"
      class="field-condition-row"
    >
      <span class="emoji">🌟</span>
      <span class="field-condition-text penalized">Tipo Tera Rival: {{ activeDetails.tacticalInfo.defenderTera }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/components/_move-tooltip-shared.scss" as *;

.calc-section-title {
  @include calc-section-title-mixin;
}

.extra-effect-section {
  @include extra-effect-section-mixin;
}
</style>
