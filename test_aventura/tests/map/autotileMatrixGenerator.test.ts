import { describe, it, expect } from 'vitest';
import {
  CANONICAL_47_BITMASKS,
  bitmaskTo3x3Grid,
  grid3x3ToBitmask,
  resolveCanonicalPatch
} from '../../logic/map/autotileMatrixGenerator.ts';
import { AUTOTILE_ENGINE_IDS } from '../../types/map/autotileStudioTypes.ts';

describe('autotileMatrixGenerator', () => {
  it('defines exactly 47 canonical bitmask cases without duplicates', () => {
    expect(CANONICAL_47_BITMASKS.length).toBe(47);

    const masks = CANONICAL_47_BITMASKS.map((c) => c.bitmask);
    const uniqueMasks = new Set(masks);
    expect(uniqueMasks.size).toBe(47);
  });

  it('correctly maps between bitmasks and 3x3 boolean grids', () => {
    for (const caseItem of CANONICAL_47_BITMASKS) {
      const grid = bitmaskTo3x3Grid(caseItem.bitmask);
      expect(grid.length).toBe(3);
      expect(grid[0]?.length).toBe(3);
      expect(grid[1]?.[1]).toBe(true); // Center is always true

      const reconstructedMask = grid3x3ToBitmask(grid);
      expect(reconstructedMask).toBe(caseItem.bitmask);
    }
  });

  for (const engineId of AUTOTILE_ENGINE_IDS) {
    it(`resolves all 47 canonical patches cleanly for ${engineId} engine`, () => {
      for (const caseItem of CANONICAL_47_BITMASKS) {
        const patch = resolveCanonicalPatch(caseItem, engineId);

        expect(patch.engineId).toBe(engineId);
        expect(patch.bitmaskCase).toBe(caseItem);
        expect(patch.cells.length).toBe(3);

        const centerCell = patch.cells[1]![1]!;
        expect(centerCell.isCenter).toBe(true);
        expect(centerCell.filename).toMatch(/\.png$/);
        expect(centerCell.layerStack.length).toBeGreaterThan(0);
        expect(centerCell.roleName?.length).toBeGreaterThan(0);

        // Center patch properties mirror center cell
        expect(patch.centerRole).toBe(centerCell.roleName);
        expect(patch.centerTile).toBe(centerCell.filename);
        expect(patch.centerLayerStack).toEqual(centerCell.layerStack);
      }
    });
  }

  it('evaluates boundary edge cases for 3x3 grids', () => {
    // Isolated center tile (no neighbors)
    const isolatedGrid = [
      [false, false, false],
      [false, true, false],
      [false, false, false]
    ];
    expect(grid3x3ToBitmask(isolatedGrid)).toBe(0);

    // Completely surrounded center tile (all 8 neighbors present)
    const fullGrid = [
      [true, true, true],
      [true, true, true],
      [true, true, true]
    ];
    expect(grid3x3ToBitmask(fullGrid)).toBe(255);
  });
});
