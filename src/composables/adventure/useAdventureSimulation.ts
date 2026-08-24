import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { getGraphEdges, isAdventureNodeId } from '../../../test aventura/kantoGraph.ts'
import type { AdventureNodeId, GraphEdge } from '../../../test aventura/kantoGraph.ts'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { useMapStore } from '@/stores/map'
import { useShopStore } from '@/stores/inventory/shop'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { requireWeatherSeasonId } from '@/data/world/weather-tables'
import { isMapRouteId, requireMapRouteId } from '@/data/world/map-assets'
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry'
import type { ItemId } from '@/data/inventory/items'
import { useAdventureCamera } from '@/composables/adventure/useAdventureCamera'
import type { MapLocation } from '@/types/pokemon/encounters'
import { useAdventureMinigames } from './useAdventureMinigames.ts'
import { useAdventureEvents } from './useAdventureEvents.ts'
import { useAdventureRouting } from './useAdventureRouting.ts'
import { useAdventureLayout } from './useAdventureLayout.ts'
import { useAdventurePassives } from './useAdventurePassives.ts'
import { useAdventureModalAnims } from './useAdventureModalAnims.ts'
import { useAdventureTravelLoop } from './useAdventureTravelLoop.ts'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { getMapSpawnPoolData } from '@/logic/encounters/encounterHelpers'
import {
  CANVAS_W,
  CANVAS_H,
  GLOW_MARKER_BASE_SCALE,
  GLOW_MARKER_BASE_OPACITY,
  GLOW_MARKER_PULSE_SCALE,
  GLOW_MARKER_PULSE_OPACITY,
  GLOW_MARKER_PULSE_DURATION_SEC,
  POKEMON_CENTER_NODES,
  MO_LABELS
} from './helpers/adventureSimulationConstants.ts'

