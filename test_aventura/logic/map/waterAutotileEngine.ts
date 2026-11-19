/**
 * test_aventura/logic/map/waterAutotileEngine.ts
 *
 * CANONICAL 2D WATER, COAST & BEACH AUTOTILING ENGINE (FIRE RED GBA SPEC)
 *
 * Features:
 *   1. Coplanar 2D 8-neighbor bitmasking for bodies of water, lakes, and sandy ocean beaches.
 *   2. Unified adjacency semantics: 'edgeNorth' represents water/sand with land/grass at (y - 1).
 *   3. Three canonical FireRed 13-tile brushes (Lake Shore, Ocean Shore Foam, Sand Beach).
 *   4. Strict Render Stacking: Grass (Base) -> Sand -> Water -> Foam/Shore Overlays.
 *   5. Minimum thickness sanitizer ensuring water bodies and beaches have width/thickness >= 2 cells.
 */

import type { DirtyTileBounds } from '../../types/map/autotileHealingTypes.ts';
import { clampDirtyBounds, resolveSparseGridWidth } from '../utils/gridGeometryUtils.ts';

export const BITMASK_2D_DIRECTIONS = {
  NW: 1,
  N: 2,
  NE: 4,
  W: 8,
  E: 16,
  SW: 32,
  S: 64,
  SE: 128
} as const;

export type WaterAutotileRole =
  | 'center'
  | 'edge_north'
  | 'edge_south'
  | 'edge_west'
  | 'edge_east'
  | 'corner_outer_nw'
  | 'corner_outer_ne'
  | 'corner_outer_sw'
  | 'corner_outer_se'
  | 'corner_inner_nw'
  | 'corner_inner_ne'
  | 'corner_inner_sw'
  | 'corner_inner_se';

export type WaterTerrainKind = 'grass' | 'sand' | 'water' | 'water_deep';

export type WaterTerrainMatrix = readonly (readonly WaterTerrainKind[])[];

export interface WaterCoastBrushSet {
  readonly center: string;
  readonly edgeNorth: string;
  readonly edgeSouth: string;
  readonly edgeWest: string;
  readonly edgeEast: string;
  readonly cornerOuterNW: string;
  readonly cornerOuterNE: string;
  readonly cornerOuterSW: string;
  readonly cornerOuterSE: string;
  readonly cornerInnerNW: string;
  readonly cornerInnerNE: string;
  readonly cornerInnerSW: string;
  readonly cornerInnerSE: string;
}

export const CANONICAL_LAKE_SHORE_BRUSH: Readonly<WaterCoastBrushSet> = {
  center: 'poke_water.png',
  edgeNorth: 'poke_water_shore_t.png',
  edgeSouth: 'poke_water_shore_b.png',
  edgeWest: 'poke_water_shore_l.png',
  edgeEast: 'poke_water_shore_r.png',
  cornerOuterNW: 'poke_water_shore_tl.png',
  cornerOuterNE: 'poke_water_shore_tr.png',
  cornerOuterSW: 'poke_water_shore_bl.png',
  cornerOuterSE: 'poke_water_shore_br.png',
  cornerInnerNW: 'poke_water_inner_tl.png',
  cornerInnerNE: 'poke_water_inner_tr.png',
  cornerInnerSW: 'poke_water_inner_bl.png',
  cornerInnerSE: 'poke_water_inner_br.png'
};

export const CANONICAL_SAND_OCEAN_SHORE_BRUSH: Readonly<WaterCoastBrushSet> = {
  center: 'poke_sand_water_center.png',
  edgeNorth: 'poke_sand_water_edge_n.png',
  edgeSouth: 'poke_sand_water_edge_s.png',
  edgeWest: 'poke_sand_water_edge_w.png',
  edgeEast: 'poke_sand_water_edge_e.png',
  cornerOuterNW: 'poke_sand_water_corner_nw.png',
  cornerOuterNE: 'poke_sand_water_corner_ne.png',
  cornerOuterSW: 'poke_sand_water_corner_sw.png',
  cornerOuterSE: 'poke_sand_water_corner_se.png',
  cornerInnerNW: 'poke_sand_water_inner_nw.png',
  cornerInnerNE: 'poke_sand_water_inner_ne.png',
  cornerInnerSW: 'poke_sand_water_inner_sw.png',
  cornerInnerSE: 'poke_sand_water_inner_se.png'
};

