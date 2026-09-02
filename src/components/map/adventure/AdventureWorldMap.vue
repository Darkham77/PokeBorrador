<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import MapCard from '@/components/map/MapCard.vue'
import AdventureInventoryModal from './AdventureInventoryModal.vue'
import AdventureDebugModal from './AdventureDebugModal.vue'

// Import Kanto Map Data
import { rawNodes, connections, officialMapIdMap, REVERSE_OFFICIAL_MAP_ID_MAP, type MapNode, type DijkstraPath, type AdventureDirection, type AdventureTerrain } from './adventureMapData'
import { getAdjacentNodes, getAlternativePaths } from './adventurePathfinding'

// Import Poké Vicio Stores and Data
import { useMapStore } from '@/stores/map'
import { useUIStore } from '@/stores/ui'
import { useShopStore } from '@/stores/inventory/shop'
import { MAPS_BY_ROUTE_ID } from '@/data/world/maps'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { isWeatherTableRouteId, requireWeatherSeasonId } from '@/data/world/weather-tables'
import { isMapRouteId, requireMapRouteId, type MapRouteId } from '@/data/world/map-assets'
import { getMapSpawnPoolData } from '@/logic/encounters/encounterHelpers'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const mapStore = useMapStore()
const uiStore = useUIStore()
const shopStore = useShopStore()

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
  const vpW = viewport.value.clientWidth
  const vpH = viewport.value.clientHeight
  // Target: MapCard (250px wide) fits comfortably occupying ~84% of narrow width or ~65% of height
  const targetCardWidth = Math.min(vpW * 0.84, vpH * 0.65, 360)
  const scale = targetCardWidth / 250
  return Math.min(Math.max(scale, 0.8), 1.5)
}

function getOptimalMapScale(): number {
  if (!viewport.value) return 0.75
  const vpW = viewport.value.clientWidth
  if (vpW < 500) return 0.55
  if (vpW < 800) return 0.65
  return 0.75
}

// Reactive State
const playerInventory = ref<Record<string, boolean>>(
  JSON.parse(localStorage.getItem('pokeVicioInventory') || '{"Corte":false,"Surf":false,"Flauta":false,"Medallas":false,"Vuelo":false,"Bicicleta":true}')
)
const discoveredNodes = ref<string[]>(
  JSON.parse(localStorage.getItem('pokeVicioDiscovered') || '["pallet","route1","viridian"]')
)
const activeCompanion = ref<string>(localStorage.getItem('pokeVicioCompanion') || 'none')
const currentSwarmRoute = ref<string | null>(null)

// Initialize current node from mapStore or localStorage
const initialNode = (() => {
  const currentOfficial = mapStore.currentMap
  if (currentOfficial && REVERSE_OFFICIAL_MAP_ID_MAP[currentOfficial]) {
    return REVERSE_OFFICIAL_MAP_ID_MAP[currentOfficial]
  }
  return localStorage.getItem('pokeVicioLocation') || 'pallet'
})()

