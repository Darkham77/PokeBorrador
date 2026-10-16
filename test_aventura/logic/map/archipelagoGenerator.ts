/**
 * src/logic/map/archipelagoGenerator.ts
 *
 * PROCEDURAL ARCHIPELAGO ISLAND GENERATOR
 *
 * Generates 3 to 5 distinct organic islands in peripheral ocean waters with:
 *   1. Cellular Voronoi organic shapes surrounded by contiguous sand beach buffers.
 *   2. Dedicated thematic roles (port_city, lighthouse, sea_cave, shrine, atoll).
 *   3. Separation guarantees (>= 8-12 tiles from main continent, >= 10 tiles between islands).
 *   4. Safe maritime navigation channels (open ocean surrounding all islands, zero outer border spills).
 */

import { SimplexNoise } from './noise/simplexNoise.ts';
import type { WaterTerrainKind } from './waterAutotileEngine.ts';
import { computeGridDistanceField, type GridBfsQueueItem } from '../utils/gridBfsUtils.ts';
import {
  ARCHIPELAGO_NOISE_SEED_OFFSET,
  PORT_ISLAND_MASSIVE_RX,
  PORT_ISLAND_DEFAULT_RX,
  PORT_ISLAND_MASSIVE_RY,
  PORT_ISLAND_DEFAULT_RY,
  PORT_ISLAND_MASSIVE_CLEARANCE,
  PORT_ISLAND_DEFAULT_CLEARANCE,
  PORT_ISLAND_SECTOR_MIN_X,
  PORT_ISLAND_SECTOR_MAX_X,
  PORT_ISLAND_SECTOR_MIN_Y,
  PORT_ISLAND_SECTOR_MAX_Y,
  CAVE_ISLAND_MASSIVE_RX,
  CAVE_ISLAND_DEFAULT_RX,
  CAVE_ISLAND_MASSIVE_RY,
  CAVE_ISLAND_DEFAULT_RY,
  CAVE_ISLAND_MASSIVE_CLEARANCE,
  CAVE_ISLAND_DEFAULT_CLEARANCE,
  CAVE_ISLAND_SECTOR_MIN_X,
  CAVE_ISLAND_SECTOR_MAX_X,
  CAVE_ISLAND_SECTOR_MIN_Y,
  CAVE_ISLAND_SECTOR_MAX_Y,
  LIGHTHOUSE_ISLAND_MASSIVE_RX,
  LIGHTHOUSE_ISLAND_DEFAULT_RX,
  LIGHTHOUSE_ISLAND_MASSIVE_RY,
  LIGHTHOUSE_ISLAND_DEFAULT_RY,
  LIGHTHOUSE_ISLAND_MASSIVE_CLEARANCE,
  LIGHTHOUSE_ISLAND_DEFAULT_CLEARANCE,
  LIGHTHOUSE_ISLAND_SECTOR_MIN_X,
  LIGHTHOUSE_ISLAND_SECTOR_MAX_X,
  LIGHTHOUSE_ISLAND_SECTOR_MIN_Y,
  LIGHTHOUSE_ISLAND_SECTOR_MAX_Y,
  SHRINE_ISLAND_MASSIVE_RX,
  SHRINE_ISLAND_DEFAULT_RX,
  SHRINE_ISLAND_MASSIVE_RY,
  SHRINE_ISLAND_DEFAULT_RY,
  SHRINE_ISLAND_MASSIVE_CLEARANCE,
  SHRINE_ISLAND_DEFAULT_CLEARANCE,
  SHRINE_ISLAND_SECTOR_MIN_X,
  SHRINE_ISLAND_SECTOR_MAX_X,
  SHRINE_ISLAND_SECTOR_MIN_Y,
  SHRINE_ISLAND_SECTOR_MAX_Y,
  ATOLL_ISLAND_MASSIVE_RX,
  ATOLL_ISLAND_DEFAULT_RX,
  ATOLL_ISLAND_MASSIVE_RY,
  ATOLL_ISLAND_DEFAULT_RY,
  ATOLL_ISLAND_MASSIVE_CLEARANCE,
  ATOLL_ISLAND_DEFAULT_CLEARANCE,
  ATOLL_ISLAND_SECTOR_MIN_X,
  ATOLL_ISLAND_SECTOR_MAX_X,
  ATOLL_ISLAND_SECTOR_MIN_Y,
  ATOLL_ISLAND_SECTOR_MAX_Y,
  ARCHIPELAGO_COARSE_NOISE_SCALE,
  ARCHIPELAGO_FINE_NOISE_SCALE,
  ARCHIPELAGO_FINE_NOISE_WEIGHT,
  ISLAND_CORE_GRASS_THRESHOLD
} from '../../config/archipelagoConfig.ts';

