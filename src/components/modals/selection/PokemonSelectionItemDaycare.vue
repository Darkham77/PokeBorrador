<script setup lang="ts">
import { computed } from 'vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { COMPAT_TEXT } from '@/logic/breeding/breedingData'
import { getVigor, getMaxVigor } from '@/logic/pokemon/pokemonUtils'

const props = defineProps<{
  pokemon: Pokemon
  listCompatibility: { level: number; eggSpecies?: string } | null
  eggSpeciesName: string
}>()

const vigorValue = computed(() => getVigor(props.pokemon))
const maxVigorValue = computed(() => getMaxVigor(props.pokemon))
const compatLevel = computed(() => props.listCompatibility?.level ?? 0)
const compatMeta = computed(() => {
  return (COMPAT_TEXT as Record<number, { color: string, label: string }>)[compatLevel.value] || { color: '#ff668f', label: 'Desconocida' }
})
</script>

<template>
  <div class="daycare-item-meta">
    <div class="daycare-meta-top">
      <div class="compat-status">
        <template v-if="listCompatibility">
          <span :style="{ color: compatMeta.color }">
            AFINIDAD: {{ compatMeta.label }}
          </span>
          <span
            v-if="listCompatibility.eggSpecies"
            class="egg-hint"
          >
            <span class="emoji">🥚</span> {{ eggSpeciesName }}
          </span>
        </template>
        <template v-else>
          <span class="waiting-status">Esperando pareja</span>
        </template>
      </div>
      
      <div
        v-if="vigorValue !== undefined"
        class="vigor-status-mini"
      >
        <span class="label">VIGOR: </span>
        <span :class="['value', { low: vigorValue <= 2 }]"><span class="emoji">⚡</span> {{ vigorValue }}/{{ maxVigorValue }}</span>
      </div>
    </div>

    <!-- Individual IVs List -->
    <div
      v-if="pokemon.ivs"
      class="ivs-list-row pixelated"
    >
      <span>HP: {{ pokemon.ivs.hp }}</span>
      <span>ATK: {{ pokemon.ivs.atk }}</span>
      <span>DEF: {{ pokemon.ivs.def }}</span>
      <span>SPA: {{ pokemon.ivs.spa }}</span>
      <span>SPD: {{ pokemon.ivs.spd }}</span>
      <span>SPE: {{ pokemon.ivs.spe }}</span>
    </div>
  </div>
</template>

<style scoped src="../PokemonSelectionItem.styles.scss" lang="scss"></style>
