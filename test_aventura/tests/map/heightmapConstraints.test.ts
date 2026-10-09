/**
 * tests/node/map/heightmapConstraints.test.ts
 *
 * TIER 1 UNIT TESTS FOR HEIGHTMAP CONSTRAINTS
 * Validates Footprint Rule (>= 6x6 & >= 3x3 walkable core),
 * Terrace Buffer Rule (>= 3 cells between south drops),
 * and Multi-Tier Cliff Merging (Z=2 directly to Z=0).
 */

import { describe, it, expect } from 'vitest';
import {
  validateHeightmapConstraints,
  sanitizeHeightmapMatrix,
  fillHeightmapHoles,
  rectifyHeightmap
} from '../../../src/logic/map/heightmapConstraints.ts';

describe('heightmapConstraints', () => {
  describe('Rule 1: Footprint & Walkable Core Constraints', () => {
    it('detects a plateau that is too small (< 6x6 footprint)', () => {
      // 4x4 plateau on a 10x10 map
      const smallPlateau = Array.from({ length: 10 }, () => Array(10).fill(0));
      for (let y = 3; y <= 6; y++) {
        for (let x = 3; x <= 6; x++) {
          smallPlateau[y]![x] = 1;
        }
      }

      const violations = validateHeightmapConstraints(smallPlateau);
      expect(violations.some(v => v.type === 'footprint_too_small')).toBe(true);
    });

    it('detects a 6x6 plateau that lacks a 3x3 contiguous walkable core', () => {
      // A hollow 6x6 ring has a 6x6 footprint, but no 3x3 interior core
      const hollowRing = Array.from({ length: 10 }, () => Array(10).fill(0));
      for (let y = 2; y <= 7; y++) {
        for (let x = 2; x <= 7; x++) {
          // Leave center 2x2 as 0
          if (y >= 4 && y <= 5 && x >= 4 && x <= 5) {
            hollowRing[y]![x] = 0;
          } else {
            hollowRing[y]![x] = 1;
          }
        }
      }

      const violations = validateHeightmapConstraints(hollowRing);
      expect(violations.some(v => v.type === 'insufficient_walkable_core')).toBe(true);
    });

    it('passes a solid 7x7 plateau with a valid 3x3 walkable core', () => {
      // 7x7 plateau: interior cells x in [3..5], y in [3..5] form a 3x3 core!
      const validPlateau = Array.from({ length: 12 }, () => Array(12).fill(0));
      for (let y = 2; y <= 8; y++) {
        for (let x = 2; x <= 8; x++) {
          validPlateau[y]![x] = 1;
        }
      }

      const violations = validateHeightmapConstraints(validPlateau);
      expect(violations.filter(v => v.type === 'footprint_too_small' || v.type === 'insufficient_walkable_core')).toHaveLength(0);
    });
  });

  describe('Rule 2: Terrace Buffer Constraints', () => {
    it('detects stacked walls when distance between upper foot and lower top is < 3 cells', () => {
      // In column 5:
      // Tier 2 drops to Tier 1 at row 4 (foot at row 5)
      // Tier 1 drops to Tier 0 at row 6 (buffer = 6 - 5 = 1 cell! Stacked wall!)
      const stackedGrid = Array.from({ length: 14 }, () => Array(12).fill(0));
      // Base Tier 1: y=2..6, x=2..9
      for (let y = 2; y <= 6; y++) {
        for (let x = 2; x <= 9; x++) {
          stackedGrid[y]![x] = 1;
        }
      }
      // Tier 2: y=2..4, x=3..8
      for (let y = 2; y <= 4; y++) {
        for (let x = 3; x <= 8; x++) {
          stackedGrid[y]![x] = 2;
        }
      }

      const violations = validateHeightmapConstraints(stackedGrid);
      const bufferViolations = violations.filter(v => v.type === 'terrace_buffer_too_small');
      expect(bufferViolations.length).toBeGreaterThan(0);
      expect(bufferViolations[0]?.bufferFound).toBe(1);
    });

    it('passes when terrace buffer is >= 3 cells of walkable floor', () => {
      // Upper tier foot at row 6, lower tier top at row 10 (buffer = 10 - 6 = 4 cells >= 3!)
      const spaciousGrid = Array.from({ length: 16 }, () => Array(16).fill(0));
      // Tier 1: y=1..12, x=1..14 (12x14 >= 6x6)
      for (let y = 1; y <= 12; y++) {
        for (let x = 1; x <= 14; x++) {
          spaciousGrid[y]![x] = 1;
        }
      }
      // Tier 2: y=2..5, x=3..10 (4x8... wait, height is 4, so let's make it 6x8)
      for (let y = 2; y <= 7; y++) {
        for (let x = 3; x <= 10; x++) {
          spaciousGrid[y]![x] = 2;
        }
      }
      // Upper drop at row 7 (foot at row 8). Lower drop at row 12. Buffer = 12 - 8 = 4 cells!

      const violations = validateHeightmapConstraints(spaciousGrid);
      const bufferViolations = violations.filter(v => v.type === 'terrace_buffer_too_small');
      expect(bufferViolations).toHaveLength(0);
    });
  });

  describe('Rule 3: Multi-tier Cliffs & Sanitization', () => {
    it('sanitizes a cramped matrix by demoting small slivers and merging cramped terraces into double-height cliffs', () => {
      // 10x10 matrix with a small 3x3 Tier 2 sliver
      const cramped = Array.from({ length: 12 }, () => Array(12).fill(0));
      for (let y = 2; y <= 9; y++) {
        for (let x = 2; x <= 9; x++) {
          cramped[y]![x] = 1;
        }
      }
      // 3x3 sliver at center
      for (let y = 4; y <= 6; y++) {
        for (let x = 4; x <= 6; x++) {
          cramped[y]![x] = 2;
        }
      }

      // Small sliver should be demoted to 1
      const sanitized = sanitizeHeightmapMatrix(cramped);
      const violations = validateHeightmapConstraints(sanitized);
      expect(violations.filter(v => v.type === 'footprint_too_small')).toHaveLength(0);
    });
  });

  describe('Topological Sinkhole Filling (fillHeightmapHoles)', () => {
    it('fills an interior 2x2 hole completely enclosed inside a mountain plateau', () => {
      // 8x8 map: solid 6x6 Tier 1 mountain with an interior 2x2 hole at center (x=3..4, y=3..4)
      const matrix = Array.from({ length: 8 }, () => Array(8).fill(0));
      for (let y = 1; y <= 6; y++) {
        for (let x = 1; x <= 6; x++) {
          matrix[y]![x] = 1;
        }
      }
      matrix[3]![3] = 0;
      matrix[3]![4] = 0;
      matrix[4]![3] = 0;
      matrix[4]![4] = 0;

      const changed = fillHeightmapHoles(matrix);
      expect(changed).toBe(true);

      // Hole cells must be elevated to 1
      expect(matrix[3]![3]).toBe(1);
      expect(matrix[3]![4]).toBe(1);
      expect(matrix[4]![3]).toBe(1);
      expect(matrix[4]![4]).toBe(1);
    });

    it('does not fill an open valley that connects to the map edge', () => {
      // 8x8 map with an open canyon reaching the north edge
      const matrix = Array.from({ length: 8 }, () => Array(8).fill(1));
      // Canyon down the middle connecting to row 0
      for (let y = 0; y <= 4; y++) {
        matrix[y]![3] = 0;
      }

      fillHeightmapHoles(matrix);
      // Canyon cells connecting to edge must remain 0
      expect(matrix[0]![3]).toBe(0);
      expect(matrix[4]![3]).toBe(0);
    });
  });

  describe('Orthogonal Rectification (rectifyHeightmap)', () => {
    it('fills 1-cell notches and eliminates 1-cell whiskers', () => {
      // 8x8 map with a 1-cell whisker sticking out at (4, 1) and a 1-cell notch at (4, 2)
      const matrix = Array.from({ length: 8 }, () => Array(8).fill(0));
      for (let y = 2; y <= 6; y++) {
        for (let x = 2; x <= 6; x++) {
          matrix[y]![x] = 1;
        }
      }
      // Whisker
      matrix[1]![4] = 1;
      // Notch
      matrix[2]![4] = 0;

      rectifyHeightmap(matrix);

      // Whisker at (4, 1) must be pruned to 0
      expect(matrix[1]![4]).toBe(0);
      // Notch at (4, 2) must be filled to 1
      expect(matrix[2]![4]).toBe(1);
    });

    it('enforces minimum horizontal south wall segment length >= 3', () => {
      // South wall with a 1-cell protrusion dropping south at (4, 4)
      const matrix = Array.from({ length: 8 }, () => Array(8).fill(0));
      for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 6; x++) {
          matrix[y]![x] = 1;
        }
      }
      // 1-cell tooth at (4, 4)
      matrix[4]![4] = 1;

      rectifyHeightmap(matrix);
      // 1-cell tooth must be demoted so south wall is not an isolated 1-tile face
      expect(matrix[4]![4]).toBe(0);
    });
  });
});

