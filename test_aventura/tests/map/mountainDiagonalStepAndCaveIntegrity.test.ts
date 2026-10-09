/**
 * tests/node/map/mountainDiagonalStepAndCaveIntegrity.test.ts
 *
 * TIER 1 RED-TO-GREEN SPECIFICATION:
 * Tests that mountain cliff edges are strictly rectilinear without single-cell
 * diagonal steps or notches, and that cave entrances require continuous south cliff walls.
 */

import { describe, it, expect } from 'vitest';
import { executeRegionalGenerationJob } from '../../../src/logic/map/continentGenerator.worker.ts';
import { resolveMountainAutotileCell } from '../../../src/logic/map/mountainAutotileEngine.ts';

describe('mountainDiagonalStepAndCaveIntegrity', () => {
  it('resolves vertical walls as authentic straight edges', () => {
    // 3x3 grid:
    // row 0: [1, 1, 1]
    // row 1: [0, 1, 1]  (center [1, 1] has N and S neighbors, west is open)
    // row 2: [0, 1, 1]
    const matrix = [
      [1, 1, 1],
      [0, 1, 1],
      [0, 1, 1]
    ];

    const cell = resolveMountainAutotileCell(matrix, 1, 1, 'gray');
    expect(cell.role).toBe('edge_west');
    expect(cell.primaryTile).toBe('poke_cliff_gray_rock_left.png');
  });

  it('guarantees seed 42 resolves all reported mountain cliff seams and cave entrance integrity', () => {
    const res = executeRegionalGenerationJob({
      seed: 42,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3,
      targetCount: 18,
      allowBridges: true
    });

    const m = res.continent.heightmap;
    const cd = res.continent.resolvedMountain.cellDetails;

    // Case 4 (58, 36): Straight continuous vertical east wall
    const c58_36 = cd[36]?.[58];
    if (c58_36) {
      expect(c58_36.role).toBe('edge_east');
      expect(c58_36.primaryTile).toBe('poke_cliff_brown_rock_right.png');
    }

    // Case 6 (64, 28): Straight continuous vertical east wall
    const c64_28 = cd[28]?.[64];
    expect(c64_28?.role).toBe('edge_east');
    expect(c64_28?.primaryTile).toBe('poke_cliff_brown_rock_right.png');

    // Case 14 (59, 19): Straight continuous vertical west wall
    const c59_19 = cd[19]?.[59];
    expect(c59_19?.role).toBe('edge_west');
    expect(c59_19?.primaryTile).toBe('poke_cliff_brown_rock_left.png');

    // Case 3 (86, 51) & Case 13 (58, 20): No cut corner feet projected onto ground adjacent to straight vertical walls
    expect(res.continent.resolvedMountain.occupiedFootCells[51]?.[86]).toBe(false);
    expect(res.continent.resolvedMountain.occupiedFootCells[20]?.[58]).toBe(false);

    // Case 5 (56, 30): No cave entrance should anchor on narrow ridge
    const caveAt56_30 = res.pois.find((p) => p.gridX === 56 && p.gridY === 30 && p.type === 'cave_entrance');
    expect(caveAt56_30).toBeUndefined();

    // All placed cave entrances must have solid backing wall (y-1 >= elev) and continuous south wall flanks
    const allCaves = res.pois.filter((p) => p.type === 'cave_entrance');
    for (const cave of allCaves) {
      const cy = cave.gridY;
      const cx = cave.gridX;
      const cElev = cave.elevation ?? 1;

      // Solid south wall flanks
      const leftRole = cd[cy]?.[cx - 1]?.role;
      const rightRole = cd[cy]?.[cx + 1]?.role;
      expect(leftRole).toBe('edge_south_top');
      expect(rightRole).toBe('edge_south_top');

      // Solid mountain behind
      expect(m[cy - 1]?.[cx]).toBeGreaterThanOrEqual(cElev);
    }
  });
});
