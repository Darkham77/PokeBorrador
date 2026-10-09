/**
 * tests/node/map/waterAutotileEngine.test.ts
 *
 * TIER 1 & TIER 2 UNIT TESTS FOR WATER, COAST & BEACH AUTOTILING ENGINE
 *
 * Validates:
 *   1. 2D 8-neighbor bitmasking and role classification (Edges, Convex Outer, Concave Inner).
 *   2. Canonical brush sets (Lake Shore, Ocean Shore Foam, Sand Beach).
 *   3. Non-destructive layer stacking (Grass -> Sand -> Water -> Foam overlays).
 *   4. Full grid resolution for lakes, rivers, beaches, and open sea.
 *   5. Minimum buffer enforcement (water bodies & sand beaches >= 2 cells wide).
 */

import { describe, it, expect } from 'vitest';
import {
  BITMASK_2D_DIRECTIONS,
  compute2DNeighborMask,
  classify2DAutotileRole,
  resolveWaterCoastGrid,
  sanitizeWaterTerrainMatrix,
  CANONICAL_LAKE_SHORE_BRUSH,
  CANONICAL_OCEAN_SHORE_BRUSH,
  CANONICAL_SAND_OCEAN_SHORE_BRUSH,
  CANONICAL_SAND_BEACH_BRUSH,
  type WaterTerrainMatrix
} from '../../../src/logic/map/waterAutotileEngine.ts';

