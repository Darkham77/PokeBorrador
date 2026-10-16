/**
 * test_aventura/types/map/kantoGridModel.ts
 *
 * CANONICAL KANTO GRID CONSTANTS & OCCUPANCY DATA STRUCTURES (SSoT)
 * Decouples grid dimensions, biomes, and occupancy bitmasks from the procedural
 * generator to maintain strict unidirectional dependency flow and eliminate cycles.
 */

import type { PlacedStructure } from './kantoTileEngineTypes.ts';
import type { DynamicCatalogLoader } from '../../logic/map/kantoTileEngine.ts';

export const KANTO_WORLD_WIDTH = 3600;
export const KANTO_WORLD_HEIGHT = 4600;
export const KANTO_TILE_SIZE = 32;
export const KANTO_CHUNK_PX = 512;
export const KANTO_SPACING_MULTIPLIER = 2.5;

export const KANTO_GRID_W = Math.ceil(KANTO_WORLD_WIDTH / KANTO_TILE_SIZE); // 113
export const KANTO_GRID_H = Math.ceil(KANTO_WORLD_HEIGHT / KANTO_TILE_SIZE); // 144
export const KANTO_CHUNKS_X = Math.ceil(KANTO_WORLD_WIDTH / KANTO_CHUNK_PX); // 8
export const KANTO_CHUNKS_Y = Math.ceil(KANTO_WORLD_HEIGHT / KANTO_CHUNK_PX); // 9

// Biome cell types
export const CELL_BIOME = {
  GRASS: 0,
  DIRT_PATH: 1,
  WATER: 2,
  TALL_GRASS: 3,
  MOUNTAIN_DIRT: 4,
  LAVA: 5,
  PLAZA_STONE: 6,
  BRIDGE: 7,
  FOREST_WALL: 8
} as const;

export type CellBiomeType = (typeof CELL_BIOME)[keyof typeof CELL_BIOME];

// Occupancy Grid Bitmasks
export const OCCUPANCY_FLAGS = {
  WATER: 0x01,
  CLIFF: 0x02,
  ROAD: 0x04,
  ROAD_BUFFER: 0x08,
  BUILDING: 0x10,
  DOOR_ACCESS: 0x20,
  SIDEWALK: 0x40
} as const;

export class OccupancyGrid {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = Array.from({ length: height }, () => new Uint8Array(width));
  }

  set(x: number, y: number, flag: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const row = this.cells[y];
      if (row) row[x] = (row[x] ?? 0) | flag;
    }
  }

  clear(x: number, y: number, flag: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const row = this.cells[y];
      if (row) row[x] = (row[x] ?? 0) & ~flag;
    }
  }

  has(x: number, y: number, flag: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const row = this.cells[y];
    if (!row) return false;
    return ((row[x] ?? 0) & flag) !== 0;
  }

  reserveRect(x0: number, y0: number, w: number, h: number, flag: number): void {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        this.set(x, y, flag);
      }
    }
  }

  reserveBuffer(x0: number, y0: number, w: number, h: number, buf: number, flag: number): void {
    for (let y = y0 - buf; y < y0 + h + buf; y++) {
      for (let x = x0 - buf; x < x0 + w + buf; x++) {
        this.set(x, y, flag);
      }
    }
  }

  clearAll(): void {
    for (const r of this.cells) {
      r.fill(0);
    }
  }
}

export interface KantoNodeCoordinate {
  readonly id?: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly name: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly type: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly x: number;
  readonly y: number;
}

export interface IKantoCarverWorldContext {
  readonly loader: DynamicCatalogLoader;
  grid: Uint8Array[];
  elevation: Uint8Array[];
  occupancy: OccupancyGrid;
  trees: PlacedStructure[];
  buildings: PlacedStructure[];
  bridges: PlacedStructure[];
  props: PlacedStructure[];
  nature: PlacedStructure[];
  seed: number;
  hash(x: number, y: number, seed?: number): number;
  nodeToTile(x: number, y: number): { tx: number; ty: number };
  nodeToPx(x: number, y: number): { px: number; py: number };
}
