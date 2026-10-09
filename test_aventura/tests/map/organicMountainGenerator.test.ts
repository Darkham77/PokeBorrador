/**
 * tests/node/map/organicMountainGenerator.test.ts
 *
 * TIER 1 & TIER 2 UNIT TESTS FOR ORGANIC PROCEDURAL MOUNTAIN GENERATOR
 *
 * Validates:
 *   1. Organic Simplex FBM heightmap synthesis with perimeter falloff
 *   2. Strict adherence to Structural Constraints after sanitization
 *   3. Intelligent South cliff candidate detection for functional stairs
 *   4. Full procedural mountain generation connecting Tier 0, 1, and 2
 */

import { describe, it, expect } from 'vitest';
import {
  generateOrganicHeightmap,
  generateOrganicMountainMap
} from '../../../src/logic/map/organicMountainGenerator.ts';
import { validateHeightmapConstraints } from '../../../src/logic/map/heightmapConstraints.ts';

describe('organicMountainGenerator', () => {
  describe('generateOrganicHeightmap', () => {
    it('generates a matrix of specified dimensions with valid elevation tiers (0, 1, 2)', () => {
      const W = 32;
      const H = 32;
      const matrix = generateOrganicHeightmap(W, H, { seed: 12345 });

      expect(matrix.length).toBe(H);
      expect(matrix[0]?.length).toBe(W);

      const uniqueValues = new Set<number>();
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const val = matrix[y]![x]!;
          uniqueValues.add(val);
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(2);
        }
      }

      // Must have generated both terrain and elevated plateaus
      expect(uniqueValues.has(0)).toBe(true);
      expect(uniqueValues.has(1)).toBe(true);
    });

    it('enforces perimeter falloff keeping boundary cells at elevation 0', () => {
      const W = 28;
      const H = 28;
      const matrix = generateOrganicHeightmap(W, H, { seed: 99 });

      // Outer border (x=0, x=W-1, y=0, y=H-1) must be 0
      for (let x = 0; x < W; x++) {
        expect(matrix[0]![x]).toBe(0);
        expect(matrix[H - 1]![x]).toBe(0);
      }
      for (let y = 0; y < H; y++) {
        expect(matrix[y]![0]).toBe(0);
        expect(matrix[y]![W - 1]).toBe(0);
      }
    });
  });

  describe('generateOrganicMountainMap', () => {
    it('produces a fully sanitized, constraint-compliant procedural mountain map with functional stairs', () => {
      const W = 32;
      const H = 32;
      const result = generateOrganicMountainMap({
        width: W,
        height: H,
        seed: 42,
        withStairs: true,
        maxStairsPerTier: 2
      });

      expect(result.width).toBe(W);
      expect(result.height).toBe(H);

      // 1. Structural constraints must be 100% satisfied (0 violations)
      const violations = validateHeightmapConstraints(result.sanitizedHeightmap);
      expect(violations).toHaveLength(0);

      // 2. Stairs must have been placed connecting tiers
      expect(result.placedStairs.length).toBeGreaterThan(0);

      // 3. For each placed stair:
      for (const stair of result.placedStairs) {
        const { x, y } = stair;
        const cellL = result.autotileResult.cellDetails[y]?.[x];
        const cellR = result.autotileResult.cellDetails[y]?.[x + 1];

        expect(cellL?.role).toBe('stairs_l');
        expect(cellR?.role).toBe('stairs_r');

        // Foot cells on lower tier must NOT be blocked
        expect(result.autotileResult.occupiedFootCells[y + 1]?.[x]).toBe(false);
        expect(result.autotileResult.occupiedFootCells[y + 1]?.[x + 1]).toBe(false);
      }
    });

    it('supports manual stair placement', () => {
      const W = 30;
      const H = 30;

      // First generate to find a known stair candidate
      const autoRes = generateOrganicMountainMap({ width: W, height: H, seed: 100 });
      if (autoRes.placedStairs.length > 0) {
        const targetStair = autoRes.placedStairs[0]!;
        const manualRes = generateOrganicMountainMap({
          width: W,
          height: H,
          seed: 100,
          manualStairs: [targetStair]
        });

        expect(manualRes.placedStairs).toEqual([targetStair]);
        expect(manualRes.autotileResult.cellDetails[targetStair.y]?.[targetStair.x]?.role).toBe('stairs_l');
      }
    });
  });
});
