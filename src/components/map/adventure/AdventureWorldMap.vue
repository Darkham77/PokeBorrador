<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, onActivated, nextTick } from 'vue'
import { gsap } from 'gsap'
import MapCard from '@/components/map/MapCard.vue'
import AdventureInventoryModal from './AdventureInventoryModal.vue'
import AdventureDebugModal from './AdventureDebugModal.vue'
import { useAdventureCapabilities } from './useAdventureCapabilities'

// Import Kanto Map Data
import { rawNodes, connections, officialMapIdMap, REVERSE_OFFICIAL_MAP_ID_MAP, type MapNode, type DijkstraPath, type AdventureDirection, type AdventureTerrain } from './adventureMapData'
import { getAdjacentNodes, getAlternativePaths } from './adventurePathfinding'

// Import Poké Vicio Stores and Data
import { useMapStore } from '@/stores/map'
import { useUIStore } from '@/stores/ui'
import { useShopStore } from '@/stores/inventory/shop'
import { useBattleStore } from '@/stores/battle/battle'
import { MAPS_BY_ROUTE_ID } from '@/data/world/maps'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { isWeatherTableRouteId, requireWeatherSeasonId } from '@/data/world/weather-tables'
import { isMapRouteId, requireMapRouteId, MAP_ROUTE_MAPPING, type MapRouteId } from '@/data/world/map-assets'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getMapSpawnPoolData } from '@/logic/encounters/encounterHelpers'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { useModalStore } from '@/stores/modals'
import { useGameStore } from '@/stores/game'
import { calculatePokemonCenterCooldown, pokemonNeedsHealing } from '@/logic/economy/economyFormulas'
import type { Pokemon } from '@/types/pokemon/pokemon'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const mapStore = useMapStore()
const uiStore = useUIStore()
const shopStore = useShopStore()
const modalStore = useModalStore()
const gameStore = useGameStore()

// Disable low power mode in the adventure view to ensure backgrounds are pre-rendered and kept warm
uiStore.lowPowerMode = 'disabled'

// Ported constants
const SPACING_MULTIPLIER = 2.5
const WORLD_WIDTH = 3600
const WORLD_HEIGHT = 4600

const baseWalkSpeed = 520
const baseBikeSpeed = 1000
const flySpeed = 2400

function getOptimalParkedScale(): number {
  if (!viewport.value) return 1.3
  const vpW = viewport.value.clientWidth || window.innerWidth
  const vpH = viewport.value.clientHeight || window.innerHeight
  // Target: MapCard (250px wide) fits comfortably occupying ~84% of narrow width or ~65% of height
  const targetCardWidth = Math.min(vpW * 0.84, vpH * 0.65, 360)
  const scale = targetCardWidth / 250
  return Math.min(Math.max(scale, 0.8), 1.5)
}

const KANTO_TOTAL_WIDTH = 2600
const KANTO_TOTAL_HEIGHT = 3500

function getMinZoomScale(): number {
  if (!viewport.value) return 0.4
  const vpW = viewport.value.clientWidth || window.innerWidth
  const vpH = viewport.value.clientHeight || window.innerHeight
  // Zoom out stops when EITHER the whole width OR the whole height fits comfortably
  const scaleW = vpW / KANTO_TOTAL_WIDTH
  const scaleH = vpH / KANTO_TOTAL_HEIGHT
  const fitScale = Math.max(scaleW, scaleH)
  return Math.min(Math.max(fitScale, 0.35), 0.8)
}

function getMaxZoomScale(): number {
  return 2.4
}

function getOptimalMapScale(): number {
  if (!viewport.value) return 0.75
  const vpW = viewport.value.clientWidth || window.innerWidth
  if (vpW < 500) return Math.max(0.55, getMinZoomScale())
  if (vpW < 800) return Math.max(0.65, getMinZoomScale())
  return Math.max(0.75, getMinZoomScale())
}

const lastMousePos = ref<{ x: number; y: number } | null>(null)

function applyFocalZoom(focalX: number, focalY: number, newScale: number, smooth = false) {
  const clampedScale = Math.min(Math.max(newScale, getMinZoomScale()), getMaxZoomScale())
  if (Math.abs(clampedScale - currentScale.value) < 0.001) return

  const focalWorldX = (focalX - currentPanX.value) / currentScale.value
  const focalWorldY = (focalY - currentPanY.value) / currentScale.value

  currentScale.value = clampedScale
  currentPanX.value = focalX - (focalWorldX * clampedScale)
  currentPanY.value = focalY - (focalWorldY * clampedScale)

  if (isZoomedIn.value) {
    isZoomedIn.value = false
    setStatus('Modo Libre', true)
  }

  clampCamera()
  updateCameraTransform(smooth)
}

function getZoomFocalPoint(): { x: number; y: number } {
  const vp = viewport.value
  const vpW = vp?.clientWidth || window.innerWidth
  const vpH = vp?.clientHeight || window.innerHeight

  if (
    lastMousePos.value &&
    lastMousePos.value.x >= 0 &&
    lastMousePos.value.x < vpW - 70 &&
    lastMousePos.value.y >= 0 &&
    lastMousePos.value.y <= vpH
  ) {
    return lastMousePos.value
  }

  return { x: vpW / 2, y: vpH / 2 }
}

function zoomIn() {
  if (isMoving.value) return
  const focal = getZoomFocalPoint()
  const targetScale = currentScale.value * 1.25
  applyFocalZoom(focal.x, focal.y, targetScale, true)
}

function zoomOut() {
  if (isMoving.value) return
  const focal = getZoomFocalPoint()
  const targetScale = currentScale.value * 0.8
  applyFocalZoom(focal.x, focal.y, targetScale, true)
}

function handleWheelZoom(e: WheelEvent) {
  if (isMoving.value) return
  e.preventDefault()
  lastMousePos.value = { x: e.clientX, y: e.clientY }
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85
  const newScale = currentScale.value * zoomFactor
  applyFocalZoom(e.clientX, e.clientY, newScale, false)
}

function handleMouseMove(e: MouseEvent) {
  lastMousePos.value = { x: e.clientX, y: e.clientY }
}

// Reactive State
const { playerCapabilitiesRecord } = useAdventureCapabilities()

const playerInventory = ref<Record<string, boolean>>(
  JSON.parse(localStorage.getItem('pokeVicioInventory') || '{"Corte":false,"Surf":false,"Flauta":false,"Medallas":false,"Vuelo":false,"Bicicleta":true}')
)

watch(playerCapabilitiesRecord, (caps) => {
  for (const [key, val] of Object.entries(caps)) {
    if (val) playerInventory.value[key] = true
  }
}, { immediate: true })
const defaultAllNodes = Object.keys(rawNodes) // no-domain
const savedDiscovered = localStorage.getItem('pokeVicioDiscovered')
const initialDiscovered = savedDiscovered ? JSON.parse(savedDiscovered) : [...defaultAllNodes] // no-domain
const discoveredNodes = ref<string[]>(initialDiscovered) // no-domain
const activeCompanion = ref<string>(localStorage.getItem('pokeVicioCompanion') || 'none')

// Initialize current node from mapStore or localStorage
const initialNode = (() => {
  const currentOfficial = mapStore.currentMap
  if (currentOfficial && REVERSE_OFFICIAL_MAP_ID_MAP[currentOfficial]) {
    return REVERSE_OFFICIAL_MAP_ID_MAP[currentOfficial]
  }
  return localStorage.getItem('pokeVicioLocation') || 'pallet'
})()

if (!discoveredNodes.value.includes(initialNode)) {
  discoveredNodes.value.push(initialNode)
}

const currentNode = ref<string>(initialNode)

watch(() => mapStore.currentMap, (newOfficial) => {
  if (newOfficial && REVERSE_OFFICIAL_MAP_ID_MAP[newOfficial]) {
    const localId = REVERSE_OFFICIAL_MAP_ID_MAP[newOfficial]
    if (currentNode.value !== localId) {
      currentNode.value = localId
      if (!discoveredNodes.value.includes(localId)) {
        discoveredNodes.value.push(localId)
      }
      enterParkedMode()
    }
  }
})

const isMoving = ref(false)
const isZoomedIn = ref(true)
const isPlanning = ref(false)
const playerDirection = ref<AdventureDirection>('down')
const activeTravelTerrain = ref<AdventureTerrain>('land')

const playerSpriteTransform = computed(() => {
  return 'scaleX(1)'
})

const walkFrame = ref(0)

const isSurfing = computed(() => {
  if (isMoving.value) {
    return activeTravelTerrain.value === 'water'
  }
  const node = mapNodes.value[currentNode.value]
  if (!node) return false
  return node.type === 'route_water' || currentNode.value === 'seafoam'
})

const currentScale = ref(1.3)
const cardScale = computed(() => {
  const calculated = 0.85 / currentScale.value
  return Math.min(Math.max(calculated, 0.4), 0.85)
})
const currentPanX = ref(0)
const currentPanY = ref(0)

const currentPlanPaths = ref<DijkstraPath[]>([])
const selectedPlanIndex = ref(0)
const planningTarget = ref<string | null>(null)

const activePlanStats = computed(() => {
  const p = currentPlanPaths.value[selectedPlanIndex.value]
  return p ? calculateRouteStats(p.nodes) : { t: 0, w: 0, m: 0, f: 0 }
})

// DOM refs
const worldContainer = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const playerToken = ref<HTMLElement | null>(null)
const playerTokenPos = ref<{ x: number; y: number }>({ x: 625, y: 3625 })
const previewLinesSvg = ref<SVGElement | null>(null)

const mapNodes = computed(() => {
  const result: Record<string, MapNode> = {}
  for (const [key, node] of Object.entries(rawNodes)) {
    result[key] = { ...node, x: node.x * SPACING_MULTIPLIER, y: node.y * SPACING_MULTIPLIER }
  }
  return result
})

const cityDescriptions: Record<string, string> = {
  pallet: 'El comienzo de tu viaje.',
  viridian: 'La ciudad del eterno verdor.',
  pewter: 'Una ciudad gris y de roca.',
  cerulean: 'Rodeada de un halo azulado.',
  vermilion: 'El puerto de los bellos atardeceres.',
  lavender: 'Un pueblo tranquilo y espiritual.',
  celadon: 'La ciudad de los arcoíris y sueños.',
  saffron: 'La gran metrópolis dorada.',
  fuchsia: 'Una ciudad histórica y salvaje.',
  cinnabar: 'La isla del conocimiento ardiente.',
  indigo: 'La cumbre de la Liga Pokémon.'
}

const emptySpecies: PokemonSpeciesId[] = []
const emptyRates: number[] = []

const emptyWild = {
  morning: emptySpecies,
  day: emptySpecies,
  dusk: emptySpecies,
  night: emptySpecies
}

const emptyWildRates = {
  morning: emptyRates,
  day: emptyRates,
  dusk: emptyRates,
  night: emptyRates
}

const mapLocationsById = computed(() => {
  const map: Record<string, MapLocation> = {}
  for (const [localId, officialId] of Object.entries(officialMapIdMap)) {
    const rawNode = rawNodes[localId]
    if (rawNode && (rawNode.type === 'city' || rawNode.type === 'league')) {
      const validRouteId: MapRouteId = isMapRouteId(officialId) ? officialId : 'route1'
      map[localId] = {
        id: validRouteId,
        name: rawNode.name,
        icon: rawNode.type === 'league' ? '🏆' : '🏙️',
        badges: 0,
        desc: cityDescriptions[localId] || (rawNode.type === 'league' ? 'La cumbre de la Liga Pokémon.' : 'Centro urbano de Kanto.'),
        wild: emptyWild,
        rates: emptyWildRates,
        lv: [1, 1],
        weather: {}
      }
      continue
    }

    if (isMapRouteId(officialId)) {
      const loc = MAPS_BY_ROUTE_ID[officialId]
      if (loc) {
        if (localId === 'billshouse') {
          map[localId] = {
            ...loc,
            name: 'Casa de Bill',
            icon: '🏠',
            desc: 'El laboratorio e investigación del Coleccionista Bill.'
          }
        } else {
          map[localId] = loc
        }
        continue
      }
    }
  }
  return map
})

