/**
 * test_aventura/logic/map/routeGridFinalizer.ts
 *
 * PROCEDURAL ROUTE GRID FINALIZER & WATER INTEGRATION ENGINE
 *
 * Cleanses non-water bridge cells, eliminates sand dirt paths, applies 2-cell corridor sanitization,
 * connects functional stairs, prunes dead ends/orphans, and re-resolves water coastlines.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import {
  resolveWaterCoastGrid,
  type ResolvedWaterMapResult,
  BASE_GRASS_TILE
} from './waterAutotileEngine.ts';
import { sanitizePathGridWidth } from './pathAutotileEngine.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import { pruneOrphanPathFragments, pruneDeadEndStubs } from './routePathPruning.ts';

function cleanseBridgeAndSandGrids({
  continentMap,
  pathGrid,
  bridgeGrid,
  W,
  H
}: FinalizeRouteGridsContext): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (continentMap.cells[y]?.[x]?.terrain !== 'water') {
        bridgeGrid[y]![x] = false;
      }
      if (continentMap.terrainMatrix[y]?.[x] === 'sand') {
        pathGrid[y]![x] = false;
      }
    }
  }
}

function sanitizeAndStampStairs(
  continentMap: ContinentMapResult,
  pathGrid: boolean[][],
  W: number,
  H: number
): void {
  const sanitized = sanitizePathGridWidth(pathGrid, continentMap.terrainMatrix);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const isLand =
        continentMap.terrainMatrix[y]?.[x] !== 'sand' &&
        continentMap.cells[y]?.[x]?.terrain !== 'water';
      pathGrid[y]![x] = isLand ? Boolean(sanitized[y]?.[x]) : false;
    }
  }

  if (!continentMap.placedStairs) return;
  for (const st of continentMap.placedStairs) {
    const isConnected = Boolean(
      pathGrid[st.y - 1]?.[st.x] ||
      pathGrid[st.y - 1]?.[st.x + 1] ||
      pathGrid[st.y]?.[st.x] ||
      pathGrid[st.y]?.[st.x + 1] ||
      pathGrid[st.y + 1]?.[st.x] ||
      pathGrid[st.y + 1]?.[st.x + 1] ||
      pathGrid[st.y + 2]?.[st.x] ||
      pathGrid[st.y + 2]?.[st.x + 1]
    );
    if (isConnected) {
      pathGrid[st.y]![st.x] = true;
      pathGrid[st.y]![st.x + 1] = true;
      pathGrid[st.y + 1]![st.x] = true;
      pathGrid[st.y + 1]![st.x + 1] = true;
    }
  }
}

function reResolveWaterAutotiles({
  continentMap,
  pathGrid,
  bridgeGrid,
  W,
  H
}: FinalizeRouteGridsContext): void {
  (continentMap as { resolvedWater: ResolvedWaterMapResult }).resolvedWater = resolveWaterCoastGrid(
    continentMap.terrainMatrix,
    bridgeGrid
  );
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = continentMap.cells[y]![x]!;
      const wCell = continentMap.resolvedWater.cellDetails[y]?.[x];
      (cell as { terrain: string }).terrain = continentMap.terrainMatrix[y]![x]!;
      (cell as { waterRole: string | undefined }).waterRole = wCell?.role;
      if (wCell && wCell.terrain !== 'grass') {
        (cell as { layerStack: readonly string[] }).layerStack = [...wCell.layerStack];
      } else if (cell.terrain === 'grass') {
        (cell as { layerStack: readonly string[] }).layerStack = [BASE_GRASS_TILE];
      }
      if (cell.terrain === 'water') {
        pathGrid[y]![x] = false;
      }
    }
  }
}

export interface FinalizeRouteGridsContext {
  readonly continentMap: ContinentMapResult;
  readonly pathGrid: boolean[][];
  readonly bridgeGrid: boolean[][];
  readonly nodes: readonly POINode[];
  readonly W: number;
  readonly H: number;
}

/**
 * Finalizes path and bridge grids across terrain boundaries, prunes stubs, and re-resolves water.
 */
export function finalizeRouteGrids(ctx: FinalizeRouteGridsContext): void {
  const { continentMap, pathGrid, bridgeGrid, nodes, W, H } = ctx;
  cleanseBridgeAndSandGrids(ctx);
  sanitizeAndStampStairs(continentMap, pathGrid, W, H);
  pruneOrphanPathFragments(pathGrid, bridgeGrid, nodes, W, H);
  pruneDeadEndStubs(pathGrid, bridgeGrid, nodes, continentMap.placedStairs ?? [], W, H);
  reResolveWaterAutotiles(ctx);
}
