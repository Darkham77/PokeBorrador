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

const GATEWAY_RIM_SHOULDER_RADIUS = 2 as const;

function collectPoiRimPathCells(
  poi: POINode,
  pathGrid: readonly (readonly boolean[])[],
  width: number,
  height: number
): readonly StairPoint[] {
  const hits: StairPoint[] = [];
  const minY = Math.max(0, poi.gridY - 1);
  const maxY = Math.min(height - 1, poi.gridY + poi.footprint.height);
  const minX = Math.max(0, poi.gridX - 1);
  const maxX = Math.min(width - 1, poi.gridX + poi.footprint.width);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const inInterior =
        x >= poi.gridX &&
        x < poi.gridX + poi.footprint.width &&
        y >= poi.gridY &&
        y < poi.gridY + poi.footprint.height;
      if (!inInterior && pathGrid[y]?.[x]) {
        hits.push({ x, y });
      }
    }
  }
  return hits;
}

function isWithinPoiRimGatewayShoulder(
  x: number,
  y: number,
  poi: POINode,
  rimPathHits: readonly StairPoint[]
): boolean {
  const inInterior =
    x >= poi.gridX &&
    x < poi.gridX + poi.footprint.width &&
    y >= poi.gridY &&
    y < poi.gridY + poi.footprint.height;
  if (inInterior) return false;
  return rimPathHits.some(
    (g) => Math.abs(g.x - x) + Math.abs(g.y - y) <= GATEWAY_RIM_SHOULDER_RADIUS
  );
}

function markSinglePoiPerimeterBlocked(
  poi: POINode,
  blocked: boolean[][],
  pathGrid: readonly (readonly boolean[])[],
  width: number,
  height: number
): void {
  // Only urban hubs and route gates enforce a 1-tile outer sealing rim where !pathGrid;
  // cells within GATEWAY_RIM_SHOULDER_RADIUS of an actual POI rim path crossing stay open.
  const enforceOuterRim =
    poi.type === 'town' ||
    poi.type === 'city' ||
    poi.type === 'metropolis' ||
    poi.type === 'route_gate';
  const rim = enforceOuterRim ? 1 : 0;
  const rimPathHits = enforceOuterRim ? collectPoiRimPathCells(poi, pathGrid, width, height) : [];
  const minY = Math.max(0, poi.gridY - rim);
  const maxY = Math.min(height - 1, poi.gridY + poi.footprint.height + (rim - 1));
  const minX = Math.max(0, poi.gridX - rim);
  const maxX = Math.min(width - 1, poi.gridX + poi.footprint.width + (rim - 1));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pathGrid[y]?.[x]) continue;
      if (enforceOuterRim && isWithinPoiRimGatewayShoulder(x, y, poi, rimPathHits)) continue;
      blocked[y]![x] = true;
    }
  }
}

function buildPoiPerimeterBlockedGrid(
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  width: number,
  height: number
): boolean[][] {
  const blocked: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  for (const poi of pois) {
    markSinglePoiPerimeterBlocked(poi, blocked, pathGrid, width, height);
  }
  return blocked;
}

function stampRadialEnvelope(
  cx: number,
  cy: number,
  radius: number,
  maxRadiusSq: number,
  bounds: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
  },
  isEligible: (x: number, y: number) => boolean,
  transitableGrid: boolean[][]
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > maxRadiusSq) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < bounds.minX || nx > bounds.maxX || ny < bounds.minY || ny > bounds.maxY) continue;
      if (isEligible(nx, ny)) transitableGrid[ny]![nx] = true;
    }
  }
}

function stampBuildingEnvelope(
  b: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  bounds: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
  },
  isEligible: (x: number, y: number) => boolean,
  transitableGrid: boolean[][]
): void {
  const bMinY = Math.max(bounds.minY, b.y - 1);
  const bMaxY = Math.min(bounds.maxY, b.y + b.height);
  const bMinX = Math.max(bounds.minX, b.x - 1);
  const bMaxX = Math.min(bounds.maxX, b.x + b.width);
  for (let by = bMinY; by <= bMaxY; by++) {
    for (let bx = bMinX; bx <= bMaxX; bx++) {
      const isCorner =
        (bx === b.x - 1 || bx === b.x + b.width) && (by === b.y - 1 || by === b.y + b.height);
      if (!isCorner && isEligible(bx, by)) transitableGrid[by]![bx] = true;
    }
  }
}