export const CANONICAL_OCEAN_SHORE_BRUSH: Readonly<WaterCoastBrushSet> =
  CANONICAL_SAND_OCEAN_SHORE_BRUSH; // alias-ok

export const CANONICAL_SAND_BEACH_BRUSH: Readonly<WaterCoastBrushSet> = {
  center: 'poke_sand_center.png',
  edgeNorth: 'poke_sand_edge_n.png',
  edgeSouth: 'poke_sand_edge_s.png',
  edgeWest: 'poke_sand_edge_w.png',
  edgeEast: 'poke_sand_edge_e.png',
  cornerOuterNW: 'poke_sand_corner_tl.png',
  cornerOuterNE: 'poke_sand_corner_tr.png',
  cornerOuterSW: 'poke_sand_corner_bl.png',
  cornerOuterSE: 'poke_sand_corner_br.png',
  cornerInnerNW: 'poke_sand_inner_tl.png',
  cornerInnerNE: 'poke_sand_inner_tr.png',
  cornerInnerSW: 'poke_sand_inner_bl.png',
  cornerInnerSE: 'poke_sand_inner_br.png'
};

export const BASE_GRASS_TILE = 'poke_grass_plain.png';
const CANONICAL_OCEAN_CENTER_TILE = 'poke_water_ocean_center.png' as const;
const CANONICAL_DEEP_WATER_TILE = 'poke_water_deep.png' as const;
const MIN_ABYSSAL_LAKE_DISTANCE = 2.4;
const ABYSSAL_SEARCH_RADIUS = 3;

const DEEP_WATER_OVERLAYS = {
  edgeN: 'poke_water_deep_edge_n.png',
  edgeS: 'poke_water_deep_edge_s.png',
  edgeW: 'poke_water_deep_edge_w.png',
  edgeE: 'poke_water_deep_edge_e.png',
  cornerTL: 'poke_water_deep_corner_tl.png',
  cornerTR: 'poke_water_deep_corner_tr.png',
  cornerBL: 'poke_water_deep_corner_bl.png',
  cornerBR: 'poke_water_deep_corner_br.png',
  innerTL: 'poke_water_deep_inner_tl.png',
  innerTR: 'poke_water_deep_inner_tr.png',
  innerBL: 'poke_water_deep_inner_bl.png',
  innerBR: 'poke_water_deep_inner_br.png'
} as const;

function appendDeepWaterTransitionOverlays(
  matrix: WaterTerrainMatrix,
  W: number,
  H: number,
  x: number,
  y: number,
  layerStack: string[]
): readonly string[] {
  const overlays: string[] = [];
  const isDeepAt = (nx: number, ny: number): boolean =>
    nx < 0 || nx >= W || ny < 0 || ny >= H ? true : matrix[ny]![nx] === 'water_deep';

  const nDeep = isDeepAt(x, y - 1);
  const sDeep = isDeepAt(x, y + 1);
  const wDeep = isDeepAt(x - 1, y);
  const eDeep = isDeepAt(x + 1, y);

  if (!nDeep) overlays.push(DEEP_WATER_OVERLAYS.edgeN);
  if (!sDeep) overlays.push(DEEP_WATER_OVERLAYS.edgeS);
  if (!wDeep) overlays.push(DEEP_WATER_OVERLAYS.edgeW);
  if (!eDeep) overlays.push(DEEP_WATER_OVERLAYS.edgeE);

  if (!nDeep && !wDeep) overlays.push(DEEP_WATER_OVERLAYS.cornerTL);
  if (!nDeep && !eDeep) overlays.push(DEEP_WATER_OVERLAYS.cornerTR);
  if (!sDeep && !wDeep) overlays.push(DEEP_WATER_OVERLAYS.cornerBL);
  if (!sDeep && !eDeep) overlays.push(DEEP_WATER_OVERLAYS.cornerBR);

  if (nDeep && wDeep && !isDeepAt(x - 1, y - 1)) overlays.push(DEEP_WATER_OVERLAYS.innerTL);
  if (nDeep && eDeep && !isDeepAt(x + 1, y - 1)) overlays.push(DEEP_WATER_OVERLAYS.innerTR);
  if (sDeep && wDeep && !isDeepAt(x - 1, y + 1)) overlays.push(DEEP_WATER_OVERLAYS.innerBL);
  if (sDeep && eDeep && !isDeepAt(x + 1, y + 1)) overlays.push(DEEP_WATER_OVERLAYS.innerBR);

  layerStack.push(...overlays);
  return overlays;
}

