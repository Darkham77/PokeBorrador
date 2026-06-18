<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdventureSimulation } from '@/composables/adventure/useAdventureSimulation'
import { gsapHover as vGsapHover } from '@/directives/gsapHover'
import { gsapLoop as vGsapLoop } from '@/directives/gsapLoop'
import MapCard from '@/components/map/MapCard.vue'
import ArchaeologyModal from '@/components/modals/ArchaeologyModal.vue'
import FishingModal from '@/components/modals/FishingModal.vue'
import PreTravelModal from '@/components/adventure/PreTravelModal.vue'
import AdventureCheatPanel from '@/components/adventure/AdventureCheatPanel.vue'
import AdventureDirectionPad from '@/components/adventure/AdventureDirectionPad.vue'
import type { MapLocation } from '@/types/pokemon/encounters'
import PVTooltip from '@/components/common/PVTooltip.vue'
import BaseModal from '@/components/common/BaseModal.vue'

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
  glowMarkerRef,
  viewportRef,
  canvasRef,
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

// Binds template refs for TypeScript / compiler safety
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
viewportRef; canvasRef; glowMarkerRef;

onMounted(() => {
  const originPos = nodePositions.value[originMap.value]
  if (originPos) {
    jumpToPoint(originPos.x + CARD_W / 2, originPos.y + CARD_H / 2)
  }
})
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
        <span class="warning-icon">⚠️</span>
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
        <div class="adv-manual-sidebar">
          <div class="adv-panel adv-column adv-inventory-column">
            <h3 class="adv-pixel-text adv-column-title">
              MOs e Items
            </h3>
            <label class="adv-toggle-control">
              <input
                v-model="isBikeActive"
                type="checkbox"
              >
              <span class="adv-toggle-label">🚲 Bicicleta</span>
            </label>
            <div class="adv-hm-list">
              <button
                v-for="hm in ['cut', 'surf', 'strength', 'flash', 'rock_smash', 'waterfall', 'fly']"
                :key="hm"
                :class="['adv-hm-btn', { active: activeHMs.has(hm) }]"
                @click="toggleHM(hm)"
              >
                {{ (moLabels[hm] || hm) }}
              </button>
            </div>
          </div>
          
          <div
            class="adv-panel adv-column adv-team-passives-column"
            style="display: flex; flex-direction: column; gap: 8px;"
          >
            <h3
              class="adv-pixel-text adv-column-title"
              style="margin-bottom: 2px;"
            >
              Pasivas y Acciones
            </h3>
            <!-- Active Passives List -->
            <div
              class="adv-passives-list"
              style="display: flex; flex-direction: column; gap: 4px; font-size: 8px; font-family: var(--font-pixel);"
            >
              <div
                v-for="passive in activeTeamPassives.list"
                :key="passive.label"
                style="background: rgba(76,175,80,0.15); border: 1px solid #4caf50; padding: 4px; border-radius: 4px; display: flex; flex-direction: column; gap: 2px;"
              >
                <span style="color: #4caf50; font-weight: bold;">🌟 {{ passive.label }}</span>
                <span style="font-size: 6px; color: #ccc;">{{ passive.desc }}</span>
              </div>
              <div
                v-if="activeTeamPassives.list.length === 0"
                style="color: #888; font-size: 6px; text-align: center; padding: 6px;"
              >
                No hay pasivas de equipo activas.
              </div>
            </div>

            <!-- Active Field Moves Buttons -->
            <div
              class="adv-active-moves-list"
              style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;"
            >
              <button
                v-for="move in availableActiveMoves"
                :key="move.pokemonUid + move.moveName"
                class="adv-hm-btn"
                style="display: flex; align-items: center; justify-content: space-between; font-size: 8px; font-family: var(--font-pixel); padding: 4px 6px; width: 100%; text-align: left;"
                :disabled="move.pp <= 0"
                @click="useActiveRouteMove(move.pokemonUid, move.moveName)"
              >
                <span>{{ move.moveName.toLowerCase().includes('tele') ? '🔮' : '🌸' }} {{ move.moveName }} ({{ move.pokemonName }})</span>
                <span :style="{ color: move.pp > 0 ? '#ffcb05' : '#ef5350' }">PP {{ move.pp }}/{{ move.maxPP }}</span>
              </button>
            </div>
          </div>
          
          <!-- Sandbox Cheat Panel -->
          <AdventureCheatPanel
            v-model:injected-items="injectedItems"
            @add-log="(msg) => travelLog.push(msg)"
          />
          
          <div class="adv-panel adv-column adv-console-column">
            <h3 class="adv-pixel-text adv-column-title">
              Logs
            </h3>
            <div class="adv-log-lines">
              <div
                v-for="(log, idx) in travelLog"
                :key="idx"
                class="adv-log-line"
              >
                {{ log }}
              </div>
            </div>
            <button
              v-if="isTraveling"
              class="adv-btn-danger"
              style="margin-top: 10px; width: 100%; padding: 8px; font-family: var(--font-pixel); font-size: 8px;"
              @click="cancelTravel"
            >
              Cancelar Viaje 🛑
            </button>
          </div>
        </div>
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
              ➕
            </button>
            <button
              v-gsap-hover
              class="adv-zoom-btn"
              @click.stop="() => handleZoomOut()"
            >
              ➖
            </button>
            <button
              v-gsap-hover
              class="adv-zoom-btn"
              title="Centrar en mapa seleccionado"
              @click.stop="centerOnActiveNode"
            >
              🎯
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
                  :class="[
                    'edge-line',
                    {
                      'edge-on-path': isEdgeOnPath(edge.from, edge.to),
                      'edge-blocked': !isEdgeTraversable(edge),
                      'edge-mo': !!edge.mo,
                    }
                  ]"
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
                  :title="`Requisito: MO ${edge.mo.toUpperCase()} (${moLabels[edge.mo] || edge.mo})`"
                  :description="activeHMs.has(edge.mo) ? '▲ ¡Desbloqueado! Puedes transitar.' : '▼ Falta MO activada en tu equipo para pasar.'"
                  position="top"
                >
                  <div
                    v-gsap-hover
                    class="adv-mo-icon-bubble"
                    :class="{ 'mo-unlocked': activeHMs.has(edge.mo) }"
                  >
                    <span class="bubble-emoji">{{ edge.mo === 'surf' ? '🌊' : edge.mo === 'cut' ? '🌳' : edge.mo === 'strength' ? '🪨' : edge.mo === 'rock_smash' ? '🧱' : '🔑' }}</span>
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
                  class="adv-pc-icon-bubble"
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
              :class="{
                'is-origin': nodeId === originMap,
                'is-destination': nodeId === destinationMap,
                'is-on-path': pathSet.has(nodeId),
                'is-current': nodeId === currentMapId && isTraveling,
              }"
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

    <!-- Event Modal (Standard BaseModal) -->
    <BaseModal
      :show="!!activeEvent"
      :title="activeEvent?.title || ''"
      title-color="var(--yellow)"
      max-width="500px"
      variant="retro"
      @close="resolveEvent"
    >
      <div
        v-if="activeEvent"
        style="display: flex; flex-direction: column; gap: 12px; font-family: var(--font-pixel); font-size: 8px; text-align: center;"
      >
        <p
          class="adv-event-desc"
          style="line-height: 1.7; color: #c5c6c7; margin: 0;"
        >
          {{ activeEvent.desc }}
        </p>

        <div
          v-if="activeEvent.moRequired"
          class="adv-mo-status"
        >
          Requisito: <span :class="['adv-mo-badge', { ok: activeHMs.has(activeEvent.moRequired) }]">
            MO {{ activeEvent.moRequired.toUpperCase() }}
            ({{ activeHMs.has(activeEvent.moRequired) ? 'DISPONIBLE' : 'FALTANTE' }})
          </span>
        </div>

        <button
          v-if="activeEvent.type === 'combat_won'"
          class="btn-vicio-primary"
          style="width: 100%; padding: 10px; font-size: 8px;"
          @click="resumeTravelAfterEvent"
        >
          🚶 Continuar Viaje
        </button>
        <template v-else>
          <button
            v-if="!activeEvent.moRequired || activeHMs.has(activeEvent.moRequired)"
            class="btn-vicio-primary"
            style="width: 100%; padding: 10px; font-size: 8px;"
            @click="resolveEvent"
          >
            {{ activeEvent.type === 'obstacle_rock_smash' ? '⛏️ Excavar Fósil' : activeEvent.type === 'fishing' ? '🎣 Lanzar Caña' : activeEvent.type === 'obstacle_cut' ? '✂️ Cortar Arbusto' : activeEvent.type === 'obstacle_strength' ? '💪 Empujar Roca' : '⚔️ Combatir' }}
          </button>
          <button
            v-else
            class="btn-vicio-secondary"
            style="width: 100%; padding: 10px; font-size: 8px;"
            @click="resolveEvent"
          >
            🚶 Rodear Obstáculo
          </button>
        </template>
      </div>
    </BaseModal>

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

