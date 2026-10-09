/**
 * src/logic/map/waterAutotileEngine.ts
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

export const CANONICAL_OCEAN_SHORE_BRUSH: Readonly<WaterCoastBrushSet> = CANONICAL_SAND_OCEAN_SHORE_BRUSH; // alias-ok

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
export const MIN_ABYSSAL_LAKE_DISTANCE = 2.4;
export const ABYSSAL_SEARCH_RADIUS = 3;

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
  const W = grid[0]?.length ?? 0;
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
      const cell = grid[ny]![nx]!;
      if (isMatch(cell, nx, ny)) {
        mask |= bit;
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

/**
 * Maps a WaterAutotileRole to the appropriate tile asset from a WaterCoastBrushSet.
 */
export function getTileForRole(brush: WaterCoastBrushSet, role: WaterAutotileRole): string {
  switch (role) {
    case 'center':
      return brush.center;
    case 'edge_north':
      return brush.edgeNorth;
    case 'edge_south':
      return brush.edgeSouth;
    case 'edge_west':
      return brush.edgeWest;
    case 'edge_east':
      return brush.edgeEast;
    case 'corner_outer_nw':
      return brush.cornerOuterNW;
    case 'corner_outer_ne':
      return brush.cornerOuterNE;
    case 'corner_outer_sw':
      return brush.cornerOuterSW;
    case 'corner_outer_se':
      return brush.cornerOuterSE;
    case 'corner_inner_nw':
      return brush.cornerInnerNW;
    case 'corner_inner_ne':
      return brush.cornerInnerNE;
    case 'corner_inner_sw':
      return brush.cornerInnerSW;
    case 'corner_inner_se':
      return brush.cornerInnerSE;
  }
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

  // Step 1: Detect open ocean water
  // Open ocean is water connected to sand beaches that does not flow into inland grass-bordered river channels.
  // Rivers and inland lakes border grass and are strictly classified as freshwater bodies.
  const isOceanGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  const cellTouchesGrass = (cx: number, cy: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          if (matrix[ny]![nx] === 'grass') return true;
        }
      }
    }
    return false;
  };

  // Find all water cells that directly touch sand (ocean coastline seeds) but do not touch grass
  const oceanQueue: { x: number; y: number }[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = matrix[y]![x]!;
      if (t === 'water' || t === 'water_deep') {
        if (!cellTouchesGrass(x, y)) {
          let touchesSand = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                if (matrix[ny]![nx] === 'sand') {
                  touchesSand = true;
                  break;
                }
              }
            }
            if (touchesSand) break;
          }
          if (touchesSand) {
            isOceanGrid[y]![x] = true;
            visited[y]![x] = true;
            oceanQueue.push({ x, y });
          }
        }
      }
    }
  }

  // Flood fill the ocean from coastline seeds across open water
  // Stops whenever it encounters cells touching grass, preventing entry into rivers or lakes
  let oqHead = 0;
  while (oqHead < oceanQueue.length) {
    const cur = oceanQueue[oqHead++]!;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          const nType = matrix[ny]![nx]!;
          if ((nType === 'water' || nType === 'water_deep') && !visited[ny]![nx]) {
            visited[ny]![nx] = true;
            if (!cellTouchesGrass(nx, ny)) {
              isOceanGrid[ny]![nx] = true;
              oceanQueue.push({ x: nx, y: ny });
            }
          }
        }
      }
    }
  }

  const cellDetails: (ResolvedWaterCell | null)[][] = Array.from({ length: H }, () =>
    Array(W).fill(null)
  );
  const primaryTiles: string[][] = Array.from({ length: H }, () => Array(W).fill('')); // no-domain: Estructura o identificador procedural de aventura

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const terrain = matrix[y]![x]!;

      if (terrain === 'grass') {
        const cell: ResolvedWaterCell = {
          x,
          y,
          terrain: 'grass',
          role: 'center',
          primaryTile: BASE_GRASS_TILE,
          layerStack: [BASE_GRASS_TILE]
        };
        cellDetails[y]![x] = cell;
        primaryTiles[y]![x] = BASE_GRASS_TILE;
        continue;
      }

      if (terrain === 'sand') {
        // Priority 1: Sand bordering Water (Ocean Foam)
        // Water cells covered by boardwalk bridges are excluded so shore landings use solid dry sand without foam gaps
        const waterMask = compute2DNeighborMask(
          matrix,
          x,
          y,
          (neighbor, nx, ny) =>
            (neighbor === 'water' || neighbor === 'water_deep') &&
            !(bridgeGrid && bridgeGrid[ny]?.[nx])
        );

        if (waterMask !== 0) {
          const { role, innerOverlays } = classify2DAutotileRole(waterMask);
          const primaryTile = getTileForRole(CANONICAL_SAND_OCEAN_SHORE_BRUSH, role);
          const overlayTiles = innerOverlays.map((r) => getTileForRole(CANONICAL_SAND_OCEAN_SHORE_BRUSH, r));

          const layerStack: string[] = [BASE_GRASS_TILE, 'poke_water_ocean_center.png']; // no-domain: Estructura o identificador procedural de aventura
          if (role.startsWith('corner_inner')) {
            layerStack.push(CANONICAL_SAND_OCEAN_SHORE_BRUSH.center);
          }
          layerStack.push(primaryTile);
          if (overlayTiles.length > 0) {
            layerStack.push(...overlayTiles);
          }

          const cell: ResolvedWaterCell = {
            x,
            y,
            terrain: 'sand',
            role,
            primaryTile,
            overlayTiles: overlayTiles.length > 0 ? overlayTiles : undefined,
            layerStack
          };
          cellDetails[y]![x] = cell;
          primaryTiles[y]![x] = primaryTile;
          continue;
        }

        // Priority 2: Sand bordering Grass
        const grassMask = compute2DNeighborMask(
          matrix,
          x,
          y,
          (neighbor) => neighbor === 'grass'
        );

        const { role, innerOverlays } = classify2DAutotileRole(grassMask);
        const primaryTile = getTileForRole(CANONICAL_SAND_BEACH_BRUSH, role);
        const overlayTiles = innerOverlays.map((r) => getTileForRole(CANONICAL_SAND_BEACH_BRUSH, r));

        const layerStack: string[] = [BASE_GRASS_TILE]; // no-domain: Estructura o identificador procedural de aventura
        if (role.startsWith('corner_inner')) {
          layerStack.push(CANONICAL_SAND_BEACH_BRUSH.center);
        }
        layerStack.push(primaryTile);
        if (overlayTiles.length > 0) {
          layerStack.push(...overlayTiles);
        }

        const cell: ResolvedWaterCell = {
          x,
          y,
          terrain: 'sand',
          role,
          primaryTile,
          overlayTiles: overlayTiles.length > 0 ? overlayTiles : undefined,
          layerStack
        };
        cellDetails[y]![x] = cell;
        primaryTiles[y]![x] = primaryTile;
        continue;
      }

      if (terrain === 'water' || terrain === 'water_deep') {
        // Priority 1: Water bordering Grass (Inland Lakes, Rivers, and freshwater shores)
        // Whenever water meets grass, it autotiles using the canonical stone/earth lake & river shore brush.
        const foreignMask = compute2DNeighborMask(
          matrix,
          x,
          y,
          (neighbor) => neighbor === 'grass'
        );

        if (foreignMask !== 0) {
          const { role, innerOverlays } = classify2DAutotileRole(foreignMask);
          const primaryTile = getTileForRole(CANONICAL_LAKE_SHORE_BRUSH, role);
          const overlayTiles = innerOverlays.map((r) => getTileForRole(CANONICAL_LAKE_SHORE_BRUSH, r));

          const layerStack: string[] = [BASE_GRASS_TILE]; // no-domain: Estructura o identificador procedural de aventura
          if (role.startsWith('corner_inner')) {
            layerStack.push(CANONICAL_LAKE_SHORE_BRUSH.center);
          }
          layerStack.push(primaryTile);
          if (overlayTiles.length > 0) {
            layerStack.push(...overlayTiles);
          }

          // 2.5D Projected Shadows (Option 4): Northern and Western land banks project shadows into water
          const oneRowSouthOfNorthBank = y > 1 && matrix[y - 2]![x]! === 'grass';

          if (role === 'corner_outer_nw') {
            layerStack.push('poke_water_shadow_corner_nw.png');
          } else if (role === 'edge_north' || role === 'corner_outer_ne') {
            layerStack.push('poke_water_shadow_shore_n.png');
          } else if (role === 'edge_west' || role === 'corner_outer_sw') {
            layerStack.push('poke_water_shadow_shore_w.png');
          } else if (oneRowSouthOfNorthBank && (role === 'center' || role.startsWith('corner_inner'))) {
            layerStack.push('poke_water_shadow_full.png');
          }

          const cell: ResolvedWaterCell = {
            x,
            y,
            terrain,
            role,
            primaryTile,
            overlayTiles: overlayTiles.length > 0 ? overlayTiles : undefined,
            layerStack
          };
          cellDetails[y]![x] = cell;
          primaryTiles[y]![x] = primaryTile;
          continue;
        }

        const isOcean = isOceanGrid[y]![x]!;

        if (isOcean) {
          // Ocean water is a continuous layer of waves; sand provides the foam border on top
          const primaryTile =
            terrain === 'water_deep' ? 'poke_water_deep.png' : 'poke_water_ocean_center.png';
          const layerStack: string[] = [BASE_GRASS_TILE, primaryTile]; // no-domain: Estructura o identificador procedural de aventura

          const bridgeShoreCorner = getBridgeShoreCornerTile(matrix, bridgeGrid, x, y);
          if (bridgeShoreCorner) {
            layerStack.push(bridgeShoreCorner);
          }

          const cell: ResolvedWaterCell = {
            x,
            y,
            terrain,
            role: 'center',
            primaryTile,
            layerStack
          };
          cellDetails[y]![x] = cell;
          primaryTiles[y]![x] = primaryTile;
          continue;
        }

        // Priority 2: Interior of Inland Freshwater Lake / River (surrounded by water, not grass)
        // Abyssal Depth (Option 4): Center cells with distance to land >= MIN_ABYSSAL_LAKE_DISTANCE resolve to deep water
        let isAbyssalCenter = false;
        let minDist = Number.POSITIVE_INFINITY;
        for (let dy = -ABYSSAL_SEARCH_RADIUS; dy <= ABYSSAL_SEARCH_RADIUS; dy++) {
          for (let dx = -ABYSSAL_SEARCH_RADIUS; dx <= ABYSSAL_SEARCH_RADIUS; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (
              nx < 0 ||
              nx >= W ||
              ny < 0 ||
              ny >= H ||
              matrix[ny]![nx]! === 'grass' ||
              matrix[ny]![nx]! === 'sand'
            ) {
              const d = Math.hypot(dx, dy);
              if (d < minDist) minDist = d;
            }
          }
        }
        if (minDist >= MIN_ABYSSAL_LAKE_DISTANCE) {
          isAbyssalCenter = true;
        }

        const isDeepWater = isAbyssalCenter || terrain === 'water_deep';
        const primaryTile =
          isDeepWater ? 'poke_water_deep.png' : CANONICAL_LAKE_SHORE_BRUSH.center;
        const layerStack: string[] = [BASE_GRASS_TILE, primaryTile]; // no-domain: Estructura o identificador procedural de aventura

        const oneRowSouthOfNorthBank = y > 1 && matrix[y - 2]![x]! === 'grass';
        if (oneRowSouthOfNorthBank) {
          layerStack.push('poke_water_shadow_full.png');
        }

        const bridgeShoreCorner = getBridgeShoreCornerTile(matrix, bridgeGrid, x, y);
        if (bridgeShoreCorner) {
          layerStack.push(bridgeShoreCorner);
        }

        const cell: ResolvedWaterCell = {
          x,
          y,
          terrain,
          role: 'center',
          primaryTile,
          layerStack
        };
        cellDetails[y]![x] = cell;
        primaryTiles[y]![x] = primaryTile;
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

export interface WaterSanitizerOptions {
  /** Minimum thickness for any water body or beach buffer (default: 2) */
  readonly minThickness?: number;
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
        const val = sanitized[y]![x]!;
        if (val === 'water' || val === 'water_deep' || val === 'sand') {
          // Check horizontal thickness
          const leftIsDiff = x === 0 || sanitized[y]![x - 1] !== val;
          const rightIsDiff = x === W - 1 || sanitized[y]![x + 1] !== val;
          if (leftIsDiff && rightIsDiff && minThickness >= 2) {
            // 1-cell wide horizontal sliver -> prune to adjacent land
            const replacement = x > 0 ? sanitized[y]![x - 1]! : (sanitized[y]![x + 1] ?? 'grass');
            sanitized[y]![x] = replacement === val ? 'grass' : replacement;
            changed = true;
            continue;
          }

          // Check vertical thickness
          const topIsDiff = y === 0 || sanitized[y - 1]![x] !== val;
          const bottomIsDiff = y === H - 1 || sanitized[y + 1]![x] !== val;
          if (topIsDiff && bottomIsDiff && minThickness >= 2) {
            // 1-cell wide vertical sliver -> prune to adjacent land
            const replacement = y > 0 ? sanitized[y - 1]![x]! : (sanitized[y + 1]![x] ?? 'grass');
            sanitized[y]![x] = replacement === val ? 'grass' : replacement;
            changed = true;
          }
        }
      }
    }

    if (!changed) break;
  }

  return sanitized;
}