export interface ResolvedWaterCell {
  readonly x: number;
  readonly y: number;
  readonly terrain: WaterTerrainKind;
  readonly role: WaterAutotileRole;
  readonly primaryTile: string;
  readonly overlayTiles?: readonly string[];
  readonly layerStack: readonly string[];
}

export interface ResolvedWaterMapResult {
  readonly width: number;
  readonly height: number;
  readonly primaryTiles: readonly (readonly string[])[];
  readonly cellDetails: readonly (readonly (ResolvedWaterCell | null)[])[];
}

/**
 * Computes an 8-bit neighbor bitmask for neighbors matching a predicate relative to (gx, gy).
 */
export function compute2DNeighborMask<T>(
  grid: readonly (readonly T[])[],
  gx: number,
  gy: number,
  isMatch: (cell: T, nx: number, ny: number) => boolean,
  outOfBoundsMatches = false
): number {
  const H = grid.length;
  const W = resolveSparseGridWidth(grid, gy);
  let mask = 0;

  const offsets = [
    { dx: -1, dy: -1, bit: BITMASK_2D_DIRECTIONS.NW },
    { dx: 0, dy: -1, bit: BITMASK_2D_DIRECTIONS.N },
    { dx: 1, dy: -1, bit: BITMASK_2D_DIRECTIONS.NE },
    { dx: -1, dy: 0, bit: BITMASK_2D_DIRECTIONS.W },
    { dx: 1, dy: 0, bit: BITMASK_2D_DIRECTIONS.E },
    { dx: -1, dy: 1, bit: BITMASK_2D_DIRECTIONS.SW },
    { dx: 0, dy: 1, bit: BITMASK_2D_DIRECTIONS.S },
    { dx: 1, dy: 1, bit: BITMASK_2D_DIRECTIONS.SE }
  ];

  for (const { dx, dy, bit } of offsets) {
    const nx = gx + dx;
    const ny = gy + dy;
    if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
      const row = grid[ny];
      if (row && nx < row.length) {
        if (isMatch(row[nx]!, nx, ny)) {
          mask |= bit;
        }
      }
    } else if (outOfBoundsMatches) {
      mask |= bit;
    }
  }

  return mask;
}

export interface AutotileRoleClassification {
  readonly role: WaterAutotileRole;
  readonly innerOverlays: readonly WaterAutotileRole[];
}

/**
 * Classifies an 8-neighbor bitmask of foreign/adjacent cells into canonical 2D autotile roles:
 *   - Outer convex corners (NW, NE, SW, SE)
 *   - Straight cardinal edges (N, S, E, W)
 *   - Inner concave corners (Inner NW, Inner NE, Inner SW, Inner SE)
 *   - Center / interior
 */
export function classify2DAutotileRole(foreignMask: number): AutotileRoleClassification {
  const hasN = (foreignMask & BITMASK_2D_DIRECTIONS.N) !== 0;
  const hasS = (foreignMask & BITMASK_2D_DIRECTIONS.S) !== 0;
  const hasW = (foreignMask & BITMASK_2D_DIRECTIONS.W) !== 0;
  const hasE = (foreignMask & BITMASK_2D_DIRECTIONS.E) !== 0;

  // 1. Outer Convex Corners
  if (hasN && hasW) return { role: 'corner_outer_nw', innerOverlays: [] };
  if (hasN && hasE) return { role: 'corner_outer_ne', innerOverlays: [] };
  if (hasS && hasW) return { role: 'corner_outer_sw', innerOverlays: [] };
  if (hasS && hasE) return { role: 'corner_outer_se', innerOverlays: [] };

  // 2. Straight Cardinal Edges
  if (hasN) return { role: 'edge_north', innerOverlays: [] };
  if (hasS) return { role: 'edge_south', innerOverlays: [] };
  if (hasW) return { role: 'edge_west', innerOverlays: [] };
  if (hasE) return { role: 'edge_east', innerOverlays: [] };

  // 3. Inner Concave Corners (cardinals are clean, but diagonal foreign cells enter)
  const inners: WaterAutotileRole[] = [];
  if ((foreignMask & BITMASK_2D_DIRECTIONS.NW) !== 0) inners.push('corner_inner_nw');
  if ((foreignMask & BITMASK_2D_DIRECTIONS.NE) !== 0) inners.push('corner_inner_ne');
  if ((foreignMask & BITMASK_2D_DIRECTIONS.SW) !== 0) inners.push('corner_inner_sw');
  if ((foreignMask & BITMASK_2D_DIRECTIONS.SE) !== 0) inners.push('corner_inner_se');

  if (inners.length > 0) {
    const primary = inners[0]!;
    const overlays = inners.slice(1);
    return { role: primary, innerOverlays: overlays };
  }

  // 4. Pure Center
  return { role: 'center', innerOverlays: [] };
}

