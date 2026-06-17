import { ref, computed, watch, type Ref } from 'vue'
import { findShortestPath } from '../../../test aventura/kantoGraph.ts'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { SHOP_ITEMS } from '@/data/inventory/items'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import { useShopStore } from '@/stores/inventory/shop'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useBuffsStore } from '@/stores/battle/buffs'

export function useAdventureRouting(options: {
  gameStore: ReturnType<typeof useGameStore>
  mapStore: ReturnType<typeof useMapStore>
  shopStore: ReturnType<typeof useShopStore>
  inventoryStore: ReturnType<typeof useInventoryStore>
  travelLog: Ref<string[]>
  hasHealthyTeam: Ref<boolean>
  startTravel: () => void
  cancelTravel: () => void
}) {
  const originMap = ref('route1')
  const destinationMap = ref('route3')
  const activeHMs = ref<Set<string>>(new Set())
  const showPreTravelModal = ref(false)
  const selectedTravelItems = ref<Set<string>>(new Set())
  const pendingManualDestination = ref<string | null>(null)
  const activeSweetScent = ref(false)
  const isTraveling = ref(false)
  const calculatedPath = ref<string[]>([])

  const hasBicycle = computed(() => {
    const inv = options.gameStore.state.inventory || {}
    return (inv['bicycle'] || 0) > 0
  })

  const isBikeActive = computed({
    get() {
      return hasBicycle.value
    },
    set(val) {
      if (val && !hasBicycle.value) {
        options.travelLog.value.push("⚠️ No tienes la Bicicleta en tu mochila de pruebas para activarla.")
      }
    }
  })

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

  const availableActiveMoves = computed(() => {
    const team = options.gameStore.state.team || []
    const list: { pokemonUid: string; pokemonName: string; moveName: string; pp: number; maxPP: number }[] = []

    team.forEach((pkmn: Pokemon) => {
      if (pkmn && pkmn.hp > 0) {
        pkmn.moves.forEach((move: Move | null) => {
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
    const team = options.gameStore.state.team || []
    const pkmn = team.find((p: Pokemon) => p.uid === pokemonUid)
    if (!pkmn) return

    const move = pkmn.moves.find((m: Move | null) => m && m.name === moveName)
    if (!move) return

    if (move.pp <= 0) {
      options.travelLog.value.push(`⚠️ ${pkmn.name} no tiene PP en ${moveName} para usarlo.`)
      return
    }

    move.pp -= 1
    options.gameStore.save(false)

    const normName = moveName.toLowerCase().replace(/[\s-]/g, '_')
    if (normName === 'teletransporte' || normName === 'teleport') {
      options.travelLog.value.push(`🔮 ¡${pkmn.name} usó ${moveName}! Cancelando viaje y regresando instantáneamente al Centro Pokémon de origen.`)
      options.cancelTravel()
      
      const originNode = originMap.value
      options.mapStore.currentMap = originNode
      options.shopStore.healAllPokemon(0)
      options.travelLog.value.push(`🏥 ¡Llegada segura a ${FIRE_RED_MAPS.find(m => m.id === originNode)?.name || originNode}! Tu equipo ha sido completamente curado.`)
    } else if (normName === 'dulce_aroma' || normName === 'sweet_scent') {
      activeSweetScent.value = true
      options.travelLog.value.push(`🌸 ¡${pkmn.name} usó ${moveName}! Un aroma dulce inunda el sendero: la tasa de combates ha aumentado.`)
    }
  }

  const startManualTravel = (targetId: string) => {
    if (isTraveling.value) return
    
    if (!options.hasHealthyTeam.value) {
      options.travelLog.value.push("⚠️ No puedes iniciar un viaje o ruta: Necesitas al menos 1 Pokémon con vida en tu equipo.")
      return
    }

    pendingManualDestination.value = targetId
    
    const path = findShortestPath(originMap.value, targetId, activeHMs.value)
    if (!path || path.length === 0) {
      options.travelLog.value.push(`❌ Ruta bloqueada: Faltan MOs necesarias para avanzar hacia allí.`)
      return
    }
    
    selectedTravelItems.value.clear()
    showPreTravelModal.value = true
  }

  const cancelPreTravel = () => {
    showPreTravelModal.value = false
    pendingManualDestination.value = null
    selectedTravelItems.value.clear()
  }

  const calculateRoute = () => {
    const path = findShortestPath(originMap.value, destinationMap.value, activeHMs.value)
    if (path) {
      calculatedPath.value = path
      options.travelLog.value = [`Ruta calculada: ${path.map(id => FIRE_RED_MAPS.find(m => m.id === id)?.name || id).join(' → ')}`]
    } else {
      calculatedPath.value = []
      options.travelLog.value = ['⚠️ No hay ruta transitable con las MOs actuales.']
    }
  }

  const confirmPreTravel = () => {
    if (!pendingManualDestination.value) return
    destinationMap.value = pendingManualDestination.value
    
    calculateRoute()
    if (calculatedPath.value.length === 0) {
      options.travelLog.value.push(`❌ Ruta bloqueada: Faltan MOs necesarias para avanzar hacia allí.`)
      cancelPreTravel()
      return
    }

    selectedTravelItems.value.forEach(itemId => {
      options.inventoryStore.removeItem(itemId, 1)
      options.travelLog.value.push(`🎒 Consumido: -1x ${itemId} de tu mochila real.`)
      
      const buffsStore = useBuffsStore()
      if (itemId === 'repel') buffsStore.addBuff('repel', 5 * 60)
      else if (itemId === 'super_repel') buffsStore.addBuff('repel', 15 * 60)
      else if (itemId === 'max_repel') buffsStore.addBuff('repel', 30 * 60)
      else if (itemId === 'lucky_egg') buffsStore.addBuff('lucky-egg', 30 * 60)
      else if (itemId === 'amulet_coin') buffsStore.addBuff('amulet', 60 * 60)
      else if (itemId === 'ticket_shiny') buffsStore.addBuff('shiny', 60 * 60)
      else if (itemId.startsWith('incense_')) {
        const type = itemId.split('_')[1]
        buffsStore.addBuff('incense', 30 * 60, type)
      }
    })

    selectedTravelItems.value.clear()
    
    showPreTravelModal.value = false
    pendingManualDestination.value = null
    
    options.startTravel()
  }

  const filteredBuffItems = computed(() => {
    const buffIds = [
      'repel', 'super_repel', 'max_repel',
      'lucky_egg', 'amulet_coin', 'ticket_shiny',
      'incense_fire', 'incense_water', 'incense_grass', 'incense_normal', 'incense_ghost', 'incense_psychic'
    ]
    return SHOP_ITEMS.filter(item => buffIds.includes(item.id) && (options.gameStore.state.inventory?.[item.id] || 0) > 0)
  })

  const toggleHM = (hmName: string) => {
    const next = new Set(activeHMs.value)
    if (next.has(hmName)) {
      next.delete(hmName)
    } else {
      next.add(hmName)
    }
    activeHMs.value = next
  }

  watch(
    [activeHMs, originMap, destinationMap],
    () => {
      if (!isTraveling.value) {
        calculateRoute()
      }
    },
    { deep: true }
  )

  return {
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
  }
}
