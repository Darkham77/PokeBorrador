/**
 * src/logic/map/mountainAutotileEngine.ts
 *
 * CANONICAL 8-NEIGHBOR MOUNTAIN AUTOTILING ENGINE (GBA 2.5D SPEC)
 *
 * Features:
 *   1. Elevation Matrix based autotiling (0 = grass/plain, 1 = Tier 1, 2 = Tier 2, etc.)
 *   2. Exhaustive 8-neighbor bitmasking for outer (convex) and inner (concave) corners.
 *   3. 2.5D Option A South Wall Projection: Emits top face at (x, y) and projects
 *      non-destructive foot overlay and occupancy flag at (x, y+1).
 *   4. O(1) canonical tile dictionary mapping for Brown and Gray palettes.
 */

export const MOUNTAIN_PALETTES = ['brown', 'gray', 'volcanic'] as const;
export type MountainPalette = (typeof MOUNTAIN_PALETTES)[number];

export const MOUNTAIN_STYLES = ['rock', 'grassy_ledge'] as const;
export type MountainStyle = (typeof MOUNTAIN_STYLES)[number];

export type ElevationMatrix = readonly (readonly number[])[];

export const BITMASK_8_DIRECTIONS = {
  NW: 1,
  N: 2,
  NE: 4,
  W: 8,
  E: 16,
  SW: 32,
  S: 64,
  SE: 128
} as const;

export type MountainRole =
  | 'floor_center'
  | 'peak_isolated'
  | 'edge_north'
  | 'edge_west'
  | 'edge_east'
  | 'edge_south_top'
  | 'corner_outer_nw'
  | 'corner_outer_ne'
  | 'corner_outer_sw_top'
  | 'corner_outer_se_top'
  | 'corner_inner_nw'
  | 'corner_inner_ne'
  | 'corner_inner_sw'
  | 'corner_inner_se'
  | 'stairs_l'
  | 'stairs_r';

export interface MountainBrushSet {
  readonly floor: string;
  readonly peakCone: string;
  readonly cornerOuterNW: string;
  readonly cornerOuterNE: string;
  readonly cornerOuterSW_Top: string;
  readonly cornerOuterSW_Foot: string;
  readonly cornerOuterSE_Top: string;
  readonly cornerOuterSE_Foot: string;
  readonly cornerInnerNW: string;
  readonly cornerInnerNE: string;
  readonly cornerInnerSW: string;
  readonly cornerInnerSE: string;
  readonly edgeNorth: string;
  readonly edgeWest: string;
  readonly edgeEast: string;
  readonly edgeSouth_Top: string;
  readonly edgeSouth_Foot: string;
  readonly stairs_L: string;
  readonly stairs_R: string;
}

export const CANONICAL_MOUNTAIN_BRUSH_BROWN: Readonly<MountainBrushSet> = {
  floor: 'poke_cliff_brown_plateau_rock.png',
  peakCone: 'poke_cliff_cone_brown.png',
  cornerOuterNW: 'poke_cliff_brown_corner_tl.png',
  cornerOuterNE: 'poke_cliff_brown_corner_tr.png',
  cornerOuterSW_Top: 'poke_cliff_brown_left.png',
  cornerOuterSW_Foot: 'poke_cliff_brown_corner_bl.png',
  cornerOuterSE_Top: 'poke_cliff_brown_right.png',
  cornerOuterSE_Foot: 'poke_cliff_brown_corner_br.png',
  cornerInnerNW: 'poke_cliff_brown_inner_tl.png',
  cornerInnerNE: 'poke_cliff_brown_inner_tr.png',
  cornerInnerSW: 'poke_cliff_brown_inner_bl.png',
  cornerInnerSE: 'poke_cliff_brown_inner_br.png',
  edgeNorth: 'poke_cliff_brown_top.png',
  edgeWest: 'poke_cliff_brown_left.png',
  edgeEast: 'poke_cliff_brown_right.png',
  edgeSouth_Top: 'poke_cliff_brown_grass_top.png',
  edgeSouth_Foot: 'poke_cliff_brown_face.png',
  stairs_L: 'poke_cliff_brown_stairs_l.png',
  stairs_R: 'poke_cliff_brown_stairs_r.png'
};

