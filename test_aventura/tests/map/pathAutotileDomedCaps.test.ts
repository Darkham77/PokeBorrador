/**
 * tests/node/map/pathAutotileDomedCaps.test.ts
 *
 * TIER 1 UNIT TESTS: 2-TILE DOMED PATH TERMINATIONS & AUTOTILE INTEGRITY
 *
 * Validates:
 *   1. Vertical 2-cell wide path North terminus forms a rounded dome (NW outer + NE outer).
 *   2. Vertical 2-cell wide path South terminus forms a rounded dome (SW outer + SE outer).
 *   3. Horizontal 2-cell wide path West terminus forms a rounded dome (NW outer + SW outer).
 *   4. Horizontal 2-cell wide path East terminus forms a rounded dome (NE outer + SE outer).
 *   5. L-turns maintain canonical outer convex corner and inner concave corner.
 *   6. 2-cell width sanitization eliminating 1-cell slivers.
 */

import { describe, it, expect } from 'vitest';
import {
  resolvePathGrid,
  sanitizePathGridWidth
} from '../../../src/logic/map/pathAutotileEngine.ts';

describe('pathAutotileDomedCaps', () => {
  it('resolves a 2-tile wide vertical path with symmetrical domed caps on both ends', () => {
    // 8x8 grid with a 2-wide vertical path from y=2 to y=5 at x=2,3
    const grid: boolean[][] = Array.from({ length: 8 }, () => Array(8).fill(false));
    for (let y = 2; y <= 5; y++) {
      grid[y]![2] = true;
      grid[y]![3] = true;
    }

    const result = resolvePathGrid(grid);

    // 1. North End (y = 2): Symmetrical rounded dome
    const northLeft = result.pathDetails[2]![2];
    const northRight = result.pathDetails[2]![3];

    expect(northLeft).not.toBeNull();
    expect(northRight).not.toBeNull();
    expect(northLeft?.role).toBe('corner_outer_nw');
    expect(northLeft?.primaryTile).toBe('poke_path_dirt_corner_outer_nw.png');
    expect(northRight?.role).toBe('corner_outer_ne');
    expect(northRight?.primaryTile).toBe('poke_path_dirt_corner_outer_ne.png');

    // 2. Mid Section (y = 3, 4): Continuous cardinal edges
    for (let y = 3; y <= 4; y++) {
      const midLeft = result.pathDetails[y]![2];
      const midRight = result.pathDetails[y]![3];
      expect(midLeft?.role).toBe('edge_west');
      expect(midLeft?.primaryTile).toBe('poke_path_dirt_edge_w.png');
      expect(midRight?.role).toBe('edge_east');
      expect(midRight?.primaryTile).toBe('poke_path_dirt_edge_e.png');
    }

    // 3. South End (y = 5): Symmetrical rounded dome
    const southLeft = result.pathDetails[5]![2];
    const southRight = result.pathDetails[5]![3];

    expect(southLeft).not.toBeNull();
    expect(southRight).not.toBeNull();
    expect(southLeft?.role).toBe('corner_outer_sw');
    expect(southLeft?.primaryTile).toBe('poke_path_dirt_corner_outer_sw.png');
    expect(southRight?.role).toBe('corner_outer_se');
    expect(southRight?.primaryTile).toBe('poke_path_dirt_corner_outer_se.png');
  });

  it('resolves a 2-tile wide horizontal path with symmetrical domed caps on both ends', () => {
    // 8x8 grid with a 2-wide horizontal path from x=2 to x=5 at y=2,3
    const grid: boolean[][] = Array.from({ length: 8 }, () => Array(8).fill(false));
    for (let x = 2; x <= 5; x++) {
      grid[2]![x] = true;
      grid[3]![x] = true;
    }

    const result = resolvePathGrid(grid);

    // 1. West End (x = 2): Symmetrical rounded dome
    const westTop = result.pathDetails[2]![2];
    const westBottom = result.pathDetails[3]![2];

    expect(westTop).not.toBeNull();
    expect(westBottom).not.toBeNull();
    expect(westTop?.role).toBe('corner_outer_nw');
    expect(westTop?.primaryTile).toBe('poke_path_dirt_corner_outer_nw.png');
    expect(westBottom?.role).toBe('corner_outer_sw');
    expect(westBottom?.primaryTile).toBe('poke_path_dirt_corner_outer_sw.png');

    // 2. Mid Section (x = 3, 4): Continuous cardinal edges
    for (let x = 3; x <= 4; x++) {
      const midTop = result.pathDetails[2]![x];
      const midBottom = result.pathDetails[3]![x];
      expect(midTop?.role).toBe('edge_north');
      expect(midTop?.primaryTile).toBe('poke_path_dirt_edge_n.png');
      expect(midBottom?.role).toBe('edge_south');
      expect(midBottom?.primaryTile).toBe('poke_path_dirt_edge_s.png');
    }

    // 3. East End (x = 5): Symmetrical rounded dome
    const eastTop = result.pathDetails[2]![5];
    const eastBottom = result.pathDetails[3]![5];

    expect(eastTop).not.toBeNull();
    expect(eastBottom).not.toBeNull();
    expect(eastTop?.role).toBe('corner_outer_ne');
    expect(eastTop?.primaryTile).toBe('poke_path_dirt_corner_outer_ne.png');
    expect(eastBottom?.role).toBe('corner_outer_se');
    expect(eastBottom?.primaryTile).toBe('poke_path_dirt_corner_outer_se.png');
  });

  it('guarantees that 90-degree elbows maintain rounded outer corner and concave inner corner', () => {
    // L-shaped 2-wide corridor: (x=2..3, y=2..6) and (x=2..6, y=2..3)
    const grid: boolean[][] = Array.from({ length: 8 }, () => Array(8).fill(false));
    for (let y = 2; y <= 6; y++) {
      grid[y]![2] = true;
      grid[y]![3] = true;
    }
    for (let x = 2; x <= 6; x++) {
      grid[2]![x] = true;
      grid[3]![x] = true;
    }

    const result = resolvePathGrid(grid);

    // Outer corner at vertex (2, 2) MUST be rounded convex NW
    expect(result.pathDetails[2]![2]?.role).toBe('corner_outer_nw');
    expect(result.pathDetails[2]![2]?.primaryTile).toBe('poke_path_dirt_corner_outer_nw.png');

    // Inner turn vertex at (3, 3) MUST have concave inner SE corner
    expect(result.pathDetails[3]![3]?.role).toBe('corner_inner_se');
    expect(result.pathDetails[3]![3]?.primaryTile).toBe('poke_path_dirt_corner_inner_se.png');
  });

  it('sanitizes 1-cell wide path slivers into 2-cell wide corridors', () => {
    // 8x8 grid with a single 1-cell wide vertical path line from y=2 to y=5 at x=3
    const grid: boolean[][] = Array.from({ length: 8 }, () => Array(8).fill(false));
    for (let y = 2; y <= 5; y++) {
      grid[y]![3] = true;
    }

    const sanitized = sanitizePathGridWidth(grid);

    // Should now be at least 2 cells wide at each row y=2..5
    for (let y = 2; y <= 5; y++) {
      const activeCount = sanitized[y]!.filter(Boolean).length;
      expect(activeCount).toBeGreaterThanOrEqual(2);
    }
  });
});
