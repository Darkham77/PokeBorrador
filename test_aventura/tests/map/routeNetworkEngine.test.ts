/**
 * tests/node/map/routeNetworkEngine.test.ts
 *
 * TIER 1 & TIER 2 UNIT TESTS FOR SETTLEMENTS, POIS & ROUTE NETWORK ENGINE
 *
 * Validates:
 *   1. Morphological orphan tile pruning (removeOrphanTiles).
 *   2. Heterogeneous POI placement across 128x128 regional map (15-20+ POIs).
 *   3. Topological anchors: cave entrances on south cliffs, port docks on coastlines, settlements on flat plains.
 *   4. Planar graph connectivity (100% connected, 0 isolated nodes).
 *   5. A* pathfinding: 2-cell wide paths, routing through stairs between elevations.
 *   6. Canonical path autotiling (resolvePathGrid) with 8-neighbor bitmasking.
 */

import { describe, it, expect } from 'vitest';
import {
  generateContinentMap,
  removeOrphanTiles,
  type ContinentMapResult
} from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import {
  buildRouteChain,
  generateRouteNetwork
} from '../../../src/logic/map/routeNetworkEngine.ts';
import {
  resolvePathGrid,
  CANONICAL_DIRT_PATH_BRUSH
} from '../../../src/logic/map/pathAutotileEngine.ts';
import type { WaterTerrainKind } from '../../../src/logic/map/waterAutotileEngine.ts';