const ROLE_BRUSH_PROP_MAP: Readonly<Record<WaterAutotileRole, keyof WaterCoastBrushSet>> = {
  center: 'center',
  edge_north: 'edgeNorth',
  edge_south: 'edgeSouth',
  edge_west: 'edgeWest',
  edge_east: 'edgeEast',
  corner_outer_nw: 'cornerOuterNW',
  corner_outer_ne: 'cornerOuterNE',
  corner_outer_sw: 'cornerOuterSW',
  corner_outer_se: 'cornerOuterSE',
  corner_inner_nw: 'cornerInnerNW',
  corner_inner_ne: 'cornerInnerNE',
  corner_inner_sw: 'cornerInnerSW',
  corner_inner_se: 'cornerInnerSE'
};

/**
 * Maps a WaterAutotileRole to the appropriate tile asset from a WaterCoastBrushSet.
 */
export function getTileForRole(brush: WaterCoastBrushSet, role: WaterAutotileRole): string {
  const prop = ROLE_BRUSH_PROP_MAP[role];
  return prop ? brush[prop] : brush.center;
}

/**
 * Resolves a rounded outer coastal corner tile underneath a bridge cell that borders
 * a perpendicular sand shoreline.
 *
 * Invariant: The beach landing (e.g. at x - 1) remains solid sand connecting cleanly to
 * the bridge without an artificial water gap, while the rounded coastal foam corner is
 * blitted underneath the bridge railing so it seamlessly rounds into the open ocean.
 */
function getBridgeShoreCornerTile(
  matrix: WaterTerrainMatrix,
  bridgeGrid: readonly (readonly boolean[])[] | undefined,
  x: number,
  y: number
): string | null {
  if (!bridgeGrid || !bridgeGrid[y]?.[x]) return null;
  const isWater = (t: string | undefined): boolean => t === 'water' || t === 'water_deep';
  if (!isWater(matrix[y]?.[x])) return null;

  // 1. Horizontal bridge: West neighbor is sand
  if (matrix[y]?.[x - 1] === 'sand' && !bridgeGrid[y]?.[x - 1]) {
    // North flank: North of bridge and North of sand are open water
    if (isWater(matrix[y - 1]?.[x]) && isWater(matrix[y - 1]?.[x - 1]) && !bridgeGrid[y - 1]?.[x]) {
      return CANONICAL_SAND_OCEAN_SHORE_BRUSH.cornerOuterNE;
    }
    // South flank: South of bridge and South of sand are open water
    if (isWater(matrix[y + 1]?.[x]) && isWater(matrix[y + 1]?.[x - 1]) && !bridgeGrid[y + 1]?.[x]) {
      return CANONICAL_SAND_OCEAN_SHORE_BRUSH.cornerOuterSE;
    }
  }

  // 2. Horizontal bridge: East neighbor is sand
  if (matrix[y]?.[x + 1] === 'sand' && !bridgeGrid[y]?.[x + 1]) {
    // North flank
    if (isWater(matrix[y - 1]?.[x]) && isWater(matrix[y - 1]?.[x + 1]) && !bridgeGrid[y - 1]?.[x]) {
      return CANONICAL_SAND_OCEAN_SHORE_BRUSH.cornerOuterNW;
    }
    // South flank
    if (isWater(matrix[y + 1]?.[x]) && isWater(matrix[y + 1]?.[x + 1]) && !bridgeGrid[y + 1]?.[x]) {
      return CANONICAL_SAND_OCEAN_SHORE_BRUSH.cornerOuterSW;
    }
  }

  // 3. Vertical bridge: North neighbor is sand
  if (matrix[y - 1]?.[x] === 'sand' && !bridgeGrid[y - 1]?.[x]) {
    // West flank
    if (isWater(matrix[y]?.[x - 1]) && isWater(matrix[y - 1]?.[x - 1]) && !bridgeGrid[y]?.[x - 1]) {
      return CANONICAL_SAND_OCEAN_SHORE_BRUSH.cornerOuterNW;
    }
    // East flank
    if (isWater(matrix[y]?.[x + 1]) && isWater(matrix[y - 1]?.[x + 1]) && !bridgeGrid[y]?.[x + 1]) {
      return CANONICAL_SAND_OCEAN_SHORE_BRUSH.cornerOuterNE;
    }
  }

  // 4. Vertical bridge: South neighbor is sand
  if (matrix[y + 1]?.[x] === 'sand' && !bridgeGrid[y + 1]?.[x]) {
    // West flank
    if (isWater(matrix[y]?.[x - 1]) && isWater(matrix[y + 1]?.[x - 1]) && !bridgeGrid[y]?.[x - 1]) {
      return CANONICAL_SAND_OCEAN_SHORE_BRUSH.cornerOuterSW;
    }
    // East flank
    if (isWater(matrix[y]?.[x + 1]) && isWater(matrix[y + 1]?.[x + 1]) && !bridgeGrid[y]?.[x + 1]) {
      return CANONICAL_SAND_OCEAN_SHORE_BRUSH.cornerOuterSE;
    }
  }

  return null;
}

