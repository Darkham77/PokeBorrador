/**
 * tests/node/map/biomeTransitionIntegrity.test.ts
 *
 * TIER 1 RED-TO-GREEN UNIT TEST SUITE (ERROR 7)
 * Validates 8-neighbor autotiling and organic GBA transitions for macro biomes:
 *   1. 'mint_highland' autotiles against 'temperate_meadow' using CANONICAL_MINT_GRASS_BRUSH.
 *   2. 'arid_desert' autotiles against 'temperate_meadow' using CANONICAL_ARID_DESERT_BRUSH.
 *   3. 'volcanic_plateau' autotiles against 'temperate_meadow' using CANONICAL_VOLCANIC_DIRT_BRUSH.
 *   4. Zero flat 'center' tiles on biome borders touching plain grass.
 *   5. Coastal beach sand is preserved and does not get corrupted by highland biomes.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveMacroBiomeAutotile,
  CANONICAL_MINT_GRASS_BRUSH,
  CANONICAL_ARID_DESERT_BRUSH,
  CANONICAL_VOLCANIC_DIRT_BRUSH,
  type ResolvedMacroBiomeMapResult
} from '../../../src/logic/map/macroBiomeAutotileEngine.ts';
import type { MacroBiome } from '../../../src/logic/map/macroBiomeSynthesizer.ts';
import type { WaterTerrainKind } from '../../../src/logic/map/waterAutotileEngine.ts';

describe('macroBiomeAutotileEngine (Tier 1 RED-to-GREEN)', () => {
  describe('Mint Highland 8-neighbor Autotiling', () => {
    // 5x5 grid with a 3x3 mint highland island centered at (1..3, 1..3) surrounded by temperate_meadow
    const biomeGrid: MacroBiome[][] = Array.from({ length: 5 }, () =>
      Array(5).fill('temperate_meadow')
    );
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        biomeGrid[y]![x] = 'mint_highland';
      }
    }

    const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: 5 }, () =>
      Array(5).fill('grass')
    );

    it('resolves perimeter outer convex corners with CANONICAL_MINT_GRASS_BRUSH', () => {
      const result: ResolvedMacroBiomeMapResult = resolveMacroBiomeAutotile(biomeGrid, terrainMatrix);

      // (1, 1) is North-West outer corner
      const nw = result.cellDetails[1]?.[1];
      expect(nw).toBeDefined();
      expect(nw?.role).toBe('corner_outer_nw');
      expect(nw?.primaryTile).toBe(CANONICAL_MINT_GRASS_BRUSH.cornerOuterNW);
      expect(nw?.layerStack).toEqual(['poke_grass_plain.png', CANONICAL_MINT_GRASS_BRUSH.cornerOuterNW]);

      // (3, 1) is North-East outer corner
      const ne = result.cellDetails[1]?.[3];
      expect(ne?.role).toBe('corner_outer_ne');
      expect(ne?.primaryTile).toBe(CANONICAL_MINT_GRASS_BRUSH.cornerOuterNE);

      // (1, 3) is South-West outer corner
      const sw = result.cellDetails[3]?.[1];
      expect(sw?.role).toBe('corner_outer_sw');
      expect(sw?.primaryTile).toBe(CANONICAL_MINT_GRASS_BRUSH.cornerOuterSW);

      // (3, 3) is South-East outer corner
      const se = result.cellDetails[3]?.[3];
      expect(se?.role).toBe('corner_outer_se');
      expect(se?.primaryTile).toBe(CANONICAL_MINT_GRASS_BRUSH.cornerOuterSE);
    });

    it('resolves straight cardinal edges between corners', () => {
      const result = resolveMacroBiomeAutotile(biomeGrid, terrainMatrix);

      // (2, 1) is North edge
      expect(result.cellDetails[1]?.[2]?.role).toBe('edge_north');
      expect(result.cellDetails[1]?.[2]?.primaryTile).toBe(CANONICAL_MINT_GRASS_BRUSH.edgeNorth);

      // (1, 2) is West edge
      expect(result.cellDetails[2]?.[1]?.role).toBe('edge_west');
      expect(result.cellDetails[2]?.[1]?.primaryTile).toBe(CANONICAL_MINT_GRASS_BRUSH.edgeWest);

      // (3, 2) is East edge
      expect(result.cellDetails[2]?.[3]?.role).toBe('edge_east');
      expect(result.cellDetails[2]?.[3]?.primaryTile).toBe(CANONICAL_MINT_GRASS_BRUSH.edgeEast);

      // (2, 3) is South edge
      expect(result.cellDetails[3]?.[2]?.role).toBe('edge_south');
      expect(result.cellDetails[3]?.[2]?.primaryTile).toBe(CANONICAL_MINT_GRASS_BRUSH.edgeSouth);
    });

    it('resolves interior cell to pure center fill', () => {
      const result = resolveMacroBiomeAutotile(biomeGrid, terrainMatrix);

      // (2, 2) is interior center
      expect(result.cellDetails[2]?.[2]?.role).toBe('center');
      expect(result.cellDetails[2]?.[2]?.primaryTile).toBe(CANONICAL_MINT_GRASS_BRUSH.center);
    });

    it('resolves concave inner corners on an L-shaped biome cluster', () => {
      // 6x6 L-shaped mint highland:
      // (1..2, 1..4) and (1..4, 3..4)
      const lGrid: MacroBiome[][] = Array.from({ length: 6 }, () =>
        Array(6).fill('temperate_meadow')
      );
      for (let y = 1; y <= 4; y++) {
        for (let x = 1; x <= 2; x++) lGrid[y]![x] = 'mint_highland';
      }
      for (let y = 3; y <= 4; y++) {
        for (let x = 1; x <= 4; x++) lGrid[y]![x] = 'mint_highland';
      }

      const lTerrain: WaterTerrainKind[][] = Array.from({ length: 6 }, () =>
        Array(6).fill('grass')
      );

      const result = resolveMacroBiomeAutotile(lGrid, lTerrain);
      // At (2, 3), north is mint (2, 2), east is mint (3, 3), but NE diagonal (3, 2) is temperate_meadow
      const innerNE = result.cellDetails[3]?.[2];
      expect(innerNE?.role).toBe('corner_inner_ne');
      expect(innerNE?.primaryTile).toBe(CANONICAL_MINT_GRASS_BRUSH.cornerInnerNE);
    });
  });

  describe('Arid Desert 8-neighbor Autotiling', () => {
    const biomeGrid: MacroBiome[][] = Array.from({ length: 5 }, () =>
      Array(5).fill('temperate_meadow')
    );
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        biomeGrid[y]![x] = 'arid_desert';
      }
    }
    const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: 5 }, () =>
      Array(5).fill('grass')
    );

    it('autotiles perimeter directly against temperate_meadow without flat step artifacts', () => {
      const result = resolveMacroBiomeAutotile(biomeGrid, terrainMatrix);

      expect(result.cellDetails[1]?.[2]?.role).toBe('edge_north');
      expect(result.cellDetails[1]?.[2]?.primaryTile).toBe(CANONICAL_ARID_DESERT_BRUSH.edgeNorth);
      expect(result.cellDetails[2]?.[2]?.role).toBe('center');
      expect(result.cellDetails[2]?.[2]?.primaryTile).toBe(CANONICAL_ARID_DESERT_BRUSH.center);
    });
  });

  describe('Coastal Beach Protection & Volcanic Autotiling', () => {
    it('preserves coastal beach cells and does not override them with highland biomes', () => {
      const biomeGrid: MacroBiome[][] = [
        ['mint_highland', 'mint_highland', 'mint_highland'],
        ['mint_highland', 'mint_highland', 'mint_highland'],
        ['temperate_meadow', 'temperate_meadow', 'temperate_meadow']
      ];
      // (1, 0) and (1, 1) are coastal sand
      const terrainMatrix: WaterTerrainKind[][] = [
        ['sand', 'sand', 'water'],
        ['sand', 'sand', 'water'],
        ['grass', 'grass', 'grass']
      ];

      const result = resolveMacroBiomeAutotile(biomeGrid, terrainMatrix);
      // Sand cells must have null macro biome details so resolvedWater takes priority
      expect(result.cellDetails[0]?.[0]).toBeNull();
      expect(result.cellDetails[0]?.[1]).toBeNull();
      expect(result.cellDetails[1]?.[0]).toBeNull();
      expect(result.cellDetails[1]?.[1]).toBeNull();
    });

    it('autotiles volcanic_plateau with CANONICAL_VOLCANIC_DIRT_BRUSH', () => {
      const biomeGrid: MacroBiome[][] = Array.from({ length: 5 }, () =>
        Array(5).fill('temperate_meadow')
      );
      for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
          biomeGrid[y]![x] = 'volcanic_plateau';
        }
      }
      const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: 5 }, () =>
        Array(5).fill('grass')
      );

      const result = resolveMacroBiomeAutotile(biomeGrid, terrainMatrix);
      expect(result.cellDetails[1]?.[2]?.role).toBe('edge_north');
      expect(result.cellDetails[1]?.[2]?.primaryTile).toBe(CANONICAL_VOLCANIC_DIRT_BRUSH.edgeNorth);
      expect(result.cellDetails[2]?.[2]?.role).toBe('center');
      expect(result.cellDetails[2]?.[2]?.primaryTile).toBe(CANONICAL_VOLCANIC_DIRT_BRUSH.center);
    });
  });
});
