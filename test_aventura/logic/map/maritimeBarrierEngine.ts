/**
 * test_aventura/logic/map/maritimeBarrierEngine.ts
 *
 * FIRERED MARITIME BARRIER, ROUTE CHANNELING & DEEP OCEAN ENGINE
 *
 * Implements authentic Pokémon FireRed (Route 19/20/21 / Sevii) ocean boundaries:
 * 1. Flood-fills true ocean water from map borders so inland freshwater lakes
 *    NEVER receive deep ocean trenches or maritime sea rocks.
 * 2. Keeps navigable shallow `'water'` (bright blue) strictly confined to bounded
 *    organic coastal shelves, harbor exits, bridges, and Surf route corridors.
 * 3. Fills outer non-navigable seas and map borders (`>= 3` tiles deep) with
 *    impassable dark-blue `'water_deep'` (with rounded transition edges).
 * 4. Lines exposed channel/coastal frontiers with thin staggered 8-connected sea-rock
 *    chains (with dark `'water_deep'` halos) and verifies via 4-way BFS that players
 *    can NEVER bypass limits or reach the map perimeter.
 */

import type { DirtyTileBounds } from '../../types/map/autotileHealingTypes.ts';
import type { RouteWaypoint } from '../../types/map/poiTypes.ts';
import {
  computeGridDistanceField,
  floodFillGrid,
  wouldExceedStraightCardinalRun,
  type GridPoint
} from '../utils/gridBfsUtils.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import { fbm2DNormalized, SimplexNoise } from './noise/simplexNoise.ts';
import type { MaritimeRockObstacle } from './routeNetworkEngine.ts';
import {
  resolveWaterCoastInBounds,
  type ResolvedWaterMapResult,
  type WaterTerrainKind,
  type WaterTerrainMatrix
} from './waterAutotileEngine.ts';

const CANONICAL_WATER_ROCK_OBSTACLE = 'poke_water_rocks_calm.png' as const;
const CANONICAL_WATER_ROCK_FOAM = 'poke_water_rock_foam.png' as const;
const DEEP_WATER_TILE_NAME = 'poke_water_deep.png' as const;
type MaritimeRockPrefab = typeof CANONICAL_WATER_ROCK_OBSTACLE | typeof CANONICAL_WATER_ROCK_FOAM;

const OCEAN_OUTER_BORDER_CLEARANCE = 3 as const;
const STRICT_ESCAPE_RING_CLEARANCE = 2 as const;
const MIN_SHALLOW_SHORE_PROTECTION = 2 as const;
const MIN_DEEP_WATER_LAND_DISTANCE = 2 as const;

const LARGE_MAP_SURF_BAND_THRESHOLD = 320 as const;
const MEDIUM_MAP_SURF_BAND_THRESHOLD = 200 as const;
const SHELF_BASE_LARGE = 4 as const;
const SHELF_EXTRA_LARGE = 4 as const;
const SHELF_BASE_MEDIUM = 3 as const;
const SHELF_EXTRA_MEDIUM = 3 as const;
const SHELF_BASE_SMALL = 2 as const;
const SHELF_EXTRA_SMALL = 3 as const;

const SURF_CORRIDOR_MIN_RADIUS = 2 as const;
const SURF_CORRIDOR_MAX_RADIUS = 5 as const;
const SURF_CHANNEL_NOISE_SCALE = 0.065 as const;
const SURF_SHOAL_BLOOM_SCALE = 0.045 as const;
const SURF_CHANNEL_SEED_OFFSET = 313 as const;
const BRIDGE_PROTECTED_RADIUS = 2 as const;
const PORT_EXIT_CLEARANCE_TILES = 4 as const;

const DEEP_SHELF_NOISE_SEED_OFFSET = 109 as const;
const REEF_CLUSTER_NOISE_SEED_OFFSET = 271 as const;
const DEEP_SHELF_NOISE_SCALE = 0.045 as const;
const DEEP_SHELF_NOISE_OCTAVES = 3 as const;
const REEF_NOISE_SCALE = 0.065 as const;
const REEF_NOISE_OCTAVES = 2 as const;

