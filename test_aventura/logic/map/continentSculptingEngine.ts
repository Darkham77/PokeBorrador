/**
 * src/logic/map/continentSculptingEngine.ts
 *
 * PROCEDURAL CONTINENT SCULPTING ENGINE
 *
 * Implements Rule 7: "The Continent Wraps the Graph, Not Vice Versa".
 * Synthesizes a solid, cohesive continental landmass enveloping all terrestrial nodes and routes.
 * Eliminates artificial inland ocean voids, preserves peripheral ocean waters, and guarantees
 * 100% of mainland settlements rest deeply on solid continental bedrock.
 */

import { CONTINENT_SCULPT } from '../../config/continentSculptingConfig.ts';
import {
  CONTINENT_DEFAULT_SEED,
  DEFAULT_BEACH_WIDTH,
  DEFAULT_LAKE_COUNT,
  DEFAULT_MOUNTAIN_PALETTE
} from '../../config/studioConstants.ts';
import type { EmbeddedTopologyGraph } from '../../types/map/pokemonGraphTypes.ts';
import {
  computeGridDistanceField,
  floodFillGrid,
  type GridBfsQueueItem,
  type GridPoint
} from '../utils/gridBfsUtils.ts';
import {
  generateArchipelagoIslands,
  applyArchipelagoBeachBuffers,
  stampArchipelagoRockyOutcrops
} from './archipelagoGenerator.ts';
import { resolveRegionalScaleProfile } from './continent/regionalScaleProfile.ts';
import {
  generateProceduralRiverDrainage,
  type ProceduralRiverDrainageResult
} from './continent/riverHydrographyEngine.ts';
import type {
  ContinentGeneratorOptions,
  ContinentMapResult,
  SettlementExclusionZone
} from './continentGenerator.ts';
import {
  generateContinentalMountains,
  pruneSlicedMountainArtifactsAfterZones
} from './continentMountainEngine.ts';
import { compileGeologicalAutotiling } from './geologicalAutotilingEngine.ts';
import { synthesizeMacroBiomes } from './macroBiomeSynthesizer.ts';
import { resolveMountainMapGrid } from './mountainAutotileEngine.ts';
import { SimplexNoise } from './noise/simplexNoise.ts';
import { sanitizeWaterTerrainMatrix, type WaterTerrainKind } from './waterAutotileEngine.ts';

export interface PerimeterBeachOptions {
  readonly variableBeach?: boolean;
  readonly seed?: number;
}

/**
 * Distributes a natural sand beach transition buffer of width `beachWidth`
 * along the perimeter separating ocean water from continental grass.
 * Preserves the strict invariant: no grass cell ever touches ocean water directly.
 */
export function distributePerimeterBeach(
  matrix: WaterTerrainKind[][],
  beachWidth = DEFAULT_BEACH_WIDTH,
  seedOrOptions?: number | PerimeterBeachOptions
): void {
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;
  const isVariable =
    typeof seedOrOptions === 'object' ? (seedOrOptions.variableBeach ?? false) : false;
  const seed =
    typeof seedOrOptions === 'number'
      ? seedOrOptions
      : (seedOrOptions?.seed ?? CONTINENT_DEFAULT_SEED);
  const prng = isVariable ? new SimplexNoise(seed + 99) : null;

  // Precompute target beach width per cell
  const targetWidth: number[][] = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      if (!isVariable || !prng) return beachWidth;
      const n = prng.noise2D(x * 0.08, y * 0.08);
      const varOffset = Math.round(n * 1.5);
      return Math.max(2, Math.min(beachWidth + 1, beachWidth + varOffset));
    })
  );

  // Multi-source BFS from ocean water cells
  const dist: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const queue: GridBfsQueueItem[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] === 'water') {
        dist[y]![x] = 0;
        queue.push({ x, y, d: 0 });
      }
    }
  }

  const maxPossibleWidth = beachWidth + 2;
  computeGridDistanceField(queue, dist, W, H, maxPossibleWidth);

  // Turn land within targetWidth of ocean water into sand.
  // Invariant: dist <= 1 is ALWAYS turned into sand (since targetWidth >= 1),
  // ensuring no grass cell ever touches ocean water directly.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] === 'grass' && dist[y]![x]! <= targetWidth[y]![x]!) {
        matrix[y]![x] = 'sand';
      }
    }
  }

  // Prune isolated 1-cell grass specks stranded within the beach
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] === 'grass') {
        const hasGrassNeighbor =
          (y > 0 && matrix[y - 1]![x] === 'grass') ||
          (y < H - 1 && matrix[y + 1]![x] === 'grass') ||
          (x > 0 && matrix[y]![x - 1] === 'grass') ||
          (x < W - 1 && matrix[y]![x + 1] === 'grass');
        if (!hasGrassNeighbor) {
          matrix[y]![x] = 'sand';
        }
      }
    }
  }
}

/**
 * Prunes isolated small islands or orphan land patches (sand/grass)
 * that have fewer than minSize connected cells, converting them to ocean water.
 */
export function removeOrphanTiles(
  matrix: WaterTerrainKind[][],
  minSize = 4,
  keepOnlyMainContinent = false
): void {
  const H = matrix.length;
  if (H === 0) return;
  const W = matrix[0]?.length ?? 0;
  if (W === 0) return;

  const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const components: { x: number; y: number }[][] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (visited[y]![x] || matrix[y]![x] === 'water' || matrix[y]![x] === 'water_deep') {
        continue;
      }

      // BFS to find connected component of land cells
      const component: GridPoint[] = [];
      const queue: GridPoint[] = [{ x, y }];
      visited[y]![x] = true;

      floodFillGrid(
        queue,
        visited,
        W,
        H,
        (nx, ny) => matrix[ny]![nx] !== 'water' && matrix[ny]![nx] !== 'water_deep',
        (curr) => component.push(curr)
      );

      components.push(component);
    }
  }

  if (components.length === 0) return;

  // Find the largest component (the main continental landmass)
  let largestIdx = 0;
  for (let i = 1; i < components.length; i++) {
    if (components[i]!.length > components[largestIdx]!.length) {
      largestIdx = i;
    }
  }

  for (let i = 0; i < components.length; i++) {
    const comp = components[i]!;
    if (keepOnlyMainContinent) {
      if (i !== largestIdx) {
        for (const cell of comp) {
          matrix[cell.y]![cell.x] = 'water';
        }
      }
    } else if (comp.length < minSize) {
      for (const cell of comp) {
        matrix[cell.y]![cell.x] = 'water';
      }
    }
  }
}

