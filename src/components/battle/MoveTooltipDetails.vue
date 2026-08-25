<script setup lang="ts">
import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'

defineProps<{
  activeDetails: ActiveMoveDetails
  moveId?: string
}>()
</script>

<template>
  <div class="move-tooltip-details-extra">
    <!-- Speed Matchup Section -->
    <div
      v-if="activeDetails.speedInfo"
      class="extra-effect-section speed-section"
    >
      <div class="calc-section-title">
        ORDEN DE TURNO
      </div>
      <div class="extra-effect-row">
        <span class="extra-effect-icon">{{ activeDetails.speedInfo.priority > 0 ? '⚡' : (activeDetails.speedInfo.outspeeds ? '▶️' : '⏱️') }}</span>
        <span
          class="extra-effect-text"
          :class="activeDetails.speedInfo.outspeeds || activeDetails.speedInfo.priority > 0 ? 'boosted' : 'penalized'"
        >
          {{ activeDetails.speedInfo.priority > 0 ? `Prioridad +${activeDetails.speedInfo.priority}` : (activeDetails.speedInfo.outspeeds ? '¡Mueves primero!' : 'Rival mueve primero') }}
        </span>
        <span
          class="speed-values"
          style="color: rgba(255, 255, 255, 0.4); font-size: 6.5px; margin-left: 2px;"
        >
          ({{ activeDetails.speedInfo.attackerSpeed }} vs {{ activeDetails.speedInfo.defenderSpeed }} Vel)
        </span>
      </div>
    </div>

    <!-- Special Mechanics & Weights Section -->
    <div
      v-if="activeDetails.tacticalInfo && (activeDetails.tacticalInfo.overrideOffensiveStat || activeDetails.tacticalInfo.overrideDefensiveStat || activeDetails.tacticalInfo.ignoreDefensive || activeDetails.tacticalInfo.breaksProtect || activeDetails.tacticalInfo.hasCrashDamage || activeDetails.tacticalInfo.terrainReductions.length > 0)"
      class="extra-effect-section mechanics-section"
    >
      <div class="calc-section-title">
        PROPIEDADES ESPECIALES
      </div>
      
      <!-- Weights -->
      <div
        v-if="['lowkick', 'grassknot', 'heavyslam', 'heatcrash'].includes(moveId ?? '')"
        class="field-condition-row"
      >
        <span class="field-condition-dot">⚖️</span>
        <span class="field-condition-text">Peso: Tu {{ activeDetails.tacticalInfo.attackerWeight }}kg vs Rival {{ activeDetails.tacticalInfo.defenderWeight }}kg</span>
      </div>

      <!-- Override Offensive Stat -->
      <div
        v-if="activeDetails.tacticalInfo.overrideOffensiveStat"
        class="field-condition-row"
      >
        <span class="field-condition-dot">🧠</span>
        <span class="field-condition-text">Usa tu DEFENSA para atacar</span>
      </div>

      <!-- Override Defensive Stat -->
      <div
        v-if="activeDetails.tacticalInfo.overrideDefensiveStat"
        class="field-condition-row"
      >
        <span class="field-condition-dot">🧠</span>
        <span class="field-condition-text">Ataca contra la DEFENSA FÍSICA del rival</span>
      </div>

      <!-- Ignore Defensive boosts -->
      <div
        v-if="activeDetails.tacticalInfo.ignoreDefensive"
        class="field-condition-row"
      >
        <span class="field-condition-dot">🛡️</span>
        <span class="field-condition-text">Ignora aumentos de defensa del rival</span>
      </div>

      <!-- Breaks Protect -->
      <div
        v-if="activeDetails.tacticalInfo.breaksProtect"
        class="field-condition-row"
      >
        <span class="field-condition-dot">💥</span>
        <span class="field-condition-text">Rompe la Protección del rival</span>
      </div>

      <!-- Has Crash Damage -->
      <div
        v-if="activeDetails.tacticalInfo.hasCrashDamage"
        class="field-condition-row"
      >
        <span class="field-condition-dot">⚠️</span>
        <span class="field-condition-text">Daño por colisión si falla</span>
      </div>

      <!-- Terrain reductions -->
      <div
        v-for="warning in activeDetails.tacticalInfo.terrainReductions"
        :key="warning"
        class="field-condition-row"
      >
        <span class="field-condition-dot">💥</span>
        <span class="field-condition-text penalized">{{ warning }}</span>
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
