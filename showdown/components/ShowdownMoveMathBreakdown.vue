<script setup lang="ts">
defineProps<{
  basePower: number;
  category: string;
  hasStab: boolean;
  defenderName: string;
  effectivenessLabel: string;
  effectivenessClass: string;
  stabMultiplier: number;
  effectiveness: number;
  estimatedPower: number;
}>();
</script>

<template>
  <div class="tooltip-math-section">
    <h4 class="section-title">
      📊 ANÁLISIS MATEMÁTICO
    </h4>
    
    <div class="math-grid">
      <div class="math-row">
        <span class="math-label">Poder Base (BP):</span>
        <span class="math-value highlight">{{ basePower || '—' }}</span>
      </div>

      <div class="math-row">
        <span class="math-label">STAB (x1.5 Coincidencia):</span>
        <span :class="['math-value', { 'stab-active': hasStab && category.toLowerCase() !== 'status' }]">
          {{ hasStab && category.toLowerCase() !== 'status' ? '✓ Sí (x1.5)' : '✗ No (x1.0)' }}
        </span>
      </div>

      <div class="math-row">
        <span class="math-label">Eficacia vs {{ defenderName }}:</span>
        <span :class="['math-value', effectivenessClass]">
          {{ effectivenessLabel }}
        </span>
      </div>

      <div class="math-total-row">
        <span class="total-label">POTENCIA ESTIMADA:</span>
        <span
          v-if="category.toLowerCase() !== 'status' && basePower > 0"
          class="total-value"
        >
          {{ basePower }} x {{ stabMultiplier }} x {{ effectiveness }} = <strong class="total-result">{{ estimatedPower }}</strong>
        </span>
        <span
          v-else
          class="total-value status-only"
        >
          Efecto de Estado (N/A)
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tooltip-math-section {
  background: Rgba(0, 0, 0, 0.35);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px;

  .section-title {
    font-family: var(--font-pixel);
    font-size: 8px;
    color: #86868b;
    margin: 0 0 8px 0;
    letter-spacing: 0.5px;
  }

  .math-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .math-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--font-pixel);
    font-size: 7px;
    color: #aeaebe;
    
    .math-label {
      text-transform: uppercase;
    }

    .math-value {
      color: #fff;

      &.highlight {
        color: var(--yellow, #ffd60a);
        font-size: 8px;
      }

      &.stab-active {
        color: #32d74b;
        text-shadow: 0 0 4px Rgba(50, 215, 75, 0.3);
      }

      &.eff-immune {
        color: #ff453a;
        font-weight: bold;
      }
      &.eff-resisted {
        color: #ff9f0a;
      }
      &.eff-super {
        color: #32d74b;
        font-weight: bold;
        text-shadow: 0 0 4px Rgba(50, 215, 75, 0.3);
      }
      &.eff-neutral {
        color: #fff;
      }
    }
  }

  .math-total-row {
    margin-top: 6px;
    padding-top: 8px;
    border-top: 1px dashed Rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-family: var(--font-pixel);

    .total-label {
      font-size: 7px;
      color: #86868b;
      letter-spacing: 0.5px;
    }

    .total-value {
      font-size: 7px;
      color: #aeaebe;
      
      .total-result {
        font-size: 11px;
        color: var(--yellow, #ffd60a);
        text-shadow: 0 0 6px Rgba(255, 214, 10, 0.4);
      }

      &.status-only {
        color: #86868b;
        font-style: italic;
      }
    }
  }
}
</style>
