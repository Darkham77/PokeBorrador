<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdventureSimulation } from '@/composables/adventure/useAdventureSimulation'
import { gsapHover as vGsapHover } from '@/directives/gsapHover'
import { gsapLoop as vGsapLoop } from '@/directives/gsapLoop'
import MapCard from '@/components/map/MapCard.vue'
import ArchaeologyModal from '@/components/modals/ArchaeologyModal.vue'
import FishingModal from '@/components/modals/FishingModal.vue'
import PreTravelModal from '@/components/adventure/PreTravelModal.vue'
import AdventureManualSidebar from '@/components/adventure/AdventureManualSidebar.vue'
import AdventureDirectionPad from '@/components/adventure/AdventureDirectionPad.vue'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { GraphEdge, AdventureNodeId } from '../../../test aventura/kantoGraph.ts'
import PVTooltip from '@/components/common/PVTooltip.vue'
import AdventureEventModal from '@/components/adventure/AdventureEventModal.vue'

const CARD_W = 320
const CARD_H = 220

const {
  originMap,
  destinationMap,
  isBikeActive,
  activeHMs,
  showPreTravelModal,
  selectedTravelItems,
  isTraveling,
  travelProgress,
  travelLog,
  injectedItems,
  activeEvent,
  showArchaeology,
  showFishing,
  minigamePokemon,
  graphEdges,
  markerX,
  markerY,
  showMarker,
  viewportRef,
  zoomIn,
  zoomOut,
  cameraX,
  cameraY,
  cameraScale,
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  hasHealthyTeam,
  nodePositions,
  mapLocationsById,
  getSpawnPoolForMap,
  getWeatherForMap,
  validNodeIds,
  worldOverlayScale,
  pokemonCenterOverlays,
  currentMapId,
  adjacentConnections,
  startManualTravel,
  cancelPreTravel,
  confirmPreTravel,
  filteredBuffItems,
  pathSet,
  toggleHM,
  resolveEvent,
  triggerExplore,
  triggerHeal,
  handleMinigameWin,
  handleMinigameFail,
  resumeTravelAfterEvent,
  cancelTravel,
  moLabels,
  toggleTravelItem,
  activeTeamPassives,
  availableActiveMoves,
  useActiveRouteMove,
  jumpToPoint,
  gameStore,
  mapStore,
  POKEMON_CENTER_NODES,
  CANVAS_W,
  CANVAS_H,
  isEdgeOnPath,
  isEdgeTraversable,
  hasBicycle
} = useAdventureSimulation()

const getZoomCenter = () => {
  const vp = viewportRef.value
  if (!vp) return undefined
  const cx = cameraX.value
  const cy = cameraY.value
  const scale = cameraScale.value
  const x = (vp.clientWidth / 2 - cx) / scale
  const y = (vp.clientHeight / 2 - cy) / scale
  return { x, y }
}

const handleZoomIn = () => {
  zoomIn(getZoomCenter)
}

const handleZoomOut = () => {
  zoomOut(getZoomCenter)
}

const centerOnActiveNode = () => {
  const originPos = nodePositions.value[originMap.value]
  if (originPos) {
    jumpToPoint(originPos.x + CARD_W / 2, originPos.y + CARD_H / 2)
  }
}

onMounted(() => {
  const originPos = nodePositions.value[originMap.value]
  if (originPos) {
    jumpToPoint(originPos.x + CARD_W / 2, originPos.y + CARD_H / 2)
  }
})

const MO_EMOJI_MAP: Record<string, string> = {
  surf: '🌊',
  cut: '🌳',
  strength: '🪨',
  rock_smash: '🧱'
}

function getMoEmoji(mo?: string): string {
  return (mo && MO_EMOJI_MAP[mo]) || '🔑'
}

function getMoTooltipTitle(mo: string): string {
  // domain-ok: UI display label for MO
  return `Requisito: MO ${mo.toUpperCase()} (${moLabels[mo] || mo})`
}

function getMoTooltipDesc(mo: string): string {
  return activeHMs.value.has(mo)
    ? '▲ ¡Desbloqueado! Puedes transitar.'
    : '▼ Falta MO activada en tu equipo para pasar.'
}

function isMoUnlocked(mo: string): boolean {
  return activeHMs.value.has(mo)
}

function getEdgeClass(edge: GraphEdge): Record<string, boolean> {
  return {
    'edge-on-path': isEdgeOnPath(edge.from, edge.to),
    'edge-blocked': !isEdgeTraversable(edge),
    'edge-mo': Boolean(edge.mo)
  }
}