function hasAdjacentTerrainKind(
  matrix: WaterTerrainMatrix,
  W: number,
  H: number,
  cx: number,
  cy: number,
  target: WaterTerrainKind
): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H && matrix[ny]![nx] === target) {
        return true;
      }
    }
  }
  return false;
}

function computeOceanMask(matrix: WaterTerrainMatrix, W: number, H: number): Uint8Array {
  const isOcean = new Uint8Array(W * H);
  const visited = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let qTail = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = matrix[y]![x]!;
      if (t !== 'water' && t !== 'water_deep') continue;
      if (hasAdjacentTerrainKind(matrix, W, H, x, y, 'grass')) continue;
      if (hasAdjacentTerrainKind(matrix, W, H, x, y, 'sand')) {
        const idx = y * W + x;
        isOcean[idx] = 1;
        visited[idx] = 1;
        queue[qTail++] = idx;
      }
    }
  }

  let qHead = 0;
  while (qHead < qTail) {
    const flatIdx = queue[qHead++]!;
    const cx = flatIdx % W;
    const cy = Math.floor(flatIdx / W);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const nIdx = ny * W + nx;
        if (visited[nIdx]) continue;
        const nType = matrix[ny]![nx]!;
        if (nType !== 'water' && nType !== 'water_deep') continue;
        visited[nIdx] = 1;
        if (!hasAdjacentTerrainKind(matrix, W, H, nx, ny, 'grass')) {
          isOcean[nIdx] = 1;
          queue[qTail++] = nIdx;
        }
      }
    }
  }

  return isOcean;
}

function computeAbyssalMinDistance(
  matrix: WaterTerrainMatrix,
  W: number,
  H: number,
  cx: number,
  cy: number
): number {
  let minDist = Number.POSITIVE_INFINITY;
  for (let dy = -ABYSSAL_SEARCH_RADIUS; dy <= ABYSSAL_SEARCH_RADIUS; dy++) {
    for (let dx = -ABYSSAL_SEARCH_RADIUS; dx <= ABYSSAL_SEARCH_RADIUS; dx++) {
      const ny = cy + dy;
      const nx = cx + dx;
      const isLandOrOOB =
        nx < 0 ||
        nx >= W ||
        ny < 0 ||
        ny >= H ||
        matrix[ny]![nx]! === 'grass' ||
        matrix[ny]![nx]! === 'sand';
      if (isLandOrOOB) {
        const d = Math.hypot(dx, dy);
        if (d < minDist) minDist = d;
      }
    }
  }
  return minDist;
}

