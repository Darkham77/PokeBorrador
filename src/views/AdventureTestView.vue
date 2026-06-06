<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import {
  findShortestPath,
  KANTO_NODE_POSITIONS,
  getGraphEdges,
  KANTO_CONNECTIONS
} from '../../test aventura/kantoGraph.ts'
import type { GraphEdge } from '../../test aventura/kantoGraph.ts'
import { FIRE_RED_MAPS } from '@/data/maps'
import { useMapStore } from '@/stores/map'
import { useShopStore } from '@/stores/shop'
import { useInventoryStore } from '@/stores/inventory'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import { makePokemon } from '@/logic/pokemonFactory'
import { SHOP_ITEMS } from '@/data/items'
import { getEncounterPool } from '@/logic/encounters'
import { getRouteWeather } from '@/logic/weatherUtils'
import { BATTLE_STATES } from '@/logic/battle/battleStateMachine'
import { useAdventureCamera } from '@/composables/adventure/useAdventureCamera'
import { gsapHover as vGsapHover } from '@/directives/gsapHover'
import { gsapLoop as vGsapLoop } from '@/directives/gsapLoop'
import MapCard from '@/components/map/MapCard.vue'
import ArchaeologyModal from '@/components/modals/ArchaeologyModal.vue'
import FishingModal from '@/components/modals/FishingModal.vue'
import PreTravelModal from '@/components/adventure/PreTravelModal.vue'
import AdventureCheatPanel from '@/components/adventure/AdventureCheatPanel.vue'
import type { Pokemon } from '@/types/pokemon'
import type { MapLocation } from '@/types/encounters'

// [PureVue-Ignore]
// [PureVue-Ignore-Length]

const mapStore = useMapStore()
const shopStore = useShopStore()
const inventoryStore = useInventoryStore()
const gameStore = useGameStore()

// Entrar en modo sandbox inmediatamente durante el setup para evitar que se rendericen
// o utilicen datos de la partida real de Poké Vicio en la primera carga
if (typeof gameStore.enterSandboxMode === 'function') {
  gameStore.enterSandboxMode()
}

const battleStore = useBattleStore()

// ─── State ───
const originMap = ref('route1')
const destinationMap = ref('route3')
const hasBicycle = computed(() => {
  const inv = gameStore.state.inventory || {}
  return (inv['bicycle'] || 0) > 0
})
const isBikeActive = computed({
  get() {
    return hasBicycle.value
  },
  set(val) {
    if (val && !hasBicycle.value) {
      travelLog.value.push("⚠️ No tienes la Bicicleta en tu mochila de pruebas para activarla.")
    }
  }
})
const activeHMs = ref<Set<string>>(new Set())

// --- Pre-travel buffs states ---
const showPreTravelModal = ref(false)
const selectedTravelItems = ref<Set<string>>(new Set())
const pendingManualDestination = ref<string | null>(null)

const toggleTravelItem = (itemId: string) => {
  const next = new Set(selectedTravelItems.value)
  if (next.has(itemId)) {
    next.delete(itemId)
  } else {
    if (['repel', 'super_repel', 'max_repel'].includes(itemId)) {
      next.delete('repel')
      next.delete('super_repel')
      next.delete('max_repel')
    }
    if (itemId.startsWith('incense_')) {
      next.forEach(id => {
        if (id.startsWith('incense_')) next.delete(id)
      })
    }
    next.add(itemId)
  }
  selectedTravelItems.value = next
}

const activeTravelModifiers = computed(() => {
  const items = selectedTravelItems.value
  let encounterRateMod = 0
  let expMultiplier = 1.0
  let moneyMultiplier = 1.0
  let shinyChanceMod = 1.0
  let typeFocus: string | null = null

  if (items.has('repel')) encounterRateMod = -50
  else if (items.has('super_repel')) encounterRateMod = -80
  else if (items.has('max_repel')) encounterRateMod = -100

  if (items.has('lucky_egg')) expMultiplier = 1.5
  if (items.has('amulet_coin')) moneyMultiplier = 2.0
  if (items.has('ticket_shiny')) shinyChanceMod = 2.0

  if (items.has('incense_fire')) typeFocus = 'fire'
  else if (items.has('incense_water')) typeFocus = 'water'
  else if (items.has('incense_grass')) typeFocus = 'grass'
  else if (items.has('incense_normal')) typeFocus = 'normal'
  else if (items.has('incense_ghost')) typeFocus = 'ghost'
  else if (items.has('incense_psychic')) typeFocus = 'psychic'

  return {
    encounterRateMod,
    expMultiplier,
    moneyMultiplier,
    shinyChanceMod,
    typeFocus
  }
})

// --- Adventure Passives Mapping (Gen 3) ---
const ADVENTURE_PASSIVES = {
  // Habilidades Pasivas
  flame_body: { id: 'speed_bonus', label: 'Cuerpo Llama', desc: '+15% Vel. Viaje', value: 0.15 },
  magma_armor: { id: 'speed_bonus', label: 'Escudo Magma', desc: '+15% Vel. Viaje', value: 0.15 },
  pickup: { id: 'loot_bonus', label: 'Recogida', desc: '+20% Prob. Botín', value: 0.20 },
  synchronize: { id: 'nature_sync', label: 'Sincronía', desc: 'Sincronizar Naturaleza', value: 0.50 }
}

const activeSweetScent = ref(false)

const activeTeamPassives = computed(() => {
  const team = gameStore.state.team || []
  let speedBonus = 0
  let lootBonus = 0
  let natureSync = false
  const activePassivesList: { label: string; desc: string }[] = []

  team.forEach(pkmn => {
    if (pkmn && pkmn.hp > 0 && pkmn.ability) {
      const abilityKey = pkmn.ability.toLowerCase().replace(/[\s-]/g, '_')
      const passive = ADVENTURE_PASSIVES[abilityKey as keyof typeof ADVENTURE_PASSIVES]
      if (passive) {
        if (passive.id === 'speed_bonus') {
          speedBonus = Math.max(speedBonus, passive.value)
        } else if (passive.id === 'loot_bonus') {
          lootBonus = Math.max(lootBonus, passive.value)
        } else if (passive.id === 'nature_sync') {
          natureSync = true
        }
        if (!activePassivesList.some(p => p.label === passive.label)) {
          activePassivesList.push({ label: passive.label, desc: passive.desc })
        }
      }
    }
  })

  return {
    speedBonus,
    lootBonus,
    natureSync,
    list: activePassivesList
  }
})

