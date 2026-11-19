/**
 * src/logic/map/continentMountainEngine.ts
 *
 * PROCEDURAL CONTINENTAL MOUNTAIN & MULTI-TIER MASSIF ENGINE
 *
 * Handles:
 *   1. Modulated 2D ridge noise synthesis with central valley suppression.
 *   2. Procedural multi-tier massif elevation scaling (1 to 4 floors based on mass).
 *   3. Concentric cushion buffering guaranteeing zero cardinal drops > 1 elevation.
 *   4. Stair placement across all active tiers (Z to Z-1) with walkable landing floor validation.
 */

import {
  MOUNTAIN_NOISE_PRIMARY_SEED_OFFSET,
  MOUNTAIN_NOISE_SECONDARY_SEED_OFFSET,
  VALLEY_NOISE_SEED_OFFSET,
  MAX_MOUNTAIN_SCALE,
  MIN_MOUNTAIN_SCALE,
  RIDGE_AMPLITUDE_MULTIPLIER,
  RIDGE_PRIMARY_WEIGHT,
  RIDGE_SECONDARY_WEIGHT,
  VALLEY_CENTER_SCALE_RATIO,
  VALLEY_SUPP_RADIUS_LARGE,
  VALLEY_SUPP_RADIUS_SMALL,
  VALLEY_SECONDARY_SUPPRESSION_FACTOR,
  MIN_MOUNTAIN_PERCENT_CLAMP,
  TIER_2_MOUNTAIN_COUNT_RATIO,
  TIER_2_MIN_DELTA,
  TIER_2_FALLBACK_DELTA,
  LEAGUE_MASSIF_HEIGHT,
  LEAGUE_PLATEAU_MIN_HEIGHT,
  LAKE_RIM_THRESHOLD_RATIO,
  MAX_MOUNTAIN_CLEARANCE_DISTANCE
} from '../../config/continentMountainConfig.ts';
import { LEAGUE_PLATEAU_HEIGHT_OFFSET } from '../../config/poiPlacementConfig.ts';
import { CONTINENT_DEFAULT_SEED, DEFAULT_MOUNTAIN_PALETTE } from '../../config/studioConstants.ts';
import { floodFillGrid, type GridPoint } from '../utils/gridBfsUtils.ts';
import type { ContinentGeneratorOptions } from './continentGenerator.ts';
import { clusterMountainMassifs, type GeologicalClusterResult } from './geologicalClusterEngine.ts';
import { sanitizeHeightmapMatrix } from './heightmapConstraints.ts';
import {
  resolveMountainMapGrid,
  normalizeHeightmapDiagonals,
  type ResolvedMountainMapResult,
  type MountainStairLocation
} from './mountainAutotileEngine.ts';
import { SimplexNoise } from './noise/simplexNoise.ts';
import { findStairCandidates } from './organicMountainGenerator.ts';
import type { WaterTerrainMatrix, WaterTerrainKind } from './waterAutotileEngine.ts';

const CORDILLERA_TIER_4_MIN_CELLS = 240 as const;
const MASSIF_TIER_3_MIN_CELLS = 130 as const;
export const MASSIF_TIER_2_MIN_CELLS = 25 as const;
const CAVE_MASSIF_LATERAL_RADIUS = 6 as const;
const CAVE_ROOF_TERRACE_DEPTH = -3 as const;
const CAVE_ROOF_TERRACE_RADIUS = 3 as const;
const CAVE_ROOF_TERRACE_MIN_DY = -1 as const;
const CAVE_MASSIF_BACKING_MAX_DY = -4 as const;
const MASSIF_TIER_2_RADIUS = 6 as const;
const DEFAULT_MOUNTAIN_RATIO = 0.2 as const;
const MIN_RIDGE_PRUNE_ELEVATION = 2 as const;

export function isCellAdjacentToMountainStairs(
  x: number,
  y: number,
  cellDetails: readonly (readonly ({ readonly role: string } | null | undefined)[])[],
  width: number,
  height: number
): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ny = y + dy;
      const nx = x + dx;
      if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
        const mCell = cellDetails[ny]?.[nx];
        if (mCell?.role.includes('stairs')) {
          return true;
        }
      }
    }
  }
  return false;
}

interface RectangularZoneBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

interface ZoneRectangleArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly margin?: number;
}

function computeClampedZoneBounds(
  zone: ZoneRectangleArea,
  width: number,
  height: number,
  customHeight?: number
): RectangularZoneBounds {
  const m = zone.margin ?? 0;
  const h = customHeight ?? zone.height;
  return {
    minX: Math.max(0, zone.x - m),
    maxX: Math.min(width - 1, zone.x + zone.width + m),
    minY: Math.max(0, zone.y - m),
    maxY: Math.min(height - 1, zone.y + h)
  };
}

function applyPlateauGrassElevation(
  heightmap: number[][],
  terrainMatrix: readonly (readonly string[])[],
  bounds: RectangularZoneBounds,
  targetElevation: number
): void {
  for (let y = bounds.minY; y < bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (terrainMatrix[y]?.[x] === 'grass') {
        heightmap[y]![x] = targetElevation;
      }
    }
  }
}

interface MassifRingElevationParams {
  readonly px: number;
  readonly py: number;
  readonly radius: number;
  readonly width: number;
  readonly height: number;
  readonly minClearance: number;
  readonly targetElevation: number;
}

function expandMassifTierRing(
  heightmap: number[][],
  mtnClearance: readonly (readonly number[])[],
  params: MassifRingElevationParams
): void {
  const { px, py, radius, width, height, minClearance, targetElevation } = params;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const ny = py + dy;
      const nx = px + dx;
      if (
        ny >= 0 &&
        ny < height &&
        nx >= 0 &&
        nx < width &&
        heightmap[ny]![nx]! >= 1 &&
        mtnClearance[ny]![nx]! >= minClearance
      ) {
        heightmap[ny]![nx] = Math.max(heightmap[ny]![nx]!, targetElevation);
      }
    }
  }
}

function applySolidSummitElevation(
  heightmap: number[][],
  px: number,
  py: number,
  radius: number,
  width: number,
  height: number,
  elevation: number
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const ny = py + dy;
      const nx = px + dx;
      if (ny >= 0 && ny < height && nx >= 0 && nx < width && heightmap[ny]![nx]! >= 1) {
        heightmap[ny]![nx] = Math.max(heightmap[ny]![nx]!, elevation);
      }
    }
  }
}

function findBestMassifPeak(
  massif: readonly { readonly x: number; readonly y: number }[],
  mtnClearance: readonly (readonly number[])[],
  mountainScores: readonly (readonly number[])[],
  minClearance: number
): { readonly x: number; readonly y: number } | null {
  let bestPeak: { readonly x: number; readonly y: number } | null = null;
  let bestScore = -1;
  for (const c of massif) {
    if (mtnClearance[c.y]![c.x]! >= minClearance) {
      const s = mtnClearance[c.y]![c.x]! * 100 + mountainScores[c.y]![c.x]!;
      if (s > bestScore) {
        bestScore = s;
        bestPeak = c;
      }
    }
  }
  return bestPeak;
}

