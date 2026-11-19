import {
  HARBOR_BEACH_PADDING_WEST,
  HARBOR_BEACH_PADDING_EAST,
  HARBOR_BEACH_PADDING_SOUTH,
  FERRY_VESSEL_RESERVE_WIDTH,
  ROUTE_GATE_EXCLUSION_PADDING_X,
  PORT_DOCK_EXCLUSION_PADDING_X,
  PORT_DOCK_EXCLUSION_PADDING_BOTTOM,
  PORT_DOCK_EXCLUSION_PADDING_TOP,
  MIN_DISTANCE_BETWEEN_CAVES,
  HARBOR_WATER_PROXIMITY_RADIUS
} from '../../../config/continentalEngineConfig.ts';
import type { POINode } from '../../../types/map/poiTypes.ts';
import type { EmbeddedCorridor } from '../../../types/map/pokemonGraphTypes.ts';
import type { ContinentMapResult } from '../continentGenerator.ts';
import { pruneSlicedMountainArtifactsAfterZones } from '../continentMountainEngine.ts';
import { compileGeologicalAutotiling } from '../geologicalAutotilingEngine.ts';
import {
  applyDeepWaterCellsToContinent,
  sealCoastalSeaWithMaritimeRocks
} from '../maritimeBarrierEngine.ts';
import { pruneRedundantStairs, resolveMountainMapGrid } from '../mountainAutotileEngine.ts';
import { appendSurfChannelRockBoundaries } from '../routeBridgeTracer.ts';
import type { MaritimeRockObstacle } from '../routeNetworkEngine.ts';
import { computeOceanGrid, findPathAStar, getBestGateway } from '../routePathfinding.ts';
import { pruneDeadEndStubs, pruneOrphanPathFragments } from '../routePathPruning.ts';
import type { WaterTerrainKind } from '../waterAutotileEngine.ts';
import type { ContinentalSettlementPoisResult } from './continentalSettlementCompiler.ts';

const CORRIDOR_EXCLUSION_MODES = ['strict', 'tight', 'minimal', 'emergency'] as const;
type CorridorExclusionMode = (typeof CORRIDOR_EXCLUSION_MODES)[number];

const AUTO_SURFACE_BYPASS_TUNNEL_START = 100 as const;
const LEAF_BRANCH_STUB_EXEMPT_RADIUS = 20 as const;

export interface CarvedCorridorsResult {
  readonly pathGrid: boolean[][];
  readonly maritimeRockObstacles: readonly MaritimeRockObstacle[];
}

const CAVE_PAIR_SEARCH_MAX_RADIUS = 26 as const;
const CAVE_OUTCROP_WIDTH = 4 as const;
const CAVE_OUTCROP_HEIGHT = 3 as const;
const SURF_CHANNEL_STEP_SEARCH_MIN_WATER = 3 as const;

interface GridCoordinatePoint {
  readonly x: number;
  readonly y: number;
}

function isPointInHarborBasin(pt: GridCoordinatePoint, pois: readonly POINode[]): boolean {
  for (const p of pois) {
    if (p.type === 'port_dock') {
      if (
        pt.x >= p.gridX - PORT_DOCK_EXCLUSION_PADDING_X &&
        pt.x <= p.gridX + p.footprint.width + PORT_DOCK_EXCLUSION_PADDING_X &&
        pt.y >= p.gridY - PORT_DOCK_EXCLUSION_PADDING_TOP &&
        pt.y <= p.gridY + p.footprint.height + PORT_DOCK_EXCLUSION_PADDING_BOTTOM
      ) {
        return true;
      }
    }
  }
  return false;
}

const MAX_BOARDWALK_BRIDGE_RUN = 48 as const;
const MAX_OCEAN_BOARDWALK_BRIDGE_RUN = 14 as const;
const MAX_LARGE_OCEAN_BOARDWALK_BRIDGE_RUN = 32 as const;
const LARGE_CONTINENT_OCEAN_BRIDGE_THRESHOLD = 320 as const;
const WATER_LANDMARK_OCEAN_CHECK_RADIUS = 5 as const;
const MAX_MARITIME_ANCHOR_RETRIES = 6 as const;
const SURF_MEANDER_PRIME_A = 31 as const;
const SURF_MEANDER_PRIME_B = 17 as const;
const SURF_MEANDER_PRIME_C = 13 as const;
const SURF_MEANDER_PRIME_D = 7 as const;
const DOUBLE_BOARDWALK_MIN_RUN = 5 as const;
const BRIDGE_SHORE_APRON_MAX_SAND = 2 as const;
const BRIDGE_LAND_APPROACH_ROAD = 3 as const;

function isStraightAxisRun(
  pathCells: readonly GridCoordinatePoint[],
  start: number,
  end: number
): 'horizontal' | 'vertical' | null {
  const first = pathCells[start]!;
  let sameX = true;
  let sameY = true;
  for (let k = start + 1; k <= end; k++) {
    const pt = pathCells[k]!;
    if (pt.x !== first.x) sameX = false;
    if (pt.y !== first.y) sameY = false;
  }
  if (sameY) return 'horizontal';
  if (sameX) return 'vertical';
  return null;
}

function isBridgeSpanCompanionAvailable(
  x: number,
  y: number,
  terrainMatrix: readonly (readonly string[])[],
  heightmap: readonly (readonly number[])[],
  pois: readonly POINode[]
): boolean {
  const H = terrainMatrix.length;
  const W = terrainMatrix[0]?.length ?? 0;
  if (y < 0 || y >= H || x < 0 || x >= W) return false;
  if ((heightmap[y]?.[x] ?? 0) !== 0) return false;
  const t = terrainMatrix[y]?.[x];
  if (t !== 'water' && t !== 'water_deep' && t !== 'sand') return false;
  if (isPointInHarborBasin({ x, y }, pois)) return false;
  for (const p of pois) {
    if (
      x >= p.gridX &&
      x < p.gridX + p.footprint.width &&
      y >= p.gridY &&
      y < p.gridY + p.footprint.height
    ) {
      return false;
    }
  }
  return true;
}

function tryResolveWidenedBridgeSide(
  pathCells: readonly GridCoordinatePoint[],
  start: number,
  end: number,
  axis: 'horizontal' | 'vertical',
  terrainMatrix: readonly (readonly string[])[],
  heightmap: readonly (readonly number[])[],
  pois: readonly POINode[]
): readonly [number, number] | null {
  const candidates: readonly (readonly [number, number])[] =
    axis === 'horizontal'
      ? [
          [0, 1],
          [0, -1]
        ]
      : [
          [1, 0],
          [-1, 0]
        ];

  let bestCandidate: readonly [number, number] | null = null;
  let bestWaterCount = -1;

  for (const [ox, oy] of candidates) {
    let allWaterClear = true;
    let waterCount = 0;
    for (let k = start; k <= end; k++) {
      const pt = pathCells[k]!;
      const cx = pt.x + ox;
      const cy = pt.y + oy;
      if (!isBridgeSpanCompanionAvailable(cx, cy, terrainMatrix, heightmap, pois)) {
        allWaterClear = false;
        break;
      }
      const ct = terrainMatrix[cy]?.[cx];
      if (ct === 'water' || ct === 'water_deep') {
        waterCount++;
      }
    }
    if (allWaterClear && waterCount > bestWaterCount) {
      bestWaterCount = waterCount;
      bestCandidate = [ox, oy];
    }
  }
  return bestCandidate;
}

