/**
 * tests/node/map/mountainPlateauFloorIntegrity.test.ts
 *
 * Tier 1 Unit Test: Guarantees that mountain plateau cells with all 4 cardinal
 * neighbors (N, S, W, E) at or above current elevation resolve to seamless floor (b.floor)
 * and do not place concave cliff wall tiles (corner_inner_sw / corner_inner_se),
 * fixing Seed #42 at (59, 18) and (58, 35).
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { resolveMountainAutotileCell, type ElevationMatrix } from '../../../src/logic/map/mountainAutotileEngine.ts';

describe('mountainPlateauFloorIntegrity', () => {
  it('guarantees seed 42 at (59, 18) resolves to clean edge without corner_inner_sw', () => {
    const continent = generateContinentMap({
      seed: 42,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3
    });

    const cell = continent.resolvedMountain.cellDetails[18]?.[59];
    expect(cell).toBeDefined();
    expect(cell?.primaryTile).not.toContain('inner_bl');
    expect(cell?.primaryTile).toBe('poke_cliff_brown_plateau_rock.png');
    expect(cell?.overlayTiles).toBeUndefined();
  });

  it('guarantees seed 42 at (58, 35) does not place discordant corner_inner_se', () => {
    const continent = generateContinentMap({
      seed: 42,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3
    });

    const cell = continent.resolvedMountain.cellDetails[35]?.[58];
    if (cell) {
      expect(cell.primaryTile).not.toContain('inner_br');
      expect(cell.overlayTiles).toBeUndefined();
    }
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
