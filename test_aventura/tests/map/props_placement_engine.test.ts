import { describe, it, expect } from 'vitest';
import {
  MAP_PROPS_REGISTRY,
  STREET_LAMP,
  BENCH_WOODEN,
  MAILBOX,
  FLOWERS_RED
} from '../../config/mapProps';
import {
  placeScenicProps,
  canPlacePropAt,
  stampPropAt,
  type PropsPlacementOptions
} from '../../logic/map/propsPlacementEngine';
import type { TileCollision } from '../../logic/map/tilesRegistry';
import type { MapCell, MapSpawn, MapWarp } from '../../logic/map/proceduralMapGenerator';
import type { UrbanLot } from '../../logic/map/urbanZoningEngine';

function createMockMapContext(width = 30, height = 30) {
  const baseLayer: (MapCell | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      tileId: 'tile_grass',
      filePath: '/assets/tiles/grass.png',
      collision: false
    }))
  );

  const elevationLayer: (MapCell | null)[][] = Array.from({ length: height }, () =>
    Array(width).fill(null)
  );

  const objectLayer: (MapCell | null)[][] = Array.from({ length: height }, () =>
    Array(width).fill(null)
  );

  const collisionGrid: TileCollision[][] = Array.from({ length: height }, () =>
    Array(width).fill(false)
  );

  const isPathCell: boolean[][] = Array.from({ length: height }, () =>
    Array(width).fill(false)
  );

  const spawns: MapSpawn[] = [
    { id: 'player_start', x: 15, y: 15, direction: 'down' },
    { id: 'town_exit', x: 15, y: 28, direction: 'down' }
  ];

  const warps: MapWarp[] = [
    { x: 10, y: 10, targetMapId: 'interior_house', targetSpawnId: 'spawn_door' }
  ];

  // Mark door & doorstep as path
  isPathCell[10]![10] = true;
  isPathCell[11]![10] = true;

  const lots: UrbanLot[] = [
    {
      x: 8,
      y: 6,
      width: 6,
      height: 5,
      doorX: 10,
      doorY: 10,
      roadConnectX: 10,
      roadConnectY: 12
    }
  ];

  const makeCell = (tileId: string, collision: TileCollision): MapCell => ({
    tileId,
    filePath: `/assets/tiles/${tileId}.png`,
    collision
  });

  return {
    width,
    height,
    baseLayer,
    elevationLayer,
    objectLayer,
    collisionGrid,
    isPathCell,
    spawns,
    warps,
    lots,
    makeCell
  };
}

