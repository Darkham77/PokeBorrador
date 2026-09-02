import { describe, it, expect } from 'vitest'
import { getAdjacentNodes, dijkstra, getAlternativePaths } from '@/components/map/adventure/adventurePathfinding'
import { rawNodes, connections } from '@/components/map/adventure/adventureMapData'

describe('Adventure Pathfinding Logic', () => {
  it('correctly retrieves adjacent nodes for Pallet Town', () => {
    const adj = getAdjacentNodes('pallet', connections)
    expect(adj).toContain('route1')
    expect(adj).toContain('route21')
  })

  it('computes shortest path from Pallet Town to Viridian City without obstacles', () => {
    const discovered = Object.keys(rawNodes)
    const inventory = { Corte: false, Surf: false, Flauta: false, Medallas: false, Vuelo: false, Bicicleta: true }
    const path = dijkstra('pallet', 'viridian', rawNodes, inventory, discovered, connections)

    expect(path).not.toBeNull()
    expect(path?.nodes).toEqual(['pallet', 'route1', 'viridian'])
  })

  it('respects MO obstacle constraints (Route 9 Corte tree block)', () => {
    const discovered = Object.keys(rawNodes)
    const inventoryWithoutCut = { Corte: false, Surf: false, Flauta: false, Medallas: false, Vuelo: false, Bicicleta: true }
    
    // Trying to reach route9 from cerulean without Corte
    const pathBlocked = dijkstra('cerulean', 'route9', rawNodes, inventoryWithoutCut, discovered, connections)
    expect(pathBlocked).toBeNull()

    // With Corte unlocked
    const inventoryWithCut = { ...inventoryWithoutCut, Corte: true }
    const pathAllowed = dijkstra('cerulean', 'route9', rawNodes, inventoryWithCut, discovered, connections)
    expect(pathAllowed).not.toBeNull()
    expect(pathAllowed?.nodes).toEqual(['cerulean', 'route9'])
  })

  it('finds alternative paths when available in graph', () => {
    const discovered = Object.keys(rawNodes)
    const inventoryAll = { Corte: true, Surf: true, Flauta: true, Medallas: true, Vuelo: true, Bicicleta: true }
    
    const altPaths = getAlternativePaths('cerulean', 'lavender', rawNodes, inventoryAll, discovered, connections)
    expect(altPaths.length).toBeGreaterThanOrEqual(1)
    expect(altPaths[0]?.nodes[0]).toBe('cerulean')
    expect(altPaths[0]?.nodes[altPaths[0]?.nodes.length - 1]).toBe('lavender')
  })
})
