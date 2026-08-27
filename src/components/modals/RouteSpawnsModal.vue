<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import { useModalStore } from '@/stores/modals'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import type { DayPhase } from '@/logic/utils/timeUtils'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import { toPokemonType } from '@/data/battle/types'
import { isMapExtortable } from '@/logic/map/mapCardHelper'
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

const openPokemonDetail = (speciesId: string, isSeen: boolean) => {
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
          <span class="value">{{ weatherEmoji }} {{ weatherLabel }}</span>
        </div>
        <div class="info-item">
          <span class="label">Rango Nivel:</span>
          <span class="value">Nv. {{ map.lv[0] }}-{{ map.lv[1] }}</span>
        </div>
      </div>

      <!-- Terrain / Map features and Weather Effects card -->
      <div class="weather-effects-card">
        <!-- Left panel: Weather description & Type modifiers -->
        <div class="weather-panel-details">
          <div class="weather-header-line">
            <span class="weather-title-badge">{{ weatherEmoji }} EFECTOS EN COMBATE</span>
            <div
              v-if="parsedDescriptionLines.length"
              class="weather-desc-lines"
            >
              <div
                v-for="(line, lineIdx) in parsedDescriptionLines"
                :key="lineIdx"
                :class="['weather-desc-line', line.typeClass]"
              >
                <!-- Si tiene label/acción, lo mostramos con estilo de pill/label pixelado -->
                <div
                  v-if="line.label"
                  class="desc-line-label"
                >
                  <span class="desc-line-icon">
                    <template v-if="line.icon === 'block'">🚫 </template>
                    <template v-else>{{ line.icon }}</template>
                  </span>
                  <span class="desc-line-text">{{ line.label }}</span>
                </div>

                <div :class="[line.label ? 'desc-line-value' : 'desc-line-full']">
                  <template
                    v-for="(segment, idx) in line.segments"
                    :key="idx"
                  >
                    <PokemonTypeTag
                      v-if="segment.isType"
                      :type="toPokemonType(segment.type)"
                      size="ssm"
                      class="inline-type-tag"
                    />
                    <span v-else>{{ segment.text }}</span>
                  </template>
                </div>
              </div>
            </div>
            <span
              v-else
              class="weather-desc-line"
            >
              Sin efectos climáticos especiales en combate.
            </span>
          </div>

          <!-- Type modifiers tags lists (Map Spawns) -->
          <div
            v-if="weatherDetails?.modifiers"
            class="weather-modifiers-section"
          >
            <span class="weather-title-badge">⛅ APARICIÓN DE CLIMA</span>
            <div class="weather-type-modifiers">
              <div 
                v-if="weatherDetails.modifiers.boost?.length" 
                class="modifier-group boost"
              >
                <span class="group-label">▲ BONIFICACIÓN:</span>
                <div class="tags-row">
                  <PokemonTypeTag
                    v-for="t in weatherDetails.modifiers.boost"
                    :key="t"
                    :type="t"
                    size="ssm"
                  />
                </div>
              </div>

              <div 
                v-if="weatherDetails.modifiers.debuff?.length" 
                class="modifier-group debuff"
              >
                <span class="group-label">▼ PENALIZACIÓN:</span>
                <div class="tags-row">
                  <PokemonTypeTag
                    v-for="t in weatherDetails.modifiers.debuff"
                    :key="t"
                    :type="t"
                    size="ssm"
                  />
                </div>
              </div>

              <div 
                v-if="weatherDetails.modifiers.block?.length" 
                class="modifier-group block"
              >
                <span class="group-label">🚫 BLOQUEADO:</span>
                <div class="tags-row">
                  <PokemonTypeTag
                    v-for="t in weatherDetails.modifiers.block"
                    :key="t"
                    :type="t"
                    size="ssm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right panel: Terrain and features -->
        <div class="terrain-panel-details">
          <span class="terrain-title-badge">🗺️ CARACTERÍSTICAS</span>
          <div class="terrain-items">
            <div class="terrain-item">
              <span class="label">Entorno:</span>
              <span class="value">
                {{ terrainTags }}
              </span>
            </div>
            
            <!-- Active special route bonus indicators in route stats -->
            <div
              v-if="isOfficialRouteActive"
              class="terrain-item benefit-active-item"
            >
              <span class="label text-primary">📍 Ruta Oficial:</span>
              <span class="value text-primary font-bold">
                +1 REP por victoria (Restan: {{ timeRemainingText }})
              </span>
            </div>
            <div
              v-if="isExtortedRouteActive"
              class="terrain-item benefit-active-item"
            >
              <span class="label text-danger">🏴‍☠️ Extorsionada:</span>
              <span class="value text-danger font-bold">
                x1.5 ₽ por victoria (Restan: {{ timeRemainingText }})
              </span>
            </div>

            <div class="terrain-item">
              <span class="label">Caminar:</span>
              <span class="value">
                🚶 Caminando —
                <b :class="getProbClass(activeTerrestrialChance, baseTerrestrialChance)">{{ activeTerrestrialChance }}%</b>
                <span
                  style="font-size: 9px; margin-left: 4px;"
                  :class="getProbClass(activeTerrestrialChance, baseTerrestrialChance) || 'gray-text'"
                >
                  (Base: {{ baseTerrestrialChance }}%)
                </span>
              </span>
            </div>
            <div
              v-if="map.fishing"
              class="terrain-item"
            >
              <span class="label">Pesca:</span>
              <span class="value">
                🎣 Nv. {{ map.fishing.lv[0] }}-{{ map.fishing.lv[1] }} —
                <b :class="getProbClass(activeFishingChance, baseFishingChance)">{{ activeFishingChance }}%</b>
                <span
                  style="font-size: 9px; margin-left: 4px;"
                  :class="getProbClass(activeFishingChance, baseFishingChance) || 'gray-text'"
                >
                  (Base: {{ baseFishingChance }}%)
                </span>
              </span>
            </div>
            <div
              v-else
              class="terrain-item"
            >
              <span class="label">Pesca:</span>
              <span class="value gray-text">❌ No disponible</span>
            </div>

            <div
              v-if="map.archaeology"
              class="terrain-item"
            >
              <span class="label">Arqueología:</span>
              <span class="value">
                ⛏️ Nv. {{ map.archaeology.lv[0] }}-{{ map.archaeology.lv[1] }} —
                <b :class="getProbClass(activeArchaeologyChance, baseArchaeologyChance)">{{ activeArchaeologyChance }}%</b>
                <span
                  style="font-size: 9px; margin-left: 4px;"
                  :class="getProbClass(activeArchaeologyChance, baseArchaeologyChance) || 'gray-text'"
                >
                  (Base: {{ baseArchaeologyChance }}%)
                </span>
              </span>
            </div>
            <div
              v-else
              class="terrain-item"
            >
              <span class="label">Arqueología:</span>
              <span class="value gray-text">❌ No disponible</span>
            </div>

            <!-- Class specific button actions in RouteSpawnsModal -->
            <div
              v-if="isMapExtortable(map)"
              class="class-actions-container"
            >
              <!-- Entrenador activation action -->
              <template v-if="playerClass === 'entrenador'">
                <div
                  v-if="isOfficialRouteOnCooldown && !isOfficialRouteActive"
                  class="cooldown-tag"
                >
                  📍 Cooldown Oficial: {{ cooldownRemainingText }}
                </div>
                <button
                  v-else-if="!isOfficialRouteActive"
                  class="btn-vicio-info btn-vicio-sm w-full btn-establish-route"
                  @click.stop="toggleOfficialRoute"
                >
                  📍 MARCAR RUTA OFICIAL
                </button>
              </template>

              <!-- Rocket activation action -->
              <template v-if="playerClass === 'rocket'">
                <div
                  v-if="activeExtortedRouteId && activeExtortedRouteId !== map.id"
                  class="cooldown-tag"
                >
                  🏴‍☠️ Ya extorsionaste otra ruta hoy
                </div>
                <button
                  v-else-if="!isExtortedRouteActive"
                  class="btn-vicio-danger btn-vicio-sm w-full btn-establish-route"
                  @click.stop="toggleExtortion"
                >
                  🏴‍☠️ EXTORSIONAR RUTA
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Terrestrial Spawns List -->
      <RouteSpawnsTable
        title="🚶 ENCUENTROS TERRESTRES"
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
        title="🎣 ENCUENTROS DE PESCA"
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
        title="⛏️ RECOMPENSAS DE ARQUEOLOGÍA"
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
        title="👥 ENCUENTROS ESPECIALES Y NPCS"
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
