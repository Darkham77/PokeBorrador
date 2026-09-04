<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonStatusSection from '@/components/pokemon-detail/PokemonStatusSection.vue'
import type { Pokemon, PokemonCompetitionTrophy } from '@/types/pokemon/pokemon'
import {
  createSpeciesDimensionTooltip,
  DEFAULT_SPECIES_RANGE_VARIATION_FACTOR
} from '@/logic/pokemon/physicalDimensionsMath'
import { resolveTrophyDisplayName } from '@/logic/events/eventEngine'
import { useEventStore } from '@/stores/events'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { SpeciesSummaryData } from './pokemonSummaryTypes.ts'

interface PhysicalData {
  height: string | number
  weight: string | number
  heightTooltip: string
  weightTooltip: string
  heightTier: { label: string; cssClass: string }
  weightTier: { label: string; cssClass: string }
}

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

const eventStore = useEventStore()

const formatRange = (val: number | [number, number] | undefined, unit: string, factor = DEFAULT_SPECIES_RANGE_VARIATION_FACTOR) => {
  if (!val) return '—'
  if (Array.isArray(val)) return `${val[0]}${unit} - ${val[1]}${unit}`
  const min = (val * (1 - factor)).toFixed(1)
  const max = (val * (1 + factor)).toFixed(1)
  return `${min}${unit} - ${max}${unit}`
}

const getCategoryDescription = (cat: string) => {
  const c = cat.toLowerCase()
  if (c.includes('nueva especie')) return 'Pokémon extremadamente raro que contiene el ADN de todos los demás Pokémon. Se creía puramente mitológico.'
  if (c.includes('genético')) return 'Pokémon creado artificialmente mediante manipulación avanzada de ADN y experimentos científicos.'
  if (c.includes('legendario')) return 'Pokémon de gran poder que aparece en los mitos y leyendas. Suele ser único en su especie.'
  if (c.includes('mítico')) return 'Pokémon tan singular que su existencia es cuestionada por muchos científicos y exploradores.'
  if (c.includes('inicial')) return 'Pokémon que suele entregarse a los entrenadores que comienzan su aventura regional.'
  if (c.includes('fósil')) return 'Pokémon prehistórico resucitado a partir de material genético preservado en fósiles.'

  return `Clasificación: ${cat}. Define los rasgos biológicos principales y el comportamiento predominante de esta especie.`
}

const getTrophyMedal = (rank?: string) => {
  if (rank === 'first') return '🥇'
  if (rank === 'second') return '🥈'
  if (rank === 'third') return '🥉'
  return '🏆'
}

const getTrophyRankLabel = (rank?: string) => {
  if (rank === 'first') return '1º LUGAR'
  if (rank === 'second') return '2º LUGAR'
  if (rank === 'third') return '3º LUGAR'
  return 'GANADOR'
}

const getTrophyRankClass = (rank?: string) => {
  if (rank === 'first') return 'rank-gold'
  if (rank === 'second') return 'rank-silver'
  if (rank === 'third') return 'rank-bronze'
  return 'rank-default'
}

const resolveTrophyEventName = (trophy: PokemonCompetitionTrophy) => {
  return resolveTrophyDisplayName(
    trophy,
    eventStore.allEvents,
    props.targetSpeciesId
  )
}
</script>