const currentCycle = computed(() => mapStore.currentCycle || 'day')

// Atmosphere/Weather helper
function getWeatherForMap(nodeId: string): WeatherId {
  const rawOfficialId = officialMapIdMap[nodeId] || nodeId
  if (!isMapRouteId(rawOfficialId)) return 'clear'
  const officialId = requireMapRouteId(rawOfficialId)
  if (mapStore.globalWeather) return mapStore.globalWeather
  if (!isWeatherTableRouteId(officialId)) return 'clear'
  const seasonId = mapStore.currentSeason?.id ? requireWeatherSeasonId(mapStore.currentSeason.id) : 'spring'
  return getRouteWeather(officialId, seasonId, mapStore.currentEpochHour, currentCycle.value)
}

const emptySpawnPool = {
  generic: emptySpecies,
  specific: emptySpecies,
  rates: {}
}

// Spawn pool helper
function getSpawnPoolForMap(nodeId: string) {
  const loc = mapLocationsById.value[nodeId]
  if (!loc || !loc.wild) return emptySpawnPool

  const activeWeather = getWeatherForMap(nodeId)
  return getMapSpawnPoolData(
    loc,
    currentCycle.value,
    activeWeather,
    []
  )
}

function getNodeIcon(node: MapNode, id: string): string {
  if (id === 'billshouse') return '🏠'
  if (node.type === 'league') return '🏆'
  if (node.type === 'city') return '🏙️'
  if (node.type === 'route_water') return '🌊'
  if (node.type === 'poi') return '⛰️'
  return '🌿'
}

function getNodeImage(id: string): string {
  const rawOfficialId = officialMapIdMap[id] || id
  if (isMapRouteId(rawOfficialId)) {
    const mapAssetId = MAP_ROUTE_MAPPING[rawOfficialId]
    if (mapAssetId.startsWith('/')) return mapAssetId
    return getAssetUrl(ASSET_TYPES.MAP, mapAssetId, {
      cycle: currentCycle.value,
      isLowPower: false
    })
  }
  const fallbackAssetId = id === 'billshouse' ? 'route25' : 'ruta1'
  return getAssetUrl(ASSET_TYPES.MAP, fallbackAssetId, {
    cycle: currentCycle.value,
    isLowPower: false
  })
}

// Day/Night overlay color
const dayNightOverlayColor = ref('transparent')
function updateDayNightCycle() {
  const hour = new Date().getHours()
  if (hour >= 20 || hour < 6) dayNightOverlayColor.value = 'rgba(0, 0, 30, 0.45)'
  else if (hour >= 18 && hour < 20) dayNightOverlayColor.value = 'rgba(255, 100, 0, 0.15)' 
  else dayNightOverlayColor.value = 'transparent'
}

// Status message state
const statusText = ref('Estacionado')
const statusDotClass = ref('bg-green-400')

function setStatus(text: string, isMovingState = false) {
  statusText.value = text
  statusDotClass.value = isMovingState ? 'bg-yellow-400' : 'bg-green-400'
}

// Alert Modals
const alertOpen = ref(false)
const alertMsg = ref('')
const showActionAlert = (msg: string) => { alertMsg.value = msg; alertOpen.value = true }
const closeAlert = () => { alertOpen.value = false }

const alertIsHeal = computed(() => alertMsg.value.includes('sanos') || alertMsg.value.includes('Turururu'))
const alertIsBlock = computed(() => alertMsg.value.includes('bloqueado') || alertMsg.value.includes('ZONA DESCONOCIDA') || alertMsg.value.includes('MO'))
const alertIsCheat = computed(() => alertMsg.value.includes('Cheat'))

const alertTitle = computed(() => {
  if (alertIsHeal.value) return 'CENTRO POKÉMON'
  if (alertIsBlock.value) return 'AVISO DE VIAJE'
  if (alertIsCheat.value) return 'HERRAMIENTA DEBUG'
  return 'AVISO DE AVENTURA'
})

const alertIcon = computed(() => {
  if (alertIsHeal.value) return '💖'
  if (alertIsBlock.value) return '🚧'
  if (alertIsCheat.value) return '⚙️'
  return '📢'
})

const alertThemeClass = computed(() => {
  if (alertIsHeal.value) return 'border-pink'
  if (alertIsBlock.value) return 'border-amber'
  if (alertIsCheat.value) return 'border-purple'
  return 'border-blue'
})

const alertHeaderClass = computed(() => {
  if (alertIsHeal.value) return 'header-pink'
  if (alertIsBlock.value) return 'header-amber'
  if (alertIsCheat.value) return 'header-purple'
  return 'header-blue'
})

const alertBtnClass = computed(() => {
  if (alertIsHeal.value) return 'btn-pink'
  if (alertIsBlock.value) return 'btn-amber'
  if (alertIsCheat.value) return 'btn-purple'
  return 'btn-blue'
})

function setCompanion(comp: string) {
  activeCompanion.value = comp
  localStorage.setItem('pokeVicioCompanion', comp)
  updatePlayerVisuals()
}

function updateInventory(item: string, value: boolean) {
  playerInventory.value[item] = value
  localStorage.setItem('pokeVicioInventory', JSON.stringify(playerInventory.value))
  if (item === 'Bicicleta' && !isMoving.value) updatePlayerVisuals()
  if (isPlanning.value) cancelPlanning()
}

// Player visuals
const updatePlayerVisuals = () => {
  walkFrame.value = (playerInventory.value['Bicicleta'] && !isSurfing.value) ? 0 : 1
}

// Modals toggles
const showInventoryModal = ref(false)
const showRadarModal = ref(false)
const showDebugModal = ref(false)

const toggleInventoryModal = () => { showInventoryModal.value = !showInventoryModal.value }
const toggleRadarModal = () => { showRadarModal.value = !showRadarModal.value }
const toggleDebugModal = () => { showDebugModal.value = !showDebugModal.value }

// Camera control
function updateCameraTransform(smooth = false) {
  if (!worldContainer.value) return
  worldContainer.value.style.transition = smooth ? 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
  worldContainer.value.style.transform = `translate3d(${currentPanX.value}px, ${currentPanY.value}px, 0) scale(${currentScale.value})`
}

function clampCamera() {
  if (!viewport.value) return
  const vpWidth = viewport.value.clientWidth || window.innerWidth
  const vpHeight = viewport.value.clientHeight || window.innerHeight

  // Bounding box of Kanto nodes in canvas pixels (raw * 2.5)
  // minX=625, maxX=3125, minY=750, maxY=4125
  const padding = 150 * currentScale.value
  const minNodeX = 625 * currentScale.value - padding
  const maxNodeX = 3125 * currentScale.value + padding
  const minNodeY = 750 * currentScale.value - padding
  const maxNodeY = 4125 * currentScale.value + padding

  const minX = (vpWidth / 2) - maxNodeX
  const maxX = (vpWidth / 2) - minNodeX

  const minY = (vpHeight / 2) - maxNodeY
  const maxY = (vpHeight / 2) - minNodeY

  currentPanX.value = Math.max(minX, Math.min(maxX, currentPanX.value))
  currentPanY.value = Math.max(minY, Math.min(maxY, currentPanY.value))
}

function centerCameraOn(x: number, y: number, smooth = true, customScale: number | null = null) {
  if (!viewport.value) return
  if (customScale !== null) currentScale.value = customScale
  const centerYOffset = 30
  const vpWidth = viewport.value.clientWidth || window.innerWidth
  const vpHeight = viewport.value.clientHeight || window.innerHeight
  currentPanX.value = (vpWidth / 2) - (x * currentScale.value)
  currentPanY.value = (vpHeight / 2 + centerYOffset) - (y * currentScale.value)
  clampCamera()
  updateCameraTransform(smooth)
}

// Parked mode setup
function enterParkedMode() {
  isZoomedIn.value = true
  isPlanning.value = false
  setStatus('Estacionado', false)
  
  const targetScale = getOptimalParkedScale()
  const node = mapNodes.value[currentNode.value]
  if (node) {
    playerTokenPos.value = { x: node.x, y: node.y }
    if (playerToken.value) {
      playerToken.value.style.left = `${node.x}px`
      playerToken.value.style.top = `${node.y}px`
    }
    centerCameraOn(node.x, node.y, true, targetScale)
  }
}

function exitParkedMode() {
  isZoomedIn.value = false
  setStatus('Modo Libre', true)
  const targetScale = getOptimalMapScale()
  const node = mapNodes.value[currentNode.value]
  if (node) {
    centerCameraOn(node.x, node.y, true, targetScale)
  }
}

// Drag & Multi-Touch Pinch Zoom logic (Unified Pointer Architecture)
const activePointers = new Map<number, { x: number, y: number }>()

const dragState = {
  isDragging: false,
  isPointerDown: false,
  initialClickX: 0,
  initialClickY: 0,
  dragStartX: 0,
  dragStartY: 0
}

const pinchState = {
  initialDist: 0,
  initialScale: 1.0,
  focalWorldX: 0,
  focalWorldY: 0
}

function handlePointerDown(e: PointerEvent) {
  if (isMoving.value) return
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (activePointers.size === 1) {
    dragState.isPointerDown = true
    dragState.isDragging = false
    dragState.initialClickX = e.clientX
    dragState.initialClickY = e.clientY
    dragState.dragStartX = e.clientX - currentPanX.value
    dragState.dragStartY = e.clientY - currentPanY.value
  } else if (activePointers.size === 2) {
    dragState.isDragging = false
    dragState.isPointerDown = false
    const pts = Array.from(activePointers.values())
    const p1 = pts[0]
    const p2 = pts[1]
    if (p1 && p2) {
      pinchState.initialDist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      pinchState.initialScale = currentScale.value
      
      const midScreenX = (p1.x + p2.x) / 2
      const midScreenY = (p1.y + p2.y) / 2

      pinchState.focalWorldX = (midScreenX - currentPanX.value) / currentScale.value
      pinchState.focalWorldY = (midScreenY - currentPanY.value) / currentScale.value

      if (isZoomedIn.value && !isPlanning.value) {
        isZoomedIn.value = false
        setStatus('Modo Libre', true)
      }
    }
  }
}

function handlePointerMove(e: PointerEvent) {
  if (e.pointerType === 'mouse') {
    lastMousePos.value = { x: e.clientX, y: e.clientY }
  }
  if (!activePointers.has(e.pointerId)) return
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (activePointers.size === 2 && pinchState.initialDist > 0) {
    // Multi-touch Pinch Zoom centered between the two fingers
    const pts = Array.from(activePointers.values())
    const p1 = pts[0]
    const p2 = pts[1]
    if (p1 && p2) {
      const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      const scaleFactor = currentDist / pinchState.initialDist
      const targetScale = pinchState.initialScale * scaleFactor
      const currentMidScreenX = (p1.x + p2.x) / 2
      const currentMidScreenY = (p1.y + p2.y) / 2
      applyFocalZoom(currentMidScreenX, currentMidScreenY, targetScale, false)
    }
  } else if (activePointers.size === 1 && dragState.isPointerDown) {
    // Single finger drag
    const dx = e.clientX - dragState.initialClickX
    const dy = e.clientY - dragState.initialClickY
    if (!dragState.isDragging && Math.hypot(dx, dy) > 6) {
      dragState.isDragging = true
      if (isZoomedIn.value && !isPlanning.value) {
        isZoomedIn.value = false
        setStatus('Modo Libre', true)
      }
    }
    if (dragState.isDragging) {
      currentPanX.value = e.clientX - dragState.dragStartX
      currentPanY.value = e.clientY - dragState.dragStartY
      clampCamera()
      updateCameraTransform(false)
    }
  }
}