function isWaterSpanInOcean(
  pathCells: readonly GridCoordinatePoint[],
  wStart: number,
  wEnd: number,
  isOceanGrid?: readonly (readonly boolean[])[]
): boolean {
  if (!isOceanGrid) return false;
  for (let k = wStart; k <= wEnd; k++) {
    const pt = pathCells[k]!;
    if (isOceanGrid[pt.y]?.[pt.x]) return true;
  }
  return false;
}

function stampWaterBridgesForPath(
  pathCells: readonly GridCoordinatePoint[],
  continent: ContinentMapResult,
  bridgeGrid: boolean[][],
  pathGrid: boolean[][],
  pois: readonly POINode[],
  maxBridgeRun: number = MAX_BOARDWALK_BRIDGE_RUN,
  isOceanGrid?: readonly (readonly boolean[])[]
): boolean {
  const { terrainMatrix, heightmap } = continent;
  let wStart = -1;
  let hasSurfWater = false;

  const stampShoreApronAndApproach = (
    endIdx: number,
    outStep: -1 | 1,
    sideOffset: readonly [number, number] | null
  ): void => {
    const H = terrainMatrix.length;
    const W = terrainMatrix[0]?.length ?? 0;
    let sandBridged = 0;
    for (let step = 1; step <= BRIDGE_LAND_APPROACH_ROAD; step++) {
      const idx = endIdx + outStep * step;
      if (idx < 0 || idx >= pathCells.length) break;
      const pt = pathCells[idx]!;
      const t = terrainMatrix[pt.y]?.[pt.x];
      if (t === 'water' || t === 'water_deep') break;
      if ((heightmap[pt.y]?.[pt.x] ?? 0) !== 0) break;
      if (isPointInHarborBasin(pt, pois)) break;
      pathGrid[pt.y]![pt.x] = true;
      const isSymmetricalSandLanding =
        step === 1 &&
        t === 'sand' &&
        sandBridged < BRIDGE_SHORE_APRON_MAX_SAND &&
        (!sideOffset || terrainMatrix[pt.y + sideOffset[1]]?.[pt.x + sideOffset[0]] === 'sand');
      if (isSymmetricalSandLanding) {
        bridgeGrid[pt.y]![pt.x] = true;
        sandBridged++;
      }
      if (sideOffset) {
        const ax = pt.x + sideOffset[0];
        const ay = pt.y + sideOffset[1];
        const at = terrainMatrix[ay]?.[ax];
        if (
          ay >= 0 &&
          ay < H &&
          ax >= 0 &&
          ax < W &&
          (heightmap[ay]?.[ax] ?? 0) === 0 &&
          at &&
          at !== 'water' &&
          at !== 'water_deep'
        ) {
          pathGrid[ay]![ax] = true;
          if (isSymmetricalSandLanding) {
            bridgeGrid[ay]![ax] = true;
          }
        }
      }
    }
  };

  const applyBridgeRun = (start: number, end: number): void => {
    for (let k = start; k <= end; k++) {
      const pt = pathCells[k]!;
      if (isPointInHarborBasin(pt, pois)) {
        hasSurfWater = true;
      } else {
        bridgeGrid[pt.y]![pt.x] = true;
      }
    }
    const runLen = end - start + 1;
    const axis = isStraightAxisRun(pathCells, start, end);
    const sideOffset =
      runLen >= DOUBLE_BOARDWALK_MIN_RUN && axis
        ? tryResolveWidenedBridgeSide(pathCells, start, end, axis, terrainMatrix, heightmap, pois)
        : null;
    if (sideOffset) {
      const [ox, oy] = sideOffset;
      for (let k = start; k <= end; k++) {
        const pt = pathCells[k]!;
        bridgeGrid[pt.y + oy]![pt.x + ox] = true;
      }
    }
    stampShoreApronAndApproach(start, -1, sideOffset);
    stampShoreApronAndApproach(end, 1, sideOffset);
  };

  for (let i = 0; i <= pathCells.length; i++) {
    const isW =
      i < pathCells.length &&
      (terrainMatrix[pathCells[i]!.y]?.[pathCells[i]!.x] === 'water' ||
        terrainMatrix[pathCells[i]!.y]?.[pathCells[i]!.x] === 'water_deep');

    if (isW && wStart === -1) {
      wStart = i;
      continue;
    }

    if (!isW && wStart !== -1) {
      const wEnd = i - 1;
      const runLen = wEnd - wStart + 1;
      const oceanLimit =
        continent.width >= LARGE_CONTINENT_OCEAN_BRIDGE_THRESHOLD
          ? MAX_LARGE_OCEAN_BOARDWALK_BRIDGE_RUN
          : MAX_OCEAN_BOARDWALK_BRIDGE_RUN;
      const effectiveLimit = isWaterSpanInOcean(pathCells, wStart, wEnd, isOceanGrid)
        ? Math.min(maxBridgeRun, oceanLimit)
        : maxBridgeRun;
      if (runLen <= effectiveLimit) {
        applyBridgeRun(wStart, wEnd);
      } else {
        hasSurfWater = true;
      }
      wStart = -1;
    }
  }

  return hasSurfWater;
}

function isNearForeignGuideOrOtherPoi(
  x: number,
  y: number,
  targetPoi: POINode,
  pois: readonly POINode[],
  foreignPathGuide?: readonly (readonly boolean[])[]
): boolean {
  if (foreignPathGuide) {
    for (let dy = 0; dy <= 2; dy++) {
      if (foreignPathGuide[y + dy]?.[x] || foreignPathGuide[y + dy]?.[x + 1]) {
        return true;
      }
    }
  }
  const pad = 2;
  for (const p of pois) {
    if (p.id === targetPoi.id || p.id === `${targetPoi.id}_port_gate`) continue;
    if (
      x + CAVE_OUTCROP_WIDTH >= p.gridX - pad &&
      x <= p.gridX + p.footprint.width + pad &&
      y + CAVE_OUTCROP_HEIGHT + 1 >= p.gridY - pad &&
      y <= p.gridY + p.footprint.height + pad
    ) {
      return true;
    }
  }
  return false;
}

