import { computed } from 'vue'
import type { Ref } from 'vue'
import { ADVENTURE_NODE_IDS, KANTO_NODE_POSITIONS, KANTO_CONNECTIONS } from '../../../test aventura/kantoGraph.ts'
import type { AdventureNodeId, GraphEdge } from '../../../test aventura/kantoGraph.ts'
import type { MapLocation } from '@/types/pokemon/encounters'


const POKEMON_CENTER_NODES = [
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
] as const

type PokemonCenterNodeId = (typeof POKEMON_CENTER_NODES)[number]

function isPokemonCenterNodeId(value: AdventureNodeId): value is PokemonCenterNodeId {
  return (POKEMON_CENTER_NODES as readonly AdventureNodeId[]).includes(value)
}

const CANVAS_W = 6400
const CANVAS_H = 4400
const CARD_W = 320
const CARD_H = 220

export function useAdventureLayout(options: {
  cameraScale: Ref<number>
  calculatedPath: Ref<AdventureNodeId[]>
  originMap: Ref<AdventureNodeId>
  activeHMs: Ref<Set<string>>
  mapLocationsById: Ref<Partial<Record<AdventureNodeId, MapLocation>>>
}) {
  const nodePositions = computed(() => {
    const result: Partial<Record<AdventureNodeId, { x: number; y: number; label: string }>> = {}
    for (const id of ADVENTURE_NODE_IDS) {
      const pos = KANTO_NODE_POSITIONS[id]
      result[id] = {
        x: (pos.x / 100) * (CANVAS_W - CARD_W),
        y: (pos.y / 100) * (CANVAS_H - CARD_H),
        label: pos.label,
      }
    }
    return result
  })

  const validNodeIds = computed(() => {
    return ADVENTURE_NODE_IDS.filter(id => options.mapLocationsById.value[id])
  })

  const worldOverlayScale = computed(() => 1 / Math.max(options.cameraScale.value, 0.25))

const OVERLAY_X_OFFSET_RIGHT = 20
const OVERLAY_Y_OFFSET_TOP = 18

  const pokemonCenterOverlays = computed(() => {
    return validNodeIds.value.flatMap(nodeId => {
      if (!isPokemonCenterNodeId(nodeId)) return []
      const position = nodePositions.value[nodeId]
      if (!position) return []
      return [{
        id: nodeId,
        label: options.mapLocationsById.value[nodeId]?.name || KANTO_NODE_POSITIONS[nodeId].label,
        x: position.x + CARD_W - OVERLAY_X_OFFSET_RIGHT,
        y: position.y + OVERLAY_Y_OFFSET_TOP
      }]
    })
  })

  const adjacentConnections = computed(() => {
    const origin = options.originMap.value
    const originPos = nodePositions.value[origin]
    const connections = KANTO_CONNECTIONS[origin] || []
    const result = {
      top: [] as { target: AdventureNodeId, mo?: string, label: string }[],
      bottom: [] as { target: AdventureNodeId, mo?: string, label: string }[],
      left: [] as { target: AdventureNodeId, mo?: string, label: string }[],
      right: [] as { target: AdventureNodeId, mo?: string, label: string }[],
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

  const pathSet = computed(() => new Set(options.calculatedPath.value))
  const pathEdgeSet = computed(() => {
    const set = new Set<string>()
    const path = options.calculatedPath.value
    for (let i = 0; i < path.length - 1; i++) {
      const key = [path[i]!, path[i + 1]!].sort().join('|')
      set.add(key)
    }
    return set
  })

  const getEdgeKey = (from: string, to: string) => [from, to].sort().join('|')
  const isEdgeOnPath = (from: string, to: string) => pathEdgeSet.value.has(getEdgeKey(from, to))

  const isEdgeTraversable = (edge: GraphEdge) => {
    if (!edge.mo) return true
    const requirements = edge.mo.split(',')
    return requirements.every(req => options.activeHMs.value.has(req))
  }

  return {
    nodePositions,
    validNodeIds,
    worldOverlayScale,
    pokemonCenterOverlays,
    adjacentConnections,
    pathSet,
    pathEdgeSet,
    isEdgeOnPath,
    isEdgeTraversable
  }
}
