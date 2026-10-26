/**
 * src/logic/map/transitableGridEngine.ts
 *
 * NATURE-FIRST TRANSITABLE GRID ENGINE
 *
 * Computes the 2D boolean mask indicating whether a cell is part of the
 * playable player-transitable corridor (routes, bridges, towns, gatehouse doorways)
 * or impenetrable deep wilderness (transitableGrid === false).
 *
 * Strict Canonical Invariants:
 * 1. Hermetic Gatehouses: Route gates only expose their 2-cell central doorway
 *    as transitable. Their lateral flanks remain non-transitable so players cannot
 *    walk around them through open grass.
 * 2. Route Corridor Dilation: Paths and bridges are dilated by BFS to form organic
 *    4-8 cell wide playable corridors surrounded by dense wilderness.
 * 3. Stair Landings: Stairs with active route paths get compact 2-cell landings;
 *    isolated stairs are not dilated into massive wilderness clearings.
 */

import type { POINode } from '../../types/map/poiTypes.ts';
import { computeGridDistanceField, type GridBfsQueueItem } from '../utils/gridBfsUtils.ts';
import type { ContinentMapResult } from './continentGenerator.ts';

function applyRouteGateTransitable(
  poi: POINode,
  transitableGrid: boolean[][],
  pathGrid: readonly (readonly boolean[])[]
): void {
  const streetSet = new Set<string>();
  if (poi.urbanLayout?.internalStreets) {
    for (const pt of poi.urbanLayout.internalStreets) {
      streetSet.add(`${pt.x}_${pt.y}`);
    }
  } else {
    const midX = poi.gridX + Math.floor(poi.footprint.width / 2);
    for (let y = poi.gridY; y < poi.gridY + poi.footprint.height; y++) {
      streetSet.add(`${midX - 1}_${y}`);
      streetSet.add(`${midX}_${y}`);
    }
  }

  for (let y = poi.gridY; y < poi.gridY + poi.footprint.height; y++) {
    for (let x = poi.gridX; x < poi.gridX + poi.footprint.width; x++) {
      transitableGrid[y]![x] = Boolean(streetSet.has(`${x}_${y}`) || pathGrid[y]?.[x]);
    }
  }
}

export interface StairPoint {
  readonly x: number;
  readonly y: number;
}

function dilateStairLanding(
  stair: StairPoint,
  radius: number,
  W: number,
  H: number,
  transitableGrid: boolean[][]
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= radius) {
        const nx = stair.x + dx;
        const ny = stair.y + dy;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          transitableGrid[ny]![nx] = true;
        }
      }
    }
  }
}

export function computeTransitableGrid(
  continentMap: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid: readonly (readonly boolean[])[],
  pois: readonly POINode[],
  corridorRadius?: number
): boolean[][] {
  const H = continentMap.height;
  const W = continentMap.width;
  const transitableGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  const effectiveRadius = corridorRadius ?? 2;

  const dist: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const queue: GridBfsQueueItem[] = [];

  // 1. Seed BFS from active route paths and bridges
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pathGrid[y]![x] || bridgeGrid[y]![x]) {
        dist[y]![x] = 0;
        queue.push({ x, y, d: 0 });
        transitableGrid[y]![x] = true;
      }
    }
  }

  // 2. Expand outward up to effectiveRadius cells (excluding water bodies)
  computeGridDistanceField(queue, dist, W, H, effectiveRadius, (nx, ny) => {
    const terrain = continentMap.terrainMatrix[ny]![nx];
    return terrain === 'water' || terrain === 'water_deep';
  });

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (dist[y]![x]! <= effectiveRadius) {
        transitableGrid[y]![x] = true;
      }
    }
  }

  // 3. Mark POI settlements and checkpoints
  for (const poi of pois) {
    if (poi.type === 'route_gate') {
      applyRouteGateTransitable(poi, transitableGrid, pathGrid);
      continue;
    }

    const minX = Math.max(0, poi.gridX - 2);
    const minY = Math.max(0, poi.gridY - 2);
    const maxX = Math.min(W - 1, poi.gridX + poi.footprint.width + 1);
    const maxY = Math.min(H - 1, poi.gridY + poi.footprint.height + 1);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        transitableGrid[y]![x] = true;
      }
    }
  }

  // 4. Stair Landings: Only dilate immediate landing if a path actually visits or touches this stair
  const STAIR_OFFSETS = [
    [0, 0],
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0]
  ] as const satisfies readonly (readonly [number, number])[];

  for (const stair of continentMap.placedStairs) {
    const hasPath = STAIR_OFFSETS.some(([dx, dy]) => {
      const nx = stair.x + dx;
      const ny = stair.y + dy;
      return nx >= 0 && nx < W && ny >= 0 && ny < H && pathGrid[ny]?.[nx];
    });

    const radius = hasPath ? 2 : 1;
    dilateStairLanding(stair, radius, W, H, transitableGrid);
  }

  return transitableGrid;
}