const availableActiveMoves = computed(() => {
  const team = gameStore.state.team || []
  const list: { pokemonUid: string; pokemonName: string; moveName: string; pp: number; maxPP: number }[] = []

  team.forEach(pkmn => {
    if (pkmn && pkmn.hp > 0) {
      pkmn.moves.forEach(move => {
        if (move) {
          const normName = move.name.toLowerCase().replace(/[\s-]/g, '_')
          if (normName === 'teletransporte' || normName === 'teleport' || normName === 'dulce_aroma' || normName === 'sweet_scent') {
            list.push({
              pokemonUid: pkmn.uid,
              pokemonName: pkmn.name,
              moveName: move.name,
              pp: move.pp,
              maxPP: move.maxPP
            })
          }
        }
      })
    }
  })

  return list
})

const useActiveRouteMove = (pokemonUid: string, moveName: string) => {
  const team = gameStore.state.team || []
  const pkmn = team.find(p => p.uid === pokemonUid)
  if (!pkmn) return

  const move = pkmn.moves.find(m => m && m.name === moveName)
  if (!move) return

  if (move.pp <= 0) {
    travelLog.value.push(`⚠️ ${pkmn.name} no tiene PP en ${moveName} para usarlo.`)
    return
  }

  // Descontar PP real
  move.pp -= 1
  gameStore.save(false)

  const normName = moveName.toLowerCase().replace(/[\s-]/g, '_')
  if (normName === 'teletransporte' || normName === 'teleport') {
    travelLog.value.push(`🔮 ¡${pkmn.name} usó ${moveName}! Cancelando viaje y regresando instantáneamente al Centro Pokémon de origen.`)
    cancelTravel()
    
    // Regresar al origen
    const originNode = originMap.value
    mapStore.currentMap = originNode
    shopStore.healAllPokemon(0)
    travelLog.value.push(`🏥 ¡Llegada segura a ${FIRE_RED_MAPS.find(m => m.id === originNode)?.name || originNode}! Tu equipo ha sido completamente curado.`)
  } else if (normName === 'dulce_aroma' || normName === 'sweet_scent') {
    activeSweetScent.value = true
    travelLog.value.push(`🌸 ¡${pkmn.name} usó ${moveName}! Un aroma dulce inunda el sendero: la tasa de combates ha aumentado.`)
  }
}

const triggerExtraLoot = (itemId: string, defaultQty: number = 1) => {
  const lootBonus = activeTeamPassives.value.lootBonus
  if (lootBonus > 0 && Math.random() < lootBonus) {
    inventoryStore.addItem(itemId, defaultQty)
    injectedItems.value.add(itemId)
    travelLog.value.push(`🌟 ¡Pasiva Recogida activa! Tu Pokémon ha encontrado un objeto extra: +${defaultQty}x ${itemId} obtenido en tu mochila real.`)
  }
}

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

// Travel control
const isTraveling = ref(false)
const isPaused = ref(false)
const travelProgress = ref(0)
const calculatedPath = ref<string[]>([])
const hasHealthyTeam = computed(() => {
  const team = gameStore.state.team || []
  return team.some(p => p && p.hp > 0)
})
const currentSegmentIndex = ref(0)
const lastStepPct = ref(0)
const safeStepsRemaining = ref(0)
const isArrivalEventPending = ref(false)
const blockedConnections = ref<Set<string>>(new Set())
const activeEvent = ref<{
  type: 'combat' | 'combat_won' | 'obstacle_cut' | 'obstacle_strength' | 'obstacle_rock_smash' | 'fishing';
  title: string;
  desc: string;
  moRequired?: string;
  resolved: boolean;
  wildPokemon?: Pokemon;
  isTrainer?: boolean;
  trainerName?: string;
  trainerSprite?: string;
  enemyTeam?: Pokemon[];
} | null>(null)
const travelLog = ref<string[]>([])
let travelTween: gsap.core.Tween | null = null

// ─── Minigame State ───
const showArchaeology = ref(false)
const showFishing = ref(false)
const minigamePokemon = ref<Pokemon | null>(null)

const FOSSIL_POKEMON_IDS = ['omanyte', 'kabuto', 'aerodactyl'] as const
const FISH_POKEMON_IDS = ['magikarp', 'goldeen', 'staryu'] as const

// ─── Canvas Map ───
const CANVAS_W = 6400
const CANVAS_H = 4400
const CARD_W = 320
const CARD_H = 220
const graphEdges = ref<GraphEdge[]>([])
const markerX = ref(0)
const markerY = ref(0)
const showMarker = ref(false)
let markerTimeline: gsap.core.Timeline | null = null
let glowPulseTween: gsap.core.Tween | null = null
const glowMarkerRef = ref<HTMLElement | null>(null)

// Camera
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

onMounted(async () => {
  graphEdges.value = getGraphEdges()
  calculateRoute()
  // Center on origin
  const originPos = nodePositions.value[originMap.value]
  if (originPos) {
    jumpToPoint(originPos.x + CARD_W / 2, originPos.y + CARD_H / 2)
  }

  // Carga local e independiente de la base de datos offline para que makePokemon funcione
  if (!gameStore.isReady) {
    try {
      travelLog.value.push('⏳ Inicializando base de datos local de prueba de forma independiente...')
      const { initSQLite } = await import('@/logic/db/sqliteEngine.ts')
      await initSQLite()
      gameStore.isDataLoaded = true
      gameStore.isEngineReady = true
      travelLog.value.push('✅ Base de datos local lista. Puedes inyectar equipo y combatir.')
    } catch (e) {
      travelLog.value.push(`❌ Error al cargar base de datos: ${(e as Error).message}`)
    }
  }
})

onUnmounted(() => {
  if (typeof gameStore.exitSandboxMode === 'function') {
    gameStore.exitSandboxMode()
  }
  // Limpiar cualquier combate activo en el battleStore al salir del test aventura
  if (battleStore.isBattleActive) {
    battleStore.state = null
    battleStore.fsm.transition('EXIT_BATTLE')
  }
})

const getZoomCenter = () => {
  if (showMarker.value) return { x: markerX.value, y: markerY.value }
  const pos = nodePositions.value[originMap.value]
  return pos ? { x: pos.x + CARD_W / 2, y: pos.y + CARD_H / 2 } : undefined
}

const handleZoomIn = () => {
  zoomIn(getZoomCenter)
}

const handleZoomOut = () => {
  zoomOut(getZoomCenter)
}

// Node positions scaled to canvas pixels
const nodePositions = computed(() => {
  const result: Record<string, { x: number; y: number; label: string }> = {}
  for (const [id, pos] of Object.entries(KANTO_NODE_POSITIONS)) {
    result[id] = {
      x: (pos.x / 100) * (CANVAS_W - CARD_W),
      y: (pos.y / 100) * (CANVAS_H - CARD_H),
      label: pos.label,
    }
  }
  return result
})

