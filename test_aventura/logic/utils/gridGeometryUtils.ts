/**
 * test_aventura/logic/utils/gridGeometryUtils.ts
 *
 * Pure discrete 2D grid geometry helpers for brush kernels, Bresenham stroke
 * interpolation, and clamped/merged dirty tile bounds.
 */

import type { DirtyTileBounds } from '../../types/map/autotileHealingTypes.ts';
import type {
  BrushShape,
  BrushSizeOption,
  GridPoint2D
} from '../../types/map/continentBrushTypes.ts';

/**
 * Converts a discrete odd brush side size (1, 3, 5, 9, 15) into an integer radius (0..7).
 */
export function brushSizeToRadius(size: BrushSizeOption): number {
  return Math.max(0, Math.floor((size - 1) / 2));
}

/**
 * Computes all discrete integer grid cells along the 8-connected Bresenham segment
 * joining `(x0, y0)` and `(x1, y1)` inclusive.
 */
export function bresenhamLinePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): readonly GridPoint2D[] {
  const startX = Math.round(x0);
  const startY = Math.round(y0);
  const endX = Math.round(x1);
  const endY = Math.round(y1);

  const dx = Math.abs(endX - startX);
  const dy = Math.abs(endY - startY);
  const stepX = startX < endX ? 1 : -1;
  const stepY = startY < endY ? 1 : -1;

  const points: GridPoint2D[] = [];
  let cx = startX;
  let cy = startY;
  let err = dx - dy;

  for (;;) {
    points.push({ x: cx, y: cy });
    if (cx === endX && cy === endY) break;
    const doubleErr = 2 * err;
    if (doubleErr > -dy) {
      err -= dy;
      cx += stepX;
    }
    if (doubleErr < dx) {
      err += dx;
      cy += stepY;
    }
  }

  return points;
}

/**
 * Returns relative `(dx, dy)` cell offsets for a discrete brush footprint of radius `r`
 * and shape `'square' | 'circle'`.
 */
export function collectBrushKernelOffsets(
  radius: number,
  shape: BrushShape
): readonly GridPoint2D[] {
  const safeRadius = Math.max(0, Math.floor(radius));
  if (safeRadius === 0) {
    return [{ x: 0, y: 0 }];
  }

  const offsets: GridPoint2D[] = [];
  const radiusSqThreshold = (safeRadius + 0.35) * (safeRadius + 0.35);

  for (let dy = -safeRadius; dy <= safeRadius; dy++) {
    for (let dx = -safeRadius; dx <= safeRadius; dx++) {
      if (shape === 'circle' && dx * dx + dy * dy > radiusSqThreshold) {
        continue;
      }
      offsets.push({ x: dx, y: dy });
    }
  }

  return offsets;
}

/**
 * Clamps a `DirtyTileBounds` rect into valid `[0..width-1, 0..height-1]` grid coordinates.
 */
export function clampDirtyBounds(
  bounds: DirtyTileBounds,
  width: number,
  height: number
): DirtyTileBounds {
  const maxValidX = Math.max(0, width - 1);
  const maxValidY = Math.max(0, height - 1);
  return {
    minX: Math.max(0, Math.min(maxValidX, bounds.minX)),
    minY: Math.max(0, Math.min(maxValidY, bounds.minY)),
    maxX: Math.max(0, Math.min(maxValidX, bounds.maxX)),
    maxY: Math.max(0, Math.min(maxValidY, bounds.maxY))
  };
}

/**
 * Expands a `DirtyTileBounds` rect uniformly by `margin` tiles and clamps to grid bounds.
 */
export function expandDirtyBounds(
  bounds: DirtyTileBounds,
  margin: number,
  width: number,
  height: number
): DirtyTileBounds {
  const pad = Math.max(0, Math.floor(margin));
  return clampDirtyBounds(
    {
      minX: bounds.minX - pad,
      minY: bounds.minY - pad,
      maxX: bounds.maxX + pad,
      maxY: bounds.maxY + pad
    },
    width,
    height
  );
}

/**
 * Returns the minimal bounding rectangle enclosing two nullable `DirtyTileBounds`.
 */
export function mergeDirtyBounds(
  a: DirtyTileBounds | null,
  b: DirtyTileBounds | null
): DirtyTileBounds | null {
  if (!a) return b;
  if (!b) return a;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY)
  };
}

/**
 * Resolves the logical grid width even when leading rows are sparse (`[]`) outside a dirty slice.
 */
export function resolveSparseGridWidth<T>(
  grid: readonly (readonly T[])[],
  hintRow?: number
): number {
  const direct = grid[0]?.length ?? 0;
  if (direct > 0) return direct;
  if (hintRow !== undefined) {
    const hinted = grid[hintRow]?.length ?? 0;
    if (hinted > 0) return hinted;
  }
  for (const row of grid) {
    if (row.length > 0) return row.length;
  }
  return 0;
}
