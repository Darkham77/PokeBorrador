<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import MapCard from '@/components/map/MapCard.vue'
import AdventureInventoryModal from './AdventureInventoryModal.vue'
import AdventureDebugModal from './AdventureDebugModal.vue'

// Import Kanto Map Data
import { rawNodes, connections, officialMapIdMap, type MapNode, type DijkstraPath } from './mapData.ts'
import { getAdjacentNodes, getAlternativePaths } from './adventurePathfinding.ts'

// Import Poké Vicio Stores and Data
import { useMapStore } from '@/stores/map'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { isWeatherTableRouteId, requireWeatherSeasonId } from '@/data/world/weather-tables'
import type { MapRouteId } from '@/data/world/map-assets'
import { getMapSpawnPoolData } from '@/logic/encounters/encounterHelpers'
import type { MapLocation } from '@/types/pokemon/encounters'

import { useModalStore } from '@/stores/modals'

const mapStore = useMapStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const modalStore = useModalStore()

// Disable low power mode in the test view to ensure backgrounds are pre-rendered and kept warm
uiStore.lowPowerMode = 'disabled'

// Disable modal openings in this test view to prevent cards from hiding their contents 
modalStore.open = () => {}

// If gameStore has enterSandboxMode, run it to ensure clean data state
if (typeof gameStore.enterSandboxMode === 'function') {
  gameStore.enterSandboxMode()
}

// Ported constants
const SPACING_MULTIPLIER = 2.5
const WORLD_WIDTH = 3600
const WORLD_HEIGHT = 4600
 
const moIcons: Record<string, string> = { 'Corte': '✂️', 'Surf': '🌊', 'Flauta': '🎵', 'Medallas': '🏅', 'Vuelo': '🦅' }

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

const currentNode = ref<string>(localStorage.getItem('pokeVicioLocation') || 'pallet')
const isMoving = ref(false)
const isZoomedIn = ref(true)
const isPlanning = ref(false)
const playerDirection = ref<'down' | 'up' | 'left' | 'right'>('down')
const activeTravelTerrain = ref<'land' | 'water'>('land')

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

// DOM refs
const worldContainer = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const playerToken = ref<HTMLElement | null>(null)
const companionSprite = ref<HTMLImageElement | null>(null)
const playerSprite = ref<HTMLElement | null>(null)
const glowMarkerRef = ref<HTMLElement | null>(null)
const previewLinesSvg = ref<SVGElement | null>(null)

const mapNodes = computed(() => {
  const result: Record<string, MapNode> = {}
  for (const [key, node] of Object.entries(rawNodes)) {
    result[key] = { ...node, x: node.x * SPACING_MULTIPLIER, y: node.y * SPACING_MULTIPLIER }
  }
  return result
})

const visibleWorldBounds = computed(() => {
  const vpW = viewport.value ? viewport.value.clientWidth : (typeof window !== 'undefined' ? window.innerWidth : 800)
  const vpH = viewport.value ? viewport.value.clientHeight : (typeof window !== 'undefined' ? window.innerHeight : 600)
  const scale = currentScale.value || 0.75
  const margin = 850 // Generous margin in world coords for ultra-smooth scrolling

  const minX = (-currentPanX.value) / scale - margin
  const maxX = (vpW - currentPanX.value) / scale + margin
  const minY = (-currentPanY.value) / scale - margin
  const maxY = (vpH - currentPanY.value) / scale + margin

  return { minX, maxX, minY, maxY }
})

function isNodeNearViewport(node: MapNode, nodeId: string): boolean {
  if (isPlanning.value) {
    const plan = currentPlanPaths.value[selectedPlanIndex.value]
    if (plan && plan.nodes.includes(nodeId)) return true
  }
  if (nodeId === currentNode.value || nodeId === planningTarget.value) return true

  const bounds = visibleWorldBounds.value
  return node.x >= bounds.minX && node.x <= bounds.maxX && node.y >= bounds.minY && node.y <= bounds.maxY
}

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

