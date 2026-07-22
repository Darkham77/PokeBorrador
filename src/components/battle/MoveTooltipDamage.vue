<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
defineProps<{
  activeDetails: any
}>()
/* eslint-enable @typescript-eslint/no-explicit-any */

function getKoColorClass(koText: string) {
  if (koText.includes('Garantizado (100%)')) return 'ko-guaranteed'
  if (koText.includes('Alta prob.')) return 'ko-high'
  if (koText.includes('Prob. media')) return 'ko-medium'
  return 'ko-low'
}
</script>

<template>
  <!-- Estimated Damage Section -->
  <div
    v-if="activeDetails.damageRange"
    class="damage-section"
  >
    <div class="calc-section-title">
      DAÑO ESTIMADO
    </div>
    <div class="damage-grid">
      <!-- Normal Damage Row -->
      <div class="dmg-label">
        NORMAL:
      </div>
      <div class="dmg-value-group">
        <span class="hp-range">{{ activeDetails.damageRange.normalMin }} - {{ activeDetails.damageRange.normalMax }} HP</span>
        <span class="pct-range">({{ activeDetails.damageRange.normalPctMin }}% - {{ activeDetails.damageRange.normalPctMax }}% de vida)</span>
      </div>

      <!-- Critical Damage Row -->
      <div class="dmg-label">
        CRÍTICO:
      </div>
      <div class="dmg-value-group crit">
        <span class="hp-range">{{ activeDetails.damageRange.critMin }} - {{ activeDetails.damageRange.critMax }} HP</span>
        <span class="pct-range">({{ activeDetails.damageRange.critPctMin }}% - {{ activeDetails.damageRange.critPctMax }}% de vida)</span>
      </div>

      <!-- KO Probability Row -->
      <div
        v-if="activeDetails.damageRange.koChanceText"
        class="dmg-label"
      >
        PROB. KO:
      </div>
      <div
        v-if="activeDetails.damageRange.koChanceText"
        class="dmg-value-group"
      >
        <span
          class="ko-chance-badge"
          :class="getKoColorClass(activeDetails.damageRange.koChanceText)"
        >
          {{ activeDetails.damageRange.koChanceText }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.calc-section-title {
  font-size: 7.5px;
  color: var(--yellow);
  font-weight: bold;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
  text-transform: uppercase;
}

.damage-section {
  border-top: 1px dotted Rgba(255, 255, 255, 0.15);
  padding-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.damage-grid {
  display: grid;
  grid-template-columns: 50px 1fr;
  gap: 4px 8px;
  align-items: center;
}

.dmg-label {
  font-size: 7.5px;
  color: Rgba(255, 255, 255, 0.6);
  font-weight: bold;
}

.dmg-value-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;

  .hp-range {
    font-size: 8px;
    font-weight: bold;
    color: white;
  }

  .pct-range {
    font-size: 6.5px;
    color: Rgba(255, 255, 255, 0.5);
    line-height: 1.2;
    margin-top: 1px;
    white-space: nowrap;
  }

  &.crit {
    .hp-range {
      color: #FBBF24;
      text-shadow: 0 0 3px Rgba(251, 191, 36, 0.3);
    }
  }
}

.ko-chance-badge {
  font-size: 7px;
  text-transform: uppercase;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: bold;
  
  &.ko-guaranteed {
    color: #ff453a;
    background: Rgba(255, 69, 58, 0.15);
    border: 1px solid Rgba(255, 69, 58, 0.25);
    text-shadow: 0 0 3px Rgba(255, 69, 58, 0.3);
  }
  
  &.ko-high {
    color: #ff9f0a;
    background: Rgba(255, 159, 10, 0.15);
    border: 1px solid Rgba(255, 159, 10, 0.25);
  }

  &.ko-medium {
    color: #ffd60a;
    background: Rgba(255, 214, 10, 0.15);
    border: 1px solid Rgba(255, 214, 10, 0.25);
  }

  &.ko-low {
    color: #30d158;
    background: Rgba(48, 209, 88, 0.1);
    border: 1px solid Rgba(48, 209, 88, 0.25);
  }
}
</style>
