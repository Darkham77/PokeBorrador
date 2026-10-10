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
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: 6px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-md;
  background: Rgb(0 0 0 / 30%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-8);
}

.pkmn-name {
  color: var(--gold);
  font-weight: bold;
}

.pkmn-level {
  color: var(--slate-300);
}

.hp-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-2xs;
}

.hp-text {
  display: flex;
  justify-content: space-between;
  color: var(--slate-300);
  font-size: var(--font-6);
}

.hp-bar-track {
  width: 100%;
  height: 6px;
  border: 1px solid Rgb(0 0 0 / 50%);
  border-radius: $radius-xs-alt;
  background: Rgb(255 255 255 / 10%);
  overflow: hidden;
}

.hp-bar-fill {
  height: 100%;
}

.moves-container {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  margin-top: 2px;
}

.move-badge {
  display: flex;
  justify-content: space-between;
  gap: $spacing-sm-alt;
  width: 100%;
  padding: 2px 4px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-sm;
  background: Rgb(255 255 255 / 5%);
  font-size: var(--font-6);
}

.move-name {
  color: var(--amber-300);
}

.move-pp {
  color: var(--gold);

  &.is-empty {
    color: var(--red-light);
  }
}
</style>