const mapLocationsById = computed(() => {
  const map: Record<string, MapLocation> = {}
  for (const [localId, officialId] of Object.entries(officialMapIdMap)) {
    const loc = FIRE_RED_MAPS.find(m => m.id === officialId)
    if (loc) {
      map[localId] = loc as MapLocation
    } else {
      const rawNode = rawNodes[localId]
      if (rawNode && (rawNode.type === 'city' || rawNode.type === 'league')) {
        map[localId] = {
          id: officialId,
          name: rawNode.name,
          icon: rawNode.type === 'league' ? '🏆' : '🏙️',
          badges: 0,
          desc: cityDescriptions[localId] || 'Centro urbano de Kanto.',
          wild: { morning: [], day: [], dusk: [], night: [] },
          rates: { morning: [], day: [], dusk: [], night: [] },
          lv: [1, 1],
          weather: {}
        } as unknown as MapLocation
      }
    }
  }
  return map
})

const currentCycle = computed(() => mapStore.currentCycle || 'day')

// Atmosphere/Weather helper
function getWeatherForMap(nodeId: string): string {
  const officialId = (officialMapIdMap[nodeId] || nodeId) as MapRouteId
  if (mapStore.globalWeather) return mapStore.globalWeather
  if (!isWeatherTableRouteId(officialId)) return 'clear'
  const seasonId = mapStore.currentSeason?.id ? requireWeatherSeasonId(mapStore.currentSeason.id) : 'spring'
  return getRouteWeather(officialId, seasonId, mapStore.currentEpochHour, currentCycle.value)
}

// Spawn pool helper
function getSpawnPoolForMap(nodeId: string) {
  const loc = mapLocationsById.value[nodeId]
  if (!loc || !loc.wild) return { generic: [] as string[], specific: [] as string[], rates: {} as Record<string, number> }

  const activeWeather = getWeatherForMap(nodeId)
  const { generic, specific, rates } = getMapSpawnPoolData(
    loc,
    currentCycle.value,
    activeWeather || 'clear',
    []
  )
  return { generic, specific, rates }
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
  currentPanX.value = (viewport.value.clientWidth / 2) - (x * currentScale.value)
  currentPanY.value = (viewport.value.clientHeight / 2) - (y * currentScale.value)
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
  setStatus("Estacionado", false)
  
  const targetScale = getOptimalParkedScale()
  centerCameraOn(mapNodes.value[currentNode.value].x, mapNodes.value[currentNode.value].y, true, targetScale)
}

function exitParkedMode() {
  isZoomedIn.value = false
  setStatus("Modo Libre", true)
  const targetScale = getOptimalMapScale()
  centerCameraOn(mapNodes.value[currentNode.value].x, mapNodes.value[currentNode.value].y, true, targetScale)
}

// Drag logic
let isDragging = false
let isPointerDown = false
let initialClickX = 0
let initialClickY = 0
let dragStartX = 0
let dragStartY = 0

function startDrag(clientX: number, clientY: number) {
  if ((isZoomedIn.value && !isPlanning.value) || isMoving.value) return
  isPointerDown = true
  isDragging = false
  initialClickX = clientX
  initialClickY = clientY
  dragStartX = clientX - currentPanX.value
  dragStartY = clientY - currentPanY.value
}

function doDrag(clientX: number, clientY: number) {
  if (!isPointerDown) return
  if (!isDragging && (Math.abs(clientX - initialClickX) > 8 || Math.abs(clientY - initialClickY) > 8)) {
    isDragging = true
  }
  if (isDragging) {
    currentPanX.value = clientX - dragStartX
    currentPanY.value = clientY - dragStartY
    clampCamera()
    updateCameraTransform(false)
  }
}

function endDrag() {
  isPointerDown = false
  setTimeout(() => { isDragging = false }, 50)
}



