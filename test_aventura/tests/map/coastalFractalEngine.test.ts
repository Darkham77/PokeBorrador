/**
 * tests/node/map/coastalFractalEngine.test.ts
 *
 * TIER 1 TESTS FOR COASTAL FRACTAL ENGINE
 */

import { describe, it, expect } from 'vitest';
import {
  sculptOrganicIsland,
  sculptArchipelagoChain,
  applyNaturalBeaches,
  sampleCoastalDisplacement
} from '../../../src/logic/map/continent/coastalFractalEngine.ts';
import { SimplexNoise } from '../../../src/logic/map/noise/simplexNoise.ts';
import type { WaterTerrainKind } from '../../../src/logic/map/waterAutotileEngine.ts';

describe('coastalFractalEngine', () => {
  it('samples coastal displacement smoothly with Simplex FBM', () => {
    const noise = new SimplexNoise(42);
    const d1 = sampleCoastalDisplacement(noise, 50, 50);
    const d2 = sampleCoastalDisplacement(noise, 51, 50);
    expect(typeof d1).toBe('number');
    expect(Math.abs(d1 - d2)).toBeLessThan(2.0); // Smooth continuous gradient
  });

  it('sculpts an organic island with non-circular perimeter', () => {
    const W = 64;
    const H = 64;
    const matrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('water'));

    sculptOrganicIsland(matrix, 32, 32, { radiusX: 12, radiusY: 10, roughness: 0.4 }, 151);

    // Verify center is grass
    expect(matrix[32]![32]).toBe('grass');

    // Count land cells
    let landCount = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (matrix[y]![x] === 'grass') landCount++;
      }
    }
    expect(landCount).toBeGreaterThan(150);
    expect(landCount).toBeLessThan(500);

    // Check radii along different angles to confirm non-circularity
    let rEast = 0;
    while (matrix[32]![32 + rEast] === 'grass') rEast++;
    let rNorth = 0;
    while (matrix[32 - rNorth]![32] === 'grass') rNorth++;

    expect(rEast).not.toBe(rNorth); // Elliptical & fractal modulation
  });

  it('sculpts an archipelago chain of multiple islets', () => {
    const W = 80;
    const H = 40;
    const matrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('water'));

    sculptArchipelagoChain(
      matrix,
      [
        { cx: 20, cy: 20, radius: 6 },
        { cx: 40, cy: 22, radius: 8 },
        { cx: 60, cy: 18, radius: 5 }
      ],
      777
    );

    expect(matrix[20]![20]).toBe('grass');
    expect(matrix[22]![40]).toBe('grass');
    expect(matrix[18]![60]).toBe('grass');
  });

  it('ensures no grass cell touches water directly after applyNaturalBeaches', () => {
    const W = 40;
    const H = 40;
    const matrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('water'));

    sculptOrganicIsland(matrix, 20, 20, { radiusX: 8, radiusY: 8 }, 42);
    applyNaturalBeaches(matrix);

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (matrix[y]![x] === 'grass') {
          expect(matrix[y - 1]![x]).not.toBe('water');
          expect(matrix[y + 1]![x]).not.toBe('water');
          expect(matrix[y]![x - 1]).not.toBe('water');
          expect(matrix[y]![x + 1]).not.toBe('water');
        }
      }
    }
  });
});
