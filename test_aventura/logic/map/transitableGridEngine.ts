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

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';

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
  const queue: { x: number; y: number; d: number }[] = [];

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
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++]!;
    if (curr.d >= effectiveRadius) continue;

    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;

      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        const terrain = continentMap.terrainMatrix[ny]![nx];
        if (terrain === 'water' || terrain === 'water_deep') continue;

        if (dist[ny]![nx]! > curr.d + 1) {
          dist[ny]![nx] = curr.d + 1;
          queue.push({ x: nx, y: ny, d: curr.d + 1 });
          transitableGrid[ny]![nx] = true;
        }
      }
    }
  }

  // 3. Mark POI settlements and checkpoints
  for (const poi of pois) {
    if (poi.type === 'route_gate') {
      // Hermetic checkpoint: only the internal street corridor (doorway) is transitable!
      // The lateral flanks must remain non-transitable (transitableGrid = false) so players cannot walk around the checkpoint.
      const streetSet = new Set<string>();
      if (poi.urbanLayout?.internalStreets) {
        for (const pt of poi.urbanLayout.internalStreets) {
          streetSet.add(`${pt.x}_${pt.y}`);
        }
      } else {
        const midX = poi.gridX + Math.floor(poi.footprint.width / 2);
        for (let y = poi.gridY; y < poi.gridY + poi.footprint.height; y++) {
          for (const x of [midX - 1, midX]) {
            streetSet.add(`${x}_${y}`);
          }
        }
      }

      // Seal entire gatehouse footprint: only internal streets or active paths are transitable
      for (let y = poi.gridY; y < poi.gridY + poi.footprint.height; y++) {
        for (let x = poi.gridX; x < poi.gridX + poi.footprint.width; x++) {
          if (streetSet.has(`${x}_${y}`) || pathGrid[y]?.[x]) {
            transitableGrid[y]![x] = true;
          } else {
            transitableGrid[y]![x] = false;
          }
        }
      }
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

  return transitableGrid;
}
