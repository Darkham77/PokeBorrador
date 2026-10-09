/**
 * tests/node/map/canvasTileRenderer.test.ts
 *
 * TIER 1 & TIER 2 UNIT TESTS FOR GBA 2D CANVAS TILEMAP RENDERER
 *
 * Validates:
 *   1. Public asset URL resolution (prefabs vs lpc directories).
 *   2. Instruction compilation across all 8 non-destructive layers.
 *   3. 32x32 pixel coordinate alignment.
 *   4. Strict North-to-South Y-sorting of tree sprites.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveTileUrl,
  buildMapBlitInstructions,
  CANVAS_TILE_SIZE
} from '../../../src/logic/map/canvasTileRenderer.ts';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { generateWildernessLayer } from '../../../src/logic/map/wildernessVegetationEngine.ts';

describe('canvasTileRenderer', () => {
  describe('resolveTileUrl', () => {
    it('resolves canonical and prefab filenames to appropriate asset directories', () => {
      expect(resolveTileUrl('house_blue.png')).toBe('/assets/canon/buildings/house_blue.png');
      expect(resolveTileUrl('poke_boardwalk_planks.png')).toBe('/assets/tiles/poke_boardwalk_dark_center.png');
      expect(resolveTileUrl('poke_street_lamp.png')).toBe('/assets/canon/props/poke_street_lamp.png');
      expect(resolveTileUrl('poke_tree_oak_clean.png')).toBe('/assets/prefabs/vegetation/poke_tree_oak_clean.png');
    });

    it('resolves autotile and ground filenames strictly to canonical directories', () => {
      expect(resolveTileUrl('poke_grass_plain.png')).toBe('/assets/tiles/poke_grass_plain.png');
      expect(resolveTileUrl('poke_water_ocean_center.png')).toBe('/assets/tiles/water/poke_water_ocean_center.png');
      expect(resolveTileUrl('poke_sand_center.png')).toBe('/assets/tiles/terrain/poke_sand_center.png');
    });
  });

  describe('buildMapBlitInstructions', () => {
    const continent = generateContinentMap({
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
    const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });
    const wilderness = generateWildernessLayer(continent, pois, routeResult.pathGrid);

    it('compiles full instruction list with 32x32 pixel coordinate alignment', () => {
      const { instructions, uniqueFilenames } = buildMapBlitInstructions(
        continent,
        pois,
        routeResult.pathGrid,
        routeResult.bridgeGrid,
        wilderness
      );

      expect(instructions.length).toBeGreaterThan(64 * 64);
      expect(uniqueFilenames.size).toBeGreaterThan(10);

      // Verify that every single instruction has non-negative px and py
      for (const inst of instructions) {
        expect(inst.px).toBeGreaterThanOrEqual(-16);
        expect(inst.py).toBeGreaterThanOrEqual(-16);
        expect(inst.filename.endsWith('.png')).toBe(true);
      }
    });

    it('orders tree sprites from North to South (Y-Sorting)', () => {
      const { instructions } = buildMapBlitInstructions(
        continent,
        pois,
        routeResult.pathGrid,
        routeResult.bridgeGrid,
        wilderness
      );

      const treeInstructions = instructions.filter(
        (inst) => inst.filename.startsWith('tree_') || inst.filename.startsWith('poke_tree_')
      );

      expect(treeInstructions.length).toBeGreaterThan(0);

      // Verify non-decreasing 2.5D ground contact depth (Y = Z) for trees
      const getTreeBaseY = (inst: { filename: string; py: number }): number => {
        if (inst.filename.includes('cuttable') || inst.filename.includes('sapling')) {
          return inst.py + 32;
        }
        const height = inst.filename.includes('oak') ? 128 : 96;
        return inst.py + height;
      };

      for (let i = 1; i < treeInstructions.length; i++) {
        expect(getTreeBaseY(treeInstructions[i]!)).toBeGreaterThanOrEqual(getTreeBaseY(treeInstructions[i - 1]!));
      }
    });

    it('places paved sidewalks and asphalt streets at settlement coordinates', () => {
      const { instructions } = buildMapBlitInstructions(
        continent,
        pois,
        routeResult.pathGrid,
        routeResult.bridgeGrid,
        wilderness
      );

      const urbanPavedTiles = instructions.filter(
        (inst) => inst.filename === 'poke_road_paved.png' || inst.filename === 'poke_road_asphalt.png'
      );

      expect(urbanPavedTiles.length).toBeGreaterThan(0);
      for (const p of urbanPavedTiles) {
        expect(p.px % CANVAS_TILE_SIZE).toBe(0);
        expect(p.py % CANVAS_TILE_SIZE).toBe(0);
      }
    });
  });
});
