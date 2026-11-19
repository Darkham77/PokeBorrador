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

import type { RouteWaypoint } from '../../types/map/poiTypes.ts';
import { wouldExceedStraightCardinalRun } from '../utils/gridBfsUtils.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { MaritimeRockObstacle } from './routeNetworkEngine.ts';
import type { WaterTerrainKind } from './waterAutotileEngine.ts';

const CANONICAL_WATER_ROCK_OBSTACLE = 'poke_water_rocks_calm.png' as const;
const CANONICAL_WATER_ROCK_FOAM = 'poke_water_rock_foam.png' as const;
const MIN_FISHING_BALCONY_WATER_SPAN = 6 as const;
const SURF_ROCK_STEP_INTERVAL = 3 as const;
const SURF_ROCK_FLANK_OFFSET = 3 as const;
const SURF_ROCK_FLANK_SPREAD = 4 as const;
const SURF_CHANNEL_SAFE_RADIUS = 2 as const;
const SURF_FOAM_ALTERNATE_PERIOD = 3 as const;
const SURF_MAX_STRAIGHT_ROCK_RUN = 2 as const;
const SURF_ROCK_DENSITY_MOD = 10 as const;
const SURF_ROCK_KEEP_THRESHOLD = 4 as const;
const SURF_ROCK_HASH_PRIME_X = 73856093 as const;
const SURF_ROCK_HASH_PRIME_Y = 19349663 as const;
const SURF_ROCK_HASH_MOD = 100 as const;
const SURF_ROCK_DOUBLE_LINE_SKIP_MOD = 3 as const;

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
  W: number,
  preferredCompY?: number
): number {
  const fixedY = pts[0]!.y;
  let countMinus = 0;
  let countPlus = 0;
  const minRunX = Math.min(...pts.map((p) => p.x));
  const maxRunX = Math.max(...pts.map((p) => p.x));
  for (let x = Math.max(0, minRunX - 3); x <= Math.min(W - 1, maxRunX + 3); x++) {
    if (fixedY - 1 >= 0 && bridgeGrid[fixedY - 1]![x]) countMinus++;
    if (fixedY + 1 < H && bridgeGrid[fixedY + 1]![x]) countPlus++;
  }
  if (countMinus > countPlus && fixedY - 1 >= 0) return fixedY - 1;
  if (countPlus > countMinus && fixedY + 1 < H) return fixedY + 1;

  const minusValidWater =
    fixedY - 1 >= 0 && pts.every((p) => continentMap.cells[fixedY - 1]?.[p.x]?.terrain === 'water');
  const plusValidWater =
    fixedY + 1 < H && pts.every((p) => continentMap.cells[fixedY + 1]?.[p.x]?.terrain === 'water');

  if (preferredCompY === fixedY - 1 && minusValidWater) return fixedY - 1;
  if (preferredCompY === fixedY + 1 && plusValidWater) return fixedY + 1;

  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));

  let minusLandScore = 0;
  if (minusValidWater) {
    if (minX - 1 >= 0 && continentMap.cells[fixedY - 1]?.[minX - 1]?.terrain !== 'water')
      minusLandScore++;
    if (maxX + 1 < W && continentMap.cells[fixedY - 1]?.[maxX + 1]?.terrain !== 'water')
      minusLandScore++;
  }

  let plusLandScore = 0;
  if (plusValidWater) {
    if (minX - 1 >= 0 && continentMap.cells[fixedY + 1]?.[minX - 1]?.terrain !== 'water')
      plusLandScore++;
    if (maxX + 1 < W && continentMap.cells[fixedY + 1]?.[maxX + 1]?.terrain !== 'water')
      plusLandScore++;
  }

  if (minusValidWater && plusValidWater) {
    return plusLandScore > minusLandScore
      ? fixedY + 1
      : minusLandScore > plusLandScore
        ? fixedY - 1
        : fixedY + 1 < H
          ? fixedY + 1
          : fixedY - 1;
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
  H: number,
  preferredCompY?: number
): SegmentCompanion {
  const fixedY = seg.pts[0]!.y;
  const compY = computeHorizontalCompanionY(
    seg.pts,
    continentMap,
    bridgeGrid,
    H,
    W,
    preferredCompY
  );
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
    const shoreTerr =
      cFixed && cFixed !== 'water' ? cFixed : cComp && cComp !== 'water' ? cComp : 'sand';
    for (const cy of [fixedY, compY]) {
      if (continentMap.cells[cy]?.[landX]?.terrain === 'water') {
        (continentMap.cells[cy][landX] as { terrain: string }).terrain = shoreTerr;
        (continentMap.cells[cy][landX] as { isWalkable: boolean }).isWalkable = true;
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
  W: number,
  preferredCompX?: number
): number {
  const fixedX = pts[0]!.x;
  let countMinus = 0;
  let countPlus = 0;
  const minRunY = Math.min(...pts.map((p) => p.y));
  const maxRunY = Math.max(...pts.map((p) => p.y));
  for (let y = Math.max(0, minRunY - 3); y <= Math.min(H - 1, maxRunY + 3); y++) {
    if (fixedX - 1 >= 0 && bridgeGrid[y]![fixedX - 1]) countMinus++;
    if (fixedX + 1 < W && bridgeGrid[y]![fixedX + 1]) countPlus++;
  }
  if (countMinus > countPlus && fixedX - 1 >= 0) return fixedX - 1;
  if (countPlus > countMinus && fixedX + 1 < W) return fixedX + 1;

  const minusValidWater =
    fixedX - 1 >= 0 && pts.every((p) => continentMap.cells[p.y]?.[fixedX - 1]?.terrain === 'water');
  const plusValidWater =
    fixedX + 1 < W && pts.every((p) => continentMap.cells[p.y]?.[fixedX + 1]?.terrain === 'water');

  if (preferredCompX === fixedX - 1 && minusValidWater) return fixedX - 1;
  if (preferredCompX === fixedX + 1 && plusValidWater) return fixedX + 1;

  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));

  let minusLandScore = 0;
  if (minusValidWater) {
    if (minY - 1 >= 0 && continentMap.cells[minY - 1]?.[fixedX - 1]?.terrain !== 'water')
      minusLandScore++;
    if (maxY + 1 < H && continentMap.cells[maxY + 1]?.[fixedX - 1]?.terrain !== 'water')
      minusLandScore++;
  }

  let plusLandScore = 0;
  if (plusValidWater) {
    if (minY - 1 >= 0 && continentMap.cells[minY - 1]?.[fixedX + 1]?.terrain !== 'water')
      plusLandScore++;
    if (maxY + 1 < H && continentMap.cells[maxY + 1]?.[fixedX + 1]?.terrain !== 'water')
      plusLandScore++;
  }

  if (minusValidWater && plusValidWater) {
    return minusLandScore > plusLandScore
      ? fixedX - 1
      : plusLandScore > minusLandScore
        ? fixedX + 1
        : fixedX - 1 >= 0
          ? fixedX - 1
          : fixedX + 1;
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
  H: number,
  preferredCompX?: number
): SegmentCompanion {
  const fixedX = seg.pts[0]!.x;
  const compX = computeVerticalCompanionX(seg.pts, continentMap, bridgeGrid, H, W, preferredCompX);
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
    const shoreTerr =
      cFixed && cFixed !== 'water' ? cFixed : cComp && cComp !== 'water' ? cComp : 'sand';
    for (const cx of [fixedX, compX]) {
      if (continentMap.cells[landY]?.[cx]?.terrain === 'water') {
        (continentMap.cells[landY][cx] as { terrain: string }).terrain = shoreTerr;
        (continentMap.cells[landY][cx] as { isWalkable: boolean }).isWalkable = true;
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
  const stampShorePoint = (p: RouteWaypoint | null, comp: SegmentCompanion | undefined): void => {
    if (!p || continentMap.cells[p.y]?.[p.x]?.terrain === 'water') return;
    pathGrid[p.y]![p.x] = true;
    if (comp?.compY !== undefined && comp.compY >= 0 && comp.compY < H) {
      if (continentMap.cells[comp.compY]?.[p.x]?.terrain !== 'water') {
        pathGrid[comp.compY]![p.x] = true;
      }
    }
    if (comp?.compX !== undefined && comp.compX >= 0 && comp.compX < W) {
      if (continentMap.cells[p.y]?.[comp.compX]?.terrain !== 'water') {
        pathGrid[p.y]![comp.compX] = true;
      }
    }
  };

  // Stamp 2 steps inland on entrance shore
  const firstComp = companions[0];
  if (waterRunStart > 0) {
    stampShorePoint(path[waterRunStart - 1] ?? null, firstComp);
    if (waterRunStart > 1) {
      stampShorePoint(path[waterRunStart - 2] ?? null, firstComp);
    }
  }

  // Stamp 2 steps inland on exit shore
  const lastComp = companions[companions.length - 1];
  if (waterRunEnd + 1 < path.length) {
    stampShorePoint(path[waterRunEnd + 1] ?? null, lastComp);
    if (waterRunEnd + 2 < path.length) {
      stampShorePoint(path[waterRunEnd + 2] ?? null, lastComp);
    }
  }
}

export interface SurfChannelBoundaryOptions {
  readonly terrainMatrix: readonly (readonly WaterTerrainKind[])[];
  readonly bridgeGrid: readonly (readonly boolean[])[];
  readonly isOceanGrid?: readonly (readonly boolean[])[];
  readonly maritimeRockObstacles: MaritimeRockObstacle[];
  readonly occupiedKeys: Set<string>;
  readonly width: number;
  readonly height: number;
}

function isWaterCellForRock(
  terrainMatrix: readonly (readonly WaterTerrainKind[])[],
  bridgeGrid: readonly (readonly boolean[])[],
  rx: number,
  ry: number,
  W: number,
  H: number
): boolean {
  if (rx < 1 || rx >= W - 1 || ry < 1 || ry >= H - 1) return false;
  if (bridgeGrid[ry]?.[rx]) return false;
  const t = terrainMatrix[ry]?.[rx];
  if (t !== 'water' && t !== 'water_deep') return false;

  // Avoid hugging beach shorelines so Surf entry/exit coasts remain clear
  return (
    (terrainMatrix[ry - 1]?.[rx] === 'water' || terrainMatrix[ry - 1]?.[rx] === 'water_deep') &&
    (terrainMatrix[ry + 1]?.[rx] === 'water' || terrainMatrix[ry + 1]?.[rx] === 'water_deep') &&
    (terrainMatrix[ry]?.[rx - 1] === 'water' || terrainMatrix[ry]?.[rx - 1] === 'water_deep') &&
    (terrainMatrix[ry]?.[rx + 1] === 'water' || terrainMatrix[ry]?.[rx + 1] === 'water_deep')
  );
}

function tryStampChannelRock(
  rx: number,
  ry: number,
  opts: SurfChannelBoundaryOptions,
  protectedChannel: ReadonlySet<string>
): void {
  const {
    terrainMatrix,
    bridgeGrid,
    maritimeRockObstacles,
    occupiedKeys,
    width: W,
    height: H
  } = opts;
  const cellKey = `${rx}_${ry}`;
  if (protectedChannel.has(cellKey) || occupiedKeys.has(cellKey)) return;
  if (opts.isOceanGrid && !opts.isOceanGrid[ry]?.[rx]) return;
  if (!isWaterCellForRock(terrainMatrix, bridgeGrid, rx, ry, W, H)) return;

  const rockHash =
    Math.abs(rx * SURF_ROCK_HASH_PRIME_X + ry * SURF_ROCK_HASH_PRIME_Y) % SURF_ROCK_HASH_MOD;
  const useCalm =
    maritimeRockObstacles.length === 0 ||
    rockHash % SURF_ROCK_DOUBLE_LINE_SKIP_MOD === 0 ||
    maritimeRockObstacles.length % SURF_FOAM_ALTERNATE_PERIOD === 0;
  occupiedKeys.add(cellKey);
  maritimeRockObstacles.push({
    x: rx,
    y: ry,
    prefabFile: useCalm ? CANONICAL_WATER_ROCK_OBSTACLE : CANONICAL_WATER_ROCK_FOAM
  });
}

/**
 * Stamps organic staggered maritime boulder shoals framing Surf channels while relying
 * on deep ocean tiles as the primary route boundary (avoiding artificial parallel walls).
 */
export function appendSurfChannelRockBoundaries(
  waterPts: readonly RouteWaypoint[],
  opts: SurfChannelBoundaryOptions
): void {
  if (waterPts.length === 0) return;

  const protectedChannel = new Set<string>();
  for (const pt of waterPts) {
    for (let dy = -SURF_CHANNEL_SAFE_RADIUS; dy <= SURF_CHANNEL_SAFE_RADIUS; dy++) {
      for (let dx = -SURF_CHANNEL_SAFE_RADIUS; dx <= SURF_CHANNEL_SAFE_RADIUS; dx++) {
        protectedChannel.add(`${pt.x + dx}_${pt.y + dy}`);
      }
    }
  }

  for (let idx = 0; idx < waterPts.length; idx += SURF_ROCK_STEP_INTERVAL) {
    const pt: RouteWaypoint = waterPts[idx]!;
    const prev: RouteWaypoint = idx > 0 ? waterPts[idx - 1]! : pt;
    const next: RouteWaypoint = idx + 1 < waterPts.length ? waterPts[idx + 1]! : pt;
    const isH: boolean = Math.abs(next.x - prev.x) >= Math.abs(next.y - prev.y);

    for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
      const sideHash =
        Math.abs(
          (pt.x + sideIdx) * SURF_ROCK_HASH_PRIME_X + (pt.y - sideIdx) * SURF_ROCK_HASH_PRIME_Y
        ) % SURF_ROCK_HASH_MOD;
      if (
        opts.maritimeRockObstacles.length > 0 &&
        sideHash % SURF_ROCK_DENSITY_MOD >= SURF_ROCK_KEEP_THRESHOLD
      ) {
        continue;
      }

      const flankDist = SURF_ROCK_FLANK_OFFSET + (sideHash % SURF_ROCK_FLANK_SPREAD);
      const signedDist = sideIdx === 0 ? -flankDist : flankDist;
      const rx: number = pt.x + (isH ? 0 : signedDist);
      const ry: number = pt.y + (isH ? signedDist : 0);

      if (wouldExceedStraightCardinalRun(opts.occupiedKeys, rx, ry, SURF_MAX_STRAIGHT_ROCK_RUN)) {
        continue;
      }
      tryStampChannelRock(rx, ry, opts, protectedChannel);
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
  const occupiedKeys = new Set<string>(maritimeRockObstacles.map((o) => `${o.x}_${o.y}`));
  appendSurfChannelRockBoundaries(waterPts, {
    terrainMatrix: continentMap.terrainMatrix,
    bridgeGrid,
    maritimeRockObstacles,
    occupiedKeys,
    width: W,
    height: H
  });
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
      const stemY2 =
        stemY1 + 1 < H && bridgeGrid[stemY1 + 1]![p.x]
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
      const stemX2 =
        stemX1 + 1 < W && bridgeGrid[p.y]![stemX1 + 1]
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

function resolveBridgeSegmentCompanion(
  seg: OrthoSegment,
  ctx: BridgeWaterSpanContext,
  preferredCompYByRow: Map<number, number>,
  preferredCompXByCol: Map<number, number>
): SegmentCompanion {
  const { continentMap, bridgeGrid, mutableTerrainMatrix, W, H } = ctx;
  if (seg.isHorizontal) {
    const fixedY = seg.pts[0]!.y;
    const comp = traceHorizontalBridgeSegment(
      seg,
      continentMap,
      bridgeGrid,
      mutableTerrainMatrix,
      W,
      H,
      preferredCompYByRow.get(fixedY)
    );
    if (comp.compY !== undefined && !preferredCompYByRow.has(fixedY)) {
      preferredCompYByRow.set(fixedY, comp.compY);
    }
    return comp;
  }
  const fixedX = seg.pts[0]!.x;
  const comp = traceVerticalBridgeSegment(
    seg,
    continentMap,
    bridgeGrid,
    mutableTerrainMatrix,
    W,
    H,
    preferredCompXByCol.get(fixedX)
  );
  if (comp.compX !== undefined && !preferredCompXByCol.has(fixedX)) {
    preferredCompXByCol.set(fixedX, comp.compX);
  }
  return comp;
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
    maritimeRockObstacles,
    isSurfRoute,
    maxBridgeSpan,
    connectsMaritimePOI,
    W,
    H
  } = ctx;

  const preferredCompYByRow = new Map<number, number>();
  const preferredCompXByCol = new Map<number, number>();
  let waterRunStart = -1;
  for (let i = 0; i <= path.length; i++) {
    const isWater =
      i < path.length && continentMap.cells[path[i]!.y]![path[i]!.x]!.terrain === 'water';
    if (isWater && waterRunStart === -1) {
      waterRunStart = i;
      continue;
    }
    if (isWater || waterRunStart === -1) continue;

    const waterRunEnd = i - 1;
    const runLen = waterRunEnd - waterRunStart + 1;
    const waterPts = path.slice(waterRunStart, waterRunEnd + 1);
    const segments = partitionOrthoSegments(waterPts, waterRunStart, waterRunEnd, path);
    const isViableBridge = !isSurfRoute && runLen <= maxBridgeSpan && segments.length === 1;

    if (isViableBridge) {
      const companions = segments.map((seg) =>
        resolveBridgeSegmentCompanion(seg, ctx, preferredCompYByRow, preferredCompXByCol)
      );
      fillBridgeCornerJunctions(segments, companions, continentMap, bridgeGrid, W, H);
      connectBridgeShoreEnds(
        path,
        waterRunStart,
        waterRunEnd,
        companions,
        continentMap,
        pathGrid,
        W,
        H
      );
    } else {
      placeSurfRockObstacles(waterPts, continentMap, bridgeGrid, maritimeRockObstacles, W, H);
    }
    waterRunStart = -1;
  }

  if (!isSurfRoute && !connectsMaritimePOI) {
    stampFishingBalconies(path, continentMap, bridgeGrid, W, H);
  }
}