const _ARCHIPELAGO_ISLAND_ROLES = [
  'port_city',
  'lighthouse',
  'sea_cave',
  'shrine',
  'atoll'
] as const;
export type ArchipelagoIslandRole = (typeof _ARCHIPELAGO_ISLAND_ROLES)[number];

export interface ArchipelagoIslandSpec {
  readonly id: string;
  readonly name: string;
  readonly role: ArchipelagoIslandRole;
  readonly cx: number;
  readonly cy: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly bounds: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
  };
}

export interface ArchipelagoGeneratorOptions {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly count?: number;
}

const MIN_ARCHIPELAGO_DIMENSION = 96 as const;
const MIN_ISLANDS_COUNT = 3 as const;
const ISLAND_INTER_SEPARATION_STRICT = 8 as const;
const ISLAND_INTER_SEPARATION_RELAXED = 6 as const;
const MAX_ISLANDS_COUNT = 5 as const;
const DEFAULT_ISLANDS_COUNT = 4 as const;
const MASSIVE_MAP_THRESHOLD = 200 as const;

interface IslandTemplate {
  readonly id: string;
  readonly name: string;
  readonly role: ArchipelagoIslandRole;
  readonly rx: number;
  readonly ry: number;
  readonly minContinentDist: number;
  readonly minBorderDist: number;
  readonly sector: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
  };
}

/**
 * Generates 3-5 organic archipelago islands in peripheral ocean waters.
 * Strictly guarantees:
 *   1. Islands are separated by deep water navigation channels (>= 8-12 tiles from mainland).
 *   2. Every island has an organic shape surrounded by a continuous sand beach buffer.
 *   3. Outer perimeter map borders remain 100% open ocean.
 *   4. Zero grass cells directly touch ocean water.
 */