// Map locations indexed by ID for quick lookup
const mapLocationsById = computed(() => {
  const map: Record<string, MapLocation> = {}
  for (const loc of FIRE_RED_MAPS) {
    map[loc.id] = loc as MapLocation
  }
  return map
})

// Spawn pool builder (simplified version of MapGrid's getMapData)
function getSpawnPoolForMap(loc: MapLocation) {
  if (!loc.wild) return { generic: [] as string[], specific: [] as string[], rates: {} as Record<string, number> }

  const activeWeather = getRouteWeather(loc.id, mapStore.currentSeason.id, mapStore.currentEpochHour, mapStore.currentCycle)
  const { pool, rates } = getEncounterPool(loc, mapStore.currentCycle || 'day', activeWeather || 'clear', [])

  const baseWild = loc.wild?.day || []
  const generic: string[] = []
  const specific: string[] = []
  const ratesMap: Record<string, number> = {}

  pool.forEach((id: string, index: number) => {
    ratesMap[id] = rates[index] || 10
    if (baseWild.includes(id)) generic.push(id)
    else specific.push(id)
  })

  if (loc.fishing) {
    loc.fishing.pool.forEach((id: string, index: number) => {
      if (!generic.includes(id) && !specific.includes(id)) {
        generic.push(id)
        ratesMap[id] = loc.fishing!.rates[index] || 10
      }
    })
  }

  return { generic, specific, rates: ratesMap }
}

// Weather per map
function getWeatherForMap(mapId: string): string {
  return getRouteWeather(mapId, mapStore.currentSeason.id, mapStore.currentEpochHour, mapStore.currentCycle)
}

// Nodes that exist in both KANTO_NODE_POSITIONS and FIRE_RED_MAPS
const validNodeIds = computed(() => {
  return Object.keys(KANTO_NODE_POSITIONS).filter(id => mapLocationsById.value[id])
})

const worldOverlayScale = computed(() => 1 / Math.max(cameraScale.value, 0.25))



const pokemonCenterOverlays = computed(() => {
  return validNodeIds.value.flatMap(nodeId => {
    if (!POKEMON_CENTER_NODES.has(nodeId)) return []

    const position = nodePositions.value[nodeId]
    if (!position) return []

    return [{
      id: nodeId,
      label: mapLocationsById.value[nodeId]?.name || KANTO_NODE_POSITIONS[nodeId]?.label || nodeId,
      x: position.x + CARD_W - 20,
      y: position.y + 18
    }]
  })
})



const currentMapId = computed(() => {
  if (calculatedPath.value.length === 0) return originMap.value
  const idx = Math.min(currentSegmentIndex.value, calculatedPath.value.length - 1)
  return calculatedPath.value[idx] || originMap.value
})

// ─── Manual Travel Logic ───
const adjacentConnections = computed(() => {
  const origin = originMap.value
  const originPos = nodePositions.value[origin]
  const connections = KANTO_CONNECTIONS[origin] || []
  
  const result = {
    top: [] as { target: string, mo?: string, label: string }[],
    bottom: [] as { target: string, mo?: string, label: string }[],
    left: [] as { target: string, mo?: string, label: string }[],
    right: [] as { target: string, mo?: string, label: string }[],
  }

  if (!originPos) return result

  for (const conn of connections) {
    const targetPos = nodePositions.value[conn.target]
    if (!targetPos) continue

    const dx = targetPos.x - originPos.x
    const dy = targetPos.y - originPos.y
    const nodeLabel = targetPos.label

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) result.right.push({ ...conn, label: nodeLabel })
      else result.left.push({ ...conn, label: nodeLabel })
    } else {
      if (dy > 0) result.bottom.push({ ...conn, label: nodeLabel })
      else result.top.push({ ...conn, label: nodeLabel })
    }
  }

  return result
})

const startManualTravel = (targetId: string) => {
  if (isTraveling.value) return
  
  // Validar que haya al menos 1 Pokémon con vida en el equipo real
  if (!hasHealthyTeam.value) {
    travelLog.value.push("⚠️ No puedes iniciar un viaje o ruta: Necesitas al menos 1 Pokémon con vida en tu equipo.")
    return
  }

  pendingManualDestination.value = targetId
  
  // Forzar recálculo temporal
  const path = findShortestPath(originMap.value, targetId, activeHMs.value)
  if (!path || path.length === 0) {
    travelLog.value.push(`❌ Ruta bloqueada: Faltan MOs necesarias para avanzar hacia allí.`)
    return
  }
  
  // Abrir modal de pre-viaje en lugar de partir directo
  selectedTravelItems.value.clear()
  showPreTravelModal.value = true
}

const cancelPreTravel = () => {
  showPreTravelModal.value = false
  pendingManualDestination.value = null
  selectedTravelItems.value.clear()
}

const confirmPreTravel = () => {
  if (!pendingManualDestination.value) return
  destinationMap.value = pendingManualDestination.value
  
  // Recalcular ruta final
  calculateRoute()
  if (calculatedPath.value.length === 0) {
    travelLog.value.push(`❌ Ruta bloqueada: Faltan MOs necesarias para avanzar hacia allí.`)
    cancelPreTravel()
    return
  }

  // Consumir los ítems seleccionados
  selectedTravelItems.value.forEach(itemId => {
    inventoryStore.removeItem(itemId, 1)
    travelLog.value.push(`🎒 Consumido: -1x ${itemId} de tu mochila real.`)
  })
  
  showPreTravelModal.value = false
  pendingManualDestination.value = null
  
  startTravel()
}

const filteredBuffItems = computed(() => {
  const buffIds = [
    'repel', 'super_repel', 'max_repel',
    'lucky_egg', 'amulet_coin', 'ticket_shiny',
    'incense_fire', 'incense_water', 'incense_grass', 'incense_normal', 'incense_ghost', 'incense_psychic'
  ]
  return SHOP_ITEMS.filter(item => buffIds.includes(item.id) && (gameStore.state.inventory?.[item.id] || 0) > 0)
})

// ─── Path set for highlighting ───
const pathSet = computed(() => new Set(calculatedPath.value))
const pathEdgeSet = computed(() => {
  const set = new Set<string>()
  const path = calculatedPath.value
  for (let i = 0; i < path.length - 1; i++) {
    const key = [path[i], path[i + 1]].sort().join('|')
    set.add(key)
  }
  return set
})

// ─── HM toggle ───
const toggleHM = (hmName: string) => {
  const next = new Set(activeHMs.value)
  if (next.has(hmName)) {
    next.delete(hmName)
  } else {
    next.add(hmName)
  }
  activeHMs.value = next
}