function buildShoreLayerStack(
  baseLayers: readonly string[],
  brushCenter: string,
  role: string,
  primaryTile: string,
  overlayTiles: readonly string[],
  extraTile?: string | null
): string[] {
  const stack = [...baseLayers];
  if (role.startsWith('corner_inner')) {
    stack.push(brushCenter);
  }
  stack.push(primaryTile);
  if (overlayTiles.length > 0) {
    stack.push(...overlayTiles);
  }
  if (extraTile) {
    stack.push(extraTile);
  }
  return stack;
}

function getProjectedWaterShadowTile(role: string, oneRowSouthOfNorthBank: boolean): string | null {
  if (role === 'corner_outer_nw') return 'poke_water_shadow_corner_nw.png';
  if (role === 'edge_north' || role === 'corner_outer_ne') return 'poke_water_shadow_shore_n.png';
  if (role === 'edge_west' || role === 'corner_outer_sw') return 'poke_water_shadow_shore_w.png';
  if (oneRowSouthOfNorthBank && (role === 'center' || role.startsWith('corner_inner'))) {
    return 'poke_water_shadow_full.png';
  }
  return null;
}

function resolveSandCellDetail(
  matrix: WaterTerrainMatrix,
  bridgeGrid: readonly (readonly boolean[])[] | undefined,
  x: number,
  y: number
): ResolvedWaterCell {
  const waterMask = compute2DNeighborMask(
    matrix,
    x,
    y,
    (neighbor, nx, ny) =>
      (neighbor === 'water' || neighbor === 'water_deep') && !(bridgeGrid && bridgeGrid[ny]?.[nx])
  );

  if (waterMask !== 0) {
    const { role, innerOverlays } = classify2DAutotileRole(waterMask);
    const primaryTile = getTileForRole(CANONICAL_SAND_OCEAN_SHORE_BRUSH, role);
    const overlayTiles = innerOverlays.map((r) =>
      getTileForRole(CANONICAL_SAND_OCEAN_SHORE_BRUSH, r)
    );
    const layerStack = buildShoreLayerStack(
      [BASE_GRASS_TILE, CANONICAL_OCEAN_CENTER_TILE],
      CANONICAL_SAND_OCEAN_SHORE_BRUSH.center,
      role,
      primaryTile,
      overlayTiles
    );
    return {
      x,
      y,
      terrain: 'sand',
      role,
      primaryTile,
      overlayTiles: overlayTiles.length > 0 ? overlayTiles : undefined,
      layerStack
    };
  }

  const grassMask = compute2DNeighborMask(matrix, x, y, (neighbor) => neighbor === 'grass');
  const { role, innerOverlays } = classify2DAutotileRole(grassMask);
  const primaryTile = getTileForRole(CANONICAL_SAND_BEACH_BRUSH, role);
  const overlayTiles = innerOverlays.map((r) => getTileForRole(CANONICAL_SAND_BEACH_BRUSH, r));
  const layerStack = buildShoreLayerStack(
    [BASE_GRASS_TILE],
    CANONICAL_SAND_BEACH_BRUSH.center,
    role,
    primaryTile,
    overlayTiles
  );
  return {
    x,
    y,
    terrain: 'sand',
    role,
    primaryTile,
    overlayTiles: overlayTiles.length > 0 ? overlayTiles : undefined,
    layerStack
  };
}

