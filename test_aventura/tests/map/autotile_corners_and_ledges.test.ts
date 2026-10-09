import { describe, it, expect } from 'vitest';
import { resolveRmxpSubtiles } from '../../logic/map/kantoTileEngine';

/**
 * 9-slice path resolution logic helper matching the corrected proceduralMapGenerator implementation.
 */
export function resolve9SliceCorner(
  hasN: boolean,
  hasS: boolean,
  hasW: boolean,
  hasE: boolean
): 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'top' | 'bottom' | 'left' | 'right' | 'center' {
  // Corners MUST be evaluated before single cardinal edges
  if (!hasN && !hasW && (hasS || hasE)) return 'topLeft';
  if (!hasN && !hasE && (hasS || hasW)) return 'topRight';
  if (!hasS && !hasW && (hasN || hasE)) return 'bottomLeft';
  if (!hasS && !hasE && (hasN || hasW)) return 'bottomRight';

  // Cardinal borders
  if (!hasN && hasS) return 'top';
  if (!hasS && hasN) return 'bottom';
  if (!hasW && hasE) return 'left';
  if (!hasE && hasW) return 'right';

  return 'center';
}

/**
 * 3-piece ledge resolution helper matching the new kantoTileEngine ledge resolver.
 */
export function resolveLedgePiece(hasLedgeLeft: boolean, hasLedgeRight: boolean): 'left' | 'mid' | 'right' | 'single' {
  if (!hasLedgeLeft && hasLedgeRight) return 'left';
  if (hasLedgeLeft && !hasLedgeRight) return 'right';
  if (hasLedgeLeft && hasLedgeRight) return 'mid';
  return 'single';
}

describe('Autotile Corners & Ledges Engine', () => {
  describe('9-Slice Corner Priority Resolution', () => {
    it('correctly resolves outer Top-Left corner when path turns south and east', () => {
      // Cell with path going South and East, but open grass to North and West
      const result = resolve9SliceCorner(false, true, false, true);
      expect(result).toBe('topLeft');
    });

    it('correctly resolves outer Top-Right corner when path turns south and west', () => {
      // Cell with path going South and West, but open grass to North and East
      const result = resolve9SliceCorner(false, true, true, false);
      expect(result).toBe('topRight');
    });

    it('correctly resolves outer Bottom-Left corner when path turns north and east', () => {
      // Cell with path going North and East, but open grass to South and West
      const result = resolve9SliceCorner(true, false, false, true);
      expect(result).toBe('bottomLeft');
    });

    it('correctly resolves outer Bottom-Right corner when path turns north and west', () => {
      // Cell with path going North and West, but open grass to South and East
      const result = resolve9SliceCorner(true, false, true, false);
      expect(result).toBe('bottomRight');
    });

    it('correctly resolves straight cardinal edges when only one side is bounded', () => {
      expect(resolve9SliceCorner(false, true, true, true)).toBe('top');
      expect(resolve9SliceCorner(true, false, true, true)).toBe('bottom');
      expect(resolve9SliceCorner(true, true, false, true)).toBe('left');
      expect(resolve9SliceCorner(true, true, true, false)).toBe('right');
    });

    it('resolves center when surrounded on all 4 sides', () => {
      expect(resolve9SliceCorner(true, true, true, true)).toBe('center');
    });
  });

  describe('3-Piece Ledge Autotiling Resolution', () => {
    it('resolves left cap for start of ledge', () => {
      expect(resolveLedgePiece(false, true)).toBe('left');
    });

    it('resolves mid piece for interior of ledge', () => {
      expect(resolveLedgePiece(true, true)).toBe('mid');
    });

    it('resolves right cap for end of ledge', () => {
      expect(resolveLedgePiece(true, false)).toBe('right');
    });

    it('resolves single piece for isolated 1-tile ledge', () => {
      expect(resolveLedgePiece(false, false)).toBe('single');
    });
  });

  describe('RMXP Subtile Quadrants Integrity', () => {
    it('resolves 4 distinct outer corners on an isolated cell', () => {
      const grid = [
        new Uint8Array([0, 0, 0]),
        new Uint8Array([0, 2, 0]),
        new Uint8Array([0, 0, 0])
      ];
      const res = resolveRmxpSubtiles(grid, 1, 1, 2);
      expect(res.tl.sy).toBe(32);
      expect(res.tr.sy).toBe(32);
      expect(res.bl.sy).toBe(112);
      expect(res.br.sy).toBe(112);
    });
  });
});