// ─── Route calculation ───
const calculateRoute = () => {
  const path = findShortestPath(originMap.value, destinationMap.value, activeHMs.value)
  if (path) {
    calculatedPath.value = path
    travelLog.value = [`Ruta calculada: ${path.map(id => FIRE_RED_MAPS.find(m => m.id === id)?.name || id).join(' → ')}`]
  } else {
    calculatedPath.value = []
    travelLog.value = ['⚠️ No hay ruta transitable con las MOs actuales.']
  }
}

// ─── REACTIVE recalculation when HMs, origin or destination change ───
watch(
  [activeHMs, originMap, destinationMap],
  () => {
    if (!isTraveling.value) {
      calculateRoute()
    }
  },
  { deep: true }
)

// Watcher para animar con GSAP el efecto de pulso del marcador viajero
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

const pendingEscapedCombatEvent = ref(false)

const resolveCombatRouteEvent = (message: string) => {
  if (activeEvent.value?.type !== 'combat') return

  pendingEscapedCombatEvent.value = false
  const team = gameStore.state.team || []
  const healthy = team.some(p => p && p.hp > 0)
  if (!healthy) {
    travelLog.value.push('💀 ¡Todo tu equipo ha sido debilitado! Viaje cancelado.')
    cancelTravel()
    const originNode = originMap.value
    mapStore.currentMap = originNode
    shopStore.healAllPokemon(0)
    travelLog.value.push(`🏥 Regresaste de inmediato a ${FIRE_RED_MAPS.find(m => m.id === originNode)?.name || originNode}. Tu equipo ha sido curado.`)
    activeEvent.value = null
    return
  }

  travelLog.value.push(message)
  if (isTraveling.value) {
    // Si estamos de viaje, saltamos la confirmación manual y retomamos el avance directamente.
    resumeTravelAfterEvent()
  } else {
    // En modo "Explorar Zona", limpiamos el evento directamente para regresar al mapa exactamente como en Poké Vicio.
    activeEvent.value = null
  }
}

// Watcher para procesar derrota o requerir confirmación para continuar viaje al finalizar el combate real
watch(() => battleStore.isBattleActive, (isActive) => {
  if (!isActive) {
    resolveCombatRouteEvent('⚔️ Combate finalizado con éxito.')
  }
})

watch(() => [battleStore.state?.over, battleStore.state?.fled, activeEvent.value?.type], ([over, fled, eventType]) => {
  if (eventType === 'combat' && over && fled) {
    pendingEscapedCombatEvent.value = true
  }
})

// Teletransporte, Rugido y otras huidas salvajes vuelven a SEARCH_PHASE sin cerrar el store en combates persistentes.
watch(() => battleStore.currentFsmState, (state) => {
  if (
    state === BATTLE_STATES.SEARCH_PHASE &&
    pendingEscapedCombatEvent.value &&
    activeEvent.value?.type === 'combat'
  ) {
    resolveCombatRouteEvent('🌀 El Pokémon salvaje escapó. Retomando la ruta.')
  }
})


// ─── Edge helpers for SVG ───
const getEdgeKey = (from: string, to: string) => [from, to].sort().join('|')

const isEdgeOnPath = (from: string, to: string) => {
  return pathEdgeSet.value.has(getEdgeKey(from, to))
}

const isEdgeTraversable = (edge: GraphEdge) => {
  if (!edge.mo) return true
  const requirements = edge.mo.split(',')
  return requirements.every(req => activeHMs.value.has(req))
}



// ─── Travel ───
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

  // Position marker at origin card center
  const originPos = nodePositions.value[originMap.value]
  if (originPos) {
    markerX.value = originPos.x + CARD_W / 2
    markerY.value = originPos.y + CARD_H / 2
    centerOnPoint(markerX.value, markerY.value, 0.5)
  }

  // Check if starting location is a Pokémon Center
  if (POKEMON_CENTER_NODES.has(originMap.value)) {
    shopStore.healAllPokemon(0)
    travelLog.value.push(`🏥 Centro Pokémon inicial: Tu equipo de pruebas ha sido completamente curado.`)
  }

  // Calculate speed modifiers
  const baseSpeedMultiplier = 1 + activeTeamPassives.value.speedBonus
  const baseTimePerMap = Math.max(1, (isBikeActive.value ? 2 : 4) / baseSpeedMultiplier)
  const totalDuration = (calculatedPath.value.length - 1 || 1) * baseTimePerMap
  const stateObj = { val: 0 }

  travelLog.value.push(`Iniciando viaje de ${calculatedPath.value.length} tramos...`)

  // Build marker timeline along path
  if (markerTimeline) {
    markerTimeline.kill()
  }
  markerTimeline = gsap.timeline()
  const path = calculatedPath.value
  const segTime = baseTimePerMap

  // Single persistent state object for the marker (centered on cards)
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
          onStart() {
            // Camera tracking is now handled smoothly frame-by-frame in onUpdate
          },
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

  // Main progress tween
  travelTween = gsap.to(stateObj, {
    val: 100,
    duration: totalDuration,
    ease: 'none',
    onUpdate: () => {
      const currentPct = Math.round(stateObj.val)
      travelProgress.value = currentPct

      const segmentProgress = 100 / (calculatedPath.value.length - 1 || 1)
      const nextTransitionVal = (currentSegmentIndex.value + 1) * segmentProgress

      // Check for Arrival Event at the end of the current segment
      if (stateObj.val >= nextTransitionVal && !isArrivalEventPending.value) {
        isArrivalEventPending.value = true
        const nextNodeId = calculatedPath.value[currentSegmentIndex.value + 1]!
        
        // Actualizar tarjeta superior si NO hay evento y luego en `resumeTravelAfterEvent`
        triggerRandomEvent(nextNodeId)
        return
      }

      // If an arrival event is active/pending, don't check for random steps
      if (isArrivalEventPending.value) return

      // Calculate progress within current segment (0% to 100%)
      const segmentVal = stateObj.val - (currentSegmentIndex.value * segmentProgress)
      const currentSegmentPct = (segmentVal / segmentProgress) * 100

      // Evaluate step encounters every 5% progress
      const currentStepVal = Math.floor(currentSegmentPct / 5) * 5
      if (currentStepVal > lastStepPct.value) {
        lastStepPct.value = currentStepVal

        // Don't trigger random encounters right at the end of the segment (since arrival is guaranteed)
        if (currentStepVal < 95) {
          if (safeStepsRemaining.value > 0) {
            safeStepsRemaining.value--
          } else {
            // Base encounter probability: 15%. Apply Repel modifier and Sweet Scent.
            let chance = 0.15
            if (activeTravelModifiers.value.encounterRateMod !== 0) {
              chance = chance * (1 + (activeTravelModifiers.value.encounterRateMod / 100))
            }
            if (activeSweetScent.value) {
              chance += 0.50
            }
            if (Math.random() < chance) {
              safeStepsRemaining.value = 5 // Safe zone for next 5 steps (25% progress)
              triggerRandomEvent()
            }
          }
        }
      }
    }
  })
}