function handlePointerUp(e: PointerEvent) {
  activePointers.delete(e.pointerId)
  if (activePointers.size === 0) {
    dragState.isPointerDown = false
    pinchState.initialDist = 0
    setTimeout(() => { dragState.isDragging = false }, 200)
  } else if (activePointers.size === 1) {
    // Transition smoothly back to 1-finger drag
    const remaining = Array.from(activePointers.values())[0]
    if (remaining) {
      dragState.initialClickX = remaining.x
      dragState.initialClickY = remaining.y
      dragState.dragStartX = remaining.x - currentPanX.value
      dragState.dragStartY = remaining.y - currentPanY.value
      dragState.isDragging = false
    }
  }
}

function handlePointerCancel(e: PointerEvent) {
  handlePointerUp(e)
}

function handleNodeClick(id: string) {
  if (isMoving.value) return
  if (isZoomedIn.value && !isPlanning.value && currentNode.value === id) {
    exploreZone()
  } else {
    planTravel(id)
  }
}

// Travel confirms
function travelToAdjacent(targetId: string) {
  if (isMoving.value) return
  const targetNode = mapNodes.value[targetId]
  if (!targetNode) return

  if (targetNode.requiresMO && !playerInventory.value[targetNode.requiresMO]) { 
    showActionAlert(targetNode.blockMsg || 'Camino bloqueado.')
    return
  }

  currentPlanPaths.value = [{ nodes: [currentNode.value, targetId], cost: 0, isFly: false }]
  selectedPlanIndex.value = 0
  planningTarget.value = targetId
  updateFacingDirectionForPath([currentNode.value, targetId])
  
  confirmTravel()
}

// GPS / Planning
function updateFacingDirectionForPath(pathNodes: string[]) {
  if (pathNodes.length < 2) return
  const idA = pathNodes[0]
  const idB = pathNodes[1]
  const nA = idA ? mapNodes.value[idA] : undefined
  const nB = idB ? mapNodes.value[idB] : undefined
  if (nA && nB) {
    const angle = Math.atan2(nB.y - nA.y, nB.x - nA.x) * (180 / Math.PI)
    if (angle >= -45 && angle < 45) playerDirection.value = 'right'
    else if (angle >= 45 && angle < 135) playerDirection.value = 'down'
    else if (angle >= -135 && angle < -45) playerDirection.value = 'up'
    else playerDirection.value = 'left'
  }
}

function planTravel(targetId: string) {
  if (targetId === currentNode.value) {
    if (!isZoomedIn.value) enterParkedMode()
    return
  }
  
  const targetNode = mapNodes.value[targetId]
  if (!targetNode) return

  if (!discoveredNodes.value.includes(targetId)) {
    const isAdjacent = getAdjacentNodes(currentNode.value, connections).includes(targetId)
    if (!isAdjacent) {
      showActionAlert("🗺️ ZONA DESCONOCIDA\n\nNo puedes usar el GPS hacia zonas inexploradas. Descúbrela viajando a pie desde una ruta conectada.")
      return
    }
  }

  if (targetNode.requiresMO && !playerInventory.value[targetNode.requiresMO]) {
    showActionAlert(targetNode.blockMsg || 'Camino bloqueado.')
    return
  }

  let canFly = playerInventory.value['Vuelo'] && (targetNode.type === 'city' || targetNode.type === 'league')
  if (canFly && !discoveredNodes.value.includes(targetId)) canFly = false

  const groundPaths = getAlternativePaths(currentNode.value, targetId, mapNodes.value, playerInventory.value, discoveredNodes.value, connections)
  const paths: DijkstraPath[] = [...groundPaths]

  if (canFly && !getAdjacentNodes(currentNode.value, connections).includes(targetId)) {
    paths.push({ nodes: [currentNode.value, targetId], cost: 0, isFly: true })
  }

  if (paths.length === 0) {
    showActionAlert("Camino bloqueado. Necesitas una MO.")
    return
  }

  currentPlanPaths.value = paths
  isPlanning.value = true
  isZoomedIn.value = false
  selectedPlanIndex.value = 0
  planningTarget.value = targetId

  const firstPath = paths[0]
  if (firstPath) updateFacingDirectionForPath(firstPath.nodes)
  
  setStatus(`Planificando...`, true)
  updatePlanUI()
}

function calculateRouteStats(nodesInPath: string[]) {
  const sums = { t: 0, w: 0, m: 0, f: 0 }
  for (let i = 1; i < nodesInPath.length; i++) {
    const nId = nodesInPath[i]
    if (!nId) continue
    const node = mapNodes.value[nId]
    if (!node) continue
    const f = node.farm || { t: 0, w: 0, m: 0, f: 0 }
    sums.t = Math.max(sums.t, f.t)
    sums.w = Math.max(sums.w, f.w)
    sums.m = Math.max(sums.m, f.m)
    sums.f = Math.max(sums.f, f.f)
  }
  if (activeCompanion.value === 'pikachu') sums.t = Math.min(100, Math.floor(sums.t * 1.5))
  if (activeCompanion.value === 'meowth') sums.m = Math.min(100, Math.floor(sums.m * 1.5))
  if (activeCompanion.value === 'squirtle') sums.f = Math.min(100, Math.floor(sums.f * 1.5))
  return sums
}

function updatePlanUI() {
  const currentPath = currentPlanPaths.value[selectedPlanIndex.value]
  if (!currentPath) return

  drawPreviewPath(currentPath.nodes, !!currentPath.isFly)
  zoomToFitPath(currentPath.nodes)
}

function zoomToFitPath(nodesIds: string[]) {
  if (!viewport.value) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodesIds.forEach(id => {
    const n = mapNodes.value[id]
    if (!n) return
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y
  })

  // Add node card extent padding (130px) so card edges are fully framed
  const cardRadius = 130
  minX -= cardRadius
  maxX += cardRadius
  minY -= cardRadius
  maxY += cardRadius

  const pathWidth = maxX - minX
  const pathHeight = maxY - minY

  // Exact screen padding in pixels to avoid UI collisions
  const screenPaddingTop = 140     // Clears top HUD + chips
  const screenPaddingBottom = 330  // Clears bottom planning panel (~300px)
  const screenPaddingLeft = 40
  const screenPaddingRight = 40

  // Calculate available screen space
  const availWidth = Math.max(200, viewport.value.clientWidth - (screenPaddingLeft + screenPaddingRight))
  const availHeight = Math.max(200, viewport.value.clientHeight - (screenPaddingTop + screenPaddingBottom))

  // Calculate scale needed to fit the path within the available space
  const baseMapScale = getOptimalMapScale()
  const scaleX = pathWidth > 0 ? availWidth / pathWidth : baseMapScale
  const scaleY = pathHeight > 0 ? availHeight / pathHeight : baseMapScale

  let newScale = Math.min(scaleX, scaleY, baseMapScale)
  newScale = Math.max(newScale, 0.40) // Keep clean framing without excessive zoom-out

  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2

  const destNodeId = nodesIds[nodesIds.length - 1]
  const destNode = destNodeId ? mapNodes.value[destNodeId] : undefined
  const isDestAtTop = destNode ? Math.abs(destNode.y - minY) < Math.abs(destNode.y - maxY) : true

  let y_center = midY

  if (pathHeight * newScale > availHeight) {
    if (isDestAtTop) {
      y_center = minY + (viewport.value.clientHeight / 2 - screenPaddingTop) / newScale
    } else {
      y_center = maxY - (viewport.value.clientHeight / 2 - screenPaddingBottom) / newScale
    }
  } else {
    const screenShiftY = (screenPaddingBottom - screenPaddingTop) / 2
    y_center = midY + screenShiftY / newScale
  }

  centerCameraOn(midX, y_center, true, newScale)
}

function nextAlternative() {
  selectedPlanIndex.value = (selectedPlanIndex.value + 1) % currentPlanPaths.value.length
  const currentPath = currentPlanPaths.value[selectedPlanIndex.value]
  if (currentPath) updateFacingDirectionForPath(currentPath.nodes)
  updatePlanUI()
}

function drawPreviewPath(nodeIds: string[], isFly: boolean) {
  if (!previewLinesSvg.value) return
  previewLinesSvg.value.innerHTML = ''
  for (let i = 0; i < nodeIds.length - 1; i++) {
    const idA = nodeIds[i]
    const idB = nodeIds[i + 1]
    if (!idA || !idB) continue
    const nA = mapNodes.value[idA]
    const nB = mapNodes.value[idB]
    if (!nA || !nB) continue
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', String(nA.x))
    line.setAttribute('y1', String(nA.y))
    line.setAttribute('x2', String(nB.x))
    line.setAttribute('y2', String(nB.y))
    line.setAttribute('stroke', isFly ? '#60A5FA' : '#FBBF24')
    line.setAttribute('stroke-width', '18')
    line.setAttribute('stroke-linecap', 'round')
    line.setAttribute('stroke-linejoin', 'round')
    line.setAttribute('class', isFly ? 'preview-line-fly' : 'preview-line')
    previewLinesSvg.value.appendChild(line)
  }
}

function drawRemainingRouteTrail(
  currentX: number,
  currentY: number,
  activeLegIdx: number,
  legs: Array<{ startX: number, startY: number, endX: number, endY: number, terrain?: AdventureTerrain, isFly?: boolean }>
) {
  if (!previewLinesSvg.value) return
  previewLinesSvg.value.innerHTML = ''

  const activeLeg = legs[activeLegIdx]
  if (!activeLeg) return

  // 1. Line from current sprite position to end of active leg
  const firstLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  firstLine.setAttribute('x1', String(Math.round(currentX)))
  firstLine.setAttribute('y1', String(Math.round(currentY)))
  firstLine.setAttribute('x2', String(activeLeg.endX))
  firstLine.setAttribute('y2', String(activeLeg.endY))
  firstLine.setAttribute('stroke', activeLeg.isFly ? '#60A5FA' : '#FBBF24')
  firstLine.setAttribute('stroke-width', '18')
  firstLine.setAttribute('stroke-linecap', 'round')
  firstLine.setAttribute('stroke-linejoin', 'round')
  firstLine.setAttribute('class', activeLeg.isFly ? 'preview-line-fly' : 'preview-line')
  previewLinesSvg.value.appendChild(firstLine)

  // 2. Draw all subsequent legs ahead in full
  for (let i = activeLegIdx + 1; i < legs.length; i++) {
    const l = legs[i]
    if (!l) continue
    const nextLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    nextLine.setAttribute('x1', String(l.startX))
    nextLine.setAttribute('y1', String(l.startY))
    nextLine.setAttribute('x2', String(l.endX))
    nextLine.setAttribute('y2', String(l.endY))
    nextLine.setAttribute('stroke', l.isFly ? '#60A5FA' : '#FBBF24')
    nextLine.setAttribute('stroke-width', '18')
    nextLine.setAttribute('stroke-linecap', 'round')
    nextLine.setAttribute('stroke-linejoin', 'round')
    nextLine.setAttribute('class', l.isFly ? 'preview-line-fly' : 'preview-line')
    previewLinesSvg.value.appendChild(nextLine)
  }
}

function cancelPlanning() {
  isPlanning.value = false
  if (previewLinesSvg.value) previewLinesSvg.value.innerHTML = ''
  enterParkedMode()
}

// Move execution
const travelProgressText = ref('0%')
const isTravelingProgressActive = ref(false)

