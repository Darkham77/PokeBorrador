/**
 * src/logic/map/organicMountainGenerator.ts
 *
 * ORGANIC PROCEDURAL MOUNTAIN GENERATOR (GBA PERSPECTIVE COMPATIBLE)
 *
 * Combines:
 *   1. 2D Simplex Fractal Brownian Motion (FBM) noise for continuous organic terrain.
 *   2. Structural Heightmap Sanitization (Footprint >= 6x6, Core >= 3x3, Buffer >= 3).
 *   3. Canonical 8-Neighbor Mountain Autotiling with 2.5D Option A South Wall projection.
 *   4. Intelligent Stair Candidate Detection and stamping connecting elevation tiers.
 */

import { SimplexNoise, fbm2DNormalized } from './noise/simplexNoise.ts';
import { sanitizeHeightmapMatrix } from './heightmapConstraints.ts';
import {
  resolveMountainMapGrid,
  type ResolvedMountainMapResult,
  type MountainPalette,
  type MountainStairLocation
} from './mountainAutotileEngine.ts';

export interface OrganicMountainOptions {
  readonly width: number;
  readonly height: number;
  readonly seed?: number;
  readonly scale?: number;
  readonly octaves?: number;
  readonly tier1Threshold?: number;
  readonly tier2Threshold?: number;
  readonly palette?: MountainPalette;
  readonly withStairs?: boolean;
  readonly maxStairsPerTier?: number;
  readonly manualStairs?: readonly MountainStairLocation[];
}

export interface OrganicMountainResult {
  readonly width: number;
  readonly height: number;
  readonly rawHeightmap: readonly (readonly number[])[];
  readonly sanitizedHeightmap: readonly (readonly number[])[];
  readonly autotileResult: ResolvedMountainMapResult;
  readonly placedStairs: readonly MountainStairLocation[];
}

const DEFAULT_SCALE = 0.05;
const DEFAULT_OCTAVES = 4;
const DEFAULT_TIER1_THRESHOLD = 0.40;
const DEFAULT_TIER2_THRESHOLD = 0.58;
const DEFAULT_PALETTE: MountainPalette = 'brown';
const DEFAULT_MAX_STAIRS = 2;

/**
 * Generates an organic raw heightmap matrix using 2D Simplex FBM noise.
 * Applies a gentle perimeter falloff so mountain plateaus form natural massifs
 * rather than truncating abruptly at map edges.
 */
export function generateOrganicHeightmap(
  width: number,
  height: number,
  options?: Pick<OrganicMountainOptions, 'seed' | 'scale' | 'octaves' | 'tier1Threshold' | 'tier2Threshold'>
): number[][] {
  const seed = options?.seed ?? 42;
  const scale = options?.scale ?? DEFAULT_SCALE;
  const octaves = options?.octaves ?? DEFAULT_OCTAVES;
  const t1 = options?.tier1Threshold ?? DEFAULT_TIER1_THRESHOLD;
  const t2 = options?.tier2Threshold ?? DEFAULT_TIER2_THRESHOLD;

  const noise = new SimplexNoise(seed);
  const matrix: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rawNoise = fbm2DNormalized(noise, x, y, { scale, octaves });

      // Edge falloff: keep margins (outer 3 tiles) as plain/ground level
      const edgeDistX = Math.min(x, width - 1 - x);
      const edgeDistY = Math.min(y, height - 1 - y);
      const margin = Math.min(edgeDistX, edgeDistY);

      let falloff = 1.0;
      if (margin < 3) {
        falloff = margin / 3.0;
      }

      const shaped = rawNoise * falloff;

      if (shaped >= t2) {
        matrix[y]![x] = 2;
      } else if (shaped >= t1) {
        matrix[y]![x] = 1;
      } else {
        matrix[y]![x] = 0;
      }
    }
  }

  return matrix;
}

/**
 * Searches the resolved mountain map for suitable 2-tile wide South cliff sections
 * that can host stairs connecting from upper elevation `fromElev` to lower elevation `toElev`.
 *
 * Requirements for candidate placement:
 *   - Exactly 2 consecutive cells at (x, y) and (x + 1, y) having role 'edge_south_top'
 *   - Upper tier cell behind stairs (x, y - 1) and (x + 1, y - 1) is free floor
 *   - Lower tier ground in front of stairs (x, y + 2) and (x + 1, y + 2) is free floor
 *   - Does not collide with existing stairs or corners
 */