const TRAINER_TYPES = {
  'caza_bichos': { name: 'Caza Bichos', sprite: 'cazabichos', pool: ['caterpie', 'metapod', 'weedle', 'kakuna', 'paras', 'venonat'] },
  'ornitologo': { name: 'Ornitólogo', sprite: 'birdkeeper', pool: ['pidgey', 'spearow', 'doduo'] },
  'cientifico': { name: 'Científico', sprite: 'scientist', pool: ['magnemite', 'voltorb', 'ditto', 'grimer'] },
  'luchador': { name: 'Luchador', sprite: 'blackbelt', pool: ['mankey', 'machop'] },
  'pescador': { name: 'Pescador', sprite: 'swimmer', pool: ['magikarp', 'goldeen', 'poliwag'] },
  'nadador': { name: 'Nadador', sprite: 'swimmer', pool: ['psyduck', 'tentacool', 'staryu', 'horsea'] },
  'domador': { name: 'Domador', sprite: 'tamer', pool: ['growlithe', 'vulpix', 'ponyta', 'ekans'] },
  'medium': { name: 'Médium', sprite: 'psychic', pool: ['abra', 'drowzee'] },
  'motorista': { name: 'Motorista', sprite: 'biker', pool: ['koffing', 'grimer', 'rattata'] },
  'montanero': { name: 'Montañero', sprite: 'hiker', pool: ['geodude', 'sandshrew', 'rhyhorn'] }
} as const

async function generateTrainerEncounter(mapData: MapLocation) {
  const keys = Object.keys(TRAINER_TYPES) as Array<keyof typeof TRAINER_TYPES>
  const typeKey = keys[Math.floor(Math.random() * keys.length)] || 'caza_bichos'
  const t = TRAINER_TYPES[typeKey]
  
  const baseLv = mapData.lv?.[0] || 5
  const trainerLv = baseLv + 2
  const teamSize = Math.floor(Math.random() * 3) + 1
  
  const { buildTrainerTeam } = await import('@/logic/battle/trainerFactory')
  const enemyTeam = await buildTrainerTeam(t.pool, trainerLv, teamSize)
  return {
    trainerName: t.name,
    trainerSprite: t.sprite,
    enemyTeam
  }
}

const triggerRandomEvent = async (targetMapId?: string) => {
  if (!travelTween) return
  travelTween.pause()
  if (markerTimeline) markerTimeline.pause()
  isPaused.value = true

  // Usar la tabla de destino si estamos viajando (como solicitó el usuario)
  const nextSegmentMapId = isTraveling.value && calculatedPath.value[currentSegmentIndex.value + 1]
    ? calculatedPath.value[currentSegmentIndex.value + 1]
    : currentMapId.value

  const mapId = (targetMapId || nextSegmentMapId || 'route1') as string
  const mapData = FIRE_RED_MAPS.find(m => m.id === mapId)

  const isCaveOrMountain = mapData?.isMountain || mapId.includes('cave') || mapId.includes('tunnel') || mapId.includes('moon') || mapId.includes('road')
  const isWaterMap = mapId.includes('seafoam') || ['route19', 'route20', 'route21'].includes(mapId)
  const hasFishing = !!mapData?.fishing

  const eventTypes: Array<'combat' | 'obstacle_cut' | 'obstacle_strength' | 'obstacle_rock_smash' | 'fishing'> = ['combat']

  if (isWaterMap) {
    eventTypes.push('fishing')
  } else if (isCaveOrMountain) {
    eventTypes.push('obstacle_rock_smash')
    eventTypes.push('obstacle_strength')
  } else {
    eventTypes.push('obstacle_cut')
    if (hasFishing) {
      eventTypes.push('fishing')
    }
  }

  // To prioritize combat, we make it highly probable (e.g. 70% chance of combat, 30% others)
  let chosenType: 'combat' | 'obstacle_cut' | 'obstacle_strength' | 'obstacle_rock_smash' | 'fishing' = 'combat'
  if (Math.random() > 0.70 && eventTypes.length > 1) {
    const nonCombatTypes = eventTypes.filter(t => t !== 'combat')
    chosenType = nonCombatTypes[Math.floor(Math.random() * nonCombatTypes.length)]!
  }

  const destinationName = mapData?.name || mapId

  const eventTemplates = {
    combat: {
      title: targetMapId ? `¡Emboscada al entrar a ${destinationName}!` : '¡Encuentro de Combate!',
      desc: isWaterMap
        ? 'Un entrenador en bañador surge del oleaje y te desafía a un combate acuático.'
        : (isCaveOrMountain ? 'Un montañero te desafía en la penumbra del sendero.' : 'Un entrenador rival sale de la hierba alta y te desafía.'),
      moRequired: undefined
    },
    obstacle_cut: {
      title: 'Obstáculo: Arbusto Espeso',
      desc: 'Un arbusto espinoso y denso corta el paso en la ruta.',
      moRequired: 'cut'
    },
    obstacle_strength: {
      title: 'Obstáculo: Gran Roca',
      desc: 'Una inmensa roca redonda bloquea el túnel, impidiendo continuar.',
      moRequired: 'strength'
    },
    obstacle_rock_smash: {
      title: 'Obstáculo: Roca Agrietada',
      desc: 'Una formación de rocas agrietadas bloquea el sendero empinado.',
      moRequired: 'rock_smash'
    },
    fishing: {
      title: 'Zona de Pesca Abundante',
      desc: isWaterMap
        ? 'El oleaje está tranquilo. Te detienes a lanzar la caña de pescar.'
        : 'Te detienes junto a un estanque en la ruta a probar suerte con la caña.',
      moRequired: undefined
    }
  }

  // Resolve Pokémon/Trainer status for combat encounters
  let combatDesc = eventTemplates.combat.desc
  let wildPoke: Pokemon | null = null
  let isTrainer = false
  let trainerName = ''
  let trainerSprite = ''
  let enemyTeam: Pokemon[] = []

  if (chosenType === 'combat' && mapData) {
    // 35% chance of Trainer battle
    if (Math.random() < 0.35) {
      isTrainer = true
      const trainerData = await generateTrainerEncounter(mapData)
      trainerName = trainerData.trainerName
      trainerSprite = trainerData.trainerSprite
      enemyTeam = trainerData.enemyTeam
      combatDesc = `💥 ¡El entrenador ${trainerName} te desafía a un combate en el camino!`
    } else {
      const poolData = getSpawnPoolForMap(mapData)
      const spawns = [...poolData.generic, ...poolData.specific]
      if (spawns.length > 0) {
        let chosenSpawn = spawns[Math.floor(Math.random() * spawns.length)]!
        if (activeTravelModifiers.value.typeFocus) {
          const typeMatch = spawns.find(s => s.toLowerCase().includes(activeTravelModifiers.value.typeFocus!))
          if (typeMatch) chosenSpawn = typeMatch
        }
        const pokemonName = chosenSpawn.charAt(0).toUpperCase() + chosenSpawn.slice(1)
        const minLv = mapData.lv?.[0] || 5
        const maxLv = mapData.lv?.[1] || 10
        const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv
        
        const generated = makePokemon(chosenSpawn, level, { shinyMultiplier: activeTravelModifiers.value.shinyChanceMod })
        if (generated) {
          wildPoke = generated
          if (wildPoke.isShiny) {
            combatDesc = `✨ ¡Un ${pokemonName} VARIOPINTO (Shiny) salvaje apareció brillando en el sendero! (Tasa Shiny: x${activeTravelModifiers.value.shinyChanceMod.toFixed(1)})`
          } else {
            combatDesc = `¡Un ${pokemonName} salvaje apareció en el sendero y te desafía a un combate!`
          }
        }
      }
    }
  }

  const template = eventTemplates[chosenType]
  activeEvent.value = {
    type: chosenType,
    title: template.title,
    desc: chosenType === 'combat' ? combatDesc : template.desc,
    moRequired: template.moRequired,
    resolved: false,
    wildPokemon: wildPoke || undefined,
    isTrainer,
    trainerName: isTrainer ? trainerName : undefined,
    trainerSprite: isTrainer ? trainerSprite : undefined,
    enemyTeam: isTrainer ? enemyTeam : undefined
  }

  travelLog.value.push(`🛑 Evento: ${template.title}`)

}