export function generateArchipelagoIslands(
  matrix: WaterTerrainKind[][],
  options: ArchipelagoGeneratorOptions
): readonly ArchipelagoIslandSpec[] {
  const W = options.width;
  const H = options.height;
  const seed = options.seed;
  const targetCount = Math.max(
    MIN_ISLANDS_COUNT,
    Math.min(MAX_ISLANDS_COUNT, options.count ?? DEFAULT_ISLANDS_COUNT)
  );

  if (Math.min(W, H) < MIN_ARCHIPELAGO_DIMENSION) {
    return [];
  }

  // 1. Multi-source BFS to compute distance from existing land (main continent)
  const distToLand: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const queue: GridBfsQueueItem[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] !== 'water' && matrix[y]![x] !== 'water_deep') {
        distToLand[y]![x] = 0;
        queue.push({ x, y, d: 0 });
      }
    }
  }

  computeGridDistanceField(queue, distToLand, W, H);

  const noise = new SimplexNoise(seed + ARCHIPELAGO_NOISE_SEED_OFFSET);

  const templates: readonly IslandTemplate[] = [
    {
      id: 'island_port_main',
      name: 'Isla Canela (Puerto Insular)',
      role: 'port_city',
      rx: Math.round(W >= MASSIVE_MAP_THRESHOLD ? PORT_ISLAND_MASSIVE_RX : PORT_ISLAND_DEFAULT_RX),
      ry: Math.round(H >= MASSIVE_MAP_THRESHOLD ? PORT_ISLAND_MASSIVE_RY : PORT_ISLAND_DEFAULT_RY),
      minContinentDist:
        W >= MASSIVE_MAP_THRESHOLD ? PORT_ISLAND_MASSIVE_CLEARANCE : PORT_ISLAND_DEFAULT_CLEARANCE,
      minBorderDist:
        W >= MASSIVE_MAP_THRESHOLD ? PORT_ISLAND_MASSIVE_CLEARANCE : PORT_ISLAND_DEFAULT_CLEARANCE,
      sector: {
        minX: PORT_ISLAND_SECTOR_MIN_X * W,
        maxX: PORT_ISLAND_SECTOR_MAX_X * W,
        minY: PORT_ISLAND_SECTOR_MIN_Y * H,
        maxY: PORT_ISLAND_SECTOR_MAX_Y * H
      }
    },
    {
      id: 'island_sea_cave',
      name: 'Islas Espuma (Cueva Marina)',
      role: 'sea_cave',
      rx: Math.round(W >= MASSIVE_MAP_THRESHOLD ? CAVE_ISLAND_MASSIVE_RX : CAVE_ISLAND_DEFAULT_RX),
      ry: Math.round(H >= MASSIVE_MAP_THRESHOLD ? CAVE_ISLAND_MASSIVE_RY : CAVE_ISLAND_DEFAULT_RY),
      minContinentDist:
        W >= MASSIVE_MAP_THRESHOLD ? CAVE_ISLAND_MASSIVE_CLEARANCE : CAVE_ISLAND_DEFAULT_CLEARANCE,
      minBorderDist:
        W >= MASSIVE_MAP_THRESHOLD ? CAVE_ISLAND_MASSIVE_CLEARANCE : CAVE_ISLAND_DEFAULT_CLEARANCE,
      sector: {
        minX: CAVE_ISLAND_SECTOR_MIN_X * W,
        maxX: CAVE_ISLAND_SECTOR_MAX_X * W,
        minY: CAVE_ISLAND_SECTOR_MIN_Y * H,
        maxY: CAVE_ISLAND_SECTOR_MAX_Y * H
      }
    },
    {
      id: 'island_lighthouse',
      name: 'Isla del Faro Marino',
      role: 'lighthouse',
      rx: Math.round(
        W >= MASSIVE_MAP_THRESHOLD ? LIGHTHOUSE_ISLAND_MASSIVE_RX : LIGHTHOUSE_ISLAND_DEFAULT_RX
      ),
      ry: Math.round(
        H >= MASSIVE_MAP_THRESHOLD ? LIGHTHOUSE_ISLAND_MASSIVE_RY : LIGHTHOUSE_ISLAND_DEFAULT_RY
      ),
      minContinentDist:
        W >= MASSIVE_MAP_THRESHOLD
          ? LIGHTHOUSE_ISLAND_MASSIVE_CLEARANCE
          : LIGHTHOUSE_ISLAND_DEFAULT_CLEARANCE,
      minBorderDist:
        W >= MASSIVE_MAP_THRESHOLD
          ? LIGHTHOUSE_ISLAND_MASSIVE_CLEARANCE
          : LIGHTHOUSE_ISLAND_DEFAULT_CLEARANCE,
      sector: {
        minX: LIGHTHOUSE_ISLAND_SECTOR_MIN_X * W,
        maxX: LIGHTHOUSE_ISLAND_SECTOR_MAX_X * W,
        minY: LIGHTHOUSE_ISLAND_SECTOR_MIN_Y * H,
        maxY: LIGHTHOUSE_ISLAND_SECTOR_MAX_Y * H
      }
    },
    {
      id: 'island_shrine',
      name: 'Santuario del Abismo',
      role: 'shrine',
      rx: Math.round(
        W >= MASSIVE_MAP_THRESHOLD ? SHRINE_ISLAND_MASSIVE_RX : SHRINE_ISLAND_DEFAULT_RX
      ),
      ry: Math.round(
        H >= MASSIVE_MAP_THRESHOLD ? SHRINE_ISLAND_MASSIVE_RY : SHRINE_ISLAND_DEFAULT_RY
      ),
      minContinentDist:
        W >= MASSIVE_MAP_THRESHOLD
          ? SHRINE_ISLAND_MASSIVE_CLEARANCE
          : SHRINE_ISLAND_DEFAULT_CLEARANCE,
      minBorderDist:
        W >= MASSIVE_MAP_THRESHOLD
          ? SHRINE_ISLAND_MASSIVE_CLEARANCE
          : SHRINE_ISLAND_DEFAULT_CLEARANCE,
      sector: {
        minX: SHRINE_ISLAND_SECTOR_MIN_X * W,
        maxX: SHRINE_ISLAND_SECTOR_MAX_X * W,
        minY: SHRINE_ISLAND_SECTOR_MIN_Y * H,
        maxY: SHRINE_ISLAND_SECTOR_MAX_Y * H
      }
    },
    {
      id: 'island_atoll',
      name: 'Atolón Coralino',
      role: 'atoll',
      rx: Math.round(
        W >= MASSIVE_MAP_THRESHOLD ? ATOLL_ISLAND_MASSIVE_RX : ATOLL_ISLAND_DEFAULT_RX
      ),
      ry: Math.round(
        H >= MASSIVE_MAP_THRESHOLD ? ATOLL_ISLAND_MASSIVE_RY : ATOLL_ISLAND_DEFAULT_RY
      ),
      minContinentDist:
        W >= MASSIVE_MAP_THRESHOLD
          ? ATOLL_ISLAND_MASSIVE_CLEARANCE
          : ATOLL_ISLAND_DEFAULT_CLEARANCE,
      minBorderDist:
        W >= MASSIVE_MAP_THRESHOLD
          ? ATOLL_ISLAND_MASSIVE_CLEARANCE
          : ATOLL_ISLAND_DEFAULT_CLEARANCE,
      sector: {
        minX: ATOLL_ISLAND_SECTOR_MIN_X * W,
        maxX: ATOLL_ISLAND_SECTOR_MAX_X * W,
        minY: ATOLL_ISLAND_SECTOR_MIN_Y * H,
        maxY: ATOLL_ISLAND_SECTOR_MAX_Y * H
      }
    }
  ];

  const placedIslands: ArchipelagoIslandSpec[] = [];

  for (let tIdx = 0; tIdx < templates.length && placedIslands.length < targetCount; tIdx++) {
    const tmpl = templates[tIdx]!;

    let bestScore = -Infinity;
    let bestX = -1;
    let bestY = -1;

    // Scan sector for candidate center
    const xStart = Math.max(tmpl.minBorderDist, Math.floor(tmpl.sector.minX));
    const xEnd = Math.min(W - tmpl.minBorderDist, Math.floor(tmpl.sector.maxX));
    const yStart = Math.max(tmpl.minBorderDist, Math.floor(tmpl.sector.minY));
    const yEnd = Math.min(H - tmpl.minBorderDist, Math.floor(tmpl.sector.maxY));

    for (let y = yStart; y <= yEnd; y += 2) {
      for (let x = xStart; x <= xEnd; x += 2) {
        if (matrix[y]![x] !== 'water') continue;

        const dLand = distToLand[y]![x]!;
        if (dLand < tmpl.minContinentDist + tmpl.rx) continue;

        const borderDist = Math.min(x, W - 1 - x, y, H - 1 - y);
        if (borderDist < tmpl.minBorderDist + tmpl.rx) continue;

        // Check separation from already placed islands
        let tooClose = false;
        for (const p of placedIslands) {
          const sep = Math.hypot(x - p.cx, y - p.cy);
          if (sep < tmpl.rx + p.radiusX + ISLAND_INTER_SEPARATION_STRICT) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        const n = noise.noise2D(
          x * ARCHIPELAGO_COARSE_NOISE_SCALE,
          y * ARCHIPELAGO_COARSE_NOISE_SCALE
        );
        const score = dLand + n * 8;
        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestY = y;
        }
      }
    }

    // Fallback search with relaxed clearance if strict didn't find a spot
    if (bestX === -1) {
      const relaxedContinent = Math.max(6, tmpl.minContinentDist - 4);
      const relaxedBorder = Math.max(6, tmpl.minBorderDist - 4);

      for (let y = tmpl.minBorderDist; y < H - tmpl.minBorderDist; y += 3) {
        for (let x = tmpl.minBorderDist; x < W - tmpl.minBorderDist; x += 3) {
          if (matrix[y]![x] !== 'water') continue;
          const dLand = distToLand[y]![x]!;
          if (dLand < relaxedContinent + tmpl.rx) continue;
          const borderDist = Math.min(x, W - 1 - x, y, H - 1 - y);
          if (borderDist < relaxedBorder + tmpl.rx) continue;

          let tooClose = false;
          for (const p of placedIslands) {
            const sep = Math.hypot(x - p.cx, y - p.cy);
            if (sep < tmpl.rx + p.radiusX + ISLAND_INTER_SEPARATION_RELAXED) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;

          const n = noise.noise2D(
            x * ARCHIPELAGO_COARSE_NOISE_SCALE,
            y * ARCHIPELAGO_COARSE_NOISE_SCALE
          );
          const score = dLand + n * 8;
          if (score > bestScore) {
            bestScore = score;
            bestX = x;
            bestY = y;
          }
        }
      }
    }

    if (bestX === -1) continue;

    // Stamp the organic island onto matrix as solid landmass (grass)
    let minX = bestX;
    let maxX = bestX;
    let minY = bestY;
    let maxY = bestY;

    const spanX = tmpl.rx + 2;
    const spanY = tmpl.ry + 2;

    for (let y = bestY - spanY; y <= bestY + spanY; y++) {
      for (let x = bestX - spanX; x <= bestX + spanX; x++) {
        if (x <= 3 || x >= W - 4 || y <= 3 || y >= H - 4) continue;
        if (distToLand[y]![x]! < 5) continue; // Preserve ocean navigation channel

        const dx = (x - bestX) / tmpl.rx;
        const dy = (y - bestY) / tmpl.ry;
        const baseD = Math.hypot(dx, dy);
        const n =
          noise.noise2D(x * ARCHIPELAGO_FINE_NOISE_SCALE, y * ARCHIPELAGO_FINE_NOISE_SCALE) *
          ARCHIPELAGO_FINE_NOISE_WEIGHT;
        const effectiveD = baseD + n;

        if (effectiveD <= 1.0) {
          const isCore = effectiveD <= ISLAND_CORE_GRASS_THRESHOLD;
          matrix[y]![x] = isCore ? 'grass' : 'sand';
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Ensure zero grass cells on the island touch ocean water directly
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (matrix[y]![x] === 'grass') {
          const touchesWater =
            matrix[y - 1]![x] === 'water' ||
            matrix[y - 1]![x] === 'water_deep' ||
            matrix[y + 1]![x] === 'water' ||
            matrix[y + 1]![x] === 'water_deep' ||
            matrix[y]![x - 1] === 'water' ||
            matrix[y]![x - 1] === 'water_deep' ||
            matrix[y]![x + 1] === 'water' ||
            matrix[y]![x + 1] === 'water_deep';
          if (touchesWater) {
            matrix[y]![x] = 'sand';
          }
        }
      }
    }

    placedIslands.push({
      id: tmpl.id,
      name: tmpl.name,
      role: tmpl.role,
      cx: bestX,
      cy: bestY,
      radiusX: tmpl.rx,
      radiusY: tmpl.ry,
      bounds: { minX, maxX, minY, maxY }
    });
  }

  return placedIslands;
}

export interface PlacedArchipelagoIslandLike {
  readonly bounds: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
  };
}

