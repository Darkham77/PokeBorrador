<script setup lang="ts">
import type { ParsedStatusEffectInfo } from '@/types/battle/tooltip'
import {
  getTargetCssClass,
  getDirectionCssClass,
  getTargetArrow,
  getDirectionArrow,
  getStageRangeLabel
} from './moveTooltipStatusHelper.ts'

defineProps<{
  parsedStatusEffect: ParsedStatusEffectInfo
}>()
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
            :class="getTargetCssClass(parsedStatusEffect.isSelf)"
          >
            {{ parsedStatusEffect.targetName }}
            <span
              class="arrow"
              :class="getTargetCssClass(parsedStatusEffect.isSelf) === 'boosted' ? 'up' : 'down'"
            >
              {{ getTargetArrow(parsedStatusEffect.isSelf) }}
            </span>
          </span>
        </div>
        
        <!-- Box 2: Estado -->
        <div class="stat-box">
          <span class="stat-lbl">ESTADO</span>
          <span
            class="stat-val"
            :class="getTargetCssClass(parsedStatusEffect.isSelf)"
          >
            {{ parsedStatusEffect.label }}
            <span
              class="arrow"
              :class="getDirectionCssClass(parsedStatusEffect.direction) === 'boosted' ? 'up' : 'down'"
            >
              {{ getDirectionArrow(parsedStatusEffect.direction) }}
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
            :class="getTargetCssClass(parsedStatusEffect.isSelf)"
          >
            {{ parsedStatusEffect.targetName }}
            <span
              class="arrow"
              :class="getTargetCssClass(parsedStatusEffect.isSelf) === 'boosted' ? 'up' : 'down'"
            >
              {{ getTargetArrow(parsedStatusEffect.isSelf) }}
            </span>
          </span>
        </div>

        <!-- Box 2: Estadística -->
        <div class="stat-box">
          <span class="stat-lbl">ESTADÍSTICA</span>
          <span
            class="stat-val"
            :class="getDirectionCssClass(parsedStatusEffect.direction)"
          >
            {{ parsedStatusEffect.statName }}
            <span
              class="arrow"
              :class="getDirectionCssClass(parsedStatusEffect.direction) === 'boosted' ? 'up' : 'down'"
            >
              {{ getDirectionArrow(parsedStatusEffect.direction) }}
            </span>
          </span>
        </div>

        <!-- Box 3: RANGO (STAGE) -->
        <div class="stat-box">
          <span class="stat-lbl">RANGO (STAGE)</span>
          <span
            class="stat-val"
            :class="getDirectionCssClass(parsedStatusEffect.direction)"
          >
            {{ getStageRangeLabel(parsedStatusEffect.currentStage, parsedStatusEffect.finalStage) }}
            <span
              class="arrow"
              :class="getDirectionCssClass(parsedStatusEffect.direction) === 'boosted' ? 'up' : 'down'"
            >
              {{ getDirectionArrow(parsedStatusEffect.direction) }}
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
@use "@/styles/components/_move-tooltip-shared.scss" as *;

.status-effect-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.calc-section-title {
  @include calc-section-title-mixin;
}

.combat-stats-grid {
  @include combat-stats-grid-mixin;
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
    font-size: $tooltip-stat-label-size;
    color: Rgba(255, 255, 255, 0.5);
    font-weight: bold;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .status-desc-text {
    font-size: $tooltip-breakdown-item-size;
    line-height: 1.3;
    color: Rgba(255, 255, 255, 0.8);
    word-break: break-word;
  }
}

.arrow {
  @include arrow-mixin;
}
</style>