function findExistingCliffCaveSiteNearPoi(
  poi: POINode,
  continent: ContinentMapResult,
  pois: readonly POINode[],
  width: number,
  height: number,
  foreignPathGuide?: readonly (readonly boolean[])[]
): { x: number; y: number } | null {
  const cxOrigin = poi.gridX + Math.floor(poi.footprint.width / 2);
  const cyOrigin = poi.gridY + Math.floor(poi.footprint.height / 2);
  let best: { x: number; y: number } | null = null;
  let bestDist = Infinity;

  for (let dy = -CAVE_PAIR_SEARCH_MAX_RADIUS; dy <= CAVE_PAIR_SEARCH_MAX_RADIUS; dy++) {
    for (let dx = -CAVE_PAIR_SEARCH_MAX_RADIUS; dx <= CAVE_PAIR_SEARCH_MAX_RADIUS; dx++) {
      const cx = cxOrigin + dx;
      const cy = cyOrigin + dy;
      if (cx < 2 || cx >= width - 3 || cy < 2 || cy >= height - 3) continue;
      const mCell = continent.resolvedMountain?.cellDetails?.[cy]?.[cx];
      const isSouthWall =
        Boolean(mCell && (mCell.role.includes('edge_south') || mCell.role.includes('cliff'))) &&
        (continent.heightmap[cy]?.[cx] ?? 0) >= 1 &&
        (continent.heightmap[cy + 1]?.[cx] ?? 0) === 0;
      const frontT = continent.terrainMatrix[cy + 1]?.[cx];
      const hasBacking =
        (continent.heightmap[cy - 1]?.[cx] ?? 0) >= 1 &&
        (continent.heightmap[cy - 2]?.[cx] ?? 0) >= 1;
      if (!isSouthWall || !hasBacking || frontT === 'water' || frontT === 'water_deep') continue;
      if (isNearForeignGuideOrOtherPoi(cx, cy, poi, pois, foreignPathGuide)) continue;
      const nearExistingCave = pois.some(
        (p) =>
          p.type === 'cave_entrance' &&
          Math.hypot(p.gridX - cx, p.gridY - cy) < MIN_DISTANCE_BETWEEN_CAVES
      );
      if (nearExistingCave) continue;
      const d = Math.hypot(dx, dy);
      if (d < bestDist) {
        bestDist = d;
        best = { x: cx, y: cy };
      }
    }
  }
  return best;
}

function isOutcropAreaClear(
  startX: number,
  startY: number,
  continent: ContinentMapResult,
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  width: number,
  height: number,
  foreignPathGuide?: readonly (readonly boolean[])[]
): boolean {
  if (startX < 3 || startX + CAVE_OUTCROP_WIDTH >= width - 3) return false;
  if (startY < 3 || startY + CAVE_OUTCROP_HEIGHT + 2 >= height - 3) return false;
  for (let y = startY - 1; y <= startY + CAVE_OUTCROP_HEIGHT + 1; y++) {
    for (let x = startX - 1; x <= startX + CAVE_OUTCROP_WIDTH; x++) {
      const t = continent.terrainMatrix[y]?.[x];
      if (t !== 'grass' || (continent.heightmap[y]?.[x] ?? 0) > 0) return false;
      if (pathGrid[y]?.[x]) return false;
      if (foreignPathGuide?.[y]?.[x]) return false;
    }
  }
  for (const p of pois) {
    const pad = 2;
    if (
      startX + CAVE_OUTCROP_WIDTH >= p.gridX - pad &&
      startX <= p.gridX + p.footprint.width + pad &&
      startY + CAVE_OUTCROP_HEIGHT + 1 >= p.gridY - pad &&
      startY <= p.gridY + p.footprint.height + pad
    ) {
      return false;
    }
  }
  return true;
}

function sculptCaveOutcropNearPoi(
  poi: POINode,
  continent: ContinentMapResult,
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  width: number,
  height: number,
  foreignPathGuide?: readonly (readonly boolean[])[]
): { x: number; y: number } | null {
  const originX = poi.gridX + Math.floor(poi.footprint.width / 2);
  const originY = poi.gridY + Math.floor(poi.footprint.height / 2);
  const SEARCH_MIN_OFFSET = 5 as const;
  for (let r = SEARCH_MIN_OFFSET; r <= CAVE_PAIR_SEARCH_MAX_RADIUS; r++) {
    for (const [ox, oy] of [
      [-r, -r],
      [r, -r],
      [0, -r],
      [-r, 0],
      [r, 0],
      [-r, r],
      [r, r]
    ] as const) {
      const bx = originX + ox;
      const by = originY + oy;
      if (!isOutcropAreaClear(bx, by, continent, pois, pathGrid, width, height, foreignPathGuide)) {
        continue;
      }
      for (let dy = 0; dy < CAVE_OUTCROP_HEIGHT; dy++) {
        for (let dx = 0; dx < CAVE_OUTCROP_WIDTH; dx++) {
          (continent.heightmap as number[][])[by + dy]![bx + dx] = 1;
        }
      }
      return { x: bx + 1, y: by + CAVE_OUTCROP_HEIGHT - 1 };
    }
  }
  return null;
}

interface ConnectCaveMouthOptions {
  readonly mouth: POINode;
  readonly targetPoi: POINode;
  readonly continent: ContinentMapResult;
  readonly pathGrid: boolean[][];
  readonly bridgeGrid: boolean[][];
  readonly pois: readonly POINode[];
  readonly isOceanGrid: readonly (readonly boolean[])[];
  readonly foreignPathGuide?: readonly (readonly boolean[])[];
  readonly markForeignBuffer?: (path: readonly { x: number; y: number }[]) => void;
  readonly otherZones: readonly { x1: number; y1: number; x2: number; y2: number }[];
  readonly tightZones: readonly { x1: number; y1: number; x2: number; y2: number }[];
  readonly width: number;
  readonly height: number;
}

