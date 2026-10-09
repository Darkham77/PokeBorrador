/**
 * tests/node/map/tiles_registry_v2.test.ts
 *
 * Tier 1 Unit Test: Validates the SSoT v2.0 Tiles Registry and runtime query API.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  TilesRegistryService,
  defaultTilesRegistry,
  getTilesByCategory,
  getTilesByTag,
  getRandomTile,
  getTileById,
  loadTilesRegistry,
  type TilesRegistryJson
} from '../../../src/logic/map/tilesRegistry.ts';

describe('Canonical Tiles Registry API (SSoT v2.0)', () => {
  let registryData: TilesRegistryJson;

  beforeAll(() => {
    const registryPath = path.resolve('public/assets/tiles_registry.json');
    expect(fs.existsSync(registryPath), 'public/assets/tiles_registry.json must exist').toBe(true);
    const raw = fs.readFileSync(registryPath, 'utf-8');
    registryData = JSON.parse(raw) as TilesRegistryJson;

    // Load into both global and custom instance
    loadTilesRegistry(registryData);
  });

  it('validates schema compliance of public/assets/tiles_registry.json', () => {
    expect(registryData.version).toBe('2.0');
    expect(Array.isArray(registryData.tiles)).toBe(true);
    expect(registryData.tiles.length).toBeGreaterThan(0);
    expect(defaultTilesRegistry.count).toBe(registryData.tiles.length);
  });

  it('ensures every tile has valid deterministic metadata and paths', () => {
    const validSources = new Set(['firered', 'emerald', 'ruby_sapphire', 'structures']);

    // Build directory cache once O(1) to avoid 116k disk stat calls
    const tilesDir = path.resolve('public', 'assets', 'tiles');
    const existingRelativePaths = new Set<string>();
    for (const category of fs.readdirSync(tilesDir)) {
      const catDir = path.join(tilesDir, category);
      if (fs.statSync(catDir).isDirectory()) {
        for (const file of fs.readdirSync(catDir)) {
          existingRelativePaths.add(`/assets/tiles/${category}/${file}`);
        }
      }
    }

    for (const tile of registryData.tiles) {
      expect(tile.id).toBeTruthy();
      expect(validSources.has(tile.source)).toBe(true);
      expect(tile.dimensions.width).toBe(16);
      expect(tile.dimensions.height).toBe(16);
      expect(tile.file_path.startsWith('/assets/tiles/')).toBe(true);
      expect(tile.tags.length).toBeGreaterThan(0);

      // Verify file exists on disk via cached set
      expect(existingRelativePaths.has(tile.file_path), `Tile file must exist on disk: ${tile.file_path}`).toBe(true);
    }
  });

  it('retrieves tiles by category with O(1) performance', () => {
    const elevations = getTilesByCategory('elevation');
    expect(elevations.length).toBeGreaterThan(0);
    expect(elevations.every(t => t.category === 'elevation')).toBe(true);
    expect(elevations.every(t => t.collision === true)).toBe(true);

    const terrain = getTilesByCategory('terrain');
    expect(terrain.length).toBeGreaterThan(0);
    expect(terrain.every(t => t.category === 'terrain')).toBe(true);
    expect(terrain.every(t => t.collision === false)).toBe(true);

    const water = getTilesByCategory('water');
    expect(water.length).toBeGreaterThan(0);
    expect(water.every(t => t.category === 'water')).toBe(true);
    expect(water.every(t => t.collision === 'water')).toBe(true);

    const vegetation = getTilesByCategory('vegetation');
    expect(vegetation.length).toBeGreaterThan(0);
    expect(vegetation.every(t => t.category === 'vegetation')).toBe(true);

    const structures = getTilesByCategory('structures');
    expect(structures.length).toBeGreaterThan(0);
    expect(structures.every(t => t.category === 'structures')).toBe(true);

    const props = getTilesByCategory('objects_props');
    expect(props.length).toBeGreaterThan(0);
    expect(props.every(t => t.category === 'objects_props')).toBe(true);
  });

  it('retrieves tiles by tag and applies filter options accurately', () => {
    const mountainTiles = getTilesByTag('mountain');
    expect(mountainTiles.length).toBeGreaterThan(0);
    expect(mountainTiles.every(t => t.tags.includes('mountain'))).toBe(true);

    // Tag + Category Filter
    const cliffElevation = getTilesByTag('cliff', { category: 'elevation' });
    expect(cliffElevation.length).toBeGreaterThan(0);
    expect(cliffElevation.every(t => t.category === 'elevation')).toBe(true);

    // Filter by Collision
    const solidOnly = getTilesByTag('firered', { collision: true });
    expect(solidOnly.length).toBeGreaterThan(0);
    expect(solidOnly.every(t => t.collision === true)).toBe(true);
  });

  it('looks up tiles by deterministic ID in O(1)', () => {
    const firstTile = registryData.tiles[0];
    expect(firstTile).toBeDefined();
    const sampleId = firstTile!.id;
    const tile = getTileById(sampleId);
    expect(tile).toBeDefined();
    expect(tile?.id).toBe(sampleId);

    const notFound = getTileById('non_existent_tile_id');
    expect(notFound).toBeUndefined();
  });

  it('selects random tiles matching given constraints', () => {
    const randomElevation = getRandomTile({ category: 'elevation' });
    expect(randomElevation).not.toBeNull();
    expect(randomElevation?.category).toBe('elevation');

    const randomWater = getRandomTile({ category: 'water', collision: 'water' });
    expect(randomWater).not.toBeNull();
    expect(randomWater?.category).toBe('water');
    expect(randomWater?.collision).toBe('water');

    const impossible = getRandomTile({ category: 'water', collision: true });
    expect(impossible).toBeNull();
  });

  it('supports isolated custom service instances', () => {
    const customService = new TilesRegistryService(registryData);
    expect(customService.count).toBe(registryData.tiles.length);
    expect(customService.registryVersion).toBe('2.0');
    expect(customService.getAllTiles().length).toBe(registryData.tiles.length);
  });

  it('correctly associates and filters structure category tiles by game source tags', () => {
    const structuresPath = path.resolve('public/assets/tiles/structures/registry.json');
    if (fs.existsSync(structuresPath)) {
      const raw = fs.readFileSync(structuresPath, 'utf-8');
      const structData = JSON.parse(raw) as TilesRegistryJson;
      const service = new TilesRegistryService(structData);

      const all = service.getAllTiles();
      expect(all.length).toBeGreaterThan(0);

      // Filtering with the catalog logic
      const fireredStructures = all.filter(t =>
        t.source === 'firered' ||
        t.tags.includes('firered') ||
        t.tags.some(tag => tag.startsWith('firered'))
      );
      expect(fireredStructures.length).toBeGreaterThan(0);

      const emeraldStructures = all.filter(t =>
        t.source === 'emerald' ||
        t.tags.includes('emerald') ||
        t.tags.some(tag => tag.startsWith('emerald'))
      );
      expect(emeraldStructures.length).toBeGreaterThan(0);
    }
  });
});
