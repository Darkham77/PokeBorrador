/**
 * test_aventura/logic/map/buildingPlacementSolver.ts
 *
 * CANONICAL BUILDING PLACEMENT & SPIRAL COLLISION SOLVER
 * Centralizes the spiral search algorithm to validate building footprints,
 * prevent overlaps with cliffs, buildings, and water, and guarantee consistent placement.
 */

import {
  KANTO_GRID_W,
  KANTO_GRID_H,
  KANTO_TILE_SIZE,
  CELL_BIOME,
  OCCUPANCY_FLAGS,
  type IKantoCarverWorldContext
} from '../../types/map/kantoGridModel.ts';
import {
  DEFAULT_STRUCTURE_PX_SIZE,
  MAX_PLACEMENT_SPIRAL_SEARCH_RADIUS,
  MAX_BUILDABLE_ELEVATION
} from '../../config/studioConstants.ts';

export interface BuildingPlacementResult {
  readonly found: boolean;
  readonly x: number;
  readonly y: number;
  readonly tx: number;
  readonly ty: number;
}

export function findValidBuildingPlacementSpot(
  gen: IKantoCarverWorldContext,
  initialPxX: number,
  initialPxY: number,
  widthPx: number,
  heightPx: number
): BuildingPlacementResult {
  const T = KANTO_TILE_SIZE;
  let sx = initialPxX;
  let sy = initialPxY;
  let bx = Math.floor(sx / T);
  let by = Math.floor(sy / T);
  const bw = Math.ceil(widthPx / T);
  const bh = Math.ceil(heightPx / T);

  const isSpotValid = (tx: number, ty: number): boolean => {
    // Must stay within grid bounds with 1-tile margin
    if (tx < 1 || tx + bw >= KANTO_GRID_W - 1 || ty < 1 || ty + bh >= KANTO_GRID_H - 1) return false;

    // 1-tile margin check against water, mountain elevation, cliffs, and reserved spaces
    for (let cy = ty - 1; cy <= ty + bh; cy++) {
      for (let cx = tx - 1; cx <= tx + bw; cx++) {
        const row = gen.grid[cy];
        const eRow = gen.elevation[cy];
        if (!row || !eRow) return false;
        const cell = row[cx];
        const elev = eRow[cx];
        if (cell === undefined || cell === CELL_BIOME.WATER || cell === CELL_BIOME.MOUNTAIN_DIRT) return false;
        if (elev === undefined || elev >= MAX_BUILDABLE_ELEVATION) return false;
        if (gen.occupancy.has(cx, cy, OCCUPANCY_FLAGS.CLIFF | OCCUPANCY_FLAGS.BUILDING | OCCUPANCY_FLAGS.DOOR_ACCESS)) {
          return false;
        }
      }
    }

    // Strict bounding-box overlap check with existing buildings (1-tile separation buffer)
    for (const eb of gen.buildings) {
      const ebx = Math.floor(eb.x / T);
      const eby = Math.floor(eb.y / T);
      const ebw = Math.ceil((eb.w ?? DEFAULT_STRUCTURE_PX_SIZE) / T);
      const ebh = Math.ceil((eb.h ?? DEFAULT_STRUCTURE_PX_SIZE) / T);
      if (tx < ebx + ebw + 1 && tx + bw + 1 > ebx && ty < eby + ebh + 1 && ty + bh + 1 > eby) {
        return false;
      }
    }
    return true;
  };

  let found = false;
  if (isSpotValid(bx, by)) {
    found = true;
  } else {
    // Spiral search up to configured radius
    for (let r = 1; r <= MAX_PLACEMENT_SPIRAL_SEARCH_RADIUS && !found; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (isSpotValid(bx + dx, by + dy)) {
            bx += dx;
            by += dy;
            sx = bx * T;
            sy = by * T;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  }

  return {
    found,
    x: sx,
    y: sy,
    tx: bx,
    ty: by
  };
}