async function confirmTravel() {
  const pathData = currentPlanPaths.value[selectedPlanIndex.value]
  if (!pathData || !pathData.nodes || pathData.nodes.length < 2) return

  const idA = pathData.nodes[0]
  const idB = pathData.nodes[1]
  const firstNode = idA ? mapNodes.value[idA] : undefined
  const secondNode = idB ? mapNodes.value[idB] : undefined
  if (firstNode && secondNode) {
    const initDx = secondNode.x - firstNode.x
    const initDy = secondNode.y - firstNode.y
    const angle = Math.atan2(initDy, initDx) * (180 / Math.PI)
    if (angle >= -45 && angle < 45) playerDirection.value = 'right'
    else if (angle >= 45 && angle < 135) playerDirection.value = 'down'
    else if (angle >= -135 && angle < -45) playerDirection.value = 'up'
    else playerDirection.value = 'left'
  }

  isPlanning.value = false
  isMoving.value = true
  isTravelingProgressActive.value = true

  if (pathData.isFly) {
    setStatus(`Volando...`, true)
  } else {
    setStatus(playerInventory.value['Bicicleta'] ? `Viajando Rápido...` : `Caminando...`, true)
    updatePlayerVisuals()
  }

  await animateFullRoute(pathData.nodes, !!pathData.isFly)

  isMoving.value = false
  isTravelingProgressActive.value = false

  if (pathData.isFly) updatePlayerVisuals()

  const finalNode = pathData.nodes[pathData.nodes.length - 1]
  if (finalNode) {
    currentNode.value = finalNode
    localStorage.setItem('pokeVicioLocation', finalNode)

    const finalNodeObj = mapNodes.value[finalNode]
    if (finalNodeObj?.hasEvent) {
      setTimeout(() => showActionAlert(`¡Oye! Tienes un evento pendiente en ${finalNodeObj.name}.`), 800)
    }
  }

  // 1. Settle camera & player token cleanly into destination parked mode
  enterParkedMode()

  // 2. Sync with official game map navigation (which may trigger wild/trainer encounter)
  if (finalNode) {
    const rawOfficialId = officialMapIdMap[finalNode]
    if (rawOfficialId && isMapRouteId(rawOfficialId)) {
      const routeId = requireMapRouteId(rawOfficialId)
      if (MAPS_BY_ROUTE_ID[routeId]) {
        await mapStore.navigate(routeId)
      }
    }
  }
}

function preloadTrainerSprites() {
  const directions = ['down', 'up', 'left', 'right'] as const satisfies readonly AdventureDirection[]
  const types = ['walk', 'bike', 'surf', 'fly'] as const
  for (const type of types) {
    for (const dir of directions) {
      for (let f = 0; f < 3; f++) {
        const img = new Image()
        img.src = type === 'walk'
          ? `/assets/sprites/trainers/red_walk_${dir}_${f}.png`
          : `/assets/sprites/trainers/red_${type}_${dir}_${f}_v3.png`
      }
    }
  }
}

