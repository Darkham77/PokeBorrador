/**
 * src/logic/map/autotileMatrixGenerator.ts
 *
 * CANONICAL 47-AUTOTILE MATRIX GENERATOR & RESOLVER
 * Generates the 47 standard 8-neighbor autotile bitmask cases and resolves
 * cell layers across Poké Vicio's 4 autotile engines:
 *   1. waterAutotileEngine
 *   2. pathAutotileEngine
 *   3. macroBiomeAutotileEngine
 *   4. mountainAutotileEngine
 */

import type {
  AutotileEngineId,
  BitmaskRoleCategory,
  CanonicalBitmaskCase,
  ResolvedPatch,
  ResolvedPatchCell
} from '../../types/map/autotileStudioTypes.ts';

import {
  classify2DAutotileRole,
  getTileForRole,
  CANONICAL_OCEAN_SHORE_BRUSH,
  BASE_GRASS_TILE
} from './waterAutotileEngine.ts';

import {
  CANONICAL_DIRT_PATH_BRUSH
} from './pathAutotileEngine.ts';

import {
  CANONICAL_MINT_GRASS_BRUSH
} from './macroBiomeAutotileEngine.ts';

import {
  resolveMountainAutotileCell,
  type ElevationMatrix
} from './mountainAutotileEngine.ts';

/**
 * Bitmask flag positions in 3x3 grid around center (1,1):
 * [ NW: 1,   N: 2,   NE: 4   ]
 * [ W: 8,    C: 0,   E: 16   ]
 * [ SW: 32,  S: 64,  SE: 128 ]
 */
export const BIT_OFFSETS = {
  NW: 1,
  N: 2,
  NE: 4,
  W: 8,
  E: 16,
  SW: 32,
  S: 64,
  SE: 128
} as const;

/**
 * Converts an 8-bit neighbor bitmask into a 3x3 boolean grid.
 * Center (1,1) is always true.
 */
export function bitmaskTo3x3Grid(bitmask: number, centerVal = true): boolean[][] {
  return [
    [(bitmask & BIT_OFFSETS.NW) !== 0, (bitmask & BIT_OFFSETS.N) !== 0, (bitmask & BIT_OFFSETS.NE) !== 0],
    [(bitmask & BIT_OFFSETS.W) !== 0, centerVal, (bitmask & BIT_OFFSETS.E) !== 0],
    [(bitmask & BIT_OFFSETS.SW) !== 0, (bitmask & BIT_OFFSETS.S) !== 0, (bitmask & BIT_OFFSETS.SE) !== 0]
  ];
}

/**
 * Converts a 3x3 boolean grid into an 8-bit neighbor bitmask around center (1,1).
 */
export function grid3x3ToBitmask(grid: readonly (readonly boolean[])[]): number {
  let mask = 0;
  if (grid[0]?.[0]) mask |= BIT_OFFSETS.NW;
  if (grid[0]?.[1]) mask |= BIT_OFFSETS.N;
  if (grid[0]?.[2]) mask |= BIT_OFFSETS.NE;
  if (grid[1]?.[0]) mask |= BIT_OFFSETS.W;
  if (grid[1]?.[2]) mask |= BIT_OFFSETS.E;
  if (grid[2]?.[0]) mask |= BIT_OFFSETS.SW;
  if (grid[2]?.[1]) mask |= BIT_OFFSETS.S;
  if (grid[2]?.[2]) mask |= BIT_OFFSETS.SE;
  return mask;
}

function buildCase(bitmask: number, category: BitmaskRoleCategory, label: string): CanonicalBitmaskCase {
  return {
    bitmask,
    category,
    label,
    grid3x3: bitmaskTo3x3Grid(bitmask)
  };
}

/**
 * The 47 Canonical Autotile Bitmask Configurations.
 * Bit values represent SAME/MATCHING terrain (true/1 = target terrain, false/0 = foreign/ground).
 */
