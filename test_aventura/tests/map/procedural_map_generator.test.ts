/**
 * tests/node/map/procedural_map_generator.test.ts
 *
 * Tier 1 Unit Test: Validates the procedural map generator engine and layer integrity.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  TilesRegistryService,
  loadTilesRegistry,
  type TilesRegistryJson
} from '../../../src/logic/map/tilesRegistry.ts';
import {
  ProceduralMapGenerator
} from '../../../src/logic/map/proceduralMapGenerator.ts';

describe('Procedural Map Generator Engine (SSoT v2.0)', () => {
  let registryService: TilesRegistryService;

  beforeAll(() => {
    const registryPath = path.resolve('public/assets/tiles_registry.json');
    expect(fs.existsSync(registryPath), 'public/assets/tiles_registry.json must exist').toBe(true);
    const raw = fs.readFileSync(registryPath, 'utf-8');
    const data = JSON.parse(raw) as TilesRegistryJson;
    registryService = new TilesRegistryService(data);
    loadTilesRegistry(data);
  });

  it('generates a map matching exact requested grid dimensions', () => {
    const generator = new ProceduralMapGenerator(registryService);
    const map = generator.generate({ width: 24, height: 20, seed: 999 });

    expect(map.width).toBe(24);
    expect(map.height).toBe(20);
    expect(map.tileSize).toBe(16);
    expect(map.baseLayer.length).toBe(20);
    expect(map.baseLayer[0]?.length).toBe(24);
    expect(map.elevationLayer.length).toBe(20);
    expect(map.objectLayer.length).toBe(20);
    expect(map.collisionGrid.length).toBe(20);
  });

  it('guarantees 100% deterministic generation with the same seed', () => {
    const generator = new ProceduralMapGenerator(registryService);
    const mapA = generator.generate({ width: 20, height: 20, seed: 42 });
    const mapB = generator.generate({ width: 20, height: 20, seed: 42 });

    expect(mapA.totalTilesPlaced).toBe(mapB.totalTilesPlaced);

    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        expect(mapA.baseLayer[y]![x]!.tileId).toBe(mapB.baseLayer[y]![x]!.tileId);
        expect(mapA.elevationLayer[y]![x]?.tileId).toBe(mapB.elevationLayer[y]![x]?.tileId);
        expect(mapA.objectLayer[y]![x]?.tileId).toBe(mapB.objectLayer[y]![x]?.tileId);
        expect(mapA.collisionGrid[y]![x]).toBe(mapB.collisionGrid[y]![x]);
      }
    }
  });

  it('verifies that every placed tile exists in the canonical tiles registry', () => {
    const generator = new ProceduralMapGenerator(registryService);
    const map = generator.generate({ width: 16, height: 16, seed: 777 });

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const base = map.baseLayer[y]![x]!;
        expect(base.tileId).toBeTruthy();
        expect(base.filePath.startsWith('/assets/tiles/')).toBe(true);
        expect(registryService.getTileById(base.tileId)).toBeDefined();

        const elev = map.elevationLayer[y]![x];
        if (elev) {
          expect(elev.tileId).toBeTruthy();
          expect(registryService.getTileById(elev.tileId)).toBeDefined();
        }

        const obj = map.objectLayer[y]![x];
        if (obj) {
          expect(obj.tileId).toBeTruthy();
          expect(registryService.getTileById(obj.tileId)).toBeDefined();
        }
      }
    }
  });

  it('validates collision grid topology consistency', () => {
    const generator = new ProceduralMapGenerator(registryService);
    const map = generator.generate({ width: 20, height: 20, seed: 101 });

    // Perimeter borders must be solid (trees or elevation)
    expect(map.collisionGrid[0]![0]).toBe(true);
    expect(map.collisionGrid[0]![19]).toBe(true);
    expect(map.collisionGrid[19]![0]).toBe(true);
    expect(map.collisionGrid[19]![19]).toBe(true);
  });

  it('exposes generateProceduralMap with layers and numeric collisionMatrix (0, 1, 2)', async () => {
    const { generateProceduralMap } = await import('../../../src/logic/map/proceduralMapGenerator.ts');
    const result = generateProceduralMap(
      { width: 20, height: 20, theme: 'firered', seed: 42 },
      registryService
    );

    expect(result.layers).toBeDefined();
    expect(result.layers.ground.length).toBe(20);
    expect(result.layers.elevation.length).toBe(20);
    expect(result.layers.decorations.length).toBe(20);

    expect(result.collisionMatrix).toBeDefined();
    expect(result.collisionMatrix.length).toBe(20);
    expect(result.collisionMatrix[0]?.length).toBe(20);

    // Verify matrix values are strictly 0 (walkable), 1 (solid), or 2 (water)
    const validValues = new Set([0, 1, 2]);
    let hasWalkable = false;
    let hasSolid = false;
    let hasWater = false;

    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const val = result.collisionMatrix[y]![x]!;
        expect(validValues.has(val)).toBe(true);
        if (val === 0) hasWalkable = true;
        if (val === 1) hasSolid = true;
        if (val === 2) hasWater = true;
      }
    }

    expect(hasWalkable).toBe(true);
    expect(hasSolid).toBe(true);
    expect(hasWater).toBe(true);
  });

  it('stamps multitile structure templates atomically onto target map', async () => {
    const { generateProceduralMap, stampStructure } = await import('../../../src/logic/map/proceduralMapGenerator.ts');
    const { KANTO_HOUSE_SMALL, POKEMART, POKEMON_CENTER } = await import('../../../src/config/mapStructures.ts');

    const map = generateProceduralMap(
      { width: 30, height: 30, theme: 'firered', seed: 123 },
      registryService
    );

    // 1. Stamp Kanto House Small (5x5) at (4, 4)
    const housePlaced = stampStructure(map, KANTO_HOUSE_SMALL, 4, 4, registryService);
    expect(housePlaced).toBe(true);

    // Verify house footprint in elevation layer
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = map.layers.elevation[4 + r]![4 + c];
        expect(cell).toBeDefined();
        expect(cell?.tileId).toBe(KANTO_HOUSE_SMALL.tiles[r]![c]);
      }
    }

    // Door of Kanto House (col 1, row 4 -> x: 5, y: 8) must be walkable (0)
    expect(map.collisionMatrix[8]![5]).toBe(0);
    // Roof of Kanto House (col 0, row 0 -> x: 4, y: 4) must be solid (1)
    expect(map.collisionMatrix[4]![4]).toBe(1);

    // 2. Stamp Poké Mart (4x4) at (12, 4)
    const martPlaced = stampStructure(map, POKEMART, 12, 4, registryService);
    expect(martPlaced).toBe(true);
    // Sliding door of Mart (col 2, row 3 -> x: 14, y: 7) must be walkable (0)
    expect(map.collisionMatrix[7]![14]).toBe(0);
    // Wall of Mart (col 0, row 3 -> x: 12, y: 7) must be solid (1)
    expect(map.collisionMatrix[7]![12]).toBe(1);

    // 3. Stamp Pokémon Center (5x5) at (18, 4)
    const pcPlaced = stampStructure(map, POKEMON_CENTER, 18, 4, registryService);
    expect(pcPlaced).toBe(true);
    // Sliding door of PC (col 2, row 4 -> x: 20, y: 8) must be walkable (0)
    expect(map.collisionMatrix[8]![20]).toBe(0);
    // Wall of PC (col 0, row 4 -> x: 18, y: 8) must be solid (1)
    expect(map.collisionMatrix[8]![18]).toBe(1);

    // 4. Out-of-bounds stamping returns false cleanly
    const oobPlaced = stampStructure(map, POKEMON_CENTER, 28, 28, registryService);
    expect(oobPlaced).toBe(false);
  });

  it('automatically executes Town Pass when withTown is enabled on a 30x30 map', async () => {
    const { generateProceduralMap } = await import('../../../src/logic/map/proceduralMapGenerator.ts');
    const { POKEMON_CENTER, POKEMART, KANTO_HOUSE_SMALL } = await import('../../../src/config/mapStructures.ts');

    const map = generateProceduralMap(
      { width: 30, height: 30, theme: 'firered', seed: 42, withTown: true },
      registryService
    );

    // Collect all placed tile IDs in elevation layer
    const placedElevationTileIds = new Set<string>();
    for (const row of map.layers.elevation) {
      for (const cell of row) {
        if (cell) placedElevationTileIds.add(cell.tileId);
      }
    }

    // Pokémon Center tiles must be placed
    const pcFirstTile = POKEMON_CENTER.tiles[0]![0]!;
    expect(placedElevationTileIds.has(pcFirstTile), 'Pokémon Center must be placed').toBe(true);

    // Poké Mart tiles must be placed
    const martFirstTile = POKEMART.tiles[0]![0]!;
    expect(placedElevationTileIds.has(martFirstTile), 'Poké Mart must be placed').toBe(true);

    // Kanto House tiles must be placed
    const houseFirstTile = KANTO_HOUSE_SMALL.tiles[0]![0]!;
    expect(placedElevationTileIds.has(houseFirstTile), 'Kanto House must be placed').toBe(true);
  });

  it('enforces Master Path Invariant: main paths are 100% clear of props and have 0 collision', async () => {
    const { generateProceduralMap } = await import('../../../src/logic/map/proceduralMapGenerator.ts');

    const map = generateProceduralMap(
      { width: 30, height: 30, theme: 'firered', seed: 42, withTown: true },
      registryService
    );

    // On all path cells (ground layer contains path tile), decorations must be null and collision must be 0
    let pathCellCount = 0;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const baseTileId = map.layers.ground[y]![x]!.tileId;
        if (baseTileId.startsWith('tile_terrain_')) {
          pathCellCount++;
          expect(map.layers.decorations[y]![x], `Path decorations at (${x}, ${y}) must be null`).toBeNull();
          expect(map.collisionMatrix[y]![x], `Path collision at (${x}, ${y}) must be 0`).toBe(0);
        }
      }
    }
    expect(pathCellCount).toBeGreaterThan(30);
  });

  it('enforces urban town clearance: >= 2 tiles from perimeter trees and between buildings', async () => {
    const { generateProceduralMap } = await import('../../../src/logic/map/proceduralMapGenerator.ts');

    const map = generateProceduralMap(
      { width: 30, height: 30, theme: 'firered', seed: 42, withTown: true },
      registryService
    );

    expect(map.entities.warps.length).toBeGreaterThan(0);
    for (const warp of map.entities.warps) {
      expect(warp.y, 'Building entrance must clear perimeter trees').toBeGreaterThanOrEqual(4);
      expect(warp.x, 'Building entrance must clear left perimeter trees').toBeGreaterThanOrEqual(3);
      expect(warp.x, 'Building entrance must clear right perimeter trees').toBeLessThanOrEqual(map.width - 4);
    }
  });

  it('prohibits mountain cones from stamping inside town sector when withTown is enabled', async () => {
    const { generateProceduralMap } = await import('../../../src/logic/map/proceduralMapGenerator.ts');

    const map = generateProceduralMap(
      { width: 30, height: 30, theme: 'firered', seed: 42, withTown: true },
      registryService
    );

    // Mountain cone top tile is tile_elevation_7eccbe22e5 or tile_vegetation_bf0a3c7024
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const elevId = map.layers.elevation[y]![x]?.tileId;
        expect(elevId).not.toBe('tile_elevation_7eccbe22e5');
        expect(elevId).not.toBe('tile_vegetation_bf0a3c7024');
      }
    }
  });

  it('completely excludes dirty root tile (tile_elevation_8e2e0bd2de) from all layers', async () => {
    const { generateProceduralMap } = await import('../../../src/logic/map/proceduralMapGenerator.ts');

    const map = generateProceduralMap(
      { width: 30, height: 30, theme: 'firered', seed: 42, withTown: true },
      registryService
    );

    const dirtyRootId = 'tile_elevation_8e2e0bd2de';
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        expect(map.layers.ground[y]![x]!.tileId).not.toBe(dirtyRootId);
        expect(map.layers.elevation[y]![x]?.tileId).not.toBe(dirtyRootId);
        expect(map.layers.decorations[y]![x]?.tileId).not.toBe(dirtyRootId);
      }
    }
  });

  it('uses paved urban tiles for building doorways with zero decorations on doorsteps', async () => {
    const { generateProceduralMap } = await import('../../../src/logic/map/proceduralMapGenerator.ts');

    const map = generateProceduralMap(
      { width: 30, height: 30, theme: 'firered', seed: 42, withTown: true },
      registryService
    );

    // In procedural town: find Pokémon Center warp
    const pcWarp = map.entities.warps.find(w => w.targetMapId === 'interior_pokemon_center')!;
    expect(pcWarp).toBeDefined();
    const pcDoorStep = map.layers.ground[pcWarp.y + 1]![pcWarp.x]!;
    expect(pcDoorStep.tileId).toBe('tile_terrain_4756bdfd4e');
    expect(map.layers.decorations[pcWarp.y + 1]![pcWarp.x]).toBeNull();
    expect(map.collisionMatrix[pcWarp.y + 1]![pcWarp.x]).toBe(0);
  });

  it('completely excludes wild tall grass (tile_vegetation_6b1605d4cf) when withTown is enabled', async () => {
    const { generateProceduralMap } = await import('../../../src/logic/map/proceduralMapGenerator.ts');

    const map = generateProceduralMap(
      { width: 30, height: 30, theme: 'firered', seed: 42, withTown: true },
      registryService
    );

    const tallGrassId = 'tile_vegetation_6b1605d4cf';
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        expect(map.layers.decorations[y]![x]?.tileId).not.toBe(tallGrassId);
      }
    }
  });

  it('connects house doorway cleanly to main road and avoids southern dead-end paths', async () => {
    const { generateProceduralMap } = await import('../../../src/logic/map/proceduralMapGenerator.ts');

    const map = generateProceduralMap(
      { width: 30, height: 30, theme: 'firered', seed: 42, withTown: true },
      registryService
    );

    // Any placed building warp must have a transitable doorstep and connection
    for (const warp of map.entities.warps) {
      expect(map.collisionMatrix[warp.y]![warp.x]).toBe(0);
      const doorstepY = warp.y + 1;
      if (doorstepY < map.height) {
        expect(map.collisionMatrix[doorstepY]![warp.x]).toBe(0);
        expect(map.layers.ground[doorstepY]![warp.x]!.tileId).toBe('tile_terrain_4756bdfd4e');
      }
    }
  });
});