// Travel confirms
function travelToAdjacent(targetId: string) {
  if (isMoving.value) return
  const targetNode = mapNodes.value[targetId]

  if (targetNode.requiresMO && !playerInventory.value[targetNode.requiresMO]) { 
    showActionAlert(targetNode.blockMsg)
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

  if (!discoveredNodes.value.includes(targetId)) {
    const isAdjacent = getAdjacentNodes(currentNode.value, connections).includes(targetId)
    if (!isAdjacent) {
      showActionAlert("🗺️ <b>ZONA DESCONOCIDA</b><br><br>No puedes usar el GPS hacia zonas inexploradas. Descúbrela viajando a pie desde una ruta conectada.")
      return
    }
  }

  if (targetNode.requiresMO && !playerInventory.value[targetNode.requiresMO]) {
    showActionAlert(targetNode.blockMsg)
    return
  }

  let canFly = playerInventory.value['Vuelo'] && (targetNode.type === 'city' || targetNode.type === 'league')
  if (canFly && !discoveredNodes.value.includes(targetId)) canFly = false

  const groundPaths = getAlternativePaths(currentNode.value, targetId, mapNodes.value, playerInventory.value, discoveredNodes.value, connections)
  const paths: DijkstraPath[] = [...groundPaths]

  // If player has Fly and target is not immediately adjacent, add Fly as an alternative option
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
    const node = mapNodes.value[nodesInPath[i]]
    if (!node) continue
    const f = node.farm || { t: 0, w: 0, m: 0, f: 0 }
    sums.t = Math.max(sums.t, f.t)
    sums.w = Math.max(sums.w, f.w)
    sums.m = Math.max(sums.m, f.m)
    sums.f = Math.max(sums.f, f.f)
    if (nodesInPath[i] === currentSwarmRoute.value) sums.w = Math.min(100, sums.w + 50)
  }
  if (activeCompanion.value === 'pikachu') sums.t = Math.min(100, Math.floor(sums.t * 1.5))
  if (activeCompanion.value === 'meowth') sums.m = Math.min(100, Math.floor(sums.m * 1.5))
  if (activeCompanion.value === 'squirtle') sums.f = Math.min(100, Math.floor(sums.f * 1.5))
  return sums
}

function updatePlanUI() {
  const currentPath = currentPlanPaths.value[selectedPlanIndex.value]
  if (!currentPath) return

  drawPreviewPath(currentPath.nodes, currentPath.isFly)
  zoomToFitPath(currentPath.nodes)
}

function zoomToFitPath(nodesIds: string[]) {
  if (!viewport.value) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodesIds.forEach(id => {
    const n = mapNodes.value[id]
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
  const screenPaddingTop = 100     // Clears header (70px) + margin
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

  // Determine if the destination is closer to the top (north) or bottom (south) of the path
  const destNodeId = nodesIds[nodesIds.length - 1]
  const destNode = mapNodes.value[destNodeId]
  const isDestAtTop = destNode ? Math.abs(destNode.y - minY) < Math.abs(destNode.y - maxY) : true

  let y_center = midY

  // If the path height exceeds the visible height at this zoom, align to the destination
  if (pathHeight * newScale > availHeight) {
    if (isDestAtTop) {
      y_center = minY + (viewport.value.clientHeight / 2 - screenPaddingTop) / newScale
    } else {
      y_center = maxY - (viewport.value.clientHeight / 2 - screenPaddingBottom) / newScale
    }
  } else {
    // If it fits, center it in the visible area between header and card
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
    const nA = mapNodes.value[nodeIds[i]]
    const nB = mapNodes.value[nodeIds[i + 1]]
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

  const firstNode = mapNodes.value[pathData.nodes[0]]
  const secondNode = mapNodes.value[pathData.nodes[1]]
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
  currentNode.value = finalNode
  localStorage.setItem('pokeVicioLocation', finalNode)

  if (mapNodes.value[finalNode]?.hasEvent) {
    setTimeout(() => showActionAlert(`¡Oye! Tienes un evento pendiente en ${mapNodes.value[finalNode].name}.`), 800)
  }
  enterParkedMode()
}

function preloadTrainerSprites() {
  const directions = ['down', 'up', 'left', 'right']
  const types = ['walk', 'bike', 'surf', 'fly']
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

      const rawX = (vpWidth / 2) - (nodeX * travelScale)
      const rawY = (vpHeight / 2) - (nodeY * travelScale)
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
      dir: 'down' | 'up' | 'left' | 'right'
      terrain: 'land' | 'water'
      progressPct: number
    }

    const legs: RouteLeg[] = []
    let totalTime = 0

    for (let i = 0; i < nodes.length - 1; i++) {
      const startId = nodes[i]
      const endId = nodes[i + 1]
      const start = mapNodes.value[startId]
      const end = mapNodes.value[endId]
      if (!start || !end) continue

      const dx = end.x - start.x
      const dy = end.y - start.y
      const dist = Math.hypot(dx, dy)
      const duration = Math.max(0.12, dist / speed)

      const dir: 'down' | 'up' | 'left' | 'right' = (() => {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)
        if (angle >= -45 && angle < 45) return 'right'
        if (angle >= 45 && angle < 135) return 'down'
        if (angle >= -135 && angle < -45) return 'up'
        return 'left'
      })()
      const terrain: 'land' | 'water' = (start.type === 'route_water' || startId === 'seafoam' || end.type === 'route_water' || endId === 'seafoam') ? 'water' : 'land'
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
    playerDirection.value = legs[0].dir
    activeTravelTerrain.value = legs[0].terrain

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
          if (currentTime <= legs[i].endTime) {
            activeLeg = legs[i]
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
          const bikeCycle = [0, 1, 0, 2]
          walkFrame.value = bikeCycle[step]
        } else if (activeTravelTerrain.value === 'water') {
          const surfCycle = [0, 1, 2, 1]
          walkFrame.value = surfCycle[step]
        } else {
          const walkCycle = [0, 1, 2, 1]
          walkFrame.value = walkCycle[step]
        }
      }
    })
  })
}