const DEEP_SHELF_TRENCH_THRESHOLD = 0.74 as const;
const DEEP_SHELF_NOISE_MIDPOINT = 0.4 as const;
const DEEP_SHELF_MIN_ORTHO_NEIGHBORS = 2 as const;

const FRONTIER_ROCK_NOISE_THRESHOLD = 0.48 as const;
const FRONTIER_STAGGER_HASH_THRESHOLD = 0.36 as const;
const MAX_STRAIGHT_FRONTIER_ROCK_RUN = 2 as const;
const REEF_DEEP_HALO_HASH_THRESHOLD = 0.22 as const;
const CALM_ROCK_HASH_THRESHOLD = 0.5 as const;
const OUTER_REEF_HASH_SEED_OFFSET = 17 as const;
const HALO_HASH_SEED_OFFSET = 53 as const;
const SURF_WAYPOINT_CURVE_JITTER_GAIN = 5 as const;

const HASH_PRIME_X = 374761393 as const;
const HASH_PRIME_Y = 668265263 as const;
const HASH_PRIME_SEED = 1442695041 as const;
const HASH_MIX_SHIFT_LOW = 13 as const;
const HASH_MIX_MULT = 1274126177 as const;
const HASH_MIX_SHIFT_HIGH = 16 as const;
const HASH_NORMALIZE_MASK = 0x7fffffff as const;

const CARDINAL_OFFSETS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0]
] as const;

const EIGHT_DIRECTION_OFFSETS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
] as const;

export interface PortZoneRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CoastalMaritimeSealingOptions {
  readonly terrainMatrix: WaterTerrainMatrix;
  readonly bridgeGrid: readonly (readonly boolean[])[];
  readonly maritimeRockObstacles: MaritimeRockObstacle[];
  readonly surfWaypoints?: readonly RouteWaypoint[];
  readonly portZones?: readonly PortZoneRect[];
  readonly occupiedKeys?: Set<string>;
  readonly seed: number;
  readonly width: number;
  readonly height: number;
}

export interface MaritimeSealingResult {
  readonly deepWaterCells: readonly GridPoint[];
}

function deterministicHash(x: number, y: number, seed: number): number {
  let h = Math.trunc(x * HASH_PRIME_X + y * HASH_PRIME_Y + seed * HASH_PRIME_SEED);
  h = (h ^ (h >> HASH_MIX_SHIFT_LOW)) * HASH_MIX_MULT;
  h = h ^ (h >> HASH_MIX_SHIFT_HIGH);
  return (h & HASH_NORMALIZE_MASK) / HASH_NORMALIZE_MASK;
}

function isWaterTerrain(t: WaterTerrainKind | undefined): boolean {
  return t === 'water' || t === 'water_deep';
}

function isWithinMarginRing(
  x: number,
  y: number,
  width: number,
  height: number,
  margin: number
): boolean {
  return x < margin || x >= width - margin || y < margin || y >= height - margin;
}

function touchesGrass8(
  terrainMatrix: WaterTerrainMatrix,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  for (const [dx, dy] of EIGHT_DIRECTION_OFFSETS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    if (terrainMatrix[ny]?.[nx] === 'grass') return true;
  }
  return false;
}

function computeOceanMask(
  terrainMatrix: WaterTerrainMatrix,
  width: number,
  height: number
): boolean[][] {
  const oceanMask: boolean[][] = Array.from({ length: height }, () =>
    Array<boolean>(width).fill(false)
  );
  const seeds: GridPoint[] = [];

  for (let x = 0; x < width; x++) {
    if (isWaterTerrain(terrainMatrix[0]?.[x])) seeds.push({ x, y: 0 });
    if (isWaterTerrain(terrainMatrix[height - 1]?.[x])) seeds.push({ x, y: height - 1 });
  }
  for (let y = 1; y < height - 1; y++) {
    if (isWaterTerrain(terrainMatrix[y]?.[0])) seeds.push({ x: 0, y });
    if (isWaterTerrain(terrainMatrix[y]?.[width - 1])) seeds.push({ x: width - 1, y });
  }

  floodFillGrid(seeds, oceanMask, width, height, (nx, ny) =>
    isWaterTerrain(terrainMatrix[ny]?.[nx])
  );
  return oceanMask;
}