function computeGrassCellClearance(
  x: number,
  y: number,
  W: number,
  H: number,
  maxClearanceSearch: number,
  matrix: readonly (readonly WaterTerrainKind[])[]
): number {
  let minD = Infinity;
  for (let dy = -maxClearanceSearch; dy <= maxClearanceSearch; dy++) {
    for (let dx = -maxClearanceSearch; dx <= maxClearanceSearch; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H || matrix[ny]![nx] !== 'grass') {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minD) minD = d;
      }
    }
  }
  return minD;
}

/**
 * Carves organic inland freshwater lakes into the continental grass plain.
 * Strictly guarantees lakes have >= 4 cells clearance from the beach.
 */
export interface LakeCarveExclusions {
  readonly nodes: readonly {
    readonly gridX: number;
    readonly gridY: number;
    readonly width: number;
    readonly height: number;
  }[];
  readonly corridors: readonly {
    readonly kind?: string;
    readonly pathCells: readonly { readonly x: number; readonly y: number }[];
  }[];
}

function minChebyshevDistToRect(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): number {
  const dx = px < rx ? rx - px : px >= rx + rw ? px - (rx + rw - 1) : 0;
  const dy = py < ry ? ry - py : py >= ry + rh ? py - (ry + rh - 1) : 0;
  return Math.max(dx, dy);
}

function isNearExclusions(
  px: number,
  py: number,
  exclusions: LakeCarveExclusions | undefined,
  margin: number
): boolean {
  if (!exclusions) return false;
  for (const n of exclusions.nodes) {
    if (minChebyshevDistToRect(px, py, n.gridX, n.gridY, n.width, n.height) <= margin) {
      return true;
    }
  }
  const marginSq = margin * margin;
  for (const c of exclusions.corridors) {
    if (c.kind === 'surf_route' || c.kind === 'wormhole_tunnel') continue;
    for (const cell of c.pathCells) {
      const dx = px - cell.x;
      const dy = py - cell.y;
      if (dx * dx + dy * dy <= marginSq) return true;
    }
  }
  return false;
}

const LAKE_RADIUS_LARGE = 7.5 as const;
const LAKE_RADIUS_SMALL = 3.5 as const;
const LAKE_NOISE_SCALE_LARGE = 1.65 as const;
const LAKE_NOISE_SCALE_SMALL = 0.95 as const;
const LAKE_MIN_ECCENTRICITY = 0.72 as const;
const LAKE_ECCENTRICITY_SPAN = 0.62 as const;
const LAKE_SCALE_MIN = 0.82 as const;
const LAKE_SCALE_SPAN = 0.42 as const;
const LAKE_SECONDARY_NOISE_WEIGHT = 0.65 as const;
const LAKE_MIN_AREA_LARGE = 18 as const;
const LAKE_MIN_AREA_SMALL = 6 as const;
const NODE_CAPE_OUTER_PAD = 5 as const;
const NODE_CAPE_NOISE_SCALE = 0.14 as const;
const NODE_CAPE_PRNG_OFFSET = 433 as const;

