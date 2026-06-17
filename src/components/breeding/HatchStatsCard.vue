<script setup lang="ts">
/**
 * HatchStatsCard.vue
 * Tarjeta premium de estadísticas del Pokémon eclosionado.
 */
import PVTooltip from '@/components/common/PVTooltip.vue'
import { NATURE_DATA } from '@/data/battle/natures'
import { ABILITY_DATA } from '@/data/battle/abilities'
import type { Pokemon } from '@/types/pokemon/pokemon'

import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { computed } from 'vue'

interface Props {
  pokemon: Pokemon
}

const props = defineProps<Props>()

const tierInfo = computed(() => getPokemonTier(props.pokemon))

const getNatureInfo = (nature: string) => {
  if (!nature) return { desc: 'Sin datos de naturaleza.' }
  const data = NATURE_DATA as Record<string, { desc: string }>
  const entry = data[nature] || Object.entries(data).find(([k]) => k.toLowerCase() === nature.toLowerCase())?.[1]
  return entry || { desc: 'Naturaleza desconocida.' }
}

const getAbilityDesc = (ability: string) => {
  if (!ability) return 'Habilidad especial de este Pokémon.'
  const data = ABILITY_DATA as Record<string, string | { desc: string }>
  const entry = data[ability] || Object.entries(data).find(([k]) => k.toLowerCase() === ability.toLowerCase())?.[1]
  if (!entry) return 'Habilidad especial de este Pokémon.'
  return typeof entry === 'string' ? entry : (entry.desc || 'Habilidad especial de este Pokémon.')
}
</script>

<template>
  <div class="stats-card">
    <div class="stat-row">
      <span class="label">Naturaleza:</span>
      <PVTooltip
        title="NATURALEZA"
        :description="getNatureInfo(pokemon.nature).desc"
        position="top"
      >
        <span class="val interactive-val m-interactive-label">{{ pokemon.nature }}</span>
      </PVTooltip>
    </div>
    <div class="stat-row">
      <span class="label">Habilidad:</span>
      <PVTooltip
        title="HABILIDAD"
        :description="getAbilityDesc(pokemon.ability || 'Común')"
        position="top"
      >
        <span class="val interactive-val m-interactive-label">{{ pokemon.ability || 'Común' }}</span>
      </PVTooltip>
    </div>
    <div class="stat-row ivs-row">
      <span class="label">IVs:</span>
      <span class="val ivs-grid">
        <span>HP: {{ pokemon.ivs?.hp }}</span>
        <span>ATK: {{ pokemon.ivs?.atk }}</span>
        <span>DEF: {{ pokemon.ivs?.def }}</span>
        <span>SPA: {{ pokemon.ivs?.spa }}</span>
        <span>SPD: {{ pokemon.ivs?.spd }}</span>
        <span>SPE: {{ pokemon.ivs?.spe }}</span>
      </span>
    </div>
    <div class="stat-row">
      <span class="label">Grado IVs:</span>
      <span
        class="val tier-badge"
        :style="{ color: tierInfo.color }"
      >
        {{ tierInfo.tier }} ({{ tierInfo.total }}/186)
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/variables" as *;

.stats-card {
  background: Rgba(255, 255, 255, 0.04);
  border: 1.5px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px 20px;
  margin-top: 16px;
  width: 340px;
  max-width: 95%;
  text-align: left;
  @include gpu-layer;

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    border-bottom: 1px dashed Rgba(255, 255, 255, 0.06);
    padding-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
      border-bottom: none;
      padding-bottom: 0;
    }

    .label {
      @include pixelated;
      font-size: 9px;
      color: var(--gray);
    }

    .val {
      @include pixelated;
      font-size: 9px;
      color: var(--yellow);
      font-weight: bold;

      &.interactive-val {
        border-bottom: 1px dotted Rgba(255, 255, 255, 0.3);
        cursor: help;
        display: inline-block;

        &:hover {
          color: var(--blue-light, #60a5fa) !important;
          border-bottom-color: var(--blue-light, #60a5fa);
        }
      }

      &.ivs-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px 12px;
        text-align: right;
      }
    }
  }
}
</style>