export const CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK: Readonly<MountainBrushSet> = {
  floor: 'poke_cliff_brown_plateau_rock.png',
  peakCone: 'poke_cliff_cone_brown.png',
  cornerOuterNW: 'poke_cliff_brown_corner_tl.png',
  cornerOuterNE: 'poke_cliff_brown_corner_tr.png',
  cornerOuterSW_Top: 'poke_cliff_brown_rock_left.png',
  cornerOuterSW_Foot: 'poke_cliff_brown_corner_bl.png',
  cornerOuterSE_Top: 'poke_cliff_brown_rock_right.png',
  cornerOuterSE_Foot: 'poke_cliff_brown_corner_br.png',
  cornerInnerNW: 'poke_cliff_brown_rock_inner_tl.png',
  cornerInnerNE: 'poke_cliff_brown_rock_inner_tr.png',
  cornerInnerSW: 'poke_cliff_brown_rock_inner_bl.png',
  cornerInnerSE: 'poke_cliff_brown_rock_inner_br.png',
  edgeNorth: 'poke_cliff_brown_rock_top.png',
  edgeWest: 'poke_cliff_brown_rock_left.png',
  edgeEast: 'poke_cliff_brown_rock_right.png',
  edgeSouth_Top: 'poke_cliff_brown_plateau_rock.png',
  edgeSouth_Foot: 'poke_cliff_brown_rock_face_bottom.png',
  stairs_L: 'poke_cliff_brown_rock_stairs_l.png',
  stairs_R: 'poke_cliff_brown_rock_stairs_r.png'
};

export const CANONICAL_MOUNTAIN_BRUSH_GRAY: Readonly<MountainBrushSet> = {
  floor: 'poke_cliff_gray_plateau_rock.png',
  peakCone: 'poke_cliff_cone_gray.png',
  cornerOuterNW: 'poke_cliff_gray_corner_tl.png',
  cornerOuterNE: 'poke_cliff_gray_corner_tr.png',
  cornerOuterSW_Top: 'poke_cliff_gray_left.png',
  cornerOuterSW_Foot: 'poke_cliff_gray_corner_bl.png',
  cornerOuterSE_Top: 'poke_cliff_gray_right.png',
  cornerOuterSE_Foot: 'poke_cliff_gray_corner_br.png',
  cornerInnerNW: 'poke_cliff_gray_inner_tl.png',
  cornerInnerNE: 'poke_cliff_gray_inner_tr.png',
  cornerInnerSW: 'poke_cliff_gray_inner_bl.png',
  cornerInnerSE: 'poke_cliff_gray_inner_br.png',
  edgeNorth: 'poke_cliff_gray_top.png',
  edgeWest: 'poke_cliff_gray_left.png',
  edgeEast: 'poke_cliff_gray_right.png',
  edgeSouth_Top: 'poke_cliff_gray_grass_top.png',
  edgeSouth_Foot: 'poke_cliff_gray_face.png',
  stairs_L: 'poke_cliff_gray_stairs_l.png',
  stairs_R: 'poke_cliff_gray_stairs_r.png'
};

export const CANONICAL_MOUNTAIN_BRUSH_GRAY_ROCK: Readonly<MountainBrushSet> = {
  floor: 'poke_cliff_gray_plateau_rock.png',
  peakCone: 'poke_cliff_cone_gray.png',
  cornerOuterNW: 'poke_cliff_gray_corner_tl.png',
  cornerOuterNE: 'poke_cliff_gray_corner_tr.png',
  cornerOuterSW_Top: 'poke_cliff_gray_rock_left.png',
  cornerOuterSW_Foot: 'poke_cliff_gray_corner_bl.png',
  cornerOuterSE_Top: 'poke_cliff_gray_rock_right.png',
  cornerOuterSE_Foot: 'poke_cliff_gray_corner_br.png',
  cornerInnerNW: 'poke_cliff_gray_rock_inner_tl.png',
  cornerInnerNE: 'poke_cliff_gray_rock_inner_tr.png',
  cornerInnerSW: 'poke_cliff_gray_rock_inner_bl.png',
  cornerInnerSE: 'poke_cliff_gray_rock_inner_br.png',
  edgeNorth: 'poke_cliff_gray_rock_top.png',
  edgeWest: 'poke_cliff_gray_rock_left.png',
  edgeEast: 'poke_cliff_gray_rock_right.png',
  edgeSouth_Top: 'poke_cliff_gray_plateau_rock.png',
  edgeSouth_Foot: 'poke_cliff_gray_rock_face_bottom.png',
  stairs_L: 'poke_cliff_gray_rock_stairs_l.png',
  stairs_R: 'poke_cliff_gray_rock_stairs_r.png'
};

