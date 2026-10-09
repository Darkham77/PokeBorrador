/**
 * tests/node/map/procedural_route_and_entities.test.ts
 *
 * Tier 1 Unit Test: Validates the procedural Wild Route mode, Jumpable Ledges (Collision 3),
 * Game Entities metadata (Warps & Spawns), and the connected Urban Flow network.
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
  generateProceduralMap
} from '../../../src/logic/map/proceduralMapGenerator.ts';
import {
  POKEMON_CENTER,
  POKEMART,
  KANTO_HOUSE_SMALL
} from '../../../src/config/mapStructures.ts';

describe('Procedural Route, Ledges & Game Entities (v2.5)', () => {
  let registryService: TilesRegistryService;

  beforeAll(() => {
    const registryPath = path.resolve('public/assets/tiles_registry.json');
    expect(fs.existsSync(registryPath), 'public/assets/tiles_registry.json must exist').toBe(true);
    const raw = fs.readFileSync(registryPath, 'utf-8');
    const data = JSON.parse(raw) as TilesRegistryJson;
    registryService = new TilesRegistryService(data);
    loadTilesRegistry(data);
  });

  describe('Game Entities Metadata Layer (Warps & Spawns)', () => {
    it('registers canonical warps for all town buildings at their exact walkable entrances', () => {
      const map = generateProceduralMap(
        { width: 30, height: 30, theme: 'firered', seed: 42, withTown: true, type: 'town' },
        registryService
      );

      expect(map.entities).toBeDefined();
      expect(map.entities.warps.length).toBeGreaterThanOrEqual(3);

      const pcWarp = map.entities.warps.find(w => w.targetMapId === 'interior_pokemon_center');
      expect(pcWarp).toBeDefined();
      expect(pcWarp!.targetSpawnId).toBe('spawn_door');
      // Entrance must be walkable in collision matrix
      expect(map.collisionMatrix[pcWarp!.y]![pcWarp!.x]).toBe(0);

      const martWarp = map.entities.warps.find(w => w.targetMapId === 'interior_pokemart');
      expect(martWarp).toBeDefined();
      expect(martWarp!.targetSpawnId).toBe('spawn_door');
      expect(map.collisionMatrix[martWarp!.y]![martWarp!.x]).toBe(0);

      const houseWarps = map.entities.warps.filter(w => w.targetMapId === 'interior_kanto_house');
      expect(houseWarps.length).toBeGreaterThanOrEqual(1);
      for (const hw of houseWarps) {
        expect(map.collisionMatrix[hw.y]![hw.x]).toBe(0);
      }
    });

    it('registers player start and navigation spawns at strictly walkable coordinates', () => {
      const map = generateProceduralMap(
        { width: 30, height: 30, theme: 'firered', seed: 42, withTown: true, type: 'town' },
        registryService
      );

      expect(map.entities.spawns.length).toBeGreaterThanOrEqual(4);

      const playerStart = map.entities.spawns.find(s => s.id === 'player_start');
      expect(playerStart).toBeDefined();
      expect(map.collisionMatrix[playerStart!.y]![playerStart!.x], 'player_start must be walkable').toBe(0);

      const townExit = map.entities.spawns.find(s => s.id === 'town_exit_south');
      expect(townExit).toBeDefined();
      expect(map.collisionMatrix[townExit!.y]![townExit!.x], 'town_exit_south must be walkable').toBe(0);

      // Building exits must also be walkable
      const pcExit = map.entities.spawns.find(s => s.id.includes('pokemon_center'));
      expect(pcExit).toBeDefined();
      expect(map.collisionMatrix[pcExit!.y]![pcExit!.x], 'building exit must be walkable').toBe(0);
    });
  });

  describe('Urban Flow Redesign (Connected Street Network)', () => {
    it('connects southern buildings into the Southern Avenue road network', () => {
      const map = generateProceduralMap(
        { width: 30, height: 30, theme: 'firered', seed: 42, withTown: true, type: 'town' },
        registryService
      );

      // Verify all building doorsteps connect to walkable road cells
      for (const warp of map.entities.warps) {
        expect(map.collisionMatrix[warp.y]![warp.x]).toBe(0);
        const doorstepY = warp.y + 1;
        if (doorstepY < map.height) {
          expect(map.collisionMatrix[doorstepY]![warp.x], `Doorstep at (${warp.x}, ${doorstepY}) must be walkable`).toBe(0);
        }
      }

      // Central avenue at x = 15 must connect through the town down to the southern exit
      const midX = Math.floor(map.width / 2);
      for (let y = 4; y < map.height - 2; y++) {
        expect(map.collisionMatrix[y]![midX], `Central vertical road at (${midX}, ${y}) must be walkable`).toBe(0);
        expect(map.layers.decorations[y]![midX], `Central vertical road at (${midX}, ${y}) must be clear`).toBeNull();
      }
    });
  });

  describe('Wild Route Mode (type = route)', () => {
    it('generates a sinuous meandering trail connecting north and south borders', () => {
      const route = generateProceduralMap(
        { width: 30, height: 30, theme: 'firered', seed: 100, type: 'route' },
        registryService
      );

      expect(route.type).toBe('route');

      // Northern exit spawn and southern start spawn must exist and be walkable
      const northSpawn = route.entities.spawns.find(s => s.id === 'route_exit_north');
      const southSpawn = route.entities.spawns.find(s => s.id === 'player_start');

      expect(northSpawn).toBeDefined();
      expect(southSpawn).toBeDefined();
      expect(route.collisionMatrix[northSpawn!.y]![northSpawn!.x]).toBe(0);
      expect(route.collisionMatrix[southSpawn!.y]![southSpawn!.x]).toBe(0);

      // Urban buildings must be completely absent in route mode
      for (let y = 0; y < route.height; y++) {
        for (let x = 0; x < route.width; x++) {
          const elev = route.layers.elevation[y]![x]?.tileId;
          expect(elev).not.toBe(POKEMON_CENTER.tiles[0]![0]);
          expect(elev).not.toBe(POKEMART.tiles[0]![0]);
          expect(elev).not.toBe(KANTO_HOUSE_SMALL.tiles[0]![0]);
        }
      }
    });

    it('generates multiple organic tall grass patches for wild Pokémon encounters', () => {
      const route = generateProceduralMap(
        { width: 30, height: 30, theme: 'firered', seed: 100, type: 'route' },
        registryService
      );

      const tallGrassId = 'tile_vegetation_6b1605d4cf';
      let tallGrassCount = 0;

      for (let y = 0; y < route.height; y++) {
        for (let x = 0; x < route.width; x++) {
          if (route.layers.decorations[y]![x]?.tileId === tallGrassId) {
            tallGrassCount++;
            // Tall grass is transitable
            expect(route.collisionMatrix[y]![x]).toBe(0);
          }
        }
      }

      // Should have a healthy amount of tall grass tiles in route mode (>= 25 tiles)
      expect(tallGrassCount).toBeGreaterThanOrEqual(25);
    });

    it('generates directional jumpable ledges with collision code 3', () => {
      const route = generateProceduralMap(
        { width: 30, height: 30, theme: 'firered', seed: 42, type: 'route' },
        registryService
      );

      let ledgeTileCount = 0;
      const validLedgeTiles = new Set(['tile_terrain_120d7decae', 'tile_terrain_1938e75eaa']);

      for (let y = 0; y < route.height; y++) {
        for (let x = 0; x < route.width; x++) {
          if (route.collisionMatrix[y]![x] === 3) {
            ledgeTileCount++;
            const baseTile = route.layers.ground[y]![x]?.tileId;
            expect(validLedgeTiles.has(baseTile!), `Ledge tile ${baseTile} must be canonical`).toBe(true);
            // Must have no blocking obstacle on the ledge itself
            expect(route.layers.decorations[y]![x]).toBeNull();
          }
        }
      }

      expect(ledgeTileCount, 'Route should contain jumpable ledges').toBeGreaterThan(0);
    });
  });
});
