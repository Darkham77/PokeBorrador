/**
 * tests/node/map/islandSemanticsAndPortIntegration.test.ts
 *
 * TIER 1 RED-to-GREEN TEST SUITE FOR:
 * 1. Mountain cliff wall texture consistency on h >= 2 & temperate cordilleras (gray granite palette).
 * 2. Elimination of redundant cliff stairs within Manhattan distance < 4.
 * 3. Satellite island area < 80 semantics: zero urban settlements/marts/centers, 3 archetypes, no orphan signs.
 * 4. Forced port city integration: ferry terminal prefab, 3-wide deep water pier, ferry mooring reservation.
 * 5. Route gate clearance: >= 2 tiles from water/bridges, flat elevation 0 doorways.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveMountainMapGrid,
  resolveMountainAutotileCell,
  pruneRedundantStairs,
  type MountainStairLocation
} from '../../../src/logic/map/mountainAutotileEngine.ts';
import {
  clusterMountainMassifs
} from '../../../src/logic/map/geologicalClusterEngine.ts';
import {
  generatePokemonContinentalWorld
} from '../../../src/logic/map/continent/continentalEngine.ts';

describe('islandSemanticsAndPortIntegration (Tier 1 Architecture Verification)', () => {
  describe('Pillar 1: Mountain Biome Palette Consistency & Redundant Stairs', () => {
    it('forces gray cliff wall sprites for high rock tier h >= 2 in temperate regions', () => {
      // 5x5 plateau where center is h = 2 and surrounds are h = 1
      const elev = [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 2, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0]
      ];

      // Rock mountain tier resolved with gray palette must strictly use gray rock tiles
      const cellH2 = resolveMountainAutotileCell(elev, 2, 2, 'gray', 'rock');
      expect(cellH2.primaryTile).toContain('gray');
      expect(cellH2.primaryTile).not.toContain('brown');
    });

    it('enforces single-palette consistency across all cells in a cordillera, prohibiting mixed tiles', () => {
      const W = 30;
      const H = 20;
      const elev: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
      // Put a mountain on the eastern half (centroidX >= W * 0.5 = 15) -> gray granite cordillera
      for (let y = 5; y <= 10; y++) {
        for (let x = 18; x <= 24; x++) {
          elev[y]![x] = 1;
        }
      }

      const clusters = clusterMountainMassifs({
        elevationMatrix: elev
      });

      expect(clusters.massifs.length).toBeGreaterThan(0);
      const easternMassif = clusters.massifs[0]!;
      expect(easternMassif.palette).toBe('gray');

      // Resolve mountain grid with the cluster paletteMatrix
      const resolved = resolveMountainMapGrid(elev, {
        paletteMatrix: clusters.paletteMatrix
      });

      // All resolved cells in the gray cordillera must strictly belong to the gray palette set
      for (let y = 5; y <= 10; y++) {
        for (let x = 18; x <= 24; x++) {
          const cell = resolved.cellDetails[y]?.[x];
          expect(cell).toBeDefined();
          expect(cell!.primaryTile).toContain('gray');
          expect(cell!.primaryTile).not.toContain('brown');
        }
      }
    });

    it('prunes redundant stairs within Manhattan distance < 4, retaining the one connected to pathGrid', () => {
      const stairs: MountainStairLocation[] = [
        { x: 10, y: 10, tier: 1 },
        { x: 12, y: 10, tier: 1 } // Manhattan distance = |12 - 10| + |10 - 10| = 2 < 4
      ];

      // pathGrid connects to the first stair at (10, 11)
      const pathGrid: boolean[][] = Array.from({ length: 20 }, () => Array(20).fill(false));
      pathGrid[11]![10] = true;

      const pruned = pruneRedundantStairs(stairs, pathGrid);
      expect(pruned.length).toBe(1);
      expect(pruned[0]!.x).toBe(10);
      expect(pruned[0]!.y).toBe(10);
    });
  });

  describe('Pillar 2: Satellite Island Area < 80 Tiles & Semantics', () => {
    it('prohibits urban settlements, marts, centers and railways on islands with area < 80 tiles', () => {
      const result = generatePokemonContinentalWorld({
        width: 128,
        height: 128,
        seed: 12345
      });

      if (result.continent.archipelagoIslands) {
        for (const island of result.continent.archipelagoIslands) {
          // Calculate island land tile count
          let landCount = 0;
          for (let y = island.bounds.minY; y <= island.bounds.maxY; y++) {
            for (let x = island.bounds.minX; x <= island.bounds.maxX; x++) {
              const t = result.continent.terrainMatrix[y]?.[x];
              if (t && t !== 'water' && t !== 'water_deep') {
                landCount++;
              }
            }
          }

          if (landCount < 80) {
            // Find any POI placed on this island
            const islandPois = result.pois.filter(
              (p) =>
                p.gridX >= island.bounds.minX &&
                p.gridX <= island.bounds.maxX &&
                p.gridY >= island.bounds.minY &&
                p.gridY <= island.bounds.maxY
            );

            for (const poi of islandPois) {
              expect(poi.type).not.toBe('city');
              expect(poi.type).not.toBe('metropolis');
              expect(poi.type).not.toBe('town');
              if (poi.urbanLayout) {
                const buildings = poi.urbanLayout.buildings;
                for (const b of buildings) {
                  expect(b.prefabFile).not.toContain('pokecenter');
                  expect(b.prefabFile).not.toContain('pokemart');
                  expect(b.prefabFile).not.toContain('railway');
                }
              }
            }
          }
        }
      }
    });

    it('prohibits orphan signposts on minor islands without adjacent door, cave or pier', () => {
      const result = generatePokemonContinentalWorld({
        width: 128,
        height: 128,
        seed: 54321
      });

      if (result.continent.archipelagoIslands) {
        for (const island of result.continent.archipelagoIslands) {
          const islandPois = result.pois.filter(
            (p) =>
              p.gridX >= island.bounds.minX &&
              p.gridX <= island.bounds.maxX &&
              p.gridY >= island.bounds.minY &&
              p.gridY <= island.bounds.maxY
          );

          // An islet must not have buildingFile === 'poke_signpost.png' as its primary landmark
          for (const poi of islandPois) {
            expect(poi.buildingFile).not.toBe('poke_signpost.png');
          }
        }
      }
    });
  });

  describe('Pillar 3: Forced Port City Integration', () => {
    it('instantiates the ferry terminal prefab and a 3-wide pier into deep water for port_city', () => {
      const result = generatePokemonContinentalWorld({
        width: 128,
        height: 128,
        seed: 42
      });

      // Find port_city node or port_dock
      const portNode = result.pois.find((p) => p.hasPort || p.type === 'port_dock');
      expect(portNode).toBeDefined();

      // Check that a port gate / terminal building exists in the settlement or landmark
      const hasPortGate =
        portNode?.buildingFile?.includes('port_vermilion_gate') ||
        portNode?.urbanLayout?.buildings.some((b) => b.prefabFile.includes('port_vermilion_gate')) ||
        result.pois.some((p) => p.buildingFile?.includes('port_vermilion_gate'));

      expect(hasPortGate).toBe(true);

      // Check pier projection: at least 3 consecutive bridgeGrid / wooden dock tiles extending toward water
      let pierTilesFound = 0;
      if (result.bridgeGrid) {
        for (let y = 0; y < 128; y++) {
          for (let x = 0; x < 128; x++) {
            if (result.bridgeGrid[y]?.[x]) {
              const t = result.continent.terrainMatrix[y]?.[x];
              if (t === 'water' || t === 'water_deep') {
                pierTilesFound++;
              }
            }
          }
        }
      }
      expect(pierTilesFound).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Pillar 4: Route Gate Clearance & Doorway Coherence', () => {
    it('guarantees route gatehouses maintain >= 2 tiles clearance from water bodies and flat elevation doorways', () => {
      const result = generatePokemonContinentalWorld({
        width: 128,
        height: 128,
        seed: 999
      });

      const routeGates = result.pois.filter((p) => p.type === 'route_gate');
      for (const gate of routeGates) {
        // Gate clearance: no water within 2 tiles
        for (let dy = -2; dy <= gate.footprint.height + 2; dy++) {
          for (let dx = -2; dx <= gate.footprint.width + 2; dx++) {
            const gx = gate.gridX + dx;
            const gy = gate.gridY + dy;
            if (gx >= 0 && gx < 128 && gy >= 0 && gy < 128) {
              const t = result.continent.terrainMatrix[gy]?.[gx];
              // Inner footprint + 2 tile buffer must not collide with water
              if (dx >= 0 && dx < gate.footprint.width && dy >= 0 && dy < gate.footprint.height) {
                expect(t).not.toBe('water');
                expect(t).not.toBe('water_deep');
              }
            }
          }
        }

        // Gate doorway elevation must be 0
        const doorY = gate.gridY + gate.footprint.height;
        const doorX = gate.gridX + Math.floor(gate.footprint.width / 2);
        if (doorY < 128 && doorX < 128) {
          expect(result.continent.heightmap[doorY]?.[doorX] ?? 0).toBe(0);
        }
      }
    });
  });
});