const resolveEvent = () => {
  if (!activeEvent.value) return
  const evt = activeEvent.value

  const isManualExploration = !isTraveling.value

  // ── No MO → Bypass ──
  if (evt.moRequired && !activeHMs.value.has(evt.moRequired)) {
    travelLog.value.push(`🚶 Ignorando obstáculo: No tienes la MO ${evt.moRequired.toUpperCase()}. Rodeas el obstáculo y continúas.`)
    if (isManualExploration) { activeEvent.value = null; return }
    resumeTravelAfterEvent()
    return
  }

  // ── Has MO or no MO needed → Resolve with minigame/reward ──
  if (evt.type === 'obstacle_rock_smash') {
    const fossilId = FOSSIL_POKEMON_IDS[Math.floor(Math.random() * FOSSIL_POKEMON_IDS.length)]!
    minigamePokemon.value = makePokemon(fossilId, 20) as Pokemon
    showArchaeology.value = true
    travelLog.value.push('⛏️ ¡Usas Golpe Roca y encuentras restos fósiles! Comienza la excavación...')
    return
  }

  if (evt.type === 'fishing') {
    const fishId = FISH_POKEMON_IDS[Math.floor(Math.random() * FISH_POKEMON_IDS.length)]!
    minigamePokemon.value = makePokemon(fishId, 20) as Pokemon
    showFishing.value = true
    travelLog.value.push('🎣 ¡Lanzas la caña! Comienza el minijuego de pesca...')
    return
  }

  if (evt.type === 'obstacle_cut') {
    inventoryStore.addItem('berry_bronze', 2)
    injectedItems.value.add('berry_bronze')
    inventoryStore.addItem('berry_silver', 1)
    injectedItems.value.add('berry_silver')
    travelLog.value.push('✂️ ¡Cortas el arbusto con MO Corte y recolectas bayas del árbol!')
    travelLog.value.push('🫐 +2 Baya de Bronce, +1 Baya de Plata obtenidas en tu mochila de pruebas.')
    
    triggerExtraLoot('berry_bronze', 1)

    if (isManualExploration) { activeEvent.value = null; return }
    resumeTravelAfterEvent()
    return
  }

  if (evt.type === 'obstacle_strength') {
    inventoryStore.addItem('nugget', 1)
    injectedItems.value.add('nugget')
    travelLog.value.push('💪 ¡Empujas la roca con MO Fuerza y descubres un cofre oculto!')
    travelLog.value.push('📦 +1 Pepita obtenida en tu mochila de pruebas.')
    
    triggerExtraLoot('nugget', 1)

    if (isManualExploration) { activeEvent.value = null; return }
    resumeTravelAfterEvent()
    return
  }

  if (evt.type === 'combat') {
    const healthy = (gameStore.state.team || []).some(p => p && p.hp > 0)
    if (!healthy) {
      travelLog.value.push('⚠️ No tienes Pokémon conscientes en tu equipo de pruebas para combatir.')
      return
    }

    if (travelTween) travelTween.pause()
    if (markerTimeline) markerTimeline.pause()
    isPaused.value = true

    if (evt.isTrainer && evt.enemyTeam && evt.enemyTeam.length > 0 && evt.enemyTeam[0]) {
      travelLog.value.push(`💥 Iniciando combate contra el entrenador ${evt.trainerName}...`)
      battleStore.startBattle(evt.enemyTeam[0], {
        locationId: currentMapId.value,
        wasSearching: !isTraveling.value,
        isTrainer: true,
        enemyTeam: evt.enemyTeam,
        trainerName: evt.trainerName,
        trainerSprite: evt.trainerSprite,
        persistenceMode: isTraveling.value ? 'SINGLE' : undefined,
        cannotEscape: isTraveling.value
      })
    } else {
      let wild = evt.wildPokemon
      if (!wild) {
        wild = makePokemon('rattata', 5) as Pokemon
      }

      travelLog.value.push(`💥 Iniciando combate de pruebas contra ${wild?.name} (Nivel ${wild?.level})...`)
      battleStore.startBattle(wild!, { 
        locationId: currentMapId.value, 
        wasSearching: !isTraveling.value,
        persistenceMode: isTraveling.value ? 'SINGLE' : undefined,
        cannotEscape: isTraveling.value
      })
    }
    return
  }
  
  if (isManualExploration) { 
    activeEvent.value = null
    return 
  }
  resumeTravelAfterEvent()
}