// Swarms
const triggerSwarm = () => {
  const routes = Object.keys(mapNodes.value).filter(id => mapNodes.value[id].type.includes('route'))
  currentSwarmRoute.value = routes[Math.floor(Math.random() * routes.length)]
}

// Explore & Heal
const exploreZone = () => showActionAlert(`La hierba alta de ${mapNodes.value[currentNode.value].name} se mueve... ¡Prepárate!`)

function healPokemon() {
  showActionAlert("Turururu-ru~<br><br>Tus Pokémon están completamente sanos y listos para seguir luchando.")
}

// Debug features
const debugUnlockAll = () => {
  discoveredNodes.value = Object.keys(mapNodes.value)
  localStorage.setItem('pokeVicioDiscovered', JSON.stringify(discoveredNodes.value))
  showActionAlert("⚙️ Cheat: Todo el mapa ha sido descubierto.")
}

function debugGiveAllMOs() {
  ['Corte', 'Surf', 'Flauta', 'Medallas', 'Vuelo', 'Bicicleta'].forEach(mo => playerInventory.value[mo] = true)
  localStorage.setItem('pokeVicioInventory', JSON.stringify(playerInventory.value))
  updatePlayerVisuals()
  showActionAlert("⚙️ Cheat: Tienes todos los Objetos y MOs.")
}

const debugTriggerSwarm = () => {
  triggerSwarm()
  showActionAlert("⚙️ Enjambre forzado en: " + mapNodes.value[currentSwarmRoute.value!].name)
}

