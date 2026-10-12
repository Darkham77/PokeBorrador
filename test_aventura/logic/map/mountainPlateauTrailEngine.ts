/**
 * test_aventura/logic/map/mountainPlateauTrailEngine.ts
 *
 * MOUNTAIN PLATEAU & CAVE ENTRANCE TRAILS ENGINE
 *
 * Connects mountain stairs to the regional elevation 0 road network,
 * links pairs of stairs across plateaus, and connects elevated or ground-level
 * cave entrances to nearest road paths or stair landings.
 */

import type { ContinentMapResult, MountainStairLocation } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
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
  pathGrid: boolean[][]
): void {
  for (const pt of path) {
    pathGrid[pt.y]![pt.x] = true;
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

    // Connect lower landing (stair.y + 2) to the nearest regional trunk route on elevation 0
    const lowerX = stair.x;
    const lowerY = Math.min(H - 1, stair.y + 2);
    let nearestPathPoint: { x: number; y: number } | null = null;
    let minPathDist = Infinity;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (pathGrid[y]![x] && (continentMap.heightmap[y]?.[x] ?? 0) === 0) {
          if (Math.abs(x - lowerX) <= 1 && Math.abs(y - lowerY) <= 1) continue;
          const d = Math.hypot(x - lowerX, y - lowerY);
          if (d < minPathDist && d <= MAX_STAIR_LINK_DISTANCE) {
            minPathDist = d;
            nearestPathPoint = { x, y };
          }
        }
      }
    }

    if (nearestPathPoint) {
      const link = findPathAStar(
        continentMap,
        lowerX,
        lowerY,
        nearestPathPoint.x,
        nearestPathPoint.y,
        pathGrid,
        false,
        []
      );
      if (link && link.path.length > 0) {
        for (const pt of link.path) {
          pathGrid[pt.y]![pt.x] = true;
        }
      }
    }
  }

  // Connect pairs of stairs across the mountain plateau
  for (let i = 0; i < stairs.length; i++) {
    for (let j = i + 1; j < stairs.length; j++) {
      const s1 = stairs[i]!;
      const s2 = stairs[j]!;
      const d = Math.hypot(s1.x - s2.x, s1.y - s2.y);
      if (d <= MAX_PLATEAU_STAIR_PAIR_DISTANCE) {
        const trail = findPathAStar(
          continentMap,
          s1.x,
          s1.y - 1,
          s2.x,
          s2.y - 1,
          pathGrid,
          false,
          []
        );
        if (trail && trail.path.length > 0) {
          for (const pt of trail.path) {
            pathGrid[pt.y]![pt.x] = true;
          }
        }
      }
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
        stampPath(caveTrail.path, pathGrid);
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
      stampPath(caveTrail.path, pathGrid);
    }
  }
}
