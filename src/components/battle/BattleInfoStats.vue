<script setup lang="ts">
import type { Pokemon, PokemonEVs, PokemonIVs } from '@/types/pokemon/pokemon'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

export interface AdminStatItem {
  key: string
  label: string
  icon: string
}

export interface StatBreakdown {
  base: number
  final: number
}

const props = defineProps<{
  adminStatConfig: AdminStatItem[]
  getStatModifier: (key: string) => number
  getBreakdown: (key: string) => StatBreakdown
  pokemon?: Pokemon | null
}>()

function getEvValue(key: string): number {
  if (!props.pokemon?.evs) return 0
  const evs = props.pokemon.evs as unknown as PokemonEVs
  return Number(evs[key as keyof PokemonEVs] || 0)
}

function getIvValue(key: string): number {
  if (!props.pokemon?.ivs) return 0
  const ivs = props.pokemon.ivs as unknown as PokemonIVs
  return Number(ivs[key as keyof PokemonIVs] || 0)
}

function getSpeciesBaseStat(key: string): number {
  if (!props.pokemon?.id) return 0
  try {
    const data = pokemonDataProvider.getPokemonData(props.pokemon.id, true)
    if (!data) return 0
    return Number(data[key as keyof typeof data] || 0)
  } catch {
    return 0
  }
}
</script>

<template>
  <div class="stats-comparison-grid">
    <div class="grid-header-row">
      <span class="grid-header">STAT</span>
      <span class="grid-header">BS</span>
      <span class="grid-header">IV</span>
      <span class="grid-header">EV</span>
      <span class="grid-header">REAL</span>
      <span class="grid-header">STG</span>
      <span class="grid-header">FINAL</span>
    </div>
    <div
      v-for="st in adminStatConfig"
      :key="st.key"
      class="grid-stat-row"
      :class="{ 'is-up': getStatModifier(st.key) > 0, 'is-down': getStatModifier(st.key) < 0 }"
    >
      <span class="stat-name-col">{{ st.label }}</span>
      <span class="stat-bs-col">{{ getSpeciesBaseStat(st.key) }}</span>
      <span class="stat-iv-col">{{ getIvValue(st.key) }}</span>
      <span class="stat-ev-col">{{ getEvValue(st.key) }}</span>
      <span class="stat-val-col">{{ getBreakdown(st.key).base }}</span>
      <span class="stat-mult-col">{{ getStatModifier(st.key) > 0 ? `+${getStatModifier(st.key)}` : getStatModifier(st.key) }}</span>
      <span class="stat-final-col">{{ getBreakdown(st.key).final }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.stats-comparison-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
  @include pixelated;
  font-size: 8px;

  .grid-header-row {
    display: grid;
    grid-template-columns: 28px 22px 14px 18px 26px 20px 1fr;
    column-gap: 6px;
    text-align: right;
    color: Rgba(255, 255, 255, 0.4);
    font-weight: bold;
    padding-bottom: 2px;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.05);

    .grid-header:first-child {
      text-align: left;
    }
  }

  .grid-stat-row {
    display: grid;
    grid-template-columns: 28px 22px 14px 18px 26px 20px 1fr;
    column-gap: 6px;
    text-align: right;
    align-items: center;
    padding: 1px 0;

    .stat-name-col {
      text-align: left;
      color: Rgba(255, 255, 255, 0.6);
    }

    .stat-bs-col {
      color: Rgba(255, 255, 255, 0.5);
    }

    .stat-val-col {
      color: Rgba(255, 255, 255, 0.85);
    }

    .stat-iv-col {
      color: var(--cyan, #38BDF8);
    }

    .stat-ev-col {
      color: var(--yellow, #FACC15);
    }

    .stat-mult-col {
      color: Rgba(255, 255, 255, 0.5);
    }

    .stat-final-col {
      font-weight: bold;
      color: #FFF;
    }

    &.is-up {
      .stat-mult-col, .stat-final-col {
        color: #10B981;
      }
    }

    &.is-down {
      .stat-mult-col, .stat-final-col {
        color: #EF4444;
      }
    }
  }
}
</style>