export const CANONICAL_MOUNTAIN_BRUSH_VOLCANIC: Readonly<MountainBrushSet> = {
  floor: 'poke_cliff_brown_plateau_rock.png',
  peakCone: 'poke_cliff_cone_brown.png',
  cornerOuterNW: 'poke_cliff_brown_corner_tl.png',
  cornerOuterNE: 'poke_cliff_brown_corner_tr.png',
  cornerOuterSW_Top: 'poke_cliff_brown_rock_left.png',
  cornerOuterSW_Foot: 'poke_cliff_brown_corner_bl.png',
  cornerOuterSE_Top: 'poke_cliff_brown_rock_right.png',
  cornerOuterSE_Foot: 'poke_cliff_brown_corner_br.png',
  cornerInnerNW: 'poke_cliff_brown_rock_inner_tl.png',
  cornerInnerNE: 'poke_cliff_brown_rock_inner_tr.png',
  cornerInnerSW: 'poke_cliff_brown_rock_inner_bl.png',
  cornerInnerSE: 'poke_cliff_brown_rock_inner_br.png',
  edgeNorth: 'poke_cliff_brown_rock_top.png',
  edgeWest: 'poke_cliff_brown_rock_left.png',
  edgeEast: 'poke_cliff_brown_rock_right.png',
  edgeSouth_Top: 'poke_cliff_brown_plateau_rock.png',
  edgeSouth_Foot: 'poke_cliff_brown_rock_face_bottom.png',
  stairs_L: 'poke_cliff_brown_rock_stairs_l.png',
  stairs_R: 'poke_cliff_brown_rock_stairs_r.png'
};

export interface CliffFootOverlay {
  readonly targetX: number;
  readonly targetY: number;
  readonly tile: string;
  readonly sourceElev: number;
  readonly targetElev: number;
  readonly occupiesCell: boolean;
}

export interface ResolvedMountainCell {
  readonly x: number;
  readonly y: number;
  readonly elevation: number;
  readonly role: MountainRole;
  readonly primaryTile: string;
  readonly overlayTiles?: readonly string[];
  readonly projectedFoot?: CliffFootOverlay;
}

export interface ResolvedMountainMapResult {
  readonly width: number;
  readonly height: number;
  readonly primaryTiles: readonly (readonly string[])[];
  readonly cellDetails: readonly (readonly (ResolvedMountainCell | null)[])[];
  readonly cliffFootOverlays: readonly CliffFootOverlay[];
  readonly occupiedFootCells: readonly (readonly boolean[])[];
}

export interface MountainStairLocation {
  readonly x: number;
  readonly y: number;
  readonly tier?: number;
}

export interface MountainAutotileGridOptions {
  readonly palette?: MountainPalette;
  readonly paletteMatrix?: readonly (readonly MountainPalette[])[];
  readonly stairs?: readonly MountainStairLocation[];
  readonly style?: 'rock' | 'grassy_ledge';
}

/**
 * Computes the 8-bit neighbor bitmask for same-or-higher elevation relative to (gx, gy).
 */
export function compute8NeighborElevationMask(
  matrix: ElevationMatrix,
  gx: number,
  gy: number,
  targetElev: number
): number {
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;
  let mask = 0;

  const offsets = [
    { dx: -1, dy: -1, bit: BITMASK_8_DIRECTIONS.NW },
    { dx: 0, dy: -1, bit: BITMASK_8_DIRECTIONS.N },
    { dx: 1, dy: -1, bit: BITMASK_8_DIRECTIONS.NE },
    { dx: -1, dy: 0, bit: BITMASK_8_DIRECTIONS.W },
    { dx: 1, dy: 0, bit: BITMASK_8_DIRECTIONS.E },
    { dx: -1, dy: 1, bit: BITMASK_8_DIRECTIONS.SW },
    { dx: 0, dy: 1, bit: BITMASK_8_DIRECTIONS.S },
    { dx: 1, dy: 1, bit: BITMASK_8_DIRECTIONS.SE }
  ];

  for (const { dx, dy, bit } of offsets) {
    const nx = gx + dx;
    const ny = gy + dy;
    if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
      const neighborElev = matrix[ny]?.[nx] ?? 0;
      if (neighborElev >= targetElev) {
        mask |= bit;
      }
    }
  }

  return mask;
}