function connectCaveMouthToPoi(opts: ConnectCaveMouthOptions): void {
  const {
    mouth,
    targetPoi,
    continent,
    pathGrid,
    bridgeGrid,
    pois,
    isOceanGrid,
    foreignPathGuide,
    markForeignBuffer,
    otherZones,
    tightZones,
    width,
    height
  } = opts;
  const doorX = mouth.gridX;
  const frontDoorY = Math.min(height - 1, mouth.gridY + 2);
  for (const sy of [frontDoorY - 1, frontDoorY]) {
    if (sy < 0 || sy >= height) continue;
    for (const sx of [doorX, doorX + 1]) {
      if (sx < 0 || sx >= width) continue;
      const t = continent.terrainMatrix[sy]?.[sx];
      const elev = continent.heightmap[sy]?.[sx] ?? 0;
      const isFoot = continent.resolvedMountain?.occupiedFootCells?.[sy]?.[sx];
      if (t !== 'water' && t !== 'water_deep' && elev === 0 && !isFoot) {
        pathGrid[sy]![sx] = true;
      }
    }
  }
  const gw = getBestGateway(targetPoi, doorX, frontDoorY);
  let astar = findPathAStar(
    continent,
    gw.x,
    gw.y,
    doorX,
    frontDoorY,
    pathGrid,
    false,
    otherZones,
    isOceanGrid,
    true,
    foreignPathGuide
  );
  if (!astar || astar.path.length === 0) {
    astar = findPathAStar(
      continent,
      gw.x,
      gw.y,
      doorX,
      frontDoorY,
      pathGrid,
      true,
      tightZones,
      isOceanGrid,
      true,
      foreignPathGuide
    );
  }
  if (!astar || astar.path.length === 0) {
    astar = findPathAStar(
      continent,
      gw.x,
      gw.y,
      doorX,
      frontDoorY,
      pathGrid,
      true,
      otherZones,
      isOceanGrid
    );
  }
  if (astar && astar.path.length > 0) {
    stampWaterBridgesForPath(astar.path, continent, bridgeGrid, pathGrid, pois);
    for (const pt of astar.path) {
      for (const sx of [pt.x, pt.x + 1]) {
        if (sx < 0 || sx >= width) continue;
        const t = continent.terrainMatrix[pt.y]?.[sx];
        const elev = continent.heightmap[pt.y]?.[sx] ?? 0;
        const isFoot = continent.resolvedMountain?.occupiedFootCells?.[pt.y]?.[sx];
        if (t !== 'water' && t !== 'water_deep' && elev === 0 && !isFoot) {
          pathGrid[pt.y]![sx] = true;
        }
      }
    }
    markForeignBuffer?.(astar.path);
  }
}