function computeLandDistanceField(
  terrainMatrix: WaterTerrainMatrix,
  width: number,
  height: number
): number[][] {
  const landDist: number[][] = Array.from({ length: height }, () =>
    Array<number>(width).fill(Infinity)
  );
  const queue: { x: number; y: number; d: number }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isWaterTerrain(terrainMatrix[y]?.[x])) {
        landDist[y]![x] = 0;
        queue.push({ x, y, d: 0 });
      }
    }
  }

  computeGridDistanceField(queue, landDist, width, height);
  return landDist;
}

function markCircleMask(
  mask: boolean[][],
  cx: number,
  cy: number,
  radius: number,
  width: number,
  height: number
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    const ny = cy + dy;
    if (ny < 0 || ny >= height) continue;
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = cx + dx;
      if (nx < 0 || nx >= width) continue;
      mask[ny]![nx] = true;
    }
  }
}

function markPortExitMask(
  mask: boolean[][],
  port: PortZoneRect,
  margin: number,
  width: number,
  height: number
): void {
  const minY = Math.max(0, port.y - margin);
  const maxY = Math.min(height - 1, port.y + port.height - 1 + margin);
  const minX = Math.max(0, port.x - margin);
  const maxX = Math.min(width - 1, port.x + port.width - 1 + margin);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      mask[y]![x] = true;
    }
  }
}

/**
 * Protects shallow navigable waters along immediate coasts, bridges, port docks, and Surf channels.
 */
function stampSurfProtectedDisk(
  protectedGrid: boolean[][],
  cx: number,
  cy: number,
  radius: number,
  width: number,
  height: number
): void {
  const radiusSqLimit = radius * radius + 1;
  for (let dy = -radius; dy <= radius; dy++) {
    const ny = cy + dy;
    if (ny < 0 || ny >= height) continue;
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = cx + dx;
      if (nx < 0 || nx >= width) continue;
      if (dx * dx + dy * dy > radiusSqLimit) continue;
      if (isWithinMarginRing(nx, ny, width, height, STRICT_ESCAPE_RING_CLEARANCE)) continue;
      protectedGrid[ny]![nx] = true;
    }
  }
}

function computeSurfProtectedGrid(
  opts: CoastalMaritimeSealingOptions,
  landDist: readonly (readonly number[])[]
): boolean[][] {
  const { bridgeGrid, surfWaypoints, portZones, seed, width, height } = opts;
  const protectedGrid: boolean[][] = Array.from({ length: height }, () =>
    Array<boolean>(width).fill(false)
  );
  const channelNoise = new SimplexNoise(seed + SURF_CHANNEL_SEED_OFFSET);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        (landDist[y]?.[x] ?? Infinity) <= MIN_SHALLOW_SHORE_PROTECTION &&
        !isWithinMarginRing(x, y, width, height, STRICT_ESCAPE_RING_CLEARANCE)
      ) {
        protectedGrid[y]![x] = true;
      }
      if (!bridgeGrid[y]?.[x]) continue;
      markCircleMask(protectedGrid, x, y, BRIDGE_PROTECTED_RADIUS, width, height);
    }
  }

  if (portZones) {
    for (const port of portZones) {
      markPortExitMask(protectedGrid, port, PORT_EXIT_CLEARANCE_TILES, width, height);
    }
  }

  if (surfWaypoints) {
    const bloomNoise = new SimplexNoise(seed + REEF_CLUSTER_NOISE_SEED_OFFSET);
    for (let idx = 0; idx < surfWaypoints.length; idx++) {
      const wp = surfWaypoints[idx]!;
      const nVal = fbm2DNormalized(channelNoise, wp.x, wp.y, {
        scale: SURF_CHANNEL_NOISE_SCALE,
        octaves: REEF_NOISE_OCTAVES
      });
      const bVal = fbm2DNormalized(bloomNoise, wp.x, wp.y, {
        scale: SURF_SHOAL_BLOOM_SCALE,
        octaves: REEF_NOISE_OCTAVES
      });
      const radiusSpan = SURF_CORRIDOR_MAX_RADIUS - SURF_CORRIDOR_MIN_RADIUS;
      const radius = Math.round(SURF_CORRIDOR_MIN_RADIUS + nVal * radiusSpan);
      const jitterX = Math.round((bVal - 0.5) * SURF_WAYPOINT_CURVE_JITTER_GAIN);
      const jitterY = Math.round((nVal - 0.5) * SURF_WAYPOINT_CURVE_JITTER_GAIN);
      stampSurfProtectedDisk(
        protectedGrid,
        Math.max(
          STRICT_ESCAPE_RING_CLEARANCE,
          Math.min(width - 1 - STRICT_ESCAPE_RING_CLEARANCE, wp.x + jitterX)
        ),
        Math.max(
          STRICT_ESCAPE_RING_CLEARANCE,
          Math.min(height - 1 - STRICT_ESCAPE_RING_CLEARANCE, wp.y + jitterY)
        ),
        radius,
        width,
        height
      );
      // Keep the waypoint's exact 2-tile navigable core clear as well
      stampSurfProtectedDisk(protectedGrid, wp.x, wp.y, SURF_CORRIDOR_MIN_RADIUS, width, height);
    }
  }

  return protectedGrid;
}

