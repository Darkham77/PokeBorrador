/**
 * src/logic/map/routeLedgeEngine.ts
 *
 * PROCEDURAL JUMPABLE ROUTE LEDGE ENGINE (PHASE 4)
 *
 * Generates iconic Pokémon Game Freak 1-way jumpable ledges along regional route corridors:
 *   1. Canonical 3-piece horizontal autotiling:
 *      - Left cap: poke_ledge_left.png
 *      - Mid body: poke_ledge_jump.png
 *      - Right cap: poke_ledge_right.png
 *   2. Strict 100% Anti-Softlock Guarantee:
 *      - Every placed ledge run must preserve an unobstructed lateral bypass corridor (>= 2 cells)
 *        or alternate route path, ensuring players can always traverse the route bidirectionally.
 *   3. Clearance & Elevation Invariant:
 *      - Ledges only form on plain grass terrain at elevation 0.
 *      - Strictly excludes water shores, mountain feet, settlement footprints, and gatehouse avenues.
 */

import { DECORATION_DEFAULT_SEED } from '../../config/studioConstants.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import { createLcgRng } from './noise/lcgRng.ts';

export type LedgeFacing = 'south' | 'east' | 'west';

export interface LedgeTilePlacement {
  readonly x: number;
  readonly y: number;
  readonly tileFile: string;
  readonly facing: LedgeFacing;
}

export interface LedgeRun {
  readonly id: string;
  readonly facing: LedgeFacing;
  readonly cells: readonly { readonly x: number; readonly y: number }[];
  readonly tiles: readonly LedgeTilePlacement[];
}

export interface GenerateLedgesOptions {
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly pois: readonly POINode[];
  readonly seed?: number;
  readonly maxLedgeRuns?: number;
  readonly transitableGrid?: readonly (readonly boolean[])[];
}

const LEDGE_SEARCH_MARGIN = 6 as const;

const MIN_LEDGE_RUN_LENGTH = 4;
const MAX_LEDGE_RUN_LENGTH = 6;
const DEFAULT_MAX_LEDGE_RUNS = 10;
const MAX_SCALED_LEDGE_RUNS = 28;
const LEDGE_MAP_AREA_DIVISOR = 2200;
const LEDGE_POI_CLEARANCE_MARGIN = 4;
const LEDGE_ROUTE_GATE_CLEARANCE_MARGIN = 14;
const LEDGE_ANCHOR_STEP = 2;

function resolveScaledMaxLedgeRuns(width: number, height: number, explicitMax?: number): number {
  if (explicitMax !== undefined) return explicitMax;
  const scaled = Math.round((width * height) / LEDGE_MAP_AREA_DIVISOR);
  return Math.max(DEFAULT_MAX_LEDGE_RUNS, Math.min(MAX_SCALED_LEDGE_RUNS, scaled));
}

function resolveLedgeTileFile(index: number, runLength: number): string {
  if (index === 0) return 'poke_ledge_left.png';
  if (index === runLength - 1) return 'poke_ledge_right.png';
  return 'poke_ledge_jump.png';
}

/**
 * Procedurally generates 1-way jumpable ledges on route corridors with anti-softlock guarantees.
 */