/**
 * Resolves autotile role, primary tile, inner overlays, and south-foot projection for a single cell.
 */
export function resolveMountainAutotileCell(
  matrix: ElevationMatrix,
  gx: number,
  gy: number,
  pal: MountainPalette = 'brown',
  style: MountainStyle = 'rock'
): ResolvedMountainCell {
  const curElev = matrix[gy]?.[gx] ?? 0;
  const grassBrush = pal === 'gray'
    ? CANONICAL_MOUNTAIN_BRUSH_GRAY
    : pal === 'volcanic'
      ? CANONICAL_MOUNTAIN_BRUSH_VOLCANIC
      : CANONICAL_MOUNTAIN_BRUSH_BROWN;
  const rockBrush = pal === 'gray'
    ? CANONICAL_MOUNTAIN_BRUSH_GRAY_ROCK
    : pal === 'volcanic'
      ? CANONICAL_MOUNTAIN_BRUSH_VOLCANIC
      : CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK;
  const activeBrush = style === 'rock' ? rockBrush : grassBrush;

  if (curElev <= 0) {
    return {
      x: gx,
      y: gy,
      elevation: 0,
      role: 'floor_center',
      primaryTile: activeBrush.floor
    };
  }

  const mask = compute8NeighborElevationMask(matrix, gx, gy, curElev);

  const hasN = (mask & BITMASK_8_DIRECTIONS.N) !== 0;
  const hasS = (mask & BITMASK_8_DIRECTIONS.S) !== 0;
  const hasW = (mask & BITMASK_8_DIRECTIONS.W) !== 0;
  const hasE = (mask & BITMASK_8_DIRECTIONS.E) !== 0;
  const hasNW = (mask & BITMASK_8_DIRECTIONS.NW) !== 0;
  const hasNE = (mask & BITMASK_8_DIRECTIONS.NE) !== 0;
  const hasSW = (mask & BITMASK_8_DIRECTIONS.SW) !== 0;
  const hasSE = (mask & BITMASK_8_DIRECTIONS.SE) !== 0;

  const nElev = gy > 0 ? (matrix[gy - 1]?.[gx] ?? 0) : 0;
  const wElev = gx > 0 ? (matrix[gy]?.[gx - 1] ?? 0) : 0;
  const eElev = matrix[gy]?.[gx + 1] ?? 0;

  // 1. Isolated Peak (single 1x1 cell peak)
  if (!hasN && !hasS && !hasW && !hasE) {
    return {
      x: gx,
      y: gy,
      elevation: curElev,
      role: 'peak_isolated',
      primaryTile: activeBrush.peakCone
    };
  }

  // 2. Outer Convex Corners
  // North-West
  if (!hasN && hasS && !hasW && hasE) {
    const isRock = nElev > 0 || wElev > 0;
    const b = isRock ? rockBrush : grassBrush;
    return {
      x: gx,
      y: gy,
      elevation: curElev,
      role: 'corner_outer_nw',
      primaryTile: b.cornerOuterNW
    };
  }
  // North-East
  if (!hasN && hasS && hasW && !hasE) {
    const isRock = nElev > 0 || eElev > 0;
    const b = isRock ? rockBrush : grassBrush;
    return {
      x: gx,
      y: gy,
      elevation: curElev,
      role: 'corner_outer_ne',
      primaryTile: b.cornerOuterNE
    };
  }
  // South-West Top (Option A: projects foot to gy + 1)
  if (hasN && !hasS && !hasW && hasE) {
    const targetY = gy + 1;
    const targetElev = matrix[targetY]?.[gx] ?? 0;
    const isRock = targetElev > 0 || wElev > 0;
    const b = isRock ? rockBrush : grassBrush;
    return {
      x: gx,
      y: gy,
      elevation: curElev,
      role: 'corner_outer_sw_top',
      primaryTile: b.cornerOuterSW_Top,
      projectedFoot: {
        targetX: gx,
        targetY,
        tile: b.cornerOuterSW_Foot,
        sourceElev: curElev,
        targetElev,
        occupiesCell: true
      }
    };
  }
  // South-East Top (Option A: projects foot to gy + 1)
  if (hasN && !hasS && hasW && !hasE) {
    const targetY = gy + 1;
    const targetElev = matrix[targetY]?.[gx] ?? 0;
    const isRock = targetElev > 0 || eElev > 0;
    const b = isRock ? rockBrush : grassBrush;
    return {
      x: gx,
      y: gy,
      elevation: curElev,
      role: 'corner_outer_se_top',
      primaryTile: b.cornerOuterSE_Top,
      projectedFoot: {
        targetX: gx,
        targetY,
        tile: b.cornerOuterSE_Foot,
        sourceElev: curElev,
        targetElev,
        occupiesCell: true
      }
    };
  }

  // 3. Cardinal Straight Edges
  // North Edge
  if (!hasN && hasS && hasW && hasE) {
    const isRock = style === 'rock' || nElev > 0;
    const b = isRock ? rockBrush : grassBrush;
    return {
      x: gx,
      y: gy,
      elevation: curElev,
      role: 'edge_north',
      primaryTile: b.edgeNorth
    };
  }
  // South Edge Top (projects edgeSouth_Foot to gy + 1)
  if (hasN && !hasS && hasW && hasE) {
    const targetY = gy + 1;
    const targetElev = matrix[targetY]?.[gx] ?? 0;
    const isRock = targetElev > 0;
    const b = isRock ? rockBrush : grassBrush;
    return {
      x: gx,
      y: gy,
      elevation: curElev,
      role: 'edge_south_top',
      primaryTile: activeBrush.floor,
      projectedFoot: {
        targetX: gx,
        targetY,
        tile: b.edgeSouth_Foot,
        sourceElev: curElev,
        targetElev,
        occupiesCell: true
      }
    };
  }
  // West Wall
  if (hasN && hasS && !hasW && hasE) {
    const isRock = style === 'rock' || wElev > 0;
    const b = isRock ? rockBrush : grassBrush;
    return {
      x: gx,
      y: gy,
      elevation: curElev,
      role: 'edge_west',
      primaryTile: b.edgeWest
    };
  }
  // East Wall
  if (hasN && hasS && hasW && !hasE) {
    const isRock = style === 'rock' || eElev > 0;
    const b = isRock ? rockBrush : grassBrush;
    return {
      x: gx,
      y: gy,
      elevation: curElev,
      role: 'edge_east',
      primaryTile: b.edgeEast
    };
  }

  // 4. Center Floor & Concave Inner Corners (all 4 cardinal edges present)
  if (hasN && hasS && hasW && hasE) {
    const isRockTier = style === 'rock' || curElev > 1;
    const b = isRockTier ? rockBrush : grassBrush;

    // In GBA 2.5D perspective, all 4 cardinal neighbors meet at the elevated plateau
    // plane at or above current elevation. Even if diagonal neighbors drop down (!hasSW, !hasSE,
    // !hasNW, !hasNE), the vertical cliff walls face outward from the orthogonal neighbors,
    // leaving the interior cell as seamless walkable plateau floor without dark vertical wall cuts.
    let role: MountainRole = 'floor_center';
    if (!hasSW) {
      role = 'corner_inner_sw';
    } else if (!hasSE) {
      role = 'corner_inner_se';
    } else if (!hasNE) {
      role = 'corner_inner_ne';
    } else if (!hasNW) {
      role = 'corner_inner_nw';
    }

    return {
      x: gx,
      y: gy,
      elevation: curElev,
      role,
      primaryTile: b.floor
    };
  }

  // Fallback safe default
  return {
    x: gx,
    y: gy,
    elevation: curElev,
    role: 'floor_center',
    primaryTile: activeBrush.floor
  };
}