function findHighestScoreMassifCell(
  massif: readonly { readonly x: number; readonly y: number }[],
  mountainScores: readonly (readonly number[])[]
): { readonly x: number; readonly y: number } | null {
  let bestCell: { readonly x: number; readonly y: number } | null = null;
  let bestScore = -1;
  for (const c of massif) {
    const s = mountainScores[c.y]![c.x]!;
    if (s > bestScore) {
      bestScore = s;
      bestCell = c;
    }
  }
  return bestCell;
}

function computeLakeMaxNearScore(
  lakeCells: readonly { readonly x: number; readonly y: number }[],
  mountainScores: readonly (readonly number[])[],
  validZone: readonly (readonly boolean[])[],
  width: number,
  height: number
): number {
  const LAKE_SCAN_RADIUS = 3 as const;
  let maxNearScore = 0;
  for (const pt of lakeCells) {
    for (let dy = -LAKE_SCAN_RADIUS; dy <= LAKE_SCAN_RADIUS; dy++) {
      for (let dx = -LAKE_SCAN_RADIUS; dx <= LAKE_SCAN_RADIUS; dx++) {
        const nx = pt.x + dx;
        const ny = pt.y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || !validZone[ny]![nx]) continue;
        const s = mountainScores[ny]![nx]!;
        if (s > maxNearScore) maxNearScore = s;
      }
    }
  }
  return maxNearScore;
}

function applyLakeBasinRimRelief(
  lakeCells: readonly { readonly x: number; readonly y: number }[],
  rawHeightmap: number[][],
  mountainScores: readonly (readonly number[])[],
  validZone: readonly (readonly boolean[])[],
  rimThreshold: number,
  width: number,
  height: number
): void {
  const LAKE_RIM_RELIEF_RADIUS = 2 as const;
  for (const pt of lakeCells) {
    for (let dy = -LAKE_RIM_RELIEF_RADIUS; dy <= LAKE_RIM_RELIEF_RADIUS; dy++) {
      for (let dx = -LAKE_RIM_RELIEF_RADIUS; dx <= LAKE_RIM_RELIEF_RADIUS; dx++) {
        const nx = pt.x + dx;
        const ny = pt.y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || !validZone[ny]![nx]) continue;
        if (mountainScores[ny]![nx]! >= rimThreshold) {
          rawHeightmap[ny]![nx] = Math.max(1, rawHeightmap[ny]![nx]!);
        }
      }
    }
  }
}

/**
 * Prunes isolated pits, tiny depressions, and orphan U/L wall fragments inside mountain plateaus.
 */
function pruneOrphanCliffWalls(
  heightmap: number[][],
  isWaterCell?: (x: number, y: number) => boolean
): number[][] {
  const H = heightmap.length;
  if (H === 0) return heightmap;
  const W = heightmap[0]?.length ?? 0;

  const result = heightmap.map((row) => [...row]);

  // Pass 1: Fill sunken 1-cell or 2-cell pits completely surrounded by higher elevation
  for (let iter = 0; iter < 2; iter++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (isWaterCell?.(x, y)) continue;
        const cur = result[y]![x]!;
        const neighbors = [
          result[y - 1]![x]!,
          result[y + 1]![x]!,
          result[y]![x - 1]!,
          result[y]![x + 1]!
        ];
        const minNeighbor = Math.min(...neighbors);
        if (minNeighbor > cur) {
          result[y]![x] = minNeighbor;
        }
      }
    }
  }

  // Pass 2: Prune thin protruding 1-cell spikes at elevation Z >= 1
  for (let iter = 0; iter < 2; iter++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const cur = result[y]![x]!;
        if (cur === 0) continue;

        let sameOrHigher = 0;
        if (result[y - 1]![x]! >= cur) sameOrHigher++;
        if (result[y + 1]![x]! >= cur) sameOrHigher++;
        if (result[y]![x - 1]! >= cur) sameOrHigher++;
        if (result[y]![x + 1]! >= cur) sameOrHigher++;

        if (sameOrHigher < 2) {
          const maxNeighbor = Math.max(
            result[y - 1]![x]!,
            result[y + 1]![x]!,
            result[y]![x - 1]!,
            result[y]![x + 1]!
          );
          result[y]![x] = Math.min(cur - 1, maxNeighbor);
        }
      }
    }
  }

  // Pass 3: Demote 1-cell thin ridges ("sausages"/fingers) at elevation Z >= 2
  for (let iter = 0; iter < 2; iter++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const cur = result[y]![x]!;
        if (cur < MIN_RIDGE_PRUNE_ELEVATION) continue;

        const isPinchedH = result[y]![x - 1]! < cur && result[y]![x + 1]! < cur;
        const isPinchedV = result[y - 1]![x]! < cur && result[y + 1]![x]! < cur;

        if (isPinchedH || isPinchedV) {
          result[y]![x] = cur - 1;
        }
      }
    }
  }

  return result;
}

function isCellOceanOrSandClear(
  x: number,
  y: number,
  clearance: number,
  W: number,
  H: number,
  visitedOcean: readonly (readonly boolean[])[],
  terrainMatrix: readonly (readonly WaterTerrainKind[])[]
): boolean {
  for (let dy = -clearance; dy <= clearance; dy++) {
    for (let dx = -clearance; dx <= clearance; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (
        nx < 0 ||
        nx >= W ||
        ny < 0 ||
        ny >= H ||
        visitedOcean[ny]![nx] ||
        terrainMatrix[ny]![nx] === 'sand'
      ) {
        return false;
      }
    }
  }
  return true;
}

function isLeagueMassifCandidateValid(
  x: number,
  y: number,
  pW: number,
  pH: number,
  margin: number,
  W: number,
  H: number,
  validZone: readonly (readonly boolean[])[]
): boolean {
  for (let dy = -margin; dy < pH + margin; dy++) {
    for (let dx = -margin; dx < pW + margin; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H || !validZone[ny]![nx]) {
        return false;
      }
    }
  }
  return true;
}

export interface MountainCoordPoint {
  readonly x: number;
  readonly y: number;
}

export interface MountainRegionBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function stampCaveSouthCliffMassif(
  cave: MountainCoordPoint,
  W: number,
  H: number,
  validZone: readonly (readonly boolean[])[],
  rawHeightmap: number[][]
): void {
  // 1. Mandatory flat Tier 1 roof terrace directly above the cave entrance:
  // For 3 tiles north (dy = -3..-1) and lateral radius 3 (dx = -3..3),
  // elevation is strictly 1 (preventing second-floor cliff face from cramping down on the entrance).
  for (let dy = CAVE_ROOF_TERRACE_DEPTH; dy <= CAVE_ROOF_TERRACE_MIN_DY; dy++) {
    for (let dx = -CAVE_ROOF_TERRACE_RADIUS; dx <= CAVE_ROOF_TERRACE_RADIUS; dx++) {
      const cy = cave.y + dy;
      const cx = cave.x + dx;
      if (cx >= 0 && cx < W && cy >= 0 && cy < H && validZone[cy]![cx]) {
        rawHeightmap[cy]![cx] = 1;
      }
    }
  }

  // 2. Mountain Massif Backing:
  // From dy = -8 to -4, ensure elevation is at least 1 (can rise to higher tiers further back)
  const CAVE_NORTH_EXTENT = -8 as const;
  for (let dy = CAVE_NORTH_EXTENT; dy <= CAVE_MASSIF_BACKING_MAX_DY; dy++) {
    for (let dx = -CAVE_MASSIF_LATERAL_RADIUS; dx <= CAVE_MASSIF_LATERAL_RADIUS; dx++) {
      const cy = cave.y + dy;
      const cx = cave.x + dx;
      if (cx >= 0 && cx < W && cy >= 0 && cy < H && validZone[cy]![cx]) {
        rawHeightmap[cy]![cx] = Math.max(1, rawHeightmap[cy]![cx]!);
      }
    }
  }
}