export const CANONICAL_47_BITMASKS: readonly CanonicalBitmaskCase[] = [
  // 1. Isolated
  buildCase(0, 'isolated', 'Aislado (0)'),

  // 2. End-Caps (Single Cardinal Neighbor)
  buildCase(BIT_OFFSETS.N, 'edge', 'Punta Sur (Hacia Norte)'),
  buildCase(BIT_OFFSETS.S, 'edge', 'Punta Norte (Hacia Sur)'),
  buildCase(BIT_OFFSETS.W, 'edge', 'Punta Este (Hacia Oeste)'),
  buildCase(BIT_OFFSETS.E, 'edge', 'Punta Oeste (Hacia Este)'),

  // 3. Corridors
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S, 'edge', 'Pasillo Vertical'),
  buildCase(BIT_OFFSETS.W | BIT_OFFSETS.E, 'edge', 'Pasillo Horizontal'),

  // 4. Outer Corners (2 Adjacent Cardinals)
  // Outer NW: S + E
  buildCase(BIT_OFFSETS.S | BIT_OFFSETS.E, 'outer_corner', 'Esquina Ext. NO (Sin diag)'),
  buildCase(BIT_OFFSETS.S | BIT_OFFSETS.E | BIT_OFFSETS.SE, 'outer_corner', 'Esquina Ext. NO (Con diag SE)'),
  // Outer NE: S + W
  buildCase(BIT_OFFSETS.S | BIT_OFFSETS.W, 'outer_corner', 'Esquina Ext. NE (Sin diag)'),
  buildCase(BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.SW, 'outer_corner', 'Esquina Ext. NE (Con diag SW)'),
  // Outer SW: N + E
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.E, 'outer_corner', 'Esquina Ext. SO (Sin diag)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.E | BIT_OFFSETS.NE, 'outer_corner', 'Esquina Ext. SO (Con diag NE)'),
  // Outer SE: N + W
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.W, 'outer_corner', 'Esquina Ext. SE (Sin diag)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.W | BIT_OFFSETS.NW, 'outer_corner', 'Esquina Ext. SE (Con diag NW)'),

  // 5. Cardinal Edges (3 Cardinals)
  // Edge North (S + W + E)
  buildCase(BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E, 'edge', 'Borde Norte (Sin diags)'),
  buildCase(BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.SW, 'edge', 'Borde Norte (Diag SW)'),
  buildCase(BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.SE, 'edge', 'Borde Norte (Diag SE)'),
  buildCase(BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.SW | BIT_OFFSETS.SE, 'edge', 'Borde Norte (Ambas diags)'),

  // Edge South (N + W + E)
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.W | BIT_OFFSETS.E, 'edge', 'Borde Sur (Sin diags)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.NW, 'edge', 'Borde Sur (Diag NW)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.NE, 'edge', 'Borde Sur (Diag NE)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.NW | BIT_OFFSETS.NE, 'edge', 'Borde Sur (Ambas diags)'),

  // Edge West (N + S + E)
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.E, 'edge', 'Borde Oeste (Sin diags)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.E | BIT_OFFSETS.NE, 'edge', 'Borde Oeste (Diag NE)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.E | BIT_OFFSETS.SE, 'edge', 'Borde Oeste (Diag SE)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.E | BIT_OFFSETS.NE | BIT_OFFSETS.SE, 'edge', 'Borde Oeste (Ambas diags)'),

  // Edge East (N + S + W)
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W, 'edge', 'Borde Este (Sin diags)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.NW, 'edge', 'Borde Este (Diag NW)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.SW, 'edge', 'Borde Este (Diag SW)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.NW | BIT_OFFSETS.SW, 'edge', 'Borde Este (Ambas diags)'),

  // 6. Fully Surrounded (4 Cardinals + combinations of Diagonals)
  // All 4 diagonals missing
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E, 'inner_corner', '4 Esquinas Int. Faltantes'),

  // 3 diagonals missing (1 present)
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.NW, 'inner_corner', 'Diag NW (3 Int. Faltantes)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.NE, 'inner_corner', 'Diag NE (3 Int. Faltantes)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.SW, 'inner_corner', 'Diag SW (3 Int. Faltantes)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.SE, 'inner_corner', 'Diag SE (3 Int. Faltantes)'),

  // 2 diagonals missing (adjacent or opposite)
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.NW | BIT_OFFSETS.NE, 'inner_corner', 'Diags Norte (NW+NE)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.SW | BIT_OFFSETS.SE, 'inner_corner', 'Diags Sur (SW+SE)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.NW | BIT_OFFSETS.SW, 'inner_corner', 'Diags Oeste (NW+SW)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.NE | BIT_OFFSETS.SE, 'inner_corner', 'Diags Este (NE+SE)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.NW | BIT_OFFSETS.SE, 'inner_corner', 'Diags Cruzadas (NW+SE)'),
  buildCase(BIT_OFFSETS.N | BIT_OFFSETS.S | BIT_OFFSETS.W | BIT_OFFSETS.E | BIT_OFFSETS.NE | BIT_OFFSETS.SW, 'inner_corner', 'Diags Cruzadas (NE+SW)'),

  // 1 diagonal missing (Inner Corners)
  buildCase(255 ^ BIT_OFFSETS.NW, 'inner_corner', 'Esquina Int. NO (Falta NW)'),
  buildCase(255 ^ BIT_OFFSETS.NE, 'inner_corner', 'Esquina Int. NE (Falta NE)'),
  buildCase(255 ^ BIT_OFFSETS.SW, 'inner_corner', 'Esquina Int. SO (Falta SW)'),
  buildCase(255 ^ BIT_OFFSETS.SE, 'inner_corner', 'Esquina Int. SE (Falta SE)'),

  // 7. Center (255)
  buildCase(255, 'center', 'Centro Completo (255)')
];

/**
 * Resolves a 3x3 patch for the specified engine.
 */
