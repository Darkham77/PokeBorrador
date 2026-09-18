<script setup lang="ts">
import { computed } from 'vue'
import MapCard from '@/components/map/MapCard.vue'
import type { MapLocation } from '@/types/pokemon/encounters'
import { gsapHover as vGsapHover } from '@/directives/gsapHover'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import type { DayPhase } from '@/logic/utils/timeUtils'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { AdventureNodeId } from '../../../test aventura/kantoGraph.ts'
import type { CardinalDirection } from '@/types/system/game'
import AdventureDirectionButton from './AdventureDirectionButton.vue'
import type { DirectionConnectionItem } from './adventureDirectionTypes'

interface Props {
  adjacentConnections: Record<CardinalDirection, DirectionConnectionItem[]>
  isTraveling: boolean
  hasHealthyTeam: boolean
  activeHMs: Set<string>
  originMap: AdventureNodeId
  mapLocationsById: Partial<Record<AdventureNodeId, MapLocation>>
  currentCycle: DayPhase

  getWeatherForMap: (mapId: AdventureNodeId) => WeatherId
  getSpawnPoolForMap: (map: MapLocation) => { generic: PokemonSpeciesId[]; specific: PokemonSpeciesId[]; rates: Partial<Record<PokemonSpeciesId, number>> }
  pokemonCenterNodes: readonly AdventureNodeId[]
}

const props = defineProps<Props>()

const originLocation = computed(() => props.mapLocationsById[props.originMap] ?? null)
const isTravelDisabled = computed(() => props.isTraveling || !props.hasHealthyTeam)

const emit = defineEmits<{
  (e: 'travel', target: AdventureNodeId): void
  (e: 'explore'): void
  (e: 'heal'): void
}>()
</script>

<template>
  <div class="adv-manual-travel-arena">
    <!-- Left Column -->
    <div class="adv-manual-col adv-manual-left">
      <AdventureDirectionButton
        v-for="conn in adjacentConnections.left"
        :key="conn.target"
        direction="left"
        :conn="conn"
        :disabled="isTravelDisabled"
        :is-mo-missing="Boolean(conn.mo && !activeHMs.has(conn.mo))"
        @travel="emit('travel', $event)"
      />
    </div>

    <!-- Center Column -->
    <div class="adv-manual-center">
      <!-- Top Section -->
      <div class="adv-manual-top">
        <AdventureDirectionButton
          v-for="conn in adjacentConnections.top"
          :key="conn.target"
          direction="top"
          :conn="conn"
          :disabled="isTravelDisabled"
          :is-mo-missing="Boolean(conn.mo && !activeHMs.has(conn.mo))"
          @travel="emit('travel', $event)"
        />
      </div>

      <!-- Map Card Core Container -->
      <div class="adv-manual-card-container">
        <MapCard
          v-if="originLocation"
          :map="originLocation"
          :is-locked="false"
          :cycle="currentCycle"
          :weather="getWeatherForMap(originMap)"
          :forced-weather="getWeatherForMap(originMap)"
          :badge-count="8"
          :spawn-pool="getSpawnPoolForMap(originLocation)"
          @navigate="() => {}"
        />
        
        <!-- Actions Overlay -->
        <div
          v-if="!isTraveling"
          class="adv-card-actions-overlay"
        >
          <button 
            id="adv-direction-explore-btn"
            v-gsap-hover
            class="adv-action-btn explore-btn"
            :disabled="!hasHealthyTeam"
            @click="emit('explore')"
          >
            <span class="emoji">🔍</span> Explorar Zona
          </button>
          <button 
            v-if="pokemonCenterNodes.includes(originMap)"
            id="adv-direction-heal-btn"
            v-gsap-hover
            class="adv-action-btn heal-btn"
            @click="emit('heal')"
          >
            <span class="emoji">🏥</span> Centro Pokémon
          </button>
        </div>
      </div>

      <!-- Bottom Section -->
      <div class="adv-manual-bottom">
        <AdventureDirectionButton
          v-for="conn in adjacentConnections.bottom"
          :key="conn.target"
          direction="bottom"
          :conn="conn"
          :disabled="isTravelDisabled"
          :is-mo-missing="Boolean(conn.mo && !activeHMs.has(conn.mo))"
          @travel="emit('travel', $event)"
        />
      </div>
    </div>

    <!-- Right Column -->
    <div class="adv-manual-col adv-manual-right">
      <AdventureDirectionButton
        v-for="conn in adjacentConnections.right"
        :key="conn.target"
        direction="right"
        :conn="conn"
        :disabled="isTravelDisabled"
        :is-mo-missing="Boolean(conn.mo && !activeHMs.has(conn.mo))"
        @travel="emit('travel', $event)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/views/adventure/AdventureTestView.styles.manual.scss"></style>