export function carveInlandLakes(
  matrix: WaterTerrainKind[][],
  lakeCount = DEFAULT_LAKE_COUNT,
  seed = CONTINENT_DEFAULT_SEED,
  exclusions?: LakeCarveExclusions
): void {
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;
  if (lakeCount <= 0) return;

  const noise = new SimplexNoise(seed + 101);

  const isLargeMap = Math.min(W, H) >= 96;
  const maxClearanceSearch = isLargeMap ? 14 : 6;
  const minClearanceReq = isLargeMap ? 9.5 : 5.0;
  const baseRadius = isLargeMap ? LAKE_RADIUS_LARGE : LAKE_RADIUS_SMALL;
  const searchExtent = Math.ceil(baseRadius * (LAKE_SCALE_MIN + LAKE_SCALE_SPAN)) + 3;
  const centroidExclusionMargin = Math.ceil(baseRadius) + 6;
  const cellExclusionMargin = 3;
  const minLakeDist = isLargeMap ? 24 : 16;
  const noiseScale = isLargeMap ? LAKE_NOISE_SCALE_LARGE : LAKE_NOISE_SCALE_SMALL;
  const minLakeArea = isLargeMap ? LAKE_MIN_AREA_LARGE : LAKE_MIN_AREA_SMALL;

  // Compute clearance from sand / ocean
  const clearance: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] !== 'grass') continue;
      clearance[y]![x] = computeGrassCellClearance(x, y, W, H, maxClearanceSearch, matrix);
    }
  }

  // Find candidate centroids for lakes
  const candidates: { x: number; y: number; score: number }[] = [];
  for (
    let y = CONTINENT_SCULPT.LAKE_SEARCH_MARGIN;
    y < H - CONTINENT_SCULPT.LAKE_SEARCH_MARGIN;
    y++
  ) {
    for (
      let x = CONTINENT_SCULPT.LAKE_SEARCH_MARGIN;
      x < W - CONTINENT_SCULPT.LAKE_SEARCH_MARGIN;
      x++
    ) {
      if (clearance[y]![x]! >= minClearanceReq) {
        if (isNearExclusions(x, y, exclusions, centroidExclusionMargin)) continue;
        const n = noise.noise2D(x * 0.1, y * 0.1);
        candidates.push({ x, y, score: clearance[y]![x]! + n * 2.0 });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const placedLakes: { x: number; y: number }[] = [];
  for (const cand of candidates) {
    if (placedLakes.length >= lakeCount) break;

    // Minimum distance between multiple lakes
    const tooClose = placedLakes.some((l) => Math.hypot(l.x - cand.x, l.y - cand.y) < minLakeDist);
    if (tooClose) continue;

    const lakeIdx = placedLakes.length;
    const hVal = Math.abs(Math.sin(seed * 0.13 + (lakeIdx + 1) * 7.91));
    const hVal2 = Math.abs(Math.cos(seed * 0.19 + (lakeIdx + 1) * 11.37));
    const theta = hVal * Math.PI;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const aspectX = LAKE_MIN_ECCENTRICITY + (hVal2 % 1) * LAKE_ECCENTRICITY_SPAN;
    const aspectY = 1.0 / aspectX;
    const lakeRadius = baseRadius * (LAKE_SCALE_MIN + ((hVal * 3.7) % 1) * LAKE_SCALE_SPAN);

    const carvedCells: GridPoint[] = [];
    for (let dy = -searchExtent; dy <= searchExtent; dy++) {
      for (let dx = -searchExtent; dx <= searchExtent; dx++) {
        const lx = cand.x + dx;
        const ly = cand.y + dy;
        if (lx < 0 || lx >= W || ly < 0 || ly >= H) continue;
        if (isNearExclusions(lx, ly, exclusions, cellExclusionMargin)) continue;

        const rotX = (dx * cosT - dy * sinT) / aspectX;
        const rotY = (dx * sinT + dy * cosT) / aspectY;
        const d = Math.hypot(rotX, rotY);
        const lowPerturb = noise.noise2D(lx * 0.12, ly * 0.12) * noiseScale;
        const highPerturb = noise.noise2D(lx * 0.29, ly * 0.29) * LAKE_SECONDARY_NOISE_WEIGHT;
        if (d + lowPerturb + highPerturb <= lakeRadius && matrix[ly]![lx] === 'grass') {
          carvedCells.push({ x: lx, y: ly });
        }
      }
    }

    if (carvedCells.length < minLakeArea) continue;
    placedLakes.push(cand);
    for (const cell of carvedCells) {
      matrix[cell.y]![cell.x] = 'water';
    }
  }
}

export interface GridCoord {
  x: number;
  y: number;
}

const SURF_NODE_MARGIN_MULT = 1.05 as const;
const SURF_NODE_RADIAL_WARP_CAP = 1.75 as const;
const NODE_CAPE_LOBE_COS_AMP = 0.16 as const;
const NODE_CAPE_LOBE_SIN_AMP = 0.12 as const;
const NODE_CAPE_SURF_WARP_AMP = 0.2 as const;
const MAX_INWARD_NODE_WARP = 0.05 as const;
const LARGE_SURF_MEANDER_MIN_DIM = 320 as const;
const OUTER_BAY_SCALLOP_BAND = 18 as const;
const OUTER_BAY_SCALLOP_AMP_COMPACT = 3.0 as const;
const OUTER_BAY_SCALLOP_SCALE = 0.042 as const;
const OUTER_BAY_MIN_CORRIDOR_DIST = 20 as const;
const MIN_FRACTAL_ENVELOPE_THRESHOLD = 6 as const;

function isProtectedByOrganicNodeEnvelope(
  wx: number,
  wy: number,
  nodes: readonly {
    id?: string;
    role?: string;
    gridX: number;
    gridY: number;
    width: number;
    height: number;
  }[],
  noise: SimplexNoise
): boolean {
  const margin = CONTINENT_SCULPT.SURF_NODE_MARGIN;
  for (const node of nodes) {
    // Guarantee 100% of ALL embedded node footprints + 1-tile gateway apron stay protected from surf carving
    if (
      wx >= node.gridX - 1 &&
      wx <= node.gridX + node.width &&
      wy >= node.gridY - 1 &&
      wy <= node.gridY + node.height
    ) {
      return true;
    }
    if (node.role === 'secondary_cave') continue;

    const cx = node.gridX + node.width * 0.5;
    const cy = node.gridY + node.height * 0.5;
    const rx = Math.max(2, node.width * 0.5 + margin * SURF_NODE_MARGIN_MULT);
    const ry = Math.max(2, node.height * 0.5 + margin * SURF_NODE_MARGIN_MULT);
    const normDx = (wx + 0.5 - cx) / rx;
    const normDy = (wy + 0.5 - cy) / ry;
    const radialDist = Math.hypot(normDx, normDy);
    if (radialDist > SURF_NODE_RADIAL_WARP_CAP) continue;

    const theta = Math.atan2(normDy, normDx);
    const phase = (node.gridX * 0.37 + node.gridY * 0.71) % (Math.PI * 2);
    const rawWarp =
      NODE_CAPE_LOBE_COS_AMP * Math.cos(2 * theta + phase) +
      NODE_CAPE_LOBE_SIN_AMP * Math.sin(3 * theta - phase) +
      noise.noise2D(wx * 0.085, wy * 0.085) * NODE_CAPE_SURF_WARP_AMP;
    // Clamp inward erosion so gateways/coasts never get carved under, while preserving organic outward headlands
    const clampedWarp = Math.min(MAX_INWARD_NODE_WARP, rawWarp);
    if (radialDist + clampedWarp <= 1.0) {
      return true;
    }
  }
  return false;
}

function carveSurfRoutePointCorridor(
  pt: GridCoord,
  rad: number,
  W: number,
  H: number,
  nodes: readonly {
    id?: string;
    role?: string;
    gridX: number;
    gridY: number;
    width: number;
    height: number;
  }[],
  surfWaterMask: boolean[][],
  noise: SimplexNoise
): void {
  for (let dy = -rad; dy <= rad; dy++) {
    const wy = pt.y + dy;
    if (wy < 0 || wy >= H) continue;
    for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy > rad * rad) continue;
      const wx = pt.x + dx;
      if (wx < 0 || wx >= W) continue;
      if (!isProtectedByOrganicNodeEnvelope(wx, wy, nodes, noise)) {
        surfWaterMask[wy]![wx] = true;
      }
    }
  }
}