/**
 * Resolves an entire elevation matrix into a structured autotile result with:
 *   - Base primary tiles
 *   - Cell resolution metadata
 *   - Projected cliff feet overlays
 *   - Boolean occupancy grid for navigation and path blocking
 */
export function resolveMountainMapGrid(
  matrix: ElevationMatrix,
  palOrOptions: MountainPalette | MountainAutotileGridOptions = 'brown'
): ResolvedMountainMapResult {
  const pal = typeof palOrOptions === 'string' ? palOrOptions : (palOrOptions.palette ?? 'brown');
  const stairs = typeof palOrOptions === 'object' ? palOrOptions.stairs : undefined;
  const style = typeof palOrOptions === 'object' ? (palOrOptions.style ?? 'rock') : 'rock';

  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;

  const primaryTiles: string[][] = Array.from({ length: H }, () => Array(W).fill('')); // no-domain: Estructura o identificador procedural de aventura
  const cellDetails: (ResolvedMountainCell | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
  const occupiedFootCells: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const cliffFootOverlays: CliffFootOverlay[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const elev = matrix[y]?.[x] ?? 0;
      if (elev > 0) {
        const cellPal = (typeof palOrOptions === 'object' && palOrOptions.paletteMatrix?.[y]?.[x])
          ? palOrOptions.paletteMatrix[y]![x]!
          : pal;
        const resolved = resolveMountainAutotileCell(matrix, x, y, cellPal, style);
        cellDetails[y]![x] = resolved;
        primaryTiles[y]![x] = resolved.primaryTile;

        if (resolved.projectedFoot) {
          cliffFootOverlays.push(resolved.projectedFoot);
          const { targetX, targetY } = resolved.projectedFoot;
          if (targetY >= 0 && targetY < H && targetX >= 0 && targetX < W) {
            occupiedFootCells[targetY]![targetX] = true;
          }
        }
      }
    }
  }

  let result: ResolvedMountainMapResult = {
    width: W,
    height: H,
    primaryTiles,
    cellDetails,
    cliffFootOverlays,
    occupiedFootCells
  };

  if (stairs && stairs.length > 0) {
    for (const stair of stairs) {
      const stairPal = (typeof palOrOptions === 'object' && palOrOptions.paletteMatrix?.[stair.y]?.[stair.x])
        ? palOrOptions.paletteMatrix[stair.y]![stair.x]!
        : pal;
      result = stampMountainStairs(result, stair.x, stair.y, stairPal, style);
    }
  }

  return result;
}

