<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import MapCard from '@/components/map/MapCard.vue'
import AdventureInventoryModal from './AdventureInventoryModal.vue'
import AdventureDebugModal from './AdventureDebugModal.vue'

// Import Kanto Map Data
import { rawNodes, connections, officialMapIdMap, type MapNode, type DijkstraPath } from './mapData'
import { getAdjacentNodes, getAlternativePaths } from './adventurePathfinding'

// Import Poké Vicio Stores and Data
import { useMapStore } from '@/stores/map'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
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
const moIcons: Record<string, string> = { 'Corte': '✂️', 'Surf': '🌊', 'Flauta': '🎵', 'Medallas': '🏅', 'Vuelo': '🦅' }

const URL_BICI = "https://images.wikidexcdn.net/mwuploads/wikidex/4/41/latest/20200501140954/Rojo_RFVF_bici.png"
const FALLBACK_BICI = "https://images.wikidexcdn.net/mwuploads/wikidex/1/12/latest/20110203235447/Rojo_mini_RFVH.png" 
const URL_VUELO = "https://archives.bulbagarden.net/media/upload/9/9d/FRLG_Surf_M.png"

const HTML_BICI = `<img src="${URL_BICI}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='${FALLBACK_BICI}';" class="pixel-art scale-[1.5]" alt="Bici">`
const HTML_WALK = `<img src="${FALLBACK_BICI}" class="pixel-art scale-[1.6]" alt="Caminando">`
const HTML_VUELO = `<img src="${URL_VUELO}" class="pixel-art scale-[1.5]" alt="Volando">`

const baseWalkSpeed = 350 
const baseBikeSpeed = 700
const flySpeed = 1800 

const ZOOM_SCALE = 2.4
const MAP_SCALE = 0.8

// Reactive State
const playerInventory = ref<Record<string, boolean>>(
  JSON.parse(localStorage.getItem('pokeVicioInventory') || '{"Corte":false,"Surf":false,"Flauta":false,"Medallas":false,"Vuelo":false,"Bicicleta":true}')
)
const discoveredNodes = ref<string[]>(
  JSON.parse(localStorage.getItem('pokeVicioDiscovered') || '["pallet","route1","viridian"]')
)
const playerEnergy = ref<number>(
  isNaN(parseInt(localStorage.getItem('pokeVicioEnergy') || '')) ? 100 : parseInt(localStorage.getItem('pokeVicioEnergy')!)
)
const activeCompanion = ref<string>(localStorage.getItem('pokeVicioCompanion') || 'none')
const currentSwarmRoute = ref<string | null>(null)
const infiniteEnergy = ref<boolean>(JSON.parse(localStorage.getItem('pokeVicioDebugEnergy') || 'false'))

const currentNode = ref<string>('pallet')
const isMoving = ref(false)
const isZoomedIn = ref(true)
const isPlanning = ref(false)
const playerDirection = ref<'down' | 'up' | 'left' | 'right'>('down')

const playerSpriteTransform = computed(() => {
  if (playerDirection.value === 'left') return 'scaleX(-1)'
  return 'scaleX(1)'
})

const currentScale = ref(ZOOM_SCALE)
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
  const officialId = officialMapIdMap[nodeId] || nodeId
  return mapStore.globalWeather || getRouteWeather(officialId, mapStore.currentSeason.id, mapStore.currentEpochHour, currentCycle.value)
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
const playerSpriteHtml = ref(HTML_WALK)
const updatePlayerVisuals = () => { playerSpriteHtml.value = playerInventory.value['Bicicleta'] ? HTML_BICI : HTML_WALK }

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
  const scaledWidth = 3600 * currentScale.value
  const scaledHeight = 5600 * currentScale.value
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
  
  centerCameraOn(mapNodes.value[currentNode.value].x, mapNodes.value[currentNode.value].y, true, ZOOM_SCALE)
}

