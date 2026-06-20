<script setup lang="ts">
/**
 * HatchStatsCard.vue
 * Tarjeta premium de estadísticas del Pokémon eclosionado.
 */
import PVTooltip from '@/components/common/PVTooltip.vue'
import { NATURE_DATA } from '@/data/battle/natures'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
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
  const data = pokemonDataProvider.getAbilityData(ability)
  return data ? data.desc : 'Habilidad especial de este Pokémon.'
}

const getAbilityName = (ability: string) => {
  if (!ability) return 'Común'
  const data = pokemonDataProvider.getAbilityData(ability)
  return data ? data.name : ability
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
        :description="getAbilityDesc(pokemon.ability || '')"
        position="top"
      >
        <span class="val interactive-val m-interactive-label">{{ getAbilityName(pokemon.ability || '') }}</span>
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
@import "@/styles/components/_hatch-animation-modal.scss";
</style>