interface DirectionalGulfConfig {
  readonly gulfQx: number;
  readonly gulfQy: number;
  readonly gulfRx: number;
  readonly gulfRy: number;
  readonly maxIndent: number;
  readonly isDividedValley: boolean;
  readonly halfH: number;
  readonly valleyFjordCx: number;
  readonly valleyFjordRx: number;
  readonly valleyFjordRy: number;
}

function computeDirectionalGulfIndent(x: number, y: number, cfg: DirectionalGulfConfig): number {
  let indent = 0;
  const gNorm = Math.hypot((x - cfg.gulfQx) / cfg.gulfRx, (y - cfg.gulfQy) / cfg.gulfRy);
  if (gNorm < 1.0) {
    indent = (1.0 - gNorm) * cfg.maxIndent;
  }
  if (!cfg.isDividedValley || y >= cfg.halfH) return indent;
  const fNorm = Math.hypot((x - cfg.valleyFjordCx) / cfg.valleyFjordRx, y / cfg.valleyFjordRy);
  return fNorm < 1.0 ? Math.max(indent, (1.0 - fNorm) * cfg.maxIndent) : indent;
}

/**
 * Synthesizes a solid, cohesive continental landmass enveloping all terrestrial nodes and routes.
 * Eliminates artificial inland ocean voids, preserves peripheral ocean waters, and guarantees
 * 100% of mainland settlements rest deeply on solid continental bedrock.
 */
