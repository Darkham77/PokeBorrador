import { describe, it, expect } from 'vitest';
import {
  getAdjacentNodes,
  dijkstra,
  getAlternativePaths
} from '../../logic/adventure/adventurePathfinding.ts';
import { rawNodes, connections } from '../../logic/adventure/mapData.ts';

describe('Adventure Pathfinding Logic', () => {
  it('correctly retrieves adjacent nodes for Pallet Town', () => {
    const adj = getAdjacentNodes('pallet', connections);
    expect(adj).toContain('route1');
    expect(adj).toContain('route21');
  });

  it('computes shortest path from Pallet Town to Viridian City without obstacles', () => {
    const discovered = Object.keys(rawNodes);
    const inventory = {
      Corte: false,
      Surf: false,
      Flauta: false,
      Medallas: false,
      Vuelo: false,
      Bicicleta: true
    };
    const path = dijkstra('pallet', 'viridian', rawNodes, inventory, discovered, connections);

    expect(path).not.toBeNull();
    expect(path?.nodes).toEqual(['pallet', 'route1', 'viridian']);
  });

  it('respects MO obstacle constraints (Route 9 Corte tree block)', () => {
    const discovered = Object.keys(rawNodes);
    const inventoryWithoutCut = {
      Corte: false,
      Surf: false,
      Flauta: false,
      Medallas: false,
      Vuelo: false,
      Bicicleta: true
    };

    // Trying to reach route9 from cerulean without Corte
    const pathBlocked = dijkstra(
      'cerulean',
      'route9',
      rawNodes,
      inventoryWithoutCut,
      discovered,
      connections
    );
    expect(pathBlocked).toBeNull();

    // With Corte unlocked
    const inventoryWithCut = { ...inventoryWithoutCut, Corte: true };
    const pathAllowed = dijkstra(
      'cerulean',
      'route9',
      rawNodes,
      inventoryWithCut,
      discovered,
      connections
    );
    expect(pathAllowed).not.toBeNull();
    expect(pathAllowed?.nodes).toEqual(['cerulean', 'route9']);
  });

  it('finds alternative paths when available in graph', () => {
    const discovered = Object.keys(rawNodes);
    const inventoryAll = {
      Corte: true,
      Surf: true,
      Flauta: true,
      Medallas: true,
      Vuelo: true,
      Bicicleta: true
    };

    const altPaths = getAlternativePaths(
      'cerulean',
      'lavender',
      rawNodes,
      inventoryAll,
      discovered,
      connections
    );
    expect(altPaths.length).toBeGreaterThanOrEqual(1);
    expect(altPaths[0]?.nodes[0]).toBe('cerulean');
    expect(altPaths[0]?.nodes[altPaths[0]?.nodes.length - 1]).toBe('lavender');
  });

  it('handles trivial path when start and destination nodes are identical', () => {
    const discovered = Object.keys(rawNodes);
    const inventory = {
      Corte: false,
      Surf: false,
      Flauta: false,
      Medallas: false,
      Vuelo: false,
      Bicicleta: true
    };
    const path = dijkstra('pallet', 'pallet', rawNodes, inventory, discovered, connections);

    expect(path).not.toBeNull();
    expect(path?.nodes).toEqual(['pallet']);
    expect(path?.cost).toBe(0);
  });

  it('returns empty array for non-existent node in getAdjacentNodes', () => {
    const adj = getAdjacentNodes('unknown_node_xyz', connections);
    expect(adj).toEqual([]);
  });

  it('blocks water path when Surf obstacle is missing from inventory', () => {
    const discovered = Object.keys(rawNodes);
    const inventoryNoSurf = {
      Corte: false,
      Surf: false,
      Flauta: false,
      Medallas: false,
      Vuelo: false,
      Bicicleta: true
    };

    const pathBlocked = dijkstra(
      'pallet',
      'cinnabar',
      rawNodes,
      inventoryNoSurf,
      discovered,
      connections
    );
    expect(pathBlocked).toBeNull();

    const inventoryWithSurf = { ...inventoryNoSurf, Surf: true };
    const pathAllowed = dijkstra(
      'pallet',
      'cinnabar',
      rawNodes,
      inventoryWithSurf,
      discovered,
      connections
    );
    expect(pathAllowed).not.toBeNull();
    expect(pathAllowed?.nodes[0]).toBe('pallet');
    expect(pathAllowed?.nodes[pathAllowed.nodes.length - 1]).toBe('cinnabar');
  });
});
