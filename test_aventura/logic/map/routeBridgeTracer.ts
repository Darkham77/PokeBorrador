/**
 * test_aventura/logic/map/routeBridgeTracer.ts
 *
 * PROCEDURAL ROUTE BRIDGE & WATER CROSSING TRACER
 *
 * Processes continuous water spans along A* route paths:
 *   - Stamps uniform 2-cell wide boardwalk bridges with 2x2 corner junctions.
 *   - Guarantees solid 2-tile bridgehead landings at both shores.
 *   - Stamps single-sided fishing balconies on long crossings (>= 6 cells).
 *   - Places flanking rock obstacles on open-water Surf routes.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { RouteWaypoint } from '../../types/map/poiTypes.ts';
import type { MaritimeRockObstacle } from './routeNetworkEngine.ts';
import type { WaterTerrainKind } from './waterAutotileEngine.ts';

const CANONICAL_WATER_ROCK_OBSTACLE = 'poke_water_rocks_calm.png' as const;
const MIN_FISHING_BALCONY_WATER_SPAN = 6 as const;
const SURF_ROCK_STEP_INTERVAL = 3 as const;
const SURF_ROCK_FLANK_OFFSET = 2 as const;

export interface BridgeWaterSpanContext {
  readonly path: readonly RouteWaypoint[];
  readonly continentMap: ContinentMapResult;
  readonly bridgeGrid: boolean[][];
  readonly pathGrid: boolean[][];
  readonly mutableTerrainMatrix: WaterTerrainKind[][];
  readonly maritimeRockObstacles: MaritimeRockObstacle[];
  readonly isSurfRoute: boolean;
  readonly maxBridgeSpan: number;
  readonly connectsMaritimePOI: boolean;
  readonly W: number;
  readonly H: number;
}

interface OrthoSegment {
  readonly isHorizontal: boolean;
  readonly pts: readonly RouteWaypoint[];
}

interface SegmentCompanion {
  readonly compX?: number;
  readonly compY?: number;
}

function computeHorizontalCompanionY(
  pts: readonly RouteWaypoint[],
  continentMap: ContinentMapResult,
  bridgeGrid: boolean[][],
  H: number,
  W: number
): number {
  const fixedY = pts[0]!.y;
  let countMinus = 0;
  let countPlus = 0;
  for (const p of pts) {
    if (fixedY - 1 >= 0 && bridgeGrid[fixedY - 1]![p.x]) countMinus++;
    if (fixedY + 1 < H && bridgeGrid[fixedY + 1]![p.x]) countPlus++;
  }
  if (countMinus > countPlus && fixedY - 1 >= 0) return fixedY - 1;
  if (countPlus > countMinus && fixedY + 1 < H) return fixedY + 1;

  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minusValidWater = fixedY - 1 >= 0 && pts.every((p) => continentMap.cells[fixedY - 1]?.[p.x]?.terrain === 'water');
  const plusValidWater = fixedY + 1 < H && pts.every((p) => continentMap.cells[fixedY + 1]?.[p.x]?.terrain === 'water');

  let minusLandScore = 0;
  if (minusValidWater) {
    if (minX - 1 >= 0 && continentMap.cells[fixedY - 1]?.[minX - 1]?.terrain !== 'water') minusLandScore++;
    if (maxX + 1 < W && continentMap.cells[fixedY - 1]?.[maxX + 1]?.terrain !== 'water') minusLandScore++;
  }

  let plusLandScore = 0;
  if (plusValidWater) {
    if (minX - 1 >= 0 && continentMap.cells[fixedY + 1]?.[minX - 1]?.terrain !== 'water') plusLandScore++;
    if (maxX + 1 < W && continentMap.cells[fixedY + 1]?.[maxX + 1]?.terrain !== 'water') plusLandScore++;
  }

  if (minusValidWater && plusValidWater) {
    return plusLandScore > minusLandScore ? fixedY + 1 : (minusLandScore > plusLandScore ? fixedY - 1 : (fixedY + 1 < H ? fixedY + 1 : fixedY - 1));
  }
  if (plusValidWater) return fixedY + 1;
  if (minusValidWater) return fixedY - 1;
  return fixedY;
}

function traceHorizontalBridgeSegment(
  seg: OrthoSegment,
  continentMap: ContinentMapResult,
  bridgeGrid: boolean[][],
  mutableTerrainMatrix: WaterTerrainKind[][],
  W: number,
  H: number
): SegmentCompanion {
  const fixedY = seg.pts[0]!.y;
  const compY = computeHorizontalCompanionY(seg.pts, continentMap, bridgeGrid, H, W);
  const minX = Math.min(...seg.pts.map((p) => p.x));
  const maxX = Math.max(...seg.pts.map((p) => p.x));

  for (let x = minX; x <= maxX; x++) {
    if (continentMap.cells[fixedY]?.[x]?.terrain === 'water') {
      bridgeGrid[fixedY]![x] = true;
    }
    if (compY >= 0 && compY < H && continentMap.cells[compY]?.[x]?.terrain === 'water') {
      bridgeGrid[compY]![x] = true;
    }
  }

  const ensureHorizontalLanding = (landX: number): void => {
    if (landX < 0 || landX >= W) return;
    const cFixed = continentMap.cells[fixedY]?.[landX]?.terrain;
    const cComp = continentMap.cells[compY]?.[landX]?.terrain;
    const shoreTerr = (cFixed && cFixed !== 'water') ? cFixed : ((cComp && cComp !== 'water') ? cComp : 'sand');
    for (const cy of [fixedY, compY]) {
      if (continentMap.cells[cy]?.[landX]?.terrain === 'water') {
        (continentMap.cells[cy]![landX]! as { terrain: string }).terrain = shoreTerr;
        (continentMap.cells[cy]![landX]! as { isWalkable: boolean }).isWalkable = true;
        mutableTerrainMatrix[cy]![landX] = shoreTerr;
      }
    }
  };
  for (const lx of [minX - 2, minX - 1, maxX + 1, maxX + 2]) {
    ensureHorizontalLanding(lx);
  }

  return { compY };
}

function computeVerticalCompanionX(
  pts: readonly RouteWaypoint[],
  continentMap: ContinentMapResult,
  bridgeGrid: boolean[][],
  H: number,
  W: number
): number {
  const fixedX = pts[0]!.x;
  let countMinus = 0;
  let countPlus = 0;
  for (const p of pts) {
    if (fixedX - 1 >= 0 && bridgeGrid[p.y]![fixedX - 1]) countMinus++;
    if (fixedX + 1 < W && bridgeGrid[p.y]![fixedX + 1]) countPlus++;
  }
  if (countMinus > countPlus && fixedX - 1 >= 0) return fixedX - 1;
  if (countPlus > countMinus && fixedX + 1 < W) return fixedX + 1;

  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const minusValidWater = fixedX - 1 >= 0 && pts.every((p) => continentMap.cells[p.y]?.[fixedX - 1]?.terrain === 'water');
  const plusValidWater = fixedX + 1 < W && pts.every((p) => continentMap.cells[p.y]?.[fixedX + 1]?.terrain === 'water');

  let minusLandScore = 0;
  if (minusValidWater) {
    if (minY - 1 >= 0 && continentMap.cells[minY - 1]?.[fixedX - 1]?.terrain !== 'water') minusLandScore++;
    if (maxY + 1 < H && continentMap.cells[maxY + 1]?.[fixedX - 1]?.terrain !== 'water') minusLandScore++;
  }

  let plusLandScore = 0;
  if (plusValidWater) {
    if (minY - 1 >= 0 && continentMap.cells[minY - 1]?.[fixedX + 1]?.terrain !== 'water') plusLandScore++;
    if (maxY + 1 < H && continentMap.cells[maxY + 1]?.[fixedX + 1]?.terrain !== 'water') plusLandScore++;
  }

  if (minusValidWater && plusValidWater) {
    return minusLandScore > plusLandScore ? fixedX - 1 : (plusLandScore > minusLandScore ? fixedX + 1 : (fixedX - 1 >= 0 ? fixedX - 1 : fixedX + 1));
  }
  if (minusValidWater) return fixedX - 1;
  if (plusValidWater) return fixedX + 1;
  return fixedX;
}

function traceVerticalBridgeSegment(
  seg: OrthoSegment,
  continentMap: ContinentMapResult,
  bridgeGrid: boolean[][],
  mutableTerrainMatrix: WaterTerrainKind[][],
  W: number,
  H: number
): SegmentCompanion {
  const fixedX = seg.pts[0]!.x;
  const compX = computeVerticalCompanionX(seg.pts, continentMap, bridgeGrid, H, W);
  const minY = Math.min(...seg.pts.map((p) => p.y));
  const maxY = Math.max(...seg.pts.map((p) => p.y));

  for (let y = minY; y <= maxY; y++) {
    if (continentMap.cells[y]?.[fixedX]?.terrain === 'water') {
      bridgeGrid[y]![fixedX] = true;
    }
    if (compX >= 0 && compX < W && continentMap.cells[y]?.[compX]?.terrain === 'water') {
      bridgeGrid[y]![compX] = true;
    }
  }

  const ensureVerticalLanding = (landY: number): void => {
    if (landY < 0 || landY >= H) return;
    const cFixed = continentMap.cells[landY]?.[fixedX]?.terrain;
    const cComp = continentMap.cells[landY]?.[compX]?.terrain;
    const shoreTerr = (cFixed && cFixed !== 'water') ? cFixed : ((cComp && cComp !== 'water') ? cComp : 'sand');
    for (const cx of [fixedX, compX]) {
      if (continentMap.cells[landY]?.[cx]?.terrain === 'water') {
        (continentMap.cells[landY]![cx]! as { terrain: string }).terrain = shoreTerr;
        (continentMap.cells[landY]![cx]! as { isWalkable: boolean }).isWalkable = true;
        mutableTerrainMatrix[landY]![cx] = shoreTerr;
      }
    }
  };
  for (const ly of [minY - 2, minY - 1, maxY + 1, maxY + 2]) {
    ensureVerticalLanding(ly);
  }

  return { compX };
}

function fillBridgeCornerJunctions(
  segments: readonly OrthoSegment[],
  companions: readonly SegmentCompanion[],
  continentMap: ContinentMapResult,
  bridgeGrid: boolean[][],
  W: number,
  H: number
): void {
  for (let segIdx = 0; segIdx < segments.length - 1; segIdx++) {
    const segA = segments[segIdx]!;
    const compA = companions[segIdx]!;
    const compB = companions[segIdx + 1]!;
    const turnPt = segA.pts[segA.pts.length - 1]!;

    const cY = compA.compY ?? compB.compY ?? turnPt.y;
    const cX = compA.compX ?? compB.compX ?? turnPt.x;

    const cornerCoords = [
      { x: turnPt.x, y: turnPt.y },
      { x: cX, y: turnPt.y },
      { x: turnPt.x, y: cY },
      { x: cX, y: cY }
    ];
    for (const pt of cornerCoords) {
      if (
        pt.x >= 0 &&
        pt.x < W &&
        pt.y >= 0 &&
        pt.y < H &&
        continentMap.cells[pt.y]?.[pt.x]?.terrain === 'water'
      ) {
        bridgeGrid[pt.y]![pt.x] = true;
      }
    }
  }
}

function connectBridgeShoreEnds(
  path: readonly RouteWaypoint[],
  waterRunStart: number,
  waterRunEnd: number,
  companions: readonly SegmentCompanion[],
  continentMap: ContinentMapResult,
  pathGrid: boolean[][],
  W: number,
  H: number
): void {
  const prevShore = waterRunStart > 0 ? path[waterRunStart - 1] : null;
  if (prevShore && continentMap.cells[prevShore.y]?.[prevShore.x]?.terrain !== 'water') {
    pathGrid[prevShore.y]![prevShore.x] = true;
    const firstComp = companions[0];
    if (firstComp?.compY !== undefined && firstComp.compY >= 0 && firstComp.compY < H) {
      if (continentMap.cells[firstComp.compY]?.[prevShore.x]?.terrain !== 'water') {
        pathGrid[firstComp.compY]![prevShore.x] = true;
      }
    }
    if (firstComp?.compX !== undefined && firstComp.compX >= 0 && firstComp.compX < W) {
      if (continentMap.cells[prevShore.y]?.[firstComp.compX]?.terrain !== 'water') {
        pathGrid[prevShore.y]![firstComp.compX] = true;
      }
    }
  }

  const nextShore = waterRunEnd + 1 < path.length ? path[waterRunEnd + 1] : null;
  if (nextShore && continentMap.cells[nextShore.y]?.[nextShore.x]?.terrain !== 'water') {
    pathGrid[nextShore.y]![nextShore.x] = true;
    const lastComp = companions[companions.length - 1];
    if (lastComp?.compY !== undefined && lastComp.compY >= 0 && lastComp.compY < H) {
      if (continentMap.cells[lastComp.compY]?.[nextShore.x]?.terrain !== 'water') {
        pathGrid[lastComp.compY]![nextShore.x] = true;
      }
    }
    if (lastComp?.compX !== undefined && lastComp.compX >= 0 && lastComp.compX < W) {
      if (continentMap.cells[nextShore.y]?.[lastComp.compX]?.terrain !== 'water') {
        pathGrid[nextShore.y]![lastComp.compX] = true;
      }
    }
  }
}

function placeSurfRockObstacles(
  waterPts: readonly RouteWaypoint[],
  continentMap: ContinentMapResult,
  bridgeGrid: boolean[][],
  maritimeRockObstacles: MaritimeRockObstacle[],
  W: number,
  H: number
): void {
  for (let idx = 0; idx < waterPts.length; idx += SURF_ROCK_STEP_INTERVAL) {
    const pt: RouteWaypoint = waterPts[idx]!;
    const prev: RouteWaypoint = idx > 0 ? waterPts[idx - 1]! : pt;
    const next: RouteWaypoint = idx + 1 < waterPts.length ? waterPts[idx + 1]! : pt;
    const dx: number = next.x - prev.x;
    const dy: number = next.y - prev.y;
    const isH: boolean = Math.abs(dx) >= Math.abs(dy);

    const offsets = isH
      ? [{ ox: 0, oy: -SURF_ROCK_FLANK_OFFSET }, { ox: 0, oy: SURF_ROCK_FLANK_OFFSET }]
      : [{ ox: -SURF_ROCK_FLANK_OFFSET, oy: 0 }, { ox: SURF_ROCK_FLANK_OFFSET, oy: 0 }];

    for (const off of offsets) {
      const rx: number = pt.x + off.ox;
      const ry: number = pt.y + off.oy;
      if (
        rx >= 0 && rx < W && ry >= 0 && ry < H &&
        continentMap.cells[ry]?.[rx]?.terrain === 'water' &&
        !bridgeGrid[ry]?.[rx]
      ) {
        maritimeRockObstacles.push({
          x: rx,
          y: ry,
          prefabFile: CANONICAL_WATER_ROCK_OBSTACLE
        });
      }
    }
  }
}

function stampFishingBalconies(
  path: readonly RouteWaypoint[],
  continentMap: ContinentMapResult,
  bridgeGrid: boolean[][],
  W: number,
  H: number
): void {
  const stampPlatformOnRun = (startIdx: number, endIdx: number): void => {
    const runLen = endIdx - startIdx + 1;
    if (runLen < MIN_FISHING_BALCONY_WATER_SPAN) return;

    const midIdx = Math.floor((startIdx + endIdx) / 2);
    const p = path[midIdx]!;
    const pPrev = path[midIdx - 1]!;
    const isRunHorizontal = Math.abs(p.x - pPrev.x) >= Math.abs(p.y - pPrev.y);

    if (isRunHorizontal) {
      const stemY1 = p.y;
      const stemY2 = stemY1 + 1 < H && bridgeGrid[stemY1 + 1]![p.x]
        ? stemY1 + 1
        : stemY1 - 1 >= 0 && bridgeGrid[stemY1 - 1]![p.x]
          ? stemY1 - 1
          : stemY1;
      const maxY = Math.max(stemY1, stemY2);
      if (maxY + 1 < H && continentMap.cells[maxY + 1]?.[p.x]?.terrain === 'water') {
        bridgeGrid[maxY + 1]![p.x] = true;
      }
    } else {
      const stemX1 = p.x;
      const stemX2 = stemX1 + 1 < W && bridgeGrid[p.y]![stemX1 + 1]
        ? stemX1 + 1
        : stemX1 - 1 >= 0 && bridgeGrid[p.y]![stemX1 - 1]
          ? stemX1 - 1
          : stemX1;
      const maxX = Math.max(stemX1, stemX2);
      const minX = Math.min(stemX1, stemX2);
      if (maxX + 1 < W && continentMap.cells[p.y]?.[maxX + 1]?.terrain === 'water') {
        bridgeGrid[p.y]![maxX + 1] = true;
      } else if (minX - 1 >= 0 && continentMap.cells[p.y]?.[minX - 1]?.terrain === 'water') {
        bridgeGrid[p.y]![minX - 1] = true;
      }
    }
  };

  let runStart = -1;
  for (let i = 0; i < path.length; i++) {
    const isW = continentMap.cells[path[i]!.y]![path[i]!.x]!.terrain === 'water';
    if (isW && runStart === -1) {
      runStart = i;
    } else if (!isW && runStart !== -1) {
      stampPlatformOnRun(runStart, i - 1);
      runStart = -1;
    }
  }
  if (runStart !== -1) {
    stampPlatformOnRun(runStart, path.length - 1);
  }
}

function partitionOrthoSegments(
  waterPts: readonly RouteWaypoint[],
  waterRunStart: number,
  waterRunEnd: number,
  path: readonly RouteWaypoint[]
): readonly OrthoSegment[] {
  if (waterPts.length === 1) {
    const pPrev = waterRunStart > 0 ? path[waterRunStart - 1]! : waterPts[0]!;
    const pNext = waterRunEnd + 1 < path.length ? path[waterRunEnd + 1]! : waterPts[0]!;
    const isH = Math.abs(pNext.x - pPrev.x) >= Math.abs(pNext.y - pPrev.y);
    return [{ isHorizontal: isH, pts: [...waterPts] }];
  }

  const segments: OrthoSegment[] = [];
  let segStart = 0;
  let curIsH = waterPts[1]!.y === waterPts[0]!.y;
  for (let si = 1; si < waterPts.length; si++) {
    const stepIsH = waterPts[si]!.y === waterPts[si - 1]!.y;
    if (stepIsH !== curIsH) {
      segments.push({ isHorizontal: curIsH, pts: waterPts.slice(segStart, si) });
      segStart = si - 1;
      curIsH = stepIsH;
    }
  }
  segments.push({ isHorizontal: curIsH, pts: waterPts.slice(segStart) });
  return segments;
}

/**
 * Traces boardwalk bridges, bridgehead landings, and maritime obstacles along water spans.
 */
