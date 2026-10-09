/**
 * tests/node/map/maritimeBridgesAndUrbanClearance.test.ts
 *
 * TIER 1 RED-to-GREEN TEST SUITE FOR:
 * 1. Bridge span limit (<= 6 tiles) & prohibition of 90-degree corners in water.
 * 2. Mandatory 2.5D building isolation padding (dx >= 1, dy_south >= 2, dy_north >= 1).
 * 3. Mountain multi-tier terrace forcing for massifs > 25 tiles.
 * 4. Procedural cave entrance on south cliff walls intersecting routes.
 * 5. Minor island rock beacons & unique interior visual landmark.
 */

import { describe, it, expect } from 'vitest';
import { generateOrganicCityLayout } from '../../../src/logic/map/organicCityEngine.ts';
import { MASSIF_TIER_2_MIN_CELLS } from '../../../src/logic/map/continentMountainEngine.ts';
import {
  generateRouteNetwork,
  MAX_CANONICAL_BRIDGE_SPAN
} from '../../../src/logic/map/routeNetworkEngine.ts';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';
import type { WaterTerrainKind } from '../../../src/logic/map/waterAutotileEngine.ts';

describe('maritimeBridgesAndUrbanClearance (Tier 1 Architecture Verification)', () => {
  describe('Pillar 1: Bridge Span Limits & 90-Degree Turn Prohibition', () => {
    it('defines MAX_CANONICAL_BRIDGE_SPAN strictly as 6 tiles', () => {
      expect(MAX_CANONICAL_BRIDGE_SPAN).toBe(6);
    });

    it('prohibits wooden bridges across water runs longer than 6 tiles', () => {
      const W = 30;
      const H = 15;
      const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: H }, () =>
        Array.from({ length: W }, () => 'grass')
      );

      // Create a 8-cell wide water channel between x=10 and x=17 (8 tiles of continuous water)
      for (let y = 0; y < H; y++) {
        for (let x = 10; x <= 17; x++) {
          terrainMatrix[y]![x] = 'water';
        }
      }

      const continentMap = generateContinentMap({
        width: W,
        height: H,
        seed: 42,
        withStairs: false
      });
      // Override terrain matrix with our controlled test channel
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          (continentMap.cells[y]![x] as { terrain: string }).terrain = terrainMatrix[y]![x]!;
          (continentMap.cells[y]![x] as { isWalkable: boolean }).isWalkable = terrainMatrix[y]![x] !== 'water';
          (continentMap.terrainMatrix[y]![x] as string) = terrainMatrix[y]![x]!;
        }
      }

      const nodeA: POINode = {
        id: 'shore_west',
        name: 'Shore West',
        type: 'town',
        footprint: { width: 4, height: 4 },
        terrainPreference: 'flat_grass',
        gridX: 4,
        gridY: 5,
        elevation: 0
      };
      const nodeB: POINode = {
        id: 'shore_east',
        name: 'Shore East',
        type: 'town',
        footprint: { width: 4, height: 4 },
        terrainPreference: 'flat_grass',
        gridX: 20,
        gridY: 5,
        elevation: 0
      };

      const result = generateRouteNetwork(continentMap, [nodeA, nodeB], { allowBridges: true });

      // Across the 8-cell water channel, bridgeGrid must be 100% false!
      for (let y = 0; y < H; y++) {
        for (let x = 10; x <= 17; x++) {
          expect(result.bridgeGrid[y]![x]).toBe(false);
        }
      }
    });

    it('prohibits wooden bridges when a water route turns at 90 degrees in open water', () => {
      const W = 25;
      const H = 25;
      const continentMap = generateContinentMap({ width: W, height: H, seed: 101 });

      const nodeA: POINode = {
        id: 'bay_south',
        name: 'Bay South',
        type: 'town',
        footprint: { width: 4, height: 4 },
        terrainPreference: 'flat_grass',
        gridX: 5,
        gridY: 18,
        elevation: 0
      };
      const nodeB: POINode = {
        id: 'bay_east',
        name: 'Bay East',
        type: 'town',
        footprint: { width: 4, height: 4 },
        terrainPreference: 'flat_grass',
        gridX: 18,
        gridY: 5,
        elevation: 0
      };

      const result = generateRouteNetwork(continentMap, [nodeA, nodeB], { allowBridges: true });

      // Verify that no bridge cell in open water has both horizontal and vertical neighbors forming an open-water L-corner
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (!result.bridgeGrid[y]![x]) continue;
          if (continentMap.cells[y]?.[x]?.terrain !== 'water') continue;

          const hasN = Boolean(result.bridgeGrid[y - 1]?.[x] && continentMap.cells[y - 1]?.[x]?.terrain === 'water');
          const hasS = Boolean(result.bridgeGrid[y + 1]?.[x] && continentMap.cells[y + 1]?.[x]?.terrain === 'water');
          const hasW = Boolean(result.bridgeGrid[y]?.[x - 1] && continentMap.cells[y]?.[x - 1]?.terrain === 'water');
          const hasE = Boolean(result.bridgeGrid[y]?.[x + 1] && continentMap.cells[y]?.[x + 1]?.terrain === 'water');

          const hasCornerTurn = (hasN || hasS) && (hasW || hasE);
          expect(hasCornerTurn, `Bridge at (${x}, ${y}) forms a 90-degree corner in open water`).toBe(false);
        }
      }
    });
  });

  describe('Pillar 2: Mandatory 2.5D Building Isolation Mask', () => {
    it('guarantees >= 1 tile lateral clearance and >= 2 tiles south / 1 tile north clearance across 50 random city seeds', () => {
      for (let seed = 1; seed <= 50; seed++) {
        const node: POINode = {
          id: `city_padding_${seed}`,
          name: `City ${seed}`,
          type: seed % 2 === 0 ? 'city' : 'metropolis',
          footprint: { width: 24, height: 20 },
          terrainPreference: 'flat_grass',
          gridX: 10,
          gridY: 10,
          elevation: 0
        };

        const layout = generateOrganicCityLayout(node, seed);
        const bldgs = layout.buildings;

        for (let i = 0; i < bldgs.length; i++) {
          for (let j = i + 1; j < bldgs.length; j++) {
            const a = bldgs[i]!;
            const b = bldgs[j]!;

            // Lateral margin check: if horizontal footprints have less than 1 free tile between them:
            const lateralOverlap = a.x < b.x + b.width + 1 && a.x + a.width > b.x - 1;

            if (lateralOverlap) {
              // Vertically, they MUST be separated:
              // If a is north of b: b.y >= a.y + a.height + 2 (2 tiles south of a, 1 tile north of b)
              // If b is north of a: a.y >= b.y + b.height + 2
              const verticalSatisfied = a.y + a.height + 2 <= b.y || b.y + b.height + 2 <= a.y;
              expect(
                verticalSatisfied,
                `Seed ${seed}: Building ${a.id} (${a.x},${a.y},${a.width}x${a.height}) and ${b.id} (${b.x},${b.y},${b.width}x${b.height}) violate 2.5D isolation padding`
              ).toBe(true);
            }
          }
        }
      }
    });
  });

  describe('Pillar 3: Mountain Depth Scaling & Terrace Forcing', () => {
    it('sets MASSIF_TIER_2_MIN_CELLS strictly to 25 cells', () => {
      expect(MASSIF_TIER_2_MIN_CELLS).toBe(25);
    });

    it('forces at least 2 discrete height levels for any contiguous mountain mass > 25 tiles', () => {
      const W = 64;
      const H = 64;
      const continent = generateContinentMap({ width: W, height: H, seed: 777 });

      // Find all contiguous massifs in heightmap
      const visited = Array.from({ length: H }, () => Array(W).fill(false));
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (continent.heightmap[y]![x]! === 0 || visited[y]![x]) continue;

          const mass: { x: number; y: number; elev: number }[] = [];
          const queue = [{ x, y }];
          visited[y]![x] = true;

          while (queue.length > 0) {
            const curr = queue.pop()!;
            mass.push({ x: curr.x, y: curr.y, elev: continent.heightmap[curr.y]![curr.x]! });
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
              const nx = curr.x + dx!;
              const ny = curr.y + dy!;
              if (nx >= 0 && nx < W && ny >= 0 && ny < H && continent.heightmap[ny]![nx]! > 0 && !visited[ny]![nx]) {
                visited[ny]![nx] = true;
                queue.push({ x: nx, y: ny });
              }
            }
          }

          if (mass.length > 25) {
            const maxElev = Math.max(...mass.map((m) => m.elev));
            expect(
              maxElev >= 2,
              `Massif of size ${mass.length} at (${x}, ${y}) has max elevation ${maxElev}, expected >= 2`
            ).toBe(true);
          }
        }
      }
    });
  });

  describe('Pillar 1b: Maritime Rock Obstacle Channels', () => {
    it('generates maritime rock obstacles along long surf routes', () => {
      const W = 40;
      const H = 20;
      const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: H }, () =>
        Array.from({ length: W }, () => 'grass')
      );
      // Continuous water channel of 12 tiles
      for (let y = 0; y < H; y++) {
        for (let x = 12; x <= 24; x++) {
          terrainMatrix[y]![x] = 'water';
        }
      }

      const continentMap = generateContinentMap({ width: W, height: H, seed: 42, withStairs: false });
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          (continentMap.cells[y]![x] as { terrain: string }).terrain = terrainMatrix[y]![x]!;
          (continentMap.cells[y]![x] as { isWalkable: boolean }).isWalkable = terrainMatrix[y]![x] !== 'water';
          (continentMap.terrainMatrix[y]![x] as string) = terrainMatrix[y]![x]!;
        }
      }

      const nodeA: POINode = {
        id: 'sea_origin',
        name: 'Sea Origin',
        type: 'town',
        footprint: { width: 4, height: 4 },
        terrainPreference: 'flat_grass',
        gridX: 4,
        gridY: 8,
        elevation: 0
      };
      const nodeB: POINode = {
        id: 'sea_dest',
        name: 'Sea Dest',
        type: 'town',
        footprint: { width: 4, height: 4 },
        terrainPreference: 'flat_grass',
        gridX: 30,
        gridY: 8,
        elevation: 0
      };

      const result = generateRouteNetwork(continentMap, [nodeA, nodeB], {
        allowBridges: true,
        maxConnectionDistance: 50
      });
      expect(result.maritimeRockObstacles).toBeDefined();
      expect(result.maritimeRockObstacles!.length).toBeGreaterThan(0);
      expect(result.maritimeRockObstacles![0]!.prefabFile).toBe('poke_water_rocks_calm.png');
    });
  });
});

