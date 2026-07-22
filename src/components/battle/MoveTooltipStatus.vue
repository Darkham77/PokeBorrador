<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
defineProps<{
  parsedStatusEffect: any
}>()
/* eslint-enable @typescript-eslint/no-explicit-any */
</script>

<template>
  <div class="status-effect-wrapper">
    <div class="calc-section-title">
      EFECTO DE ESTADO
    </div>
    
    <!-- Si es condición persistente/volátil (Envenenado, Drenadoras, etc.) -->
    <template v-if="parsedStatusEffect.isCondition">
      <div class="combat-stats-grid">
        <!-- Box 1: Objetivo -->
        <div class="stat-box">
          <span class="stat-lbl">APLICADO A</span>
          <span
            class="stat-val"
            :class="parsedStatusEffect.isSelf ? 'boosted' : 'penalized'"
          >
            {{ parsedStatusEffect.targetName }}
            <span
              class="arrow"
              :class="parsedStatusEffect.isSelf ? 'up' : 'down'"
            >
              {{ parsedStatusEffect.isSelf ? '▲' : '▼' }}
            </span>
          </span>
        </div>
        
        <!-- Box 2: Estado -->
        <div class="stat-box">
          <span class="stat-lbl">ESTADO</span>
          <span
            class="stat-val"
            :class="parsedStatusEffect.isSelf ? 'boosted' : 'penalized'"
          >
            {{ parsedStatusEffect.label }}
            <span
              class="arrow"
              :class="parsedStatusEffect.direction === 'up' ? 'up' : 'down'"
            >
              {{ parsedStatusEffect.direction === 'up' ? '▲' : '▼' }}
            </span>
          </span>
        </div>
      </div>

      <!-- Description Box (Full Width) -->
      <div class="status-desc-box">
        <span class="stat-lbl">DETALLE DE COMBATE</span>
        <div class="status-desc-text">
          {{ parsedStatusEffect.details }}
        </div>
      </div>
    </template>

    <!-- Si es cambio de estadísticas (Gruñido, Fortaleza, etc.) -->
    <template v-else>
      <div class="combat-stats-grid">
        <!-- Box 1: Objetivo -->
        <div class="stat-box">
          <span class="stat-lbl">APLICADO A</span>
          <span
            class="stat-val"
            :class="parsedStatusEffect.isSelf ? 'boosted' : 'penalized'"
          >
            {{ parsedStatusEffect.targetName }}
            <span
              class="arrow"
              :class="parsedStatusEffect.isSelf ? 'up' : 'down'"
            >
              {{ parsedStatusEffect.isSelf ? '▲' : '▼' }}
            </span>
          </span>
        </div>

        <!-- Box 2: Estadística -->
        <div class="stat-box">
          <span class="stat-lbl">ESTADÍSTICA</span>
          <span
            class="stat-val"
            :class="parsedStatusEffect.direction === 'up' ? 'boosted' : 'penalized'"
          >
            {{ parsedStatusEffect.statName }}
            <span
              class="arrow"
              :class="parsedStatusEffect.direction === 'up' ? 'up' : 'down'"
            >
              {{ parsedStatusEffect.direction === 'up' ? '▲' : '▼' }}
            </span>
          </span>
        </div>

        <!-- Box 3: RANGO (STAGE) -->
        <div class="stat-box">
          <span class="stat-lbl">RANGO (STAGE)</span>
          <span
            class="stat-val"
            :class="parsedStatusEffect.direction === 'up' ? 'boosted' : 'penalized'"
          >
            {{ (parsedStatusEffect.currentStage ?? 0) >= 0 ? '+' : '' }}{{ parsedStatusEffect.currentStage ?? 0 }} ➔ 
            {{ (parsedStatusEffect.finalStage ?? 0) >= 0 ? '+' : '' }}{{ parsedStatusEffect.finalStage ?? 0 }}
            <span
              class="arrow"
              :class="parsedStatusEffect.direction === 'up' ? 'up' : 'down'"
            >
              {{ parsedStatusEffect.direction === 'up' ? '▲' : '▼' }}
            </span>
          </span>
        </div>

        <!-- Box 4: Valor Neto -->
        <div
          v-if="parsedStatusEffect.stat !== 'all'"
          class="stat-box"
        >
          <span class="stat-lbl">VALOR NETO</span>
          <span class="stat-val">
            {{ parsedStatusEffect.initialStatVal }} ➔ {{ parsedStatusEffect.finalStatVal }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.status-effect-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.combat-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.stat-box {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  .stat-lbl {
    font-size: 6px;
    color: Rgba(255, 255, 255, 0.5);
    font-weight: bold;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .stat-val {
    font-size: 8px;
    font-weight: bold;
    color: white;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 3px;

    &.boosted {
      color: #10B981;
      text-shadow: 0 0 2px Rgba(16, 185, 129, 0.4);
    }

    &.penalized {
      color: #EF4444;
      text-shadow: 0 0 2px Rgba(239, 68, 68, 0.4);
    }
  }
}

.status-desc-box {
  margin-top: 4px;
  background: Rgba(0, 0, 0, 0.15);
  border: 1px dotted Rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  .stat-lbl {
    font-size: 6px;
    color: Rgba(255, 255, 255, 0.5);
    font-weight: bold;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .status-desc-text {
    font-size: 7.5px;
    line-height: 1.3;
    color: Rgba(255, 255, 255, 0.8);
    word-break: break-word;
  }
}

.arrow {
  display: inline-flex;
  align-items: center;
  font-size: 8px;
  margin-left: 2px;
  
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
