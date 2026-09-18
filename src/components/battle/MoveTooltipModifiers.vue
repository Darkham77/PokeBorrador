<script setup lang="ts">
import { computed } from 'vue'
import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'

const props = defineProps<{
  activeDetails: ActiveMoveDetails
}>()

function getModifierClass(mult: number | string): string {
  if (typeof mult === 'number') {
    if (mult > 1) return 'boosted'
    if (mult < 1) return 'penalized'
    return ''
  }
  return mult === '100%' ? 'boosted' : ''
}

function getModifierIcon(mult: number | string): string {
  if (typeof mult === 'number') {
    if (mult > 1) return '▲'
    if (mult < 1) return '▼'
    return '•'
  }
  return mult === '100%' ? '▲' : '•'
}

function formatMultiplier(mult: number | string): string {
  if (typeof mult === 'number') {
    return `x${mult.toFixed(2).replace('.00', '')}`
  }
  return mult
}

const showModifiersSection = computed(() => {
  return !props.activeDetails.isStatus && (props.activeDetails.power.list.length > 0 || props.activeDetails.accuracy.list.length > 0)
})

const showFormulaSection = computed(() => {
  return !props.activeDetails.isStatus && props.activeDetails.power.base > 0
})

const totalCalculatedPower = computed(() => {
  const finalVal = props.activeDetails.power.final === '-' ? 0 : Number(props.activeDetails.power.final)
  const eff = props.activeDetails.effectiveness?.value ?? 1
  return Math.floor(finalVal * eff)
})
</script>

<template>
  <div class="move-tooltip-modifiers-wrapper">
    <!-- Active Modifiers Section -->
    <div 
      v-if="showModifiersSection" 
      class="modifiers-section"
    >
      <div class="calc-section-title">
        MODIFICADORES ACTIVOS
      </div>
      <div class="breakdown-list">
        <div
          v-for="item in activeDetails.power.list"
          :key="item.label"
          class="breakdown-item"
        >
          <span
            class="emoji"
            :class="getModifierClass(item.mult)"
          >
            {{ getModifierIcon(item.mult) }}
          </span>
          POT: {{ item.label }} <span :class="getModifierClass(item.mult)">{{ formatMultiplier(item.mult) }}</span>
        </div>
        <div
          v-for="item in activeDetails.accuracy.list"
          :key="item.label"
          class="breakdown-item"
        >
          <span
            class="emoji"
            :class="getModifierClass(item.mult)"
          >
            {{ getModifierIcon(item.mult) }}
          </span>
          PREC: {{ item.label }} <span :class="getModifierClass(item.mult)">
            {{ formatMultiplier(item.mult) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Live Equation Breakdown -->
    <div 
      v-if="showFormulaSection"
      class="formula-breakdown-box"
    >
      <div class="calc-section-title">
        FÓRMULA DE POTENCIA
      </div>
      <div class="formula-text">
        BP ({{ activeDetails.power.base }})
        <template
          v-for="item in activeDetails.power.list"
          :key="item.label"
        >
          x <span :class="getModifierClass(item.mult)">{{ item.label.split(' ')[0] }} ({{ formatMultiplier(item.mult) }})</span>
        </template>
        <span v-if="activeDetails.effectiveness">
          x <span :class="getModifierClass(activeDetails.effectiveness.value)">Ef. (x{{ activeDetails.effectiveness.value }})</span>
        </span>
        = <strong class="total-result">{{ totalCalculatedPower }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/_move-tooltip-shared.scss" as *;

.move-tooltip-modifiers-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.calc-section-title {
  @include calc-section-title-mixin;
}

.modifiers-section {
  @include modifiers-section-mixin;
}

.formula-breakdown-box {
  @include formula-breakdown-box-mixin;
}
</style>

