import { ref, computed, onUnmounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { getGraphEdges } from '../../../test aventura/kantoGraph.ts'
import type { GraphEdge } from '../../../test aventura/kantoGraph.ts'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { useMapStore } from '@/stores/map'
import { useShopStore } from '@/stores/inventory/shop'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { useAdventureCamera } from '@/composables/adventure/useAdventureCamera'
import type { MapLocation } from '@/types/pokemon/encounters'
import { useAdventureMinigames } from './useAdventureMinigames.ts'
import { useAdventureEvents } from './useAdventureEvents.ts'
import { useAdventureRouting } from './useAdventureRouting.ts'
import { useAdventureLayout } from './useAdventureLayout.ts'
import { useAdventurePassives } from './useAdventurePassives.ts'
import { useAdventureModalAnims } from './useAdventureModalAnims.ts'
import { getMapSpawnPoolData } from '@/logic/encounters/encounterHelpers'


const POKEMON_CENTER_NODES = new Set([
  'route2',          // Ciudad Verde / Plateada
  'route4',          // Centro Mt. Moon
  'route5',          // Ciudad Celeste
  'route6',          // Ciudad Carmín
  'route7',          // Ciudad Azulona
  'pokemon_tower',   // Pueblo Lavanda
  'safari_zone',     // Ciudad Fucsia
  'mansion',         // Isla Canela
  'route10',         // Centro Túnel Roca
  'route23'          // Meseta Añil
])

const CANVAS_W = 6400
const CANVAS_H = 4400
const CARD_W = 320
const CARD_H = 220

export function useAdventureSimulation() {
  const mapStore = useMapStore()
  const shopStore = useShopStore()
  const inventoryStore = useInventoryStore()
  const gameStore = useGameStore()
  const battleStore = useBattleStore()

  if (typeof gameStore.enterSandboxMode === 'function') {
    gameStore.enterSandboxMode()
  }

  const travelLog = ref<string[]>([])
  const injectedItems = ref<Set<string>>(new Set())
  const isPaused = ref(false)
  const travelProgress = ref(0)
  const currentSegmentIndex = ref(0)
  const lastStepPct = ref(0)
  const safeStepsRemaining = ref(0)
  const isArrivalEventPending = ref(false)
  const blockedConnections = ref<Set<string>>(new Set())

  let travelTween: gsap.core.Tween | null = null
  let markerTimeline: gsap.core.Timeline | null = null
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
    resumeTravelAfterEvent
  })

  const mapLocationsById = computed(() => {
    const map: Record<string, MapLocation> = {}
    for (const loc of FIRE_RED_MAPS) {
      map[loc.id] = loc as MapLocation
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
      const emptyPool: { generic: string[]; specific: string[]; rates: Record<string, number> } = { generic: [], specific: [], rates: {} }
      return emptyPool
    }

    const activeWeather = getRouteWeather(loc.id, mapStore.currentSeason.id, mapStore.currentEpochHour, mapStore.currentCycle)
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
    resumeTravelAfterEvent,
    cancelTravel,
    hasHealthyTeam,
    mapLocationsById,
    getSpawnPoolForMap,
    getTravelTween: () => travelTween,
    getMarkerTimeline: () => markerTimeline,
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

  function triggerExtraLoot(itemId: string, defaultQty: number = 1) {
    triggerExtraLootFn(itemId, defaultQty, inventoryStore, injectedItems, travelLog)
  }

  function getWeatherForMap(mapId: string): string {
    return mapStore.globalWeather || getRouteWeather(mapId, mapStore.currentSeason.id, mapStore.currentEpochHour, mapStore.currentCycle)
  }

  watch(showMarker, async (visible: boolean) => {
    if (glowPulseTween) {
      glowPulseTween.kill()
      glowPulseTween = null
    }
    if (visible) {
      await nextTick()
      if (glowMarkerRef.value) {
        gsap.set(glowMarkerRef.value, { scale: 1, opacity: 0.8 })
        glowPulseTween = gsap.to(glowMarkerRef.value, {
          scale: 2,
          opacity: 0.1,
          duration: 0.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1
        })
      }
    }
  })

  const startTravel = () => {
    calculateRoute()
    if (calculatedPath.value.length === 0) return

    activeSweetScent.value = false
    isTraveling.value = true
    isPaused.value = false
    travelProgress.value = 0
    currentSegmentIndex.value = 0
    lastStepPct.value = 0
    safeStepsRemaining.value = 0
    isArrivalEventPending.value = false
    blockedConnections.value = new Set()
    activeEvent.value = null
    showArchaeology.value = false
    showFishing.value = false
    minigamePokemon.value = null
    showMarker.value = true

    const originPos = nodePositions.value[originMap.value]
    if (originPos) {
      markerX.value = originPos.x + CARD_W / 2
      markerY.value = originPos.y + CARD_H / 2
      centerOnPoint(markerX.value, markerY.value, 0.5)
    }

    if (POKEMON_CENTER_NODES.has(originMap.value)) {
      shopStore.healAllPokemon(0)
      travelLog.value.push(`🏥 Centro Pokémon inicial: Tu equipo de pruebas ha sido completamente curado.`)
    }

    const baseSpeedMultiplier = 1 + activeTeamPassives.value.speedBonus
    const baseTimePerMap = Math.max(1, (isBikeActive.value ? 2 : 4) / baseSpeedMultiplier)
    const totalDuration = (calculatedPath.value.length - 1 || 1) * baseTimePerMap
    const stateObj = { val: 0 }

    travelLog.value.push(`Iniciando viaje de ${calculatedPath.value.length} tramos...`)

    if (markerTimeline) {
      markerTimeline.kill()
    }
    markerTimeline = gsap.timeline()
    const path = calculatedPath.value
    const segTime = baseTimePerMap
    const markerState = { mx: markerX.value, my: markerY.value }

    for (let i = 1; i < path.length; i++) {
      const targetPos = nodePositions.value[path[i]!]
      if (targetPos) {
        const targetCX = targetPos.x + CARD_W / 2
        const targetCY = targetPos.y + CARD_H / 2
        markerTimeline.to(
          markerState,
          {
            mx: targetCX,
            my: targetCY,
            duration: segTime,
            ease: 'power1.inOut',
            onUpdate() {
              markerX.value = markerState.mx
              markerY.value = markerState.my
              if (!isDragging.value) {
                jumpToPoint(markerState.mx, markerState.my)
              }
            },
          }
        )
      }
    }

    travelTween = gsap.to(stateObj, {
      val: 100,
      duration: totalDuration,
      ease: 'none',
      onUpdate: () => {
        const currentPct = Math.round(stateObj.val)
        travelProgress.value = currentPct
        const segmentProgress = 100 / (calculatedPath.value.length - 1 || 1)
        const nextTransitionVal = (currentSegmentIndex.value + 1) * segmentProgress

        if (stateObj.val >= nextTransitionVal && !isArrivalEventPending.value) {
          isArrivalEventPending.value = true
          const nextNodeId = calculatedPath.value[currentSegmentIndex.value + 1]!
          triggerRandomEvent(nextNodeId)
          return
        }

        if (isArrivalEventPending.value) return

        const segmentVal = stateObj.val - (currentSegmentIndex.value * segmentProgress)
        const currentSegmentPct = (segmentVal / segmentProgress) * 100
        const currentStepVal = Math.floor(currentSegmentPct / 5) * 5
        if (currentStepVal > lastStepPct.value) {
          lastStepPct.value = currentStepVal
          if (currentStepVal < 95) {
            if (safeStepsRemaining.value > 0) {
              safeStepsRemaining.value--
            } else {
              let chance = 0.15
              if (activeTravelModifiers.value.encounterRateMod !== 0) {
                chance = chance * (1 + (activeTravelModifiers.value.encounterRateMod / 100))
              }
              if (activeSweetScent.value) {
                chance += 0.50
              }
              if (Math.random() < chance) {
                safeStepsRemaining.value = 5
                triggerRandomEvent()
              }
            }
          }
        }
      }
    })
  }

  const triggerHeal = () => {
    if (isTraveling.value) return
    shopStore.healAllPokemon(0)
    travelLog.value.push(`🏥 ¡Tu equipo ha sido completamente curado en el Centro Pokémon!`)
  }

  const finishTravelAtNode = (nodeId: string) => {
    if (travelTween) { travelTween.kill(); travelTween = null }
    if (markerTimeline) { markerTimeline.kill(); markerTimeline = null }

    activeEvent.value = null
    isTraveling.value = false
    isPaused.value = false
    showMarker.value = false
    isArrivalEventPending.value = false

    const pos = nodePositions.value[nodeId]
    if (pos) {
      markerX.value = pos.x + CARD_W / 2
      markerY.value = pos.y + CARD_H / 2
      centerOnPoint(markerX.value, markerY.value, 0.6)
    }

    originMap.value = nodeId
    mapStore.currentMap = nodeId
    const nodeName = FIRE_RED_MAPS.find(m => m.id === nodeId)?.name || nodeId
    travelLog.value.push(`📍 Ubicación actual: ${nodeName}. El selector de origen ha sido actualizado.`)
    calculateRoute()
  }

  function resumeTravelAfterEvent() {
    if (!activeEvent.value) return
    travelLog.value.push(`✅ Evento resuelto: ${activeEvent.value.title}`)
    activeEvent.value = null

    if (!isTraveling.value || !travelTween) return

    if (isArrivalEventPending.value) {
      const path = calculatedPath.value
      const nextSegIdx = currentSegmentIndex.value + 1
      if (nextSegIdx < path.length) {
        const nextNodeId = path[nextSegIdx]!
        const nodeName = FIRE_RED_MAPS.find(m => m.id === nextNodeId)?.name || nextNodeId
        travelLog.value.push(`Entrando a: ${nodeName}`)

        if (POKEMON_CENTER_NODES.has(nextNodeId)) {
          shopStore.healAllPokemon(0)
          travelLog.value.push(`🏥 ¡Centro Pokémon visitado en ${nodeName}! Tu equipo de pruebas ha sido completamente curado.`)
        }

        currentSegmentIndex.value = nextSegIdx
        originMap.value = nextNodeId
        mapStore.currentMap = nextNodeId
      }

      lastStepPct.value = 0
      isArrivalEventPending.value = false

      if (currentSegmentIndex.value === path.length - 1) {
        finishTravelAtNode(destinationMap.value)
        travelLog.value.push('🎉 ¡Llegaste a tu destino con éxito!')
      } else {
        isPaused.value = false
        travelTween.resume()
        if (markerTimeline) markerTimeline.resume()
      }
    } else {
      isPaused.value = false
      travelTween.resume()
      if (markerTimeline) markerTimeline.resume()
    }
  }

  function cancelTravel() {
    const currentNodeId = calculatedPath.value[currentSegmentIndex.value] || originMap.value
    if (travelTween) { travelTween.kill(); travelTween = null }
    if (markerTimeline) { markerTimeline.kill(); markerTimeline = null }
    isTraveling.value = false
    isPaused.value = false
    travelProgress.value = 0
    activeEvent.value = null
    showMarker.value = false
    showArchaeology.value = false
    showFishing.value = false
    originMap.value = currentNodeId
    mapStore.currentMap = currentNodeId
    travelLog.value.push('❌ Viaje cancelado por el usuario.')
    travelLog.value.push(`📍 Ubicación actual: ${FIRE_RED_MAPS.find(m => m.id === currentNodeId)?.name || currentNodeId}.`)
    calculateRoute()
  }

  const moLabels: Record<string, string> = {
    surf: '🌊 Surf',
    cut: '✂️ Corte',
    strength: '💪 Fuerza',
    flash: '💡 Flash',
    rock_smash: '🪨 G.Roca',
    waterfall: '🌊 Cascada',
    fly: '🕊️ Vuelo',
  }

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
    moLabels,
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