function animateFullRoute(nodes: string[], isFlying: boolean) {
  return new Promise<void>(resolve => {
    if (nodes.length < 2) {
      resolve()
      return
    }

    const travelScale = getOptimalMapScale()
    currentScale.value = travelScale

    const vpWidth = viewport.value ? viewport.value.clientWidth : window.innerWidth
    const vpHeight = viewport.value ? viewport.value.clientHeight : window.innerHeight

    const getClampedPan = (nodeX: number, nodeY: number) => {
      const scaledW = WORLD_WIDTH * travelScale
      const scaledH = WORLD_HEIGHT * travelScale
      const minX = scaledW <= vpWidth ? (vpWidth - scaledW) / 2 : vpWidth - scaledW
      const maxX = scaledW <= vpWidth ? (vpWidth - scaledW) / 2 : 0
      const minY = scaledH <= vpHeight ? (vpHeight - scaledH) / 2 : vpHeight - scaledH
      const maxY = scaledH <= vpHeight ? (vpHeight - scaledH) / 2 : 0

      const centerYOffset = 30
      const rawX = (vpWidth / 2) - (nodeX * travelScale)
      const rawY = (vpHeight / 2 + centerYOffset) - (nodeY * travelScale)
      return {
        x: Math.max(minX, Math.min(maxX, rawX)),
        y: Math.max(minY, Math.min(maxY, rawY))
      }
    }

    const speed = isFlying ? flySpeed : (playerInventory.value['Bicicleta'] ? baseBikeSpeed : baseWalkSpeed)
    const isBike = !!playerInventory.value['Bicicleta'] && !isSurfing.value

    interface RouteLeg {
      startId: string
      endId: string
      startX: number
      startY: number
      endX: number
      endY: number
      dx: number
      dy: number
      duration: number
      startTime: number
      endTime: number
      dir: AdventureDirection
      terrain: AdventureTerrain
      progressPct: number
    }

    const legs: RouteLeg[] = []
    let totalTime = 0

    for (let i = 0; i < nodes.length - 1; i++) {
      const startId = nodes[i]
      const endId = nodes[i + 1]
      if (!startId || !endId) continue
      const start = mapNodes.value[startId]
      const end = mapNodes.value[endId]
      if (!start || !end) continue

      const dx = end.x - start.x
      const dy = end.y - start.y
      const dist = Math.hypot(dx, dy)
      const duration = Math.max(0.12, dist / speed)

      const dir: AdventureDirection = (() => {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)
        if (angle >= -45 && angle < 45) return 'right'
        if (angle >= 45 && angle < 135) return 'down'
        if (angle >= -135 && angle < -45) return 'up'
        return 'left'
      })()
      const terrain: AdventureTerrain = (start.type === 'route_water' || startId === 'seafoam' || end.type === 'route_water' || endId === 'seafoam') ? 'water' : 'land'
      const progressPct = Math.round(((i + 1) / (nodes.length - 1)) * 100)

      legs.push({
        startId,
        endId,
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        dx,
        dy,
        duration,
        startTime: totalTime,
        endTime: totalTime + duration,
        dir,
        terrain,
        progressPct
      })

      totalTime += duration
    }

    if (legs.length === 0) {
      resolve()
      return
    }

    // Set initial direction and terrain immediately
    const firstLeg = legs[0]
    if (firstLeg) {
      playerDirection.value = firstLeg.dir
      activeTravelTerrain.value = firstLeg.terrain
    }

    // Clean up any residual tweens
    if (playerToken.value) gsap.killTweensOf(playerToken.value)
    if (worldContainer.value) gsap.killTweensOf(worldContainer.value)

    const animState = { t: 0 }
    const stepDuration = isFlying ? 0.10 : (isBike ? 0.11 : 0.16)
    const totalSteps = Math.round(totalTime / stepDuration) * 4

    const tl = gsap.timeline({
      onComplete: () => {
        const lastLeg = legs[legs.length - 1]
        if (lastLeg) {
          playerTokenPos.value = { x: lastLeg.endX, y: lastLeg.endY }
          if (playerToken.value) {
            playerToken.value.style.left = `${lastLeg.endX}px`
            playerToken.value.style.top = `${lastLeg.endY}px`
          }
          const finalPan = getClampedPan(lastLeg.endX, lastLeg.endY)
          currentPanX.value = finalPan.x
          currentPanY.value = finalPan.y
          if (worldContainer.value) {
            worldContainer.value.style.transform = `translate3d(${finalPan.x}px, ${finalPan.y}px, 0) scale(${travelScale})`
          }
          currentNode.value = lastLeg.endId
          travelProgressText.value = '100%'
        }
        if (previewLinesSvg.value) previewLinesSvg.value.innerHTML = ''
        walkFrame.value = isBike ? 0 : 1
        resolve()
      }
    })

    tl.to(animState, {
      t: totalTime,
      duration: totalTime,
      ease: 'none',
      onUpdate: () => {
        const currentTime = animState.t
        let activeLeg = legs[legs.length - 1]
        let activeLegIdx = legs.length - 1
        for (let i = 0; i < legs.length; i++) {
          const l = legs[i]
          if (l && currentTime <= l.endTime) {
            activeLeg = l
            activeLegIdx = i
            break
          }
        }

        if (activeLeg) {
          const legElapsed = Math.max(0, currentTime - activeLeg.startTime)
          const legRatio = activeLeg.duration > 0 ? Math.min(1, legElapsed / activeLeg.duration) : 1

          const currentX = activeLeg.startX + activeLeg.dx * legRatio
          const currentY = activeLeg.startY + activeLeg.dy * legRatio

          // Update real-time route trail consumption
          drawRemainingRouteTrail(currentX, currentY, activeLegIdx, legs)

          playerTokenPos.value = { x: currentX, y: currentY }
          if (playerToken.value) {
            playerToken.value.style.left = `${currentX}px`
            playerToken.value.style.top = `${currentY}px`
          }

          if (playerDirection.value !== activeLeg.dir) {
            playerDirection.value = activeLeg.dir
          }
          if (activeTravelTerrain.value !== activeLeg.terrain) {
            activeTravelTerrain.value = activeLeg.terrain
          }
          if (currentNode.value !== activeLeg.endId && legRatio > 0.5) {
            currentNode.value = activeLeg.endId
            if (!discoveredNodes.value.includes(activeLeg.endId)) {
              discoveredNodes.value.push(activeLeg.endId)
              localStorage.setItem('pokeVicioDiscovered', JSON.stringify(discoveredNodes.value))
            }
            const reachedNode = mapNodes.value[activeLeg.endId]
            if (reachedNode?.hasCenter) {
              shopStore.healAllPokemon(0)
            }
          }
          travelProgressText.value = `${activeLeg.progressPct}%`

          // Camera pan
          const pan = getClampedPan(currentX, currentY)
          currentPanX.value = pan.x
          currentPanY.value = pan.y
          if (worldContainer.value) {
            worldContainer.value.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${travelScale})`
          }
        }

        // Step cycle animation
        const step = Math.floor((currentTime / totalTime) * totalSteps) % 4
        if (isBike) {
          const bikeCycle = [0, 1, 0, 2] as const
          walkFrame.value = bikeCycle[step] ?? 0
        } else if (activeTravelTerrain.value === 'water') {
          const surfCycle = [0, 1, 2, 1] as const
          walkFrame.value = surfCycle[step] ?? 0
        } else {
          const walkCycle = [0, 1, 2, 1] as const
          walkFrame.value = walkCycle[step] ?? 0
        }
      }
    })
  })
}

// Explore & Heal
const exploreZone = async () => {
  const rawOfficialId = officialMapIdMap[currentNode.value] || currentNode.value
  if (rawOfficialId && isMapRouteId(rawOfficialId) && MAPS_BY_ROUTE_ID[rawOfficialId]) {
    await mapStore.navigate(rawOfficialId)
  } else {
    showActionAlert('Esta zona es un centro urbano pacífico.\n\nPara encontrar Pokémon salvajes, dirígete a una ruta o zona salvaje adyacente.')
  }
}

function healPokemon() {
  const needsHeal = (gameStore.state.team as (Pokemon | null)[]).some(p => p && pokemonNeedsHealing(p))
  if (!needsHeal) {
    uiStore.notify('Tu equipo ya está en perfectas condiciones.', '💖')
    return
  }

  const lastHeal = gameStore.state.lastPokemonCenterHeal || 0
  const cooldownSecs = calculatePokemonCenterCooldown(gameStore.state.trainerLevel || 1)
  if (cooldownSecs > 0 && lastHeal > 0) {
    const elapsedMs = Temporal.Now.instant().epochMilliseconds - lastHeal
    const remainingMs = (cooldownSecs * 1000) - elapsedMs
    if (remainingMs > 0) {
      const remainingSecs = Math.ceil(remainingMs / 1000)
      const mins = Math.floor(remainingSecs / 60)
      const secs = remainingSecs % 60
      const formatted = `${mins}:${secs.toString().padStart(2, '0')}`
      uiStore.notify(`El Centro Pokémon está en mantenimiento. Disponible en ${formatted}.`, '🏥')
      return
    }
  }

  modalStore.open('PokemonCenter')
}

// Debug features
const debugUnlockAll = () => {
  discoveredNodes.value = Object.keys(mapNodes.value)
  localStorage.setItem('pokeVicioDiscovered', JSON.stringify(discoveredNodes.value))
  showActionAlert('⚙️ Cheat: Todo el mapa ha sido descubierto.')
}

function debugGiveAllMOs() {
  ['Corte', 'Surf', 'Flauta', 'Medallas', 'Vuelo', 'Bicicleta'].forEach(mo => playerInventory.value[mo] = true)
  localStorage.setItem('pokeVicioInventory', JSON.stringify(playerInventory.value))
  updatePlayerVisuals()
  showActionAlert('⚙️ Cheat: Tienes todos los Objetos y MOs.')
}

function debugHardReset() {
  if (confirm('⚠️ ¿Estás seguro de que quieres BORRAR TODOS LOS DATOS Y REINICIAR? Esto no se puede deshacer.')) {
    localStorage.clear()
    location.reload()
  }
}

// Map companion sprite url
const companionSpriteUrl = computed(() => {
  if (activeCompanion.value === 'none') return ''
  let pokeId = 25
  if (activeCompanion.value === 'meowth') pokeId = 52
  if (activeCompanion.value === 'squirtle') pokeId = 7
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`
})

const adjacentButtons = computed(() => {
  if (!isZoomedIn.value || isMoving.value || isPlanning.value) return []
  const current = mapNodes.value[currentNode.value]
  if (!current) return []
  
  const adjIds = getAdjacentNodes(currentNode.value, connections)
  return adjIds
    .map(id => {
      const adj = mapNodes.value[id]
      if (!adj) return null
      const dx = adj.x - current.x
      const dy = adj.y - current.y
      
      let direction = 'N'
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'E' : 'W'
      } else {
        direction = dy > 0 ? 'S' : 'N'
      }
      
      return {
        id,
        name: adj.name,
        direction,
        discovered: discoveredNodes.value.includes(id)
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
})

function handleResize() {
  if (isZoomedIn.value && !isMoving.value && !isPlanning.value) {
    const targetScale = getOptimalParkedScale()
    const currentLoc = mapNodes.value[currentNode.value]
    if (currentLoc) {
      centerCameraOn(currentLoc.x, currentLoc.y, false, targetScale)
    }
  } else if (isPlanning.value) {
    const currentPath = currentPlanPaths.value[selectedPlanIndex.value]
    if (currentPath) zoomToFitPath(currentPath.nodes)
  } else {
    clampCamera()
    updateCameraTransform(false)
  }
}

onMounted(() => {
  preloadTrainerSprites()
  updatePlayerVisuals()
  updateDayNightCycle()
  const dayNightTimer = setInterval(updateDayNightCycle, 60000)
  window.addEventListener('resize', handleResize)
  viewport.value?.addEventListener('wheel', handleWheelZoom, { passive: false })
  viewport.value?.addEventListener('mousemove', handleMouseMove)

  const currentLoc = mapNodes.value[currentNode.value]
  if (currentLoc) {
    playerTokenPos.value = { x: currentLoc.x, y: currentLoc.y }
    if (playerToken.value) {
      playerToken.value.style.left = `${currentLoc.x}px`
      playerToken.value.style.top = `${currentLoc.y}px`
    }
  }

  nextTick(() => {
    enterParkedMode()
  })

  onUnmounted(() => {
    clearInterval(dayNightTimer)
    window.removeEventListener('resize', handleResize)
    viewport.value?.removeEventListener('wheel', handleWheelZoom)
    viewport.value?.removeEventListener('mousemove', handleMouseMove)
    if (playerToken.value) gsap.killTweensOf(playerToken.value)
    if (worldContainer.value) gsap.killTweensOf(worldContainer.value)
  })
})

const battleStore = useBattleStore()

watch(
  () => battleStore.isBattleActive,
  (active, wasActive) => {
    if (!active && wasActive && !isMoving.value) {
      nextTick(() => {
        enterParkedMode()
      })
    }
  }
)

onActivated(() => {
  if (!isMoving.value && !isPlanning.value) {
    nextTick(() => {
      enterParkedMode()
    })
  }
})
</script>

<template>
  <div class="adventure-world-modal-fullscreen">
    <!-- Map Viewport -->
    <main
      id="map-viewport"
      ref="viewport"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
      @wheel.prevent="handleWheelZoom"
      @mousemove="handleMouseMove"
    >
      <div
        id="world-container"
        ref="worldContainer"
      >
        <!-- Climate overlays -->
        <div
          id="day-night-overlay"
          :style="{ backgroundColor: dayNightOverlayColor }"
        />
        <div
          id="weather-overlay"
        />
        
        <!-- Svg Connections -->
        <svg
          id="route-lines"
          class="adv-route-lines"
          viewBox="0 0 3600 4600"
          width="3600"
          height="4600"
        >
          <template
            v-for="([idA, idB], idx) in connections"
            :key="idx"
          >
            <line
              v-if="mapNodes[idA] && mapNodes[idB]"
              :x1="mapNodes[idA].x"
              :y1="mapNodes[idA].y"
              :x2="mapNodes[idB].x"
              :y2="mapNodes[idB].y"
              stroke="#4B5563"
              stroke-width="20"
              stroke-linecap="round"
            />
            <line
              v-if="mapNodes[idA] && mapNodes[idB]"
              :x1="mapNodes[idA].x"
              :y1="mapNodes[idA].y"
              :x2="mapNodes[idB].x"
              :y2="mapNodes[idB].y"
              :stroke="['route19','route20','route21','seafoam'].includes(idA) ? '#3B82F6' : '#E5E7EB'"
              :stroke-dasharray="['route19','route20','route21','seafoam'].includes(idA) ? '18, 12' : ''"
              stroke-width="14"
              stroke-linecap="round"
            />
          </template>
        </svg>
        <svg
          id="preview-lines"
          ref="previewLinesSvg"
          class="adv-preview-lines"
          viewBox="0 0 3600 4600"
          width="3600"
          height="4600"
        />

        <!-- Nodes Container -->
        <div
          id="nodes-container"
          class="adv-nodes-container"
        >
          <template
            v-for="(node, id) in mapNodes"
            :key="id"
          >
            <!-- Discovered Node wrapper with MapCard (ALWAYS CLICKABLE) -->
            <div
              v-if="discoveredNodes.includes(id as string) && mapLocationsById[id]"
              :id="`node-${id}`"
              class="adv-node-card-wrapper"
              :style="{ left: `${node.x}px`, top: `${node.y}px`, zIndex: (isZoomedIn && !isMoving && !isPlanning && currentNode === id) ? 20 : 10 }"
              @click.stop="handleNodeClick(id as string)"
            >
              <div
                :style="{ transform: `scale(${(isZoomedIn && !isMoving && !isPlanning && currentNode === id) ? 1.0 : cardScale})` }"
                class="adv-node-card-inner"
              >
                <!-- True Spherical Background Glow Effect (Only Zoomed-out map, stationary) -->
                <div 
                  v-if="!isZoomedIn && !isMoving && currentNode === id"
                  class="adv-node-spherical-glow animate-pulse-glow"
                />

                <!-- 1. TACTICAL MINIMAP CARD (Zoomed-out / Free Mode / In Transit / Any scale < 0.95) -->
                <div
                  v-if="!isZoomedIn || isMoving || currentScale < 0.95"
                  class="adv-tactical-card"
                  :class="[
                    `node-type-${node.type}`,
                    { 'is-active-target': isPlanning && planningTarget === id },
                    { 'is-current-loc': currentNode === id }
                  ]"
                  :style="{
                    '--bg-route-img': `url('${getNodeImage(id as string)}')`
                  }"
                >
                  <div class="tactical-bg-layer" />
                  <div class="tactical-header-badges">
                    <span class="tactical-icon-badge">{{ getNodeIcon(node, id as string) }}</span>
                    <span
                      v-if="node.hasCenter"
                      class="tactical-center-badge"
                    >🏥</span>
                  </div>
                  <div class="tactical-body">
                    <h4 class="tactical-zone-title">
                      {{ mapLocationsById[id]?.name || node.name }}
                    </h4>
                  </div>
                  <div
                    v-if="node.requiresMO && !playerInventory[node.requiresMO]"
                    class="tactical-lock-badge"
                  >
                    🔒 {{ node.requiresMO }}
                  </div>
                </div>

                <!-- 2. FULL HIGH-FIDELITY MAPCARD (Zoomed-in & Stationary on Current Node ONLY when scale >= 0.95) -->
                <MapCard 
                  v-else-if="isZoomedIn && !isMoving && currentScale >= 0.95"
                  :map="mapLocationsById[id]"
                  :is-locked="!!(node.requiresMO && !playerInventory[node.requiresMO])"
                  :cycle="currentCycle"
                  :weather="getWeatherForMap(id as string)"
                  :badge-count="8"
                  :spawn-pool="getSpawnPoolForMap(id as string)"
                  :force-keep-warm="false"
                  :is-performance-mode="false"
                  style="width: 250px; pointer-events: none;"
                  @navigate="() => {}"
                />

                <!-- Action Buttons integrated inside the active MapCard -->
                <div
                  v-if="isZoomedIn && !isMoving && !isPlanning && currentNode === id"
                  class="adv-card-actions"
                >
                  <button
                    id="btn-adv-explore"
                    class="adv-btn-explore"
                    @click.stop="exploreZone"
                  >
                    <span class="icon">🔍</span> Explorar
                  </button>
                  <button
                    v-if="mapNodes[currentNode]?.hasCenter"
                    id="btn-adv-heal"
                    class="adv-btn-heal"
                    @click.stop="healPokemon"
                  >
                    <span class="icon">❤️</span> Curar
                  </button>
                </div>
              </div>
            </div>

            <!-- Standard Pill Node (Not discovered or no card) -->
            <div
              v-else
              :id="`node-${id}`" 
              class="node absolute flex items-center justify-center font-bold"
              :class="[
                node.type === 'city' ? 'node-city' : '',
                node.type === 'route' ? 'node-route' : '',
                node.type === 'route_water' ? 'node-route-water' : '',
                node.type === 'league' ? 'node-league' : '',
                node.type === 'poi' ? 'node-poi' : '',
                discoveredNodes.includes(id as string) ? '' : 'node-undiscovered',
                currentNode === id ? 'active-node' : '',
                (node.requiresMO && !playerInventory[node.requiresMO]) ? 'node-locked' : '',
                node.hasEvent ? 'node-event' : ''
              ]"
              :style="{ left: `${node.x}px`, top: `${node.y}px` }"
              @click.stop="() => {
                if (!isMoving && !dragState.isDragging) {
                  planTravel(id as string)
                }
              }"
            >
              <span>{{ discoveredNodes.includes(id as string) ? node.name : '???' }}</span>
            </div>
          </template>
        </div>
        
        <!-- Player Token -->
        <div
          id="player-token"
          ref="playerToken"
          :style="{
            left: `${playerTokenPos.x}px`,
            top: `${playerTokenPos.y}px`
          }"
        >
          <div
            v-if="activeCompanion !== 'none'"
            id="companion-token"
          >
            <img
              :src="companionSpriteUrl"
              class="pixel-art h-8 w-auto max-w-none"
              :class="{ 'anim-bounce-companion': isMoving }"
              alt="Companion"
            >
          </div>
          <div
            id="player-sprite"
            :class="{ 'anim-bounce': isMoving && !playerInventory['Bicicleta'] && !isSurfing && !currentPlanPaths[selectedPlanIndex]?.isFly }"
            :style="{ transform: playerSpriteTransform }"
          >
            <!-- If flying -->
            <img
              v-if="isMoving && currentPlanPaths[selectedPlanIndex]?.isFly"
              :src="`/assets/sprites/trainers/red_fly_${playerDirection}_${walkFrame}_v3.png`"
              class="pixel-art h-12 w-auto max-w-none"
              alt="Volando"
            >
            <!-- If surfing -->
            <img
              v-else-if="isSurfing"
              :src="`/assets/sprites/trainers/red_surf_${playerDirection}_${walkFrame}_v3.png`"
              class="pixel-art h-12 w-auto max-w-none"
              alt="Surf"
            >
            <!-- If riding a bike -->
            <img
              v-else-if="playerInventory['Bicicleta']"
              :src="`/assets/sprites/trainers/red_bike_${playerDirection}_${walkFrame}_v3.png`"
              class="pixel-art h-12 w-auto max-w-none"
              alt="Bici"
            >
            <!-- If walking -->
            <img
              v-else
              :src="`/assets/sprites/trainers/red_walk_${playerDirection}_${walkFrame}.png`"
              class="pixel-art h-12 w-auto max-w-none"
              alt="Caminando"
            >
          </div>
        </div>
      </div>
    </main>

    <!-- Floating Action Tools (Always accessible on map) -->
    <aside
      id="floating-tools"
      class="floating-tools-container"
      :class="{ 'tools-hidden': isMoving || isPlanning }"
    >
      <button
        id="close-adventure-modal-btn"
        class="floating-btn btn-close-color"
        title="Cerrar Croquis y volver al menú de mapa"
        @click="emit('close')"
      >
        <span class="icon">✖</span>
      </button>
      <button
        id="btn-free-map"
        class="floating-btn"
        :title="isZoomedIn ? 'Ver Mapa Completo' : 'Volver a Ubicación'"
        @click.stop.prevent="() => {
          if (isZoomedIn) {
            exitParkedMode()
          } else {
            enterParkedMode()
          }
        }"
      >
        <span class="icon">{{ isZoomedIn ? '🗺️' : '📍' }}</span>
      </button>
      <button
        id="btn-team"
        class="floating-btn btn-team-color"
        title="Mochila / Equipo de Aventura"
        @click="toggleInventoryModal"
      >
        <span class="icon">🎒</span>
      </button>
      <button
        id="btn-radar"
        class="floating-btn"
        title="Radar Rápido"
        @click="toggleRadarModal"
      >
        <span class="icon">🧭</span>
      </button>
      <button
        id="btn-zoom-in"
        class="floating-btn"
        title="Acercar Cámara"
        @click.stop="zoomIn"
      >
        <span class="icon">➕</span>
      </button>
      <button
        id="btn-zoom-out"
        class="floating-btn"
        title="Alejar Cámara"
        @click.stop="zoomOut"
      >
        <span class="icon">➖</span>
      </button>
      <button
        id="btn-debug"
        class="floating-btn btn-debug-color"
        title="Menú de Testers (Debug)"
        @click="toggleDebugModal"
      >
        <span class="icon">🐛</span>
      </button>
    </aside>

    <!-- Botones de Navegación Adyacentes (Rodeando la tarjeta central) -->
    <div
      v-if="isZoomedIn && !isMoving && !isPlanning"
      class="fixed-navigation-arrows"
    >
      <!-- North Group -->
      <div class="nav-arrow-group north">
        <button
          v-for="btn in adjacentButtons.filter(b => b.direction === 'N')"
          :key="btn.id"
          class="nav-arrow-btn"
          @click="travelToAdjacent(btn.id)"
        >
          <span class="icon">⬆️</span> {{ btn.discovered ? btn.name : '???' }}
        </button>
      </div>
      
      <!-- South Group -->
      <div class="nav-arrow-group south">
        <button
          v-for="btn in adjacentButtons.filter(b => b.direction === 'S')"
          :key="btn.id"
          class="nav-arrow-btn"
          @click="travelToAdjacent(btn.id)"
        >
          <span class="icon">⬇️</span> {{ btn.discovered ? btn.name : '???' }}
        </button>
      </div>

      <!-- West Group -->
      <div class="nav-arrow-group west">
        <button
          v-for="btn in adjacentButtons.filter(b => b.direction === 'W')"
          :key="btn.id"
          class="nav-arrow-btn"
          @click="travelToAdjacent(btn.id)"
        >
          <span class="icon">⬅️</span> {{ btn.discovered ? btn.name : '???' }}
        </button>
      </div>

      <!-- East Group -->
      <div class="nav-arrow-group east">
        <button
          v-for="btn in adjacentButtons.filter(b => b.direction === 'E')"
          :key="btn.id"
          class="nav-arrow-btn"
          @click="travelToAdjacent(btn.id)"
        >
          {{ btn.discovered ? btn.name : '???' }} <span class="icon">➡️</span>
        </button>
      </div>
    </div>

    <!-- Planning UI Panel -->
    <div
      id="planning-ui-panel"
      :class="{ 'planning-hidden': !isPlanning }"
    >
      <div class="planning-card">
        <div class="planning-header">
          <h3 class="planning-title">
            <span class="icon text-yellow-400 shrink-0">📍</span>
            <span>{{ planningTarget ? (discoveredNodes.includes(planningTarget) ? mapNodes[planningTarget]?.name : "Zona Desconocida") : "Destino" }}</span>
          </h3>
          <span class="planning-badge">
            {{ currentPlanPaths[selectedPlanIndex] ? (currentPlanPaths[selectedPlanIndex]?.isFly ? '🦅 Vuelo' : `Opción ${selectedPlanIndex + 1}/${currentPlanPaths.length}`) : '...' }}
          </span>
        </div>
        
        <div class="planning-stats-box">
          <p class="planning-stats-title">
            Previsión del Recorrido
          </p>
          
          <!-- Route stats computed from actual path -->
          <div
            v-if="currentPlanPaths[selectedPlanIndex]"
            class="planning-stats-grid"
          >
            <div class="planning-stat-item">
              <span class="icon planning-stat-icon">⚔️</span>
              <span
                class="planning-stat-val"
                :class="{ 'stat-high': activePlanStats.t >= 70 }"
              >
                {{ activePlanStats.t }}%
              </span>
            </div>
            <div class="planning-stat-item">
              <span class="icon planning-stat-icon">🌿</span>
              <span
                class="planning-stat-val"
                :class="{ 'stat-high': activePlanStats.w >= 70 }"
              >
                {{ activePlanStats.w }}%
              </span>
            </div>
            <div class="planning-stat-item">
              <span class="icon planning-stat-icon">⛏️</span>
              <span
                class="planning-stat-val"
                :class="{ 'stat-high': activePlanStats.m >= 70 }"
              >
                {{ activePlanStats.m }}%
              </span>
            </div>
            <div class="planning-stat-item">
              <span class="icon planning-stat-icon">🎣</span>
              <span
                class="planning-stat-val"
                :class="{ 'stat-high': activePlanStats.f >= 70 }"
              >
                {{ activePlanStats.f }}%
              </span>
            </div>
          </div>
        </div>

        <div class="planning-actions">
          <button
            class="planning-btn-cancel"
            @click="cancelPlanning"
          >
            Cancelar
          </button>
          <button
            v-if="currentPlanPaths.length > 1"
            class="planning-btn-alt"
            @click="nextAlternative"
          >
            <span class="icon">🔄</span> Alternativa
          </button>
          <button
            class="planning-btn-go"
            @click="confirmTravel"
          >
            ¡VIAJAR!
          </button>
        </div>
      </div>
    </div>

    <!-- Active traveling floating progress -->
    <div
      v-if="isTravelingProgressActive"
      class="adv-floating-progress"
    >
      <div class="adv-progress-bar">
        <div
          class="adv-progress-fill"
          :style="{ width: travelProgressText }"
        />
      </div>
      <span class="adv-progress-text">{{ travelProgressText }}</span>
    </div>

    <!-- Custom Alert dialog -->
    <Teleport to="body">
      <div
        v-if="alertOpen"
        class="adv-modal-overlay"
        @click.self="closeAlert"
      >
        <div
          class="adv-modal-card adv-alert-card"
          :class="alertThemeClass"
        >
          <div
            class="adv-modal-header"
            :class="alertHeaderClass"
          >
            <span class="icon">{{ alertIcon }}</span> {{ alertTitle }}
          </div>
          <div class="adv-alert-body">
            <div
              v-if="alertIsHeal"
              class="adv-alert-nurse-avatar"
            >
              <span class="nurse-icon">👩‍⚕️</span>
            </div>
            <p class="adv-alert-message">
              {{ alertMsg }}
            </p>
          </div>
          <div class="adv-modal-footer">
            <button
              class="adv-btn-close"
              :class="alertBtnClass"
              @click="closeAlert"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Radar Modal -->
    <Teleport to="body">
      <div
        v-if="showRadarModal"
        class="adv-modal-overlay"
        @click.self="toggleRadarModal"
      >
        <div class="adv-modal-card border-yellow">
          <div class="adv-modal-header header-yellow">
            <span class="icon">🧭</span> RADAR RÁPIDO
          </div>
          <div class="adv-modal-body">
            <div class="radar-cities-list">
              <button
                v-for="id in discoveredNodes.filter(n => mapNodes[n] && ['city', 'league'].includes(mapNodes[n]?.type || ''))"
                :key="id"
                class="radar-city-btn"
                @click="() => {
                  toggleRadarModal()
                  if (isZoomedIn) exitParkedMode()
                  const loc = mapNodes[id]
                  if (loc) {
                    centerCameraOn(loc.x, loc.y, true, getOptimalMapScale())
                  }
                }"
              >
                <span class="city-name"><span class="icon">📍</span> {{ mapNodes[id]?.name }}</span>
                <span class="city-type-badge">{{ mapNodes[id]?.type === 'league' ? 'LIGA' : 'CIUDAD' }}</span>
              </button>
            </div>
          </div>
          <div class="adv-modal-footer">
            <button
              class="adv-btn-close btn-yellow"
              @click="toggleRadarModal"
            >
              Cerrar Radar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Inventory Modal -->
    <AdventureInventoryModal
      :show="showInventoryModal"
      :active-companion="activeCompanion"
      :player-inventory="playerInventory"
      @update-companion="setCompanion"
      @update-inventory="updateInventory"
      @close="toggleInventoryModal"
    />

    <!-- Debug Modal -->
    <AdventureDebugModal
      :show="showDebugModal"
      @unlock-all="debugUnlockAll"
      @give-all-m-os="debugGiveAllMOs"
      @hard-reset="debugHardReset"
      @close="toggleDebugModal"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.adventure-world-modal-fullscreen {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background-color: #0f172a;
  font-family: 'Nunito', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  width: dvw;
  overflow: hidden;
  color: #ffffff;
  user-select: none;
}

