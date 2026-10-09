/**
 * tests/node/map/autotileEngine.test.ts
 *
 * TIER 1 ISOLATED UNIT TEST: AUTOTILE ENGINE
 * Verifies 8-bit neighbor bitmasking, transition role resolution,
 * and automatic shoreline / border generation when placing terrain tiles.
 */

import { describe, it, expect } from 'vitest';
import {
  computeAutotileBitmask,
  getTransitionRole,
  applyAutotileAt,
  BITMASK_DIRECTIONS
} from '../../logic/map/continent/autotileEngine';
import type { ContinentBiomeType } from '../../types/map/continentTypes';

describe('autotileEngine', () => {
  function createGrid(w: number, h: number, fill: ContinentBiomeType): ContinentBiomeType[][] {
    return Array.from({ length: h }, () => new Array<ContinentBiomeType>(w).fill(fill));
  }

  it('computes correct 8-bit neighbor bitmask', () => {
    const grid = createGrid(5, 5, 'grass');

    // Initially all grass
    const grassMask = computeAutotileBitmask(grid, 2, 2, 'grass');
    expect(grassMask).toBe(255); // All 8 neighbors match

    // Place water at (2, 1) - North of (2, 2)
    grid[1]![2] = 'ocean';

    const waterMaskNorth = computeAutotileBitmask(grid, 2, 2, 'ocean');
    // Only North bit should be set
    expect(waterMaskNorth).toBe(BITMASK_DIRECTIONS.N);
  });

  it('correctly maps bitmasks to canonical transition roles', () => {
    // Completely surrounded
    expect(getTransitionRole(255)).toBe('center');

    // Isolated (no matching neighbors)
    expect(getTransitionRole(0)).toBe('isolated');

    // Only South and East present -> Northwest corner
    const nwCornerMask = BITMASK_DIRECTIONS.S | BITMASK_DIRECTIONS.E | BITMASK_DIRECTIONS.SE;
    expect(getTransitionRole(nwCornerMask)).toBe('corner_nw');

    // Only South present -> North edge
    expect(getTransitionRole(BITMASK_DIRECTIONS.S)).toBe('edge_n');
  });

  it('automatically generates beach/shoreline perimeter when stamping water in grass', () => {
    // 5x5 grid of pure grass
    const grid = createGrid(5, 5, 'grass');

    // Place ocean in the center at (2, 2)
    const result = applyAutotileAt(grid, 2, 2, 'ocean', { autoShore: true });

    // Center must be ocean
    expect(grid[2]![2]).toBe('ocean');

    // The surrounding 8 cells must now be beach borders (shorelines)
    const neighbors = [
      [1, 1], [2, 1], [3, 1],
      [1, 2],         [3, 2],
      [1, 3], [2, 3], [3, 3]
    ];

    for (const [nx, ny] of neighbors) {
      expect(grid[ny!]![nx!]).toBe('beach');
    }

    // Outer perimeter remains grass
    expect(grid[0]![0]).toBe('grass');
    expect(grid[4]![4]).toBe('grass');

    // Result should track all modified cells for undo/redo
    expect(result.modifiedCells.length).toBe(9); // 1 ocean + 8 beaches
  });

  it('preserves existing water and only converts grass to beach', () => {
    // 5x5 grid with some water already present
    const grid = createGrid(5, 5, 'grass');
    grid[1]![2] = 'ocean';

    // Place water adjacent at (2, 2)
    applyAutotileAt(grid, 2, 2, 'ocean', { autoShore: true });

    // Both ocean cells must remain ocean
    expect(grid[1]![2]).toBe('ocean');
    expect(grid[2]![2]).toBe('ocean');
  });
});