function floodFillInteriorLakeCells(
  startX: number,
  startY: number,
  W: number,
  H: number,
  terrainMatrix: readonly (readonly WaterTerrainKind[])[],
  visitedOcean: readonly (readonly boolean[])[],
  visitedLake: boolean[][]
): { readonly x: number; readonly y: number }[] {
  const lakeCells: { x: number; y: number }[] = [];
  const q: { x: number; y: number }[] = [{ x: startX, y: startY }];
  visitedLake[startY]![startX] = true;

  while (q.length > 0) {
    const cur = q.pop()!;
    lakeCells.push(cur);
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ]) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      if (terrainMatrix[ny]![nx] === 'water' && !visitedOcean[ny]![nx] && !visitedLake[ny]![nx]) {
        visitedLake[ny]![nx] = true;
        q.push({ x: nx, y: ny });
      }
    }
  }
  return lakeCells;
}

function floodFillMassifCells(
  startX: number,
  startY: number,
  W: number,
  H: number,
  rawHeightmap: readonly (readonly number[])[],
  visitedMassif: boolean[][]
): { readonly x: number; readonly y: number }[] {
  const cells: { x: number; y: number }[] = [];
  const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
  visitedMassif[startY]![startX] = true;

  const SURROUNDING_COORDINATE_OFFSETS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ] as const;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    cells.push(curr);
    for (const [dx, dy] of SURROUNDING_COORDINATE_OFFSETS) {
      const nx = curr.x + dx;
      const ny = curr.y + dy;
      if (
        nx >= 0 &&
        nx < W &&
        ny >= 0 &&
        ny < H &&
        rawHeightmap[ny]![nx]! >= 1 &&
        !visitedMassif[ny]![nx]
      ) {
        visitedMassif[ny]![nx] = true;
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return cells;
}

function computePointChebyshevClearance(
  x: number,
  y: number,
  maxDistance: number,
  W: number,
  H: number,
  rawHeightmap: readonly (readonly number[])[]
): number {
  let d = 0;
  let ok = true;
  while (ok && d < maxDistance) {
    d++;
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny < 0 || ny >= H || nx < 0 || nx >= W || rawHeightmap[ny]![nx] === 0) {
          ok = false;
          break;
        }
      }
      if (!ok) break;
    }
  }
  return d - 1;
}

function isStairNearLeaguePlateauWall(s: MountainCoordPoint, lz: MountainRegionBox): boolean {
  const plateauH = Math.max(LEAGUE_PLATEAU_MIN_HEIGHT, lz.height - LEAGUE_PLATEAU_HEIGHT_OFFSET);
  const wallY = lz.y + plateauH - 1;
  return Math.abs(s.y - wallY) <= 1 && s.x >= lz.x - 4 && s.x <= lz.x + lz.width + 4;
}

function getSafeHeight(matrix: readonly (readonly number[])[], x: number, y: number): number {
  if (y < 0 || y >= matrix.length) return 0;
  const row = matrix[y];
  if (!row || x < 0 || x >= row.length) return 0;
  return row[x] ?? 0;
}

const MIN_ELONGATED_SLIVER_LEN = 3;
const MAX_SLIVER_THICKNESS = 2;

function readElevAlongAxis(
  heightmap: readonly (readonly number[])[],
  primaryCoord: number,
  crossCoord: number,
  isRowScan: boolean
): number {
  return isRowScan
    ? (heightmap[primaryCoord]?.[crossCoord] ?? 0)
    : (heightmap[crossCoord]?.[primaryCoord] ?? 0);
}

function measureCrossAxisSpan(
  heightmap: readonly (readonly number[])[],
  fixedCoord: number,
  anchorCross: number,
  elev: number,
  crossLimit: number,
  isRowScan: boolean
): { min: number; max: number } | null {
  if (readElevAlongAxis(heightmap, fixedCoord, anchorCross, isRowScan) < elev) return null;
  let min = anchorCross;
  let max = anchorCross;
  while (
    min > 0 &&
    max - min < MAX_SLIVER_THICKNESS &&
    readElevAlongAxis(heightmap, fixedCoord, min - 1, isRowScan) >= elev
  ) {
    min--;
  }
  while (
    max < crossLimit - 1 &&
    max - min < MAX_SLIVER_THICKNESS &&
    readElevAlongAxis(heightmap, fixedCoord, max + 1, isRowScan) >= elev
  ) {
    max++;
  }
  return { min, max };
}

function isElongatedThinSliver(
  heightmap: readonly (readonly number[])[],
  x: number,
  y: number,
  elev: number,
  width: number,
  height: number,
  isRowScan: boolean
): boolean {
  const primaryCoord = isRowScan ? y : x;
  const crossCoord = isRowScan ? x : y;
  const primaryLimit = isRowScan ? height : width;
  const crossLimit = isRowScan ? width : height;

  const centerSpan = measureCrossAxisSpan(
    heightmap,
    primaryCoord,
    crossCoord,
    elev,
    crossLimit,
    isRowScan
  );
  if (!centerSpan || centerSpan.max - centerSpan.min + 1 > MAX_SLIVER_THICKNESS) return false;

  let runLength = 1;
  for (const dir of [-1, 1] as const) {
    let curMin = centerSpan.min;
    let curMax = centerSpan.max;
    for (let step = 1; step < primaryLimit; step++) {
      const nextPrimary = primaryCoord + dir * step;
      if (nextPrimary < 0 || nextPrimary >= primaryLimit) break;
      let anchor = -1;
      for (let c = curMin; c <= curMax; c++) {
        if (readElevAlongAxis(heightmap, nextPrimary, c, isRowScan) >= elev) {
          anchor = c;
          break;
        }
      }
      if (anchor < 0) break;
      const nextSpan = measureCrossAxisSpan(
        heightmap,
        nextPrimary,
        anchor,
        elev,
        crossLimit,
        isRowScan
      );
      if (!nextSpan || nextSpan.max - nextSpan.min + 1 > MAX_SLIVER_THICKNESS) break;
      runLength++;
      if (runLength >= MIN_ELONGATED_SLIVER_LEN) return true;
      curMin = nextSpan.min;
      curMax = nextSpan.max;
    }
  }
  return false;
}