export function traceWaterSpansAndBridges(ctx: BridgeWaterSpanContext): void {
  const {
    path,
    continentMap,
    bridgeGrid,
    pathGrid,
    mutableTerrainMatrix,
    maritimeRockObstacles,
    isSurfRoute,
    maxBridgeSpan,
    connectsMaritimePOI,
    W,
    H
  } = ctx;

  let waterRunStart = -1;
  for (let i = 0; i <= path.length; i++) {
    const isWater =
      i < path.length &&
      continentMap.cells[path[i]!.y]![path[i]!.x]!.terrain === 'water';
    if (isWater && waterRunStart === -1) {
      waterRunStart = i;
    } else if (!isWater && waterRunStart !== -1) {
      const waterRunEnd = i - 1;
      const runLen = waterRunEnd - waterRunStart + 1;
      const waterPts = path.slice(waterRunStart, waterRunEnd + 1);
      const segments = partitionOrthoSegments(waterPts, waterRunStart, waterRunEnd, path);
      const isViableBridge = !isSurfRoute && runLen <= maxBridgeSpan && segments.length === 1;

      if (isViableBridge) {
        const companions: SegmentCompanion[] = [];
        for (const seg of segments) {
          const comp = seg.isHorizontal
            ? traceHorizontalBridgeSegment(seg, continentMap, bridgeGrid, mutableTerrainMatrix, W, H)
            : traceVerticalBridgeSegment(seg, continentMap, bridgeGrid, mutableTerrainMatrix, W, H);
          companions.push(comp);
        }
        fillBridgeCornerJunctions(segments, companions, continentMap, bridgeGrid, W, H);
        connectBridgeShoreEnds(path, waterRunStart, waterRunEnd, companions, continentMap, pathGrid, W, H);
      } else {
        placeSurfRockObstacles(waterPts, continentMap, bridgeGrid, maritimeRockObstacles, W, H);
      }
      waterRunStart = -1;
    }
  }

  if (!isSurfRoute && !connectsMaritimePOI) {
    stampFishingBalconies(path, continentMap, bridgeGrid, W, H);
  }
}
