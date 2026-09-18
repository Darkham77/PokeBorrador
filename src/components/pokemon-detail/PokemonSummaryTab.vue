<script setup lang="ts">
import { computed } from 'vue'
import PokemonStatusSection from '@/components/pokemon-detail/PokemonStatusSection.vue'
import PokemonSummaryPhysicalGrid from '@/components/pokemon-detail/PokemonSummaryPhysicalGrid.vue'
import PokemonSummaryTrophiesSection from '@/components/pokemon-detail/PokemonSummaryTrophiesSection.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { SpeciesSummaryData } from './pokemonSummaryTypes.ts'
import type { PhysicalData } from './pokemonSummaryHelper.ts'

const props = defineProps<{
  species: SpeciesSummaryData
  cleanCategory: string
  isInstance: boolean
  instancePhysicalData: PhysicalData | null
  targetPokemon: Pokemon | null
  context?: string
  targetSpeciesId: PokemonSpeciesId
  captureDateFormatted: string | null
}>()

const speciesDescription = computed(() => props.species.description || 'No hay datos disponibles en la Pokédex.')
const uidDisplay = computed(() => props.targetPokemon?.uid || 'N/A')
const formattedCaptureDate = computed(() => (props.captureDateFormatted ? props.captureDateFormatted.toUpperCase() : ''))
</script>

<template>
  <div class="pdex-summary-pane">
    <PokemonSummaryPhysicalGrid
      :species="species"
      :clean-category="cleanCategory"
      :is-instance="isInstance"
      :instance-physical-data="instancePhysicalData"
    />

    <div
      v-if="isInstance && targetPokemon"
      class="instance-status-section"
    >
      <PokemonStatusSection
        :pokemon="targetPokemon"
        :context="context"
      />
    </div>

    <p class="description">
      {{ speciesDescription }}
    </p>

    <!-- Competition Trophies History Section in Summary -->
    <PokemonSummaryTrophiesSection
      v-if="isInstance"
      :target-pokemon="targetPokemon"
      :target-species-id="targetSpeciesId"
    />

    <!-- DB Info (UID + Capture Date) -->
    <div
      v-if="isInstance"
      class="db-info-section"
    >
      <div class="uid-display">
        <span class="upd-info-label pixelated">ID ÚNICO DB:</span>
        <span class="uid-value pixelated">{{ uidDisplay }}</span>
      </div>
      <div
        v-if="captureDateFormatted"
        class="capture-date-display"
      >
        <span class="upd-info-label pixelated">CAPTURADO EL:</span>
        <span class="date-value pixelated">{{ formattedCaptureDate }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../styles/components/pokedex-detail" as *;
@use "../../styles/components/unified-pokemon-detail" as *;
</style>
