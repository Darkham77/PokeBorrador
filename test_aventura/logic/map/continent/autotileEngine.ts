/**
 * src/logic/map/continent/autotileEngine.ts
 *
 * 8-BIT AUTOTILING & TRANSITION ENGINE
 * Computes neighboring cell bitmasks and applies real-time boundary transitions
 * (such as water shorelines and path borders) when terrain is modified.
 */

import type { ContinentBiomeType } from '../../../types/map/continentTypes';

export const BITMASK_DIRECTIONS = {
  NW: 1,
  N: 2,
  NE: 4,
  W: 8,
  E: 16,
  SW: 32,
  S: 64,
  SE: 128
} as const;

export type TransitionRole =
  | 'center'
  | 'isolated'
  | 'edge_n'
  | 'edge_s'
  | 'edge_w'
  | 'edge_e'
  | 'corner_nw'
  | 'corner_ne'
  | 'corner_sw'
  | 'corner_se'
  | 'inner_nw'
  | 'inner_ne'
  | 'inner_sw'
  | 'inner_se';

export interface ModifiedCellRecord {
  readonly gx: number;
  readonly gy: number;
  readonly oldBiome: ContinentBiomeType;
  readonly newBiome: ContinentBiomeType;
}

export interface ApplyAutotileResult {
  readonly modifiedCells: readonly ModifiedCellRecord[];
}

/**
 * Computes the 8-bit neighbor bitmask for a target biome around (gx, gy).
 */
export function computeAutotileBitmask(
  grid: ContinentBiomeType[][],
  gx: number,
  gy: number,
  matchBiome: ContinentBiomeType
): number {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  let mask = 0;

  const offsets = [
    { dx: -1, dy: -1, bit: BITMASK_DIRECTIONS.NW },
    { dx: 0, dy: -1, bit: BITMASK_DIRECTIONS.N },
    { dx: 1, dy: -1, bit: BITMASK_DIRECTIONS.NE },
    { dx: -1, dy: 0, bit: BITMASK_DIRECTIONS.W },
    { dx: 1, dy: 0, bit: BITMASK_DIRECTIONS.E },
    { dx: -1, dy: 1, bit: BITMASK_DIRECTIONS.SW },
    { dx: 0, dy: 1, bit: BITMASK_DIRECTIONS.S },
    { dx: 1, dy: 1, bit: BITMASK_DIRECTIONS.SE }
  ];

  for (const { dx, dy, bit } of offsets) {
    const nx = gx + dx;
    const ny = gy + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
      if (grid[ny]?.[nx] === matchBiome) {
        mask |= bit;
      }
    }
  }

  return mask;
}

/**
 * Resolves a canonical transition role based on the 8-bit neighbor bitmask.
 */
export function getTransitionRole(bitmask: number): TransitionRole {
  if (bitmask === 255) return 'center';
  if (bitmask === 0) return 'isolated';

  const hasN = (bitmask & BITMASK_DIRECTIONS.N) !== 0;
  const hasS = (bitmask & BITMASK_DIRECTIONS.S) !== 0;
  const hasW = (bitmask & BITMASK_DIRECTIONS.W) !== 0;
  const hasE = (bitmask & BITMASK_DIRECTIONS.E) !== 0;

  // Outer corners
  if (!hasN && hasS && !hasW && hasE) return 'corner_nw';
  if (!hasN && hasS && hasW && !hasE) return 'corner_ne';
  if (hasN && !hasS && !hasW && hasE) return 'corner_sw';
  if (hasN && !hasS && hasW && !hasE) return 'corner_se';

  // Cardinal edges
  if (!hasN && hasS) return 'edge_n';
  if (hasN && !hasS) return 'edge_s';
  if (!hasW && hasE) return 'edge_w';
  if (hasW && !hasE) return 'edge_e';

  return 'center';
}

/**
 * Applies a new biome to a target cell and recomputes surrounding border transitions (such as coastlines).
 */
export function applyAutotileAt(
  grid: ContinentBiomeType[][],
  gx: number,
  gy: number,
  newBiome: ContinentBiomeType,
  options?: { readonly autoShore?: boolean }
): ApplyAutotileResult {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const modified: ModifiedCellRecord[] = [];

  if (gx < 0 || gx >= w || gy < 0 || gy >= h) {
    return { modifiedCells: [] };
  }

  const oldBiome = grid[gy]![gx]!;
  if (oldBiome !== newBiome) {
    modified.push({ gx, gy, oldBiome, newBiome });
    grid[gy]![gx] = newBiome;
  }

  // Automatic shoreline generation: when placing ocean, border grass with beach
  if (newBiome === 'ocean' && options?.autoShore) {
    const neighborOffsets = [
      { dx: -1, dy: -1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 1 }
    ];

    for (const { dx, dy } of neighborOffsets) {
      const nx = gx + dx;
      const ny = gy + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const neighborBiome = grid[ny]![nx]!;
        if (neighborBiome === 'grass') {
          modified.push({ gx: nx, gy: ny, oldBiome: 'grass', newBiome: 'beach' });
          grid[ny]![nx] = 'beach';
        }
      }
    }
  }

  return { modifiedCells: modified };
}