function resolveWaterCellDetail(
  matrix: WaterTerrainMatrix,
  bridgeGrid: readonly (readonly boolean[])[] | undefined,
  isOceanMask: Uint8Array,
  W: number,
  H: number,
  x: number,
  y: number,
  terrain: 'water' | 'water_deep'
): ResolvedWaterCell {
  const foreignMask = compute2DNeighborMask(matrix, x, y, (neighbor) => neighbor === 'grass');
  if (foreignMask !== 0) {
    const { role, innerOverlays } = classify2DAutotileRole(foreignMask);
    const primaryTile = getTileForRole(CANONICAL_LAKE_SHORE_BRUSH, role);
    const overlayTiles = innerOverlays.map((r) => getTileForRole(CANONICAL_LAKE_SHORE_BRUSH, r));
    const oneRowSouthOfNorthBank = y > 1 && matrix[y - 2]![x]! === 'grass';
    const shadowTile = getProjectedWaterShadowTile(role, oneRowSouthOfNorthBank);
    const layerStack = buildShoreLayerStack(
      [BASE_GRASS_TILE],
      CANONICAL_LAKE_SHORE_BRUSH.center,
      role,
      primaryTile,
      overlayTiles,
      shadowTile
    );
    return {
      x,
      y,
      terrain,
      role,
      primaryTile,
      overlayTiles: overlayTiles.length > 0 ? overlayTiles : undefined,
      layerStack
    };
  }

  if (isOceanMask[y * W + x] === 1) {
    const primaryTile =
      terrain === 'water_deep' ? CANONICAL_DEEP_WATER_TILE : CANONICAL_OCEAN_CENTER_TILE;
    const layerStack = [BASE_GRASS_TILE, primaryTile];
    const deepOverlays =
      terrain === 'water_deep'
        ? appendDeepWaterTransitionOverlays(matrix, W, H, x, y, layerStack)
        : [];
    const bridgeShoreCorner = getBridgeShoreCornerTile(matrix, bridgeGrid, x, y);
    if (bridgeShoreCorner) {
      layerStack.push(bridgeShoreCorner);
    }
    return {
      x,
      y,
      terrain,
      role: 'center',
      primaryTile,
      overlayTiles: deepOverlays.length > 0 ? deepOverlays : undefined,
      layerStack
    };
  }

  const minDist = computeAbyssalMinDistance(matrix, W, H, x, y);
  const isDeepWater = minDist >= MIN_ABYSSAL_LAKE_DISTANCE || terrain === 'water_deep';
  const primaryTile = isDeepWater ? 'poke_water_deep.png' : CANONICAL_LAKE_SHORE_BRUSH.center;
  const layerStack = [BASE_GRASS_TILE, primaryTile];

  if (y > 1 && matrix[y - 2]![x]! === 'grass') {
    layerStack.push('poke_water_shadow_full.png');
  }
  const bridgeShoreCorner = getBridgeShoreCornerTile(matrix, bridgeGrid, x, y);
  if (bridgeShoreCorner) {
    layerStack.push(bridgeShoreCorner);
  }

  return { x, y, terrain, role: 'center', primaryTile, layerStack };
}

function resolveSingleWaterCoastCell(
  matrix: WaterTerrainMatrix,
  bridgeGrid: readonly (readonly boolean[])[] | undefined,
  isOceanMask: Uint8Array,
  W: number,
  H: number,
  x: number,
  y: number
): ResolvedWaterCell | null {
  const terrain = matrix[y]?.[x];
  if (!terrain) return null;
  if (terrain === 'grass') {
    return {
      x,
      y,
      terrain: 'grass',
      role: 'center',
      primaryTile: BASE_GRASS_TILE,
      layerStack: [BASE_GRASS_TILE]
    };
  }
  if (terrain === 'sand') {
    return resolveSandCellDetail(matrix, bridgeGrid, x, y);
  }
  return resolveWaterCellDetail(matrix, bridgeGrid, isOceanMask, W, H, x, y, terrain);
}

/**
 * Resolves a full terrain matrix into a complete autotiled water & coast result,
 * adhering strictly to the Layer Stacking hierarchy: Grass -> Sand -> Water -> Foam.
 */
export function resolveWaterCoastGrid(
  matrix: WaterTerrainMatrix,
  bridgeGrid?: readonly (readonly boolean[])[]
): ResolvedWaterMapResult {
  const H = matrix.length;
  if (H === 0) return { width: 0, height: 0, primaryTiles: [], cellDetails: [] };
  const W = matrix[0]?.length ?? 0;
  if (W === 0) return { width: 0, height: 0, primaryTiles: [], cellDetails: [] };

  const isOceanMask = computeOceanMask(matrix, W, H);
  const cellDetails: (ResolvedWaterCell | null)[][] = Array.from({ length: H }, () =>
    Array(W).fill(null)
  );
  const primaryTiles: string[][] = Array.from({ length: H }, () => Array(W).fill('')); // no-domain: Estructura o identificador procedural de aventura

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = resolveSingleWaterCoastCell(matrix, bridgeGrid, isOceanMask, W, H, x, y);
      cellDetails[y]![x] = cell;
      if (cell) {
        primaryTiles[y]![x] = cell.primaryTile;
      }
    }
  }

  return {
    width: W,
    height: H,
    primaryTiles,
    cellDetails
  };
}

/**
 * Incrementally resolves water & coast autotiling inside `bounds` via row Copy-on-Write.
 */
