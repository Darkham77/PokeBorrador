/**
 * tests/node/map/continentalEngine.test.ts
 *
 * TIER 1 ISOLATED UNIT TEST: CONTINENTAL GENERATION ENGINE
 * Verifies parametric generation, deterministic seeding, biome coverage,
 * and 100% graph connectivity without isolated nodes.
 */

import { describe, it, expect } from 'vitest';
import {
  generateContinent,
  type GeneratedContinentResult
} from '../../logic/map/continent/continentalEngine';
import type { ContinentGenConfig } from '../../types/map/continentTypes';

describe('continentalEngine', () => {
  const baseConfig: ContinentGenConfig = {
    seed: 12345,
    dimensions: {
      width: 1600,
      height: 1200,
      tileSize: 32
    },
    cityCount: 8,
    biomes: {
      waterPercent: 20,
      forestPercent: 25,
      mountainPercent: 15,
      snowPercent: 10,
      beachPercent: 10
    },
    roadWidth: 1
  };

  it('generates a continental grid with correct dimensions', () => {
    const result: GeneratedContinentResult = generateContinent(baseConfig);
    const expectedGridW = Math.floor(baseConfig.dimensions.width / baseConfig.dimensions.tileSize);
    const expectedGridH = Math.floor(baseConfig.dimensions.height / baseConfig.dimensions.tileSize);

    expect(result.gridWidth).toBe(expectedGridW);
    expect(result.gridHeight).toBe(expectedGridH);
    expect(result.biomeGrid.length).toBe(expectedGridH);
    expect(result.biomeGrid[0]?.length).toBe(expectedGridW);
  });

  it('produces 100% deterministic output for identical seeds', () => {
    const resultA = generateContinent(baseConfig);
    const resultB = generateContinent(baseConfig);

    expect(resultA.nodes).toEqual(resultB.nodes);
    expect(resultA.connections).toEqual(resultB.connections);

    // Verify cell-by-cell biome determinism
    for (let y = 0; y < resultA.gridHeight; y++) {
      for (let x = 0; x < resultA.gridWidth; x++) {
        expect(resultA.biomeGrid[y]?.[x]).toBe(resultB.biomeGrid[y]?.[x]);
      }
    }
  });

  it('produces different outputs for different seeds', () => {
    const resultA = generateContinent({ ...baseConfig, seed: 11111 });
    const resultB = generateContinent({ ...baseConfig, seed: 99999 });

    expect(resultA.nodes).not.toEqual(resultB.nodes);
  });

  it('places the requested number of cities on land', () => {
    const result = generateContinent(baseConfig);
    const nodesList = Object.values(result.nodes);

    expect(nodesList.length).toBe(baseConfig.cityCount);

    for (const node of nodesList) {
      const gx = Math.floor(node.x / baseConfig.dimensions.tileSize);
      const gy = Math.floor(node.y / baseConfig.dimensions.tileSize);
      const biome = result.biomeGrid[gy]?.[gx];

      // Nodes must be placed on land (not ocean)
      expect(biome).not.toBe('ocean');
      expect(node.name.length).toBeGreaterThan(0);
      expect(node.amenities.length).toBeGreaterThan(0);
    }
  });

  it('ensures 100% graph connectivity with no orphan nodes', () => {
    const result = generateContinent(baseConfig);
    const nodeIds = Object.keys(result.nodes);
    expect(nodeIds.length).toBeGreaterThan(1);

    // Build adjacency list
    const adj = new Map<string, Set<string>>();
    for (const id of nodeIds) {
      adj.set(id, new Set());
    }

    for (const [u, v] of result.connections) {
      adj.get(u)?.add(v);
      adj.get(v)?.add(u);
    }

    // Breadth-first search from first node
    const firstNode = nodeIds[0]!;
    const visited = new Set<string>([firstNode]);
    const queue = [firstNode];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const neighbor of adj.get(curr) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // Every node must be reachable (connected graph)
    expect(visited.size).toBe(nodeIds.length);
  });

  it('includes requested biomes (snow, mountain, forest, beach, ocean)', () => {
    const result = generateContinent(baseConfig);
    const biomesFound = new Set<string>();

    for (let y = 0; y < result.gridHeight; y++) {
      for (let x = 0; x < result.gridWidth; x++) {
        const b = result.biomeGrid[y]?.[x];
        if (b) biomesFound.add(b);
      }
    }

    expect(biomesFound.has('ocean')).toBe(true);
    expect(biomesFound.has('grass')).toBe(true);
    expect(biomesFound.has('mountain')).toBe(true);
    expect(biomesFound.has('forest')).toBe(true);
    expect(biomesFound.has('snow')).toBe(true);
    expect(biomesFound.has('beach')).toBe(true);
  });
});