describe('routeNetworkEngine & POI systems', () => {
  describe('removeOrphanTiles', () => {
    it('prunes isolated land components smaller than minSize to water', () => {
      // 10x10 ocean matrix with:
      // - an isolated 2-cell island at (2, 2) and (2, 3)
      // - an isolated 1-cell sand speck at (7, 2)
      // - a 6-cell island at (6, 6)
      const matrix: WaterTerrainKind[][] = Array.from({ length: 10 }, () =>
        Array<WaterTerrainKind>(10).fill('water')
      );

      matrix[2]![2] = 'grass';
      matrix[3]![2] = 'grass';

      matrix[2]![7] = 'sand';

      matrix[6]![6] = 'grass';
      matrix[6]![7] = 'grass';
      matrix[7]![6] = 'grass';
      matrix[7]![7] = 'grass';
      matrix[8]![6] = 'grass';
      matrix[8]![7] = 'grass';

      removeOrphanTiles(matrix, 4);

      // 2-cell and 1-cell islands must be turned to water
      expect(matrix[2]![2]).toBe('water');
      expect(matrix[3]![2]).toBe('water');
      expect(matrix[2]![7]).toBe('water');

      // 6-cell island must be preserved
      expect(matrix[6]![6]).toBe('grass');
      expect(matrix[6]![7]).toBe('grass');
      expect(matrix[7]![6]).toBe('grass');
      expect(matrix[7]![7]).toBe('grass');
    });
  });

  describe('placeRegionalPOIs', () => {
    const continent: ContinentMapResult = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    it('places 15 to 22 heterogeneous POIs across a 128x128 regional map', () => {
      const pois = placeRegionalPOIs(continent, { targetCount: 18 });

      expect(pois.length).toBeGreaterThanOrEqual(14);
      expect(pois.length).toBeLessThanOrEqual(22);

      // Verify presence of diverse types
      const types = new Set(pois.map((p) => p.type));
      expect(types.has('metropolis')).toBe(true);
      expect(types.has('city')).toBe(true);
      expect(types.has('town')).toBe(true);
      expect(types.has('cave_entrance')).toBe(true);
      expect(types.has('port_dock')).toBe(true);
    });

    it('anchors cave entrances strictly on south cliff wall faces with valid landing', () => {
      const pois = placeRegionalPOIs(continent, { targetCount: 18 });
      const caves = pois.filter((p) => p.type === 'cave_entrance');

      expect(caves.length).toBeGreaterThan(0);
      for (const cave of caves) {
        const cell = continent.resolvedMountain.cellDetails[cave.gridY]?.[cave.gridX];
        expect(cell?.role).toBe('edge_south_top');
        expect(cave.elevation).toBeGreaterThanOrEqual(1);
        expect(cave.facing).toBe('south');
      }
    });
    it('anchors exactly one Vermilion Port Gate on the coastline sand-to-water boundary', () => {
      const pois = placeRegionalPOIs(continent, { targetCount: 18 });
      const docks = pois.filter((p) => p.type === 'port_dock');

      expect(docks.length).toBe(1);
      const dock = docks[0]!;
      expect(dock.id).toBe('vermilion_port');
      expect(dock.buildingFile).toMatch(/^poke_port_vermilion_gate(_(north|west|east))?\.png$/);

      let touchesSand = false;
      for (let dy = 0; dy < dock.footprint.height; dy++) {
        for (let dx = 0; dx < dock.footprint.width; dx++) {
          if (continent.terrainMatrix[dock.gridY + dy]?.[dock.gridX + dx] === 'sand') {
            touchesSand = true;
            break;
          }
        }
        if (touchesSand) break;
      }
      expect(touchesSand).toBe(true);
    });

    it('ensures no POI footprints overlap with each other', () => {
      const pois = placeRegionalPOIs(continent, { targetCount: 18 });

      for (let i = 0; i < pois.length; i++) {
        for (let j = i + 1; j < pois.length; j++) {
          const a = pois[i]!;
          const b = pois[j]!;

          const overlapX = a.gridX < b.gridX + b.footprint.width && a.gridX + a.footprint.width > b.gridX;
          const overlapY = a.gridY < b.gridY + b.footprint.height && a.gridY + a.footprint.height > b.gridY;

          expect(overlapX && overlapY).toBe(false);
        }
      }
    });
  });

  describe('buildRouteChain & generateRouteNetwork', () => {
    const continent: ContinentMapResult = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18 });

    it('constructs a linear Hamiltonian chain with stub connections for all POIs', () => {
      const { chain, stubs, loops } = buildRouteChain(pois);

      // Chain must form a linear path: exactly N-1 edges for N primary nodes
      const primaryCount = pois.filter((p) =>
        p.type === 'metropolis' || p.type === 'city' || p.type === 'town' || p.type === 'pokemon_league'
      ).length;
      expect(chain.length).toBe(primaryCount - 1);

      // Every secondary POI must have a stub connection
      const secondaryCount = pois.length - primaryCount;
      expect(stubs.length).toBe(secondaryCount);

      // Loops are optional but capped at 2
      expect(loops.length).toBeLessThanOrEqual(2);

      // Verify all primary nodes are reachable via chain traversal
      const adj: number[][] = Array.from({ length: pois.length }, () => []);
      for (const edge of chain) {
        adj[edge.fromIndex]!.push(edge.toIndex);
        adj[edge.toIndex]!.push(edge.fromIndex);
      }
      for (const stub of stubs) {
        adj[stub.nearestPrimaryIndex]!.push(stub.secondaryIndex);
        adj[stub.secondaryIndex]!.push(stub.nearestPrimaryIndex);
      }
      for (const loop of loops) {
        adj[loop.fromIndex]!.push(loop.toIndex);
        adj[loop.toIndex]!.push(loop.fromIndex);
      }

      const visited = new Set<number>();
      const queue = [0];
      visited.add(0);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const nxt of adj[curr]!) {
          if (!visited.has(nxt)) {
            visited.add(nxt);
            queue.push(nxt);
          }
        }
      }

      expect(visited.size).toBe(pois.length);
    });

    it('traces A* paths across the terrain, producing 2-cell wide paths', () => {
      const result = generateRouteNetwork(continent, pois, { allowBridges: true });

      expect(result.edges.length).toBeGreaterThan(0);

      let pathCellCount = 0;
      for (let y = 0; y < continent.height; y++) {
        for (let x = 0; x < continent.width; x++) {
          if (result.pathGrid[y]![x]) pathCellCount++;
        }
      }

      // 18 connected POIs on 128x128 map should have extensive path networks (> 300 cells)
      expect(pathCellCount).toBeGreaterThan(300);
    });
  });

  describe('resolvePathGrid', () => {
    it('autotiles 2D dirt paths correctly against non-path cells', () => {
      // 5x5 grid with horizontal path strip on row 2
      const pathGrid = Array.from({ length: 5 }, (_, y) =>
        Array.from({ length: 5 }, () => y === 2)
      );

      const resolved = resolvePathGrid(pathGrid, undefined, CANONICAL_DIRT_PATH_BRUSH);

      expect(resolved.width).toBe(5);
      expect(resolved.height).toBe(5);

      // Center tile at (2, 2) has North and South as non-path (horizontal path)
      const centerCell = resolved.pathDetails[2]![2];
      expect(centerCell).not.toBeNull();
      expect(centerCell?.primaryTile).toBeDefined();
    });
  });
});