/**
 * Stamps a functional 2-tile wide stair prefab onto a South cliff wall.
 * Replaces cliff top at (startX, startY) and (startX + 1, startY),
 * replaces projected cliff foot overlays at (startX, startY + 1) and (startX + 1, startY + 1),
 * and clears cell occupancy to enable player/entity navigation between elevation tiers.
 */
export function stampMountainStairs(
  result: ResolvedMountainMapResult,
  startX: number,
  startY: number,
  pal: MountainPalette = 'brown',
  style: MountainStyle = 'rock'
): ResolvedMountainMapResult {
  const W = result.width;
  const H = result.height;

  if (startX < 0 || startX + 1 >= W || startY < 0 || startY + 1 >= H) {
    throw new Error(
      `Cannot stamp mountain stairs at (${startX}, ${startY}): out of bounds for grid ${W}x${H}`
    );
  }

  const cellL = result.cellDetails[startY]?.[startX];
  const cellR = result.cellDetails[startY]?.[startX + 1];

  if (!cellL || !cellR || cellL.role !== 'edge_south_top' || cellR.role !== 'edge_south_top') {
    throw new Error(
      `Cannot stamp mountain stairs at (${startX}, ${startY}): target cells must be 'edge_south_top' wall faces`
    );
  }

  const targetElevL = cellL.projectedFoot?.targetElev ?? 0;
  const targetElevR = cellR.projectedFoot?.targetElev ?? 0;
  const isRockTier = style === 'rock' || targetElevL > 0 || targetElevR > 0;

  const grassBrush = pal === 'gray' ? CANONICAL_MOUNTAIN_BRUSH_GRAY : CANONICAL_MOUNTAIN_BRUSH_BROWN;
  const rockBrush = pal === 'gray' ? CANONICAL_MOUNTAIN_BRUSH_GRAY_ROCK : CANONICAL_MOUNTAIN_BRUSH_BROWN_ROCK;
  const b = isRockTier ? rockBrush : grassBrush;

  const newPrimaryTiles: string[][] = result.primaryTiles.map(r => [...r]); // no-domain: Estructura o identificador procedural de aventura
  const newCellDetails: (ResolvedMountainCell | null)[][] = result.cellDetails.map(r => [...r]);
  const newOccupiedFootCells: boolean[][] = result.occupiedFootCells.map(r => [...r]);

  newPrimaryTiles[startY]![startX] = b.floor;
  newPrimaryTiles[startY]![startX + 1] = b.floor;

  newCellDetails[startY]![startX] = {
    x: startX,
    y: startY,
    elevation: cellL.elevation,
    role: 'stairs_l',
    primaryTile: b.floor,
    projectedFoot: {
      targetX: startX,
      targetY: startY + 1,
      tile: b.stairs_L,
      sourceElev: cellL.elevation,
      targetElev: targetElevL,
      occupiesCell: false
    }
  };

  newCellDetails[startY]![startX + 1] = {
    x: startX + 1,
    y: startY,
    elevation: cellR.elevation,
    role: 'stairs_r',
    primaryTile: b.floor,
    projectedFoot: {
      targetX: startX + 1,
      targetY: startY + 1,
      tile: b.stairs_R,
      sourceElev: cellR.elevation,
      targetElev: targetElevR,
      occupiesCell: false
    }
  };

  const newOverlays: CliffFootOverlay[] = result.cliffFootOverlays.filter(
    ov => !(ov.targetY === startY + 1 && (ov.targetX === startX || ov.targetX === startX + 1))
  );

  newOverlays.push({
    targetX: startX,
    targetY: startY + 1,
    tile: b.stairs_L,
    sourceElev: cellL.elevation,
    targetElev: targetElevL,
    occupiesCell: false
  });

  newOverlays.push({
    targetX: startX + 1,
    targetY: startY + 1,
    tile: b.stairs_R,
    sourceElev: cellR.elevation,
    targetElev: targetElevR,
    occupiesCell: false
  });

  newOccupiedFootCells[startY + 1]![startX] = false;
  newOccupiedFootCells[startY + 1]![startX + 1] = false;

  return {
    width: W,
    height: H,
    primaryTiles: newPrimaryTiles,
    cellDetails: newCellDetails,
    cliffFootOverlays: newOverlays,
    occupiedFootCells: newOccupiedFootCells
  };
}

