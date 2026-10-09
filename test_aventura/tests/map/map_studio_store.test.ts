/**
 * tests/node/map/map_studio_store.test.ts
 *
 * Tier 1 Unit Test: Validates the Map Studio Pinia store mutations, command history
 * undo/redo stack, collision painter, multitile structure stamper, and test-drive engine.
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import fs from 'node:fs';
import path from 'node:path';
import {
  TilesRegistryService,
  loadTilesRegistry,
  type TilesRegistryJson
} from '../../../src/logic/map/tilesRegistry.ts';
import {
  generateProceduralMap,
  type GeneratedMap
} from '../../../src/logic/map/proceduralMapGenerator.ts';
import {
  useMapStudioStore,
  MAX_HISTORY_STEPS,
  DEFAULT_GROUND_TILE
} from '../../../src/stores/mapStudio.ts';

describe('Map Studio Pinia Store (useMapStudioStore)', () => {
  let registryService: TilesRegistryService;
  let testMap: GeneratedMap;

  beforeAll(() => {
    const registryPath = path.resolve('public/assets/tiles_registry.json');
    expect(fs.existsSync(registryPath), 'public/assets/tiles_registry.json must exist').toBe(true);
    const raw = fs.readFileSync(registryPath, 'utf-8');
    const data = JSON.parse(raw) as TilesRegistryJson;
    registryService = new TilesRegistryService(data);
    loadTilesRegistry(data);
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    testMap = generateProceduralMap(
      { width: 20, height: 20, theme: 'firered', seed: 42, withTown: false },
      registryService
    );
  });

  it('initializes store with default tools, layers, and empty history', () => {
    const store = useMapStudioStore();
    expect(store.currentMap).toBeNull();
    expect(store.activeTool).toBe('brush');
    expect(store.activeLayer).toBe('ground');
    expect(store.zoom).toBe(1.0);
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
    expect(store.testDriveActive).toBe(false);
  });

  it('loads map and positions player on spawn or center', () => {
    const store = useMapStudioStore();
    store.setMap(testMap);

    expect(store.currentMap).toStrictEqual(testMap);
    expect(store.playerX).toBeGreaterThanOrEqual(0);
    expect(store.playerY).toBeGreaterThanOrEqual(0);
    expect(store.canUndo).toBe(false);
  });

  it('paints a tile on active layer, pushes to history, and supports undo/redo', () => {
    const store = useMapStudioStore();
    store.setMap(testMap);

    const testTile = 'tile_terrain_4756bdfd4e';
    const targetX = 5;
    const targetY = 5;
    const originalTileId = testMap.layers.ground[targetY]![targetX]!.tileId;

    // Paint tile
    const painted = store.paintTile(targetX, targetY, testTile);
    expect(painted).toBe(true);
    expect(testMap.layers.ground[targetY]![targetX]!.tileId).toBe(testTile);
    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(false);

    // Undo action
    store.undo();
    expect(testMap.layers.ground[targetY]![targetX]!.tileId).toBe(originalTileId);
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(true);

    // Redo action
    store.redo();
    expect(testMap.layers.ground[targetY]![targetX]!.tileId).toBe(testTile);
    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(false);
  });

  it('erases a tile cleanly on ground and elevation layers', () => {
    const store = useMapStudioStore();
    store.setMap(testMap);

    // 1. Erase ground resets to DEFAULT_GROUND_TILE
    store.activeLayer = 'ground';
    store.paintTile(4, 4, 'tile_terrain_4756bdfd4e');
    const erasedGround = store.eraseTile(4, 4);
    expect(erasedGround).toBe(true);
    expect(testMap.layers.ground[4]![4]?.tileId).toBe(DEFAULT_GROUND_TILE);

    // 2. Erase elevation clears to null
    store.activeLayer = 'elevation';
    store.paintTile(4, 4, 'tile_elevation_9ee757e84a');
    const erasedElev = store.eraseTile(4, 4);
    expect(erasedElev).toBe(true);
    expect(testMap.layers.elevation[4]![4]).toBeNull();
  });

  it('paints collision mask and reverts atomically with undo', () => {
    const store = useMapStudioStore();
    store.setMap(testMap);

    const initialCol = testMap.collisionMatrix[6]![6]!;
    const newCol = initialCol === 3 ? 0 : 3;

    // Paint collision
    store.paintCollision(6, 6, newCol);
    expect(testMap.collisionMatrix[6]![6]).toBe(newCol);
    expect(store.canUndo).toBe(true);

    // Undo collision
    store.undo();
    expect(testMap.collisionMatrix[6]![6]).toBe(initialCol);
  });

  it('stamps compound structure, registers warps/spawns, and undo restores cleanly', () => {
    const store = useMapStudioStore();
    store.setMap(testMap);

    store.selectedStructureId = 'pokemon_center';
    const warpsCountBefore = testMap.entities.warps.length;
    const spawnsCountBefore = testMap.entities.spawns.length;

    const stamped = store.stampCurrentStructure(4, 4);
    expect(stamped).toBe(true);

    // Footprint of PC is 5x5: elevation layer at (4..8, 4..8) is populated
    expect(testMap.layers.elevation[4]![4]).not.toBeNull();
    expect(testMap.entities.warps.length).toBe(warpsCountBefore + 1);
    expect(testMap.entities.spawns.length).toBe(spawnsCountBefore + 1);

    // Undo stamping
    store.undo();
    expect(testMap.layers.elevation[4]![4]).toBeNull();
    expect(testMap.entities.warps.length).toBe(warpsCountBefore);
    expect(testMap.entities.spawns.length).toBe(spawnsCountBefore);
  });

  it('limits undo history stack to MAX_HISTORY_STEPS (30)', () => {
    const store = useMapStudioStore();
    store.setMap(testMap);

    for (let i = 0; i < MAX_HISTORY_STEPS + 10; i++) {
      const gx = i % 10;
      const gy = Math.floor(i / 10);
      const current = testMap.collisionMatrix[gy]![gx]!;
      const changedCol = current === 1 ? 0 : 1;
      store.paintCollision(gx, gy, changedCol);
    }

    // Stack should not exceed MAX_HISTORY_STEPS
    let undoCount = 0;
    while (store.canUndo) {
      store.undo();
      undoCount++;
    }

    expect(undoCount).toBe(MAX_HISTORY_STEPS);
  });

  it('validates Test Drive avatar movement, solid collision, and ledge jump', () => {
    const store = useMapStudioStore();
    store.setMap(testMap);

    // When test drive is inactive, player cannot move
    store.testDriveActive = false;
    expect(store.movePlayer(1, 0, 'right')).toBe(false);

    // Activate test drive
    store.testDriveActive = true;
    store.playerX = 5;
    store.playerY = 5;
    (testMap.collisionMatrix as number[][])[5]![5] = 0;
    (testMap.collisionMatrix as number[][])[5]![6] = 0; // walkable east
    (testMap.collisionMatrix as number[][])[5]![4] = 1; // solid west

    // Move onto walkable tile
    const movedEast = store.movePlayer(1, 0, 'right');
    expect(movedEast).toBe(true);
    expect(store.playerX).toBe(6);
    expect(store.playerDirection).toBe('right');

    // Move into solid obstacle
    store.playerX = 5;
    const movedWest = store.movePlayer(-1, 0, 'left');
    expect(movedWest).toBe(false);
    expect(store.playerX).toBe(5);

    // Ledge jump: at (5, 6) is ledge (3), and (5, 7) is walkable (0)
    (testMap.collisionMatrix as number[][])[6]![5] = 3;
    (testMap.collisionMatrix as number[][])[7]![5] = 0;

    const jumpedLedge = store.movePlayer(0, 1, 'down');
    expect(jumpedLedge).toBe(true);
    // Player hops 2 tiles down to (5, 7)
    expect(store.playerY).toBe(7);
  });
});