function resolveShelfRange(width: number, height: number): { base: number; extra: number } {
  const minDim = Math.min(width, height);
  if (minDim >= LARGE_MAP_SURF_BAND_THRESHOLD) {
    return { base: SHELF_BASE_LARGE, extra: SHELF_EXTRA_LARGE };
  }
  if (minDim >= MEDIUM_MAP_SURF_BAND_THRESHOLD) {
    return { base: SHELF_BASE_MEDIUM, extra: SHELF_EXTRA_MEDIUM };
  }
  return { base: SHELF_BASE_SMALL, extra: SHELF_EXTRA_SMALL };
}

function computeOrganicShelfDepth(
  noise: SimplexNoise,
  x: number,
  y: number,
  base: number,
  extra: number
): number {
  const nVal = fbm2DNormalized(noise, x, y, {
    scale: DEEP_SHELF_NOISE_SCALE,
    octaves: DEEP_SHELF_NOISE_OCTAVES
  });
  if (nVal >= DEEP_SHELF_TRENCH_THRESHOLD) {
    return MIN_DEEP_WATER_LAND_DISTANCE;
  }
  return Math.max(
    MIN_DEEP_WATER_LAND_DISTANCE,
    base + Math.round((nVal - DEEP_SHELF_NOISE_MIDPOINT) * extra)
  );
}

/**
 * Fills all outer oceanic basins and map boundary buffers with impassable `'water_deep'`.
 */
function buildOrganicDeepOceanMask(
  opts: CoastalMaritimeSealingOptions,
  oceanMask: readonly (readonly boolean[])[],
  landDist: readonly (readonly number[])[],
  surfProtectedGrid: readonly (readonly boolean[])[]
): boolean[][] {
  const { terrainMatrix, bridgeGrid, seed, width, height } = opts;
  const shelfNoise = new SimplexNoise(seed + DEEP_SHELF_NOISE_SEED_OFFSET);
  const { base, extra } = resolveShelfRange(width, height);

  const deepMask: boolean[][] = Array.from({ length: height }, () =>
    Array<boolean>(width).fill(false)
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!oceanMask[y]?.[x] || bridgeGrid[y]?.[x]) continue;
      if (touchesGrass8(terrainMatrix, x, y, width, height)) continue;

      const dist = landDist[y]?.[x] ?? Infinity;
      if (dist < MIN_DEEP_WATER_LAND_DISTANCE) continue;

      if (isWithinMarginRing(x, y, width, height, OCEAN_OUTER_BORDER_CLEARANCE)) {
        deepMask[y]![x] = true;
        continue;
      }

      if (surfProtectedGrid[y]?.[x]) continue;

      const shelfDepth = computeOrganicShelfDepth(shelfNoise, x, y, base, extra);
      if (dist > shelfDepth) {
        deepMask[y]![x] = true;
      }
    }
  }

  smoothDeepOceanMask(deepMask, width, height);
  return deepMask;
}