function pruneSingleSlicedMountainCell(
  heightmap: number[][],
  terrainMatrix: readonly (readonly WaterTerrainKind[])[],
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  const elev = heightmap[y]![x]!;
  if (elev <= 0) return false;
  if (terrainMatrix[y]?.[x] !== 'grass') {
    heightmap[y]![x] = 0;
    return true;
  }
  if (y + 1 < height) {
    const southT = terrainMatrix[y + 1]?.[x];
    const southElev = heightmap[y + 1]![x]!;
    if ((southT === 'water' || southT === 'water_deep') && southElev < elev) {
      heightmap[y]![x] = southElev;
      return true;
    }
  }
  const minCard = Math.min(
    y > 0 ? heightmap[y - 1]![x]! : 0,
    y + 1 < height ? heightmap[y + 1]![x]! : 0,
    x > 0 ? heightmap[y]![x - 1]! : 0,
    x + 1 < width ? heightmap[y]![x + 1]! : 0
  );
  if (elev > minCard + 1) {
    heightmap[y]![x] = minCard + 1;
    return true;
  }

  const hasN = getSafeHeight(heightmap, x, y - 1) >= elev;
  const hasS = getSafeHeight(heightmap, x, y + 1) >= elev;
  const hasW = getSafeHeight(heightmap, x - 1, y) >= elev;
  const hasE = getSafeHeight(heightmap, x + 1, y) >= elev;
  const hasNW = getSafeHeight(heightmap, x - 1, y - 1) >= elev;
  const hasNE = getSafeHeight(heightmap, x + 1, y - 1) >= elev;
  const hasSE = getSafeHeight(heightmap, x + 1, y + 1) >= elev;
  const hasSW = getSafeHeight(heightmap, x - 1, y + 1) >= elev;

  const isRidgeOrPeak = (!hasN && !hasS) || (!hasW && !hasE);
  const isColJag = (!hasW && !hasS && hasE && hasSE) || (!hasE && !hasS && hasW && hasSW);
  const isRowJag = (!hasW && !hasS && hasN && hasNW) || (!hasE && !hasS && hasN && hasNE);
  const isSliver =
    isElongatedThinSliver(heightmap, x, y, elev, width, height, true) ||
    isElongatedThinSliver(heightmap, x, y, elev, width, height, false);
  if (isRidgeOrPeak || isColJag || isRowJag || isSliver) {
    heightmap[y]![x] = elev - 1;
    return true;
  }
  return false;
}

function resolvePostZoneDiagonalPinches(
  heightmap: number[][],
  width: number,
  height: number
): boolean {
  let changed = false;
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const tl = heightmap[y]![x]!;
      const tr = heightmap[y]![x + 1]!;
      const bl = heightmap[y + 1]![x]!;
      const br = heightmap[y + 1]![x + 1]!;
      const m1 = Math.max(tr, bl);
      if (tl > m1 && br > m1) {
        heightmap[y]![x] = m1;
        heightmap[y + 1]![x + 1] = m1;
        changed = true;
        continue;
      }
      const m2 = Math.max(tl, br);
      if (tr > m2 && bl > m2) {
        heightmap[y]![x + 1] = m2;
        heightmap[y + 1]![x] = m2;
        changed = true;
      }
    }
  }
  return changed;
}

export function pruneSlicedMountainArtifactsAfterZones(
  heightmap: number[][],
  terrainMatrix: readonly (readonly WaterTerrainKind[])[],
  width: number,
  height: number
): void {
  const maxPasses = 24;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = resolvePostZoneDiagonalPinches(heightmap, width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pruneSingleSlicedMountainCell(heightmap, terrainMatrix, x, y, width, height)) {
          changed = true;
        }
      }
    }

    if (!changed) break;
  }
}

const SETTLEMENT_HARD_MARGIN = 1 as const;
const SETTLEMENT_NOISE_PAD = 5 as const;
const SETTLEMENT_EDGE_NOISE_SCALE = 0.085 as const;
const SETTLEMENT_EDGE_NOISE_AMP = 3.2 as const;

interface ExclusionMaskContext {
  readonly width: number;
  readonly height: number;
  readonly validZone: boolean[][];
  readonly noise: SimplexNoise;
}

function applyOrganicSettlementExclusion(zone: ZoneRectangleArea, ctx: ExclusionMaskContext): void {
  const { width: W, height: H, validZone, noise } = ctx;
  const margin = zone.margin ?? 3;
  const outerMargin = margin + SETTLEMENT_NOISE_PAD;
  const minX = Math.max(0, zone.x - outerMargin);
  const maxX = Math.min(W - 1, zone.x + zone.width - 1 + outerMargin);
  const minY = Math.max(0, zone.y - outerMargin);
  const maxY = Math.min(H - 1, zone.y + zone.height - 1 + outerMargin);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx =
        x < zone.x ? zone.x - x : x >= zone.x + zone.width ? x - (zone.x + zone.width - 1) : 0;
      const dy =
        y < zone.y ? zone.y - y : y >= zone.y + zone.height ? y - (zone.y + zone.height - 1) : 0;
      const dist = Math.hypot(dx, dy);
      if (dist <= SETTLEMENT_HARD_MARGIN) {
        validZone[y]![x] = false;
        continue;
      }
      const n = noise.noise2D(x * SETTLEMENT_EDGE_NOISE_SCALE, y * SETTLEMENT_EDGE_NOISE_SCALE);
      if (dist <= margin + n * SETTLEMENT_EDGE_NOISE_AMP) {
        validZone[y]![x] = false;
      }
    }
  }
}

/**
 * Generates multi-tiered mountain massifs strictly located on continental grass,
 * maintaining clearance from beaches and inland lakes.
 */
function applySquareElevationClamp(
  heightmap: number[][],
  cx: number,
  cy: number,
  span: number,
  elevation: number,
  predicate?: (nx: number, ny: number) => boolean
): void {
  for (let dy = -span; dy <= span; dy++) {
    for (let dx = -span; dx <= span; dx++) {
      const ny = cy + dy;
      const nx = cx + dx;
      if (predicate && !predicate(nx, ny)) continue;
      heightmap[ny]![nx] = Math.max(heightmap[ny]![nx]!, elevation);
    }
  }
}

function measureValidCordilleraAnchorScore(
  cx: number,
  cy: number,
  W: number,
  H: number,
  heightmap: readonly (readonly number[])[],
  terrainMatrix: WaterTerrainMatrix,
  mountainScores: readonly (readonly number[])[]
): number | null {
  const ANCHOR_EDGE_PAD = 4;
  const ANCHOR_HALF_SPAN = 3;
  const NON_LAND_DIST_WEIGHT = 10;
  const INITIAL_MIN_DIST = 99;
  if (
    cx < ANCHOR_EDGE_PAD ||
    cx >= W - ANCHOR_EDGE_PAD ||
    cy < ANCHOR_EDGE_PAD ||
    cy >= H - ANCHOR_EDGE_PAD
  ) {
    return null;
  }
  let minNonLandDist = INITIAL_MIN_DIST;
  for (let dy = -ANCHOR_HALF_SPAN; dy <= ANCHOR_HALF_SPAN; dy++) {
    for (let dx = -ANCHOR_HALF_SPAN; dx <= ANCHOR_HALF_SPAN; dx++) {
      const nx = cx + dx;
      const ny = cy + dy;
      const t = terrainMatrix[ny]?.[nx];
      if (t === 'water' || t === 'water_deep' || t === 'sand') return null;
      if (heightmap[ny]?.[nx] === 0) {
        minNonLandDist = Math.min(minNonLandDist, Math.max(Math.abs(dx), Math.abs(dy)));
      }
    }
  }
  return minNonLandDist * NON_LAND_DIST_WEIGHT + (mountainScores[cy]?.[cx] ?? 0);
}