function getNodeClass(nodeId: AdventureNodeId): Record<string, boolean> {
  return {
    'is-origin': nodeId === originMap.value,
    'is-destination': nodeId === destinationMap.value,
    'is-on-path': pathSet.value.has(nodeId),
    'is-current': nodeId === currentMapId.value && isTraveling.value
  }
}
</script>

<template>
  <div class="adv-test-container">
    <!-- Header -->
    <div class="adv-header-retro">
      <h1 class="adv-pixel-text">
        Simulador de Viaje y MOs
      </h1>
    </div>

    <div class="adv-main-content">
      <!-- Banner de Advertencia de Equipo sin Pokémon con Vida -->
      <div 
        v-if="!hasHealthyTeam" 
        v-gsap-loop="'pulse-shadow'"
        class="adv-team-warning-banner"
      >
        <span class="emoji warning-icon">⚠️</span>
        <span class="warning-text">Equipo debilitado o vacío. Añade o cura tus Pokémon en el panel de trucos para poder viajar o explorar.</span>
      </div>

      <!-- Upper Section: Manual Travel UI (50%) -->
      <div class="adv-top-half">
        <AdventureDirectionPad
          :adjacent-connections="adjacentConnections"
          :is-traveling="isTraveling"
          :has-healthy-team="hasHealthyTeam"
          :active-h-ms="activeHMs"
          :origin-map="originMap"
          :map-locations-by-id="mapLocationsById"
          :current-cycle="mapStore.currentCycle"
          :get-weather-for-map="getWeatherForMap"
          :get-spawn-pool-for-map="getSpawnPoolForMap"
          :pokemon-center-nodes="POKEMON_CENTER_NODES"
          @travel="startManualTravel"
          @explore="triggerExplore"
          @heal="triggerHeal"
        />

        <!-- Sidebar for Logs & MOs (inside top half, right side) -->
        <AdventureManualSidebar
          v-model:is-bike-active="isBikeActive"
          v-model:injected-items="injectedItems"
          :active-h-ms="activeHMs"
          :mo-labels="moLabels"
          :active-team-passives="activeTeamPassives"
          :available-active-moves="availableActiveMoves"
          :travel-log="travelLog"
          :is-traveling="isTraveling"
          @toggle-hm="toggleHM"
          @use-move="useActiveRouteMove"
          @add-log="(msg) => travelLog.push(msg)"
          @cancel-travel="cancelTravel"
        />
      </div>

      <!-- Lower Section: Camera Viewport with MapCard Canvas (50%) -->
      <div class="adv-bottom-half">
        <div
          ref="viewportRef"
          class="adv-viewport-camera"
          :class="{ 'is-dragging': isDragging }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointerleave="onPointerUp"
        >
          <div class="adv-zoom-controls">
            <button
              v-gsap-hover
              class="adv-zoom-btn"
              @click.stop="() => handleZoomIn()"
            >
              <span class="emoji">➕</span>
            </button>
            <button
              v-gsap-hover
              class="adv-zoom-btn"
              @click.stop="() => handleZoomOut()"
            >
              <span class="emoji">➖</span>
            </button>
            <button
              v-gsap-hover
              class="adv-zoom-btn"
              title="Centrar en mapa seleccionado"
              @click.stop="centerOnActiveNode"
            >
              <span class="emoji">🎯</span>
            </button>
          </div>

          <div
            ref="canvasRef"
            class="adv-canvas"
            :style="{
              width: `${CANVAS_W}px`,
              height: `${CANVAS_H}px`,
              transform: `translate(${cameraX}px, ${cameraY}px) scale(${cameraScale})`,
              transformOrigin: '0 0'
            }"
          >
            <!-- SVG Connection Lines (behind cards) -->
            <svg
              class="adv-connections-svg"
              :viewBox="`0 0 ${CANVAS_W} ${CANVAS_H}`"
              preserveAspectRatio="none"
            >
              <template
                v-for="edge in graphEdges"
                :key="`${edge.from}-${edge.to}`"
              >
                <line
                  v-if="nodePositions[edge.from] && nodePositions[edge.to]"
                  :x1="nodePositions[edge.from]!.x + CARD_W / 2"
                  :y1="nodePositions[edge.from]!.y + CARD_H / 2"
                  :x2="nodePositions[edge.to]!.x + CARD_W / 2"
                  :y2="nodePositions[edge.to]!.y + CARD_H / 2"
                  :class="['edge-line', getEdgeClass(edge)]"
                />
              </template>
            </svg>

            <!-- MO Obstacle Icons HTML Overlay (interactive tooltips and rich icons) -->
            <template
              v-for="edge in graphEdges"
              :key="'mo-icon-' + edge.from + '-' + edge.to"
            >
              <div
                v-if="edge.mo && nodePositions[edge.from] && nodePositions[edge.to]"
                class="adv-mo-obstacle-overlay"
                :style="{
                  left: `${(nodePositions[edge.from]!.x + nodePositions[edge.to]!.x + CARD_W) / 2}px`,
                  top: `${(nodePositions[edge.from]!.y + nodePositions[edge.to]!.y + CARD_H) / 2}px`,
                  '--world-overlay-scale': worldOverlayScale,
                }"
              >
                <PVTooltip
                  :title="getMoTooltipTitle(edge.mo)"
                  :description="getMoTooltipDesc(edge.mo)"
                  position="top"
                >
                  <div
                    v-gsap-hover
                    class="adv-mo-icon-bubble"
                    :class="{ 'mo-unlocked': isMoUnlocked(edge.mo) }"
                  >
                    <span class="bubble-emoji">{{ getMoEmoji(edge.mo) }}</span>
                  </div>
                </PVTooltip>
              </div>
            </template>

            <!-- Pokemon Center Overlays -->
            <template
              v-for="pc in pokemonCenterOverlays"
              :key="'pc-' + pc.id"
            >
              <div
                class="adv-pokemon-center-overlay"
                :style="{
                  left: `${pc.x}px`,
                  top: `${pc.y}px`,
                  '--world-overlay-scale': worldOverlayScale,
                }"
              >
                <div
                  v-gsap-loop="'pulse-shadow'"
                  class="emoji adv-pc-icon-bubble"
                >
                  🏥
                </div>
              </div>
            </template>

            <!-- MapCard Nodes -->
            <div
              v-for="nodeId in validNodeIds"
              :key="nodeId"
              class="adv-map-card-node clickable-node"
              :class="getNodeClass(nodeId)"
              :style="{
                left: `${nodePositions[nodeId]!.x}px`,
                top: `${nodePositions[nodeId]!.y}px`,
                width: `${CARD_W}px`,
                cursor: 'pointer'
              }"
              @click.stop="startManualTravel(nodeId)"
            >
              <MapCard
                :map="(mapLocationsById[nodeId] as MapLocation)"
                :is-locked="false"
                :cycle="mapStore.currentCycle"
                :weather="getWeatherForMap(nodeId)"
                :badge-count="8"
                :spawn-pool="getSpawnPoolForMap(mapLocationsById[nodeId] as MapLocation)"
                @navigate="startManualTravel(nodeId)"
              />
            </div>

            <!-- Travel Marker (HTML element) -->
            <div
              v-if="showMarker"
              class="adv-travel-marker"
              :style="{
                left: `${markerX}px`,
                top: `${markerY}px`,
              }"
            >
              <div class="marker-dot" />
              <div
                ref="glowMarkerRef"
                class="marker-glow"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Progress Bar -->
    <div
      v-if="isTraveling"
      class="adv-floating-progress"
    >
      <div class="adv-progress-bar">
        <div
          class="adv-progress-fill"
          :style="{ width: `${travelProgress}%` }"
        />
      </div>
      <div class="adv-progress-text adv-pixel-text">
        {{ travelProgress }}%
      </div>
    </div>

    <!-- Event Modal -->
    <AdventureEventModal
      :active-event="activeEvent"
      :active-h-ms="activeHMs"
      @resolve="resolveEvent"
      @resume="resumeTravelAfterEvent"
    />

    <!-- Pre-Travel Modal -->
    <PreTravelModal
      :show="showPreTravelModal"
      :has-bicycle="hasBicycle"
      :filtered-buff-items="filteredBuffItems"
      :selected-travel-items="selectedTravelItems"
      :inventory="gameStore.state.inventory || {}"
      @toggle-item="toggleTravelItem"
      @confirm="confirmPreTravel"
      @cancel="cancelPreTravel"
    />

    <!-- Minigame Modals -->
    <ArchaeologyModal
      v-if="minigamePokemon"
      :show="showArchaeology"
      :pokemon="minigamePokemon"
      @win="handleMinigameWin('archaeology')"
      @fail="handleMinigameFail('archaeology')"
      @close="showArchaeology = false"
    />
    <FishingModal
      v-if="minigamePokemon"
      :show="showFishing"
      :pokemon="minigamePokemon"
      :rarity="50"
      @win="handleMinigameWin('fishing')"
      @fail="handleMinigameFail('fishing')"
      @close="showFishing = false"
    />
  </div>
</template>

<style src="./AdventureTestView.styles.scss" lang="scss"></style>