const currentNode = ref<string>(initialNode)
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
    if (isMapRouteId(officialId)) {
      const loc = MAPS_BY_ROUTE_ID[officialId]
      if (loc) {
        map[localId] = loc
        continue
      }
    }
    const rawNode = rawNodes[localId]
    if (rawNode && (rawNode.type === 'city' || rawNode.type === 'league')) {
      const validRouteId: MapRouteId = isMapRouteId(officialId) ? officialId : 'route1'
      map[localId] = {
        id: validRouteId,
        name: rawNode.name,
        icon: rawNode.type === 'league' ? '🏆' : '🏙️',
        badges: 0,
        desc: cityDescriptions[localId] || 'Centro urbano de Kanto.',
        wild: emptyWild,
        rates: emptyWildRates,
        lv: [1, 1],
        weather: {}
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
  const vpWidth = viewport.value.clientWidth
  const vpHeight = viewport.value.clientHeight
  const scaledWidth = WORLD_WIDTH * currentScale.value
  const scaledHeight = WORLD_HEIGHT * currentScale.value
  let minX, maxX, minY, maxY

  if (scaledWidth <= vpWidth) {
    minX = maxX = (vpWidth - scaledWidth) / 2
  } else {
    minX = vpWidth - scaledWidth
    maxX = 0
  }

  if (scaledHeight <= vpHeight) {
    minY = maxY = (vpHeight - scaledHeight) / 2
  } else {
    minY = vpHeight - scaledHeight
    maxY = 0
  }

  currentPanX.value = Math.max(minX, Math.min(maxX, currentPanX.value))
  currentPanY.value = Math.max(minY, Math.min(maxY, currentPanY.value))
}

function centerCameraOn(x: number, y: number, smooth = true, customScale: number | null = null) {
  if (!viewport.value) return
  if (customScale !== null) currentScale.value = customScale
  const centerYOffset = 30
  currentPanX.value = (viewport.value.clientWidth / 2) - (x * currentScale.value)
  currentPanY.value = (viewport.value.clientHeight / 2 + centerYOffset) - (y * currentScale.value)
  clampCamera()
  updateCameraTransform(smooth)
}

function returnToCurrentLocation() {
  if (!isMoving.value && !isPlanning.value && !isZoomedIn.value) {
    enterParkedMode()
  }
  if (isPlanning.value) {
    cancelPlanning()
  }
}

// Parked mode setup
function enterParkedMode() {
  isZoomedIn.value = true
  isPlanning.value = false
  setStatus('Estacionado', false)
  
  const targetScale = getOptimalParkedScale()
  const node = mapNodes.value[currentNode.value]
  if (node) {
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

// Drag logic
const dragState = {
  isDragging: false,
  isPointerDown: false,
  initialClickX: 0,
  initialClickY: 0,
  dragStartX: 0,
  dragStartY: 0
}

function startDrag(clientX: number, clientY: number) {
  if ((isZoomedIn.value && !isPlanning.value) || isMoving.value) return
  dragState.isPointerDown = true
  dragState.isDragging = false
  dragState.initialClickX = clientX
  dragState.initialClickY = clientY
  dragState.dragStartX = clientX - currentPanX.value
  dragState.dragStartY = clientY - currentPanY.value
}

function doDrag(clientX: number, clientY: number) {
  if (!dragState.isPointerDown) return
  if (!dragState.isDragging && (Math.abs(clientX - dragState.initialClickX) > 8 || Math.abs(clientY - dragState.initialClickY) > 8)) {
    dragState.isDragging = true
  }
  if (dragState.isDragging) {
    currentPanX.value = clientX - dragState.dragStartX
    currentPanY.value = clientY - dragState.dragStartY
    clampCamera()
    updateCameraTransform(false)
  }
}

function endDrag() {
  dragState.isPointerDown = false
  setTimeout(() => { dragState.isDragging = false }, 50)
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
  
  confirmTravel()
}

// GPS / Planning
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
    if (nId === currentSwarmRoute.value) sums.w = Math.min(100, sums.w + 50)
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
    line.setAttribute('class', isFly ? 'preview-line-fly' : 'preview-line')
    previewLinesSvg.value.appendChild(line)
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
  if (previewLinesSvg.value) previewLinesSvg.value.innerHTML = ''

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

    // Sync with official game map navigation
    const rawOfficialId = officialMapIdMap[finalNode]
    if (rawOfficialId && isMapRouteId(rawOfficialId)) {
      const routeId = requireMapRouteId(rawOfficialId)
      if (MAPS_BY_ROUTE_ID[routeId]) {
        await mapStore.navigate(routeId)
      }
    }

    const finalNodeObj = mapNodes.value[finalNode]
    if (finalNodeObj?.hasEvent) {
      setTimeout(() => showActionAlert(`¡Oye! Tienes un evento pendiente en ${finalNodeObj.name}.`), 800)
    }
  }
  enterParkedMode()
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
        for (let i = 0; i < legs.length; i++) {
          const l = legs[i]
          if (l && currentTime <= l.endTime) {
            activeLeg = l
            break
          }
        }

        if (activeLeg) {
          const legElapsed = Math.max(0, currentTime - activeLeg.startTime)
          const legRatio = activeLeg.duration > 0 ? Math.min(1, legElapsed / activeLeg.duration) : 1

          const currentX = activeLeg.startX + activeLeg.dx * legRatio
          const currentY = activeLeg.startY + activeLeg.dy * legRatio

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

// Swarms
const triggerSwarm = () => {
  const routes = Object.keys(mapNodes.value).filter(id => mapNodes.value[id]?.type.includes('route'))
  const randomRoute = routes[Math.floor(Math.random() * routes.length)]
  currentSwarmRoute.value = randomRoute || null
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
  shopStore.healAllPokemon(0)
  showActionAlert('Turururu-ru~\n\nTus Pokémon están completamente sanos y listos para seguir luchando.')
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

const debugTriggerSwarm = () => {
  triggerSwarm()
  const swarmNode = currentSwarmRoute.value ? mapNodes.value[currentSwarmRoute.value] : null
  showActionAlert('⚙️ Enjambre forzado en: ' + (swarmNode?.name || 'Ruta desconocida'))
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
  triggerSwarm()
  updatePlayerVisuals()
  updateDayNightCycle()
  const dayNightTimer = setInterval(updateDayNightCycle, 60000)
  window.addEventListener('resize', handleResize)

  const currentLoc = mapNodes.value[currentNode.value]
  if (playerToken.value && currentLoc) {
    playerToken.value.style.left = `${currentLoc.x}px`
    playerToken.value.style.top = `${currentLoc.y}px`
  }

  nextTick(() => {
    enterParkedMode()
  })

  onUnmounted(() => {
    clearInterval(dayNightTimer)
    window.removeEventListener('resize', handleResize)
    if (playerToken.value) gsap.killTweensOf(playerToken.value)
    if (worldContainer.value) gsap.killTweensOf(worldContainer.value)
  })
})
</script>

<template>
  <div class="adventure-world-modal-fullscreen">
    <!-- Top-Left Floating Info Chip -->
    <div
      class="adv-floating-info-chip"
      :class="{ 'tools-hidden': isMoving || isPlanning }"
    >
      <div
        class="adv-chip-main"
        title="Centrar en Ubicación Actual"
        @click="returnToCurrentLocation"
      >
        <span class="adv-chip-title">KANTO</span>
        <span
          class="adv-chip-dot"
          :class="statusDotClass"
        />
        <span class="adv-chip-location">📍 {{ mapNodes[currentNode]?.name || 'Cargando...' }}</span>
      </div>
      <div
        v-if="currentSwarmRoute"
        class="adv-chip-swarm"
      >
        <span class="icon">🔴</span> Enjambre: {{ mapNodes[currentSwarmRoute]?.name }}
      </div>
    </div>

    <!-- Map Viewport -->
    <main
      id="map-viewport"
      ref="viewport" 
      @mousedown="startDrag($event.clientX, $event.clientY)"
      @mousemove="doDrag($event.clientX, $event.clientY)"
      @mouseup="endDrag"
      @touchstart="$event.touches?.[0] && startDrag($event.touches[0].clientX, $event.touches[0].clientY)"
      @touchmove="$event.touches?.[0] && doDrag($event.touches[0].clientX, $event.touches[0].clientY)"
      @touchend="endDrag"
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
              @click.stop="() => {
                if (!isMoving) {
                  if (isZoomedIn && !isPlanning && currentNode === id) {
                    exploreZone()
                  } else {
                    planTravel(id as string)
                  }
                }
              }"
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

                <MapCard 
                  :map="mapLocationsById[id]"
                  :is-locked="!!(node.requiresMO && !playerInventory[node.requiresMO])"
                  :cycle="currentCycle"
                  :weather="getWeatherForMap(id as string)"
                  :badge-count="8"
                  :spawn-pool="getSpawnPoolForMap(id as string)"
                  :force-keep-warm="true"
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
                id === currentSwarmRoute ? 'node-swarm' : '',
                node.hasEvent ? 'node-event' : ''
              ]"
              :style="{ left: `${node.x}px`, top: `${node.y}px` }"
              @click.stop="() => {
                if (!isMoving) {
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
        @click="() => {
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
    <div
      v-if="alertOpen"
      class="adv-modal-overlay"
    >
      <div class="adv-modal-card">
        <p class="adv-alert-message">
          {{ alertMsg }}
        </p>
        <button
          class="adv-alert-btn"
          @click="closeAlert"
        >
          ▼ Siguiente
        </button>
      </div>
    </div>

    <!-- Radar Modal -->
    <div
      v-if="showRadarModal"
      class="adv-modal-overlay"
    >
      <div class="adv-modal-card border-yellow">
        <div class="adv-modal-header bg-gradient-to-b from-yellow-400 to-yellow-500 text-yellow-900 border-b-2 border-yellow-600">
          <span class="icon">🧭</span> RADAR RÁPIDO
        </div>
        <div class="adv-modal-body space-y-2">
          <button
            v-for="id in discoveredNodes.filter(n => mapNodes[n] && ['city', 'league'].includes(mapNodes[n]?.type || ''))"
            :key="id"
            class="w-full text-left bg-gray-100 p-3 rounded-xl font-bold text-gray-800 border-2 border-gray-200 hover:bg-yellow-50 hover:border-yellow-400 active:scale-95 transition-all"
            @click="() => {
              toggleRadarModal()
              if (isZoomedIn) exitParkedMode()
              const loc = mapNodes[id]
              if (loc) {
                centerCameraOn(loc.x, loc.y, true, getOptimalMapScale())
              }
            }"
          >
            <span class="icon">📍</span> {{ mapNodes[id]?.name }}
          </button>
        </div>
        <div class="adv-modal-footer">
          <button
            class="adv-btn-close"
            @click="toggleRadarModal"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>

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
      @trigger-swarm="debugTriggerSwarm"
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
  z-index: 100;
  background-color: #0f172a;
  font-family: 'Nunito', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  width: 100vw;
  overflow: hidden;
  color: #ffffff;
  user-select: none;
}