export function useAdventureSimulation() {
  const mapStore = useMapStore()
  const shopStore = useShopStore()
  const inventoryStore = useInventoryStore()
  const gameStore = useGameStore()
  const battleStore = useBattleStore()

  function syncCurrentMapFromAdventureNode(nodeId: AdventureNodeId) {
    if (isMapRouteId(nodeId)) mapStore.currentMap = nodeId
  }

  if (typeof gameStore.enterSandboxMode === 'function') {
    gameStore.enterSandboxMode()
  }

  const travelLog = ref<string[]>([])
  const injectedItems = ref<Set<ItemId>>(new Set())
  const isPaused = ref(false)
  const travelProgress = ref(0)
  const currentSegmentIndex = ref(0)
  const lastStepPct = ref(0)
  const safeStepsRemaining = ref(0)
  const isArrivalEventPending = ref(false)
  const blockedConnections = ref<Set<string>>(new Set())

  let glowPulseTween: gsap.core.Tween | null = null

  const graphEdges = ref<GraphEdge[]>(getGraphEdges())
  const markerX = ref(0)
  const markerY = ref(0)
  const showMarker = ref(false)
  const glowMarkerRef = ref<HTMLElement | null>(null)
  const viewportRef = ref<HTMLElement | null>(null)
  const canvasRef = ref<HTMLElement | null>(null)

  const {
    cameraX,
    cameraY,
    cameraScale,
    isDragging,
    centerOnPoint,
    jumpToPoint,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    zoomIn,
    zoomOut
  } = useAdventureCamera({
    viewportRef,
    canvasRef,
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
  })

  const hasHealthyTeam = computed(() => {
    const team = gameStore.state.team || []
    return team.some(p => p && p.hp > 0)
  })

  // Routing composable setup
  const {
    originMap,
    destinationMap,
    activeHMs,
    showPreTravelModal,
    selectedTravelItems,
    pendingManualDestination,
    activeSweetScent,
    isTraveling,
    calculatedPath,
    hasBicycle,
    isBikeActive,
    toggleTravelItem,
    activeTravelModifiers,
    availableActiveMoves,
    useActiveRouteMove,
    startManualTravel,
    cancelPreTravel,
    confirmPreTravel,
    filteredBuffItems,
    toggleHM,
    calculateRoute
  } = useAdventureRouting({
    gameStore,
    mapStore,
    shopStore,
    inventoryStore,
    travelLog,
    hasHealthyTeam,
    startTravel: () => startTravel(),
    cancelTravel: () => cancelTravel()
  })

  // Minigame State
  const {
    showArchaeology,
    showFishing,
    minigamePokemon,
    startMinigame,
    handleMinigameWin,
    handleMinigameFail
  } = useAdventureMinigames({
    inventoryStore,
    injectedItems,
    travelLog,
    triggerExtraLoot,
    resumeTravelAfterEvent: () => resumeTravelAfterEvent()
  })

  const mapLocationsById = computed(() => {
    const map: Partial<Record<AdventureNodeId, MapLocation>> = {}
    for (const loc of FIRE_RED_MAPS) {
      if (isAdventureNodeId(loc.id)) map[loc.id] = loc
    }
    return map
  })

  // Layout calculations extraction
  const {
    nodePositions,
    validNodeIds,
    worldOverlayScale,
    pokemonCenterOverlays,
    adjacentConnections,
    pathSet,
    pathEdgeSet,
    isEdgeOnPath,
    isEdgeTraversable
  } = useAdventureLayout({
    cameraScale,
    calculatedPath,
    originMap,
    activeHMs,
    mapLocationsById
  })

  function getSpawnPoolForMap(loc: MapLocation) {
    if (!loc.wild) {
      const emptyPool: { generic: PokemonSpeciesId[]; specific: PokemonSpeciesId[]; rates: Partial<Record<PokemonSpeciesId, number>> } = { generic: [], specific: [], rates: {} }
      return emptyPool
    }

    const activeWeather = getRouteWeather(loc.id, requireWeatherSeasonId(mapStore.currentSeason.id), mapStore.currentEpochHour, mapStore.currentCycle)
    const { generic, specific, rates } = getMapSpawnPoolData(
      loc,
      mapStore.currentCycle || 'day',
      activeWeather || 'clear',
      []
    )

    return { generic, specific, rates }
  }


  const currentMapId = computed(() => {
    if (calculatedPath.value.length === 0) return originMap.value
    const idx = Math.min(currentSegmentIndex.value, calculatedPath.value.length - 1)
    return calculatedPath.value[idx] || originMap.value
  })

  // Events system extraction
  const {
    activeEvent,
    triggerRandomEvent,
    resolveEvent,
    triggerExplore,
    resolveCombatRouteEvent
  } = useAdventureEvents({
    isTraveling,
    isPaused,
    currentSegmentIndex,
    calculatedPath,
    currentMapId,
    originMap,
    activeHMs,
    travelLog,
    injectedItems,
    activeTravelModifiers,
    activeSweetScent,
    startMinigame,
    triggerExtraLoot,
    resumeTravelAfterEvent: () => resumeTravelAfterEvent(),
    cancelTravel: () => cancelTravel(),
    hasHealthyTeam,
    mapLocationsById,
    getSpawnPoolForMap,
    getTravelTween: () => getTravelTween(),
    getMarkerTimeline: () => getMarkerTimeline(),
    gameStore,
    battleStore,
    inventoryStore,
    shopStore,
    mapStore
  })

  // Watch for battle status completion to resolve adventure event
  watch(() => battleStore.isBattleActive, (isActive, wasActive) => {
    if (!isActive && wasActive && activeEvent.value?.type === 'combat') {
      const active = battleStore.state
      const fled = active?.fled || active?.playerFled || false
      const outcomeMessage = fled ? '💨 Huiste del combate.' : '⚔️ Combate finalizado.'
      resolveCombatRouteEvent(outcomeMessage)
    }
  })

  const { activeTeamPassives, triggerExtraLoot: triggerExtraLootFn } = useAdventurePassives(gameStore)

  function triggerExtraLoot(itemId: ItemId, defaultQty: number = 1) {
    triggerExtraLootFn(itemId, defaultQty, inventoryStore, injectedItems, travelLog)
  }

  function getWeatherForMap(mapId: AdventureNodeId): WeatherId {
    return mapStore.globalWeather
      ? requireWeatherId(mapStore.globalWeather)
      : getRouteWeather(requireMapRouteId(mapId), requireWeatherSeasonId(mapStore.currentSeason.id), mapStore.currentEpochHour, mapStore.currentCycle)
  }

  watch(showMarker, async (visible: boolean) => {
    if (glowPulseTween) {
      glowPulseTween.kill()
      glowPulseTween = null
    }
    if (visible) {
      await nextTick()
      if (glowMarkerRef.value) {
        gsap.set(glowMarkerRef.value, { scale: GLOW_MARKER_BASE_SCALE, opacity: GLOW_MARKER_BASE_OPACITY })
        glowPulseTween = gsap.to(glowMarkerRef.value, {
          scale: GLOW_MARKER_PULSE_SCALE,
          opacity: GLOW_MARKER_PULSE_OPACITY,
          duration: GLOW_MARKER_PULSE_DURATION_SEC,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        })
      }
    }
  })

  const triggerHeal = () => {
    if (isTraveling.value) return
    shopStore.healAllPokemon(0)
    travelLog.value.push(`🏥 ¡Tu equipo ha sido completamente curado en el Centro Pokémon!`)
  }

  const {
    getTravelTween,
    getMarkerTimeline,
    startTravel,
    finishTravelAtNode,
    resumeTravelAfterEvent,
    cancelTravel
  } = useAdventureTravelLoop({
    calculatedPath,
    originMap,
    destinationMap,
    isTraveling,
    isPaused,
    travelProgress,
    currentSegmentIndex,
    lastStepPct,
    safeStepsRemaining,
    isArrivalEventPending,
    blockedConnections,
    activeSweetScent,
    isBikeActive,
    activeTeamPassives,
    activeTravelModifiers,
    travelLog,
    showMarker,
    markerX,
    markerY,
    isDragging,
    nodePositions,
    centerOnPoint,
    jumpToPoint,
    calculateRoute,
    triggerRandomEvent: (dest) => triggerRandomEvent(dest),
    activeEvent,
    showArchaeology,
    showFishing,
    minigamePokemon,
    shopStore,
    syncCurrentMapFromAdventureNode
  })

  const { onModalEnter, onModalLeave } = useAdventureModalAnims()

  onUnmounted(() => {
    if (typeof gameStore.exitSandboxMode === 'function') {
      gameStore.exitSandboxMode()
    }
    if (battleStore.isBattleActive) {
      battleStore.state = null
      battleStore.fsm.transition('EXIT_BATTLE')
    }
  })

  return {
    originMap,
    destinationMap,
    isBikeActive,
    activeHMs,
    showPreTravelModal,
    selectedTravelItems,
    pendingManualDestination,
    activeSweetScent,
    isTraveling,
    isPaused,
    travelProgress,
    calculatedPath,
    currentSegmentIndex,
    lastStepPct,
    safeStepsRemaining,
    isArrivalEventPending,
    blockedConnections,
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
    cameraX,
    cameraY,
    cameraScale,
    isDragging,
    zoomIn,
    zoomOut,
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
    pathEdgeSet,
    toggleHM,
    calculateRoute,
    resolveEvent,
    triggerExplore,
    triggerHeal,
    handleMinigameWin,
    handleMinigameFail,
    finishTravelAtNode,
    resumeTravelAfterEvent,
    cancelTravel,
    moLabels: MO_LABELS,
    onModalEnter,
    onModalLeave,
    toggleTravelItem,
    activeTravelModifiers,
    activeTeamPassives,
    availableActiveMoves,
    useActiveRouteMove,
    gameStore,
    mapStore,
    POKEMON_CENTER_NODES,
    CANVAS_W,
    CANVAS_H,
    isEdgeOnPath,
    isEdgeTraversable,
    hasBicycle,
    jumpToPoint
  }
}
