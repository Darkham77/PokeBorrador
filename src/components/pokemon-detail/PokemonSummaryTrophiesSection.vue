<script setup lang="ts">
import { computed } from 'vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { resolveTrophyDisplayName } from '@/logic/events/eventEngine'
import { useEventStore } from '@/stores/events'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { resolveTrophyDisplayData } from './pokemonSummaryHelper.ts'

const props = defineProps<{
  targetPokemon: Pokemon | null
  targetSpeciesId: PokemonSpeciesId
}>()

const eventStore = useEventStore()

const trophyCount = computed(() => props.targetPokemon?.trophies?.length ?? 0)
const hasTrophies = computed(() => trophyCount.value > 0)

const trophyList = computed(() => {
  if (!props.targetPokemon?.trophies) return []
  return props.targetPokemon.trophies.map((trophy, idx) => {
    const meta = resolveTrophyDisplayData(trophy.rank)
    const eventName = resolveTrophyDisplayName(trophy, eventStore.allEvents, props.targetSpeciesId)
    return {
      key: `${trophy.eventId}-${trophy.categoryId}-${trophy.awardedAt}-${idx}`,
      meta,
      eventName,
      categoryName: trophy.categoryName,
      score: trophy.score
    }
  })
})
</script>

<template>
  <div class="summary-trophies-section">
    <div class="summary-trophies-header pixelated">
      <span class="emoji">🏆</span>
      <span class="trophies-header-title">HISTORIAL DE COMPETENCIAS</span>
      <span
        v-if="hasTrophies"
        class="trophies-count-tag pixelated"
      >
        {{ trophyCount }}
      </span>
    </div>

    <!-- Empty State in Summary -->
    <div
      v-if="!hasTrophies"
      class="summary-trophies-empty pixelated"
    >
      Sin trofeos ni podios de competencias registrados.
    </div>

    <!-- Trophies List in Summary -->
    <div
      v-else
      class="summary-trophies-list"
    >
      <div
        v-for="item in trophyList"
        :key="item.key"
        class="summary-trophy-card"
        :class="item.meta.rankClass"
      >
        <span class="emoji">{{ item.meta.medal }}</span>
        <div class="trophy-info-compact">
          <div class="trophy-top-line">
            <span class="trophy-event-name pixelated">{{ item.eventName }}</span>
            <span class="trophy-rank-label pixelated">{{ item.meta.rankLabel }}</span>
          </div>
          <div class="trophy-bottom-line">
            <span class="trophy-category-name pixelated">{{ item.categoryName }}</span>
            <span
              v-if="item.score !== undefined"
              class="trophy-score-value pixelated"
            >{{ item.score }} pts</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../styles/components/pokedex-detail" as *;
@use "../../styles/components/unified-pokemon-detail" as *;
</style>
