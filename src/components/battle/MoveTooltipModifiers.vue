<script setup lang="ts">
import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'

defineProps<{
  activeDetails: ActiveMoveDetails
}>()
</script>

<template>
  <div>
    <!-- Active Modifiers Section -->
    <div 
      v-if="!activeDetails.isStatus && (activeDetails.power.list.length > 0 || activeDetails.accuracy.list.length > 0)" 
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
            :class="item.mult > 1 ? 'boosted' : (item.mult < 1 ? 'penalized' : '')"
          >
            {{ item.mult > 1 ? '▲' : (item.mult < 1 ? '▼' : '•') }}
          </span>
          POT: {{ item.label }} <span :class="item.mult > 1 ? 'boosted' : (item.mult < 1 ? 'penalized' : '')">x{{ item.mult.toFixed(2).replace('.00', '') }}</span>
        </div>
        <div
          v-for="item in activeDetails.accuracy.list"
          :key="item.label"
          class="breakdown-item"
        >
          <span
            class="emoji"
            :class="((typeof item.mult === 'number' && item.mult > 1) || item.mult === '100%') ? 'boosted' : (typeof item.mult === 'number' && item.mult < 1 ? 'penalized' : '')"
          >
            {{ ((typeof item.mult === 'number' && item.mult > 1) || item.mult === '100%') ? '▲' : (typeof item.mult === 'number' && item.mult < 1 ? '▼' : '•') }}
          </span>
          PREC: {{ item.label }} <span :class="(typeof item.mult === 'number' && item.mult > 1) || item.mult === '100%' ? 'boosted' : (typeof item.mult === 'number' && item.mult < 1 ? 'penalized' : '')">
            {{ typeof item.mult === 'number' ? `x${item.mult.toFixed(2).replace('.00', '')}` : item.mult }}
          </span>
        </div>
      </div>
    </div>

    <!-- Live Equation Breakdown -->
    <div 
      v-if="!activeDetails.isStatus && activeDetails.power.base > 0"
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
          x <span :class="{ 'boosted': item.mult > 1, 'penalized': item.mult < 1 }">{{ item.label.split(' ')[0] }} (x{{ item.mult.toFixed(2).replace('.00', '') }})</span>
        </template>
        <span v-if="activeDetails.effectiveness">
          x <span :class="{ 'boosted': activeDetails.effectiveness.value > 1, 'penalized': activeDetails.effectiveness.value < 1 }">Ef. (x{{ activeDetails.effectiveness.value }})</span>
        </span>
        = <strong class="total-result">{{ Math.floor((activeDetails.power.final === '-' ? 0 : Number(activeDetails.power.final)) * (activeDetails.effectiveness?.value ?? 1)) }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/_move-tooltip-shared.scss" as *;
</style>
