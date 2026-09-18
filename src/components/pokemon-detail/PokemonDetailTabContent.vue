<script setup lang="ts">
import PokemonSummaryTab from '@/components/pokemon-detail/PokemonSummaryTab.vue'
import PokemonStatsTab from '@/components/pokemon-detail/PokemonStatsTab.vue'
import PokemonMovesTab from '@/components/pokemon-detail/PokemonMovesTab.vue'
import PokemonTmsTab from '@/components/pokemon-detail/PokemonTmsTab.vue'
import PokemonEvolutionsTab from '@/components/pokemon-detail/PokemonEvolutionsTab.vue'
import PokemonTrophiesTab from '@/components/pokemon-detail/PokemonTrophiesTab.vue'
import type { Pokemon, PokemonSelectionSource, Move } from '@/types/pokemon/pokemon'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { usePokemonDetail } from '@/composables/pokemon/usePokemonDetail'

type PokemonDetailReturn = ReturnType<typeof usePokemonDetail>

interface Props {
  activeTab: string
  species: NonNullable<PokemonDetailReturn['species']['value']>
  cleanCategory: string
  isInstance: boolean
  instancePhysicalData: PokemonDetailReturn['instancePhysicalData']['value']
  targetPokemon: Pokemon | null
  context?: PokemonSelectionSource
  targetSpeciesId: PokemonSpeciesId
  captureDateFormatted: string | null
  displayStats: PokemonDetailReturn['displayStats']['value']
  currentMoves: PokemonDetailReturn['currentMoves']['value']
  moveDetails: PokemonDetailReturn['moveDetails']['value']
  evolutions: PokemonDetailReturn['evolutions']['value']
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'reorderMoves', from: number, to: number): void
}>()
</script>

<template>
  <div class="upd-core-body">
    <!-- Summary Tab -->
    <PokemonSummaryTab
      v-if="activeTab === 'summary'"
      :species="species"
      :clean-category="cleanCategory"
      :is-instance="isInstance"
      :instance-physical-data="instancePhysicalData"
      :target-pokemon="targetPokemon || null"
      :context="context"
      :target-species-id="targetSpeciesId"
      :capture-date-formatted="captureDateFormatted"
    />

    <!-- Stats Tab -->
    <PokemonStatsTab
      v-if="activeTab === 'stats'"
      :display-stats="displayStats"
      :species="species"
      :is-instance="isInstance"
      :pokemon="targetPokemon"
    />

    <!-- Moves Tab -->
    <PokemonMovesTab
      v-if="activeTab === 'moves'"
      :is-instance="isInstance"
      :current-moves="currentMoves as (Move | null)[]"
      :move-details="moveDetails"
      @reorder-moves="(from, to) => emit('reorderMoves', from, to)"
    />

    <!-- TMs Tab -->
    <PokemonTmsTab
      v-if="activeTab === 'tms'"
      :species-id="targetSpeciesId"
    />

    <!-- Evolution Tab -->
    <PokemonEvolutionsTab
      v-if="activeTab === 'evolve'"
      :evolutions="evolutions"
      :species-name="species.name"
      :species-id="targetSpeciesId"
    />

    <!-- Trophies Tab -->
    <PokemonTrophiesTab
      v-if="activeTab === 'trophies'"
      :trophies="targetPokemon?.trophies"
      :species-id="targetSpeciesId"
    />
  </div>
</template>

<style scoped lang="scss">
@use "../../styles/components/pokedex-detail" as *;
@use "../../styles/components/unified-pokemon-detail" as *;
</style>
