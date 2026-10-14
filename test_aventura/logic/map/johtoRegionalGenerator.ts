/**
 * test_aventura/logic/map/johtoRegionalGenerator.ts
 *
 * JOHTO REGIONAL PROCEDURAL GENERATOR (SSoT)
 * Extends the canonical Kanto world generator with authentic Johto geography,
 * Lake of Rage hydrography, Cianwood / Whirl Islands sea channels, and Mt. Silver / Mortar massifs.
 */

import {
  KANTO_GRID_W,
  KANTO_GRID_H,
  CELL_BIOME,
  OCCUPANCY_FLAGS,
  OccupancyGrid,
  type KantoNodeCoordinate
} from '../../types/map/kantoGridModel.ts';
import { KantoRegionalWorldGenerator } from './kantoRegionalGenerator.ts';
import type { ProceduralGenerationConfig } from '../../types/map/adventureWorldTypes.ts';

// ---------------------------------------------------------------------------
// Geographic & Elevation Constants
// ---------------------------------------------------------------------------

const JOHTO_DEFAULT_SEED = 108 as const;
const JOHTO_BASE_ELEVATION = 1 as const;
const JOHTO_MOUNTAIN_ELEVATION = 3 as const;
const JOHTO_DEFAULT_ROAD_WIDTH = 2 as const;
const JOHTO_CANONICAL_TILE_SIZE = 32 as const;

// Lake of Rage bounds
const LAKE_OF_RAGE_BOUNDS = {
  MIN_Y: 16,
  MAX_Y: 28,
  MIN_X: 65,
  MAX_X: 80,
  CENTER_X: 72.5,
  CENTER_Y: 22,
  RADIUS: 6.5
} as const;

// Western Ocean bounds
const WESTERN_OCEAN_BOUNDS = {
  MIN_Y: 65,
  MAX_X: 28,
  BASE_X: 24,
  WAVE_AMPLITUDE: 1.5,
  WAVE_FREQUENCY: 0.25
} as const;

// Cianwood Island bounds
const CIANWOOD_ISLAND_BOUNDS = {
  MIN_Y: 84,
  MAX_Y: 98,
  MIN_X: 4,
  MAX_X: 14
} as const;

// Mt. Silver East Range bounds
const MT_SILVER_RANGE_BOUNDS = {
  MIN_Y: 60,
  MAX_Y: 100,
  MIN_X: 100
} as const;

// Mt. Mortar Range bounds
const MT_MORTAR_RANGE_BOUNDS = {
  MIN_Y: 35,
  MAX_Y: 45,
  MIN_X: 55,
  MAX_X: 75
} as const;

// Building Layout Constants
const BUILDING_DIMENSIONS = {
  LAB_OAK: { w: 112, h: 72 },
  HOUSE_SMALL: { w: 80, h: 56 },
  SILPH_RADIO_TOWER: { w: 140, h: 160 },
  GYM: { w: 96, h: 79 },
  POKECENTER: { w: 80, h: 70 },
  POKEMART: { w: 64, h: 62 },
  MANSION_SCHOOL: { w: 112, h: 86 }
} as const;

interface JohtoBuildingBlueprint {
  readonly style: string;
  readonly dx: number;
  readonly dy: number;
  readonly w: number;
  readonly h: number;
}

const JOHTO_CANONICAL_BUILDINGS: Record<string, readonly JohtoBuildingBlueprint[]> = {
  newbark: [
    { style: 'lab_oak', dx: 20, dy: -30, ...BUILDING_DIMENSIONS.LAB_OAK },
    { style: 'house_red', dx: -90, dy: -40, ...BUILDING_DIMENSIONS.HOUSE_SMALL },
    { style: 'house_blue', dx: -90, dy: 40, ...BUILDING_DIMENSIONS.HOUSE_SMALL }
  ],
  goldenrod: [
    { style: 'silph_tower', dx: -90, dy: -90, ...BUILDING_DIMENSIONS.SILPH_RADIO_TOWER },
    { style: 'gym', dx: 70, dy: -40, ...BUILDING_DIMENSIONS.GYM },
    { style: 'pokecenter', dx: -90, dy: 50, ...BUILDING_DIMENSIONS.POKECENTER },
    { style: 'pokemart', dx: 50, dy: 50, ...BUILDING_DIMENSIONS.POKEMART }
  ],
  ecruteak: [
    { style: 'gym_gold', dx: -100, dy: -40, ...BUILDING_DIMENSIONS.GYM },
    { style: 'pokecenter', dx: 40, dy: -40, ...BUILDING_DIMENSIONS.POKECENTER },
    { style: 'house_green', dx: -80, dy: 40, ...BUILDING_DIMENSIONS.HOUSE_SMALL }
  ],
  violet: [
    { style: 'gym', dx: -90, dy: -40, ...BUILDING_DIMENSIONS.GYM },
    { style: 'pokecenter', dx: 40, dy: -40, ...BUILDING_DIMENSIONS.POKECENTER },
    { style: 'mansion_school', dx: -80, dy: 40, ...BUILDING_DIMENSIONS.MANSION_SCHOOL }
  ]
} as const;

