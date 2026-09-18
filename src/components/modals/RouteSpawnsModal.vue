<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import RouteSpawnsWeatherEffectsCard from './spawns/RouteSpawnsWeatherEffectsCard.vue'
import { useModalStore } from '@/stores/modals'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import type { DayPhase } from '@/logic/utils/timeUtils'
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { useRouteSpawnsCalculation } from '@/composables/modals/useRouteSpawnsCalculation'
import { useRoutePerks } from '@/composables/modals/useRoutePerks'
import RouteSpawnsTable from './RouteSpawnsTable.vue'

interface Props {
  show?: boolean
  map: MapLocation
  weather: WeatherId
  cycle: DayPhase
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const modalStore = useModalStore()

const mapRef = computed(() => props.map)

const {
  playerClass,
  isOfficialRouteActive,
  isExtortedRouteActive,
  activeExtortedRouteId,
  isOfficialRouteOnCooldown,
  cooldownRemainingText,
  timeRemainingText,
  toggleExtortion,
  toggleOfficialRoute
} = useRoutePerks({ map: mapRef })

const openPokemonDetail = (speciesId: PokemonSpeciesId, isSeen: boolean) => {
  if (!isSeen) return
  modalStore.open('PokemonDetail', { speciesId: requirePokemonSpeciesId(speciesId), context: 'pokedex' })
}

const cycleLabels: Record<DayPhase, string> = {
  morning: '🌅 Amanecer',
  day: '☀️ Día',
  dusk: '🌇 Ocaso',
  night: '🌙 Noche'
}

import type { NpcChanceInfo } from '@/logic/weather/weatherUtils'

const {
  weatherEmoji,
  weatherLabel,
  weatherDetails,
  parsedDescriptionLines,
  getStatusTooltip,
  wildSpawns,
  fishingSpawns,
  terrainTags,
  activeFishingChance,
  baseFishingChance,
  activeArchaeologyChance,
  baseArchaeologyChance,
  activeTerrestrialChance,
  baseTerrestrialChance,
  eventFishingMultiplier,
  eventArchaeologyMultiplier,
  getProbClass,
  getCategoryTooltip,
  archaeologyRewards,
  getWildSpawnTooltip,
  getFishingSpawnTooltip,
  getArchaeologySpawnTooltip,
  npcSpawns
} = useRouteSpawnsCalculation(props)

const typedNpcSpawns = computed<NpcChanceInfo[]>(() => npcSpawns.value)
</script>

<template>
  <BaseModal
    :show="show"
    :title="`ZONA SALVAJE: ${map.name.toUpperCase()}`"
    max-width="850px"
    type="center"
    @close="emit('close')"
  >
    <div class="route-spawns-modal-container">
      <!-- Info Header -->
      <div class="route-info-bar">
        <div class="info-item">
          <span class="label">Ciclo Actual:</span>
          <span class="value">{{ cycleLabels[cycle] || cycle }}</span>
        </div>
        <div class="info-item">
          <span class="label">Clima Activo:</span>
          <span class="value"><span class="emoji">{{ weatherEmoji }}</span> {{ weatherLabel }}</span>
        </div>
        <div class="info-item">
          <span class="label">Rango Nivel:</span>
          <span class="value">Nv. {{ map.lv[0] }}-{{ map.lv[1] }}</span>
        </div>
      </div>

      <!-- Terrain / Map features and Weather Effects card -->
      <RouteSpawnsWeatherEffectsCard
        :map="map"
        :weather-emoji="weatherEmoji"
        :parsed-description-lines="parsedDescriptionLines"
        :weather-details="weatherDetails"
        :terrain-tags="terrainTags"
        :is-official-route-active="isOfficialRouteActive"
        :is-extorted-route-active="isExtortedRouteActive"
        :time-remaining-text="timeRemainingText"
        :active-terrestrial-chance="activeTerrestrialChance"
        :base-terrestrial-chance="baseTerrestrialChance"
        :active-fishing-chance="activeFishingChance"
        :base-fishing-chance="baseFishingChance"
        :active-archaeology-chance="activeArchaeologyChance"
        :base-archaeology-chance="baseArchaeologyChance"
        :get-prob-class="getProbClass"
        :player-class="playerClass"
        :is-official-route-on-cooldown="isOfficialRouteOnCooldown"
        :cooldown-remaining-text="cooldownRemainingText"
        :active-extorted-route-id="activeExtortedRouteId"
        @toggle-official-route="toggleOfficialRoute"
        @toggle-extortion="toggleExtortion"
      />

      <!-- Terrestrial Spawns List -->
      <RouteSpawnsTable
        emoji="🚶"
        title="ENCUENTROS TERRESTRES"
        :probability="activeTerrestrialChance"
        :base-probability="baseTerrestrialChance"
        :items="wildSpawns"
        mode="pokemon"
        :prob-class="getProbClass(activeTerrestrialChance, baseTerrestrialChance)"
        :weather-emoji="weatherEmoji"
        :weather-label="weatherLabel"
        :get-status-tooltip="getStatusTooltip"
        :get-spawn-tooltip="getWildSpawnTooltip"
        @select-pokemon="openPokemonDetail"
      />

      <!-- Fishing Spawns List -->
      <RouteSpawnsTable
        v-if="fishingSpawns.length"
        emoji="🎣"
        title="ENCUENTROS DE PESCA"
        :probability="activeFishingChance"
        :base-probability="baseFishingChance"
        :event-multiplier="eventFishingMultiplier"
        :items="fishingSpawns"
        mode="pokemon"
        :prob-class="getProbClass(activeFishingChance, baseFishingChance)"
        :weather-emoji="weatherEmoji"
        :weather-label="weatherLabel"
        :get-status-tooltip="getStatusTooltip"
        :get-spawn-tooltip="getFishingSpawnTooltip"
        @select-pokemon="openPokemonDetail"
      />

      <!-- Archaeology Rewards List -->
      <RouteSpawnsTable
        v-if="archaeologyRewards.length"
        emoji="⛏️"
        title="RECOMPENSAS DE ARQUEOLOGÍA"
        :probability="activeArchaeologyChance"
        :base-probability="baseArchaeologyChance"
        :event-multiplier="eventArchaeologyMultiplier"
        :items="archaeologyRewards"
        mode="item"
        :prob-class="getProbClass(activeArchaeologyChance, baseArchaeologyChance)"
        :weather-emoji="weatherEmoji"
        :weather-label="weatherLabel"
        :get-category-tooltip="getCategoryTooltip"
        :get-item-tooltip="getArchaeologySpawnTooltip"
      />

      <!-- NPC / Special Encounters List -->
      <RouteSpawnsTable
        v-if="typedNpcSpawns && typedNpcSpawns.length"
        emoji="👥"
        title="ENCUENTROS ESPECIALES Y NPCS"
        :probability="0"
        :base-probability="0"
        :items="typedNpcSpawns"
        mode="npc"
        prob-class="info"
        weather-emoji=""
        weather-label=""
      />
    </div>
  </BaseModal>
</template>

<style src="./RouteSpawnsModal.styles.scss" scoped lang="scss"></style>
<style src="@/styles/components/_route-spawns-tables.scss" scoped lang="scss"></style>