describe('waterAutotileEngine', () => {
  describe('compute2DNeighborMask', () => {
    it('computes 8-bit mask of matching neighbors correctly', () => {
      // 3x3 matrix where center is (1, 1) and top-left is (0, 0)
      const matrix = [
        ['land', 'water', 'water'],
        ['water', 'water', 'water'],
        ['water', 'water', 'land']
      ];

      // Test mask for 'land' around (1, 1)
      const mask = compute2DNeighborMask(
        matrix,
        1,
        1,
        (cell) => cell === 'land'
      );

      // (0, 0) is NW (bit 1), (2, 2) is SE (bit 128)
      expect(mask & BITMASK_2D_DIRECTIONS.NW).not.toBe(0);
      expect(mask & BITMASK_2D_DIRECTIONS.SE).not.toBe(0);
      expect(mask & BITMASK_2D_DIRECTIONS.N).toBe(0);
      expect(mask & BITMASK_2D_DIRECTIONS.S).toBe(0);
      expect(mask).toBe(BITMASK_2D_DIRECTIONS.NW | BITMASK_2D_DIRECTIONS.SE);
    });

    it('treats out-of-bounds cells according to default boundary predicate', () => {
      const matrix = [
        ['water', 'water'],
        ['water', 'water']
      ];

      // At (0, 0), N, W, NW, NE, SW are out of bounds
      const mask = compute2DNeighborMask(
        matrix,
        0,
        0,
        (cell) => cell === 'land',
        true // outOfBoundsMatches = true
      );

      expect(mask & BITMASK_2D_DIRECTIONS.N).not.toBe(0);
      expect(mask & BITMASK_2D_DIRECTIONS.W).not.toBe(0);
      expect(mask & BITMASK_2D_DIRECTIONS.NW).not.toBe(0);
    });
  });

  describe('classify2DAutotileRole', () => {
    it('classifies center when there are no foreign land neighbors', () => {
      const { role, innerOverlays } = classify2DAutotileRole(0);
      expect(role).toBe('center');
      expect(innerOverlays).toHaveLength(0);
    });

    it('classifies straight cardinal edges correctly', () => {
      // North neighbor is land
      expect(classify2DAutotileRole(BITMASK_2D_DIRECTIONS.N).role).toBe('edge_north');
      // South neighbor is land
      expect(classify2DAutotileRole(BITMASK_2D_DIRECTIONS.S).role).toBe('edge_south');
      // West neighbor is land
      expect(classify2DAutotileRole(BITMASK_2D_DIRECTIONS.W).role).toBe('edge_west');
      // East neighbor is land
      expect(classify2DAutotileRole(BITMASK_2D_DIRECTIONS.E).role).toBe('edge_east');
    });

    it('classifies outer convex corners correctly', () => {
      // North + West is land
      expect(classify2DAutotileRole(BITMASK_2D_DIRECTIONS.N | BITMASK_2D_DIRECTIONS.W).role).toBe('corner_outer_nw');
      // North + East is land
      expect(classify2DAutotileRole(BITMASK_2D_DIRECTIONS.N | BITMASK_2D_DIRECTIONS.E).role).toBe('corner_outer_ne');
      // South + West is land
      expect(classify2DAutotileRole(BITMASK_2D_DIRECTIONS.S | BITMASK_2D_DIRECTIONS.W).role).toBe('corner_outer_sw');
      // South + East is land
      expect(classify2DAutotileRole(BITMASK_2D_DIRECTIONS.S | BITMASK_2D_DIRECTIONS.E).role).toBe('corner_outer_se');
    });

    it('classifies inner concave corners when cardinal edges are clean', () => {
      // Only NW diagonal is land
      const nwRes = classify2DAutotileRole(BITMASK_2D_DIRECTIONS.NW);
      expect(nwRes.role).toBe('corner_inner_nw');
      expect(nwRes.innerOverlays).toHaveLength(0);

      // Only NE diagonal is land
      const neRes = classify2DAutotileRole(BITMASK_2D_DIRECTIONS.NE);
      expect(neRes.role).toBe('corner_inner_ne');

      // Only SW diagonal is land
      const swRes = classify2DAutotileRole(BITMASK_2D_DIRECTIONS.SW);
      expect(swRes.role).toBe('corner_inner_sw');

      // Only SE diagonal is land
      const seRes = classify2DAutotileRole(BITMASK_2D_DIRECTIONS.SE);
      expect(seRes.role).toBe('corner_inner_se');
    });

    it('resolves multiple inner concave corners with overlays', () => {
      // Both NW and NE diagonals are land, cardinals are clean
      const res = classify2DAutotileRole(BITMASK_2D_DIRECTIONS.NW | BITMASK_2D_DIRECTIONS.NE);
      expect(res.role).toBe('corner_inner_nw');
      expect(res.innerOverlays).toEqual(['corner_inner_ne']);
    });
  });

  describe('Canonical Brush Sets', () => {
    it('defines complete 13-tile sets for all 3 canonical brushes', () => {
      const brushes = [
        CANONICAL_LAKE_SHORE_BRUSH,
        CANONICAL_OCEAN_SHORE_BRUSH,
        CANONICAL_SAND_BEACH_BRUSH
      ];

      for (const b of brushes) {
        expect(b.center).toBeTruthy();
        expect(b.edgeNorth).toBeTruthy();
        expect(b.edgeSouth).toBeTruthy();
        expect(b.edgeWest).toBeTruthy();
        expect(b.edgeEast).toBeTruthy();
        expect(b.cornerOuterNW).toBeTruthy();
        expect(b.cornerOuterNE).toBeTruthy();
        expect(b.cornerOuterSW).toBeTruthy();
        expect(b.cornerOuterSE).toBeTruthy();
        expect(b.cornerInnerNW).toBeTruthy();
        expect(b.cornerInnerNE).toBeTruthy();
        expect(b.cornerInnerSW).toBeTruthy();
        expect(b.cornerInnerSE).toBeTruthy();
      }
    });
  });

  describe('resolveWaterCoastGrid', () => {
    it('resolves a 4x4 inland lake surrounded by grass', () => {
      // 4x4 water in the center of a 6x6 grass map
      const matrix: WaterTerrainMatrix = Array.from({ length: 6 }, (_, y) =>
        Array.from({ length: 6 }, (_, x) => {
          if (x >= 1 && x <= 4 && y >= 1 && y <= 4) return 'water';
          return 'grass';
        })
      );

      const result = resolveWaterCoastGrid(matrix);
      expect(result.width).toBe(6);
      expect(result.height).toBe(6);

      // Lake corners
      expect(result.cellDetails[1]?.[1]?.role).toBe('corner_outer_nw');
      expect(result.cellDetails[1]?.[4]?.role).toBe('corner_outer_ne');
      expect(result.cellDetails[4]?.[1]?.role).toBe('corner_outer_sw');
      expect(result.cellDetails[4]?.[4]?.role).toBe('corner_outer_se');

      // Lake edges
      expect(result.cellDetails[1]?.[2]?.role).toBe('edge_north');
      expect(result.cellDetails[4]?.[2]?.role).toBe('edge_south');
      expect(result.cellDetails[2]?.[1]?.role).toBe('edge_west');
      expect(result.cellDetails[2]?.[4]?.role).toBe('edge_east');

      // Lake interior center
      expect(result.cellDetails[2]?.[2]?.role).toBe('center');
      expect(result.cellDetails[2]?.[2]?.primaryTile).toBe(CANONICAL_LAKE_SHORE_BRUSH.center);
    });

    it('resolves a beach with grass, sand buffer, and ocean water', () => {
      // Rows 0..1: grass, Rows 2..3: sand, Rows 4..5: ocean water
      const matrix: WaterTerrainMatrix = [
        ['grass', 'grass', 'grass', 'grass'],
        ['grass', 'grass', 'grass', 'grass'],
        ['sand',  'sand',  'sand',  'sand'],
        ['sand',  'sand',  'sand',  'sand'],
        ['water', 'water', 'water', 'water'],
        ['water', 'water', 'water', 'water']
      ];

      const result = resolveWaterCoastGrid(matrix);

      // Sand row 2 has grass to the North -> sand edge_north (Grass-to-Sand)
      expect(result.cellDetails[2]?.[1]?.role).toBe('edge_north');
      expect(result.cellDetails[2]?.[1]?.primaryTile).toBe(CANONICAL_SAND_BEACH_BRUSH.edgeNorth);

      // Sand row 3 has water to South -> sand edge_south with foam (Sand-to-Water)
      expect(result.cellDetails[3]?.[1]?.role).toBe('edge_south');
      expect(result.cellDetails[3]?.[1]?.primaryTile).toBe(CANONICAL_SAND_OCEAN_SHORE_BRUSH.edgeSouth);

      // Water row 4 is ocean water -> center waves
      expect(result.cellDetails[4]?.[1]?.role).toBe('center');
      expect(result.cellDetails[4]?.[1]?.primaryTile).toBe('poke_water_ocean_center.png');

      // Water row 5 is pure ocean water -> center waves
      expect(result.cellDetails[5]?.[1]?.role).toBe('center');
      expect(result.cellDetails[5]?.[1]?.primaryTile).toBe('poke_water_ocean_center.png');
    });

    it('resolves river water cells connected to the ocean with canonical lake/river shore tiles against grass', () => {
      // Rows 0..2: grass with a vertical 2-cell river at cols 2..3
      // Row 3: sand beach with the 2-cell river passing through cols 2..3
      // Rows 4..5: open ocean water
      const matrix: WaterTerrainMatrix = [
        ['grass', 'grass', 'water', 'water', 'grass', 'grass'],
        ['grass', 'grass', 'water', 'water', 'grass', 'grass'],
        ['grass', 'grass', 'water', 'water', 'grass', 'grass'],
        ['sand',  'sand',  'water', 'water', 'sand',  'sand'],
        ['water', 'water', 'water', 'water', 'water', 'water'],
        ['water', 'water', 'water', 'water', 'water', 'water']
      ];

      const result = resolveWaterCoastGrid(matrix);

      // River row 1:
      // (1, 2) is left riverbank, grass to the West -> edge_west with poke_water_shore_l
      expect(result.cellDetails[1]?.[2]?.role).toBe('edge_west');
      expect(result.cellDetails[1]?.[2]?.primaryTile).toBe(CANONICAL_LAKE_SHORE_BRUSH.edgeWest);

      // (1, 3) is right riverbank, grass to the East -> edge_east with poke_water_shore_r
      expect(result.cellDetails[1]?.[3]?.role).toBe('edge_east');
      expect(result.cellDetails[1]?.[3]?.primaryTile).toBe(CANONICAL_LAKE_SHORE_BRUSH.edgeEast);

      // Ocean water at (5, 0) must remain open ocean waves
      expect(result.cellDetails[5]?.[0]?.role).toBe('center');
      expect(result.cellDetails[5]?.[0]?.primaryTile).toBe('poke_water_ocean_center.png');
    });
  });

  describe('sanitizeWaterTerrainMatrix', () => {
    it('thickens or eliminates 1-cell water slivers to guarantee minimum buffer of 2 cells', () => {
      // 1-cell wide water channel between grass
      const matrix: WaterTerrainMatrix = [
        ['grass', 'grass', 'grass'],
        ['water', 'water', 'water'],
        ['grass', 'grass', 'grass']
      ];

      const sanitized = sanitizeWaterTerrainMatrix(matrix, { minThickness: 2 });

      // The 1-cell water strip must not remain as a 1-cell sliver
      let remainingWaterCount = 0;
      for (let y = 0; y < sanitized.length; y++) {
        for (let x = 0; x < sanitized[0]!.length; x++) {
          if (sanitized[y]![x] === 'water') remainingWaterCount++;
        }
      }
      expect(remainingWaterCount).toBe(0);
    });
  });
});