function exitParkedMode() {
  isZoomedIn.value = false
  setStatus("Modo Libre", true)
  centerCameraOn(mapNodes.value[currentNode.value].x, mapNodes.value[currentNode.value].y, true, MAP_SCALE)
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

  currentEnergyCost.value = 5
  if (!infiniteEnergy.value && playerEnergy.value < currentEnergyCost.value) {
    showActionAlert("⚡ Sin Energía<br><br>No puedes viajar. Cúrate en un Centro Pokémon.")
    return
  }

  currentPlanPaths.value = [{ nodes: [currentNode.value, targetId], cost: currentEnergyCost.value, isFly: false }]
  selectedPlanIndex.value = 0
  planningTarget.value = targetId
  
  confirmTravel()
}

// GPS / Planning
const currentEnergyCost = ref(0)

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

  if (canFly) {
    currentPlanPaths.value = [{ nodes: [currentNode.value, targetId], cost: 0, isFly: true }]
  } else {
    currentPlanPaths.value = getAlternativePaths(currentNode.value, targetId, mapNodes.value, playerInventory.value, discoveredNodes.value, connections)
    if (currentPlanPaths.value.length === 0) {
      showActionAlert("Camino bloqueado. Necesitas una MO.")
      return
    }
  }

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

const isConfirmTravelDisabled = computed(() => {
  return !infiniteEnergy.value && playerEnergy.value < currentEnergyCost.value
})

function updatePlanUI() {
  const currentPath = currentPlanPaths.value[selectedPlanIndex.value]
  if (!currentPath) return

  currentEnergyCost.value = currentPath.isFly ? 15 : (currentPath.nodes.length - 1) * 5
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

  const paddingX = viewport.value.clientWidth * 0.4
  const paddingY = viewport.value.clientHeight * 0.7
  const pWidth = (maxX - minX) + paddingX
  const pHeight = (maxY - minY) + paddingY

  const scaleX = viewport.value.clientWidth / pWidth
  const scaleY = viewport.value.clientHeight / pHeight
  let newScale = Math.min(scaleX, scaleY, MAP_SCALE)
  newScale = Math.max(newScale, 0.22)

  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  const offsetY = (viewport.value.clientHeight / newScale) * 0.22
  centerCameraOn(midX, midY + offsetY, true, newScale)
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
  if (!infiniteEnergy.value && playerEnergy.value < currentEnergyCost.value) return
  
  if (!infiniteEnergy.value) {
    playerEnergy.value -= currentEnergyCost.value
    localStorage.setItem('pokeVicioEnergy', String(playerEnergy.value))
  }

  const pathData = currentPlanPaths.value[selectedPlanIndex.value]
  isPlanning.value = false
  isMoving.value = true
  isTravelingProgressActive.value = true
  if (previewLinesSvg.value) previewLinesSvg.value.innerHTML = ''

  if (pathData.isFly) {
    setStatus(`Volando...`, true)
    playerSpriteHtml.value = HTML_VUELO
  } else {
    setStatus(playerInventory.value['Bicicleta'] ? `Viajando Rápido...` : `Caminando...`, true)
    updatePlayerVisuals()
  }

  for (let i = 0; i < pathData.nodes.length - 1; i++) {
    currentNode.value = pathData.nodes[i + 1]
    
    if (!discoveredNodes.value.includes(currentNode.value)) {
      discoveredNodes.value.push(currentNode.value)
      localStorage.setItem('pokeVicioDiscovered', JSON.stringify(discoveredNodes.value))
    }

    const progressPct = Math.round(((i + 1) / (pathData.nodes.length - 1)) * 100)
    travelProgressText.value = `${progressPct}%`

    await animatePlayerAndCamera(pathData.nodes[i], pathData.nodes[i + 1], pathData.isFly)
  }

  isMoving.value = false
  isTravelingProgressActive.value = false

  if (pathData.isFly) updatePlayerVisuals()
  
  localStorage.setItem('pokeVicioLocation', currentNode.value)
  if (mapNodes.value[currentNode.value].hasEvent) {
    setTimeout(() => showActionAlert(`¡Oye! Tienes un evento pendiente en ${mapNodes.value[currentNode.value].name}.`), 800)
  }
  enterParkedMode()
}

