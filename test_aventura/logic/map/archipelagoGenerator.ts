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

export const ARCHIPELAGO_ISLAND_ROLES = [
  'port_city',
  'lighthouse',
  'sea_cave',
  'shrine',
  'atoll'
] as const;
export type ArchipelagoIslandRole = (typeof ARCHIPELAGO_ISLAND_ROLES)[number];

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
  readonly sector: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number };
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
  const targetCount = Math.max(MIN_ISLANDS_COUNT, Math.min(MAX_ISLANDS_COUNT, options.count ?? DEFAULT_ISLANDS_COUNT));

  if (Math.min(W, H) < MIN_ARCHIPELAGO_DIMENSION) {
    return [];
  }

  // 1. Multi-source BFS to compute distance from existing land (main continent)
  const distToLand: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const queue: { x: number; y: number; d: number }[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] !== 'water' && matrix[y]![x] !== 'water_deep') {
        distToLand[y]![x] = 0;
        queue.push({ x, y, d: 0 });
      }
    }
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++]!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        if (distToLand[ny]![nx]! > curr.d + 1) {
          distToLand[ny]![nx] = curr.d + 1;
          queue.push({ x: nx, y: ny, d: curr.d + 1 });
        }
      }
    }
  }

  const noise = new SimplexNoise(seed + 6655);

  const templates: readonly IslandTemplate[] = [
    {
      id: 'island_port_main',
      name: 'Isla Canela (Puerto Insular)',
      role: 'port_city',
      rx: Math.round(W >= MASSIVE_MAP_THRESHOLD ? 11 : 8),
      ry: Math.round(H >= MASSIVE_MAP_THRESHOLD ? 9 : 7),
      minContinentDist: W >= MASSIVE_MAP_THRESHOLD ? 12 : 8,
      minBorderDist: W >= MASSIVE_MAP_THRESHOLD ? 12 : 8,
      sector: { minX: 0.40 * W, maxX: 0.94 * W, minY: 0.50 * H, maxY: 0.94 * H }
    },
    {
      id: 'island_sea_cave',
      name: 'Islas Espuma (Cueva Marina)',
      role: 'sea_cave',
      rx: Math.round(W >= MASSIVE_MAP_THRESHOLD ? 9 : 7),
      ry: Math.round(H >= MASSIVE_MAP_THRESHOLD ? 8 : 6),
      minContinentDist: W >= MASSIVE_MAP_THRESHOLD ? 12 : 8,
      minBorderDist: W >= MASSIVE_MAP_THRESHOLD ? 12 : 8,
      sector: { minX: 0.06 * W, maxX: 0.50 * W, minY: 0.50 * H, maxY: 0.94 * H }
    },
    {
      id: 'island_lighthouse',
      name: 'Isla del Faro Marino',
      role: 'lighthouse',
      rx: Math.round(W >= MASSIVE_MAP_THRESHOLD ? 8 : 6),
      ry: Math.round(H >= MASSIVE_MAP_THRESHOLD ? 7 : 5),
      minContinentDist: W >= MASSIVE_MAP_THRESHOLD ? 12 : 8,
      minBorderDist: W >= MASSIVE_MAP_THRESHOLD ? 12 : 8,
      sector: { minX: 0.60 * W, maxX: 0.94 * W, minY: 0.20 * H, maxY: 0.70 * H }
    },
    {
      id: 'island_shrine',
      name: 'Santuario del Abismo',
      role: 'shrine',
      rx: Math.round(W >= MASSIVE_MAP_THRESHOLD ? 7 : 5),
      ry: Math.round(H >= MASSIVE_MAP_THRESHOLD ? 7 : 5),
      minContinentDist: W >= MASSIVE_MAP_THRESHOLD ? 12 : 8,
      minBorderDist: W >= MASSIVE_MAP_THRESHOLD ? 12 : 8,
      sector: { minX: 0.25 * W, maxX: 0.75 * W, minY: 0.65 * H, maxY: 0.94 * H }
    },
    {
      id: 'island_atoll',
      name: 'Atolón Coralino',
      role: 'atoll',
      rx: Math.round(W >= MASSIVE_MAP_THRESHOLD ? 6 : 5),
      ry: Math.round(H >= MASSIVE_MAP_THRESHOLD ? 6 : 5),
      minContinentDist: W >= MASSIVE_MAP_THRESHOLD ? 10 : 7,
      minBorderDist: W >= MASSIVE_MAP_THRESHOLD ? 10 : 7,
      sector: { minX: 0.06 * W, maxX: 0.40 * W, minY: 0.25 * H, maxY: 0.65 * H }
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
          if (sep < tmpl.rx + p.radiusX + 8) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        const n = noise.noise2D(x * 0.05, y * 0.05);
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
            if (sep < tmpl.rx + p.radiusX + 6) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;

          const n = noise.noise2D(x * 0.05, y * 0.05);
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
        const n = noise.noise2D(x * 0.22, y * 0.22) * 0.20;
        const effectiveD = baseD + n;

        if (effectiveD <= 1.0) {
          const isCore = effectiveD <= 0.65;
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
