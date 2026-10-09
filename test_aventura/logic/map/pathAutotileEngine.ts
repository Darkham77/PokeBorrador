/**
 * src/logic/map/pathAutotileEngine.ts
 *
 * DIRT PATH & REGIONAL ROUTE AUTOTILING ENGINE (8-NEIGHBOR BITMASK)
 *
 * Features:
 *   1. 8-Neighbor bitmasking for dirt and sand paths against grass plains.
 *   2. Canonical GBA FireRed 13-tile brush mapping (straight edges, convex corners, concave inner overlays).
 *   3. Non-destructive layer stack integration (Grass -> Path -> Bridge -> Mountain/POI structures).
 */

import {
  compute2DNeighborMask,
  classify2DAutotileRole,
  getTileForRole,
  BITMASK_2D_DIRECTIONS,
  type WaterCoastBrushSet,
  type WaterAutotileRole
} from './waterAutotileEngine.ts';

export interface ResolvedPathCell {
  readonly x: number;
  readonly y: number;
  readonly role: WaterAutotileRole;
  readonly primaryTile: string;
  readonly overlayTiles?: readonly string[];
  readonly isBridge?: boolean;
}

export interface ResolvedPathMapResult {
  readonly width: number;
  readonly height: number;
  readonly pathDetails: readonly (readonly (ResolvedPathCell | null)[])[];
}

export const CANONICAL_DIRT_PATH_BRUSH: Readonly<WaterCoastBrushSet> = {
  center: 'poke_dirt_path.png',
  edgeNorth: 'poke_path_dirt_edge_n.png',
  edgeSouth: 'poke_path_dirt_edge_s.png',
  edgeWest: 'poke_path_dirt_edge_w.png',
  edgeEast: 'poke_path_dirt_edge_e.png',
  cornerOuterNW: 'poke_path_dirt_corner_outer_nw.png',
  cornerOuterNE: 'poke_path_dirt_corner_outer_ne.png',
  cornerOuterSW: 'poke_path_dirt_corner_outer_sw.png',
  cornerOuterSE: 'poke_path_dirt_corner_outer_se.png',
  cornerInnerNW: 'poke_path_dirt_corner_inner_nw.png',
  cornerInnerNE: 'poke_path_dirt_corner_inner_ne.png',
  cornerInnerSW: 'poke_path_dirt_corner_inner_sw.png',
  cornerInnerSE: 'poke_path_dirt_corner_inner_se.png'
};

export const CANONICAL_STONE_PLAZA_BRUSH: Readonly<WaterCoastBrushSet> = {
  center: 'poke_stone_plaza_center.png',
  edgeNorth: 'poke_stone_plaza_edge_n.png',
  edgeSouth: 'poke_stone_plaza_edge_s.png',
  edgeWest: 'poke_stone_plaza_edge_w.png',
  edgeEast: 'poke_stone_plaza_edge_e.png',
  cornerOuterNW: 'poke_stone_plaza_corner_outer_nw.png',
  cornerOuterNE: 'poke_stone_plaza_corner_outer_ne.png',
  cornerOuterSW: 'poke_stone_plaza_corner_outer_sw.png',
  cornerOuterSE: 'poke_stone_plaza_corner_outer_se.png',
  cornerInnerNW: 'poke_stone_plaza_corner_inner_nw.png',
  cornerInnerNE: 'poke_stone_plaza_corner_inner_ne.png',
  cornerInnerSW: 'poke_stone_plaza_corner_inner_sw.png',
  cornerInnerSE: 'poke_stone_plaza_corner_inner_se.png'
};

/**
 * Sanitizes a pathGrid ensuring all path corridors maintain a minimum width of >= 2 cells.
 * Expands isolated 1-cell wide path segments along their perpendicular axis, strictly eliminating
 * 1-cell slivers and asymmetrical notches.
 */
