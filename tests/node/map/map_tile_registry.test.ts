/**
 * tests/node/map/map_tile_registry.test.ts
 *
 * Tier 1 Unit Test: Validates the semantic tile registry and O(1) categorization helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isMountain,
  isShore,
  isGrassEdge,
  isBridge,
  isBuilding,
  isVehicle,
  getTile,
  getTilesBySubcategory,
  validateMapTile,
  registerTileMemory,
  clearTileRegistryMemory
} from '../../../scripts/map/tile_registry.ts';

describe('Map Tile Registry & Semantic Helpers', () => {
  beforeEach(() => {
    clearTileRegistryMemory();
    // Register sample fixtures
    registerTileMemory({
      id: 'cliff_top_rock',
      category: 'terrain',
      subcategory: 'mountains',
      path: 'terrain/mountains/cliff_top_rock.png',
      tileSize: 32,
      dimensions: { width: 32, height: 32, cols: 1, rows: 1 },
      collision: 'solid',
      tags: ['mountain', 'cliff', 'rock']
    });

    registerTileMemory({
      id: 'water_coast_n',
      category: 'terrain',
      subcategory: 'water_shores',
      path: 'terrain/water_shores/water_coast_n.png',
      tileSize: 32,
      dimensions: { width: 32, height: 32, cols: 1, rows: 1 },
      collision: 'water',
      tags: ['shore', 'water', 'coast']
    });

    registerTileMemory({
      id: 'grass_patch_edge_nw',
      category: 'terrain',
      subcategory: 'grass_edges',
      path: 'terrain/grass_edges/grass_patch_edge_nw.png',
      tileSize: 32,
      dimensions: { width: 32, height: 32, cols: 1, rows: 1 },
      collision: 'passable',
      tags: ['grass', 'edge']
    });

    registerTileMemory({
      id: 'wood_bridge_h',
      category: 'structures',
      subcategory: 'bridges',
      path: 'structures/bridges/wood_bridge_h.png',
      tileSize: 32,
      dimensions: { width: 64, height: 32, cols: 2, rows: 1 },
      collision: 'passable',
      tags: ['bridge', 'wood']
    });

    registerTileMemory({
      id: 'pokecenter_prefab',
      category: 'structures',
      subcategory: 'buildings',
      path: 'structures/buildings/pokecenter_prefab.png',
      tileSize: 32,
      dimensions: { width: 80, height: 72, cols: 2.5, rows: 2.25 },
      collision: 'solid',
      tags: ['building', 'pokecenter', 'pc']
    });

    registerTileMemory({
      id: 'delivery_truck',
      category: 'props',
      subcategory: 'vehicles',
      path: 'props/vehicles/delivery_truck.png',
      tileSize: 32,
      dimensions: { width: 48, height: 32, cols: 1.5, rows: 1 },
      collision: 'solid',
      tags: ['vehicle', 'truck']
    });
  });

  it('correctly identifies mountain tiles with O(1) lookup', () => {
    expect(isMountain('cliff_top_rock')).toBe(true);
    expect(isMountain('water_coast_n')).toBe(false);
    expect(isMountain('unknown_tile')).toBe(false);
  });

  it('correctly identifies water shore tiles', () => {
    expect(isShore('water_coast_n')).toBe(true);
    expect(isShore('cliff_top_rock')).toBe(false);
  });

  it('correctly identifies grass edge tiles', () => {
    expect(isGrassEdge('grass_patch_edge_nw')).toBe(true);
    expect(isGrassEdge('cliff_top_rock')).toBe(false);
  });

  it('correctly identifies bridges and structures', () => {
    expect(isBridge('wood_bridge_h')).toBe(true);
    expect(isBuilding('pokecenter_prefab')).toBe(true);
    expect(isBridge('pokecenter_prefab')).toBe(false);
  });

  it('correctly identifies vehicles', () => {
    expect(isVehicle('delivery_truck')).toBe(true);
    expect(isVehicle('wood_bridge_h')).toBe(false);
  });

  it('retrieves tile metadata and subcategory lists', () => {
    const tile = getTile('cliff_top_rock');
    expect(tile).toBeDefined();
    expect(tile!.category).toBe('terrain');
    expect(tile!.collision).toBe('solid');

    const bridges = getTilesBySubcategory('bridges');
    expect(bridges.length).toBe(1);
    expect(bridges[0]!.id).toBe('wood_bridge_h');
  });

  it('validates map tiles and reports missing IDs', () => {
    expect(validateMapTile('cliff_top_rock').valid).toBe(true);
    const invalidResult = validateMapTile('non_existent_tile');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toContain('non_existent_tile');
  });
});
