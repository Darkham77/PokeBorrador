/**
 * tests/node/map/mountainPlateauFloorIntegrity.test.ts
 *
 * Tier 1 Unit Test: Guarantees that mountain plateau cells with all 4 cardinal
 * neighbors (N, S, W, E) at or above current elevation resolve to seamless floor (b.floor)
 * and do not place concave cliff wall tiles (corner_inner_sw / corner_inner_se),
 * fixing Seed #42 at (59, 18) and (58, 35).
 */

import { describe, it, expect } from 'vitest';

import { generateContinentMap } from '../../logic/map/continentGenerator.ts';
import {
  resolveMountainAutotileCell,
  type ElevationMatrix
} from '../../logic/map/mountainAutotileEngine.ts';

describe('mountainPlateauFloorIntegrity', () => {
  it('guarantees all cardinally enclosed plateau cells resolve cleanly without concave inner wall corners', () => {
    const continent = generateContinentMap({
      seed: 42,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3
    });

    let checkedCells = 0;
    for (let y = 1; y < continent.height - 1; y++) {
      for (let x = 1; x < continent.width - 1; x++) {
        const elev = continent.heightmap[y]?.[x] ?? 0;
        if (elev <= 0) continue;
        const enclosed =
          (continent.heightmap[y - 1]?.[x] ?? 0) >= elev &&
          (continent.heightmap[y + 1]?.[x] ?? 0) >= elev &&
          (continent.heightmap[y]?.[x - 1] ?? 0) >= elev &&
          (continent.heightmap[y]?.[x + 1] ?? 0) >= elev;
        if (!enclosed) continue;

        const cell = continent.resolvedMountain.cellDetails[y]?.[x];
        expect(cell).toBeDefined();
        expect(cell?.primaryTile).not.toContain('inner_bl');
        expect(cell?.primaryTile).not.toContain('inner_br');
        expect(cell?.primaryTile).toMatch(/^poke_cliff_(brown|gray)_plateau_rock\.png$/);
        expect(cell?.overlayTiles).toBeUndefined();
        checkedCells++;
      }
    }
    expect(checkedCells).toBeGreaterThan(0);
  });

  it('guarantees plateau cell surrounded by N, S, W, E at same elevation always renders floor even when diagonals drop', () => {
    // 3x3 grid with all 4 cardinal neighbors = 1, but SW and SE = 0
    const matrix: ElevationMatrix = [
      [1, 1, 1],
      [1, 1, 1],
      [0, 1, 0]
    ];

    const center = resolveMountainAutotileCell(matrix, 1, 1, 'brown', 'rock');
    expect(center.elevation).toBe(1);
    expect(center.primaryTile).toBe('poke_cliff_brown_plateau_rock.png');
    expect(center.overlayTiles).toBeUndefined();
  });
});
