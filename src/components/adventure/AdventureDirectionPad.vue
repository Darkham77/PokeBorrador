<script setup lang="ts">
import { computed } from 'vue'
import MapCard from '@/components/map/MapCard.vue'
import type { MapLocation } from '@/types/pokemon/encounters'
import { gsapHover as vGsapHover } from '@/directives/gsapHover'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import type { DayPhase } from '@/logic/utils/timeUtils'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { AdventureNodeId } from '../../../test aventura/kantoGraph.ts'

interface ConnectionItem {
  target: AdventureNodeId
  mo?: string
  label: string
}

interface Props {
  adjacentConnections: {
    top: ConnectionItem[]
    bottom: ConnectionItem[]
    left: ConnectionItem[]
    right: ConnectionItem[]
  }
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
      <template
        v-for="conn in adjacentConnections.left"
        :key="conn.target"
      >
        <button
          :id="`adv-direction-left-btn-${conn.target}`"
          v-gsap-hover
          class="adv-manual-btn"
          :disabled="isTraveling || !hasHealthyTeam"
          @click="emit('travel', conn.target)"
        >
          <span class="emoji dir-icon">⬅️</span>
          <span class="dir-label">{{ conn.label }}</span>
          <span
            v-if="conn.mo"
            :class="['dir-mo', { 'mo-missing': !activeHMs.has(conn.mo) }]"
          >
            {{ conn.mo }}
          </span>
        </button>
      </template>
    </div>

    <!-- Center Column -->
    <div class="adv-manual-center">
      <!-- Top Section -->
      <div class="adv-manual-top">
        <template
          v-for="conn in adjacentConnections.top"
          :key="conn.target"
        >
          <button
            :id="`adv-direction-top-btn-${conn.target}`"
            v-gsap-hover
            class="adv-manual-btn"
            :disabled="isTraveling || !hasHealthyTeam"
            @click="emit('travel', conn.target)"
          >
            <div class="emoji dir-icon">
              ⬆️
            </div>
            <div class="dir-label">
              {{ conn.label }}
            </div>
            <div
              v-if="conn.mo"
              class="dir-mo"
              :class="{ 'mo-missing': !activeHMs.has(conn.mo) }"
            >
              {{ conn.mo }}
            </div>
          </button>
        </template>
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
        <template
          v-for="conn in adjacentConnections.bottom"
          :key="conn.target"
        >
          <button
            :id="`adv-direction-bottom-btn-${conn.target}`"
            v-gsap-hover
            class="adv-manual-btn"
            :disabled="isTraveling || !hasHealthyTeam"
            @click="emit('travel', conn.target)"
          >
            <p class="emoji dir-icon">
              ⬇️
            </p>
            <p class="dir-label">
              {{ conn.label }}
            </p>
            <p
              v-if="conn.mo"
              class="dir-mo"
              :class="!activeHMs.has(conn.mo) ? 'mo-missing' : ''"
            >
              {{ conn.mo }}
            </p>
          </button>
        </template>
      </div>
    </div>

    <!-- Right Column -->
    <div class="adv-manual-col adv-manual-right">
      <template
        v-for="conn in adjacentConnections.right"
        :key="conn.target"
      >
        <button
          :id="`adv-direction-right-btn-${conn.target}`"
          v-gsap-hover
          class="adv-manual-btn"
          :disabled="isTraveling || !hasHealthyTeam"
          @click="emit('travel', conn.target)"
        >
          <strong class="emoji dir-icon">➡️</strong>
          <strong class="dir-label">{{ conn.label }}</strong>
          <strong
            v-if="conn.mo"
            class="dir-mo"
            :class="[!activeHMs.has(conn.mo) && 'mo-missing']"
          >
            {{ conn.mo }}
          </strong>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/views/adventure/AdventureTestView.styles.manual.scss"></style>