/**
 * Normalizes diagonal heightmap adjacency to eliminate isolated diagonal cliff contacts.
 * In a Von Neumann 4-neighbor grid, if two cells with delta-h > 0 touch ONLY diagonally
 * (e.g., (x,y) and (x+1, y+1) are elevated while (x+1, y) and (x, y+1) are lower),
 * an orthogonal neighbor is expanded to enforce Von Neumann (4-neighbor) adjacency and
 * prevent diagonal cliff-cutting glitches.
 */
export function normalizeHeightmapDiagonals(matrix: number[][]): number[][] {
  const H = matrix.length;
  if (H === 0) return matrix;
  const W = matrix[0]?.length ?? 0;
  if (W === 0) return matrix;

  const normalized: number[][] = matrix.map((row) => [...row]);

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 4) {
    changed = false;
    iterations++;

    for (let y = 0; y < H - 1; y++) {
      for (let x = 0; x < W - 1; x++) {
        const tl = normalized[y]![x]!;
        const tr = normalized[y]![x + 1]!;
        const bl = normalized[y + 1]![x]!;
        const br = normalized[y + 1]![x + 1]!;

        // Case 1: TL and BR are higher than TR and BL (diagonal \ )
        if (tl > tr && br > tr && tl > bl && br > bl) {
          const targetElev = Math.min(tl, br);
          normalized[y]![x + 1] = targetElev;
          changed = true;
        }
        // Case 2: TR and BL are higher than TL and BR (diagonal / )
        else if (tr > tl && bl > tl && tr > br && bl > br) {
          const targetElev = Math.min(tr, bl);
          normalized[y]![x] = targetElev;
          changed = true;
        }
      }
    }
  }

  return normalized;
}

/**
 * Reactively recalculates the mountain autotiling bitmask and cell details
 * within a local radius around (centerX, centerY) after terrain or height modifications.
 */