describe('Fase 5: Map Props Registry & Placement Engine', () => {
  describe('1. Canonical Props Registry Integrity', () => {
    it('defines all canonical props with correct matrix footprint and collision mask', () => {
      const allProps = Object.values(MAP_PROPS_REGISTRY);
      expect(allProps.length).toBeGreaterThanOrEqual(14);

      for (const prop of allProps) {
        expect(prop.width).toBeGreaterThanOrEqual(1);
        expect(prop.height).toBeGreaterThanOrEqual(1);
        expect(prop.tiles.length).toBe(prop.height);
        expect(prop.collisionMask.length).toBe(prop.height);

        for (let r = 0; r < prop.height; r++) {
          expect(prop.tiles[r]!.length).toBe(prop.width);
          expect(prop.collisionMask[r]!.length).toBe(prop.width);
        }
      }
    });

    it('defines STREET_LAMP with 1x2 dimensions where top is walkable and base is solid', () => {
      expect(STREET_LAMP.width).toBe(1);
      expect(STREET_LAMP.height).toBe(2);
      expect(STREET_LAMP.collisionMask[0]![0]).toBe(0); // top is walkable
      expect(STREET_LAMP.collisionMask[1]![0]).toBe(1); // base is solid
    });

    it('defines BENCH_WOODEN with 2x1 dimensions and solid collision', () => {
      expect(BENCH_WOODEN.width).toBe(2);
      expect(BENCH_WOODEN.height).toBe(1);
      expect(BENCH_WOODEN.collisionMask[0]).toEqual([1, 1]);
    });
  });

  describe('2. Safe Bounds Guards (Multi-tile Props)', () => {
    it('safely rejects multi-tile props exceeding map boundaries without out-of-bounds crashes', () => {
      const ctx = createMockMapContext(20, 20);

      // Bench (2x1) at x = 19 (exceeds width 20 since 19 + 2 = 21 > 20)
      const benchFit = canPlacePropAt(ctx.objectLayer, ctx.elevationLayer, ctx.isPathCell, BENCH_WOODEN, 19, 5, 20, 20);
      expect(benchFit).toBe(false);

      // Street Lamp (1x2) at y = 19 (exceeds height 20 since 19 + 2 = 21 > 20)
      const lampFit = canPlacePropAt(ctx.objectLayer, ctx.elevationLayer, ctx.isPathCell, STREET_LAMP, 5, 19, 20, 20);
      expect(lampFit).toBe(false);

      // Negative coordinates
      expect(canPlacePropAt(ctx.objectLayer, ctx.elevationLayer, ctx.isPathCell, BENCH_WOODEN, -1, 5, 20, 20)).toBe(false);
      expect(canPlacePropAt(ctx.objectLayer, ctx.elevationLayer, ctx.isPathCell, STREET_LAMP, 5, -1, 20, 20)).toBe(false);

      // Valid internal coordinates should be allowed
      expect(canPlacePropAt(ctx.objectLayer, ctx.elevationLayer, ctx.isPathCell, BENCH_WOODEN, 2, 2, 20, 20)).toBe(true);
    });

    it('stampPropAt safely does nothing and returns false if out-of-bounds', () => {
      const ctx = createMockMapContext(20, 20);
      const res = stampPropAt(
        ctx.objectLayer,
        ctx.collisionGrid,
        BENCH_WOODEN,
        19,
        5,
        20,
        20,
        ctx.makeCell
      );
      expect(res).toBe(false);
    });
  });

  describe('3. Clearance Invariant (Strict Pedestrian & Vehicle Despeje)', () => {
    it('never places any solid prop on doors, doorsteps, or spawns', () => {
      const ctx = createMockMapContext(30, 30);

      const options: PropsPlacementOptions = {
        mapWidth: ctx.width,
        mapHeight: ctx.height,
        seed: 42,
        density: 100, // max density
        includeFences: true,
        isUrban: true,
        baseLayer: ctx.baseLayer,
        elevationLayer: ctx.elevationLayer,
        objectLayer: ctx.objectLayer,
        collisionGrid: ctx.collisionGrid,
        isPathCell: ctx.isPathCell,
        lots: ctx.lots,
        occupiedLots: new Set([0]),
        streetNetwork: {
          center: { x: 15, y: 15 },
          xRoads: [15],
          yRoads: [15]
        },
        spawns: ctx.spawns,
        warps: ctx.warps,
        makeCell: ctx.makeCell
      };

      placeScenicProps(options);

      // Verify all spawns are 100% walkable
      for (const sp of ctx.spawns) {
        expect(ctx.collisionGrid[sp.y]![sp.x]).toBe(false);
      }

      // Verify all warps/doors are 100% walkable
      for (const wp of ctx.warps) {
        expect(ctx.collisionGrid[wp.y]![wp.x]).toBe(false);
        // Doorstep
        expect(ctx.collisionGrid[wp.y + 1]![wp.x]).toBe(false);
      }
    });

    it('keeps central road circulation lanes free of solid props', () => {
      const ctx = createMockMapContext(30, 30);

      // Define central road at y = 15 (width 2: 14 and 15)
      for (let x = 0; x < 30; x++) {
        ctx.isPathCell[14]![x] = true;
        ctx.isPathCell[15]![x] = true;
      }

      const options: PropsPlacementOptions = {
        mapWidth: ctx.width,
        mapHeight: ctx.height,
        seed: 12345,
        density: 100,
        includeFences: true,
        isUrban: true,
        baseLayer: ctx.baseLayer,
        elevationLayer: ctx.elevationLayer,
        objectLayer: ctx.objectLayer,
        collisionGrid: ctx.collisionGrid,
        isPathCell: ctx.isPathCell,
        streetNetwork: {
          center: { x: 15, y: 15 },
          xRoads: [],
          yRoads: [15]
        },
        makeCell: ctx.makeCell
      };

      placeScenicProps(options);

      // Road path cells must not have solid props
      for (let x = 0; x < 30; x++) {
        expect(ctx.collisionGrid[14]![x]).toBe(false);
        expect(ctx.collisionGrid[15]![x]).toBe(false);
      }
    });
  });

  describe('4. Density Scaling & Synchronous Collision Grid', () => {
    it('places 0 props when density is 0', () => {
      const ctx = createMockMapContext(30, 30);

      const options: PropsPlacementOptions = {
        mapWidth: ctx.width,
        mapHeight: ctx.height,
        seed: 42,
        density: 0,
        includeFences: true,
        isUrban: true,
        baseLayer: ctx.baseLayer,
        elevationLayer: ctx.elevationLayer,
        objectLayer: ctx.objectLayer,
        collisionGrid: ctx.collisionGrid,
        isPathCell: ctx.isPathCell,
        makeCell: ctx.makeCell
      };

      const result = placeScenicProps(options);
      expect(result.placedPropsCount).toBe(0);

      let placedCount = 0;
      for (let y = 0; y < 30; y++) {
        for (let x = 0; x < 30; x++) {
          if (ctx.objectLayer[y]![x] !== null) placedCount++;
        }
      }
      expect(placedCount).toBe(0);
    });

    it('places significantly more props when density is 100 vs 25', () => {
      const ctxLow = createMockMapContext(30, 30);
      const resLow = placeScenicProps({
        mapWidth: ctxLow.width,
        mapHeight: ctxLow.height,
        seed: 777,
        density: 25,
        includeFences: true,
        isUrban: true,
        baseLayer: ctxLow.baseLayer,
        elevationLayer: ctxLow.elevationLayer,
        objectLayer: ctxLow.objectLayer,
        collisionGrid: ctxLow.collisionGrid,
        isPathCell: ctxLow.isPathCell,
        streetNetwork: { center: { x: 15, y: 15 }, xRoads: [15], yRoads: [15] },
        makeCell: ctxLow.makeCell
      });

      const ctxHigh = createMockMapContext(30, 30);
      const resHigh = placeScenicProps({
        mapWidth: ctxHigh.width,
        mapHeight: ctxHigh.height,
        seed: 777,
        density: 100,
        includeFences: true,
        isUrban: true,
        baseLayer: ctxHigh.baseLayer,
        elevationLayer: ctxHigh.elevationLayer,
        objectLayer: ctxHigh.objectLayer,
        collisionGrid: ctxHigh.collisionGrid,
        isPathCell: ctxHigh.isPathCell,
        streetNetwork: { center: { x: 15, y: 15 }, xRoads: [15], yRoads: [15] },
        makeCell: ctxHigh.makeCell
      });

      expect(resHigh.placedPropsCount).toBeGreaterThan(resLow.placedPropsCount);
    });

    it('synchronizes collisionGrid atomically with solid props', () => {
      const ctx = createMockMapContext(20, 20);

      // Stamping solid mailbox
      const stampedSolid = stampPropAt(ctx.objectLayer, ctx.collisionGrid, MAILBOX, 5, 5, 20, 20, ctx.makeCell);
      expect(stampedSolid).toBe(true);
      expect(ctx.collisionGrid[5]![5]).toBe(true);
      expect(ctx.objectLayer[5]![5]?.tileId).toBe(MAILBOX.tiles[0]![0]);

      // Stamping walkable flower
      const stampedWalkable = stampPropAt(ctx.objectLayer, ctx.collisionGrid, FLOWERS_RED, 8, 8, 20, 20, ctx.makeCell);
      expect(stampedWalkable).toBe(true);
      expect(ctx.collisionGrid[8]![8]).toBe(false);
      expect(ctx.objectLayer[8]![8]?.tileId).toBe(FLOWERS_RED.tiles[0]![0]);
    });
  });

  describe('5. Seed Determinism', () => {
    it('produces identical prop placement with the same seed', () => {
      const ctx1 = createMockMapContext(25, 25);
      const res1 = placeScenicProps({
        mapWidth: 25,
        mapHeight: 25,
        seed: 9999,
        density: 60,
        isUrban: true,
        baseLayer: ctx1.baseLayer,
        elevationLayer: ctx1.elevationLayer,
        objectLayer: ctx1.objectLayer,
        collisionGrid: ctx1.collisionGrid,
        isPathCell: ctx1.isPathCell,
        streetNetwork: { center: { x: 12, y: 12 }, xRoads: [12], yRoads: [12] },
        makeCell: ctx1.makeCell
      });

      const ctx2 = createMockMapContext(25, 25);
      const res2 = placeScenicProps({
        mapWidth: 25,
        mapHeight: 25,
        seed: 9999,
        density: 60,
        isUrban: true,
        baseLayer: ctx2.baseLayer,
        elevationLayer: ctx2.elevationLayer,
        objectLayer: ctx2.objectLayer,
        collisionGrid: ctx2.collisionGrid,
        isPathCell: ctx2.isPathCell,
        streetNetwork: { center: { x: 12, y: 12 }, xRoads: [12], yRoads: [12] },
        makeCell: ctx2.makeCell
      });

      expect(res1.placedPropsCount).toBe(res2.placedPropsCount);

      for (let y = 0; y < 25; y++) {
        for (let x = 0; x < 25; x++) {
          expect(ctx1.objectLayer[y]![x]?.tileId).toBe(ctx2.objectLayer[y]![x]?.tileId);
          expect(ctx1.collisionGrid[y]![x]).toBe(ctx2.collisionGrid[y]![x]);
        }
      }
    });
  });
});
