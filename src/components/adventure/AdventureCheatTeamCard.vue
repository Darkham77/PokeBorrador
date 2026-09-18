<script setup lang="ts">
import { computed } from 'vue'
import type { Pokemon } from '@/types/pokemon/pokemon'

const PERCENT_MIN = 0
const PERCENT_MAX = 100
const HEALTHY_HP_RATIO = 0.5
const WARNING_HP_RATIO = 0.2

const HP_COLOR_HEALTHY = '#4caf50'
const HP_COLOR_WARNING = '#ff9800'
const HP_COLOR_DANGER = '#f44336'

interface Props {
  pokemon: Pokemon
}

const props = defineProps<Props>()

const hpRatio = computed(() => {
  if (props.pokemon.maxHp <= 0) return 0
  return props.pokemon.hp / props.pokemon.maxHp
})

const hpPercentage = computed(() => {
  return Math.max(PERCENT_MIN, Math.min(PERCENT_MAX, hpRatio.value * PERCENT_MAX))
})

const hpColor = computed(() => {
  if (hpRatio.value > HEALTHY_HP_RATIO) return HP_COLOR_HEALTHY
  if (hpRatio.value > WARNING_HP_RATIO) return HP_COLOR_WARNING
  return HP_COLOR_DANGER
})
</script>

<template>
  <div class="adv-team-pkmn-card">
    <div class="card-header">
      <span class="pkmn-name">{{ pokemon.name }}</span>
      <span class="pkmn-level">Nv {{ pokemon.level }}</span>
    </div>

    <div class="hp-section">
      <div class="hp-text">
        <span>HP</span>
        <span>{{ pokemon.hp }} / {{ pokemon.maxHp }}</span>
      </div>
      <div class="hp-bar-track">
        <div 
          class="hp-bar-fill"
          :style="{ 
            width: `${hpPercentage}%`, 
            backgroundColor: hpColor 
          }"
        />
      </div>
    </div>

    <div class="moves-container">
      <template
        v-for="(move, idx) in pokemon.moves"
        :key="move ? move.name : idx"
      >
        <div 
          v-if="move"
          class="move-badge"
        >
          <span class="move-name">{{ move.name }}</span>
          <span :class="['move-pp', { 'is-empty': move.pp <= 0 }]">{{ move.pp }}/{{ move.maxPP }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.adv-team-pkmn-card {
  border: 1px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8px;
}

.pkmn-name {
  font-weight: bold;
  color: #ffcb05;
}

.pkmn-level {
  color: #aaa;
}

.hp-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hp-text {
  display: flex;
  justify-content: space-between;
  font-size: 6px;
  color: #ccc;
}

.hp-bar-track {
  width: 100%;
  height: 6px;
  background: Rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid Rgba(0, 0, 0, 0.5);
}

.hp-bar-fill {
  height: 100%;
}

.moves-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.move-badge {
  font-size: 6px;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
}

.move-name {
  color: #dfcbb5;
}

.move-pp {
  color: #ffcb05;

  &.is-empty {
    color: #ef5350;
  }
}
</style>