<template>
  <div class="pdex-summary-pane">
    <div class="info-grid">
      <PVTooltip
        :title="'CATEGORÍA: ' + cleanCategory"
        :description="getCategoryDescription(cleanCategory)"
        position="top"
        tag="div"
        class="info-item"
      >
        <span class="upd-info-label pixelated">CATEGORÍA</span>
        <span class="ps-info-value pixelated">{{ cleanCategory }}</span>
      </PVTooltip>

      <PVTooltip
        :title="isInstance && instancePhysicalData ? 'ALTURA: ' + instancePhysicalData.height + 'm (' + instancePhysicalData.heightTier.label + ')' : 'ALTURA (ESPECIE)'"
        :description="isInstance && instancePhysicalData ? instancePhysicalData.heightTooltip : createSpeciesDimensionTooltip('ALTURA', 'm', Array.isArray(species.height) ? species.height[0] : (species.height || null))"
        position="top"
        tag="div"
        class="info-item"
      >
        <span class="upd-info-label pixelated">ALTURA</span>
        <div class="physical-val-wrapper">
          <span class="ps-info-value pixelated">{{ isInstance && instancePhysicalData ? instancePhysicalData.height + 'm' : formatRange(species.height || undefined, 'm') }}</span>
          <span
            v-if="isInstance && instancePhysicalData?.heightTier"
            class="physical-tier-badge pixelated"
            :class="instancePhysicalData.heightTier.cssClass"
          >{{ instancePhysicalData.heightTier.label }}</span>
        </div>
      </PVTooltip>

      <PVTooltip
        :title="isInstance && instancePhysicalData ? 'PESO: ' + instancePhysicalData.weight + 'kg (' + instancePhysicalData.weightTier.label + ')' : 'PESO (ESPECIE)'"
        :description="isInstance && instancePhysicalData ? instancePhysicalData.weightTooltip : createSpeciesDimensionTooltip('PESO', 'kg', Array.isArray(species.weight) ? species.weight[0] : (species.weight || null))"
        position="top"
        tag="div"
        class="info-item"
      >
        <span class="upd-info-label pixelated">PESO</span>
        <div class="physical-val-wrapper">
          <span class="ps-info-value pixelated">{{ isInstance && instancePhysicalData ? instancePhysicalData.weight + 'kg' : formatRange(species.weight || undefined, 'kg') }}</span>
          <span
            v-if="isInstance && instancePhysicalData?.weightTier"
            class="physical-tier-badge pixelated"
            :class="instancePhysicalData.weightTier.cssClass"
          >{{ instancePhysicalData.weightTier.label }}</span>
        </div>
      </PVTooltip>
    </div>

    <div
      v-if="isInstance"
      class="instance-status-section"
    >
      <PokemonStatusSection
        v-if="targetPokemon"
        :pokemon="targetPokemon"
        :context="context"
      />
    </div>

    <p class="description">
      {{ species.description || 'No hay datos disponibles en la Pokédex.' }}
    </p>

    <!-- Competition Trophies History Section in Summary (After description, before DB IDs) -->
    <div
      v-if="isInstance"
      class="summary-trophies-section"
    >
      <div class="summary-trophies-header pixelated">
        <span class="emoji">🏆</span>
        <span class="trophies-header-title">HISTORIAL DE COMPETENCIAS</span>
        <span
          v-if="targetPokemon?.trophies && targetPokemon.trophies.length > 0"
          class="trophies-count-tag pixelated"
        >
          {{ targetPokemon.trophies.length }}
        </span>
      </div>

      <!-- Empty State in Summary -->
      <div
        v-if="!targetPokemon?.trophies || targetPokemon.trophies.length === 0"
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
          v-for="(trophy, idx) in targetPokemon.trophies"
          :key="`${trophy.eventId}-${trophy.categoryId}-${trophy.awardedAt}-${idx}`"
          class="summary-trophy-card"
          :class="getTrophyRankClass(trophy.rank)"
        >
          <span class="emoji">{{ getTrophyMedal(trophy.rank) }}</span>
          <div class="trophy-info-compact">
            <div class="trophy-top-line">
              <span class="trophy-event-name pixelated">{{ resolveTrophyEventName(trophy) }}</span>
              <span class="trophy-rank-label pixelated">{{ getTrophyRankLabel(trophy.rank) }}</span>
            </div>
            <div class="trophy-bottom-line">
              <span class="trophy-category-name pixelated">{{ trophy.categoryName }}</span>
              <span
                v-if="trophy.score !== undefined"
                class="trophy-score-value pixelated"
              >{{ trophy.score }} pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DB Info (UID + Capture Date) -->
    <div
      v-if="isInstance"
      class="db-info-section"
    >
      <div class="uid-display">
        <span class="upd-info-label pixelated">ID ÚNICO DB:</span>
        <span class="uid-value pixelated">{{ targetPokemon?.uid || 'N/A' }}</span>
      </div>
      <div
        v-if="captureDateFormatted"
        class="capture-date-display"
      >
        <span class="upd-info-label pixelated">CAPTURADO EL:</span>
        <span class="date-value pixelated">{{ captureDateFormatted.toUpperCase() }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../../styles/components/pokedex-detail" as *;
@use "../../styles/components/unified-pokemon-detail" as *;
</style>
