/**
 * test_aventura/logic/map/mountainPlateauTrailEngine.ts
 *
 * MOUNTAIN PLATEAU & CAVE ENTRANCE TRAILS ENGINE
 *
 * Connects mountain stairs to the regional elevation 0 road network,
 * links pairs of stairs across plateaus, and connects elevated or ground-level
 * cave entrances to nearest road paths or stair landings.
 */

import type { POINode } from '../../types/map/poiTypes.ts';
import type { ContinentMapResult, MountainStairLocation } from './continentGenerator.ts';
import {
  findPathAStar,
  MAX_STAIR_LINK_DISTANCE,
  MAX_CAVE_TRAIL_DISTANCE
} from './routePathfinding.ts';

const MAX_PLATEAU_STAIR_PAIR_DISTANCE = 65 as const;
const MAX_ELEVATED_CAVE_STAIR_DISTANCE = 50 as const;

export interface MountainPlateauTrailsContext {
  readonly continentMap: ContinentMapResult;
  readonly pathGrid: boolean[][];
  readonly nodes: readonly POINode[];
  readonly W: number;
  readonly H: number;
}

function stampPath(
  path: readonly { readonly x: number; readonly y: number }[],
  continentMap: ContinentMapResult,
  pathGrid: boolean[][],
  W: number,
  H: number
): void {
  for (let i = 0; i < path.length; i++) {
    const pt = path[i]!;
    if (pt.y < 0 || pt.y >= H || pt.x < 0 || pt.x >= W) continue;
    if (continentMap.cells[pt.y]?.[pt.x]?.terrain === 'water') continue;

    pathGrid[pt.y]![pt.x] = true;
    const prev = path[i - 1] ?? pt;
    const next = path[i + 1] ?? pt;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const isHorizontal = Math.abs(dx) >= Math.abs(dy);
    if (isHorizontal) {
      if (pt.y + 1 < H && continentMap.cells[pt.y + 1]?.[pt.x]?.terrain !== 'water') {
        pathGrid[pt.y + 1]![pt.x] = true;
      } else if (pt.y - 1 >= 0 && continentMap.cells[pt.y - 1]?.[pt.x]?.terrain !== 'water') {
        pathGrid[pt.y - 1]![pt.x] = true;
      }
    } else {
      if (pt.x + 1 < W && continentMap.cells[pt.y]?.[pt.x + 1]?.terrain !== 'water') {
        pathGrid[pt.y]![pt.x + 1] = true;
      } else if (pt.x - 1 >= 0 && continentMap.cells[pt.y]?.[pt.x - 1]?.terrain !== 'water') {
        pathGrid[pt.y]![pt.x - 1] = true;
      }
    }
  }
}

function findNearestStairToCave(
  cx: number,
  cy: number,
  stairs: readonly MountainStairLocation[]
): MountainStairLocation | null {
  let bestStair: MountainStairLocation | null = null;
  let minD = Infinity;
  for (const st of stairs) {
    const d = Math.hypot(st.x - cx, st.y - cy);
    if (d < minD && d <= MAX_ELEVATED_CAVE_STAIR_DISTANCE) {
      minD = d;
      bestStair = st;
    }
  }
  return bestStair;
}

function findNearestGroundTarget(
  cx: number,
  cy: number,
  pathGrid: readonly (readonly boolean[])[],
  stairs: readonly MountainStairLocation[],
  width: number,
  height: number
): { x: number; y: number } | null {
  let bestTarget: { x: number; y: number } | null = null;
  let minD = Infinity;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (!pathGrid[r]?.[c]) continue;
      const d = Math.hypot(c - cx, r - cy);
      if (d < minD && d <= MAX_CAVE_TRAIL_DISTANCE) {
        minD = d;
        bestTarget = { x: c, y: r };
      }
    }
  }

  for (const st of stairs) {
    const d = Math.hypot(st.x - cx, st.y + 2 - cy);
    if (d < minD && d <= MAX_CAVE_TRAIL_DISTANCE) {
      minD = d;
      bestTarget = { x: st.x, y: st.y + 2 };
    }
  }

  return bestTarget;
}

function findNearestElevationZeroPathPoint(
  lowerX: number,
  lowerY: number,
  W: number,
  H: number,
  pathGrid: readonly (readonly boolean[])[],
  heightmap: readonly (readonly number[])[],
  maxDist: number
): { x: number; y: number } | null {
  let nearest: { x: number; y: number } | null = null;
  let minPathDist = Infinity;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!pathGrid[y]![x] || (heightmap[y]?.[x] ?? 0) !== 0) continue;
      if (Math.abs(x - lowerX) <= 1 && Math.abs(y - lowerY) <= 1) continue;
      const d = Math.hypot(x - lowerX, y - lowerY);
      if (d < minPathDist && d <= maxDist) {
        minPathDist = d;
        nearest = { x, y };
      }
    }
  }
  return nearest;
}

function findNearestElevationZeroPoi(
  lowerX: number,
  lowerY: number,
  nodes: readonly POINode[],
  heightmap: readonly (readonly number[])[]
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let minPoiDist = Infinity;
  for (const poi of nodes) {
    if ((heightmap[poi.gridY]?.[poi.gridX] ?? 0) !== 0) continue;
    const d = Math.hypot(poi.gridX - lowerX, poi.gridY - lowerY);
    if (d < minPoiDist) {
      minPoiDist = d;
      best = { x: poi.gridX, y: poi.gridY };
    }
  }
  return best;
}

