<script setup lang="ts">
import type { ResolvedSubCompetition, SubCompetitionConfig } from '@/logic/events/eventEngine'
import type { EventRewardType } from '@/types/system/stores'
import { getSubCompDefaultIcon, getSubCompTitle } from './eventSubCompHelper'
import EventPodiumPrizesList from './EventPodiumPrizesList.vue'

interface Prize extends Record<string, unknown> { // open-record: Generic key-value data dictionary container
  type?: EventRewardType
  amount?: number
  qty?: number
  money?: number
  battleCoins?: number
  item?: string
  items?: Record<string, number>
  species?: string
  shiny?: boolean
  level?: number
}

interface Props {
  eventId: string
  subCompetitions: ResolvedSubCompetition[]
  prizes?: { first?: Prize, second?: Prize, third?: Prize } | null
}

const props = defineProps<Props>()

const getSubCompPrizes = (sub: SubCompetitionConfig): { first?: Prize, second?: Prize, third?: Prize } | null => {
  if (sub.prizes && (sub.prizes.first || sub.prizes.second || sub.prizes.third)) {
    return sub.prizes as { first?: Prize, second?: Prize, third?: Prize }
  }
  return props.prizes || null
}
</script>

<template>
  <!-- Sub-Competencias y Premios -->
  <div 
    v-if="subCompetitions.length" 
    class="event-section"
  >
    <div class="section-tag">
      <span class="emoji">🏆</span> SUB-COMPETENCIAS Y PREMIOS
    </div>
    <div class="sub-comp-rule-note">
      <span class="emoji">⚠️</span>
      <span>Cada Pokémon solo puede participar en una única categoría por evento.</span>
    </div>
    <div class="sub-competitions-container">
      <div 
        v-for="sub in subCompetitions" 
        :key="sub.id"
        class="sub-competition-detail-card"
      >
        <div class="sub-comp-header">
          <span class="emoji sub-comp-icon">{{ sub.icon || getSubCompDefaultIcon(sub.id) }}</span>
          <span class="sub-comp-name pixelated">{{ getSubCompTitle(props.eventId, sub) }}</span>
        </div>

        <!-- Prizes for this sub-competition -->
        <EventPodiumPrizesList
          :prizes="getSubCompPrizes(sub)"
          container-class="sub-prizes-list"
        />
      </div>
    </div>
  </div>

  <!-- Premios Globales Simples (si no hay sub-competencias) -->
  <div 
    v-else-if="prizes" 
    class="event-section"
  >
    <div class="section-tag">
      <span class="emoji">🏆</span> PREMIOS DEL PODIO
    </div>
    <EventPodiumPrizesList
      :prizes="props.prizes"
      container-class="prizes-container"
    />
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/EventDetailModal.styles.scss"></style>