function enforcePostSliceMassifTiers(
  sanitizedHeightmap: number[][],
  terrainMatrix: WaterTerrainMatrix,
  mountainScores: readonly (readonly number[])[],
  isWaterCell: (x: number, y: number) => boolean,
  maxAllowedGlobal: number,
  W: number,
  H: number
): void {
  const MIN_LARGE_CORDILLERA_CELLS = 60;
  const MAX_SMALL_HILL_TIER = 2;
  const TIER_3_TARGET = 3;
  const TIER_1_SPAN = 3;
  const TIER_2_SPAN = 2;
  const postSliceVisited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  let postSliceMaxElev = 0;
  let largestEligibleMassif: { readonly x: number; readonly y: number }[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (sanitizedHeightmap[y]![x] === 0 || postSliceVisited[y]![x]) continue;
      const cells = floodFillMassifCells(x, y, W, H, sanitizedHeightmap, postSliceVisited);
      if (cells.length < MIN_LARGE_CORDILLERA_CELLS) {
        for (const c of cells) {
          sanitizedHeightmap[c.y]![c.x] = Math.min(
            sanitizedHeightmap[c.y]![c.x]!,
            MAX_SMALL_HILL_TIER
          );
        }
      } else if (cells.length > largestEligibleMassif.length) {
        largestEligibleMassif = cells;
      }
      for (const c of cells) {
        if (sanitizedHeightmap[c.y]![c.x]! > postSliceMaxElev) {
          postSliceMaxElev = sanitizedHeightmap[c.y]![c.x]!;
        }
      }
    }
  }

  if (
    maxAllowedGlobal < TIER_3_TARGET ||
    postSliceMaxElev >= TIER_3_TARGET ||
    largestEligibleMassif.length < MIN_LARGE_CORDILLERA_CELLS
  ) {
    return;
  }

  let bestAnchor: { readonly x: number; readonly y: number; readonly score: number } | null = null;
  for (const c of largestEligibleMassif) {
    const score = measureValidCordilleraAnchorScore(
      c.x,
      c.y,
      W,
      H,
      sanitizedHeightmap,
      terrainMatrix,
      mountainScores
    );
    if (score !== null && (!bestAnchor || score > bestAnchor.score)) {
      bestAnchor = { x: c.x, y: c.y, score };
    }
  }
  if (!bestAnchor) return;

  applySquareElevationClamp(
    sanitizedHeightmap,
    bestAnchor.x,
    bestAnchor.y,
    TIER_1_SPAN,
    1,
    (nx, ny) => !isWaterCell(nx, ny)
  );
  applySquareElevationClamp(
    sanitizedHeightmap,
    bestAnchor.x,
    bestAnchor.y,
    TIER_2_SPAN,
    MAX_SMALL_HILL_TIER
  );
  applySquareElevationClamp(sanitizedHeightmap, bestAnchor.x, bestAnchor.y, 1, TIER_3_TARGET);
  const normTier3 = normalizeHeightmapDiagonals(sanitizedHeightmap);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!isWaterCell(x, y)) sanitizedHeightmap[y]![x] = normTier3[y]![x]!;
    }
  }
}