function connectStairPair(
  s1: MountainStairLocation,
  s2: MountainStairLocation,
  continentMap: ContinentMapResult,
  pathGrid: boolean[][],
  W: number,
  H: number
): void {
  const d = Math.hypot(s1.x - s2.x, s1.y - s2.y);
  if (d > MAX_PLATEAU_STAIR_PAIR_DISTANCE) return;
  const trail = findPathAStar(continentMap, s1.x, s1.y - 1, s2.x, s2.y - 1, pathGrid, false, []);
  if (trail && trail.path.length > 0) {
    stampPath(trail.path, continentMap, pathGrid, W, H);
  }
}

/**
 * Traces mountain stairs access paths, plateau inter-stair trails, and cave entrance trails.
 */
export function connectMountainPlateauTrails(ctx: MountainPlateauTrailsContext): void {
  const { continentMap, pathGrid, nodes, W, H } = ctx;
  const stairs = continentMap.placedStairs;
  if (!stairs || stairs.length === 0) return;

  for (const stair of stairs) {
    // Stamp the stair's own walk corridor onto pathGrid
    for (let dy = -1; dy <= 2; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const sy = stair.y + dy;
        const sx = stair.x + dx;
        if (sy >= 0 && sy < H && sx >= 0 && sx < W) {
          pathGrid[sy]![sx] = true;
        }
      }
    }

    // Connect lower landing (stair.y + 2) to the route network
    const lowerX = stair.x;
    const lowerY = Math.min(H - 1, stair.y + 2);
    const stairElev = continentMap.heightmap[lowerY]?.[lowerX] ?? 0;
    let targetX: number | undefined;
    let targetY: number | undefined;

    if (stairElev > 0) {
      // Find nearest stair whose upper landing is on this same plateau elevation
      let bestLowerStair: MountainStairLocation | null = null;
      let minStairDist = Infinity;
      for (const other of stairs) {
        if (other === stair) continue;
        const otherUpperElev = continentMap.heightmap[Math.max(0, other.y - 1)]?.[other.x] ?? 0;
        if (otherUpperElev !== stairElev) continue;
        const d = Math.hypot(other.x - lowerX, other.y - 1 - lowerY);
        if (d < minStairDist) {
          minStairDist = d;
          bestLowerStair = other;
        }
      }
      if (bestLowerStair) {
        targetX = bestLowerStair.x;
        targetY = Math.max(0, bestLowerStair.y - 1);
      }
    } else {
      const searchRadius = Math.max(MAX_STAIR_LINK_DISTANCE, Math.max(W, H));
      const nearestPathPoint = findNearestElevationZeroPathPoint(
        lowerX,
        lowerY,
        W,
        H,
        pathGrid,
        continentMap.heightmap,
        searchRadius
      );
      targetX = nearestPathPoint?.x;
      targetY = nearestPathPoint?.y;

      if (targetX === undefined || targetY === undefined) {
        const fallbackPoi = findNearestElevationZeroPoi(
          lowerX,
          lowerY,
          nodes,
          continentMap.heightmap
        );
        targetX = fallbackPoi?.x;
        targetY = fallbackPoi?.y;
      }
    }

    if (targetX !== undefined && targetY !== undefined) {
      const link = findPathAStar(
        continentMap,
        lowerX,
        lowerY,
        targetX,
        targetY,
        pathGrid,
        true,
        [],
        undefined,
        false
      );
      if (link && link.path.length > 0) {
        stampPath(link.path, continentMap, pathGrid, W, H);
      }
    }
  }

  // Connect pairs of stairs across the mountain plateau
  for (let i = 0; i < stairs.length; i++) {
    for (let j = i + 1; j < stairs.length; j++) {
      connectStairPair(stairs[i]!, stairs[j]!, continentMap, pathGrid, W, H);
    }
  }

  // Connect cave entrances to nearest stairs or road network
  for (const poi of nodes) {
    if (poi.type !== 'cave_entrance') continue;
    const cx = poi.gridX;
    const cy = poi.gridY + 1;
    const doorElev = continentMap.heightmap[cy]?.[cx] ?? 0;

    if (doorElev > 0) {
      const bestStair = findNearestStairToCave(cx, cy, stairs);
      if (!bestStair) continue;
      const caveTrail = findPathAStar(
        continentMap,
        cx,
        cy,
        bestStair.x,
        bestStair.y - 1,
        pathGrid,
        false,
        []
      );
      if (caveTrail && caveTrail.path.length > 0) {
        stampPath(caveTrail.path, continentMap, pathGrid, W, H);
      }
      continue;
    }

    const bestTarget = findNearestGroundTarget(cx, cy, pathGrid, stairs, W, H);
    if (!bestTarget) continue;
    const caveTrail = findPathAStar(
      continentMap,
      cx,
      cy,
      bestTarget.x,
      bestTarget.y,
      pathGrid,
      false,
      []
    );
    if (caveTrail && caveTrail.path.length > 0) {
      stampPath(caveTrail.path, continentMap, pathGrid, W, H);
    }
  }
}
