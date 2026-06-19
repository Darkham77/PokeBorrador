<script setup lang="ts">
import MapCard from '@/components/map/MapCard.vue'
import type { MapLocation } from '@/types/pokemon/encounters'
import { gsapHover as vGsapHover } from '@/directives/gsapHover'

interface ConnectionItem {
  target: string
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
  originMap: string
  mapLocationsById: Record<string, MapLocation>
  currentCycle: 'morning' | 'day' | 'dusk' | 'night'

  getWeatherForMap: (mapId: string) => string
  getSpawnPoolForMap: (map: MapLocation) => { generic: string[]; specific: string[]; rates: Record<string, number> }
  pokemonCenterNodes: Set<string>
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'travel', target: string): void
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
          v-gsap-hover
          class="adv-manual-btn"
          :disabled="isTraveling || !hasHealthyTeam"
          @click="emit('travel', conn.target)"
        >
          <span class="dir-icon">⬅️</span>
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
            v-gsap-hover
            class="adv-manual-btn"
            :disabled="isTraveling || !hasHealthyTeam"
            @click="emit('travel', conn.target)"
          >
            <div class="dir-icon">⬆️</div>
            <div class="dir-label">{{ conn.label }}</div>
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
          v-if="originMap && mapLocationsById[originMap]"
          :map="(mapLocationsById[originMap] as MapLocation)"
          :is-locked="false"
          :cycle="currentCycle"
          :weather="getWeatherForMap(originMap)"
          :forced-weather="getWeatherForMap(originMap)"
          :badge-count="8"
          :spawn-pool="getSpawnPoolForMap(mapLocationsById[originMap] as MapLocation)"
          @navigate="() => {}"
        />
        
        <!-- Actions Overlay -->
        <div
          v-if="!isTraveling"
          class="adv-card-actions-overlay"
        >
          <button 
            v-gsap-hover
            class="adv-action-btn explore-btn"
            :disabled="!hasHealthyTeam"
            @click="emit('explore')"
          >
            🔍 Explorar Zona
          </button>
          <button 
            v-if="pokemonCenterNodes.has(originMap)"
            v-gsap-hover
            class="adv-action-btn heal-btn"
            @click="emit('heal')"
          >
            🏥 Centro Pokémon
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
            v-gsap-hover
            class="adv-manual-btn"
            :disabled="isTraveling || !hasHealthyTeam"
            @click="emit('travel', conn.target)"
          >
            <p class="dir-icon">⬇️</p>
            <p class="dir-label">{{ conn.label }}</p>
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
          v-gsap-hover
          class="adv-manual-btn"
          :disabled="isTraveling || !hasHealthyTeam"
          @click="emit('travel', conn.target)"
        >
          <strong class="dir-icon">➡️</strong>
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