export function generateContinentalMountains(
  terrainMatrix: WaterTerrainMatrix,
  options: ContinentGeneratorOptions
): {
  readonly sanitizedHeightmap: number[][];
  readonly placedStairs: MountainStairLocation[];
  readonly mountainResult: ResolvedMountainMapResult;
  readonly geologicalClusters: GeologicalClusterResult;
} {
  const H = terrainMatrix.length;
  const W = terrainMatrix[0]?.length ?? 0;
  const seed = options.seed ?? CONTINENT_DEFAULT_SEED;
  const palette = options.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE;
  const withStairs = options.withStairs ?? true;
  const maxStairs = options.maxStairsPerTier ?? 2;

  // 1. Identify ocean water cells via flood fill from borders to distinguish from inland freshwater lakes
  const visitedOcean: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const oceanQueue: GridPoint[] = [];
  for (let x = 0; x < W; x++) {
    if (terrainMatrix[0]![x] === 'water') {
      visitedOcean[0]![x] = true;
      oceanQueue.push({ x, y: 0 });
    }
    if (terrainMatrix[H - 1]![x] === 'water') {
      visitedOcean[H - 1]![x] = true;
      oceanQueue.push({ x, y: H - 1 });
    }
  }
  for (let y = 0; y < H; y++) {
    if (terrainMatrix[y]![0] === 'water' && !visitedOcean[y]![0]) {
      visitedOcean[y]![0] = true;
      oceanQueue.push({ x: 0, y });
    }
    if (terrainMatrix[y]![W - 1] === 'water' && !visitedOcean[y]![W - 1]) {
      visitedOcean[y]![W - 1] = true;
      oceanQueue.push({ x: W - 1, y });
    }
  }
  floodFillGrid(
    oceanQueue,
    visitedOcean,
    W,
    H,
    (nx, ny) => terrainMatrix[ny]![nx] === 'water' || terrainMatrix[ny]![nx] === 'water_deep'
  );

  // Mask of valid mountain terrain: must be grass with clearance from ocean and sand
  const clearance = Math.min(W, H) >= 100 ? 3 : 2;
  const validZone: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (terrainMatrix[y]![x] !== 'grass') continue;
      validZone[y]![x] = isCellOceanOrSandClear(x, y, clearance, W, H, visitedOcean, terrainMatrix);
    }
  }

  // Exclude settlement footprints and margins from mountain validZone with organic edge noise
  if (options.settlementExclusionZones) {
    const exclusionCtx: ExclusionMaskContext = {
      width: W,
      height: H,
      validZone,
      noise: new SimplexNoise(seed + MOUNTAIN_NOISE_SECONDARY_SEED_OFFSET)
    };
    for (const zone of options.settlementExclusionZones) {
      applyOrganicSettlementExclusion(zone, exclusionCtx);
    }
  }

  // Generate raw heightmap using Modulated 2D Ridge Noise
  const mtnRatio = options.mountainPercentage ?? DEFAULT_MOUNTAIN_RATIO;
  const mountainNoise1 = new SimplexNoise(seed + MOUNTAIN_NOISE_PRIMARY_SEED_OFFSET);
  const mountainNoise2 = new SimplexNoise(seed + MOUNTAIN_NOISE_SECONDARY_SEED_OFFSET);
  const valleyNoise = new SimplexNoise(seed + VALLEY_NOISE_SEED_OFFSET);

  const rawHeightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  const mountainScores: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  const validScores: number[] = [];
  const cx = W / 2;
  const cy = H / 2;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!validZone[y]![x]) continue;

      // 1. Ridge Noise: peaks along zero-crossings to form continuous sinuous chains with broad plateaus
      const scale = Math.min(
        MAX_MOUNTAIN_SCALE,
        Math.max(MIN_MOUNTAIN_SCALE, 2.2 / Math.min(W, H))
      );
      const n1 = mountainNoise1.noise2D(x * scale, y * scale);
      const rawRidge1 = 1.0 - Math.abs(n1);
      const ridge1 = Math.min(1.0, Math.max(0.0, rawRidge1) ** 0.7 * RIDGE_AMPLITUDE_MULTIPLIER);

      const n2 = mountainNoise2.noise2D(x * scale * 2.0, y * scale * 2.0);
      const rawRidge2 = 1.0 - Math.abs(n2);
      const ridge2 = Math.min(1.0, Math.max(0.0, rawRidge2) ** 0.7 * RIDGE_AMPLITUDE_MULTIPLIER);
      const combinedRidge = ridge1 * RIDGE_PRIMARY_WEIGHT + ridge2 * RIDGE_SECONDARY_WEIGHT;

      // 2. Central Habitable Valley Modulation:
      // Suppresses mountains in the core interior to leave wide central plains for cities & routes
      const distFromCenter = Math.hypot(
        (x - cx) / (W * VALLEY_CENTER_SCALE_RATIO),
        (y - cy) / (H * VALLEY_CENTER_SCALE_RATIO)
      );
      const vn = (valleyNoise.noise2D(x * scale * 0.6, y * scale * 0.6) + 1.0) / 2.0;

      const suppRadius =
        Math.min(W, H) >= 100 ? VALLEY_SUPP_RADIUS_LARGE : VALLEY_SUPP_RADIUS_SMALL;
      const centerSuppression =
        distFromCenter < suppRadius ? (suppRadius - distFromCenter) / suppRadius : 0.0;
      const valleySuppression =
        centerSuppression * 0.6 +
        (vn > 0.6 ? (vn - 0.6) * VALLEY_SECONDARY_SUPPRESSION_FACTOR : 0.0);

      const mountainScore = Math.max(0.0, combinedRidge - valleySuppression);
      mountainScores[y]![x] = mountainScore;
      validScores.push(mountainScore);
    }
  }

  // Quantile thresholds: guarantee mountains occupy strictly ~22% of valid landmass, leaving spacious valleys for settlements
  validScores.sort((a, b) => b - a);
  const targetMountainCount = Math.floor(
    validScores.length * Math.min(0.24, Math.max(MIN_MOUNTAIN_PERCENT_CLAMP, mtnRatio))
  );
  const t1Threshold = validScores[targetMountainCount] ?? 0.6;
  const targetTier2Count = Math.floor(targetMountainCount * TIER_2_MOUNTAIN_COUNT_RATIO);
  const t2Threshold = Math.max(
    t1Threshold + TIER_2_MIN_DELTA,
    validScores[targetTier2Count] ?? t1Threshold + TIER_2_FALLBACK_DELTA
  );

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!validZone[y]![x]) continue;
      const s = mountainScores[y]![x]!;
      if (s >= t2Threshold) {
        rawHeightmap[y]![x] = 2;
      } else if (s >= t1Threshold) {
        rawHeightmap[y]![x] = 1;
      }
    }
  }

  // Fallback northern mountain massif only when an explicit leaguePlateauZone is not provided
  const MASSIVE_MAP_DIMENSION = 200 as const;
  const NORTH_MASSIF_MIN_Y_RATIO = 0.12 as const;
  const NORTH_MASSIF_MAX_Y_RATIO = 0.32 as const;
  const NORTH_MASSIF_MIN_X_RATIO = 0.18 as const;
  const NORTH_MASSIF_MAX_X_RATIO = 0.82 as const;

  if (!options.leaguePlateauZone && Math.min(W, H) >= MASSIVE_MAP_DIMENSION) {
    const pW = 24;
    const pH = LEAGUE_MASSIF_HEIGHT;
    const LEAGUE_MASSIF_MARGIN = 2 as const;
    let leagueBestX = -1;
    let leagueBestY = -1;

    for (
      let y = Math.round(NORTH_MASSIF_MIN_Y_RATIO * H);
      y <= Math.round(NORTH_MASSIF_MAX_Y_RATIO * H);
      y += 2
    ) {
      for (
        let x = Math.round(NORTH_MASSIF_MIN_X_RATIO * W);
        x <= Math.round(NORTH_MASSIF_MAX_X_RATIO * W);
        x += 2
      ) {
        if (isLeagueMassifCandidateValid(x, y, pW, pH, LEAGUE_MASSIF_MARGIN, W, H, validZone)) {
          leagueBestX = x;
          leagueBestY = y;
          break;
        }
      }
      if (leagueBestX !== -1) break;
    }

    if (leagueBestX !== -1) {
      for (let dy = 0; dy < pH; dy++) {
        for (let dx = 0; dx < pW; dx++) {
          rawHeightmap[leagueBestY + dy]![leagueBestX + dx] = Math.max(
            1,
            rawHeightmap[leagueBestY + dy]![leagueBestX + dx]!
          );
        }
      }
    }
  }

  // Guaranteed cave mountain massifs (guarantees south cliff wall for cave entrances)
  if (options.caveLocations) {
    for (const cave of options.caveLocations) {
      stampCaveSouthCliffMassif(cave, W, H, validZone, rawHeightmap);
    }
  }

  // Guaranteed League Plateau at elevation 1 (Palace upper tier)
  if (options.leaguePlateauZone) {
    const lz = options.leaguePlateauZone;
    const plateauH = Math.max(LEAGUE_PLATEAU_MIN_HEIGHT, lz.height - LEAGUE_PLATEAU_HEIGHT_OFFSET);
    const bounds = computeClampedZoneBounds(lz, W, H, plateauH);
    applyPlateauGrassElevation(rawHeightmap, terrainMatrix, bounds, 1);
  }

  // Orographic Lake Basin Relief: For inland mountain lakes embedded in massifs,
  // ensure the surrounding massif rim maintains elevation >= 1 so the lake forms a sunken basin
  const visitedLake: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (terrainMatrix[y]![x] !== 'water' || visitedOcean[y]![x] || visitedLake[y]![x]) {
        continue;
      }
      const lakeCells = floodFillInteriorLakeCells(
        x,
        y,
        W,
        H,
        terrainMatrix,
        visitedOcean,
        visitedLake
      );

      // Check if this lake is situated in an elevated/mountain massif sector
      const maxNearScore = computeLakeMaxNearScore(lakeCells, mountainScores, validZone, W, H);

      // If mountain lake: ensure orographic rim relief surrounding the basin
      // strictly for cells with high mountain noise (>= t1Threshold * 0.85) in the lake's immediate perimeter (radius <= 2)
      if (maxNearScore >= t1Threshold) {
        const rimThreshold = t1Threshold * LAKE_RIM_THRESHOLD_RATIO;
        applyLakeBasinRimRelief(
          lakeCells,
          rawHeightmap,
          mountainScores,
          validZone,
          rimThreshold,
          W,
          H
        );
      }
    }
  }

  // Ensure all lake water cells are strictly at elevation 0 (sunken water basin)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (terrainMatrix[y]![x] === 'water' || terrainMatrix[y]![x] === 'water_deep') {
        rawHeightmap[y]![x] = 0;
      }
    }
  }

  const isWaterCell = (x: number, y: number): boolean => {
    if (x < 0 || x >= W || y < 0 || y >= H) return true;
    const t = terrainMatrix[y]![x];
    return t === 'water' || t === 'water_deep';
  };

  // 3. Procedural multi-tier scaling:
  // - Small hills (< 40 cells): capped at 1 floor
  // - Moderate massifs (40 to 129 cells): 1 to 2 floors
  // - Large massifs (130 to 239 cells): organically elevates ridge crest to 3 floors
  // - Enormous cordilleras (>= 240 cells): organically elevates ridge crest to 3 floors and apex summits to 4 floors
  const maxAllowedGlobal = options?.maxMountainTiers ?? 4;

  const rawMassifs: { x: number; y: number }[][] = [];
  const visitedMassif: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (rawHeightmap[y]![x] === 0 || visitedMassif[y]![x]) continue;
      const cells = floodFillMassifCells(x, y, W, H, rawHeightmap, visitedMassif);
      rawMassifs.push(cells);
    }
  }

  // Precompute Chebyshev distance clearance from mountain boundary (elevation 0)
  const mtnClearance: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (rawHeightmap[y]![x] === 0) continue;
      mtnClearance[y]![x] = computePointChebyshevClearance(
        x,
        y,
        MAX_MOUNTAIN_CLEARANCE_DISTANCE,
        W,
        H,
        rawHeightmap
      );
    }
  }

  const compactScaleTier3Min = Math.min(W, H) <= 160 ? 60 : MASSIF_TIER_3_MIN_CELLS;

  for (const massif of rawMassifs) {
    const count = massif.length;
    const c0 = massif[0]!;
    const seedOffset = Math.abs(Math.sin((c0.x * 37 + c0.y * 19 + seed) * 0.1)) * 30;

    let maxMassifTier: number;
    if (count >= CORDILLERA_TIER_4_MIN_CELLS - seedOffset)
      maxMassifTier = Math.min(maxAllowedGlobal, 4);
    else if (count >= Math.max(60, compactScaleTier3Min))
      maxMassifTier = Math.min(maxAllowedGlobal, 3);
    else if (count >= MASSIF_TIER_2_MIN_CELLS) maxMassifTier = Math.min(maxAllowedGlobal, 2);
    else maxMassifTier = 1;

    // Small hills: demote any small isolated Tier 2 speck to Tier 1
    if (maxMassifTier === 1) {
      for (const c of massif) {
        if (rawHeightmap[c.y]![c.x]! > 1) {
          rawHeightmap[c.y]![c.x] = 1;
        }
      }
      continue;
    }

    // Guarantee that existing Tier 2 cells are strictly cushioned (mtnClearance >= 1)
    for (const c of massif) {
      if (rawHeightmap[c.y]![c.x]! >= 2 && mtnClearance[c.y]![c.x]! < 1) {
        rawHeightmap[c.y]![c.x] = 1;
      }
    }

    // Cordilleras (Tier 4)
    if (maxMassifTier >= 4) {
      const bestPeak = findBestMassifPeak(massif, mtnClearance, mountainScores, 3);

      if (bestPeak) {
        const px = bestPeak.x;
        const py = bestPeak.y;
        expandMassifTierRing(rawHeightmap, mtnClearance, {
          px,
          py,
          radius: MASSIF_TIER_2_RADIUS,
          width: W,
          height: H,
          minClearance: 1,
          targetElevation: 2
        });
        expandMassifTierRing(rawHeightmap, mtnClearance, {
          px,
          py,
          radius: 2,
          width: W,
          height: H,
          minClearance: 2,
          targetElevation: 3
        });
        applySolidSummitElevation(rawHeightmap, px, py, 1, W, H, 4);
      } else {
        maxMassifTier = 3;
      }
    }

    // Large massifs (Tier 3)
    if (maxMassifTier === 3) {
      const hasSquareValidZone = (cx: number, cy: number, halfSpan: number): boolean => {
        for (let dy = -halfSpan; dy <= halfSpan; dy++) {
          for (let dx = -halfSpan; dx <= halfSpan; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx <= 0 || nx >= W - 1 || ny <= 0 || ny >= H - 1 || !validZone[ny]?.[nx]) {
              return false;
            }
          }
        }
        return true;
      };

      let bestPeak: { readonly x: number; readonly y: number } | null = null;
      let bestPeakScore = -1;
      for (const c of massif) {
        if (!hasSquareValidZone(c.x, c.y, 3)) continue;
        const s = (mtnClearance[c.y]?.[c.x] ?? 0) * 100 + (mountainScores[c.y]?.[c.x] ?? 0);
        if (s > bestPeakScore) {
          bestPeakScore = s;
          bestPeak = c;
        }
      }
      bestPeak =
        bestPeak ??
        findBestMassifPeak(massif, mtnClearance, mountainScores, 2) ??
        findBestMassifPeak(massif, mtnClearance, mountainScores, 1) ??
        findHighestScoreMassifCell(massif, mountainScores);

      if (bestPeak) {
        const px = bestPeak.x;
        const py = bestPeak.y;
        const TIER_3_VALUE = 3;
        // Guarantee complete 7x7 Tier 1 -> 5x5 Tier 2 -> 3x3 Tier 3 terraces within validZone
        applySquareElevationClamp(
          rawHeightmap,
          px,
          py,
          TIER_3_VALUE,
          1,
          (nx, ny) => ny > 0 && ny < H - 1 && nx > 0 && nx < W - 1 && Boolean(validZone[ny]?.[nx])
        );
        applySquareElevationClamp(
          rawHeightmap,
          px,
          py,
          2,
          2,
          (nx, ny) => ny > 1 && ny < H - 2 && nx > 1 && nx < W - 2 && Boolean(validZone[ny]?.[nx])
        );
        applySquareElevationClamp(
          rawHeightmap,
          px,
          py,
          1,
          TIER_3_VALUE,
          (nx, ny) =>
            ny > 2 &&
            ny < H - TIER_3_VALUE &&
            nx > 2 &&
            nx < W - TIER_3_VALUE &&
            (rawHeightmap[ny]?.[nx] ?? 0) >= 2
        );
      }
    }

    // Moderate massifs (Tier 2): actively force an interior terrace with interior cliff
    if (maxMassifTier >= 2) {
      let hasTier2 = false;
      for (const c of massif) {
        if (rawHeightmap[c.y]![c.x]! >= 2) {
          hasTier2 = true;
          break;
        }
      }

      if (!hasTier2) {
        const bestPeak =
          findBestMassifPeak(massif, mtnClearance, mountainScores, 1) ??
          findHighestScoreMassifCell(massif, mountainScores);

        if (bestPeak) {
          const px = bestPeak.x;
          const py = bestPeak.y;
          expandMassifTierRing(rawHeightmap, mtnClearance, {
            px,
            py,
            radius: 3,
            width: W,
            height: H,
            minClearance: 1,
            targetElevation: 2
          });
          applySolidSummitElevation(rawHeightmap, px, py, 2, W, H, 2);
        }
      }
    }
  }

  // Prune orphan walls and fill sunken depressions (protecting water bodies)
  const pruned = pruneOrphanCliffWalls(rawHeightmap, isWaterCell);

  // Pre-autotile diagonal normalization: enforce Von Neumann 4-neighbor adjacency
  const preNormalized = normalizeHeightmapDiagonals(pruned);

  // Enforce structural constraints (footprint >= 6x6, core >= 3x3, buffer >= 3, protecting water bodies)
  // Continental mountains enforce minTerraceBuffer: 0 to maintain zero-drop multi-tier stair corridors
  const sanitizedHeightmap = sanitizeHeightmapMatrix(preNormalized, {
    isWaterCell,
    minTerraceBuffer: 0,
    minFootprintDimension: 3,
    minWalkableCoreDimension: 0
  });

  // Post-sanitization diagonal normalization pass to eliminate any emergent isolated diagonal cliff contacts
  const postNormalized = normalizeHeightmapDiagonals(sanitizedHeightmap);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      sanitizedHeightmap[y]![x] = postNormalized[y]![x]!;
    }
  }

  // Guarantee water cells strictly remain at elevation 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (isWaterCell(x, y)) {
        sanitizedHeightmap[y]![x] = 0;
      }
    }
  }

  // Re-flatten settlement exclusion zones to guarantee 100% flat ground (elev = 0)
  if (options.settlementExclusionZones) {
    for (const zone of options.settlementExclusionZones) {
      const margin = zone.margin ?? 2;
      const minX = Math.max(0, zone.x - margin);
      const maxX = Math.min(W - 1, zone.x + zone.width + margin);
      const minY = Math.max(0, zone.y - margin);
      const maxY = Math.min(H - 1, zone.y + zone.height + margin);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          sanitizedHeightmap[y]![x] = 0;
        }
      }
    }
  }

  // Guarantee uniform elevation 1 plateau across the Pokémon League footprint + margin
  // Guarantee uniform elevation 1 plateau across the Pokémon League upper palace
  if (options.leaguePlateauZone) {
    const lz = options.leaguePlateauZone;
    const m = lz.margin ?? 4;
    const plateauH = Math.max(LEAGUE_PLATEAU_MIN_HEIGHT, lz.height - LEAGUE_PLATEAU_HEIGHT_OFFSET);
    const bounds = computeClampedZoneBounds(lz, W, H, plateauH);
    applyPlateauGrassElevation(sanitizedHeightmap, terrainMatrix, bounds, 1);

    // Organic stepped spurs around League east/west/north edges so Indigo Plateau feels like Victory Road
    const spurPad = 3;
    const noiseSpur = new SimplexNoise(seed + VALLEY_NOISE_SEED_OFFSET);
    for (let y = Math.max(1, bounds.minY - spurPad); y <= Math.min(H - 2, bounds.maxY); y++) {
      for (
        let x = Math.max(1, bounds.minX - spurPad);
        x <= Math.min(W - 2, bounds.maxX + spurPad);
        x++
      ) {
        if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
          continue;
        }
        const t = terrainMatrix[y]?.[x];
        if (t === 'water' || t === 'water_deep' || t === 'sand') continue;
        const spurFreq = 0.16;
        const spurThreshold = 0.08;
        const n = noiseSpur.noise2D(x * spurFreq, y * spurFreq);
        if (n > spurThreshold && (sanitizedHeightmap[y]?.[x] ?? 0) === 0) {
          sanitizedHeightmap[y]![x] = 1;
        }
      }
    }

    // Lower plaza, checkpoint gate, and southern concourse remain flat at elevation 0
    const lowerMaxY = Math.min(H - 1, lz.y + lz.height + m);
    for (let y = bounds.maxY; y <= lowerMaxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        sanitizedHeightmap[y]![x] = 0;
      }
    }

    const normalizedLeague = normalizeHeightmapDiagonals(sanitizedHeightmap);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!isWaterCell(x, y)) {
          sanitizedHeightmap[y]![x] = normalizedLeague[y]![x]!;
        }
      }
    }
  }

  // Post-zone mountain cleanup: remove any 1x1 isolated peaks, 1-tile slivers, or diagonal
  // pinches created when settlementExclusionZones or leaguePlateauZone sliced cliff borders.
  pruneSlicedMountainArtifactsAfterZones(sanitizedHeightmap, terrainMatrix, W, H);
  enforcePostSliceMassifTiers(
    sanitizedHeightmap,
    terrainMatrix,
    mountainScores,
    isWaterCell,
    options?.maxMountainTiers ?? 4,
    W,
    H
  );

  // Phase 2: Geological Clusterer enforces single palette per massif
  const geologicalClusters = clusterMountainMassifs({
    elevationMatrix: sanitizedHeightmap,
    macroBiomeGrid: options.macroBiomeGrid,
    seed,
    defaultPalette: options.mountainPalette
  });

  // Initial autotile resolution to detect stair candidates
  const initialResolved = resolveMountainMapGrid(sanitizedHeightmap, {
    palette,
    paletteMatrix: geologicalClusters.paletteMatrix
  });

  const placedStairs: MountainStairLocation[] = [];

  if (withStairs) {
    const effectiveMaxStairs = Math.max(maxStairs, geologicalClusters.massifs.length * 2);
    const isWalkableFloor = (x: number, y: number): boolean => {
      const t = terrainMatrix[y]?.[x];
      return t !== 'water' && t !== 'water_deep' && t !== 'sand';
    };

    let maxElev = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (sanitizedHeightmap[y]![x]! > maxElev) maxElev = sanitizedHeightmap[y]![x]!;
      }
    }

    // Detect stairs connecting each tier z down to z - 1
    for (let z = 1; z <= maxElev; z++) {
      const tierStairs = findStairCandidates(
        sanitizedHeightmap,
        initialResolved,
        z,
        z - 1,
        effectiveMaxStairs,
        placedStairs,
        isWalkableFloor
      );
      for (const s of tierStairs) {
        // If within the League plateau south cliff face, prune random stairs
        if (
          options.leaguePlateauZone &&
          z === 1 &&
          isStairNearLeaguePlateauWall(s, options.leaguePlateauZone)
        ) {
          continue; // Will stamp single monumental stair below
        }
        placedStairs.push({ ...s, tier: z });
      }
    }
  }

  // Stamp single monumental central staircase for Pokémon League if zone present
  if (options.leaguePlateauZone) {
    const lz = options.leaguePlateauZone;
    const plateauH = Math.max(LEAGUE_PLATEAU_MIN_HEIGHT, lz.height - LEAGUE_PLATEAU_HEIGHT_OFFSET);
    const wallY = lz.y + plateauH - 1;
    const midAvenueX = lz.x + Math.floor(lz.width / 2);
    const stairX = midAvenueX - 1;
    const cL = initialResolved.cellDetails[wallY]?.[stairX];
    const cR = initialResolved.cellDetails[wallY]?.[stairX + 1];
    if (cL?.role === 'edge_south_top' && cR?.role === 'edge_south_top') {
      placedStairs.push({ x: stairX, y: wallY, tier: 1 });
    }
  }

  // Final mountain resolution with stamped stairs and massif paletteMatrix
  const mountainResult = resolveMountainMapGrid(sanitizedHeightmap, {
    palette,
    paletteMatrix: geologicalClusters.paletteMatrix,
    stairs: placedStairs
  });

  return {
    sanitizedHeightmap,
    placedStairs,
    mountainResult,
    geologicalClusters
  };
}