function generateGraphEnvelopeLandmass(
  embedded: EmbeddedTopologyGraph,
  W: number,
  H: number,
  seed: number,
  _oceanRatio: number
): WaterTerrainKind[][] {
  const prng = new SimplexNoise(seed);
  const matrix: WaterTerrainKind[][] = Array.from({ length: H }, () =>
    Array<WaterTerrainKind>(W).fill('water')
  );

  // 1. Identify designated coastal port city strictly facing exterior open ocean south without inland blocking nodes or cross corridors
  const isClearSouthernCoastCandidate = (cand: (typeof embedded.nodes)[number]): boolean => {
    const portSouthY = cand.gridY + cand.height;
    const blockedByOtherNode = embedded.nodes.some(
      (other) =>
        other.id !== cand.id &&
        other.gridY >= portSouthY &&
        other.gridX < cand.gridX + cand.width + 6 &&
        other.gridX + other.width > cand.gridX - 6
    );
    if (blockedByOtherNode) return false;

    const portCenterX = Math.floor(cand.gridX + cand.width / 2);
    const channelHalfWidth = 3;
    const minOceanMargin = 6;
    const oceanMarginRatio = 0.03;
    const oceanMarginEst = Math.max(minOceanMargin, Math.round(H * oceanMarginRatio));
    const blockedByCrossCorridor = embedded.corridors.some(
      (c) =>
        c.kind !== 'surf_route' &&
        c.kind !== 'wormhole_tunnel' &&
        c.pathCells.some(
          (cell) =>
            cell.y >= portSouthY &&
            cell.y < H - oceanMarginEst &&
            Math.abs(cell.x - portCenterX) <= channelHalfWidth
        )
    );
    return !blockedByCrossCorridor;
  };

  const allGymCities = embedded.nodes.filter(
    (n) => n.role === 'gym_city' || n.role === 'port_city'
  );
  const clearMainlandGyms = allGymCities.filter(
    (n) => !n.isIsland && isClearSouthernCoastCandidate(n)
  );
  const clearAllGyms = allGymCities.filter(isClearSouthernCoastCandidate);
  const clearMainlandNodes = embedded.nodes.filter(
    (n) =>
      !n.isIsland &&
      n.role !== 'league' &&
      n.role !== 'secondary_cave' &&
      isClearSouthernCoastCandidate(n)
  );
  const clearAllNodes = embedded.nodes.filter(
    (n) => n.role !== 'league' && n.role !== 'secondary_cave' && isClearSouthernCoastCandidate(n)
  );
  const pool =
    clearMainlandGyms.length > 0
      ? clearMainlandGyms
      : clearAllGyms.length > 0
        ? clearAllGyms
        : clearMainlandNodes.length > 0
          ? clearMainlandNodes
          : clearAllNodes.length > 0
            ? clearAllNodes
            : allGymCities;

  let designatedPortNode = pool.find((n) => n.hasPort || n.role === 'port_city');
  if (!designatedPortNode) {
    let maxSouthEdge = -1;
    for (const cand of pool) {
      const southEdge = cand.gridY + cand.height;
      if (southEdge > maxSouthEdge) {
        maxSouthEdge = southEdge;
        designatedPortNode = cand;
      }
    }
  }

  // Ensure exactly the designated coastal port node has hasPort = true
  if (designatedPortNode) {
    for (const n of embedded.nodes) {
      (n as { hasPort?: boolean }).hasPort = n.id === designatedPortNode.id;
    }
  }

  // Mark organic surf route marine corridors (gentle S-curve meander on 320+ continents)
  const surfWaterMask: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const capeNoise = new SimplexNoise(seed + NODE_CAPE_PRNG_OFFSET);
  const allowLargeMeander = Math.min(W, H) >= LARGE_SURF_MEANDER_MIN_DIM;

  for (const corridor of embedded.corridors) {
    if (corridor.kind !== 'surf_route') continue;
    const pts = corridor.pathCells;
    const total = pts.length;
    for (let idx = 0; idx < total; idx++) {
      const pt = pts[idx]!;
      let targetPt = pt;
      if (allowLargeMeander && total > 2) {
        const prev = pts[Math.max(0, idx - CONTINENT_SCULPT.SURF_MEANDER_TANGENT_WINDOW)]!;
        const next = pts[Math.min(total - 1, idx + CONTINENT_SCULPT.SURF_MEANDER_TANGENT_WINDOW)]!;
        const tanX = next.x - prev.x;
        const tanY = next.y - prev.y;
        const tanLen = Math.hypot(tanX, tanY) || 1;
        const t = idx / (total - 1);
        const offset =
          Math.sin(t * Math.PI * CONTINENT_SCULPT.SURF_MEANDER_WAVES) *
          CONTINENT_SCULPT.SURF_MEANDER_MAX_AMP *
          Math.sin(t * Math.PI);
        targetPt = {
          x: Math.max(0, Math.min(W - 1, Math.round(pt.x + (-tanY / tanLen) * offset))),
          y: Math.max(0, Math.min(H - 1, Math.round(pt.y + (tanX / tanLen) * offset)))
        };
      }
      const n = prng.noise2D(
        targetPt.x * CONTINENT_SCULPT.SURF_NOISE_SCALE,
        targetPt.y * CONTINENT_SCULPT.SURF_NOISE_SCALE
      );
      const rad = Math.max(
        CONTINENT_SCULPT.SURF_MIN_RADIUS,
        Math.round(CONTINENT_SCULPT.SURF_BASE_RADIUS + n * CONTINENT_SCULPT.SURF_NOISE_AMP)
      );
      carveSurfRoutePointCorridor(targetPt, rad, W, H, embedded.nodes, surfWaterMask, capeNoise);
    }
  }

  // Carve organic funnel harbor channel south of designated coastal port city into open ocean
  if (designatedPortNode) {
    const harborBaseMinX = Math.max(2, designatedPortNode.gridX - 1);
    const harborBaseMaxX = Math.min(W - 3, designatedPortNode.gridX + designatedPortNode.width);
    const harborMinY = designatedPortNode.gridY + designatedPortNode.height;
    for (let y = harborMinY; y < H; y++) {
      const dy = y - harborMinY;
      // Smooth progressive curve flare from row 0 avoids rigid right-angle harbor notches
      const flare = Math.min(9, Math.round(Math.sqrt(dy + 1) * 1.15));
      const wobble = Math.round(prng.noise2D(designatedPortNode.centerX * 0.08, y * 0.09) * 2.4);
      const minX = Math.max(2, harborBaseMinX - flare + wobble);
      const maxX = Math.min(W - 3, harborBaseMaxX + flare + wobble);
      for (let x = minX; x <= maxX; x++) {
        const hitsOtherNode = embedded.nodes.some(
          (other) =>
            other.id !== designatedPortNode.id &&
            x >= other.gridX - 3 &&
            x < other.gridX + other.width + 3 &&
            y >= other.gridY - 3 &&
            y < other.gridY + other.height + 3
        );
        const hitsCorridor = embedded.corridors.some(
          (c) =>
            c.kind !== 'surf_route' &&
            c.kind !== 'wormhole_tunnel' &&
            c.pathCells.some((cell) => Math.abs(cell.x - x) <= 2 && Math.abs(cell.y - y) <= 2)
        );
        if (!hitsOtherNode && !hitsCorridor) {
          surfWaterMask[y]![x] = true;
        }
      }
    }
  }

  // 2. Multi-source BFS from all terrestrial nodes and non-surf corridors
  const dist: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const queue: GridBfsQueueItem[] = [];

  // Seed terrestrial nodes (secondary_cave snaps later to nearest cliff and only seeds its center tile)
  for (const node of embedded.nodes) {
    if (node.role === 'secondary_cave') {
      const cx = Math.max(0, Math.min(W - 1, node.centerX));
      const cy = Math.max(0, Math.min(H - 1, node.centerY));
      if (!surfWaterMask[cy]![cx] && dist[cy]![cx] === Infinity) {
        dist[cy]![cx] = 0;
        queue.push({ x: cx, y: cy, d: 0 });
      }
      continue;
    }
    for (let y = Math.max(0, node.gridY); y < Math.min(H, node.gridY + node.height); y++) {
      for (let x = Math.max(0, node.gridX); x < Math.min(W, node.gridX + node.width); x++) {
        if (!surfWaterMask[y]![x] && dist[y]![x] === Infinity) {
          dist[y]![x] = 0;
          queue.push({ x, y, d: 0 });
        }
      }
    }
  }

  // Seed terrestrial corridors (non-surf, non-wormhole)
  for (const corridor of embedded.corridors) {
    if (corridor.kind === 'surf_route' || corridor.kind === 'wormhole_tunnel') continue;
    for (const cell of corridor.pathCells) {
      if (cell.x >= 0 && cell.x < W && cell.y >= 0 && cell.y < H) {
        if (!surfWaterMask[cell.y]![cell.x] && dist[cell.y]![cell.x] === Infinity) {
          dist[cell.y]![cell.x] = 0;
          queue.push({ x: cell.x, y: cell.y, d: 0 });
        }
      }
    }
  }

  const scaleProfile = resolveRegionalScaleProfile(W, H);
  const scaleRatio = Math.min(1, Math.min(W, H) / 400);

  // Multi-source BFS outwards to compute continuous network proximity
  const maxBuffer = scaleProfile.maxLandBuffer;
  computeGridDistanceField(queue, dist, W, H, maxBuffer, (nx, ny) => !!surfWaterMask[ny]![nx]);

  const baseBuffer = scaleProfile.baseLandBuffer;
  const oceanMargin = scaleProfile.oceanPerimeterMargin;

  // Localized inland sea-void smoothing only inside tight central hubs so outer bays/gulfs remain deeply sculpted
  const mainlandNodes = embedded.nodes.filter((n) => !n.isIsland && n.role !== 'secondary_cave');
  let minMainX = W;
  let maxMainX = 0;
  let minMainY = H;
  let maxMainY = 0;
  for (const n of mainlandNodes) {
    if (n.gridX < minMainX) minMainX = n.gridX;
    if (n.gridX + n.width > maxMainX) maxMainX = n.gridX + n.width;
    if (n.gridY < minMainY) minMainY = n.gridY;
    if (n.gridY + n.height > maxMainY) maxMainY = n.gridY + n.height;
  }
  const hasMainlandCore =
    embedded.macroArchetype !== 'oceanic_archipelago' &&
    mainlandNodes.length >= 3 &&
    maxMainX > minMainX &&
    maxMainY > minMainY;
  const coreCx = (minMainX + maxMainX) / 2;
  const coreCy = (minMainY + maxMainY) / 2;
  const coreRx = Math.max(16, (maxMainX - minMainX) * 0.44);
  const coreRy = Math.max(16, (maxMainY - minMainY) * 0.44);
  const LARGE_SCULPT_MIN_DIM = 200 as const;
  const isRegionalLargeContinent = Math.min(W, H) >= LARGE_SCULPT_MIN_DIM;
  const n1Gain = isRegionalLargeContinent ? 10.5 : 9.5;
  const n2Gain = isRegionalLargeContinent ? 4.8 : 4.5;
  const bayAmpRatio = isRegionalLargeContinent ? 1.15 : 0.85;

  // Identify the sparsest outer quadrant to carve an asymmetric directional sea gulf without touching corridors
  const quadCounts: [number, number, number, number] = [0, 0, 0, 0];
  const halfW = W * 0.5;
  const halfH = H * 0.5;
  for (const n of mainlandNodes) {
    const cx = n.gridX + n.width * 0.5;
    const cy = n.gridY + n.height * 0.5;
    const qIdx = (cy >= halfH ? 2 : 0) + (cx >= halfW ? 1 : 0);
    quadCounts[qIdx] = (quadCounts[qIdx] ?? 0) + 1;
  }
  let sparsestQuad = 0;
  for (let qi = 1; qi < 4; qi++) {
    if (quadCounts[qi]! < quadCounts[sparsestQuad]!) {
      sparsestQuad = qi;
    }
  }
  const gulfConfig: DirectionalGulfConfig = {
    gulfQx: sparsestQuad % 2 === 0 ? W * 0.2 : W * 0.8,
    gulfQy: sparsestQuad < 2 ? H * 0.2 : H * 0.8,
    gulfRx: W * 0.24,
    gulfRy: H * 0.24,
    maxIndent: isRegionalLargeContinent ? 12 : 6,
    isDividedValley: embedded.macroArchetype === 'divided_valley',
    halfH,
    valleyFjordCx: halfW + ((seed & 1) === 0 ? 0.14 : -0.14) * W,
    valleyFjordRx: W * 0.22,
    valleyFjordRy: H * 0.3
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const borderWaveAmp = isRegionalLargeContinent ? 3.0 : 4.2;
      const borderWave = Math.round(prng.noise2D(x * 0.055, y * 0.055) * borderWaveAmp);
      const dynMargin = Math.max(4, oceanMargin + borderWave);
      // Guaranteed organic perimeter ocean margin or protected surf water corridor
      if (
        x < dynMargin ||
        x >= W - dynMargin ||
        y < dynMargin ||
        y >= H - dynMargin ||
        surfWaterMask[y]![x]
      ) {
        matrix[y]![x] = 'water';
        continue;
      }

      // Multi-octave Simplex noise for organic fractal coastlines + outer bay scallops away from core nodes
      const n1 = prng.noise2D(x * 0.025, y * 0.025) * n1Gain * scaleRatio;
      const n2 = prng.noise2D(x * 0.07, y * 0.07) * n2Gain * scaleRatio;
      const d = dist[y]![x]!;
      const edgeProximity =
        d > OUTER_BAY_MIN_CORRIDOR_DIST &&
        Math.min(x, W - 1 - x, y, H - 1 - y) <
          OUTER_BAY_SCALLOP_BAND * (isRegionalLargeContinent ? 2 : 1);
      const bayScallop = edgeProximity
        ? Math.max(
            0,
            prng.noise2D(x * OUTER_BAY_SCALLOP_SCALE + 41.7, y * OUTER_BAY_SCALLOP_SCALE - 19.3) *
              OUTER_BAY_SCALLOP_AMP_COMPACT *
              Math.max(1, scaleRatio * bayAmpRatio)
          )
        : 0;

      const directionalGulfIndent =
        d > OUTER_BAY_MIN_CORRIDOR_DIST ? computeDirectionalGulfIndent(x, y, gulfConfig) : 0;

      const threshold = Math.max(
        MIN_FRACTAL_ENVELOPE_THRESHOLD,
        baseBuffer + n1 + n2 - bayScallop - directionalGulfIndent
      );
      const insideNetworkEnvelope = d !== Infinity && d <= threshold;

      let insideContinentalCore = false;
      if (hasMainlandCore && directionalGulfIndent < 2) {
        const coreRadiusThreshold = 0.82;
        const normR2 = ((x - coreCx) / coreRx) ** 2 + ((y - coreCy) / coreRy) ** 2;
        const coreWarp = prng.noise2D(x * 0.02 + 11.3, y * 0.02 - 7.7) * 0.22;
        insideContinentalCore = normR2 <= coreRadiusThreshold + coreWarp;
      }

      if (insideNetworkEnvelope || insideContinentalCore) {
        matrix[y]![x] = 'grass';
      }
    }
  }

  // 2. Seal Interior Holes: Flood-fill outer ocean from all 4 borders
  // Any water cell NOT reachable from the outer border ocean is an interior depression: convert to grass!
  const visitedOcean: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const oceanQueue: GridPoint[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x === 0 || x === W - 1 || y === 0 || y === H - 1) {
        if (matrix[y]![x] === 'water') {
          visitedOcean[y]![x] = true;
          oceanQueue.push({ x, y });
        }
      }
    }
  }

  floodFillGrid(oceanQueue, visitedOcean, W, H, (nx, ny) => matrix[ny]![nx] === 'water');

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] === 'water' && !visitedOcean[y]![x]) {
        matrix[y]![x] = 'grass';
      }
    }
  }

  return matrix;
}