.adv-node-card-wrapper {
  position: absolute;
  transform: Translate(-50%, -50%);
  transform-origin: center center;
  cursor: pointer;
  pointer-events: auto;
  will-change: transform;
}

.adv-tactical-card {
  width: 250px;
  height: 140px;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px 12px;
  border: 3px solid #374151;
  box-shadow: 0 8px 24px Rgba(0, 0, 0, 0.6), inset 0 0 0 1px Rgba(255, 255, 255, 0.15);
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  background-color: #0f172a;

  &.node-type-city {
    border-color: #3b82f6;
    box-shadow: 0 8px 24px Rgba(0, 0, 0, 0.6), 0 0 16px Rgba(59, 130, 246, 0.4);
    .tactical-zone-title {
      color: #93c5fd;
      text-shadow: 0 2px 4px Rgba(0, 0, 0, 0.9), 0 0 8px Rgba(59, 130, 246, 0.6);
    }
  }

  &.node-type-league {
    border-color: #eab308;
    box-shadow: 0 8px 24px Rgba(0, 0, 0, 0.6), 0 0 20px Rgba(234, 179, 8, 0.5);
    .tactical-zone-title {
      color: #fef08a;
      text-shadow: 0 2px 4px Rgba(0, 0, 0, 0.9), 0 0 10px Rgba(234, 179, 8, 0.8);
    }
  }

  &.node-type-route_water {
    border-color: #06b6d4;
  }

  &.node-type-poi {
    border-color: #a855f7;
  }

  &.is-current-loc {
    border-color: #22c55e !important;
    box-shadow: 0 8px 24px Rgba(0, 0, 0, 0.6), 0 0 20px Rgba(34, 197, 94, 0.7) !important;
  }

  &.is-active-target {
    border-color: #f59e0b !important;
    box-shadow: 0 8px 24px Rgba(0, 0, 0, 0.6), 0 0 20px Rgba(245, 158, 11, 0.8) !important;
    animation: pulseActive 1.2s infinite;
  }
}