.adv-floating-info-chip {
  position: fixed;
  top: calc(var(--hud-top-padding, 115px) + 4px);
  left: 50%;
  transform: Translatex(-50%);
  z-index: 160;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.adv-chip-main {
  background: Rgba(17, 24, 39, 0.92);
  backdrop-filter: Blur(12px);
  -webkit-backdrop-filter: Blur(12px);
  border: 1.5px solid #4b5563;
  padding: 4px 12px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: transform 0.1s ease;
  &:active { transform: Scale(0.96); }
}

.adv-chip-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.7rem;
  font-weight: 900;
  color: #fde047;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 2px Rgba(0, 0, 0, 0.8);
}

.adv-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  &.bg-green-400 { background-color: #4ade80; box-shadow: 0 0 6px #4ade80; }
  &.bg-yellow-400 { background-color: #facc15; box-shadow: 0 0 6px #facc15; }
}

.adv-chip-location {
  font-size: 0.75rem;
  font-weight: 800;
  color: white;
}

.adv-chip-swarm {
  background: #dc2626;
  color: white;
  font-size: 9px;
  font-weight: 900;
  padding: 2px 10px;
  border-radius: 9999px;
  border: 1px solid #991b1b;
  box-shadow: 0 3px 8px Rgba(0, 0, 0, 0.4);
  animation: pulseActive 1.5s infinite;
  max-width: 65vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.adv-node-card-wrapper {
  position: absolute;
  transform: Translate(-50%, -50%);
  transform-origin: center center;
  cursor: pointer;
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
  z-index: 50;
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

.adv-alert-message {
  color: #1f2937;
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 20px;
  line-height: 1.5;
  white-space: pre-line;
}

.adv-alert-btn {
  align-self: flex-end;
  background: #1f2937;
  color: white;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  &:active { transform: Scale(0.96); }
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
  width: 100vw;
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
  z-index: 1;
  transition: background-color 2s ease;
}

#weather-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
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
  z-index: 2;
}

.adv-preview-lines {
  z-index: 8;
}

.adv-nodes-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 3600px;
  height: 4600px;
  z-index: 10;
  pointer-events: none;
}

.adv-node-spherical-glow {
  position: absolute;
  inset: -20px;
  background-color: #22c55e;
  border-radius: 50%;
  filter: Blur(24px);
  opacity: 0.85;
  z-index: -1;
  pointer-events: none;
}

.node {
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
  z-index: 2;
  padding: 8px 16px;
  font-weight: 800;
  text-shadow: 0 1px 2px Rgba(0,0,0,0.4);
}

.node-route {
  background: linear-gradient(145deg, #F9FAFB, #E5E7EB);
  border: 3px solid #9CA3AF;
  color: #1F2937;
  z-index: 2;
  font-size: 0.8rem;
  padding: 4px 12px;
  border-radius: 9999px;
  font-weight: 700;
}

.node-route-water {
  background: linear-gradient(145deg, #60A5FA, #3B82F6);
  border: 3px solid #1E40AF;
  color: white;
  z-index: 2;
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
  z-index: 3;
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
  z-index: 4;
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
  z-index: 1 !important;
}

.node-swarm {
  animation: pulseActive 1.5s infinite !important;
  border-color: #ef4444 !important;
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

.preview-line {
  stroke: #FCD34D;
  stroke-width: 18;
  stroke-linecap: round;
  stroke-dasharray: 24, 16;
  animation: gpsMove 0.7s linear infinite;
}

.preview-line-fly {
  stroke: #60A5FA;
  stroke-width: 16;
  stroke-linecap: round;
  stroke-dasharray: 18, 22;
  animation: gpsMove 0.4s linear infinite;
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
  top: calc(var(--hud-top-padding, 115px) + 8px);
  right: 14px;
  z-index: 160;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: auto;
  transition: opacity 0.2s ease, transform 0.2s ease;
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
  width: 100vw;
  height: 100dvh;
  background: Rgba(0, 0, 0, 0.75);
  backdrop-filter: Blur(8px);
  -webkit-backdrop-filter: Blur(8px);
  z-index: 50100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.adv-modal-card {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 380px;
  overflow: hidden;
  box-shadow: 0 20px 40px Rgba(0, 0, 0, 0.6);
  border: 4px solid #3b82f6;
  box-sizing: border-box;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.adv-modal-card.border-purple {
  border-color: #a855f7;
}

.adv-modal-card.border-yellow {
  border-color: #eab308;
}

.adv-modal-header {
  padding: 14px;
  text-align: center;
  font-weight: 900;
  font-size: 1.15rem;
  color: white;
}

.adv-modal-body {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
  color: #1f2937;
}

.adv-modal-footer {
  padding: 12px 16px;
  background: #f3f4f6;
  border-top: 2px solid #e5e7eb;
}

.adv-btn-close {
  width: 100%;
  background: #1f2937;
  color: white;
  font-weight: 700;
  padding: 12px;
  border-radius: 12px;
  font-size: 1rem;
  border: none;
  cursor: pointer;
}

.adv-btn-close:active {
  transform: Scale(0.97);
}

#planning-ui-panel {
  position: fixed;
  bottom: calc(var(--hud-bottom-padding, 0px) + 8px);
  left: 0;
  width: 100vw;
  padding: 12px 16px;
  z-index: 150;
  display: flex;
  justify-content: center;
  pointer-events: none;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

#planning-ui-panel.planning-hidden {
  transform: Translatey(120%);
}

#planning-ui-panel .planning-card {
  background-color: #111827 !important;
  background: Rgba(17, 24, 39, 0.98);
  backdrop-filter: Blur(16px);
  -webkit-backdrop-filter: Blur(16px);
  border: 2px solid #4b5563;
  border-radius: 20px;
  padding: 14px 16px;
  box-shadow: 0 12px 32px Rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: min(380px, 94vw);
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
  z-index: 50;
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