export class JohtoRegionalWorldGenerator extends KantoRegionalWorldGenerator {
  override generate(
    nodes: Record<string, KantoNodeCoordinate>, // domain-ok: Dynamic adventure project map
    connections: readonly (readonly [string, string])[],
    seed = JOHTO_DEFAULT_SEED,
    config?: ProceduralGenerationConfig
  ): void {
    this.seed = seed;
    this.grid = Array.from({ length: KANTO_GRID_H }, () => new Uint8Array(KANTO_GRID_W).fill(CELL_BIOME.GRASS));
    this.elevation = Array.from({ length: KANTO_GRID_H }, () => new Uint8Array(KANTO_GRID_W).fill(JOHTO_BASE_ELEVATION));
    this.occupancy = new OccupancyGrid(KANTO_GRID_W, KANTO_GRID_H);
    this.trees = [];
    this.buildings = [];
    this.bridges = [];
    this.props = [];
    this.nature = [];

    const autoOcean = config?.autoOcean ?? true;
    const autoBuildings = config?.autoBuildings ?? true;
    const roadWidth = config?.roadWidth ?? JOHTO_DEFAULT_ROAD_WIDTH;

    // 1. Johto Hydrography:
    if (autoOcean) {
      // A. Lake of Rage in the North-Center
      for (let y = LAKE_OF_RAGE_BOUNDS.MIN_Y; y <= LAKE_OF_RAGE_BOUNDS.MAX_Y; y++) {
        for (let x = LAKE_OF_RAGE_BOUNDS.MIN_X; x <= LAKE_OF_RAGE_BOUNDS.MAX_X; x++) {
          const d = Math.hypot(x - LAKE_OF_RAGE_BOUNDS.CENTER_X, y - LAKE_OF_RAGE_BOUNDS.CENTER_Y);
          if (d <= LAKE_OF_RAGE_BOUNDS.RADIUS) {
            const row = this.grid[y];
            if (row) {
              row[x] = CELL_BIOME.WATER;
              this.occupancy.set(x, y, OCCUPANCY_FLAGS.WATER);
            }
          }
        }
      }

      // B. Western Ocean & Whirl Islands Bay
      for (let y = WESTERN_OCEAN_BOUNDS.MIN_Y; y < KANTO_GRID_H; y++) {
        for (let x = 0; x < WESTERN_OCEAN_BOUNDS.MAX_X; x++) {
          const wave = Math.sin(y * WESTERN_OCEAN_BOUNDS.WAVE_FREQUENCY) * WESTERN_OCEAN_BOUNDS.WAVE_AMPLITUDE;
          if (x < WESTERN_OCEAN_BOUNDS.BASE_X + wave) {
            const row = this.grid[y];
            if (row) {
              row[x] = CELL_BIOME.WATER;
              this.occupancy.set(x, y, OCCUPANCY_FLAGS.WATER);
            }
          }
        }
      }

      // C. Cianwood Island
      for (let y = CIANWOOD_ISLAND_BOUNDS.MIN_Y; y <= CIANWOOD_ISLAND_BOUNDS.MAX_Y; y++) {
        for (let x = CIANWOOD_ISLAND_BOUNDS.MIN_X; x <= CIANWOOD_ISLAND_BOUNDS.MAX_X; x++) {
          const row = this.grid[y];
          if (row) {
            row[x] =
              x === CIANWOOD_ISLAND_BOUNDS.MIN_X ||
              x === CIANWOOD_ISLAND_BOUNDS.MAX_X ||
              y === CIANWOOD_ISLAND_BOUNDS.MIN_Y ||
              y === CIANWOOD_ISLAND_BOUNDS.MAX_Y
                ? CELL_BIOME.DIRT_PATH
                : CELL_BIOME.GRASS;
            this.occupancy.clear(x, y, OCCUPANCY_FLAGS.WATER);
          }
        }
      }
    }

    // 2. Johto Mountain Chains: Mt. Silver on East border & Mt. Mortar in North-Center
    for (let y = MT_SILVER_RANGE_BOUNDS.MIN_Y; y <= MT_SILVER_RANGE_BOUNDS.MAX_Y; y++) {
      for (let x = MT_SILVER_RANGE_BOUNDS.MIN_X; x < KANTO_GRID_W; x++) {
        const row = this.grid[y];
        const eRow = this.elevation[y];
        if (row && eRow && row[x] !== CELL_BIOME.WATER) {
          row[x] = CELL_BIOME.MOUNTAIN_DIRT;
          eRow[x] = JOHTO_MOUNTAIN_ELEVATION;
          this.occupancy.set(x, y, OCCUPANCY_FLAGS.CLIFF);
        }
      }
    }

    for (let y = MT_MORTAR_RANGE_BOUNDS.MIN_Y; y <= MT_MORTAR_RANGE_BOUNDS.MAX_Y; y++) {
      for (let x = MT_MORTAR_RANGE_BOUNDS.MIN_X; x <= MT_MORTAR_RANGE_BOUNDS.MAX_X; x++) {
        const row = this.grid[y];
        const eRow = this.elevation[y];
        if (row && eRow && row[x] !== CELL_BIOME.WATER) {
          row[x] = CELL_BIOME.MOUNTAIN_DIRT;
          eRow[x] = JOHTO_MOUNTAIN_ELEVATION;
          this.occupancy.set(x, y, OCCUPANCY_FLAGS.CLIFF);
        }
      }
    }

    // 3. Roads & Trails connecting active nodes
    connections.forEach(([idA, idB]) => {
      const nA = nodes[idA];
      const nB = nodes[idB];
      if (!nA || !nB) return;
      if (nA.type === 'route_water' || nB.type === 'route_water') return;

      const pA = this.nodeToTile(nA.x, nA.y);
      const pB = this.nodeToTile(nB.x, nB.y);
      this.rasterizePathLocal(pA.tx, pA.ty, pB.tx, pB.ty, roadWidth);
    });

    // 4. Place Iconic Johto Architectures
    if (autoBuildings) {
      this.placeJohtoBuildings(nodes);
    }
  }

