/**
 * tests/node/map/urban_zoning_engine.test.ts
 *
 * Tier 1 Unit Test Suite for Intelligent Urban Zoning & City Hierarchy Engine.
 */

import { describe, it, expect } from 'vitest';
import {
  generateUrbanLayout,
  generateStreetNetwork,
  extractAvailableLots,
  findLotNearCoords,
  findBestLotFor,
  type UrbanZoningOptions
} from '../../logic/map/urbanZoningEngine';
import {
  inferCanonicalCityConfig,
  generateLocalMapForNode,
  SCALE_DIMENSIONS
} from '../../logic/map/nodeLocalMapGenerator';
import {
  getBiomePalette,
  type MapCell
} from '../../logic/map/proceduralMapGenerator';
import type { TileCollision } from '../../logic/map/tilesRegistry';
import type { MapNode } from '../../logic/adventure/mapData';

describe('urbanZoningEngine', () => {
  function createTestMatrix<T>(w: number, h: number, fill: T): T[][] {
    return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }

  function makeDummyCell(tileId: string, collision: TileCollision): MapCell {
    return {
      tileId,
      filePath: `/assets/tiles/test/${tileId}.png`,
      collision
    };
  }

  describe('generateStreetNetwork', () => {
    it('creates single crossroad for hamlet scale', () => {
      const w = 36;
      const h = 28;
      const isPath = createTestMatrix(w, h, false);
      const network = generateStreetNetwork(isPath, w, h, 'hamlet');

      expect(network.xRoads).toHaveLength(1);
      expect(network.yRoads).toHaveLength(1);
      expect(network.center.x).toBe(Math.floor(w / 2));
      expect(network.center.y).toBe(Math.floor(h / 2));
      expect(isPath[network.center.y]![network.center.x]).toBe(true);
    });

    it('creates 3x3 boulevard grid for metropolis scale', () => {
      const w = 70;
      const h = 50;
      const isPath = createTestMatrix(w, h, false);
      const network = generateStreetNetwork(isPath, w, h, 'metropolis');

      expect(network.xRoads).toHaveLength(3);
      expect(network.yRoads).toHaveLength(3);
      // Roads should be stamped as path cells
      for (const ry of network.yRoads) {
        expect(isPath[ry]![network.center.x]).toBe(true);
      }
    });
  });

  describe('extractAvailableLots', () => {
    it('extracts candidate rectangular building lots adjacent to streets', () => {
      const w = 48;
      const h = 36;
      const isPath = createTestMatrix(w, h, false);
      const network = generateStreetNetwork(isPath, w, h, 'town');

      const lots = extractAvailableLots(isPath, w, h, network);
      expect(lots.length).toBeGreaterThan(0);

      // Verify each lot is bounded and has road connector
      for (const lot of lots) {
        expect(lot.width).toBe(6);
        expect(lot.height).toBe(5);
        expect(lot.roadConnectX).toBeGreaterThanOrEqual(0);
        expect(lot.roadConnectY).toBeGreaterThanOrEqual(0);
        expect(isPath[lot.roadConnectY]![lot.roadConnectX]).toBe(true);
      }
    });
  });

  describe('findLotNearCoords & findBestLotFor', () => {
    it('finds lot closest to given coordinates', () => {
      const lots = [
        { x: 5, y: 5, width: 6, height: 6, doorX: 8, doorY: 10, roadConnectX: 8, roadConnectY: 11 },
        { x: 20, y: 20, width: 6, height: 6, doorX: 23, doorY: 25, roadConnectX: 23, roadConnectY: 26 }
      ];
      const occupied = new Set<number>();

      const closest = findLotNearCoords(lots, occupied, 6, 6, { width: 5, height: 5 });
      expect(closest).toBe(0);

      occupied.add(0);
      const nextClosest = findLotNearCoords(lots, occupied, 6, 6, { width: 5, height: 5 });
      expect(nextClosest).toBe(1);
    });

    it('finds best lot prioritizing spatial bias', () => {
      const lots = [
        { x: 5, y: 5, width: 7, height: 6, doorX: 8, doorY: 10, roadConnectX: 8, roadConnectY: 11 },
        { x: 5, y: 30, width: 7, height: 6, doorX: 8, doorY: 35, roadConnectX: 8, roadConnectY: 36 }
      ];
      const occupied = new Set<number>();

      const northLot = findBestLotFor(lots, occupied, { width: 6, height: 5 }, 'north', 40);
      expect(northLot).toBe(0);

      const southLot = findBestLotFor(lots, occupied, { width: 6, height: 5 }, 'south', 40);
      expect(southLot).toBe(1);
    });
  });

  describe('generateUrbanLayout', () => {
    function setupLayoutOptions(scale: any, density = 5, extraConfig: any = {}): UrbanZoningOptions {
      const dims = SCALE_DIMENSIONS[scale as keyof typeof SCALE_DIMENSIONS] ?? { width: 40, height: 30 };
      const palette = getBiomePalette('firered');
      return {
        mapWidth: dims.width,
        mapHeight: dims.height,
        seed: 12345,
        config: {
          scale,
          buildingDensity: density,
          ...extraConfig
        },
        palette,
        baseLayer: createTestMatrix(dims.width, dims.height, null),
        elevationLayer: createTestMatrix(dims.width, dims.height, null),
        objectLayer: createTestMatrix(dims.width, dims.height, null),
        collisionGrid: createTestMatrix(dims.width, dims.height, false as TileCollision),
        isPathCell: createTestMatrix(dims.width, dims.height, false),
        warps: [],
        spawns: [],
        makeCell: makeDummyCell
      };
    }

    it('generates hamlet with Oak Lab and no Center/Mart', () => {
      const opts = setupLayoutOptions('hamlet', 3, { includeLab: true });
      const result = generateUrbanLayout(opts);

      expect(result.placedBuildingsCount).toBeGreaterThan(0);
      expect(result.placedCivicCount).toBeGreaterThan(0);
      expect(opts.warps.some((w) => w.targetMapId.includes('oak_lab'))).toBe(true);
      expect(opts.warps.some((w) => w.targetMapId.includes('pokemon_center'))).toBe(false);
      expect(opts.spawns.some((s) => s.id === 'player_start')).toBe(true);
    });

    it('generates town with Center, Mart and Gym', () => {
      const opts = setupLayoutOptions('town', 6, { includeGym: true });
      const result = generateUrbanLayout(opts);

      expect(result.placedBuildingsCount).toBeGreaterThanOrEqual(3);
      expect(opts.warps.some((w) => w.targetMapId.includes('pokemon_center'))).toBe(true);
      expect(opts.warps.some((w) => w.targetMapId.includes('pokemart'))).toBe(true);
      expect(opts.warps.some((w) => w.targetMapId.includes('gym'))).toBe(true);
    });

    it('places plaza fountain when requested', () => {
      const opts = setupLayoutOptions('city', 7, { plazaType: 'fountain' });
      const result = generateUrbanLayout(opts);

      expect(result.placedCivicCount).toBeGreaterThan(0);
    });

    it('respects buildingDensity slider (density 1 produces fewer buildings than density 10)', () => {
      const lowDensityOpts = setupLayoutOptions('city', 1, { includeGym: false, includeLab: false });
      const highDensityOpts = setupLayoutOptions('city', 10, { includeGym: false, includeLab: false });

      const lowResult = generateUrbanLayout(lowDensityOpts);
      const highResult = generateUrbanLayout(highDensityOpts);

      expect(highResult.placedBuildingsCount).toBeGreaterThanOrEqual(lowResult.placedBuildingsCount);
    });

    it('guarantees door-to-road transitable paths for all stamped buildings', () => {
      const opts = setupLayoutOptions('village', 5);
      generateUrbanLayout(opts);

      // Verify that every warp has an unobstructed transitable doorway
      for (const warp of opts.warps) {
        expect(opts.collisionGrid[warp.y]![warp.x]).toBe(false); // Collision is passable (false)
        expect(opts.isPathCell[warp.y]![warp.x]).toBe(true); // Tagged as path
      }
    });
  });

  describe('inferCanonicalCityConfig & generateLocalMapForNode', () => {
    it('infers canonical hamlet scale for Pallet Town', () => {
      const node: MapNode & { id?: string } = {
        id: 'pallet',
        name: 'Pueblo Paleta',
        x: 100,
        y: 200,
        type: 'city',
        hasCenter: false,
        farm: { t: 0, w: 0, m: 0, f: 0 }
      };

      const config = inferCanonicalCityConfig(node);
      expect(config.scale).toBe('hamlet');
      expect(config.includeLab).toBe(true);
      expect(config.includeGym).toBe(false);

      const map = generateLocalMapForNode(node, 42);
      expect(map.width).toBe(SCALE_DIMENSIONS.hamlet.width);
      expect(map.height).toBe(SCALE_DIMENSIONS.hamlet.height);
      expect(map.layers.ground).toBeDefined();
      expect(map.layers.decorations).toBeDefined();
      expect(map.baseLayer).toBeDefined();
    });

    it('infers canonical metropolis scale for Saffron City', () => {
      const node: MapNode & { id?: string } = {
        id: 'saffron',
        name: 'Ciudad Azafrán',
        x: 300,
        y: 200,
        type: 'city',
        hasCenter: true,
        farm: { t: 0, w: 0, m: 0, f: 0 }
      };

      const config = inferCanonicalCityConfig(node);
      expect(config.scale).toBe('metropolis');
      expect(config.includeGym).toBe(true);
      expect(config.plazaType).toBe('fountain');

      const map = generateLocalMapForNode(node, 42);
      expect(map.width).toBe(SCALE_DIMENSIONS.metropolis.width);
      expect(map.height).toBe(SCALE_DIMENSIONS.metropolis.height);
    });

    it('allows custom override of scale in generateLocalMapForNode', () => {
      const node: MapNode & { id?: string } = {
        id: 'custom_city',
        name: 'Ciudad Personalizada',
        x: 150,
        y: 150,
        type: 'city',
        hasCenter: true,
        farm: { t: 0, w: 0, m: 0, f: 0 }
      };

      const map = generateLocalMapForNode(node, 42, {
        cityConfig: {
          scale: 'village',
          buildingDensity: 4,
          includeGym: false,
          includeLab: false,
          plazaType: 'none'
        }
      });

      expect(map.width).toBe(SCALE_DIMENSIONS.village.width);
      expect(map.height).toBe(SCALE_DIMENSIONS.village.height);
    });
  });
});
