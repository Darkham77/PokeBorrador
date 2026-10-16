<script setup lang="ts">
import { POKEMON_STAT_KEYS, type PokemonStatKey } from '@/types/pokemon/pokemon';

interface Props {
  stats: Record<PokemonStatKey, number>;
}

defineProps<Props>();
</script>

<template>
  <div class="base-stats-grid">
    <div v-for="stat in POKEMON_STAT_KEYS" :key="stat" class="stat-item">
      <label>{{ stat }}</label>
      <div class="stat-value">
        {{ stats[stat] }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.base-stats-grid {
  display: grid;
  gap: $spacing-sm-alt;
  grid-template-columns: repeat(3, 1fr);

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px;
    border: 1px solid Rgb(255 255 255 / 5%);
    border-radius: $radius-lg;
    background: Rgb(255 255 255 / 5%);

    label {
      color: Rgb(255 255 255 / 40%);
      font-size: var(--font-8);
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .stat-value {
      color: var(--yellow);
      font-size: var(--font-11);
      font-weight: bold;
    }
  }
}
</style>
