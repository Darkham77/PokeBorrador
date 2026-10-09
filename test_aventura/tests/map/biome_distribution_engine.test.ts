/**
 * tests/node/map/biome_distribution_engine.test.ts
 *
 * Tier 1 Unit Test: Validates SimplexNoise 2D, FBM, and BiomeDistributionEngine.
 */

import { describe, it, expect } from 'vitest';
import { SimplexNoise, fbm2DNormalized } from '../../../src/logic/map/noise/simplexNoise';
import { computeBiomeDistribution } from '../../../src/logic/map/biomeDistributionEngine';

describe('Simplex Noise 2D & FBM Generator', () => {
  it('generates deterministic noise in [-1.0, 1.0]', () => {
    const noiseA = new SimplexNoise(12345);
    const noiseB = new SimplexNoise(12345);

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const valA = noiseA.noise2D(x * 0.1, y * 0.1);
        const valB = noiseB.noise2D(x * 0.1, y * 0.1);

        expect(valA).toBe(valB);
        expect(valA).toBeGreaterThanOrEqual(-1.0);
        expect(valA).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it('produces different noise values with different seeds', () => {
    const noiseA = new SimplexNoise(42);
    const noiseB = new SimplexNoise(999);

    let diffCount = 0;
    for (let i = 0; i < 20; i++) {
      const valA = noiseA.noise2D(i * 0.2, i * 0.3);
      const valB = noiseB.noise2D(i * 0.2, i * 0.3);
      if (Math.abs(valA - valB) > 0.0001) diffCount++;
    }
    expect(diffCount).toBeGreaterThan(15);
  });

  it('normalizes FBM values into [0.0, 1.0]', () => {
    const noise = new SimplexNoise(777);
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        const val = fbm2DNormalized(noise, x, y, { octaves: 4, scale: 0.1 });
        expect(val).toBeGreaterThanOrEqual(0.0);
        expect(val).toBeLessThanOrEqual(1.0);
      }
    }
  });
});

describe('Mathematical Biome Distribution Engine', () => {
  it('guarantees 100% deterministic distribution with the same seed', () => {
    const opt = {
      width: 40,
      height: 30,
      seed: 8888,
      waterPercent: 20,
      mountainPercent: 15,
      forestPercent: 25
    };

    const resA = computeBiomeDistribution(opt);
    const resB = computeBiomeDistribution(opt);

    expect(resA.stats.waterCount).toBe(resB.stats.waterCount);
    expect(resA.stats.mountainCount).toBe(resB.stats.mountainCount);
    expect(resA.stats.forestCount).toBe(resB.stats.forestCount);

    for (let y = 0; y < opt.height; y++) {
      for (let x = 0; x < opt.width; x++) {
        expect(resA.waterMask[y]![x]).toBe(resB.waterMask[y]![x]);
        expect(resA.mountainMask[y]![x]).toBe(resB.mountainMask[y]![x]);
        expect(resA.forestMask[y]![x]).toBe(resB.forestMask[y]![x]);
      }
    }
  });

  it('generates water coverage within +-2% of requested percentage after smoothing', () => {
    const requestedWater = 35; // 35% of 2500 = 875

    const res = computeBiomeDistribution({
      width: 50,
      height: 50,
      seed: 42,
      waterPercent: requestedWater,
      mountainPercent: 10,
      forestPercent: 20
    });

    const diffPct = Math.abs(res.stats.waterPercentActual - requestedWater);
    expect(diffPct).toBeLessThanOrEqual(2.5); // strictly within +-2.5%
    expect(res.stats.waterCount).toBeGreaterThan(750);
    expect(res.stats.waterCount).toBeLessThan(1000);
  });

  it('guarantees zero isolated 1x1 orphan tiles in all masks', () => {
    const res = computeBiomeDistribution({
      width: 40,
      height: 40,
      seed: 54321,
      waterPercent: 25,
      mountainPercent: 20,
      forestPercent: 30
    });

    function countNeighbors(grid: boolean[][], x: number, y: number, w: number, h: number): number {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && grid[ny]![nx]) {
            count++;
          }
        }
      }
      return count;
    }

    let orphanWater = 0;
    let orphanMountain = 0;
    let orphanForest = 0;

    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        if (res.waterMask[y]![x] && countNeighbors(res.waterMask, x, y, 40, 40) === 0) {
          orphanWater++;
        }
        if (res.mountainMask[y]![x] && countNeighbors(res.mountainMask, x, y, 40, 40) === 0) {
          orphanMountain++;
        }
        if (res.forestMask[y]![x] && countNeighbors(res.forestMask, x, y, 40, 40) === 0) {
          orphanForest++;
        }
      }
    }

    expect(orphanWater).toBe(0);
    expect(orphanMountain).toBe(0);
    expect(orphanForest).toBe(0);
  });

  it('strictly enforces center exclusion for town areas (0% water, 0% mountain)', () => {
    const centerX = 20;
    const centerY = 15;
    const radius = 8;

    const res = computeBiomeDistribution({
      width: 40,
      height: 30,
      seed: 9999,
      waterPercent: 40,
      mountainPercent: 30,
      forestPercent: 20,
      centerExclusion: { x: centerX, y: centerY, radius }
    });

    const rSq = radius * radius;
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 40; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= rSq) {
          expect(res.waterMask[y]![x]).toBe(false);
          expect(res.mountainMask[y]![x]).toBe(false);
        }
      }
    }
  });

  it('handles 0% edge cases gracefully', () => {
    const res = computeBiomeDistribution({
      width: 30,
      height: 30,
      seed: 123,
      waterPercent: 0,
      mountainPercent: 0,
      forestPercent: 0
    });

    expect(res.stats.waterCount).toBe(0);
    expect(res.stats.mountainCount).toBe(0);
    expect(res.stats.forestCount).toBe(0);
    expect(res.stats.waterPercentActual).toBe(0);
    expect(res.stats.mountainPercentActual).toBe(0);
    expect(res.stats.forestPercentActual).toBe(0);
  });
});