export function generateRouteLedges(options: GenerateLedgesOptions): readonly LedgeRun[] {
  const { continent, pathGrid, pois, transitableGrid } = options;
  const W = continent.width;
  const H = continent.height;
  const maxLedgeRuns = resolveScaledMaxLedgeRuns(W, H, options.maxLedgeRuns);

  const nextRng = createLcgRng(options.seed ?? DECORATION_DEFAULT_SEED);

  // Build exclusion mask around POIs, water, cliffs, and gates
  const excluded = Array.from({ length: H }, () => Array(W).fill(false));

  for (const poi of pois) {
    const margin =
      poi.type === 'route_gate' ? LEDGE_ROUTE_GATE_CLEARANCE_MARGIN : LEDGE_POI_CLEARANCE_MARGIN;
    const minX = Math.max(0, poi.gridX - margin);
    const maxX = Math.min(W - 1, poi.gridX + poi.footprint.width + margin);
    const minY = Math.max(0, poi.gridY - margin);
    const maxY = Math.min(H - 1, poi.gridY + poi.footprint.height + margin);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        excluded[y]![x] = true;
      }
    }
  }

  const isCellValidLedgeGround = (x: number, y: number): boolean => {
    if (x < 1 || x >= W - 1 || y < 2 || y >= H - 2) return false;
    if (excluded[y]![x]) return false;
    if ((continent.heightmap[y]?.[x] ?? 0) !== 0) return false;
    if (continent.terrainMatrix[y]?.[x] !== 'grass') return false;
    if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return false;

    // Check water distance: must not be adjacent to water
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ] as const) {
      const terr = continent.terrainMatrix[y + dy]?.[x + dx];
      if (terr === 'water' || terr === 'water_deep') return false;
    }

    return true;
  };

  const isPassableCorridor = (x: number, y: number): boolean => {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    if ((continent.heightmap[y]?.[x] ?? 0) !== 0) return false;
    const t = continent.terrainMatrix[y]?.[x];
    if (t === 'water' || t === 'water_deep') return false;
    if (transitableGrid && !transitableGrid[y]?.[x]) return false;
    return true;
  };

  const placedRuns: LedgeRun[] = [];
  const occupiedCells = new Set<string>();

  // Scan route pathGrid cells to identify candidate route corridors
  const candidateAnchorCells: { x: number; y: number }[] = [];
  for (let y = LEDGE_SEARCH_MARGIN; y < H - LEDGE_SEARCH_MARGIN; y += 2) {
    for (let x = LEDGE_SEARCH_MARGIN; x < W - LEDGE_SEARCH_MARGIN; x += 2) {
      if (pathGrid[y]?.[x] && isCellValidLedgeGround(x, y)) {
        candidateAnchorCells.push({ x, y });
      }
    }
  }

  // Shuffle candidate anchors pseudo-randomly
  for (let i = candidateAnchorCells.length - 1; i > 0; i--) {
    const j = Math.floor(nextRng() * (i + 1));
    const temp = candidateAnchorCells[i]!;
    candidateAnchorCells[i] = candidateAnchorCells[j]!;
    candidateAnchorCells[j] = temp;
  }

  const isWallAnchorCell = (x: number, y: number): boolean => {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    const t = continent.terrainMatrix[y]?.[x];
    if (t === 'water' || t === 'water_deep') return false;
    if ((continent.heightmap[y]?.[x] ?? 0) > 0) return true;
    if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return true;
    return !isPassableCorridor(x, y);
  };

  const MAX_CORRIDOR_WALL_SCAN_TILES = 8 as const;

  const isCandidateSpanClear = (
    sx: number,
    y: number,
    runLength: number,
    allowRoad: boolean
  ): boolean => {
    if (sx < 2 || sx + runLength >= W - 2) return false;
    for (let dx = 0; dx < runLength; dx++) {
      const cx = sx + dx;
      if (!isCellValidLedgeGround(cx, y) || occupiedCells.has(`${cx}_${y}`)) return false;
      if (transitableGrid && !transitableGrid[y]?.[cx]) return false;
      if (!allowRoad && pathGrid[y]?.[cx]) return false;
      if (!isPassableCorridor(cx, y - 1) || !isPassableCorridor(cx, y + 1)) return false;
    }
    const leftFlankOpen = isPassableCorridor(sx - 1, y) && isPassableCorridor(sx - 2, y);
    const rightFlankOpen =
      isPassableCorridor(sx + runLength, y) && isPassableCorridor(sx + runLength + 1, y);
    if (!leftFlankOpen && !rightFlankOpen) return false;

    if (transitableGrid) {
      const leftAnchored = isWallAnchorCell(sx - 1, y);
      const rightAnchored = isWallAnchorCell(sx + runLength, y);
      return (leftAnchored && rightFlankOpen) || (rightAnchored && leftFlankOpen);
    }
    return true;
  };

  for (const anchor of candidateAnchorCells) {
    if (placedRuns.length >= maxLedgeRuns) break;

    const runLength =
      MIN_LEDGE_RUN_LENGTH +
      Math.floor(nextRng() * (MAX_LEDGE_RUN_LENGTH - MIN_LEDGE_RUN_LENGTH + 1));
    const y = anchor.y;

    let wallLeftAnchorStart: number | null = null;
    for (let step = 1; step <= MAX_CORRIDOR_WALL_SCAN_TILES; step++) {
      const probeX = anchor.x - step;
      if (isWallAnchorCell(probeX, y)) {
        wallLeftAnchorStart = probeX + 1;
        break;
      }
    }

    let wallRightAnchorStart: number | null = null;
    for (let step = 1; step <= MAX_CORRIDOR_WALL_SCAN_TILES; step++) {
      const probeX = anchor.x + step;
      if (isWallAnchorCell(probeX, y)) {
        wallRightAnchorStart = probeX - runLength;
        break;
      }
    }

    const centeredStartX = anchor.x - Math.floor(runLength / 2);
    const candidateStarts: number[] = [];
    if (wallLeftAnchorStart !== null) candidateStarts.push(wallLeftAnchorStart);
    if (wallRightAnchorStart !== null) candidateStarts.push(wallRightAnchorStart);
    if (!transitableGrid) {
      candidateStarts.push(anchor.x + LEDGE_ANCHOR_STEP, anchor.x - runLength - 1, centeredStartX);
    }

    const chosenStartX =
      candidateStarts.find((sx) =>
        isCandidateSpanClear(sx, y, runLength, !transitableGrid && sx === centeredStartX)
      ) ?? null;
    if (chosenStartX === null) continue;

    // Build the autotiled pieces
    const cells: { x: number; y: number }[] = [];
    const tiles: LedgeTilePlacement[] = [];

    for (let dx = 0; dx < runLength; dx++) {
      const cx = chosenStartX + dx;
      cells.push({ x: cx, y });
      tiles.push({
        x: cx,
        y,
        tileFile: resolveLedgeTileFile(dx, runLength),
        facing: 'south'
      });
      occupiedCells.add(`${cx}_${y}`);
    }

    // Mark margin in occupiedCells to avoid contiguous parallel ledges
    const LEDGE_PARALLEL_VERTICAL_MARGIN = 2 as const;
    for (let dx = -1; dx <= runLength; dx++) {
      for (let dy = -LEDGE_PARALLEL_VERTICAL_MARGIN; dy <= LEDGE_PARALLEL_VERTICAL_MARGIN; dy++) {
        occupiedCells.add(`${chosenStartX + dx}_${y + dy}`);
      }
    }

    placedRuns.push({
      id: `ledge_run_${placedRuns.length + 1}`,
      facing: 'south',
      cells,
      tiles
    });
  }

  return placedRuns;
}