const NODE_CAPE_MARGIN_BOOST = 2.5 as const;
const NODE_CAPE_COS_AMP = 0.18 as const;
const NODE_CAPE_SIN_AMP = 0.14 as const;
const NODE_CAPE_MIN_AXIS = 3 as const;

function sculptSingleNodeOrganicCape(
  node: EmbeddedTopologyGraph['nodes'][number],
  rawMatrix: WaterTerrainKind[][],
  capeNoise: SimplexNoise,
  W: number,
  H: number
): void {
  if (node.role === 'secondary_cave') return;
  const isPort = node.hasPort || node.role === 'port_city';
  const extraCapeReach = NODE_CAPE_OUTER_PAD;
  const padSouth = isPort ? 0 : extraCapeReach;
  const minY = Math.max(2, node.gridY - extraCapeReach);
  const maxY = Math.min(H - 2, node.gridY + node.height + padSouth);
  const minX = Math.max(2, node.gridX - extraCapeReach);
  const maxX = Math.min(W - 2, node.gridX + node.width + extraCapeReach);
  const cx = node.gridX + node.width * 0.5;
  const cy = node.gridY + node.height * 0.5;
  const rx = Math.max(
    NODE_CAPE_MIN_AXIS,
    node.width * 0.5 + NODE_CAPE_OUTER_PAD + NODE_CAPE_MARGIN_BOOST
  );
  const ry = Math.max(
    NODE_CAPE_MIN_AXIS,
    node.height * 0.5 + NODE_CAPE_OUTER_PAD + NODE_CAPE_MARGIN_BOOST
  );
  const phase = (node.gridX * 0.43 + node.gridY * 0.61) % (Math.PI * 2);

  for (let y = minY; y < maxY; y++) {
    if (isPort && y >= node.gridY + node.height) continue;
    for (let x = minX; x < maxX; x++) {
      const insideCore =
        x >= node.gridX &&
        x < node.gridX + node.width &&
        y >= node.gridY &&
        y < node.gridY + node.height;
      if (insideCore) {
        rawMatrix[y]![x] = 'grass';
        continue;
      }
      const normDx = (x + 0.5 - cx) / rx;
      const normDy = (y + 0.5 - cy) / ry;
      const theta = Math.atan2(normDy, normDx);
      const lobeMod =
        NODE_CAPE_COS_AMP * Math.cos(2 * theta + phase) +
        NODE_CAPE_SIN_AMP * Math.sin(3 * theta - phase);
      const n = capeNoise.noise2D(x * NODE_CAPE_NOISE_SCALE, y * NODE_CAPE_NOISE_SCALE);
      const clampedMod = Math.min(MAX_INWARD_NODE_WARP, lobeMod + n * NODE_CAPE_SURF_WARP_AMP);
      if (Math.hypot(normDx, normDy) + clampedMod <= 1.0) {
        rawMatrix[y]![x] = 'grass';
      }
    }
  }
}