export function recalculateNeighborhoodBitmask(
  result: ResolvedMountainMapResult,
  matrix: ElevationMatrix,
  centerX: number,
  centerY: number,
  radius = 2,
  options?: MountainAutotileGridOptions
): ResolvedMountainMapResult {
  const W = result.width;
  const H = result.height;
  const pal = options?.palette ?? 'brown';
  const style = options?.style ?? 'rock';

  const minX = Math.max(0, centerX - radius);
  const maxX = Math.min(W - 1, centerX + radius);
  const minY = Math.max(0, centerY - radius);
  const maxY = Math.min(H - 1, centerY + radius);

  const newPrimaryTiles = result.primaryTiles.map((row) => [...row]);
  const newCellDetails = result.cellDetails.map((row) => [...row]);
  const newOccupiedFootCells = result.occupiedFootCells.map((row) => [...row]);

  // Clear existing foot overlays originating from this sub-rect
  const newOverlays = result.cliffFootOverlays.filter((f) => {
    return !(f.targetX >= minX && f.targetX <= maxX && f.targetY >= minY && f.targetY <= maxY + 1);
  });

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const elev = matrix[y]?.[x] ?? 0;
      if (elev > 0) {
        const cellPal = options?.paletteMatrix?.[y]?.[x] ?? pal;
        const resolved = resolveMountainAutotileCell(matrix, x, y, cellPal, style);
        newCellDetails[y]![x] = resolved;
        newPrimaryTiles[y]![x] = resolved.primaryTile;

        if (resolved.projectedFoot) {
          newOverlays.push(resolved.projectedFoot);
          const { targetX, targetY } = resolved.projectedFoot;
          if (targetY >= 0 && targetY < H && targetX >= 0 && targetX < W) {
            newOccupiedFootCells[targetY]![targetX] = true;
          }
        }
      } else {
        newCellDetails[y]![x] = null;
        newPrimaryTiles[y]![x] = '';
      }
    }
  }

  return {
    width: W,
    height: H,
    primaryTiles: newPrimaryTiles,
    cellDetails: newCellDetails,
    cliffFootOverlays: newOverlays,
    occupiedFootCells: newOccupiedFootCells
  };
}

/**
 * Prunes redundant mountain stairs within Manhattan distance < 4,
 * prioritizing stairs connected to pathGrid over disconnected duplicates.
 */
export function pruneRedundantStairs(
  stairs: readonly MountainStairLocation[],
  pathGrid?: readonly (readonly boolean[])[]
): MountainStairLocation[] {
  if (stairs.length <= 1) return [...stairs];

  const isConnected = (st: MountainStairLocation): boolean => {
    if (!pathGrid) return false;
    const H = pathGrid.length;
    const W = pathGrid[0]?.length ?? 0;
    // Check footprint of stair and adjacent landings (y-1, y, y+1, y+2, and x-1 to x+2)
    for (let dy = -1; dy <= 2; dy++) {
      for (let dx = -1; dx <= 2; dx++) {
        const py = st.y + dy;
        const px = st.x + dx;
        if (py >= 0 && py < H && px >= 0 && px < W && pathGrid[py]?.[px]) {
          return true;
        }
      }
    }
    return false;
  };

  const surviving: MountainStairLocation[] = [];

  for (let i = 0; i < stairs.length; i++) {
    const candidate = stairs[i]!;
    let isRedundant = false;

    for (let j = 0; j < surviving.length; j++) {
      const existing = surviving[j]!;
      const manhattanDist = Math.abs(candidate.x - existing.x) + Math.abs(candidate.y - existing.y);
      if (manhattanDist < 4) {
        const candConn = isConnected(candidate);
        const existConn = isConnected(existing);

        if (candConn && !existConn) {
          // Replace existing with better connected candidate
          surviving[j] = candidate;
          isRedundant = true;
          break;
        } else {
          isRedundant = true;
          break;
        }
      }
    }

    if (!isRedundant) {
      surviving.push(candidate);
    }
  }

  return surviving;
}

export {
  validateHeightmapConstraints,
  sanitizeHeightmapMatrix,
  type HeightmapConstraintViolation,
  type HeightmapConstraintViolationType,
  type HeightmapConstraintOptions
} from './heightmapConstraints.ts';