export function findStairCandidates(
  matrix: readonly (readonly number[])[],
  autotileResult: ResolvedMountainMapResult,
  fromElev: number,
  toElev: number,
  maxCount = DEFAULT_MAX_STAIRS,
  existingStairs: readonly MountainStairLocation[] = [],
  isWalkableFloor?: (x: number, y: number) => boolean
): MountainStairLocation[] {
  const W = autotileResult.width;
  const H = autotileResult.height;
  const candidates: MountainStairLocation[] = [];

  const isNearExisting = (cx: number, cy: number, minDistance = 4): boolean => {
    for (const st of existingStairs) {
      if (Math.abs(st.x - cx) < minDistance && Math.abs(st.y - cy) < minDistance) {
        return true;
      }
    }
    for (const c of candidates) {
      if (Math.abs(c.x - cx) < minDistance && Math.abs(c.y - cy) < minDistance) {
        return true;
      }
    }
    return false;
  };

  // Iterate rows from top to bottom
  for (let y = 2; y < H - 3; y++) {
    for (let x = 2; x < W - 3; x++) {
      if (candidates.length >= maxCount) break;

      // Check elevation condition for the 2 stair cells
      const elevL = matrix[y]?.[x] ?? 0;
      const elevR = matrix[y]?.[x + 1] ?? 0;
      const footElevL = matrix[y + 1]?.[x] ?? 0;
      const footElevR = matrix[y + 1]?.[x + 1] ?? 0;

      if (elevL !== fromElev || elevR !== fromElev || footElevL !== toElev || footElevR !== toElev) {
        continue;
      }

      // Check autotile roles: must both be straight south top edges
      const cellL = autotileResult.cellDetails[y]?.[x];
      const cellR = autotileResult.cellDetails[y]?.[x + 1];

      if (cellL?.role !== 'edge_south_top' || cellR?.role !== 'edge_south_top') {
        continue;
      }

      // Wall Margin: left and right neighbors must ALSO be south wall drops
      // to ensure the staircase is flush-embedded in a continuous wall (never jammed against corners)
      const leftDrop = matrix[y]?.[x - 1] === fromElev && matrix[y + 1]?.[x - 1] === toElev;
      const rightDrop = matrix[y]?.[x + 2] === fromElev && matrix[y + 1]?.[x + 2] === toElev;
      if (!leftDrop || !rightDrop) {
        continue;
      }

      // Upper approach clearance (y - 1 must be pure walkable floor)
      let upperClear = true;
      for (let dx = 0; dx <= 1; dx++) {
        if (matrix[y - 1]?.[x + dx] !== fromElev) {
          upperClear = false;
          break;
        }
        const c = autotileResult.cellDetails[y - 1]?.[x + dx];
        if (c && c.role !== 'floor_center') {
          upperClear = false;
          break;
        }
      }
      if (!upperClear) continue;

      // Lower landing clearance (y + 2 must be pure walkable lower ground)
      let lowerClear = true;
      for (let dx = 0; dx <= 1; dx++) {
        if (matrix[y + 2]?.[x + dx] !== toElev) {
          lowerClear = false;
          break;
        }
        if (isWalkableFloor && !isWalkableFloor(x + dx, y + 2)) {
          lowerClear = false;
          break;
        }
      }
      if (!lowerClear) continue;

      if (!isNearExisting(x, y, 5)) {
        candidates.push({ x, y, tier: fromElev });
      }
    }
  }

  return candidates;
}

/**
 * High-level orchestration function that generates a complete organic mountain range
 * with guaranteed structural integrity and fully integrated functional stairs.
 */
export function generateOrganicMountainMap(options: OrganicMountainOptions): OrganicMountainResult {
  const W = options.width;
  const H = options.height;
  const pal = options.palette ?? DEFAULT_PALETTE;

  // 1. Raw heightmap generation via Simplex FBM noise
  const rawHeightmap = generateOrganicHeightmap(W, H, options);

  // 2. Sanitize structural heightmap constraints (Footprint >= 6x6, Core >= 3x3, Buffer >= 3)
  const sanitizedHeightmap = sanitizeHeightmapMatrix(rawHeightmap);

  // 3. Initial resolution of mountain grid
  const initialResolved = resolveMountainMapGrid(sanitizedHeightmap, pal);

  // 4. Stair placement
  const allStairs: MountainStairLocation[] = [];

  if (options.manualStairs && options.manualStairs.length > 0) {
    allStairs.push(...options.manualStairs);
  } else if (options.withStairs !== false) {
    const maxPerTier = options.maxStairsPerTier ?? DEFAULT_MAX_STAIRS;

    let maxElev = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (sanitizedHeightmap[y]![x]! > maxElev) maxElev = sanitizedHeightmap[y]![x]!;
      }
    }

    // Detect candidate stairs dynamically across all tiers from Tier 1 up to maxElev
    for (let z = 1; z <= maxElev; z++) {
      const tierStairs = findStairCandidates(
        sanitizedHeightmap,
        initialResolved,
        z,
        z - 1,
        maxPerTier,
        allStairs
      );
      allStairs.push(...tierStairs);
    }
  }

  // 5. Final resolution with stairs stamped
  const autotileResult = resolveMountainMapGrid(sanitizedHeightmap, {
    palette: pal,
    stairs: allStairs
  });

  return {
    width: W,
    height: H,
    rawHeightmap,
    sanitizedHeightmap,
    autotileResult,
    placedStairs: allStairs
  };
}