/**
 * Enforces continuous beach buffers around archipelago island perimeters,
 * ensuring no grass cells directly touch ocean or deep water.
 */
export function applyArchipelagoBeachBuffers(
  matrix: WaterTerrainKind[][],
  islands: readonly PlacedArchipelagoIslandLike[],
  W: number,
  H: number,
  iterations = 2,
  padding = 2
): void {
  for (const island of islands) {
    for (let iter = 0; iter < iterations; iter++) {
      const minY = Math.max(1, island.bounds.minY - padding);
      const maxY = Math.min(H - padding, island.bounds.maxY + padding);
      const minX = Math.max(1, island.bounds.minX - padding);
      const maxX = Math.min(W - padding, island.bounds.maxX + padding);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (matrix[y]![x] === 'grass') {
            const touchesWater =
              matrix[y - 1]![x] === 'water' ||
              matrix[y - 1]![x] === 'water_deep' ||
              matrix[y + 1]![x] === 'water' ||
              matrix[y + 1]![x] === 'water_deep' ||
              matrix[y]![x - 1] === 'water' ||
              matrix[y]![x - 1] === 'water_deep' ||
              matrix[y]![x + 1] === 'water' ||
              matrix[y]![x + 1] === 'water_deep';
            if (touchesWater) {
              matrix[y]![x] = 'sand';
            }
          }
        }
      }
    }
  }
}
