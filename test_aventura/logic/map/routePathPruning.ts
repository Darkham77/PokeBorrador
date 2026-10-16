/**
 * test_aventura/logic/map/routePathPruning.ts
 *
 * ROUTE NETWORK PATH PRUNING & DEAD-END CLEANUP ENGINE
 *
 * Provides specialized pruning algorithms for procedural regional paths:
 *   1. Pruning orphan path fragments not connected to any POI or bridge.
 *   2. Pruning dead-end stubs that do not terminate at gateways, stairs, or bridgeheads.
 */

import type { POINode } from '../../types/map/poiTypes.ts';
import { floodFillGrid, type GridPoint } from '../utils/gridBfsUtils.ts';

const STAIR_ENDPOINT_PRESERVE_NORTH = 2 as const;
const STAIR_ENDPOINT_PRESERVE_LATERAL = 2 as const;
const STAIR_ENDPOINT_PRESERVE_SOUTH = 3 as const;
const MAX_PRUNE_PASSES = 5 as const;

/**
 * Prunes orphan path fragments not connected to any POI or bridge.
 */
export function pruneOrphanPathFragments(
  pathGrid: boolean[][],
  bridgeGrid: readonly (readonly boolean[])[],
  nodes: readonly POINode[],
  W: number,
  H: number
): void {
  const visitedPath: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const pathQueue: GridPoint[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!pathGrid[y]![x]) continue;

      let nearSeed = false;
      for (const poi of nodes) {
        if (
          x >= poi.gridX - 1 &&
          x <= poi.gridX + poi.footprint.width &&
          y >= poi.gridY - 1 &&
          y <= poi.gridY + poi.footprint.height
        ) {
          nearSeed = true;
          break;
        }
      }

      if (!nearSeed) {
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0]
        ]) {
          if (bridgeGrid[y + dy!]?.[x + dx!]) {
            nearSeed = true;
            break;
          }
        }
      }

      if (nearSeed) {
        visitedPath[y]![x] = true;
        pathQueue.push({ x, y });
      }
    }
  }

  floodFillGrid(pathQueue, visitedPath, W, H, (nx, ny) => Boolean(pathGrid[ny]![nx]));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pathGrid[y]![x] && !visitedPath[y]![x]) {
        pathGrid[y]![x] = false;
      }
    }
  }
}

/**
 * Prunes dead-end stubs that do not terminate at gateways, stairs, or bridgeheads.
 */
export function pruneDeadEndStubs(
  pathGrid: boolean[][],
  bridgeGrid: readonly (readonly boolean[])[],
  nodes: readonly POINode[],
  placedStairs: readonly { x: number; y: number }[] | undefined,
  W: number,
  H: number
): void {
  const preservedEndpoints = new Set<string>();
  for (const n of nodes) {
    for (const gw of n.gateways ?? []) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          preservedEndpoints.add(`${gw.x + dx}_${gw.y + dy}`);
        }
      }
    }
  }
  if (placedStairs) {
    for (const st of placedStairs) {
      for (let dy = -STAIR_ENDPOINT_PRESERVE_NORTH; dy <= STAIR_ENDPOINT_PRESERVE_SOUTH; dy++) {
        for (
          let dx = -STAIR_ENDPOINT_PRESERVE_LATERAL;
          dx <= STAIR_ENDPOINT_PRESERVE_LATERAL;
          dx++
        ) {
          preservedEndpoints.add(`${st.x + dx}_${st.y + dy}`);
        }
      }
    }
  }

  let prunedAny = true;
  let prunePasses = 0;
  while (prunedAny && prunePasses < MAX_PRUNE_PASSES) {
    prunedAny = false;
    prunePasses++;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!pathGrid[y]![x]) continue;
        if (preservedEndpoints.has(`${x}_${y}`)) continue;

        let neighborCount = 0;
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0]
        ]) {
          const nx = x + dx!;
          const ny = y + dy!;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
            if (pathGrid[ny]![nx] || bridgeGrid[ny]?.[nx]) {
              neighborCount++;
            }
          }
        }

        if (neighborCount <= 1) {
          pathGrid[y]![x] = false;
          prunedAny = true;
        }
      }
    }
  }
}