function debugHardReset() {
  if (confirm("⚠️ ¿Estás seguro de que quieres BORRAR TODOS LOS DATOS Y REINICIAR? Esto no se puede deshacer.")) {
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
  return adjIds.map(id => {
    const adj = mapNodes.value[id]
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
})

function handleResize() {
  if (isZoomedIn.value && !isMoving.value && !isPlanning.value) {
    const targetScale = getOptimalParkedScale()
    centerCameraOn(mapNodes.value[currentNode.value].x, mapNodes.value[currentNode.value].y, false, targetScale)
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

  // Position player token initially
  if (playerToken.value && mapNodes.value[currentNode.value]) {
    playerToken.value.style.left = `${mapNodes.value[currentNode.value].x}px`
    playerToken.value.style.top = `${mapNodes.value[currentNode.value].y}px`
  }

  // Initial draw connections
  nextTick(() => {
    enterParkedMode()
  })

  onUnmounted(() => {
    clearInterval(dayNightTimer)
    window.removeEventListener('resize', handleResize)
  })
})
</script>

<template>
  <div class="flex flex-col font-sans h-[100dvh] w-screen overflow-hidden text-white">
    <!-- Header -->
    <header class="h-[64px] md:h-[70px] bg-gradient-to-b from-red-500 to-red-600 text-white px-3 md:px-6 py-2 shadow-lg z-50 flex justify-between items-center shrink-0 border-b-[4px] md:border-b-[5px] border-red-800 relative">
      <div class="flex items-center gap-2 md:gap-3">
        <div>
          <h1 class="font-black text-lg md:text-xl tracking-widest text-yellow-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] flex items-center gap-2">
            KANTO
            <span class="flex items-center mt-1">
              <span
                class="w-2 h-2 rounded-full mr-1 animate-pulse"
                :class="statusDotClass"
              />
              <span class="text-red-100 text-[8px] md:text-[9px] font-bold uppercase tracking-wide">{{ statusText }}</span>
            </span>
          </h1>
        </div>
        <button
          class="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 px-2.5 py-1.5 md:p-2 rounded-xl border-2 border-blue-800 shadow-[0_3px_0_#1e3a8a] md:shadow-[0_4px_0_#1e3a8a] active:shadow-[0_0px_0_#1e3a8a] active:translate-y-0.5 flex items-center transition-all ml-1 md:ml-2"
          @click="toggleInventoryModal"
        >
          <span class="text-base md:text-lg">🎒</span> <span class="hidden sm:inline ml-1 text-xs font-black">Equipo</span>
        </button>
      </div>
      <div
        class="bg-gray-900 px-2.5 py-1 md:px-3 md:py-1.5 rounded-xl border-2 border-gray-600 shadow-inner text-right cursor-pointer hover:bg-gray-800 active:scale-95 transition-all max-w-[140px] sm:max-w-[220px]"
        @click="returnToCurrentLocation"
      >
        <span class="block text-[8px] md:text-[9px] text-gray-400 font-black uppercase tracking-wider">Ubicación 📍</span>
        <span class="text-white font-bold text-xs md:text-sm truncate block">{{ mapNodes[currentNode]?.name || 'Cargando...' }}</span>
      </div>
    </header>

    <div
      v-if="currentSwarmRoute && !isPlanning"
      class="absolute top-[72px] md:top-[80px] left-3 md:left-4 bg-red-600 text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border-2 border-red-800 shadow-lg z-40 animate-pulse max-w-[65vw] truncate"
    >
      🔴 Enjambre en: {{ mapNodes[currentSwarmRoute]?.name }}
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
          ref="weatherOverlay"
        />
        
        <!-- Svg Connections -->
        <svg
          id="route-lines"
          class="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
          style="stroke-linejoin: round;"
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
          class="absolute top-0 left-0 w-full h-full pointer-events-none z-[8]"
          style="stroke-linejoin: round;"
        />

        <!-- Nodes Container -->
        <div
          id="nodes-container"
          class="absolute top-0 left-0 w-full h-full z-10"
        >
          <template
            v-for="(node, id) in mapNodes"
            :key="id"
          >
            <!-- Discovered Node wrapper with MapCard (ALWAYS CLICKABLE) -->
            <div
              v-if="discoveredNodes.includes(id as string) && mapLocationsById[id]"
              :id="`node-${id}`"
              class="absolute origin-center translate-x-[-50%] translate-y-[-50%]"
              :style="{ left: `${node.x}px`, top: `${node.y}px`, zIndex: (isZoomedIn && !isMoving && !isPlanning && currentNode === id) ? 20 : 10 }"
              @click.stop="() => {
                if (!isMoving) {
                  planTravel(id as string)
                }
              }"
            >
              <div
                :style="{ transform: `scale(${(isZoomedIn && !isMoving && !isPlanning && currentNode === id) ? 1.0 : cardScale})` }"
                class="origin-center shadow-2xl rounded-2xl transition-all duration-300 hover:brightness-110 relative"
              >
                <!-- True Spherical Background Glow Effect (Only Zoomed-out map, stationary) -->
                <div 
                  v-if="!isZoomedIn && !isMoving && currentNode === id"
                  class="absolute inset-[-20px] bg-green-500 rounded-full blur-2xl opacity-90 z-[-1] pointer-events-none animate-pulse-glow"
                />

                <MapCard 
                  :map="mapLocationsById[id]"
                  :is-locked="node.requiresMO && !playerInventory[node.requiresMO]"
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
                  class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-50 pointer-events-auto"
                >
                  <button
                    class="bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-black py-1.5 px-3 rounded-lg border border-red-800 shadow-[0_3px_0_#7f1d1d] active:shadow-[0_0px_0_#7f1d1d] active:translate-y-0.5 flex items-center gap-1 text-[9px] transition-all uppercase tracking-wider"
                    @click.stop="exploreZone"
                  >
                    🔍 Explorar
                  </button>
                  <button
                    v-if="mapNodes[currentNode]?.hasCenter"
                    class="bg-gradient-to-b from-pink-400 to-pink-500 hover:from-pink-300 hover:to-pink-400 text-white font-black py-1.5 px-3 rounded-lg border border-pink-700 shadow-[0_3px_0_#831843] active:shadow-[0_0px_0_#831843] active:translate-y-0.5 flex items-center gap-1 text-[9px] transition-all uppercase tracking-wider"
                    @click.stop="healPokemon"
                  >
                    ❤️ Curar
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
            >
          </div>
          <div
            id="player-sprite"
            ref="playerSprite"
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
            <!-- If walking (dynamic local sprite!) -->
            <img
              v-else
              :src="`/assets/sprites/trainers/red_walk_${playerDirection}_${walkFrame}.png`"
              class="pixel-art h-12 w-auto max-w-none"
              alt="Caminando"
            />
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
        {{ isZoomedIn ? '🗺️' : '📍' }}
      </button>
      <button
        id="btn-radar"
        class="floating-btn"
        title="Radar Rápido"
        @click="toggleRadarModal"
      >
        🧭
      </button>
      <button
        id="btn-debug"
        class="floating-btn btn-debug-color"
        title="Menú de Testers (Debug)"
        @click="toggleDebugModal"
      >
        🐛
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
          <span>⬆️</span> {{ btn.discovered ? btn.name : '???' }}
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
          <span>⬇️</span> {{ btn.discovered ? btn.name : '???' }}
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
          <span>⬅️</span> {{ btn.discovered ? btn.name : '???' }}
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
          {{ btn.discovered ? btn.name : '???' }} <span>➡️</span>
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
            <span class="text-yellow-400 shrink-0">📍</span>
            <span>{{ planningTarget ? (discoveredNodes.includes(planningTarget) ? mapNodes[planningTarget]?.name : "Zona Desconocida") : "Destino" }}</span>
          </h3>
          <span class="planning-badge">
            {{ currentPlanPaths[selectedPlanIndex] ? (currentPlanPaths[selectedPlanIndex].isFly ? '🦅 Vuelo' : `Opción ${selectedPlanIndex + 1}/${currentPlanPaths.length}`) : '...' }}
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
              <span class="planning-stat-icon">⚔️</span>
              <span
                class="planning-stat-val"
                :class="{ 'stat-high': calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).t >= 70 }"
              >
                {{ calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).t }}%
              </span>
            </div>
            <div class="planning-stat-item">
              <span class="planning-stat-icon">🌿</span>
              <span
                class="planning-stat-val"
                :class="{ 'stat-high': calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).w >= 70 }"
              >
                {{ calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).w }}%
              </span>
            </div>
            <div class="planning-stat-item">
              <span class="planning-stat-icon">⛏️</span>
              <span
                class="planning-stat-val"
                :class="{ 'stat-high': calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).m >= 70 }"
              >
                {{ calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).m }}%
              </span>
            </div>
            <div class="planning-stat-item">
              <span class="planning-stat-icon">🎣</span>
              <span
                class="planning-stat-val"
                :class="{ 'stat-high': calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).f >= 70 }"
              >
                {{ calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).f }}%
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
            🔄 Alternativa
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
      class="adv-floating-progress fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/90 border border-gray-700 px-6 py-3 rounded-full flex items-center gap-4 z-[200]"
    >
      <div class="adv-progress-bar w-40 h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          class="adv-progress-fill h-full bg-green-500 transition-all duration-300"
          :style="{ width: travelProgressText }"
        />
      </div>
      <span class="adv-progress-text font-black text-yellow-400 text-sm">{{ travelProgressText }}</span>
    </div>

    <!-- Custom Alert dialog -->
    <div
      v-if="alertOpen"
      class="adv-modal-overlay"
    >
      <div class="adv-modal-card p-6 flex flex-col">
        <p
          class="text-gray-800 font-bold text-lg mb-6 leading-relaxed"
          v-html="alertMsg"
        />
        <button
          class="self-end bg-gray-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-black active:scale-95 transition-transform"
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
          🧭 RADAR RÁPIDO
        </div>
        <div class="adv-modal-body space-y-2">
          <button
            v-for="id in discoveredNodes.filter(n => mapNodes[n] && ['city', 'league'].includes(mapNodes[n].type))"
            :key="id"
            class="w-full text-left bg-gray-100 p-3 rounded-xl font-bold text-gray-800 border-2 border-gray-200 hover:bg-yellow-50 hover:border-yellow-400 active:scale-95 transition-all"
            @click="() => {
              toggleRadarModal()
              if (isZoomedIn) exitParkedMode()
              centerCameraOn(mapNodes[id].x, mapNodes[id].y, true, getOptimalMapScale())
            }"
          >
            📍 {{ mapNodes[id]?.name }}
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

