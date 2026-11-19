/**
 * tests/node/map/mountainDiagonalStepAndCaveIntegrity.test.ts
 *
 * TIER 1 RED-TO-GREEN SPECIFICATION:
 * Tests that mountain cliff edges are strictly rectilinear without single-cell
 * diagonal steps or notches, and that cave entrances require continuous south cliff walls.
 */

import { describe, it, expect } from 'vitest';

import { generateContinentMap } from '../../logic/map/continentGenerator.ts';
import { resolveMountainAutotileCell } from '../../logic/map/mountainAutotileEngine.ts';
import { placeRegionalPOIs } from '../../logic/map/poiPlacementEngine.ts';

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
    const continent = generateContinentMap({
      seed: 42,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3
    });
    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });
    const res = { continent, pois };

    const m = res.continent.heightmap;
    const cd = res.continent.resolvedMountain.cellDetails;

    // Every straight vertical east/west wall must resolve to matching palette tile with zero conflicting corner feet
    let eastCount = 0;
    let westCount = 0;
    for (let y = 1; y < continent.height - 1; y++) {
      for (let x = 1; x < continent.width - 1; x++) {
        const cell = cd[y]?.[x];
        if (!cell) continue;
        const isBrown = cell.primaryTile.includes('_brown_');
        if (cell.role === 'edge_east') {
          expect(cell.primaryTile).toBe(
            isBrown ? 'poke_cliff_brown_rock_right.png' : 'poke_cliff_gray_rock_right.png'
          );
          const aboveEastProj = cd[y - 1]?.[x + 1]?.projectedFoot;
          const aboveOccupies =
            aboveEastProj && aboveEastProj.targetX === x + 1 && aboveEastProj.targetY === y;
          if ((m[y]?.[x + 1] ?? 0) === 0 && !aboveOccupies) {
            expect(res.continent.resolvedMountain.occupiedFootCells[y]?.[x + 1]).toBe(false);
          }
          eastCount++;
        } else if (cell.role === 'edge_west') {
          expect(cell.primaryTile).toBe(
            isBrown ? 'poke_cliff_brown_rock_left.png' : 'poke_cliff_gray_rock_left.png'
          );
          const aboveWestProj = cd[y - 1]?.[x - 1]?.projectedFoot;
          const aboveOccupies =
            aboveWestProj && aboveWestProj.targetX === x - 1 && aboveWestProj.targetY === y;
          if ((m[y]?.[x - 1] ?? 0) === 0 && !aboveOccupies) {
            expect(res.continent.resolvedMountain.occupiedFootCells[y]?.[x - 1]).toBe(false);
          }
          westCount++;
        }
      }
    }
    expect(eastCount).toBeGreaterThan(0);
    expect(westCount).toBeGreaterThan(0);

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