function smoothDeepOceanMask(deepMask: boolean[][], width: number, height: number): void {
  const toClear: GridPoint[] = [];
  for (let y = OCEAN_OUTER_BORDER_CLEARANCE; y < height - OCEAN_OUTER_BORDER_CLEARANCE; y++) {
    for (let x = OCEAN_OUTER_BORDER_CLEARANCE; x < width - OCEAN_OUTER_BORDER_CLEARANCE; x++) {
      if (!deepMask[y]?.[x]) continue;
      let orthoCount = 0;
      for (const [dx, dy] of CARDINAL_OFFSETS) {
        if (deepMask[y + dy]?.[x + dx]) orthoCount++;
      }
      if (orthoCount < DEEP_SHELF_MIN_ORTHO_NEIGHBORS) {
        toClear.push({ x, y });
      }
    }
  }
  for (const pt of toClear) {
    deepMask[pt.y]![pt.x] = false;
  }
}

function pickRockPrefab(opts: {
  readonly x: number;
  readonly y: number;
  readonly seed: number;
  readonly isFirstRock: boolean;
  readonly inDeepWater: boolean;
}): MaritimeRockPrefab {
  const { x, y, seed, isFirstRock, inDeepWater } = opts;
  if (isFirstRock || inDeepWater) return CANONICAL_WATER_ROCK_OBSTACLE;
  return deterministicHash(x, y, seed) < CALM_ROCK_HASH_THRESHOLD
    ? CANONICAL_WATER_ROCK_OBSTACLE
    : CANONICAL_WATER_ROCK_FOAM;
}

function wouldForm2x2RockBlock(rockKeys: ReadonlySet<string>, x: number, y: number): boolean {
  const has = (gx: number, gy: number): boolean => rockKeys.has(`${gx}_${gy}`);
  return (
    (has(x - 1, y) && has(x, y - 1) && has(x - 1, y - 1)) ||
    (has(x + 1, y) && has(x, y - 1) && has(x + 1, y - 1)) ||
    (has(x - 1, y) && has(x, y + 1) && has(x - 1, y + 1)) ||
    (has(x + 1, y) && has(x, y + 1) && has(x + 1, y + 1))
  );
}

function touchesDeepMaskCardinal(
  deepMask: readonly (readonly boolean[])[],
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  for (const [dx, dy] of CARDINAL_OFFSETS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    if (deepMask[ny]?.[nx]) return true;
  }
  return false;
}

function addDeepHalosUnderExistingChannelRocks(
  opts: CoastalMaritimeSealingOptions,
  oceanMask: readonly (readonly boolean[])[],
  deepMask: boolean[][],
  landDist: readonly (readonly number[])[]
): void {
  const { terrainMatrix, maritimeRockObstacles, seed, width, height } = opts;
  for (const rock of maritimeRockObstacles) {
    const { x, y } = rock;
    if (!oceanMask[y]?.[x] || deepMask[y]?.[x]) continue;
    if ((landDist[y]?.[x] ?? 0) < MIN_DEEP_WATER_LAND_DISTANCE) continue;
    if (touchesGrass8(terrainMatrix, x, y, width, height)) continue;
    if (deterministicHash(x, y, seed + HALO_HASH_SEED_OFFSET) >= REEF_DEEP_HALO_HASH_THRESHOLD) {
      deepMask[y]![x] = true;
    }
  }
}

/**
 * Lines selected stretches of the `'water' <-> 'water_deep'` boundary with thin
 * non-blocky rock chains while leaving open deep-ocean banks clearly visible as limits.
 */