export function sculptContinentFromGraph(
  embedded: EmbeddedTopologyGraph,
  options?: ContinentGeneratorOptions
): ContinentMapResult {
  const W = embedded.width;
  const H = embedded.height;
  const seed = options?.seed ?? embedded.seed;
  const beachWidth = options?.beachWidth ?? DEFAULT_BEACH_WIDTH;
  const lakeCount = options?.lakeCount ?? DEFAULT_LAKE_COUNT;

  // 1. Generate solid, organic continental landmass wrapping the entire graph
  const oceanRatio = options?.oceanWaterPercentage ?? 0.32;
  const rawMatrix = generateGraphEnvelopeLandmass(embedded, W, H, seed, oceanRatio);

  // Sculpt organic lobed headland/island envelopes around settlements (never rounded boxes)
  // Skip secondary_cave (snapped later to mountain cliff walls) so deserted square sand islands never spawn
  const capeNoise = new SimplexNoise(seed + NODE_CAPE_PRNG_OFFSET);
  for (const node of embedded.nodes) {
    sculptSingleNodeOrganicCape(node, rawMatrix, capeNoise, W, H);
  }

  // Guarantee core interior footprints of habitable nodes remain solid dry grass
  for (const node of embedded.nodes) {
    if (node.role === 'secondary_cave') continue;
    for (let y = Math.max(1, node.gridY); y < Math.min(H - 1, node.gridY + node.height); y++) {
      for (let x = Math.max(1, node.gridX); x < Math.min(W - 1, node.gridX + node.width); x++) {
        rawMatrix[y]![x] = 'grass';
      }
    }
  }

  // 3. Continuous Beach Buffer
  const variableBeach = options?.variableBeach ?? Math.min(W, H) >= 80;
  distributePerimeterBeach(rawMatrix, beachWidth, { variableBeach, seed });

  // 4. Remove severed coastal slivers < 24 cells before archipelago islands are generated
  const ORPHAN_PRE_ARCHIPELAGO_MIN_TILES = 24 as const;
  removeOrphanTiles(rawMatrix, ORPHAN_PRE_ARCHIPELAGO_MIN_TILES, false);

  // 4b. Optional Maritime Archipelago: enabled for oceanic_archipelago archetype (or explicit override); 0 islands on pure continental archetypes
  const isOceanicArchetype = embedded.macroArchetype === 'oceanic_archipelago';
  const withArchipelago = options?.withArchipelago ?? isOceanicArchetype;
  const ARCHIPELAGO_DEFAULT_ISLAND_COUNT = 3 as const;
  const archipelagoIslands = withArchipelago
    ? generateArchipelagoIslands(rawMatrix, {
        width: W,
        height: H,
        seed,
        count: options?.islandCount ?? ARCHIPELAGO_DEFAULT_ISLAND_COUNT
      })
    : [];

  // 5. Inland Freshwater Lakes in open spaces, protecting settlement nodes & corridors
  carveInlandLakes(rawMatrix, lakeCount, seed, {
    nodes: embedded.nodes,
    corridors: embedded.corridors
  });

  // 6. Sanitize Water Matrix
  const sanitizedWaterMatrix = sanitizeWaterTerrainMatrix(rawMatrix);

  // Guarantee continuous beach buffer invariant for archipelago islands
  if (archipelagoIslands.length > 0) {
    applyArchipelagoBeachBuffers(sanitizedWaterMatrix, archipelagoIslands, W, H);
  }

  // Guarantee outer perimeter remains 100% ocean water
  for (let x = 0; x < W; x++) {
    sanitizedWaterMatrix[0]![x] = 'water';
    sanitizedWaterMatrix[H - 1]![x] = 'water';
  }
  for (let y = 0; y < H; y++) {
    sanitizedWaterMatrix[y]![0] = 'water';
    sanitizedWaterMatrix[y]![W - 1] = 'water';
  }

  // Preserve habitable interior footprint grass (only when buffered by sand/land, preserving curved beaches outside)
  for (const node of embedded.nodes) {
    if (node.role === 'port_city' || node.hasPort || node.role === 'secondary_cave') continue;
    for (let y = Math.max(1, node.gridY); y < Math.min(H - 1, node.gridY + node.height); y++) {
      for (let x = Math.max(1, node.gridX); x < Math.min(W - 1, node.gridX + node.width); x++) {
        const current = sanitizedWaterMatrix[y]![x];
        if (current === 'water_deep' || current === 'water') continue;
        const touchesOcean =
          sanitizedWaterMatrix[y - 1]?.[x] === 'water' ||
          sanitizedWaterMatrix[y + 1]?.[x] === 'water' ||
          sanitizedWaterMatrix[y]?.[x - 1] === 'water' ||
          sanitizedWaterMatrix[y]?.[x + 1] === 'water';
        if (!touchesOcean) {
          sanitizedWaterMatrix[y]![x] = 'grass';
        }
      }
    }
  }

  // 8. Macro Biome Synthesizer
  const macroBiomes = synthesizeMacroBiomes({
    width: W,
    height: H,
    seed,
    terrainMatrix: sanitizedWaterMatrix,
    macroArchetype: embedded.macroArchetype
  });

  // 9. Continental Mountains & Stairs
  const settlementExclusionZones: SettlementExclusionZone[] = [];
  let leaguePlateauZone: SettlementExclusionZone | undefined;
  const caveLocations: { x: number; y: number }[] = [];

  for (const node of embedded.nodes) {
    if (node.role === 'league') {
      leaguePlateauZone = {
        x: node.gridX,
        y: node.gridY,
        width: node.width,
        height: node.height,
        margin: 4
      };
    } else if (node.role === 'secondary_cave') {
      caveLocations.push({
        x: node.gridX + Math.floor(node.width / 2),
        y: node.gridY + Math.floor(node.height / 2)
      });
    } else {
      settlementExclusionZones.push({
        x: node.gridX,
        y: node.gridY,
        width: node.width,
        height: node.height,
        margin: 3
      });
    }
  }

  const continentalMountains = generateContinentalMountains(sanitizedWaterMatrix, {
    ...options,
    width: W,
    height: H,
    seed,
    macroBiomeGrid: macroBiomes.biomeGrid,
    settlementExclusionZones,
    leaguePlateauZone,
    caveLocations,
    withStairs: options?.withStairs ?? true
  });
  const { sanitizedHeightmap, geologicalClusters } = continentalMountains;
  let { placedStairs } = continentalMountains;

  // 9b. Procedural River Drainage (Downhill gradient descent from inland lake to ocean)
  const shouldDrainRiver = options?.withRiver ?? (W >= 128 && H >= 128);
  let riverDrainage: ProceduralRiverDrainageResult | undefined;
  if (shouldDrainRiver) {
    const riverExclusions = [
      ...settlementExclusionZones,
      ...(leaguePlateauZone ? [leaguePlateauZone] : [])
    ];
    const compactCorridorProtectionMaxWidth = 256;
    if (W < compactCorridorProtectionMaxWidth) {
      for (const corridor of embedded.corridors) {
        if (corridor.kind === 'surf_route' || corridor.kind === 'wormhole_tunnel') continue;
        for (let ci = 0; ci < corridor.pathCells.length; ci += 2) {
          const pt = corridor.pathCells[ci]!;
          riverExclusions.push({ x: pt.x, y: pt.y, width: 1, height: 1, margin: 1 });
        }
      }
    }
    riverDrainage = generateProceduralRiverDrainage(sanitizedWaterMatrix, sanitizedHeightmap, {
      seed,
      placedStairs,
      settlementExclusionZones: riverExclusions
    });
    if (riverDrainage.riverCarved) {
      pruneSlicedMountainArtifactsAfterZones(sanitizedHeightmap, sanitizedWaterMatrix, W, H);
      const unStairsResolved = resolveMountainMapGrid(sanitizedHeightmap, {
        palette: options?.mountainPalette ?? 'brown',
        paletteMatrix: geologicalClusters.paletteMatrix
      });
      const survivingStairs = placedStairs.filter((s) => {
        const cL = unStairsResolved.cellDetails[s.y]?.[s.x];
        const cR = unStairsResolved.cellDetails[s.y]?.[s.x + 1];
        return cL?.role === 'edge_south_top' && cR?.role === 'edge_south_top';
      });
      placedStairs = survivingStairs;
    }
  }

  // 9c. Stamp rocky emergent outcrops on archipelago sea islands before final geological autotiling
  if (archipelagoIslands.length > 0) {
    stampArchipelagoRockyOutcrops(
      archipelagoIslands,
      sanitizedWaterMatrix,
      sanitizedHeightmap,
      W,
      H
    );
  }

  // 10. Unified Geological Autotiling Pass
  const geoPass = compileGeologicalAutotiling(
    sanitizedWaterMatrix,
    sanitizedHeightmap,
    macroBiomes,
    {
      seed,
      mountainPalette: options?.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE,
      paletteMatrix: geologicalClusters.paletteMatrix,
      placedStairs,
      riverDrainage
    }
  );

  return {
    width: W,
    height: H,
    seed,
    terrainMatrix: geoPass.sanitizedWaterMatrix,
    heightmap: sanitizedHeightmap,
    resolvedWater: geoPass.resolvedWater,
    resolvedMountain: geoPass.resolvedMountain,
    placedStairs,
    cells: geoPass.cells,
    mountainPalette: options?.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE,
    macroBiomes,
    resolvedMacroBiomes: geoPass.resolvedMacroBiomes,
    geologicalClusters,
    archipelagoIslands,
    riverDrainage
  };
}