export function resolveWaterCoastInBounds(
  base: ResolvedWaterMapResult,
  matrix: WaterTerrainMatrix,
  bounds: DirtyTileBounds,
  bridgeGrid?: readonly (readonly boolean[])[]
): ResolvedWaterMapResult {
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;
  if (H === 0 || W === 0) return base;

  const clamped = clampDirtyBounds(bounds, W, H);
  const isOceanMask = computeOceanMask(matrix, W, H);
  const nextPrimaryTiles: string[][] = base.primaryTiles.map((row) => row as string[]);
  const nextCellDetails: (ResolvedWaterCell | null)[][] = base.cellDetails.map(
    (row) => row as (ResolvedWaterCell | null)[]
  );

  for (let y = clamped.minY; y <= clamped.maxY; y++) {
    const primaryRow = [...(nextPrimaryTiles[y] ?? [])];
    const detailRow = [...(nextCellDetails[y] ?? [])];
    for (let x = clamped.minX; x <= clamped.maxX; x++) {
      const cell = resolveSingleWaterCoastCell(matrix, bridgeGrid, isOceanMask, W, H, x, y);
      detailRow[x] = cell;
      if (cell) {
        primaryRow[x] = cell.primaryTile;
      }
    }
    nextPrimaryTiles[y] = primaryRow;
    nextCellDetails[y] = detailRow;
  }

  return {
    width: W,
    height: H,
    primaryTiles: nextPrimaryTiles,
    cellDetails: nextCellDetails
  };
}

export interface WaterSanitizerOptions {
  /** Minimum thickness for any water body or beach buffer (default: 2) */
  readonly minThickness?: number;
}

const SLIVER_CANDIDATE_TERRAIN_LIST = ['water', 'water_deep', 'sand'] as const;
type SliverCandidateTerrain = (typeof SLIVER_CANDIDATE_TERRAIN_LIST)[number];
const SLIVER_CANDIDATE_TERRAINS: ReadonlySet<SliverCandidateTerrain> =
  new Set<SliverCandidateTerrain>(SLIVER_CANDIDATE_TERRAIN_LIST);

function pruneSliverCell(
  sanitized: WaterTerrainKind[][],
  x: number,
  y: number,
  W: number,
  H: number,
  minThickness: number
): boolean {
  const val = sanitized[y]![x]!;
  if (!SLIVER_CANDIDATE_TERRAINS.has(val as SliverCandidateTerrain)) return false;

  const leftIsDiff = x === 0 || sanitized[y]![x - 1] !== val;
  const rightIsDiff = x === W - 1 || sanitized[y]![x + 1] !== val;
  if (leftIsDiff && rightIsDiff && minThickness >= 2) {
    const replacement = x > 0 ? sanitized[y]![x - 1]! : (sanitized[y]![x + 1] ?? 'grass');
    sanitized[y]![x] = replacement === val ? 'grass' : replacement;
    return true;
  }

  const topIsDiff = y === 0 || sanitized[y - 1]![x] !== val;
  const bottomIsDiff = y === H - 1 || sanitized[y + 1]![x] !== val;
  if (topIsDiff && bottomIsDiff && minThickness >= 2) {
    const replacement = y > 0 ? sanitized[y - 1]![x]! : (sanitized[y + 1]![x] ?? 'grass');
    sanitized[y]![x] = replacement === val ? 'grass' : replacement;
    return true;
  }

  return false;
}

/**
 * Sanitizes a WaterTerrainMatrix to ensure water bodies and beach buffers
 * maintain a minimum thickness of >= 2 cells, eliminating 1-cell slivers
 * that would cause opposing shorelines to collide.
 */
export function sanitizeWaterTerrainMatrix(
  matrix: WaterTerrainMatrix,
  options?: WaterSanitizerOptions
): WaterTerrainKind[][] {
  const minThickness = options?.minThickness ?? 2;
  const H = matrix.length;
  if (H === 0) return [];
  const W = matrix[0]?.length ?? 0;
  if (W === 0) return [];

  const sanitized: WaterTerrainKind[][] = matrix.map((row) => [...row]);

  // Prune 1-cell wide water or sand strips trapped between opposing land
  for (let iter = 0; iter < 3; iter++) {
    let changed = false;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (pruneSliverCell(sanitized, x, y, W, H, minThickness)) {
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  return sanitized;
}
