import { describe, it, expect } from 'vitest';
import { resolveRmxpSubtiles } from '../../logic/map/kantoTileEngine';

describe('RMXP Autotile Resolution Engine', () => {
  it('resolves an isolated single tile with 4 outer corners', () => {
    // 3x3 grid with only center cell having cellType 1
    const grid = [
      new Uint8Array([0, 0, 0]),
      new Uint8Array([0, 1, 0]),
      new Uint8Array([0, 0, 0])
    ];

    const subtiles = resolveRmxpSubtiles(grid, 1, 1, 1);

    // Outer TL: (0, 32)
    expect(subtiles.tl).toEqual({ sx: 0, sy: 32 });
    // Outer TR: (80, 32)
    expect(subtiles.tr).toEqual({ sx: 80, sy: 32 });
    // Outer BL: (0, 112)
    expect(subtiles.bl).toEqual({ sx: 0, sy: 112 });
    // Outer BR: (80, 112)
    expect(subtiles.br).toEqual({ sx: 80, sy: 112 });
  });

  it('resolves a fully surrounded center tile with 4 center subtiles', () => {
    // 3x3 grid completely filled with 1
    const grid = [
      new Uint8Array([1, 1, 1]),
      new Uint8Array([1, 1, 1]),
      new Uint8Array([1, 1, 1])
    ];

    const subtiles = resolveRmxpSubtiles(grid, 1, 1, 1);

    // Center TL: (32, 64)
    expect(subtiles.tl).toEqual({ sx: 32, sy: 64 });
    // Center TR: (48, 64)
    expect(subtiles.tr).toEqual({ sx: 48, sy: 64 });
    // Center BL: (32, 80)
    expect(subtiles.bl).toEqual({ sx: 32, sy: 80 });
    // Center BR: (48, 80)
    expect(subtiles.br).toEqual({ sx: 48, sy: 80 });
  });

  it('resolves inner corner when orthogonal neighbors match but diagonal does not', () => {
    // Top-left diagonal missing (NW is 0), others are 1
    const grid = [
      new Uint8Array([0, 1, 1]),
      new Uint8Array([1, 1, 1]),
      new Uint8Array([1, 1, 1])
    ];

    const subtiles = resolveRmxpSubtiles(grid, 1, 1, 1);

    // TL must be inner corner: (32, 0)
    expect(subtiles.tl).toEqual({ sx: 32, sy: 0 });
    // Other quadrants have their diagonals present, so they should be center
    expect(subtiles.tr).toEqual({ sx: 48, sy: 64 });
    expect(subtiles.bl).toEqual({ sx: 32, sy: 80 });
    expect(subtiles.br).toEqual({ sx: 48, sy: 80 });
  });

  it('resolves straight vertical and horizontal corridors correctly', () => {
    // Vertical column (N and S match, W and E do not)
    const grid = [
      new Uint8Array([0, 1, 0]),
      new Uint8Array([0, 1, 0]),
      new Uint8Array([0, 1, 0])
    ];

    const subtiles = resolveRmxpSubtiles(grid, 1, 1, 1);

    // Left edge on west, right edge on east
    expect(subtiles.tl).toEqual({ sx: 0, sy: 64 });
    expect(subtiles.tr).toEqual({ sx: 80, sy: 64 });
    expect(subtiles.bl).toEqual({ sx: 0, sy: 80 });
    expect(subtiles.br).toEqual({ sx: 80, sy: 80 });
  });
});