function lineDeepFrontierWithOrganicReefChains(
  opts: CoastalMaritimeSealingOptions,
  oceanMask: readonly (readonly boolean[])[],
  deepMask: boolean[][],
  landDist: readonly (readonly number[])[],
  surfProtectedGrid: readonly (readonly boolean[])[],
  rockKeys: Set<string>
): void {
  const { terrainMatrix, bridgeGrid, maritimeRockObstacles, seed, width, height } = opts;
  const reefNoise = new SimplexNoise(seed + REEF_CLUSTER_NOISE_SEED_OFFSET);

  for (let y = STRICT_ESCAPE_RING_CLEARANCE; y < height - STRICT_ESCAPE_RING_CLEARANCE; y++) {
    for (let x = STRICT_ESCAPE_RING_CLEARANCE; x < width - STRICT_ESCAPE_RING_CLEARANCE; x++) {
      if (!oceanMask[y]?.[x] || deepMask[y]?.[x] || bridgeGrid[y]?.[x]) continue;
      if (surfProtectedGrid[y]?.[x]) continue;
      if ((landDist[y]?.[x] ?? 0) < MIN_DEEP_WATER_LAND_DISTANCE) continue;
      if (touchesGrass8(terrainMatrix, x, y, width, height)) continue;
      if (!touchesDeepMaskCardinal(deepMask, x, y, width, height)) continue;

      const key = `${x}_${y}`;
      if (rockKeys.has(key)) continue;

      const nVal = fbm2DNormalized(reefNoise, x, y, {
        scale: REEF_NOISE_SCALE,
        octaves: REEF_NOISE_OCTAVES
      });
      if (nVal < FRONTIER_ROCK_NOISE_THRESHOLD) continue;
      if (
        deterministicHash(x, y, seed + OUTER_REEF_HASH_SEED_OFFSET) <
        FRONTIER_STAGGER_HASH_THRESHOLD
      ) {
        continue;
      }
      if (wouldForm2x2RockBlock(rockKeys, x, y)) continue;
      if (wouldExceedStraightCardinalRun(rockKeys, x, y, MAX_STRAIGHT_FRONTIER_ROCK_RUN)) continue;

      const giveDeepHalo =
        deterministicHash(x, y, seed + HALO_HASH_SEED_OFFSET) >= REEF_DEEP_HALO_HASH_THRESHOLD;
      if (giveDeepHalo) {
        deepMask[y]![x] = true;
      }

      rockKeys.add(key);
      maritimeRockObstacles.push({
        x,
        y,
        prefabFile: pickRockPrefab({
          x,
          y,
          seed,
          isFirstRock: maritimeRockObstacles.length === 0,
          inDeepWater: giveDeepHalo
        })
      });
    }
  }
}

/**
 * Verifies via 4-way BFS from every coastal shallow water tile that NO reachable `'water'`
 * cell can reach the outer 2-tile map boundary; plugs any residual leak hermetically.
 */
function enforceZeroBorderEscapeBFS(
  opts: CoastalMaritimeSealingOptions,
  oceanMask: readonly (readonly boolean[])[],
  deepMask: boolean[][],
  landDist: readonly (readonly number[])[],
  rockKeys: Set<string>
): void {
  const { terrainMatrix, bridgeGrid, maritimeRockObstacles, seed, width, height } = opts;

  const isPassableShallow = (x: number, y: number): boolean =>
    Boolean(oceanMask[y]?.[x]) &&
    !deepMask[y]?.[x] &&
    !rockKeys.has(`${x}_${y}`) &&
    !bridgeGrid[y]?.[x];

  // Seal any shallow water directly inside the strict 2-tile perimeter first
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isWithinMarginRing(x, y, width, height, STRICT_ESCAPE_RING_CLEARANCE)) continue;
      if (!isPassableShallow(x, y)) continue;

      if (
        (landDist[y]?.[x] ?? Infinity) >= MIN_DEEP_WATER_LAND_DISTANCE &&
        !touchesGrass8(terrainMatrix, x, y, width, height)
      ) {
        deepMask[y]![x] = true;
      } else {
        const key = `${x}_${y}`;
        rockKeys.add(key);
        maritimeRockObstacles.push({
          x,
          y,
          prefabFile: pickRockPrefab({
            x,
            y,
            seed,
            isFirstRock: maritimeRockObstacles.length === 0,
            inDeepWater: false
          })
        });
      }
    }
  }

  // Verify via 4-way BFS from all coastal shallow seeds that outer rim stays unreachable
  const visited: boolean[][] = Array.from({ length: height }, () =>
    Array<boolean>(width).fill(false)
  );
  const queue: GridPoint[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!isPassableShallow(x, y)) continue;
      const touchesShore =
        !oceanMask[y - 1]?.[x] ||
        !oceanMask[y + 1]?.[x] ||
        !oceanMask[y]?.[x - 1] ||
        !oceanMask[y]?.[x + 1];
      if (touchesShore) {
        visited[y]![x] = true;
        queue.push({ x, y });
      }
    }
  }

  if (queue.length === 0) return;
  floodFillGrid(queue, visited, width, height, isPassableShallow);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!visited[y]?.[x]) continue;
      if (!isWithinMarginRing(x, y, width, height, 1)) continue;
      const key = `${x}_${y}`;
      if (rockKeys.has(key)) continue;
      rockKeys.add(key);
      maritimeRockObstacles.push({
        x,
        y,
        prefabFile: CANONICAL_WATER_ROCK_OBSTACLE
      });
    }
  }
}

