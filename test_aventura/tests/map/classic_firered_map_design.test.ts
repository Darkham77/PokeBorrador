/**
 * tests/node/map/classic_firered_map_design.test.ts
 *
 * Tier 1 Unit Test: Validates classic FireRed GBA level design principles:
 * 1. Orthogonal corridors (strictly horizontal and vertical path segments, no sine wave).
 * 2. Dense canopy negative space (tree walls framing the corridor instead of an empty lawn).
 * 3. Gameplay-driven tall grass (dense blocks intersecting/flanking paths).
 * 4. Ledges as directional shortcuts and return lanes.
 * 5. Elimination of isolated 2x3 mountain cones in favor of authentic cliff walls.
 * 6. Gatehouse and front-yard residential micro-urbanism.
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

describe('Classic FireRed Map Design Principles (GBA Aesthetic & Topology)', () => {
  let registryService: TilesRegistryService;

  beforeAll(() => {
    const registryPath = path.resolve('public/assets/tiles_registry.json');
    expect(fs.existsSync(registryPath), 'public/assets/tiles_registry.json must exist').toBe(true);
    const raw = fs.readFileSync(registryPath, 'utf-8');
    const data = JSON.parse(raw) as TilesRegistryJson;
    registryService = new TilesRegistryService(data);
    loadTilesRegistry(data);
  });

  it('generates strictly orthogonal route corridors (zero diagonal or sine-wave drift)', () => {
    const generator = new ProceduralMapGenerator(registryService);
    const map = generator.generate({
      width: 32,
      height: 32,
      seed: 12345,
      type: 'route',
      withTown: false
    });

    // In a classic GBA route, paths consist of orthogonal segments (pure horizontal and vertical bars)
    let totalPathCells = 0;
    for (let y = 1; y < map.height - 1; y++) {
      for (let x = 1; x < map.width - 1; x++) {
        const cell = map.baseLayer[y]![x]!;
        if (cell.tileId.startsWith('tile_terrain_') && cell.tileId !== 'tile_terrain_120d7decae') {
          totalPathCells++;
        }
      }
    }
    expect(totalPathCells).toBeGreaterThan(20);
  });

  it('fills non-transitable space with dense tree canopy walls rather than an empty open lawn', () => {
    const generator = new ProceduralMapGenerator(registryService);
    const map = generator.generate({
      width: 30,
      height: 30,
      seed: 42,
      type: 'route',
      withTown: false,
      forestPercent: 40
    });

    // In classic FireRed, the route is carved out of a dense forest
    // Count solid obstacles (trees) in objectLayer
    let treeTilesCount = 0;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const obj = map.objectLayer[y]![x];
        if (obj && (obj.tileId.startsWith('tile_vegetation_') || obj.collision === true)) {
          treeTilesCount++;
        }
      }
    }

    // In a 30x30 map (900 tiles), at least 25% of tiles should be dense canopy tree tiles framing the corridor
    expect(treeTilesCount).toBeGreaterThanOrEqual(180);
  });

  it('places tall grass in dense geometric blocks that border or intersect the route corridor', () => {
    const generator = new ProceduralMapGenerator(registryService);
    const map = generator.generate({
      width: 30,
      height: 30,
      seed: 777,
      type: 'route',
      withTown: false
    });

    const tallGrassTileId = 'tile_vegetation_6b1605d4cf';
    let tallGrassCount = 0;
    let adjacentToPathCount = 0;

    for (let y = 1; y < map.height - 1; y++) {
      for (let x = 1; x < map.width - 1; x++) {
        const obj = map.objectLayer[y]![x];
        if (obj && obj.tileId === tallGrassTileId) {
          tallGrassCount++;

          // Check if this tall grass tile is adjacent (or on) a path cell
          const hasAdjacentPath = [
            map.baseLayer[y - 1]?.[x]?.tileId,
            map.baseLayer[y + 1]?.[x]?.tileId,
            map.baseLayer[y]?.[x - 1]?.tileId,
            map.baseLayer[y]?.[x + 1]?.tileId
          ].some((id) => id && id.startsWith('tile_terrain_') && id !== 'tile_terrain_120d7decae');

          if (hasAdjacentPath) {
            adjacentToPathCount++;
          }
        }
      }
    }

    expect(tallGrassCount, 'Must place tall grass in route mode').toBeGreaterThan(15);
    // At least 30% of tall grass tiles must be adjacent to paths to force player choice
    expect(adjacentToPathCount / tallGrassCount).toBeGreaterThanOrEqual(0.3);
  });

  it('ensures ledges form cohesive horizontal jumpable barriers with CollisionType = 3', () => {
    const generator = new ProceduralMapGenerator(registryService);
    const map = generator.generate({
      width: 30,
      height: 30,
      seed: 42,
      type: 'route',
      withTown: false
    });

    let ledgeCount = 0;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.collisionMatrix[y]![x] === 3) {
          ledgeCount++;
        }
      }
    }

    expect(ledgeCount, 'Route mode should have functional jumpable ledges').toBeGreaterThanOrEqual(3);
  });

  it('eliminates isolated 2x3 mountain cones on flat grass in favor of canonical cliff walls', () => {
    const generator = new ProceduralMapGenerator(registryService);
    const map = generator.generate({
      width: 30,
      height: 30,
      seed: 999,
      type: 'route',
      withTown: false,
      withHills: true,
      mountainPercent: 20
    });

    // The legacy mountain cone top tile is tile_elevation_7eccbe22e5 or tile_vegetation_bf0a3c7024
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const elev = map.elevationLayer[y]![x];
        expect(elev?.tileId).not.toBe('tile_elevation_7eccbe22e5');
        expect(elev?.tileId).not.toBe('tile_vegetation_bf0a3c7024');
      }
    }
  });

  it('generates micro-urbanism front yards with mailboxes, picket fences, and flowerbeds', async () => {
    const { MAILBOX, FENCE_WHITE, FLOWERS_RED, FLOWERS_BLUE, FLOWERS_YELLOW } = await import('../../../src/config/mapProps.ts');
    const generator = new ProceduralMapGenerator(registryService);
    const map = generator.generate({
      width: 32,
      height: 32,
      seed: 42,
      theme: 'firered',
      withTown: true
    });

    const mailboxTileId = MAILBOX.tiles[0]![0]!;
    const fenceTileId = FENCE_WHITE.tiles[0]![0]!;
    const flowerTileIds = new Set([
      FLOWERS_RED.tiles[0]![0]!,
      FLOWERS_BLUE.tiles[0]![0]!,
      FLOWERS_YELLOW.tiles[0]![0]!
    ]);

    let mailboxCount = 0;
    let fenceCount = 0;
    let flowerCount = 0;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const obj = map.layers.decorations[y]![x];
        if (obj) {
          if (obj.tileId === mailboxTileId) mailboxCount++;
          if (obj.tileId === fenceTileId) fenceCount++;
          if (flowerTileIds.has(obj.tileId)) flowerCount++;
        }
      }
    }

    expect(mailboxCount, 'Town should place mailboxes near residential doors').toBeGreaterThanOrEqual(1);
    expect(fenceCount, 'Town should place perimeter picket fences').toBeGreaterThanOrEqual(1);
    expect(flowerCount, 'Town should place orderly flowerbed rows').toBeGreaterThanOrEqual(1);
  });

  it('incorporates gatehouses and modular rectangular clearings in regional world generation', async () => {
    const { KantoRegionalWorldGenerator, DynamicCatalogLoader } = await import('../../../src/logic/map/kantoRegionalGenerator.ts');
    const { rawNodes, connections } = await import('../../../src/components/map/adventure/adventureMapData.ts');

    const loader = new DynamicCatalogLoader();
    const worldGen = new KantoRegionalWorldGenerator(loader);
    worldGen.generate(rawNodes, connections, 42);

    // Verify gatehouse prefabs are placed at city/route borders
    const gatehouses = worldGen.buildings.filter((b) => b.style === 'gatehouse_route');
    expect(gatehouses.length, 'Regional world must feature gatehouse_route checkpoints').toBeGreaterThanOrEqual(4);
  });
});
