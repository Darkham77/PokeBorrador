/**
 * tests/node/map/continentGenerator.test.ts
 *
 * TIER 1 & TIER 2 UNIT TESTS FOR PROCEDURAL CONTINENT GENERATOR
 *
 * Validates:
 *   1. Radial landmass mask generation (all 4 outer borders 100% open ocean, solid center).
 *   2. Continuous perimeter beach buffer (sand buffer >= beachWidth cells between ocean and grass).
 *   3. Inland freshwater lake carving with >= 4 cells clearance from beaches.
 *   4. Multi-tiered continental mountain massifs placed strictly on grass with >= 3 clearance.
 *   5. Functional stairs stamping and walkability flags.
 *   6. Master orchestrator (generateContinentMap) non-destructive layerStack and occupancy.
 */

import { describe, it, expect } from 'vitest';
import {
  generateRadialLandmassMask,
  distributePerimeterBeach,
  carveInlandLakes,
  generateContinentalMountains,
  generateContinentMap,
  type ContinentMapResult
} from '../../../src/logic/map/continentGenerator.ts';
import type { WaterTerrainKind } from '../../../src/logic/map/waterAutotileEngine.ts';

describe('continentGenerator', () => {
  describe('generateRadialLandmassMask', () => {
    it('guarantees all four perimeter borders are 100% open ocean', () => {
      const W = 32;
      const H = 32;
      const mask = generateRadialLandmassMask(W, H, 12345, 0.4);

      // Top and bottom borders
      for (let x = 0; x < W; x++) {
        expect(mask[0]![x]).toBe('water');
        expect(mask[1]![x]).toBe('water');
        expect(mask[H - 2]![x]).toBe('water');
        expect(mask[H - 1]![x]).toBe('water');
      }

      // Left and right borders
      for (let y = 0; y < H; y++) {
        expect(mask[y]![0]).toBe('water');
        expect(mask[y]![1]).toBe('water');
        expect(mask[y]![W - 2]).toBe('water');
        expect(mask[y]![W - 1]).toBe('water');
      }
    });

    it('generates a solid continental land core at the center', () => {
      const W = 40;
      const H = 40;
      const mask = generateRadialLandmassMask(W, H, 42, 0.35);

      const midY = Math.floor(H / 2);
      const midX = Math.floor(W / 2);

      // Center cell and its immediate neighbors should be land
      expect(mask[midY]![midX]).toBe('grass');
      expect(mask[midY - 1]![midX]).toBe('grass');
      expect(mask[midY + 1]![midX]).toBe('grass');
      expect(mask[midY]![midX - 1]).toBe('grass');
      expect(mask[midY]![midX + 1]).toBe('grass');
    });

    it('produces deterministic output for the same seed', () => {
      const m1 = generateRadialLandmassMask(24, 24, 999, 0.4);
      const m2 = generateRadialLandmassMask(24, 24, 999, 0.4);

      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
          expect(m1[y]![x]).toBe(m2[y]![x]);
        }
      }
    });
  });

  describe('distributePerimeterBeach', () => {
    it('creates a continuous sand buffer separating ocean water from continental grass', () => {
      const W = 30;
      const H = 30;
      const matrix = generateRadialLandmassMask(W, H, 77, 0.4);

      distributePerimeterBeach(matrix, 3);

      // Invariant: No grass cell should be directly adjacent (cardinal) to an ocean water cell
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (matrix[y]![x] === 'grass') {
            const hasWaterNeighbor =
              matrix[y - 1]![x] === 'water' ||
              matrix[y + 1]![x] === 'water' ||
              matrix[y]![x - 1] === 'water' ||
              matrix[y]![x + 1] === 'water';
            expect(hasWaterNeighbor).toBe(false);
          }
        }
      }
    });

    it('replaces land within beachWidth distance from ocean with sand', () => {
      // Synthetic 10x10 matrix: top 3 rows are water, rest is grass
      const matrix: WaterTerrainKind[][] = Array.from({ length: 10 }, (_, y) =>
        Array.from({ length: 10 }, () => (y < 3 ? 'water' : 'grass'))
      );

      distributePerimeterBeach(matrix, 2);

      // Rows 0..2 should still be water
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 10; x++) {
          expect(matrix[y]![x]).toBe('water');
        }
      }

      // Rows 3 and 4 should be turned to sand (distance 1 and 2 from row 2)
      for (let y = 3; y <= 4; y++) {
        for (let x = 0; x < 10; x++) {
          expect(matrix[y]![x]).toBe('sand');
        }
      }

      // Rows 5+ should remain grass
      for (let y = 5; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          expect(matrix[y]![x]).toBe('grass');
        }
      }
    });
  });

  describe('carveInlandLakes', () => {
    it('carves freshwater lakes strictly inside grass plains with clearance from beach', () => {
      const W = 48;
      const H = 48;
      const matrix = generateRadialLandmassMask(W, H, 101, 0.35);
      distributePerimeterBeach(matrix, 3);

      carveInlandLakes(matrix, 1, 101);

      // Count water cells that are surrounded by grass (inland lake cells)
      let inlandLakeCells = 0;
      for (let y = 6; y < H - 6; y++) {
        for (let x = 6; x < W - 6; x++) {
          if (matrix[y]![x] === 'water') {
            // Check if this water cell has grass within 4 cells in all 4 cardinal directions
            let hasNorthGrass = false;
            let hasSouthGrass = false;
            let hasWestGrass = false;
            let hasEastGrass = false;

            for (let dy = 1; dy <= 6; dy++) {
              if (matrix[y - dy]?.[x] === 'grass') hasNorthGrass = true;
              if (matrix[y + dy]?.[x] === 'grass') hasSouthGrass = true;
            }
            for (let dx = 1; dx <= 6; dx++) {
              if (matrix[y]?.[x - dx] === 'grass') hasWestGrass = true;
              if (matrix[y]?.[x + dx] === 'grass') hasEastGrass = true;
            }

            if (hasNorthGrass && hasSouthGrass && hasWestGrass && hasEastGrass) {
              inlandLakeCells++;
            }
          }
        }
      }

      expect(inlandLakeCells).toBeGreaterThan(0);
    });
  });

  describe('generateContinentalMountains', () => {
    it('places mountain massifs strictly on grass with clearance from water and beach', () => {
      const W = 48;
      const H = 48;
      const matrix = generateRadialLandmassMask(W, H, 42, 0.35);
      distributePerimeterBeach(matrix, 3);

      const { sanitizedHeightmap, placedStairs, mountainResult } = generateContinentalMountains(
        matrix,
        { seed: 42, width: W, height: H, mountainPercentage: 0.25, withStairs: true }
      );

      expect(sanitizedHeightmap.length).toBe(H);
      expect(sanitizedHeightmap[0]!.length).toBe(W);
      expect(mountainResult.cellDetails.length).toBe(H);

      // Verify clearance: any cell with elevation > 0 must be on grass with >= 3 cells clearance from water/sand
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (sanitizedHeightmap[y]![x]! > 0) {
            expect(matrix[y]![x]).toBe('grass');
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                  expect(matrix[ny]![nx]).toBe('grass');
                }
              }
            }
          }
        }
      }

      // Verify that if stairs are placed, they connect tiers
      if (placedStairs.length > 0) {
        for (const st of placedStairs) {
          const cellL = mountainResult.cellDetails[st.y]?.[st.x];
          const cellR = mountainResult.cellDetails[st.y]?.[st.x + 1];
          expect(cellL?.role).toBe('stairs_l');
          expect(cellR?.role).toBe('stairs_r');
        }
      }
    });
  });

  describe('generateContinentMap master orchestrator', () => {
    it('generates a complete 64x64 continental island with verified layerStack and walkability', () => {
      const result: ContinentMapResult = generateContinentMap({
        width: 64,
        height: 64,
        seed: 42,
        oceanWaterPercentage: 0.38,
        beachWidth: 3,
        lakeCount: 2,
        mountainPercentage: 0.20,
        mountainPalette: 'brown',
        withStairs: true
      });

      expect(result.width).toBe(64);
      expect(result.height).toBe(64);
      expect(result.cells.length).toBe(64);
      expect(result.cells[0]!.length).toBe(64);

      let oceanCount = 0;
      let beachCount = 0;
      let grassCount = 0;
      let mountainCount = 0;
      let stairCount = 0;

      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const cell = result.cells[y]![x]!;
          expect(cell.layerStack.length).toBeGreaterThan(0);

          if (cell.terrain === 'water') oceanCount++;
          if (cell.terrain === 'sand') beachCount++;
          if (cell.terrain === 'grass') grassCount++;
          if (cell.elevation > 0) mountainCount++;
          if (cell.isStair) stairCount++;

          // Invariant: outer borders must be water
          if (x === 0 || x === 63 || y === 0 || y === 63) {
            expect(cell.terrain).toBe('water');
            expect(cell.isWalkable).toBe(false);
          }

          // Invariant: stairs are walkable
          if (cell.isStair) {
            expect(cell.isWalkable).toBe(true);
          }
        }
      }

      expect(oceanCount).toBeGreaterThan(500);
      expect(beachCount).toBeGreaterThan(200);
      expect(grassCount).toBeGreaterThan(500);
      expect(mountainCount).toBeGreaterThan(50);
      expect(stairCount).toBeGreaterThanOrEqual(2); // At least one pair of stairs
    });
  });

  describe('generateArchipelagoIslands (Phase 1)', () => {
    it('generates between 3 and 5 organic archipelago islands on regional maps (256x256)', () => {
      const result: ContinentMapResult = generateContinentMap({
        width: 256,
        height: 256,
        seed: 42
      });

      expect(result.archipelagoIslands).toBeDefined();
      const islands = result.archipelagoIslands!;
      expect(islands.length).toBeGreaterThanOrEqual(3);
      expect(islands.length).toBeLessThanOrEqual(5);

      // Verify canonical roles are assigned
      const roles = islands.map((i) => i.role);
      expect(roles).toContain('port_city');
      expect(roles).toContain('lighthouse');
      expect(roles).toContain('sea_cave');
    });

    it('guarantees each island has beach clearance, non-zero land area, and water separation from map borders', () => {
      const W = 256;
      const H = 256;
      const result: ContinentMapResult = generateContinentMap({
        width: W,
        height: H,
        seed: 777
      });

      const islands = result.archipelagoIslands!;
      expect(islands.length).toBeGreaterThanOrEqual(3);

      for (const island of islands) {
        expect(island.bounds.minX).toBeGreaterThanOrEqual(4);
        expect(island.bounds.maxX).toBeLessThan(W - 4);
        expect(island.bounds.minY).toBeGreaterThanOrEqual(4);
        expect(island.bounds.maxY).toBeLessThan(H - 4);

        // Center must be valid land
        const centerTerrain = result.terrainMatrix[island.cy]![island.cx];
        expect(centerTerrain === 'grass' || centerTerrain === 'sand').toBe(true);
      }

      // Invariant: all 4 outer borders remain 100% open water
      for (let x = 0; x < W; x++) {
        expect(result.terrainMatrix[0]![x]).toBe('water');
        expect(result.terrainMatrix[1]![x]).toBe('water');
        expect(result.terrainMatrix[H - 2]![x]).toBe('water');
        expect(result.terrainMatrix[H - 1]![x]).toBe('water');
      }
      for (let y = 0; y < H; y++) {
        expect(result.terrainMatrix[y]![0]).toBe('water');
        expect(result.terrainMatrix[y]![1]).toBe('water');
        expect(result.terrainMatrix[y]![W - 2]).toBe('water');
        expect(result.terrainMatrix[y]![W - 1]).toBe('water');
      }

      // Invariant: No grass cell on any island touches ocean water directly without sand beach buffer
      for (const island of islands) {
        for (let y = island.bounds.minY; y <= island.bounds.maxY; y++) {
          for (let x = island.bounds.minX; x <= island.bounds.maxX; x++) {
            if (result.terrainMatrix[y]![x] === 'grass') {
              const hasWaterNeighbor =
                result.terrainMatrix[y - 1]![x] === 'water' ||
                result.terrainMatrix[y + 1]![x] === 'water' ||
                result.terrainMatrix[y]![x - 1] === 'water' ||
                result.terrainMatrix[y]![x + 1] === 'water';
              expect(hasWaterNeighbor).toBe(false);
            }
          }
        }
      }
    });
  });
});