/**
 * Seals all navigable coastal waters and Surf routes using impassable `'water_deep'` ocean basins
 * and staggered 8-connected sea-rock limits. Returns newly designated `'water_deep'` grid points.
 */
export function sealCoastalSeaWithMaritimeRocks(
  opts: CoastalMaritimeSealingOptions
): MaritimeSealingResult {
  const { terrainMatrix, width, height } = opts;
  const rockKeys: Set<string> = opts.occupiedKeys ?? new Set<string>();
  const oceanMask = computeOceanMask(terrainMatrix, width, height);
  const landDist = computeLandDistanceField(terrainMatrix, width, height);
  const surfProtectedGrid = computeSurfProtectedGrid(opts, landDist);

  const deepMask = buildOrganicDeepOceanMask(opts, oceanMask, landDist, surfProtectedGrid);

  addDeepHalosUnderExistingChannelRocks(opts, oceanMask, deepMask, landDist);
  lineDeepFrontierWithOrganicReefChains(
    opts,
    oceanMask,
    deepMask,
    landDist,
    surfProtectedGrid,
    rockKeys
  );
  enforceZeroBorderEscapeBFS(opts, oceanMask, deepMask, landDist, rockKeys);

  const deepWaterCells: GridPoint[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (deepMask[y]?.[x] && terrainMatrix[y]?.[x] !== 'water_deep') {
        deepWaterCells.push({ x, y });
      }
    }
  }

  return { deepWaterCells };
}

/**
 * Synchronizes newly stamped `'water_deep'` cells across `continent.terrainMatrix`,
 * `continent.resolvedWater`, and `continent.cells` preserving rounded transition overlays.
 */
export function applyDeepWaterCellsToContinent(
  continent: ContinentMapResult,
  deepWaterCells: readonly GridPoint[],
  bridgeGrid?: readonly (readonly boolean[])[]
): void {
  if (deepWaterCells.length === 0) return;

  const { width, height } = continent;
  const nextMatrix: WaterTerrainKind[][] = continent.terrainMatrix.map((row) => [...row]);
  let minX = width - 1;
  let minY = height - 1;
  let maxX = 0;
  let maxY = 0;

  for (const pt of deepWaterCells) {
    const row = nextMatrix[pt.y];
    if (!row) continue;
    row[pt.x] = 'water_deep';
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  const expandedBounds: DirtyTileBounds = {
    minX: Math.max(0, minX - 1),
    minY: Math.max(0, minY - 1),
    maxX: Math.min(width - 1, maxX + 1),
    maxY: Math.min(height - 1, maxY + 1)
  };

  const nextResolvedWater: ResolvedWaterMapResult = resolveWaterCoastInBounds(
    continent.resolvedWater,
    nextMatrix,
    expandedBounds,
    bridgeGrid
  );

  const nextCells = continent.cells.map((row, y) => {
    if (y < expandedBounds.minY || y > expandedBounds.maxY) return row;
    return row.map((cell, x) => {
      if (x < expandedBounds.minX || x > expandedBounds.maxX) return cell;
      const waterDetail = nextResolvedWater.cellDetails[y]?.[x];
      const terrain = nextMatrix[y]?.[x];
      if (!terrain || !isWaterTerrain(terrain)) return cell;

      return {
        ...cell,
        terrain,
        isWalkable: false,
        waterRole: waterDetail?.role,
        layerStack:
          waterDetail?.layerStack ??
          (terrain === 'water_deep' ? [DEEP_WATER_TILE_NAME] : cell.layerStack)
      };
    });
  });

  const mutableContinent = continent as {
    terrainMatrix: WaterTerrainMatrix;
    resolvedWater: ResolvedWaterMapResult;
    cells: ContinentMapResult['cells'];
  };
  mutableContinent.terrainMatrix = nextMatrix;
  mutableContinent.resolvedWater = nextResolvedWater;
  mutableContinent.cells = nextCells;
}