  private rasterizePathLocal(x0: number, y0: number, x1: number, y1: number, width: number = JOHTO_DEFAULT_ROAD_WIDTH): void {
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let cx = x0;
    let cy = y0;

    while (true) {
      const halfW = Math.floor(width / 2);
      for (let wy = -halfW; wy <= halfW; wy++) {
        for (let wx = -halfW; wx <= halfW; wx++) {
          const px = cx + wx;
          const py = cy + wy;
          if (px >= 0 && px < KANTO_GRID_W && py >= 0 && py < KANTO_GRID_H) {
            const row = this.grid[py];
            if (row) {
              if (row[px] === CELL_BIOME.WATER) {
                row[px] = CELL_BIOME.BRIDGE;
                this.occupancy.set(px, py, OCCUPANCY_FLAGS.ROAD);
              } else {
                row[px] = CELL_BIOME.DIRT_PATH;
                this.occupancy.set(px, py, OCCUPANCY_FLAGS.ROAD);
              }
            }
          }
        }
      }
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        cx += sx;
      }
      if (e2 <= dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  private placeJohtoBuildings(nodes: Record<string, KantoNodeCoordinate>): void { // domain-ok: Dynamic adventure project map
    const T = JOHTO_CANONICAL_TILE_SIZE;
    const addBldg = (style: string, px: number, py: number, w: number, h: number): void => {
      this.buildings.push({ style, x: px, y: py, w, h });
      const tx = Math.floor(px / T);
      const ty = Math.floor(py / T);
      const bw = Math.ceil(w / T);
      const bh = Math.ceil(h / T);
      this.occupancy.reserveRect(tx, ty, bw, bh, OCCUPANCY_FLAGS.BUILDING);
    };

    for (const [townId, townBuildings] of Object.entries(JOHTO_CANONICAL_BUILDINGS)) {
      const node = nodes[townId];
      if (!node) continue;
      const pt = this.nodeToPx(node.x, node.y);
      for (const b of townBuildings) {
        addBldg(b.style, pt.px + b.dx, pt.py + b.dy, b.w, b.h);
      }
    }
  }
}
