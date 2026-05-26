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
  minDamage?: number;
  maxDamage?: number;
  minPercent?: number;
  maxPercent?: number;
  koChanceText?: string;
}>();

const getKoColorClass = (text?: string) => {
  if (!text) return 'ko-neutral';
  if (text.includes('OHKO')) return 'ko-ohko';
  if (text.includes('2HKO')) return 'ko-2hko';
  if (text.includes('3HKO')) return 'ko-3hko';
  return 'ko-neutral';
};
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

      <!-- Estimaciones de Daño Real y KO en Sandbox -->
      <template v-if="category.toLowerCase() !== 'status' && basePower > 0 && minDamage !== undefined">
        <div class="math-divider" />
        
        <div class="math-row damage-row">
          <span class="math-label dmg-label">Rango de Daño Real:</span>
          <span class="math-value dmg-value">
            <strong class="dmg-range">{{ minDamage }} - {{ maxDamage }} PS</strong>
            <span class="dmg-percent"> ({{ minPercent }}% - {{ maxPercent }}%)</span>
          </span>
        </div>

        <div class="math-row ko-row">
          <span class="math-label">Probabilidad de KO:</span>
          <span :class="['math-value ko-value', getKoColorClass(koChanceText)]">
            {{ koChanceText }}
          </span>
        </div>
      </template>
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

  .math-divider {
    height: 1px;
    background: linear-gradient(90deg, Rgba(255, 255, 255, 0) 0%, Rgba(255, 255, 255, 0.08) 50%, Rgba(255, 255, 255, 0) 100%);
    margin: 4px 0;
  }

  .math-total-row {
    margin-top: 2px;
    padding-top: 6px;
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

  // Estilos de Daño
  .damage-row {
    .dmg-label {
      color: #8a8a93;
    }
    
    .dmg-value {
      font-size: 8px;
    }

    .dmg-range {
      color: #30d158;
      text-shadow: 0 0 4px Rgba(48, 209, 88, 0.25);
    }

    .dmg-percent {
      color: #8e8e93;
    }
  }

  .ko-row {
    margin-top: 2px;
    
    .ko-value {
      font-size: 8px;
      text-transform: uppercase;
      padding: 1px 4px;
      border-radius: 3px;
      
      &.ko-ohko {
        color: #ff453a;
        background: Rgba(255, 69, 58, 0.15);
        border: 1px solid Rgba(255, 69, 58, 0.25);
        text-shadow: 0 0 4px Rgba(255, 69, 58, 0.3);
      }

      &.ko-2hko {
        color: #ff9f0a;
        background: Rgba(255, 159, 10, 0.15);
        border: 1px solid Rgba(255, 159, 10, 0.25);
      }

      &.ko-3hko {
        color: #ffd60a;
        background: Rgba(255, 214, 10, 0.1);
        border: 1px solid Rgba(255, 214, 10, 0.2);
      }

      &.ko-neutral {
        color: #aeaebe;
      }
    }
  }
}
</style>