export function carveContinentalCorridorsAndPaths(
  continent: ContinentMapResult,
  settlementPois: ContinentalSettlementPoisResult,
  seed: number,
  width: number,
  height: number
): CarvedCorridorsResult {
  const { pois, poiById, bridgeGrid, placedGates, activeCorridors } = settlementPois;
  const isOceanGrid = computeOceanGrid(continent);
  const pathGrid: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

  // Project wooden harbor pier of width >= 3 extending 3-5 tiles into deep water
  for (const poi of pois) {
    if (poi.type !== 'port_dock') continue;
    const pierW = 3;
    const pierLen = 4;
    const pierStartX =
      poi.gridX + (poi.footprint.width >= 7 ? Math.floor((poi.footprint.width - pierW) / 2) : 0);
    const pierStartY = poi.gridY + poi.footprint.height;

    for (let dy = 0; dy < pierLen; dy++) {
      const py = pierStartY + dy;
      if (py < 0 || py >= height) continue;
      for (let dx = 0; dx < pierW; dx++) {
        const px = pierStartX + dx;
        if (px < 0 || px >= width) continue;
        bridgeGrid[py]![px] = true;
        (continent.terrainMatrix as WaterTerrainKind[][])[py]![px] = 'water';
      }
    }

    // Reserve mooring cell adjacent to the pier for ferry vessel sprite
    const ferryX = pierStartX + pierW + 1;
    const ferryY = pierStartY;
    if (ferryY + 4 < height && ferryX + FERRY_VESSEL_RESERVE_WIDTH < width) {
      for (let fdy = 0; fdy < 4; fdy++) {
        for (let fdx = 0; fdx < FERRY_VESSEL_RESERVE_WIDTH; fdx++) {
          (continent.terrainMatrix as WaterTerrainKind[][])[ferryY + fdy]![ferryX + fdx] = 'water';
        }
      }
    }
  }

  const scaleRatio = Math.min(1, Math.min(width, height) / 400);
  const gateExclusionPadX = Math.max(2, Math.round(ROUTE_GATE_EXCLUSION_PADDING_X * scaleRatio));
  const portExclusionPadX = Math.max(3, Math.round(PORT_DOCK_EXCLUSION_PADDING_X * scaleRatio));
  const portExclusionPadBottom = Math.max(
    4,
    Math.round(PORT_DOCK_EXCLUSION_PADDING_BOTTOM * scaleRatio)
  );
  const poiSafetyPad = Math.min(width, height) >= 200 ? 6 : 4;
  const foreignCorridorGap = 6 as const;

  const collectCorridorExclusionZones = (
    fromPoi: POINode,
    toPoi: POINode,
    mode: CorridorExclusionMode = 'strict'
  ): { x1: number; y1: number; x2: number; y2: number }[] => {
    const zones: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const tightPoiBounds = mode !== 'strict';
    const zeroExternalPad = mode === 'emergency';
    const includeOwnBuildings = mode !== 'emergency';
    const minimalSealingPad = 2;
    const tightFallbackPad = zeroExternalPad
      ? 0
      : mode === 'minimal'
        ? minimalSealingPad
        : Math.min(width, height) >= 200
          ? 4
          : 2;
    const pad = tightPoiBounds ? tightFallbackPad : poiSafetyPad;
    for (const p of pois) {
      if (p.id !== fromPoi.id && p.id !== toPoi.id) {
        if (zeroExternalPad && p.type !== 'route_gate') {
          zones.push({
            x1: p.gridX,
            y1: p.gridY,
            x2: p.gridX + p.footprint.width - 1,
            y2: p.gridY + p.footprint.height - 1
          });
        } else if (p.type === 'route_gate') {
          zones.push({
            x1: p.gridX - (tightPoiBounds ? 1 : gateExclusionPadX),
            y1: p.gridY - Math.max(2, Math.round(4 * scaleRatio)),
            x2: p.gridX + p.footprint.width + (tightPoiBounds ? 1 : gateExclusionPadX),
            y2: p.gridY + p.footprint.height + Math.max(2, Math.round(4 * scaleRatio))
          });
        } else if (p.type === 'port_dock') {
          const isOwnedHarbor =
            p.id === `${fromPoi.id}_port_gate` || p.id === `${toPoi.id}_port_gate`;
          zones.push(
            isOwnedHarbor
              ? {
                  x1: p.gridX,
                  y1: p.gridY,
                  x2: p.gridX + p.footprint.width - 1,
                  y2: p.gridY + p.footprint.height + (tightPoiBounds ? 2 : portExclusionPadBottom)
                }
              : {
                  x1: p.gridX - (tightPoiBounds ? 1 : portExclusionPadX),
                  y1: p.gridY - 2,
                  x2: p.gridX + p.footprint.width + (tightPoiBounds ? 1 : portExclusionPadX),
                  y2: p.gridY + p.footprint.height + (tightPoiBounds ? 2 : portExclusionPadBottom)
                }
          );
        } else {
          zones.push({
            x1: p.gridX - pad,
            y1: p.gridY - pad,
            x2: p.gridX + p.footprint.width - 1 + pad,
            y2: p.gridY + p.footprint.height - 1 + pad
          });
        }
      } else if (p.type === 'route_gate') {
        const isHoriz = p.facing === 'east' || p.facing === 'west';
        const b = p.urbanLayout?.buildings[0];
        if (isHoriz) {
          const doorY = b ? b.y + b.height - 1 : p.gridY + 5;
          if (doorY - 2 >= p.gridY) {
            zones.push({
              x1: p.gridX,
              y1: p.gridY,
              x2: p.gridX + p.footprint.width - 1,
              y2: doorY - 2
            });
          }
          if (doorY + 1 <= p.gridY + p.footprint.height - 1) {
            zones.push({
              x1: p.gridX,
              y1: doorY + 1,
              x2: p.gridX + p.footprint.width - 1,
              y2: p.gridY + p.footprint.height - 1
            });
          }
        } else {
          const midX = b ? Math.floor(b.x + b.width / 2) : p.gridX + 5;
          if (midX - 2 >= p.gridX) {
            zones.push({
              x1: p.gridX,
              y1: p.gridY,
              x2: midX - 2,
              y2: p.gridY + p.footprint.height - 1
            });
          }
          if (midX + 1 <= p.gridX + p.footprint.width - 1) {
            zones.push({
              x1: midX + 1,
              y1: p.gridY,
              x2: p.gridX + p.footprint.width - 1,
              y2: p.gridY + p.footprint.height - 1
            });
          }
        }
      } else if (p.type === 'port_dock') {
        zones.push({
          x1: p.gridX - PORT_DOCK_EXCLUSION_PADDING_X,
          y1: p.gridY - 2,
          x2: p.gridX + p.footprint.width + PORT_DOCK_EXCLUSION_PADDING_X,
          y2: p.gridY + p.footprint.height + PORT_DOCK_EXCLUSION_PADDING_BOTTOM
        });
      } else if (includeOwnBuildings && p.urbanLayout?.buildings) {
        for (const b of p.urbanLayout.buildings) {
          zones.push({
            x1: b.x,
            y1: b.y,
            x2: b.x + b.width - 1,
            y2: b.y + b.height - 1
          });
        }
      }
    }
    return zones;
  };

  const foreignPathGuide: boolean[][] = Array.from({ length: height }, () =>
    Array(width).fill(false)
  );
  const isolatedEmptyGrid: boolean[][] = Array.from({ length: height }, () =>
    Array(width).fill(false)
  );

  const isInsidePoiExitApron = (x: number, y: number, poi: POINode, apron: number): boolean =>
    x >= poi.gridX - apron &&
    x < poi.gridX + poi.footprint.width + apron &&
    y >= poi.gridY - apron &&
    y < poi.gridY + poi.footprint.height + apron;

  const markForeignCorridorBuffer = (
    path: readonly { x: number; y: number }[],
    fromPoi: POINode,
    toPoi: POINode
  ): void => {
    const poiApronPad = 0;
    for (let i = 1; i < path.length - 1; i++) {
      const pt = path[i]!;
      if (
        isInsidePoiExitApron(pt.x, pt.y, fromPoi, poiApronPad) ||
        isInsidePoiExitApron(pt.x, pt.y, toPoi, poiApronPad)
      ) {
        continue;
      }
      for (let dy = -foreignCorridorGap; dy <= foreignCorridorGap + 1; dy++) {
        for (let dx = -foreignCorridorGap; dx <= foreignCorridorGap + 1; dx++) {
          const nx = pt.x + dx;
          const ny = pt.y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (
            isInsidePoiExitApron(nx, ny, fromPoi, poiApronPad) ||
            isInsidePoiExitApron(nx, ny, toPoi, poiApronPad)
          ) {
            continue;
          }
          foreignPathGuide[ny]![nx] = true;
        }
      }
    }
  };

  let fallbackTunnelIdx: number = AUTO_SURFACE_BYPASS_TUNNEL_START;
  for (const corridor of activeCorridors) {
    if (corridor.kind === 'wormhole_tunnel' || corridor.kind === 'surf_route') continue;
    const fromPoi = poiById.get(corridor.fromId);
    const toPoi = poiById.get(corridor.toId);

    let stamped = false;
    if (fromPoi && toPoi) {
      const startGw =
        (corridor as { customStartGw?: { x: number; y: number } }).customStartGw ??
        getBestGateway(fromPoi, toPoi.gridX, toPoi.gridY);
      const goalGw =
        (corridor as { customGoalGw?: { x: number; y: number } }).customGoalGw ??
        getBestGateway(toPoi, fromPoi.gridX, fromPoi.gridY);

      // Exclude third-party settlements and protect route gatehouses from being bypassed or clipped
      const otherZones = collectCorridorExclusionZones(fromPoi, toPoi, 'strict');

      // Pass 1: Strict disjoint corridor routing (prevents mid-field T-junction shortcuts bypassing hubs)
      let astarRes = findPathAStar(
        continent,
        startGw.x,
        startGw.y,
        goalGw.x,
        goalGw.y,
        isolatedEmptyGrid,
        true,
        otherZones,
        isOceanGrid,
        true,
        foreignPathGuide
      );

      const hasRouteGateEndpoint = fromPoi.type === 'route_gate' || toPoi.type === 'route_gate';
      const allowSecondaryPlanarPasses =
        corridor.kind === 'main_chain' ||
        hasRouteGateEndpoint ||
        (corridor.kind === 'branch_stub' && Math.min(width, height) >= 200);

      if ((!astarRes || astarRes.path.length === 0) && allowSecondaryPlanarPasses) {
        const tightZones = collectCorridorExclusionZones(fromPoi, toPoi, 'tight');
        astarRes = findPathAStar(
          continent,
          startGw.x,
          startGw.y,
          goalGw.x,
          goalGw.y,
          isolatedEmptyGrid,
          true,
          tightZones,
          isOceanGrid,
          true,
          foreignPathGuide
        );
      }

      const promoteToSurfaceBypassTunnel = (): void => {
        const mutableCorridor: {
          -readonly [K in keyof EmbeddedCorridor]: EmbeddedCorridor[K];
        } = corridor;
        mutableCorridor.kind = 'wormhole_tunnel';
        mutableCorridor.waypoints = [];
        mutableCorridor.pathCells = [];
        if (!mutableCorridor.tunnelPairId) {
          mutableCorridor.tunnelPairId = `tunnel_surface_bypass_${fallbackTunnelIdx++}`;
        }
      };

      const isLeafDungeonStub =
        corridor.kind === 'branch_stub' &&
        Math.min(width, height) >= 240 &&
        (fromPoi.type === 'cave_entrance' ||
          fromPoi.type === 'dungeon_forest' ||
          toPoi.type === 'cave_entrance' ||
          toPoi.type === 'dungeon_forest');

      if (!astarRes || astarRes.path.length === 0) {
        // Non-planar cycles (or compact branch stubs) without route_gate endpoints promote cleanly
        // to subterranean transit tunnels instead of squeezing past intermediate settlements.
        if (!allowSecondaryPlanarPasses) {
          promoteToSurfaceBypassTunnel();
          continue;
        }

        // Pass 3: Keep corridors disjoint along tight coastal beaches (pad=0 + foreignPathGuide)
        const minimalZones = collectCorridorExclusionZones(fromPoi, toPoi, 'minimal');
        astarRes = findPathAStar(
          continent,
          startGw.x,
          startGw.y,
          goalGw.x,
          goalGw.y,
          isolatedEmptyGrid,
          true,
          minimalZones,
          isOceanGrid,
          true,
          foreignPathGuide,
          isLeafDungeonStub ? LEAF_BRANCH_STUB_EXEMPT_RADIUS : undefined
        );

        if ((!astarRes || astarRes.path.length === 0) && !hasRouteGateEndpoint) {
          promoteToSurfaceBypassTunnel();
          continue;
        }
      }

      if (
        (!astarRes || astarRes.path.length === 0) &&
        (corridor.kind === 'main_chain' || hasRouteGateEndpoint)
      ) {
        astarRes = findPathAStar(
          continent,
          startGw.x,
          startGw.y,
          goalGw.x,
          goalGw.y,
          pathGrid,
          true,
          otherZones,
          isOceanGrid
        );
      }

      if (
        (!astarRes || astarRes.path.length === 0) &&
        (corridor.kind === 'main_chain' || hasRouteGateEndpoint)
      ) {
        const emergencyZones = collectCorridorExclusionZones(fromPoi, toPoi, 'emergency');
        astarRes = findPathAStar(
          continent,
          startGw.x,
          startGw.y,
          goalGw.x,
          goalGw.y,
          pathGrid,
          true,
          emergencyZones,
          isOceanGrid
        );
      }

      if (astarRes && astarRes.path.length > 0) {
        const hasSurfWater = stampWaterBridgesForPath(
          astarRes.path,
          continent,
          bridgeGrid,
          pathGrid,
          pois,
          MAX_BOARDWALK_BRIDGE_RUN,
          isOceanGrid
        );
        if (hasSurfWater) {
          (corridor as { kind: string }).kind = 'surf_route';
        }

        const stampAstarPath = (path: readonly { x: number; y: number }[]): void => {
          for (let i = 0; i < path.length; i++) {
            const pt = path[i]!;
            if (pt.x < 0 || pt.x >= width || pt.y < 0 || pt.y >= height) continue;
            const t = continent.terrainMatrix[pt.y]?.[pt.x];
            if (t === 'water' || t === 'water_deep') continue;
            pathGrid[pt.y]![pt.x] = true;

            const prev = path[i - 1] ?? pt;
            const next = path[i + 1] ?? pt;
            const isHoriz = Math.abs(next.x - prev.x) >= Math.abs(next.y - prev.y);
            const sx = isHoriz ? pt.x : pt.x + 1;
            const sy = isHoriz ? pt.y + 1 : pt.y;
            if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
              const st = continent.terrainMatrix[sy]?.[sx];
              const sElev = continent.heightmap[sy]?.[sx] ?? 0;
              const blockedByZone = otherZones.some(
                (z) => sx >= z.x1 && sx <= z.x2 && sy >= z.y1 && sy <= z.y2
              );
              if (
                !blockedByZone &&
                st &&
                st !== 'water' &&
                st !== 'water_deep' &&
                sElev === (continent.heightmap[pt.y]?.[pt.x] ?? 0) &&
                !continent.resolvedMountain.occupiedFootCells[sy]?.[sx]
              ) {
                pathGrid[sy]![sx] = true;
              }
            }
          }
        };

        stampAstarPath(astarRes.path);
        markForeignCorridorBuffer(astarRes.path, fromPoi, toPoi);
        (corridor as { pathCells: typeof corridor.pathCells }).pathCells = astarRes.path;
        stamped = true;
      }
    }

    if (!stamped) {
      // Never dump broken dotted fragments from abstract fallback cells; skip disconnected corridor stub.
      console.warn(
        `[ContinentalEngine] Warning: Corridor ${corridor.id} (${corridor.fromId} -> ${corridor.toId}) failed A* pathfinding; skipping disconnected fragment.`
      );
    }
  }

  // Ensure harbor basins around port docks are 100% free of stray bridge pieces
  for (const port of pois) {
    if (port.type !== 'port_dock') continue;
    const pierStartX =
      port.gridX + (port.footprint.width >= 7 ? Math.floor((port.footprint.width - 3) / 2) : 0);
    const pierEndX = pierStartX + 2;
    const pierStartY = port.gridY + port.footprint.height;

    for (
      let y = port.gridY - 2;
      y <= port.gridY + port.footprint.height + PORT_DOCK_EXCLUSION_PADDING_BOTTOM;
      y++
    ) {
      for (
        let x = port.gridX - PORT_DOCK_EXCLUSION_PADDING_X;
        x <= port.gridX + port.footprint.width + PORT_DOCK_EXCLUSION_PADDING_X;
        x++
      ) {
        if (y < 0 || y >= height || x < 0 || x >= width) continue;
        const isPartOfPier = x >= pierStartX && x <= pierEndX && y >= pierStartY;
        if (!isPartOfPier && bridgeGrid[y]?.[x]) {
          bridgeGrid[y]![x] = false;
        }
      }
    }
  }

  // Ensure doorsteps in front of cave entrances connect to the route network
  for (const poi of pois) {
    if (poi.type === 'cave_entrance') {
      const doorY = poi.gridY + 1;
      const doorX = poi.gridX;
      if (doorY >= 0 && doorY < height && doorX >= 0 && doorX < width) {
        pathGrid[doorY]![doorX] = true;
      }
    }
  }

  // Carve Surf Routes & Archipelago Maritime Channels with FireRed Sea Rock Boundaries
  const maritimeRockObstacles: MaritimeRockObstacle[] = [];
  const occupiedRockKeys = new Set<string>();
  const surfWaypoints: GridCoordinatePoint[] = [];

  const traceMaritimeWaterCorridor = (
    fromPt: GridCoordinatePoint,
    toPt: GridCoordinatePoint
  ): boolean => {
    const waterMeanderSeed = Math.abs(
      fromPt.x * SURF_MEANDER_PRIME_A +
        fromPt.y * SURF_MEANDER_PRIME_B +
        toPt.x * SURF_MEANDER_PRIME_C +
        toPt.y * SURF_MEANDER_PRIME_D
    );
    const waterRes = findPathAStar(
      continent,
      fromPt.x,
      fromPt.y,
      toPt.x,
      toPt.y,
      pathGrid,
      true,
      [],
      isOceanGrid,
      true,
      undefined,
      undefined,
      { waterMeanderSeed }
    );
    const pts = waterRes?.path ?? [];
    if (pts.length === 0) return false;

    const waterPts: GridCoordinatePoint[] = [];
    for (const pt of pts) {
      const t = continent.terrainMatrix[pt.y]?.[pt.x];
      if (
        (t === 'water' || t === 'water_deep') &&
        isOceanGrid[pt.y]?.[pt.x] &&
        !bridgeGrid[pt.y]?.[pt.x]
      ) {
        waterPts.push(pt);
        surfWaypoints.push(pt);
      }
    }
    if (waterPts.length >= SURF_CHANNEL_STEP_SEARCH_MIN_WATER) {
      appendSurfChannelRockBoundaries(waterPts, {
        terrainMatrix: continent.terrainMatrix,
        bridgeGrid,
        isOceanGrid,
        maritimeRockObstacles,
        occupiedKeys: occupiedRockKeys,
        width,
        height
      });
    }
    return waterPts.length > 0;
  };

  for (const corridor of activeCorridors) {
    if (corridor.kind !== 'surf_route') continue;
    const fromPoi = poiById.get(corridor.fromId);
    const toPoi = poiById.get(corridor.toId);
    if (!fromPoi || !toPoi) continue;
    const gwA = getBestGateway(fromPoi, toPoi.gridX, toPoi.gridY);
    const gwB = getBestGateway(toPoi, fromPoi.gridX, fromPoi.gridY);
    traceMaritimeWaterCorridor(gwA, gwB);
  }

  const isPoiOnArchipelago = (poi: POINode): boolean => {
    const islands = continent.archipelagoIslands;
    if (!islands || islands.length === 0) return false;
    const cx = poi.gridX + Math.floor(poi.footprint.width / 2);
    const cy = poi.gridY + Math.floor(poi.footprint.height / 2);
    return islands.some((isl) => Math.hypot(cx - isl.cx, cy - isl.cy) <= isl.radiusX + isl.radiusY);
  };

  const mainlandAnchors = pois.filter((p) => p.type !== 'water_landmark' && !isPoiOnArchipelago(p));
  const fallbackAnchors = mainlandAnchors.length > 0 ? mainlandAnchors : pois;

  const traceMaritimeFromClosestReachableAnchor = (targetPt: GridCoordinatePoint): void => {
    const sortedCandidates = fallbackAnchors
      .map((anchor) => {
        const pt = getBestGateway(anchor, targetPt.x, targetPt.y);
        const dx = pt.x - targetPt.x;
        const dy = pt.y - targetPt.y;
        return { pt, distSq: dx * dx + dy * dy };
      })
      .sort((a, b) => a.distSq - b.distSq);

    const limit = Math.min(sortedCandidates.length, MAX_MARITIME_ANCHOR_RETRIES);
    for (let i = 0; i < limit; i++) {
      if (traceMaritimeWaterCorridor(sortedCandidates[i]!.pt, targetPt)) {
        return;
      }
    }
  };

  // Ensure every navigable archipelago island connects from its closest reachable coastal mainland POI
  if (continent.archipelagoIslands && continent.archipelagoIslands.length > 0) {
    for (const island of continent.archipelagoIslands) {
      traceMaritimeFromClosestReachableAnchor({ x: island.cx, y: island.cy });
    }
  }

  const findNearestOceanCellAroundPoi = (poi: POINode): GridCoordinatePoint | null => {
    const cx = poi.gridX + Math.floor(poi.footprint.width / 2);
    const cy = poi.gridY + Math.floor(poi.footprint.height / 2);
    const minX = Math.max(0, poi.gridX - WATER_LANDMARK_OCEAN_CHECK_RADIUS);
    const maxX = Math.min(
      width - 1,
      poi.gridX + poi.footprint.width + WATER_LANDMARK_OCEAN_CHECK_RADIUS
    );
    const minY = Math.max(0, poi.gridY - WATER_LANDMARK_OCEAN_CHECK_RADIUS);
    const maxY = Math.min(
      height - 1,
      poi.gridY + poi.footprint.height + WATER_LANDMARK_OCEAN_CHECK_RADIUS
    );
    let nearest: GridCoordinatePoint | null = null;
    let bestDistSq = Infinity;
    for (let ny = minY; ny <= maxY; ny++) {
      for (let nx = minX; nx <= maxX; nx++) {
        if (!isOceanGrid[ny]?.[nx]) continue;
        const dSq = (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy);
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          nearest = { x: nx, y: ny };
        }
      }
    }
    return nearest;
  };

  // Ensure oceanic water landmarks (monument/lighthouse islets) connect to mainland shallow water
  for (const poi of pois) {
    if (poi.type !== 'water_landmark') continue;
    const nearestOceanShore = findNearestOceanCellAroundPoi(poi);
    if (!nearestOceanShore) continue;
    traceMaritimeFromClosestReachableAnchor(nearestOceanShore);
  }

  // Materialize Paired 2-Mouth Transit Caves strictly from graph wormhole_tunnel corridors
  let tunnelNum = 1;
  for (const corridor of activeCorridors) {
    if (corridor.kind !== 'wormhole_tunnel') continue;
    const fromPoi = poiById.get(corridor.fromId);
    const toPoi = poiById.get(corridor.toId);
    if (!fromPoi || !toPoi) continue;

    const mouthAPos =
      findExistingCliffCaveSiteNearPoi(fromPoi, continent, pois, width, height, foreignPathGuide) ??
      sculptCaveOutcropNearPoi(fromPoi, continent, pois, pathGrid, width, height, foreignPathGuide);
    const mouthBPos =
      findExistingCliffCaveSiteNearPoi(toPoi, continent, pois, width, height, foreignPathGuide) ??
      sculptCaveOutcropNearPoi(toPoi, continent, pois, pathGrid, width, height, foreignPathGuide);

    if (!mouthAPos || !mouthBPos) continue;
    if (!corridor.tunnelPairId) {
      throw new Error(
        `[ContinentalCorridorCarver] Wormhole corridor '${corridor.id}' is missing required tunnelPairId.`
      );
    }

    const pairId = corridor.tunnelPairId;
    const entryId = `transit_cave_${pairId}_a`;
    const exitId = `transit_cave_${pairId}_b`;
    const labelIndex = tunnelNum++;

    const resolveCaveFile = (cx: number, cy: number): string => {
      const mtnPal =
        continent.geologicalClusters?.paletteMatrix?.[cy]?.[cx] ??
        continent.mountainPalette ??
        'brown';
      return mtnPal === 'gray' ? 'poke_cave_entrance_gray.png' : 'poke_cave_entrance_brown.png';
    };

    const mouthA: POINode = {
      id: entryId,
      name: `Túnel de Paso ${labelIndex} (Acceso A)`,
      type: 'cave_entrance',
      footprint: { width: 2, height: 2 },
      terrainPreference: 'mountain_wall',
      gridX: mouthAPos.x,
      gridY: mouthAPos.y,
      elevation: 0,
      buildingFile: resolveCaveFile(mouthAPos.x, mouthAPos.y),
      transitPairId: pairId,
      isTransitCaveEntry: true,
      transitTargetId: exitId
    };
    const mouthB: POINode = {
      id: exitId,
      name: `Túnel de Paso ${labelIndex} (Salida B)`,
      type: 'cave_entrance',
      footprint: { width: 2, height: 2 },
      terrainPreference: 'mountain_wall',
      gridX: mouthBPos.x,
      gridY: mouthBPos.y,
      elevation: 0,
      buildingFile: resolveCaveFile(mouthBPos.x, mouthBPos.y),
      transitPairId: pairId,
      isTransitCaveExit: true,
      transitTargetId: entryId
    };

    pois.push(mouthA, mouthB);
    poiById.set(entryId, mouthA);
    poiById.set(exitId, mouthB);

    connectCaveMouthToPoi({
      mouth: mouthA,
      targetPoi: fromPoi,
      continent,
      pathGrid,
      bridgeGrid,
      pois,
      isOceanGrid,
      foreignPathGuide,
      markForeignBuffer: (p) => markForeignCorridorBuffer(p, fromPoi, mouthA),
      otherZones: collectCorridorExclusionZones(fromPoi, mouthA, 'strict'),
      tightZones: collectCorridorExclusionZones(fromPoi, mouthA, 'tight'),
      width,
      height
    });
    connectCaveMouthToPoi({
      mouth: mouthB,
      targetPoi: toPoi,
      continent,
      pathGrid,
      bridgeGrid,
      pois,
      isOceanGrid,
      foreignPathGuide,
      markForeignBuffer: (p) => markForeignCorridorBuffer(p, toPoi, mouthB),
      otherZones: collectCorridorExclusionZones(toPoi, mouthB, 'strict'),
      tightZones: collectCorridorExclusionZones(toPoi, mouthB, 'tight'),
      width,
      height
    });
  }

  // Ensure the central through-road passing through route gatehouses is stamped onto pathGrid
  for (const gate of placedGates) {
    if (gate.urbanLayout?.internalStreets) {
      for (const pt of gate.urbanLayout.internalStreets) {
        if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
          pathGrid[pt.y]![pt.x] = true;
        }
      }
    }
  }

  // Prune redundant stairs AND decorative stairs disconnected from real paths
  const prunedStairs = pruneRedundantStairs(continent.placedStairs, pathGrid).filter((st) => {
    for (let dy = -1; dy <= 2; dy++) {
      for (let dx = -1; dx <= 2; dx++) {
        if (pathGrid[st.y + dy]?.[st.x + dx]) return true;
      }
    }
    return false;
  });
  (continent as { placedStairs: typeof continent.placedStairs }).placedStairs = prunedStairs;

  // Ensure all land bordering harbor water or port docks has a continuous sand beach transition
  const isNearHarborWater = (x: number, y: number): boolean => {
    for (let dy = -HARBOR_WATER_PROXIMITY_RADIUS; dy <= HARBOR_WATER_PROXIMITY_RADIUS; dy++) {
      for (let dx = -HARBOR_WATER_PROXIMITY_RADIUS; dx <= HARBOR_WATER_PROXIMITY_RADIUS; dx++) {
        const ny = y + dy;
        const nx = x + dx;
        const t = continent.terrainMatrix[ny]?.[nx];
        if (t === 'water' || t === 'water_deep') {
          return true;
        }
      }
    }
    return false;
  };

  for (const port of pois) {
    if (port.type !== 'port_dock') continue;
    const minX = Math.max(0, port.gridX - HARBOR_BEACH_PADDING_WEST);
    const maxX = Math.min(width - 1, port.gridX + port.footprint.width + HARBOR_BEACH_PADDING_EAST);
    const minY = Math.max(0, port.gridY - 6);
    const maxY = Math.min(
      height - 1,
      port.gridY + port.footprint.height + HARBOR_BEACH_PADDING_SOUTH
    );

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (continent.terrainMatrix[y]?.[x] === 'grass' && isNearHarborWater(x, y)) {
          (continent.terrainMatrix as WaterTerrainKind[][])[y]![x] = 'sand';
        }
      }
    }
  }

  // Clean any 1x1 mountain spires or thin ridges sliced by harbor beaches or port terminals
  pruneSlicedMountainArtifactsAfterZones(
    continent.heightmap as number[][],
    continent.terrainMatrix,
    width,
    height
  );
  const postCarveResolved = resolveMountainMapGrid(continent.heightmap, {
    palette: continent.mountainPalette ?? 'brown',
    paletteMatrix: continent.geologicalClusters?.paletteMatrix
  });
  const finalStairs = prunedStairs.filter((s) => {
    const cL = postCarveResolved.cellDetails[s.y]?.[s.x];
    const cR = postCarveResolved.cellDetails[s.y]?.[s.x + 1];
    return cL?.role === 'edge_south_top' && cR?.role === 'edge_south_top';
  });
  (continent as { placedStairs: typeof continent.placedStairs }).placedStairs = finalStairs;

  // Phase 8b: Unified Geological Autotiling (Coasts, Cliffs, Deep Water, Macro-Biomes)
  if (continent.macroBiomes) {
    const geoPass = compileGeologicalAutotiling(
      continent.terrainMatrix,
      continent.heightmap,
      continent.macroBiomes,
      {
        seed,
        mountainPalette: continent.mountainPalette,
        paletteMatrix: continent.geologicalClusters?.paletteMatrix,
        placedStairs: finalStairs,
        riverDrainage: continent.riverDrainage
      }
    );

    (continent as { terrainMatrix: typeof continent.terrainMatrix }).terrainMatrix =
      geoPass.sanitizedWaterMatrix;
    (continent as { resolvedWater: typeof continent.resolvedWater }).resolvedWater =
      geoPass.resolvedWater;
    (continent as { resolvedMountain: typeof continent.resolvedMountain }).resolvedMountain =
      geoPass.resolvedMountain;
    (
      continent as { resolvedMacroBiomes?: typeof continent.resolvedMacroBiomes }
    ).resolvedMacroBiomes = geoPass.resolvedMacroBiomes;
    (continent as { cells: typeof continent.cells }).cells = geoPass.cells;
  }

  // Eliminate dangling dead-end road stubs and disconnected orphan road fragments before wilderness placement
  pruneDeadEndStubs(pathGrid, bridgeGrid, pois, finalStairs, width, height);
  pruneOrphanPathFragments(pathGrid, bridgeGrid, pois, width, height);

  // Hermetically seal coastal ocean waters and Surf lanes with FireRed sea rocks (zero lake rocks)
  const portZones = pois
    .filter((p) => p.type === 'port_dock')
    .map((p) => ({
      x: p.gridX,
      y: p.gridY,
      width: p.footprint.width,
      height: p.footprint.height
    }));
  const maritimeResult = sealCoastalSeaWithMaritimeRocks({
    terrainMatrix: continent.terrainMatrix,
    bridgeGrid,
    surfWaypoints,
    portZones,
    maritimeRockObstacles,
    occupiedKeys: occupiedRockKeys,
    seed,
    width,
    height
  });
  applyDeepWaterCellsToContinent(continent, maritimeResult.deepWaterCells, bridgeGrid);

  return { pathGrid, maritimeRockObstacles };
}