// ── Interacciones Manuales ──
const triggerExplore = async () => {
  if (isTraveling.value) return
  
  const mapData = mapLocationsById.value[originMap.value]
  if (!mapData) return

  if (!hasHealthyTeam.value) {
    travelLog.value.push('⚠️ No puedes explorar: Todos tus Pokémon están debilitados.')
    return
  }

  // 35% de chance de Entrenador salvaje en exploración manual
  if (Math.random() < 0.35) {
    const trainerData = await generateTrainerEncounter(mapData)
    activeEvent.value = {
      type: 'combat',
      title: '¡Desafío de Entrenador!',
      desc: `El entrenador ${trainerData.trainerName} te ha visto explorar y te desafía.`,
      resolved: false,
      isTrainer: true,
      trainerName: trainerData.trainerName,
      trainerSprite: trainerData.trainerSprite,
      enemyTeam: trainerData.enemyTeam
    }
    travelLog.value.push(`🌿 ¡Comienza un combate contra el entrenador ${trainerData.trainerName}!`)
    return
  }

  const poolData = getSpawnPoolForMap(mapData)
  const spawns = [...poolData.generic, ...poolData.specific]
  
  if (spawns.length === 0) {
    travelLog.value.push(`🔍 Buscaste en ${mapData.name}, pero no parece haber Pokémon salvajes aquí.`)
    return
  }

  const randomSpawn = spawns[Math.floor(Math.random() * spawns.length)]!
  const name = randomSpawn.charAt(0).toUpperCase() + randomSpawn.slice(1)

  const minLv = mapData.lv?.[0] || 5
  const maxLv = mapData.lv?.[1] || 10
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv
  
  const wildPoke = makePokemon(randomSpawn, level) as Pokemon

  activeEvent.value = {
    type: 'combat',
    title: '¡Un Pokémon salvaje apareció!',
    desc: `Has encontrado un ${name} salvaje mientras explorabas la zona.`,
    resolved: false,
    wildPokemon: wildPoke
  }
  travelLog.value.push(`🌿 ¡Comienza un combate contra ${name} salvaje!`)
}

const triggerHeal = () => {
  if (isTraveling.value) return
  shopStore.healAllPokemon(0)
  travelLog.value.push(`🏥 ¡Tu equipo ha sido completamente curado en el Centro Pokémon!`)
}

// ── Minigame callbacks ──
const handleMinigameWin = (source: 'archaeology' | 'fishing') => {
  showArchaeology.value = false
  showFishing.value = false
  minigamePokemon.value = null
  if (source === 'archaeology') {
    const fossils = ['helix_fossil', 'dome_fossil', 'old_amber']
    const chosen = fossils[Math.floor(Math.random() * fossils.length)]!
    inventoryStore.addItem(chosen, 1)
    injectedItems.value.add(chosen)
    const name = chosen === 'helix_fossil' ? 'Fósil Hélix' : (chosen === 'dome_fossil' ? 'Fósil Domo' : 'Ámbar Viejo')
    travelLog.value.push(`🦴 ¡Excavación exitosa! Has recuperado el fósil completo: +1 ${name} obtenido en tu mochila de pruebas.`)
    triggerExtraLoot(chosen, 1)
  } else {
    const fishLoot = ['pearl', 'big_pearl', 'water_stone']
    const chosen = fishLoot[Math.floor(Math.random() * fishLoot.length)]!
    inventoryStore.addItem(chosen, 1)
    injectedItems.value.add(chosen)
    const name = chosen === 'pearl' ? 'Perla' : (chosen === 'big_pearl' ? 'Perla Grande' : 'Piedra Agua')
    travelLog.value.push(`🐟 ¡Pesca exitosa! Has capturado un objeto marino: +1 ${name} obtenido en tu mochila de pruebas.`)
    triggerExtraLoot(chosen, 1)
  }
  resumeTravelAfterEvent()
}

const handleMinigameFail = (source: 'archaeology' | 'fishing') => {
  showArchaeology.value = false
  showFishing.value = false
  minigamePokemon.value = null
  if (source === 'archaeology') {
    travelLog.value.push('💔 El fósil se desmoronó... Mejor suerte la próxima vez.')
  } else {
    travelLog.value.push('💔 El Pokémon escapó de la caña... Sigues tu camino.')
  }
  resumeTravelAfterEvent()
}

// ── Detour (reroute) logic (Removed as random events are now non-blocking)

const finishTravelAtNode = (nodeId: string) => {
  if (travelTween) { travelTween.kill(); travelTween = null }
  if (markerTimeline) { markerTimeline.kill(); markerTimeline = null }

  activeEvent.value = null
  isTraveling.value = false
  isPaused.value = false
  showMarker.value = false
  isArrivalEventPending.value = false

  // Position marker at the final node card center
  const pos = nodePositions.value[nodeId]
  if (pos) {
    markerX.value = pos.x + CARD_W / 2
    markerY.value = pos.y + CARD_H / 2
    centerOnPoint(markerX.value, markerY.value, 0.6)
  }

  // Update origin for next trip
  originMap.value = nodeId
  mapStore.currentMap = nodeId
  const nodeName = FIRE_RED_MAPS.find(m => m.id === nodeId)?.name || nodeId
  travelLog.value.push(`📍 Ubicación actual: ${nodeName}. El selector de origen ha sido actualizado.`)
  calculateRoute()
}