export function resolveCanonicalPatch(
  caseItem: CanonicalBitmaskCase,
  engineId: AutotileEngineId
): ResolvedPatch {
  const grid = caseItem.grid3x3;
  const cells: ResolvedPatchCell[][] = [];

  // Compute foreign bitmask for 2D engines (where 1 = foreign/ground cell)
  const foreignMask = 255 ^ caseItem.bitmask;

  for (let r = 0; r < 3; r++) {
    const row: ResolvedPatchCell[] = [];
    for (let c = 0; c < 3; c++) {
      const isCenter = r === 1 && c === 1;
      const isTarget = grid[r]![c]!;

      if (!isCenter) {
        // Peripheral cells rendered with basic terrain indicator
        const baseFilename = isTarget ? getBaseTargetTile(engineId) : BASE_GRASS_TILE;
        row.push({
          x: c,
          y: r,
          filename: baseFilename,
          layerStack: [baseFilename],
          isCenter: false,
          roleName: isTarget ? 'neighbor_target' : 'neighbor_ground'
        });
        continue;
      }

      // Center cell evaluation using the official engine
      const resolvedCenter = resolveCenterCell(engineId, foreignMask, caseItem.bitmask, grid);
      row.push(resolvedCenter);
    }
    cells.push(row);
  }

  const centerCell = cells[1]![1]!;

  return {
    bitmaskCase: caseItem,
    engineId,
    cells,
    centerRole: centerCell.roleName ?? 'center',
    centerTile: centerCell.filename,
    centerLayerStack: centerCell.layerStack
  };
}

function getBaseTargetTile(engineId: AutotileEngineId): string {
  switch (engineId) {
    case 'water':
      return 'poke_sand_water_center.png';
    case 'path':
      return 'poke_dirt_path.png';
    case 'macro_biome':
      return 'poke_grass_mint_center.png';
    case 'mountain':
      return 'poke_cliff_brown_plateau_rock.png';
    default:
      return BASE_GRASS_TILE;
  }
}

function resolveCenterCell(
  engineId: AutotileEngineId,
  foreignMask: number,
  _sameMask: number,
  grid: readonly (readonly boolean[])[]
): ResolvedPatchCell {
  switch (engineId) {
    case 'water': {
      const classification = classify2DAutotileRole(foreignMask);
      const primaryTile = getTileForRole(CANONICAL_OCEAN_SHORE_BRUSH, classification.role);
      const overlayTiles = classification.innerOverlays.map((r) =>
        getTileForRole(CANONICAL_OCEAN_SHORE_BRUSH, r)
      );
      const stack = [BASE_GRASS_TILE, primaryTile, ...overlayTiles]; // no-domain: Estructura o identificador procedural de aventura
      return {
        x: 1,
        y: 1,
        filename: primaryTile,
        layerStack: stack,
        isCenter: true,
        roleName: classification.role
      };
    }

    case 'path': {
      const classification = classify2DAutotileRole(foreignMask);
      const primaryTile = getTileForRole(CANONICAL_DIRT_PATH_BRUSH, classification.role);
      const overlayTiles = classification.innerOverlays.map((r) =>
        getTileForRole(CANONICAL_DIRT_PATH_BRUSH, r)
      );
      const stack = [BASE_GRASS_TILE, primaryTile, ...overlayTiles]; // no-domain: Estructura o identificador procedural de aventura
      return {
        x: 1,
        y: 1,
        filename: primaryTile,
        layerStack: stack,
        isCenter: true,
        roleName: classification.role
      };
    }

    case 'macro_biome': {
      const classification = classify2DAutotileRole(foreignMask);
      const primaryTile = getTileForRole(CANONICAL_MINT_GRASS_BRUSH, classification.role);
      const overlayTiles = classification.innerOverlays.map((r) =>
        getTileForRole(CANONICAL_MINT_GRASS_BRUSH, r)
      );
      const stack = [BASE_GRASS_TILE, primaryTile, ...overlayTiles]; // no-domain: Estructura o identificador procedural de aventura
      return {
        x: 1,
        y: 1,
        filename: primaryTile,
        layerStack: stack,
        isCenter: true,
        roleName: classification.role
      };
    }

    case 'mountain': {
      const elevMatrix: ElevationMatrix = grid.map((r) => r.map((c) => (c ? 1 : 0)));
      const mCell = resolveMountainAutotileCell(elevMatrix, 1, 1, 'brown', 'rock');
      const stack = [mCell.primaryTile];
      if (mCell.overlayTiles) {
        stack.push(...mCell.overlayTiles);
      }
      return {
        x: 1,
        y: 1,
        filename: mCell.primaryTile,
        layerStack: stack,
        isCenter: true,
        roleName: mCell.role
      };
    }

    default: {
      return {
        x: 1,
        y: 1,
        filename: BASE_GRASS_TILE,
        layerStack: [BASE_GRASS_TILE],
        isCenter: true,
        roleName: 'center'
      };
    }
  }
}
