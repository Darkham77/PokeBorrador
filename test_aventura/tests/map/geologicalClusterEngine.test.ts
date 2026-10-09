/**
 * tests/node/map/geologicalClusterEngine.test.ts
 *
 * UNIT TESTS FOR GEOLOGICAL CLUSTERER & MASSIF HOMOGENEITY ENGINE (PHASE 2)
 */

import { describe, it, expect } from 'vitest';
import { clusterMountainMassifs } from '../../../src/logic/map/geologicalClusterEngine.ts';
import { resolveMountainMapGrid } from '../../../src/logic/map/mountainAutotileEngine.ts';
import type { MacroBiome } from '../../../src/logic/map/macroBiomeSynthesizer.ts';

describe('geologicalClusterEngine', () => {
  const W = 32;
  const H = 32;

  function createEmptyElevation(): number[][] {
    return Array.from({ length: H }, () => Array(W).fill(0));
  }

  it('identifies discrete mountain massifs using 8-connected CCL', () => {
    const elev = createEmptyElevation();

    // Massif 1: West (Mt. Moon) from x: 2..6, y: 2..6
    for (let y = 2; y <= 6; y++) {
      for (let x = 2; x <= 6; x++) {
        elev[y]![x] = 1;
      }
    }

    // Massif 2: East (Cerulean Granite) from x: 20..25, y: 10..15
    for (let y = 10; y <= 15; y++) {
      for (let x = 20; x <= 25; x++) {
        elev[y]![x] = 1;
      }
    }

    const result = clusterMountainMassifs({
      elevationMatrix: elev
    });

    expect(result.massifs.length).toBe(2);

    const mWest = result.massifs.find((m) => m.centroidX < 16);
    const mEast = result.massifs.find((m) => m.centroidX >= 16);

    expect(mWest).toBeDefined();
    expect(mEast).toBeDefined();

    expect(mWest!.cellCount).toBe(25);
    expect(mEast!.cellCount).toBe(36);

    // Western massif gets brown, eastern massif gets gray
    expect(mWest!.palette).toBe('brown');
    expect(mEast!.palette).toBe('gray');
  });

  it('enforces the Single-Palette Invariant: 100% of cells in a massif have the exact same palette', () => {
    const elev = createEmptyElevation();

    // Complex organic L-shaped ridge
    for (let y = 3; y <= 12; y++) {
      elev[y]![4] = 1;
      elev[y]![5] = 2;
    }
    for (let x = 4; x <= 14; x++) {
      elev[12]![x] = 1;
    }

    const result = clusterMountainMassifs({
      elevationMatrix: elev
    });

    expect(result.massifs.length).toBe(1);
    const massif = result.massifs[0]!;

    // Verify every single cell in the massif matches massif.palette in paletteMatrix
    for (const cell of massif.cells) {
      expect(result.paletteMatrix[cell.y]![cell.x]).toBe(massif.palette);
    }
  });

  it('assigns volcanic palette when massif intersects volcanic_plateau macro biome', () => {
    const elev = createEmptyElevation();
    const macroGrid: MacroBiome[][] = Array.from({ length: H }, () =>
      Array<MacroBiome>(W).fill('temperate_meadow')
    );

    // Volcanic massif in South
    for (let y = 20; y <= 26; y++) {
      for (let x = 10; x <= 16; x++) {
        elev[y]![x] = 1;
        macroGrid[y]![x] = 'volcanic_plateau';
      }
    }

    const result = clusterMountainMassifs({
      elevationMatrix: elev,
      macroBiomeGrid: macroGrid
    });

    expect(result.massifs.length).toBe(1);
    expect(result.massifs[0]!.palette).toBe('volcanic');

    for (const cell of result.massifs[0]!.cells) {
      expect(result.paletteMatrix[cell.y]![cell.x]).toBe('volcanic');
    }
  });

  it('integrates seamlessly with resolveMountainMapGrid using paletteMatrix', () => {
    const elev = createEmptyElevation();

    // Massif 1: West
    for (let y = 2; y <= 8; y++) {
      for (let x = 2; x <= 8; x++) {
        elev[y]![x] = 1;
      }
    }
    // Massif 2: East
    for (let y = 2; y <= 8; y++) {
      for (let x = 20; x <= 26; x++) {
        elev[y]![x] = 1;
      }
    }

    const clusterResult = clusterMountainMassifs({
      elevationMatrix: elev
    });

    const mtnResult = resolveMountainMapGrid(elev, {
      paletteMatrix: clusterResult.paletteMatrix
    });

    // Verify cell primary tiles match palette brushes
    // West (brown): plateau rock brown
    const westTile = mtnResult.cellDetails[5]![5]!.primaryTile;
    expect(westTile).toContain('brown');

    // East (gray): plateau rock gray
    const eastTile = mtnResult.cellDetails[5]![23]!.primaryTile;
    expect(eastTile).toContain('gray');
  });
});