.tactical-bg-layer {
  position: absolute;
  inset: 0;
  background-image: var(--bg-route-img);
  background-size: cover;
  background-position: center;
  filter: Brightness(0.65) contrast(1.05);
  z-index: calc(var(--z-base) + 1);
}

.tactical-header-badges {
  position: relative;
  z-index: calc(var(--z-base) + 2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.tactical-icon-badge {
  font-size: 1.1rem;
  background: Rgba(17, 24, 39, 0.85);
  border-radius: 8px;
  padding: 2px 6px;
  border: 1px solid Rgba(255, 255, 255, 0.2);
  line-height: 1;
}

.tactical-center-badge {
  font-size: 1rem;
  background: Rgba(236, 72, 153, 0.85);
  border-radius: 8px;
  padding: 2px 6px;
  border: 1px solid #f472b6;
  line-height: 1;
}

.tactical-body {
  position: relative;
  z-index: calc(var(--z-base) + 2);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px 12px;
  background: Rgba(15, 23, 42, 0.90);
  border-radius: 12px;
  border: 2px solid Rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.7);
  margin-top: auto;
  margin-bottom: auto;
}

.tactical-zone-title {
  font-family: 'Pokemon FireRed LeafGreen', monospace;
  font-size: 1.15rem;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-shadow: 0 2px 4px Rgba(0, 0, 0, 0.95), 0 0 8px Rgba(0, 0, 0, 0.9);
  margin: 0;
  line-height: 1.2;
  word-break: break-word;
}

.tactical-lock-badge {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: Translatex(-50%);
  z-index: calc(var(--z-base) + 3);
  background: Rgba(220, 38, 38, 0.95);
  color: #ffffff;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.6rem;
  font-weight: 900;
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1px solid #fca5a5;
  white-space: nowrap;
  box-shadow: 0 2px 8px Rgba(0, 0, 0, 0.6);
}

.adv-node-card-inner {
  transform-origin: center center;
  border-radius: 16px;
  position: relative;
  box-shadow: 0 16px 32px Rgba(0, 0, 0, 0.4);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  &:hover { filter: Brightness(1.1); }
}

.adv-card-actions {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: Translatex(-50%);
  display: flex;
  gap: 6px;
  z-index: var(--z-map-spawns);
  pointer-events: auto;
}

.adv-btn-explore {
  background: linear-gradient(to bottom, #ef4444, #dc2626);
  border: 1.5px solid #7f1d1d;
  box-shadow: 0 3px 0 #7f1d1d;
  color: white;
  font-weight: 900;
  font-size: 9px;
  padding: 6px 12px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  &:active { transform: Translatey(2px); box-shadow: none; }
}

.adv-btn-heal {
  background: linear-gradient(to bottom, #f472b6, #ec4899);
  border: 1.5px solid #831843;
  box-shadow: 0 3px 0 #831843;
  color: white;
  font-weight: 900;
  font-size: 9px;
  padding: 6px 12px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  &:active { transform: Translatey(2px); box-shadow: none; }
}

.adv-floating-progress {
  position: fixed;
  bottom: calc(var(--hud-bottom-padding, 0px) + 24px);
  left: 50%;
  transform: Translatex(-50%);
  background: Rgba(17, 24, 39, 0.95);
  border: 2px solid #374151;
  padding: 10px 20px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 200;
  box-shadow: 0 10px 25px Rgba(0, 0, 0, 0.6);
}

.adv-progress-bar {
  width: 160px;
  height: 10px;
  background-color: #374151;
  border-radius: 9999px;
  overflow: hidden;
}

.adv-progress-fill {
  height: 100%;
  background-color: #22c55e;
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.adv-progress-text {
  font-weight: 900;
  color: #facc15;
  font-size: 0.9rem;
}

.adv-alert-card {
  max-width: 380px;
  width: 100%;

  &.border-pink {
    border-color: #ec4899;
    box-shadow: 0 20px 40px Rgba(0, 0, 0, 0.8), 0 0 20px Rgba(236, 72, 153, 0.25);
  }

  &.border-amber {
    border-color: #f59e0b;
    box-shadow: 0 20px 40px Rgba(0, 0, 0, 0.8), 0 0 20px Rgba(245, 158, 11, 0.25);
  }

  &.border-blue {
    border-color: #3b82f6;
    box-shadow: 0 20px 40px Rgba(0, 0, 0, 0.8), 0 0 20px Rgba(59, 130, 246, 0.25);
  }
}

.header-pink {
  background: linear-gradient(180deg, #ec4899 0%, #be185d 100%);
  color: white;
  border-bottom: 2px solid #9d174d;
}

.header-amber {
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
  color: #451a03;
  border-bottom: 2px solid #b45309;
}

.header-blue {
  background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border-bottom: 2px solid #1e40af;
}

.btn-pink {
  background: linear-gradient(180deg, #ec4899 0%, #be185d 100%) !important;
  color: white !important;
  border-color: #f472b6 !important;
  font-weight: 900 !important;
  box-shadow: 0 4px 12px Rgba(190, 24, 93, 0.35);

  &:hover {
    filter: Brightness(1.1);
  }
}

.btn-amber {
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%) !important;
  color: #451a03 !important;
  border-color: #fbbf24 !important;
  font-weight: 900 !important;
  box-shadow: 0 4px 12px Rgba(217, 119, 6, 0.35);

  &:hover {
    filter: Brightness(1.1);
  }
}

.btn-blue {
  background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%) !important;
  color: white !important;
  border-color: #60a5fa !important;
  font-weight: 900 !important;
  box-shadow: 0 4px 12px Rgba(29, 78, 216, 0.35);

  &:hover {
    filter: Brightness(1.1);
  }
}

.adv-alert-body {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 18px;
}

.adv-alert-nurse-avatar {
  font-size: 2.2rem;
  line-height: 1;
  flex-shrink: 0;
  background: Rgba(236, 72, 153, 0.15);
  border: 1.5px solid Rgba(236, 72, 153, 0.35);
  border-radius: 14px;
  padding: 8px;
  box-shadow: 0 4px 12px Rgba(236, 72, 153, 0.2);
}

.adv-alert-message {
  color: #f8fafc;
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
  white-space: pre-line;
}

@keyframes fogMove {
  0% { background-position: 0px 0px, 0px 0px, 0px 0px; }
  100% { background-position: 800px 800px, -600px -600px, 1000px 0px; }
}

@keyframes pulseActive {
  0%, 100% { box-shadow: 0 0 0 5px Rgba(255, 255, 255, 0.9), 0 0 30px Rgba(255, 255, 255, 0.8); }
  50% { box-shadow: 0 0 0 3px Rgba(255, 255, 255, 0.9), 0 0 15px Rgba(255, 255, 255, 0.5); }
}

@keyframes glowActive {
  0%, 100% {
    box-shadow: 0 0 20px Rgba(34, 197, 94, 0.5), 
                0 0 40px Rgba(34, 197, 94, 0.3), 
                0 0 70px Rgba(34, 197, 94, 0.1);
  }
  50% {
    box-shadow: 0 0 35px Rgba(34, 197, 94, 0.9), 
                0 0 70px Rgba(34, 197, 94, 0.6), 
                0 0 110px Rgba(34, 197, 94, 0.3);
  }
}

.map-card-glow-green {
  animation: glowActive 2s infinite ease-in-out;
}

@keyframes pulseGlow {
  0%, 100% {
    transform: Scale(1.2);
    opacity: 0.7;
  }
  50% {
    transform: Scale(1.6);
    opacity: 1.0;
  }
}

.animate-pulse-glow {
  animation: pulseGlow 2.5s infinite ease-in-out;
}

@keyframes floatIcon {
  0%, 100% { transform: translate3d(-50%, 0px, 0); }
  50% { transform: translate3d(-50%, -10px, 0); }
}

@keyframes bounceEvent {
  0%, 100% { transform: translate3d(-50%, 0px, 0) Scale(1); }
  50% { transform: translate3d(-50%, -12px, 0) Scale(1.15); }
}

@keyframes gpsMove {
  to { stroke-dashoffset: -40; }
}

@keyframes bouncePlayer {
  0% { transform: Translatey(0px); }
  100% { transform: Translatey(-8px); }
}

#map-viewport {
  width: dvw;
  height: 100dvh;
  overflow: hidden;
  position: relative;
  touch-action: none;
  background-color: #84cc5c;
  background-image: radial-gradient(#73b84c 12%, transparent 13%), radial-gradient(#73b84c 12%, transparent 13%);
  background-size: 80px 80px;
  background-position: 0 0, 40px 40px;
}

#world-container {
  width: 3600px;
  height: 4600px;
  transform-origin: 0 0; 
  background-color: #84cc5c;
  background-image: radial-gradient(#73b84c 12%, transparent 13%), radial-gradient(#73b84c 12%, transparent 13%);
  background-size: 80px 80px;
  background-position: 0 0, 40px 40px;
  position: absolute;
  top: 0;
  left: 0;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  will-change: transform;
}

#day-night-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: calc(var(--z-base) + 1);
  transition: background-color 2s ease;
}

#weather-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: calc(var(--z-base) + 5);
  opacity: 0;
  transition: opacity 1.5s ease;
  background-image: radial-gradient(circle at 20% 30%, Rgba(139, 92, 246, 0.45) 0%, transparent 45%), radial-gradient(circle at 80% 70%, Rgba(109, 40, 217, 0.45) 0%, transparent 45%), radial-gradient(circle at 50% 50%, Rgba(76, 29, 149, 0.35) 0%, transparent 65%);
  background-size: 800px 800px, 600px 600px, 1000px 1000px;
  background-color: Rgba(20, 10, 40, 0.3);
  will-change: opacity, background-position;
}

.adv-route-lines,
.adv-preview-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 3600px;
  height: 4600px;
  pointer-events: none;
  stroke-linejoin: round;
}

.adv-route-lines {
  z-index: calc(var(--z-base) + 2);
}

.adv-preview-lines {
  z-index: calc(var(--z-map-floor) + 5);
}

.adv-nodes-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 3600px;
  height: 4600px;
  z-index: calc(var(--z-map-floor) + 10);
  pointer-events: none;
}

.adv-node-spherical-glow {
  position: absolute;
  inset: -20px;
  background-color: #22c55e;
  border-radius: 50%;
  filter: Blur(24px);
  opacity: 0.85;
  z-index: calc(var(--z-base) - 1);
  pointer-events: none;
}

.node {
  position: absolute;
  transform: translate3d(-50%, -50%, 0);
  white-space: nowrap; 
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
  box-shadow: 0 6px 12px Rgba(0,0,0,0.3);
  pointer-events: auto;
  cursor: pointer;
  border-radius: 12px;
}

.node:active {
  transform: translate3d(-50%, -50%, 0) Scale(0.95);
}

