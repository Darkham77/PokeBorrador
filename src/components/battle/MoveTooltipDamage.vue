<script setup lang="ts">
import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'

defineProps<{
  activeDetails: ActiveMoveDetails
}>()

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
@use "@/styles/components/_move-tooltip-shared.scss" as *;

.calc-section-title {
  @include calc-section-title-mixin;
}

.damage-section {
  @include damage-section-mixin;
}

.ko-chance-badge {
  padding: 1px 4px;
  border-radius: 3px;
  font-size: $tooltip-badge-size;
  font-weight: bold;
  text-transform: uppercase;
  
  &.ko-guaranteed {
    border: 1px solid rgb(255 69 58 / 25%);
    background: rgb(255 69 58 / 15%);
    color: #ff453a;
    text-shadow: 0 0 3px rgb(255 69 58 / 30%);
  }
  
  &.ko-high {
    border: 1px solid rgb(255 159 10 / 25%);
    background: rgb(255 159 10 / 15%);
    color: #ff9f0a;
  }

  &.ko-medium {
    border: 1px solid rgb(255 214 10 / 25%);
    background: rgb(255 214 10 / 15%);
    color: #ffd60a;
  }

  &.ko-low {
    border: 1px solid rgb(48 209 88 / 25%);
    background: rgb(48 209 88 / 10%);
    color: #30d158;
  }
}
</style>