const resumeTravelAfterEvent = () => {
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
      
      // Actualizar tarjeta superior a medida que avanzamos (tal y como pidió el usuario)
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

const cancelTravel = () => {
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

// MO label map
const moLabels: Record<string, string> = {
  surf: '🌊 Surf',
  cut: '✂️ Corte',
  strength: '💪 Fuerza',
  flash: '💡 Flash',
  rock_smash: '🪨 G.Roca',
  waterfall: '🌊 Cascada',
  fly: '🕊️ Vuelo',
}

const onModalEnter = (el: Element, done: () => void) => {
  const backdrop = el as HTMLElement
  const card = backdrop.querySelector('.adv-event-modal-card')
  if (!card) {
    done()
    return
  }
  
  gsap.set(backdrop, { opacity: 0 })
  gsap.set(card, { scale: 0.8, opacity: 0 })
  
  const tl = gsap.timeline({ onComplete: done })
  tl.to(backdrop, { opacity: 1, duration: 0.25, ease: 'power2.out' })
    .to(card, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.5)' }, '-=0.1')
}

const onModalLeave = (el: Element, done: () => void) => {
  const backdrop = el as HTMLElement
  const card = backdrop.querySelector('.adv-event-modal-card')
  if (!card) {
    done()
    return
  }
  
  const tl = gsap.timeline({ onComplete: done })
  tl.to(card, { scale: 0.8, opacity: 0, duration: 0.25, ease: 'power2.in' })
    .to(backdrop, { opacity: 0, duration: 0.15, ease: 'power2.in' }, '-=0.1')
}

// --- Cheat/Test Inventory helpers ---
const injectedItems = ref<Set<string>>(new Set())
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
        <div class="adv-manual-travel-arena">
          <div class="adv-manual-col adv-manual-left">
            <button
              v-for="conn in adjacentConnections.left"
              :key="conn.target"
              v-gsap-hover
              class="adv-manual-btn"
              :disabled="isTraveling || !hasHealthyTeam"
              @click="startManualTravel(conn.target)"
            >
              <div class="dir-icon">
                ⬅️
              </div>
              <div class="dir-label">
                {{ conn.label }}
              </div>
              <div
                v-if="conn.mo"
                class="dir-mo"
                :class="{ 'mo-missing': !activeHMs.has(conn.mo) }"
              >
                {{ conn.mo }}
              </div>
            </button>
          </div>

          <div class="adv-manual-center">
            <div class="adv-manual-top">
              <button
                v-for="conn in adjacentConnections.top"
                :key="conn.target"
                v-gsap-hover
                class="adv-manual-btn"
                :disabled="isTraveling || !hasHealthyTeam"
                @click="startManualTravel(conn.target)"
              >
                <div class="dir-icon">
                  ⬆️
                </div>
                <div class="dir-label">
                  {{ conn.label }}
                </div>
                <div
                  v-if="conn.mo"
                  class="dir-mo"
                  :class="{ 'mo-missing': !activeHMs.has(conn.mo) }"
                >
                  {{ conn.mo }}
                </div>
              </button>
            </div>

            <div class="adv-manual-card-container">
              <MapCard
                v-if="originMap && mapLocationsById[originMap]"
                :map="(mapLocationsById[originMap] as MapLocation)"
                :is-locked="false"
                :cycle="mapStore.currentCycle"
                :weather="getWeatherForMap(originMap)"
                :forced-weather="getWeatherForMap(originMap)"
                :badge-count="8"
                :spawn-pool="getSpawnPoolForMap(mapLocationsById[originMap] as MapLocation)"
                @navigate="() => {}"
              />
              
              <!-- Botones de Acción Extra (Overlay) -->
              <div
                v-if="!isTraveling"
                class="adv-card-actions-overlay"
              >
                <button 
                  v-gsap-hover
                  class="adv-action-btn explore-btn"
                  :disabled="!hasHealthyTeam"
                  @click="triggerExplore"
                >
                  🔍 Explorar Zona
                </button>
                <button 
                  v-if="POKEMON_CENTER_NODES.has(originMap)"
                  v-gsap-hover
                  class="adv-action-btn heal-btn"
                  @click="triggerHeal"
                >
                  🏥 Centro Pokémon
                </button>
              </div>
            </div>

            <div class="adv-manual-bottom">
              <button
                v-for="conn in adjacentConnections.bottom"
                :key="conn.target"
                v-gsap-hover
                class="adv-manual-btn"
                :disabled="isTraveling || !hasHealthyTeam"
                @click="startManualTravel(conn.target)"
              >
                <div class="dir-icon">
                  ⬇️
                </div>
                <div class="dir-label">
                  {{ conn.label }}
                </div>
                <div
                  v-if="conn.mo"
                  class="dir-mo"
                  :class="{ 'mo-missing': !activeHMs.has(conn.mo) }"
                >
                  {{ conn.mo }}
                </div>
              </button>
            </div>
          </div>

          <div class="adv-manual-col adv-manual-right">
            <button
              v-for="conn in adjacentConnections.right"
              :key="conn.target"
              v-gsap-hover
              class="adv-manual-btn"
              :disabled="isTraveling || !hasHealthyTeam"
              @click="startManualTravel(conn.target)"
            >
              <div class="dir-icon">
                ➡️
              </div>
              <div class="dir-label">
                {{ conn.label }}
              </div>
              <div
                v-if="conn.mo"
                class="dir-mo"
                :class="{ 'mo-missing': !activeHMs.has(conn.mo) }"
              >
                {{ conn.mo }}
              </div>
            </button>
          </div>
        </div>

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
              style="display: flex; flex-direction: column; gap: 4px; font-size: 8px; font-family: 'Press Start 2P', monospace;"
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
                style="display: flex; align-items: center; justify-content: space-between; font-size: 8px; font-family: 'Press Start 2P', monospace; padding: 4px 6px; width: 100%; text-align: left;"
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
              style="margin-top: 10px; width: 100%; padding: 8px; font-family: 'Press Start 2P', monospace; font-size: 8px;"
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
              @click.stop="handleZoomIn"
            >
              ➕
            </button>
            <button
              v-gsap-hover
              class="adv-zoom-btn"
              @click.stop="handleZoomOut"
            >
              ➖
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
                <div
                  v-gsap-hover
                  class="adv-mo-icon-bubble"
                  :class="{ 'mo-unlocked': activeHMs.has(edge.mo) }"
                >
                  <span class="bubble-emoji">{{ edge.mo === 'surf' ? '🌊' : edge.mo === 'cut' ? '🌳' : edge.mo === 'strength' ? '🪨' : edge.mo === 'rock_smash' ? '🧱' : '🔑' }}</span>
                  
                  <div class="adv-mo-tooltip">
                    <span class="tooltip-title">Requisito: MO {{ edge.mo.toUpperCase() }} ({{ moLabels[edge.mo] || edge.mo }})</span>
                    <p class="tooltip-desc">
                      {{ activeHMs.has(edge.mo) ? '✅ ¡Desbloqueado! Puedes transitar.' : '❌ Falta MO activada en tu equipo para pasar.' }}
                    </p>
                  </div>
                </div>
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
                :forced-weather="getWeatherForMap(nodeId)"
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

    <!-- Event Modal (GSAP animated) -->
    <Transition
      :css="false"
      @enter="onModalEnter"
      @leave="onModalLeave"
    >
      <div
        v-if="activeEvent"
        class="adv-event-modal-backdrop"
      >
        <div class="adv-event-modal-card">
          <h3 class="adv-pixel-text adv-event-title">
            {{ activeEvent.title }}
          </h3>
          <p class="adv-event-desc">
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
            class="adv-btn-primary adv-btn-resolve"
            @click="resumeTravelAfterEvent"
          >
            🚶 Continuar Viaje
          </button>
          <template v-else>
            <button
              v-if="!activeEvent.moRequired || activeHMs.has(activeEvent.moRequired)"
              class="adv-btn-primary adv-btn-resolve"
              @click="resolveEvent"
            >
              {{ activeEvent.type === 'obstacle_rock_smash' ? '⛏️ Excavar Fósil' : activeEvent.type === 'fishing' ? '🎣 Lanzar Caña' : activeEvent.type === 'obstacle_cut' ? '✂️ Cortar Arbusto' : activeEvent.type === 'obstacle_strength' ? '💪 Empujar Roca' : '⚔️ Combatir' }}
            </button>
            <button
              v-else
              class="adv-btn-detour adv-btn-resolve"
              @click="resolveEvent"
            >
              🚶 Rodear Obstáculo
            </button>
          </template>
        </div>
      </div>
    </Transition>

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

<style scoped lang="scss" src="./AdventureTestView.styles.scss"></style>