function applySettlementTransitableSilhouette(
  poi: POINode,
  continentMap: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid: readonly (readonly boolean[])[],
  transitableGrid: boolean[][],
  W: number,
  H: number
): void {
  const bounds = {
    minX: Math.max(0, poi.gridX),
    minY: Math.max(0, poi.gridY),
    maxX: Math.min(W - 1, poi.gridX + poi.footprint.width - 1),
    maxY: Math.min(H - 1, poi.gridY + poi.footprint.height - 1)
  };

  const isCellEligibleForSettlementFootprint = (x: number, y: number): boolean => {
    const t = continentMap.terrainMatrix[y]?.[x];
    if (t === 'water' || t === 'water_deep') {
      return Boolean(bridgeGrid[y]?.[x]);
    }
    if (t === 'sand' && poi.type !== 'port_dock' && !pathGrid[y]?.[x] && !bridgeGrid[y]?.[x]) {
      return false;
    }
    if (
      poi.type !== 'cave_entrance' &&
      continentMap.resolvedMountain?.occupiedFootCells?.[y]?.[x]
    ) {
      return false;
    }
    return true;
  };

  if (poi.urbanLayout && poi.urbanLayout.internalStreets.length > 0) {
    const radialPad = 2;
    const radialMaxSq = 5;
    for (const pt of poi.urbanLayout.internalStreets) {
      stampRadialEnvelope(
        pt.x,
        pt.y,
        radialPad,
        radialMaxSq,
        bounds,
        isCellEligibleForSettlementFootprint,
        transitableGrid
      );
    }
    for (const b of poi.urbanLayout.buildings) {
      stampBuildingEnvelope(b, bounds, isCellEligibleForSettlementFootprint, transitableGrid);
    }
    const midX = poi.gridX + Math.floor(poi.footprint.width / 2);
    const midY = poi.gridY + Math.floor(poi.footprint.height / 2);
    stampRadialEnvelope(
      midX,
      midY,
      1,
      2,
      bounds,
      isCellEligibleForSettlementFootprint,
      transitableGrid
    );
    return;
  }

  // Fallback for POIs without compound urbanLayout: organically chamfer corners on dry land
  const FALLBACK_ELLIPSE_CUTOFF = 1.18;
  const cx = poi.gridX + poi.footprint.width / 2;
  const cy = poi.gridY + poi.footprint.height / 2;
  const rx = Math.max(1.5, poi.footprint.width / 2);
  const ry = Math.max(1.5, poi.footprint.height / 2);

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const ellDist = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      if (ellDist > FALLBACK_ELLIPSE_CUTOFF && !pathGrid[y]?.[x] && !bridgeGrid[y]?.[x]) continue;
      if (isCellEligibleForSettlementFootprint(x, y)) {
        transitableGrid[y]![x] = true;
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

  // 2. Expand outward up to effectiveRadius cells (excluding water bodies and foreign POI footprints)
  const poiPerimeterBlocked = buildPoiPerimeterBlockedGrid(pois, pathGrid, W, H);

  computeGridDistanceField(queue, dist, W, H, effectiveRadius, (nx, ny) => {
    const terrain = continentMap.terrainMatrix[ny]![nx];
    if (terrain === 'water' || terrain === 'water_deep') return true;
    return Boolean(poiPerimeterBlocked[ny]?.[nx]);
  });

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (dist[y]![x]! <= effectiveRadius) {
        transitableGrid[y]![x] = true;
      }
    }
  }

  // 3. Mark POI settlements and checkpoints cleanly along organic contours (no square sand/coast boxes)
  for (const poi of pois) {
    if (poi.type === 'route_gate') {
      applyRouteGateTransitable(poi, transitableGrid, pathGrid);
      continue;
    }

    applySettlementTransitableSilhouette(
      poi,
      continentMap,
      pathGrid,
      bridgeGrid,
      transitableGrid,
      W,
      H
    );
  }

  // 4. Stair Landings: Only dilate landing if an active route path actually visits this stair
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

    if (hasPath) {
      dilateStairLanding(stair, 2, W, H, transitableGrid);
    }
  }

  return transitableGrid;
}