export function sanitizePathGridWidth(
  pathGrid: readonly (readonly boolean[])[],
  terrainMatrix?: readonly (readonly string[])[]
): boolean[][] {
  const H = pathGrid.length;
  if (H === 0) return [];
  const W = pathGrid[0]?.length ?? 0;
  if (W === 0) return [];

  const isValidLand = (x: number, y: number): boolean => {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    if (!terrainMatrix) return true;
    const t = terrainMatrix[y]?.[x];
    return t !== 'water' && t !== 'sand';
  };

  const sanitized: boolean[][] = pathGrid.map((row) => [...row]);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!pathGrid[y]![x]) continue;

      const leftIsPath = x > 0 && Boolean(pathGrid[y]![x - 1]);
      const rightIsPath = x < W - 1 && Boolean(pathGrid[y]![x + 1]);
      const topIsPath = y > 0 && Boolean(pathGrid[y - 1]![x]);
      const bottomIsPath = y < H - 1 && Boolean(pathGrid[y + 1]![x]);

      // If vertical run but missing horizontal companion:
      if ((topIsPath || bottomIsPath) && !leftIsPath && !rightIsPath) {
        const canRight = isValidLand(x + 1, y);
        const canLeft = isValidLand(x - 1, y);
        if (canRight) {
          sanitized[y]![x + 1] = true;
        } else if (canLeft) {
          sanitized[y]![x - 1] = true;
        } else {
          // Cannot expand to width 2 on valid land: prune orphan to let 2-wide trunk cap cleanly
          sanitized[y]![x] = false;
        }
      }

      // If horizontal run but missing vertical companion:
      if ((leftIsPath || rightIsPath) && !topIsPath && !bottomIsPath) {
        const canBottom = isValidLand(x, y + 1);
        const canTop = isValidLand(x, y - 1);
        if (canBottom) {
          sanitized[y + 1]![x] = true;
        } else if (canTop) {
          sanitized[y - 1]![x] = true;
        } else {
          // Cannot expand to width 2 on valid land: prune orphan to let 2-wide trunk cap cleanly
          sanitized[y]![x] = false;
        }
      }

      // If isolated 1x1 orphan cell (dead end point without companions):
      if (!leftIsPath && !rightIsPath && !topIsPath && !bottomIsPath) {
        sanitized[y]![x] = false;
      }
    }
  }

  return sanitized;
}

/**
 * Resolves autotile roles and tiles for the entire 2-cell wide path grid.
 */
export function resolvePathGrid(
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid?: readonly (readonly boolean[])[],
  brush: WaterCoastBrushSet = CANONICAL_DIRT_PATH_BRUSH
): ResolvedPathMapResult {
  const H = pathGrid.length;
  if (H === 0) return { width: 0, height: 0, pathDetails: [] };
  const W = pathGrid[0]?.length ?? 0;

  const pathDetails: (ResolvedPathCell | null)[][] = Array.from({ length: H }, () =>
    Array(W).fill(null)
  );

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const isPath = pathGrid[y]![x] ?? false;
      const isBridge = bridgeGrid?.[y]?.[x] ?? false;

      if (!isPath && !isBridge) continue;

      if (isBridge) {
        pathDetails[y]![x] = {
          x,
          y,
          role: 'center',
          primaryTile: 'poke_boardwalk_planks.png',
          isBridge: true
        };
        continue;
      }

      // Foreign mask: neighbors that are neither path nor bridge cells
      const foreignMask = compute2DNeighborMask(
        pathGrid,
        x,
        y,
        (neighbor, nx, ny) => {
          const isNeighborPath = Boolean(neighbor);
          const isNeighborBridge = Boolean(bridgeGrid?.[ny]?.[nx]);
          return !isNeighborPath && !isNeighborBridge;
        },
        false
      );

      const { role, innerOverlays } = classify2DAutotileRole(foreignMask);

      const hasN = (foreignMask & BITMASK_2D_DIRECTIONS.N) !== 0;
      const hasS = (foreignMask & BITMASK_2D_DIRECTIONS.S) !== 0;
      const hasW = (foreignMask & BITMASK_2D_DIRECTIONS.W) !== 0;
      const hasE = (foreignMask & BITMASK_2D_DIRECTIONS.E) !== 0;

      let primaryTile = getTileForRole(brush, role);
      const overlays: string[] = innerOverlays.map((ov) => getTileForRole(brush, ov)); // no-domain: Estructura o identificador procedural de aventura

      // Dual-edge narrow path support: if opposing sides are both grass/foreign, provide borders on both sides
      if (hasN && hasS) {
        if (brush === CANONICAL_DIRT_PATH_BRUSH) {
          primaryTile = 'poke_path_dirt_dual_edge_h.png';
        } else {
          primaryTile = brush.center;
          overlays.push(brush.edgeNorth, brush.edgeSouth);
        }
        if (hasW) overlays.push(brush.edgeWest);
        if (hasE) overlays.push(brush.edgeEast);
      } else if (hasW && hasE) {
        if (brush === CANONICAL_DIRT_PATH_BRUSH) {
          primaryTile = 'poke_path_dirt_dual_edge_v.png';
        } else {
          primaryTile = brush.center;
          overlays.push(brush.edgeWest, brush.edgeEast);
        }
        if (hasN) overlays.push(brush.edgeNorth);
        if (hasS) overlays.push(brush.edgeSouth);
      }

      pathDetails[y]![x] = {
        x,
        y,
        role,
        primaryTile,
        overlayTiles: overlays.length > 0 ? overlays : undefined,
        isBridge: false
      };
    }
  }

  return {
    width: W,
    height: H,
    pathDetails
  };
}