function animatePlayerAndCamera(startId: string, endId: string, isFlying: boolean) {
  return new Promise<void>(resolve => {
    const start = mapNodes.value[startId]
    const end = mapNodes.value[endId]
    const dx = end.x - start.x
    const dy = end.y - start.y
    playerDirection.value = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')

    const distance = Math.hypot(dx, dy)
    const speed = isFlying ? flySpeed : (playerInventory.value['Bicicleta'] ? baseBikeSpeed : baseWalkSpeed)
    const duration = distance / speed

    const tl = gsap.timeline({ onComplete: resolve })
    if (playerToken.value) {
      tl.to(playerToken.value, { left: end.x, top: end.y, duration, ease: 'none' }, 0)
    }
    const camObj = { x: start.x, y: start.y }
    tl.to(camObj, {
      x: end.x,
      y: end.y,
      duration,
      ease: 'none',
      onUpdate: () => centerCameraOn(camObj.x, camObj.y, false, MAP_SCALE)
    }, 0)
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
  playerEnergy.value = 100
  localStorage.setItem('pokeVicioEnergy', String(playerEnergy.value))
  showActionAlert("Turururu-ru~<br><br>Tus Pokémon están listos para seguir luchando. <b class='text-yellow-600'>¡Energía restaurada al 100%!</b>")
}

function setInfiniteEnergy(val: boolean) {
  infiniteEnergy.value = val
  localStorage.setItem('pokeVicioDebugEnergy', String(val))
  if (isPlanning.value) updatePlanUI()
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

onMounted(() => {
  triggerSwarm()
  updatePlayerVisuals()
  updateDayNightCycle()
  setInterval(updateDayNightCycle, 60000)

  // Initial draw connections
  nextTick(() => {
    enterParkedMode()
  })
})
</script>

<template>
  <div class="flex flex-col font-sans h-[100dvh] w-screen overflow-hidden text-white">
    <!-- Header -->
    <header class="h-[70px] bg-gradient-to-b from-red-500 to-red-600 text-white px-4 py-2 shadow-lg z-50 flex justify-between items-center shrink-0 border-b-[5px] border-red-800 relative hardware-accel">
      <div class="flex items-center gap-3">
        <div>
          <h1 class="font-black text-xl tracking-widest text-yellow-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] flex items-center gap-2">
            KANTO
            <span class="flex items-center mt-1">
              <span
                class="w-2 h-2 rounded-full mr-1 animate-pulse"
                :class="statusDotClass"
              />
              <span class="text-red-100 text-[9px] font-bold uppercase tracking-wide">{{ statusText }}</span>
            </span>
          </h1>
          <div
            class="flex items-center mt-0.5 bg-gray-900 rounded-full w-24 h-3 border border-gray-700 overflow-hidden relative"
            title="Energía de Viaje"
          >
            <div
              class="h-full transition-all duration-300"
              :class="[infiniteEnergy ? 'bg-blue-400 w-full' : (playerEnergy > 50 ? 'bg-yellow-400' : (playerEnergy > 20 ? 'bg-orange-400' : 'bg-red-500'))]"
              :style="{ width: infiniteEnergy ? '100%' : `${playerEnergy}%` }"
            />
            <span
              class="absolute w-full text-center text-[8px] font-black tracking-widest leading-[12px]"
              style="text-shadow: 0 1px 1px #000;"
            >
              {{ infiniteEnergy ? 'INFINITA' : 'ENERGÍA' }}
            </span>
          </div>
        </div>
        <button
          class="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 p-2 rounded-xl border-2 border-blue-800 shadow-[0_4px_0_#1e3a8a] active:shadow-[0_0px_0_#1e3a8a] active:translate-y-1 flex items-center transition-all ml-2"
          @click="toggleInventoryModal"
        >
          <span class="text-lg">🎒</span> <span class="hidden md:inline ml-1 text-xs font-black">Equipo</span>
        </button>
      </div>
      <div
        class="bg-gray-900 px-3 py-1.5 rounded-xl border-2 border-gray-600 shadow-inner text-right cursor-pointer hover:bg-gray-800 active:scale-95 transition-all"
        @click="returnToCurrentLocation"
      >
        <span class="block text-[9px] text-gray-400 font-black uppercase tracking-wider">Ubicación 📍</span>
        <span class="text-white font-bold text-sm">{{ mapNodes[currentNode]?.name || 'Cargando...' }}</span>
      </div>
    </header>

    <div
      v-if="currentSwarmRoute"
      class="absolute top-[80px] left-4 bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full border-2 border-red-800 shadow-lg z-40 animate-pulse"
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
      @touchstart="startDrag($event.touches[0].clientX, $event.touches[0].clientY)"
      @touchmove="doDrag($event.touches[0].clientX, $event.touches[0].clientY)"
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
          class="absolute top-0 left-0 w-full h-full pointer-events-none z-0 hardware-accel"
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
          class="absolute top-0 left-0 w-full h-full pointer-events-none z-[8] hardware-accel"
          style="stroke-linejoin: round;"
        />

        <!-- Nodes Container -->
        <div
          id="nodes-container"
          class="absolute top-0 left-0 w-full h-full z-10 hardware-accel"
        >
          <template
            v-for="(node, id) in mapNodes"
            :key="id"
          >
            <!-- Discovered Node wrapper with MapCard (CLEAN, NO GLOBES) -->
            <div
              v-if="discoveredNodes.includes(id as string) && mapLocationsById[id]"
              :id="`node-${id}`"
              class="absolute origin-center translate-x-[-50%] translate-y-[-50%]"
              :style="{ left: `${node.x}px`, top: `${node.y}px`, zIndex: (isZoomedIn && !isMoving && !isPlanning && currentNode === id) ? 20 : 10 }"
              @click.stop="() => {
                if (!isMoving) {
                  if (getAdjacentNodes(currentNode, connections).includes(id as string)) {
                    travelToAdjacent(id as string)
                  } else {
                    planTravel(id as string)
                  }
                }
              }"
            >
              <div
                :style="{ transform: `scale(${(isZoomedIn && !isMoving && !isPlanning && currentNode === id) ? cardScale * 3 : cardScale})` }"
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
                  if (getAdjacentNodes(currentNode, connections).includes(id as string)) {
                    travelToAdjacent(id as string)
                  } else {
                    planTravel(id as string)
                  }
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
              class="pixel-art"
              :class="{ 'anim-bounce-companion': isMoving }"
            >
          </div>
          <div
            id="player-sprite"
            ref="playerSprite"
            :class="{ 'anim-bounce': isMoving }"
            :style="{ transform: playerSpriteTransform }"
            v-html="playerSpriteHtml"
          />
        </div>
      </div>
    </main>

    <!-- UI Overlay for Parked Mode -->
    <div
      id="fixed-ui-overlay"
      :class="{ 'active': isZoomedIn && !isMoving && !isPlanning }"
    >
      <button
        id="btn-free-map"
        class="floating-btn"
        title="Mapa Completo"
        @click="exitParkedMode"
      >
        🗺️
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
        class="floating-btn bg-purple-700"
        title="Menú de Testers (Debug)"
        @click="toggleDebugModal"
      >
        🐛
      </button>

      <!-- Botones de Navegación Adyacentes (Rodeando la tarjeta central) -->
      <div class="fixed-navigation-arrows pointer-events-none">
        <!-- North Group -->
        <div class="absolute top-[calc(50%-360px)] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto">
          <button
            v-for="btn in adjacentButtons.filter(b => b.direction === 'N')"
            :key="btn.id"
            class="px-5 py-3 bg-gradient-to-b from-gray-800 to-gray-900 hover:from-gray-700 border-2 border-yellow-400 rounded-xl text-sm font-black shadow-2xl uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-transform text-white"
            @click="travelToAdjacent(btn.id)"
          >
            <span>⬆️</span> {{ btn.discovered ? btn.name : '???' }}
          </button>
        </div>
        
        <!-- South Group -->
        <div class="absolute top-[calc(50%+360px)] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto">
          <button
            v-for="btn in adjacentButtons.filter(b => b.direction === 'S')"
            :key="btn.id"
            class="px-5 py-3 bg-gradient-to-b from-gray-800 to-gray-900 hover:from-gray-700 border-2 border-yellow-400 rounded-xl text-sm font-black shadow-2xl uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-transform text-white"
            @click="travelToAdjacent(btn.id)"
          >
            <span>⬇️</span> {{ btn.discovered ? btn.name : '???' }}
          </button>
        </div>

        <!-- West Group -->
        <div class="absolute left-[calc(50%-460px)] top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <button
            v-for="btn in adjacentButtons.filter(b => b.direction === 'W')"
            :key="btn.id"
            class="px-5 py-3 bg-gradient-to-b from-gray-800 to-gray-900 hover:from-gray-700 border-2 border-yellow-400 rounded-xl text-sm font-black shadow-2xl uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-transform text-white"
            @click="travelToAdjacent(btn.id)"
          >
            <span>⬅️</span> {{ btn.discovered ? btn.name : '???' }}
          </button>
        </div>

        <!-- East Group -->
        <div class="absolute left-[calc(50%+460px)] top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <button
            v-for="btn in adjacentButtons.filter(b => b.direction === 'E')"
            :key="btn.id"
            class="px-5 py-3 bg-gradient-to-b from-gray-800 to-gray-900 hover:from-gray-700 border-2 border-yellow-400 rounded-xl text-sm font-black shadow-2xl uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-transform text-white"
            @click="travelToAdjacent(btn.id)"
          >
            {{ btn.discovered ? btn.name : '???' }} <span>➡️</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Planning UI Panel -->
    <div
      id="planning-ui-panel"
      class="fixed bottom-0 left-0 w-full p-3 pb-6 z-[150] flex justify-center pointer-events-none transition-transform duration-300"
      :class="[isPlanning ? '' : 'translate-y-full pointer-events-none']"
    >
      <div class="glass-panel border border-gray-600 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm pointer-events-auto">
        <div class="flex items-center justify-between border-b border-gray-600 pb-2">
          <h3 class="text-white font-black text-lg uppercase flex items-center gap-2 truncate">
            <span class="text-yellow-400 shrink-0">📍</span>
            <span class="truncate">{{ planningTarget ? (discoveredNodes.includes(planningTarget) ? mapNodes[planningTarget]?.name : "Zona Desconocida") : "Destino" }}</span>
          </h3>
          <span class="bg-gray-800 text-gray-300 text-xs font-bold px-3 py-1 rounded-full border border-gray-600 shrink-0">
            {{ currentPlanPaths[selectedPlanIndex] ? (currentPlanPaths[selectedPlanIndex].isFly ? '🦅 Vuelo Directo' : `Opción ${selectedPlanIndex + 1}/${currentPlanPaths.length}`) : 'Calculando...' }}
          </span>
        </div>
        
        <div class="bg-gray-900/80 rounded-xl p-3 border border-gray-700 relative">
          <p class="text-[10px] text-gray-400 uppercase font-black tracking-wider mb-2 text-center">
            Previsión del Recorrido
          </p>
          <div class="absolute top-2 right-3 text-xs font-black text-yellow-400 bg-gray-800 px-2 py-0.5 rounded">
            ⚡ {{ currentEnergyCost }}
          </div>
          
          <!-- Route stats computed from actual path -->
          <div
            v-if="currentPlanPaths[selectedPlanIndex]"
            class="grid grid-cols-4 gap-2 text-center mt-3"
          >
            <div class="flex flex-col items-center">
              <span class="text-xl">⚔️</span>
              <span
                class="text-xs font-bold mt-1"
                :class="[calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).t >= 70 ? 'text-yellow-400 text-sm' : 'text-white']"
              >
                {{ calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).t }}%
              </span>
            </div>
            <div class="flex flex-col items-center">
              <span class="text-xl">🌿</span>
              <span
                class="text-xs font-bold mt-1"
                :class="[calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).w >= 70 ? 'text-yellow-400 text-sm' : 'text-white']"
              >
                {{ calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).w }}%
              </span>
            </div>
            <div class="flex flex-col items-center">
              <span class="text-xl">⛏️</span>
              <span
                class="text-xs font-bold mt-1"
                :class="[calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).m >= 70 ? 'text-yellow-400 text-sm' : 'text-white']"
              >
                {{ calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).m }}%
              </span>
            </div>
            <div class="flex flex-col items-center">
              <span class="text-xl">🎣</span>
              <span
                class="text-xs font-bold mt-1"
                :class="[calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).f >= 70 ? 'text-yellow-400 text-sm' : 'text-white']"
              >
                {{ calculateRouteStats(currentPlanPaths[selectedPlanIndex].nodes).f }}%
              </span>
            </div>
          </div>
        </div>

        <div class="flex gap-2 justify-center mt-1">
          <button
            class="bg-gradient-to-b from-gray-500 to-gray-600 text-white px-3 py-2.5 rounded-xl font-bold border-2 border-gray-700 shadow-[0_4px_0_#374151] active:shadow-[0_0px_0_#374151] active:translate-y-1 flex-1 transition-all text-sm"
            @click="cancelPlanning"
          >
            Cancelar
          </button>
          <button
            v-if="currentPlanPaths.length > 1"
            class="bg-gradient-to-b from-blue-500 to-blue-600 text-white px-3 py-2.5 rounded-xl font-bold border-2 border-blue-800 shadow-[0_4px_0_#1e3a8a] active:shadow-[0_0px_0_#1e3a8a] active:translate-y-1 flex-1 transition-all text-sm"
            @click="nextAlternative"
          >
            🔄 Alternativa
          </button>
          <button
            :disabled="isConfirmTravelDisabled"
            class="bg-gradient-to-b from-green-400 to-green-600 text-white px-5 py-2.5 rounded-xl font-black border-2 border-green-800 shadow-[0_4px_0_#14532d] active:shadow-[0_0px_0_#14532d] active:translate-y-1 flex-[1.5] transition-all text-lg disabled:opacity-50 disabled:grayscale"
            @click="confirmTravel"
          >
            {{ isConfirmTravelDisabled ? 'Sin Energía' : '¡VIAJAR!' }}
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
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200"
      :class="[alertOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none']"
    >
      <div
        class="poke-dialog w-11/12 max-w-sm p-6 flex flex-col transition-transform duration-200"
        :class="[alertOpen ? 'scale-100' : 'scale-95']"
      >
        <p
          class="text-gray-800 font-bold text-lg mb-6 leading-relaxed"
          v-html="alertMsg"
        />
        <button
          class="self-end bg-gray-800 text-white px-6 py-2 rounded font-bold hover:bg-black active:scale-95 transition-transform"
          @click="closeAlert"
        >
          ▼ Siguiente
        </button>
      </div>
    </div>

    <!-- Radar Modal -->
    <div
      class="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300"
      :class="[showRadarModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none']"
    >
      <div
        class="bg-white rounded-3xl w-10/12 max-w-sm overflow-hidden shadow-2xl border-4 border-yellow-500 transition-transform duration-300"
        :class="[showRadarModal ? 'scale-100' : 'scale-90']"
      >
        <div class="bg-gradient-to-b from-yellow-400 to-yellow-500 text-yellow-900 p-4 text-center font-black text-xl shadow-inner border-b-2 border-yellow-600">
          🧭 RADAR RÁPIDO
        </div>
        <div class="p-4 max-h-[50vh] overflow-y-auto space-y-2">
          <button
            v-for="id in discoveredNodes.filter(n => mapNodes[n] && ['city', 'league'].includes(mapNodes[n].type))"
            :key="id"
            class="w-full text-left bg-gray-100 p-3 rounded-xl font-bold text-gray-800 border-2 border-gray-200 hover:bg-yellow-50 hover:border-yellow-400 active:scale-95 transition-all"
            @click="() => {
              toggleRadarModal()
              if (isZoomedIn) exitParkedMode()
              centerCameraOn(mapNodes[id].x, mapNodes[id].y, true, MAP_SCALE)
            }"
          >
            📍 {{ mapNodes[id]?.name }}
          </button>
        </div>
        <div class="p-4 bg-gray-100 border-t-2 border-gray-200">
          <button
            class="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3.5 rounded-xl text-lg shadow-md active:scale-95 transition-transform"
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
      :infinite-energy="infiniteEnergy"
      @update-infinite-energy="setInfiniteEnergy"
      @unlock-all="debugUnlockAll"
      @give-all-m-os="debugGiveAllMOs"
      @trigger-swarm="debugTriggerSwarm"
      @hard-reset="debugHardReset"
      @close="toggleDebugModal"
    />
  </div>
</template>

