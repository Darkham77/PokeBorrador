import { describe, it, expect } from 'vitest';
import {
  calculateArchaeologyDifficulty,
  generateArchaeologyGrid,
  getDistanceToNearestFossil,
  type ArchaeologyTile
} from '@/components/modals/archaeologyGameHelper';

describe('archaeologyGameHelper', () => {
  describe('calculateArchaeologyDifficulty', () => {
    it('calculates rare difficulty tiers correctly', () => {
      expect(calculateArchaeologyDifficulty(10, 5)).toBe('easy');
      expect(calculateArchaeologyDifficulty(10, 20)).toBe('medium');
      expect(calculateArchaeologyDifficulty(10, 50)).toBe('hard');
      expect(calculateArchaeologyDifficulty(10, 80)).toBe('expert');
    });

    it('calculates normal difficulty tiers correctly', () => {
      expect(calculateArchaeologyDifficulty(50, 30)).toBe('easy');
      expect(calculateArchaeologyDifficulty(50, 50)).toBe('medium');
      expect(calculateArchaeologyDifficulty(50, 80)).toBe('hard');
      expect(calculateArchaeologyDifficulty(50, 95)).toBe('expert');
    });
  });

  describe('generateArchaeologyGrid', () => {
    it('generates grid with correct dimensions and fossil part count', () => {
      const grid = generateArchaeologyGrid(5, 3);
      expect(grid.length).toBe(25);
      const fossilCount = grid.filter(t => t.isFossil).length;
      expect(fossilCount).toBe(3);
    });

    it('generates contiguous fossil parts', () => {
      const grid = generateArchaeologyGrid(6, 4);
      const fossilTiles = grid.filter(t => t.isFossil);
      expect(fossilTiles.length).toBe(4);

      // Check that every fossil piece is adjacent to at least one other fossil piece
      for (const piece of fossilTiles) {
        const hasNeighbor = fossilTiles.some(
          other => other !== piece && Math.abs(other.r - piece.r) + Math.abs(other.c - piece.c) === 1
        );
        expect(hasNeighbor).toBe(true);
      }
    });
  });

  describe('getDistanceToNearestFossil', () => {
    it('calculates Manhattan distance to nearest undug fossil', () => {
      const sampleGrid: ArchaeologyTile[] = [
        { r: 0, c: 0, isFossil: true, isDug: false, clue: '' },
        { r: 2, c: 2, isFossil: true, isDug: true, clue: '' }, // already dug
        { r: 1, c: 1, isFossil: false, isDug: false, clue: '' }
      ];

      // Distance from (1, 0) to (0, 0) is 1
      expect(getDistanceToNearestFossil(sampleGrid, 1, 0)).toBe(1);
      // Distance from (2, 2) to (0, 0) is 4 (since (2,2) is already dug)
      expect(getDistanceToNearestFossil(sampleGrid, 2, 2)).toBe(4);
    });
  });
});