.node-city {
  background: linear-gradient(145deg, #3B82F6, #2563EB);
  border: 3px solid #1E3A8A;
  color: white;
  z-index: calc(var(--z-base) + 2);
  padding: 8px 16px;
  font-weight: 800;
  text-shadow: 0 1px 2px Rgba(0,0,0,0.4);
}

.node-route {
  background: linear-gradient(145deg, #F9FAFB, #E5E7EB);
  border: 3px solid #9CA3AF;
  color: #1F2937;
  z-index: calc(var(--z-base) + 2);
  font-size: 0.8rem;
  padding: 4px 12px;
  border-radius: 9999px;
  font-weight: 700;
}

.node-route-water {
  background: linear-gradient(145deg, #60A5FA, #3B82F6);
  border: 3px solid #1E40AF;
  color: white;
  z-index: calc(var(--z-base) + 2);
  font-size: 0.8rem;
  padding: 4px 12px;
  border-radius: 9999px;
  font-weight: 700;
  text-shadow: 0 1px 1px Rgba(0,0,0,0.3);
}

.node-poi {
  background: linear-gradient(145deg, #8B5CF6, #7C3AED);
  border: 3px solid #4C1D95;
  color: white;
  z-index: calc(var(--z-base) + 3);
  padding: 6px 14px;
  font-size: 0.85rem;
  border-radius: 9999px;
  font-weight: 800;
  text-shadow: 0 1px 2px Rgba(0,0,0,0.4);
}

.node-league {
  background: linear-gradient(145deg, #FCD34D, #F59E0B);
  border: 4px solid #B45309;
  color: #78350F;
  text-transform: uppercase;
  z-index: calc(var(--z-base) + 4);
  padding: 10px 20px;
  font-size: 1.1rem;
  border-radius: 14px;
}

.node.active-node {
  box-shadow: 0 0 0 5px Rgba(255, 255, 255, 0.9), 0 0 30px Rgba(255, 255, 255, 0.8) !important;
  z-index: 25;
  animation: pulseActive 2s infinite;
}

.node-locked {
  filter: Grayscale(100%) Brightness(60%) sepia(20%);
  opacity: 0.9;
}

.node-undiscovered {
  background: #1f2937 !important;
  border-color: #111827 !important;
  color: transparent !important;
  text-shadow: 0 0 0 #9ca3af !important;
  filter: Grayscale(100%) Brightness(50%);
  z-index: calc(var(--z-base) + 1) !important;
}

.node-event::before {
  content: '❗';
  position: absolute;
  top: -32px;
  left: 50%;
  transform: Translatex(-50%);
  font-size: 1.8rem;
  color: #FBBF24;
  z-index: 30;
  animation: bounceEvent 0.8s infinite;
}

:deep(.preview-line),
.preview-line {
  stroke: #FBBF24;
  stroke-width: 18;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 20, 14;
  animation: gpsMove 0.6s linear infinite;
  filter: Drop-Shadow(0 0 10px Rgba(251, 191, 36, 0.95)) Drop-Shadow(0 0 4px Rgba(0, 0, 0, 0.9));
}

:deep(.preview-line-fly),
.preview-line-fly {
  stroke: #60A5FA;
  stroke-width: 16;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 18, 22;
  animation: gpsMove 0.4s linear infinite;
  filter: Drop-Shadow(0 0 10px Rgba(96, 165, 250, 0.95));
}

#player-token {
  position: absolute;
  transform-origin: bottom center;
  transform: Translate(-50%, -75%); 
  z-index: 100;
  width: 48px;
  height: 48px;
  pointer-events: none;
  will-change: left, top;
}

#player-sprite {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  transition: transform 0.2s ease;
}

#companion-token {
  position: absolute;
  right: -24px;
  bottom: 2px;
  width: 32px;
  height: 32px;
  transition: transform 0.2s ease;
}

.pixel-art {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.anim-bounce {
  animation: bouncePlayer 0.3s infinite alternate;
}

.anim-bounce-companion {
  animation: bouncePlayer 0.3s infinite alternate 0.15s;
}

.floating-tools-container {
  position: fixed;
  top: clamp(190px, dvh, 210px);
  right: 14px;
  z-index: calc(var(--z-modal) + 10);
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: auto;
  transition: opacity 0.2s ease, transform 0.2s ease;

  @media (min-width: 960px) {
    top: 90px;
  }
}

.floating-tools-container.tools-hidden {
  opacity: 0;
  pointer-events: none;
  transform: Translatex(20px);
}

.floating-btn {
  background: linear-gradient(145deg, #374151, #1f2937);
  color: white;
  border: 2.5px solid #f3f4f6;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 6px 16px Rgba(0, 0, 0, 0.6);
  font-size: 1.25rem;
  cursor: pointer;
  transition: transform 0.1s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.floating-btn:active {
  transform: Scale(0.9);
}

.btn-close-color {
  background: linear-gradient(145deg, #ef4444, #dc2626) !important;
  border-color: #fca5a5 !important;
}

.btn-team-color {
  background: linear-gradient(145deg, #3b82f6, #2563eb) !important;
  border-color: #93c5fd !important;
}

.btn-debug-color {
  background: linear-gradient(145deg, #7e22ce, #581c87) !important;
  border-color: #d8b4fe !important;
}

@media (max-width: 640px) {
  .floating-tools-container {
    right: 10px;
    gap: 8px;
  }
  .floating-btn {
    width: 40px;
    height: 40px;
    font-size: 1.1rem;
    border-width: 2px;
  }
}

.adv-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: dvw;
  height: 100dvh;
  background: Rgba(0, 0, 0, 0.85);
  z-index: 50100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.adv-modal-card {
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  box-shadow: 0 20px 40px Rgba(0, 0, 0, 0.8), inset 0 1px 0 Rgba(255, 255, 255, 0.1);
  border: 2px solid #3b82f6;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.adv-modal-card.border-purple {
  border-color: #a855f7;
  box-shadow: 0 20px 40px Rgba(0, 0, 0, 0.8), 0 0 20px Rgba(168, 85, 247, 0.25);
}

.adv-modal-card.border-yellow {
  border-color: #eab308;
  box-shadow: 0 20px 40px Rgba(0, 0, 0, 0.8), 0 0 20px Rgba(234, 179, 8, 0.25);
}

.adv-modal-header {
  padding: 14px 16px;
  text-align: center;
  font-weight: 900;
  font-size: 1.15rem;
  letter-spacing: 0.05em;
  color: white;
  @include pixelated;

  &.header-yellow {
    background: linear-gradient(180deg, #facc15 0%, #ca8a04 100%);
    color: #422006;
    border-bottom: 2px solid #a16207;
  }
}

.adv-modal-body {
  padding: 16px;
  max-height: 60dvh;
  overflow-y: auto;
  color: #f1f5f9;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: Rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
}

.radar-cities-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radar-city-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: Rgba(30, 41, 59, 0.85);
  border: 1.5px solid Rgba(234, 179, 8, 0.35);
  border-radius: 12px;
  padding: 10px 14px;
  color: #f8fafc;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px Rgba(0, 0, 0, 0.3);

  &:hover {
    background: Rgba(234, 179, 8, 0.18);
    border-color: #facc15;
    transform: Translatex(4px);
    box-shadow: 0 4px 12px Rgba(234, 179, 8, 0.25);
  }

  &:active {
    transform: Scale(0.98);
  }

  .city-name {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .city-type-badge {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 6px;
    background: Rgba(234, 179, 8, 0.2);
    color: #fef08a;
    border: 1px solid Rgba(234, 179, 8, 0.5);
    letter-spacing: 0.05em;
  }
}

.adv-modal-footer {
  padding: 14px 16px;
  background: #0b1120;
  border-top: 1px solid Rgba(255, 255, 255, 0.08);
}

.adv-btn-close {
  width: 100%;
  background: #334155;
  color: white;
  font-weight: 800;
  padding: 12px;
  border-radius: 12px;
  font-size: 0.95rem;
  border: 1.5px solid Rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;

  &.btn-yellow {
    background: linear-gradient(180deg, #facc15 0%, #d97706 100%);
    color: #451a03;
    border-color: #b45309;
    font-weight: 900;
    box-shadow: 0 4px 12px Rgba(217, 119, 6, 0.35);

    &:hover {
      filter: Brightness(1.1);
    }
  }

  &:active {
    transform: Scale(0.97);
  }
}

#planning-ui-panel {
  position: absolute;
  bottom: calc(var(--hud-bottom-padding, 80px) + 8px);
  left: 0;
  width: 100%;
  padding: 8px 16px;
  z-index: calc(var(--z-modal) + 20);
  display: flex;
  justify-content: center;
  pointer-events: none;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;

  @media (min-width: 960px) {
    bottom: 24px;
    padding: 12px 16px;
  }
}

#planning-ui-panel.planning-hidden {
  transform: Translatey(120%);
}

#planning-ui-panel .planning-card {
  background-color: #111827 !important;
  background: Rgba(17, 24, 39, 0.98);
  border: 2px solid #4b5563;
  border-radius: 20px;
  padding: 14px 16px;
  box-shadow: 0 12px 32px Rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: min(380px, dvw);
  pointer-events: auto;
  box-sizing: border-box;
}

.planning-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #374151;
  padding-bottom: 8px;
  gap: 8px;
}

.planning-title {
  color: white;
  font-weight: 900;
  font-size: 0.95rem;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.planning-badge {
  background: #1f2937;
  color: #d1d5db;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 9999px;
  border: 1px solid #4b5563;
  flex-shrink: 0;
}

.planning-stats-box {
  background: Rgba(15, 23, 42, 0.9);
  border-radius: 12px;
  padding: 8px 12px;
  border: 1px solid #374151;
}

.planning-stats-title {
  font-size: 9px;
  color: #9ca3af;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-align: center;
  margin-bottom: 4px;
}

.planning-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-align: center;
}

.planning-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.planning-stat-icon {
  font-size: 1.1rem;
}

.planning-stat-val {
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  margin-top: 2px;
}

.planning-stat-val.stat-high {
  color: #facc15;
  font-weight: 900;
}

.planning-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.planning-btn-cancel {
  background: linear-gradient(to bottom, #4b5563, #374151);
  color: white;
  padding: 8px 12px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.8rem;
  border: 2px solid #374151;
  box-shadow: 0 3px 0 #1f2937;
  flex: 1;
  cursor: pointer;
}

.planning-btn-cancel:active {
  transform: Translatey(2px);
  box-shadow: none;
}

.planning-btn-alt {
  background: linear-gradient(to bottom, #3b82f6, #2563eb);
  color: white;
  padding: 8px 12px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.8rem;
  border: 2px solid #1e3a8a;
  box-shadow: 0 3px 0 #1e3a8a;
  flex: 1;
  cursor: pointer;
}

.planning-btn-alt:active {
  transform: Translatey(2px);
  box-shadow: none;
}

.planning-btn-go {
  background: linear-gradient(to bottom, #22c55e, #16a34a);
  color: white;
  padding: 8px 16px;
  border-radius: 12px;
  font-weight: 900;
  font-size: 0.95rem;
  border: 2px solid #14532d;
  box-shadow: 0 3px 0 #14532d;
  flex: 1.4;
  cursor: pointer;
}

.planning-btn-go:active {
  transform: Translatey(2px);
  box-shadow: none;
}

.fixed-navigation-arrows {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.nav-arrow-group {
  position: absolute;
  z-index: var(--z-map-spawns);
  pointer-events: auto;
  display: flex;
  gap: 6px;
}

.nav-arrow-group.north {
  top: calc(50% + 30px - 210px);
  left: 50%;
  transform: Translate(-50%, -50%);
}

.nav-arrow-group.south {
  top: calc(50% + 30px + 210px);
  left: 50%;
  transform: Translate(-50%, -50%);
}

.nav-arrow-group.west {
  left: calc(50% - 190px);
  top: calc(50% + 30px);
  transform: Translate(-50%, -50%);
  flex-direction: column;
}

.nav-arrow-group.east {
  left: calc(50% + 190px);
  top: calc(50% + 30px);
  transform: Translate(-50%, -50%);
  flex-direction: column;
}

@media (max-width: 640px) {
  .nav-arrow-group.north {
    top: calc(50% + 30px - 175px);
  }
  .nav-arrow-group.south {
    top: calc(50% + 30px + 175px);
  }
  .nav-arrow-group.west {
    left: 12px;
    top: calc(50% + 30px);
    transform: Translatey(-50%);
  }
  .nav-arrow-group.east {
    left: auto;
    right: 12px;
    top: calc(50% + 30px);
    transform: Translatey(-50%);
  }
}

.nav-arrow-btn {
  padding: 8px 14px;
  background: linear-gradient(145deg, #1f2937, #111827);
  border: 2px solid #facc15;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 900;
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 4px;
  color: white;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.1s ease;
}

.nav-arrow-btn:active {
  transform: Scale(0.95);
}
</style>
