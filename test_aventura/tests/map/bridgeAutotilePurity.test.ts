import { describe, it, expect } from 'vitest';
import {
  resolveCanonicalBridges,
  type TerrainCell
} from '../../logic/map/canonicalBridgeEngine.ts';

describe('Canonical Bridge Engine - Plank Direction & Shore Purity', () => {
  it('does NOT flip straight vertical bridge tiles to horizontal when touching sand/land shores', () => {
    // A 2-column wide vertical bridge spanning from y: 2 to y: 12 at x: 5..6
    // Shore on the west at x: 4 from y: 6..8 (sand shore adjacent to bridge)
    const H = 16;
    const W = 16;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid: TerrainCell[][] = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Vertical bridge from row 2 to 12 at cols 5 and 6
    for (let y = 2; y <= 12; y++) {
      bridgeGrid[y]![5] = true;
      bridgeGrid[y]![6] = true;
    }

    // Sand shore touching the left side of the bridge at rows 6..8, col 4
    for (let y = 6; y <= 8; y++) {
      terrainGrid[y]![4] = { terrain: 'sand' };
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid, {
      defaultBridgeStyle: 'golden_wood'
    });

    // In a continuous vertical bridge, all tiles must be vertical bridge tiles (vLeft, vRight, vMid).
    // It must NEVER use hTop, hBot, or hMid, which have vertical planks and horizontal railings!
    const horizontalPlankGlitches = blits.filter(
      (b) =>
        b.file.includes('h_mid') ||
        b.file.includes('h_top') ||
        b.file.includes('h_bot')
    );

    expect(
      horizontalPlankGlitches,
      'A straight vertical bridge must not contain horizontal bridge tiles (h_mid/h_top/h_bot) when touching a sand shore'
    ).toHaveLength(0);
  });

  it('does NOT flip straight horizontal bridge tiles to vertical when touching north/south shores', () => {
    const H = 16;
    const W = 16;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid: TerrainCell[][] = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Horizontal bridge spanning across cols 3 to 13 at rows 7 and 8
    for (let x = 3; x <= 13; x++) {
      bridgeGrid[7]![x] = true;
      bridgeGrid[8]![x] = true;
    }

    // Sand shore touching the top side of the bridge at row 6, cols 6..8
    for (let x = 6; x <= 8; x++) {
      terrainGrid[6]![x] = { terrain: 'sand' };
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid, {
      defaultBridgeStyle: 'golden_wood'
    });

    const verticalPlankGlitches = blits.filter(
      (b) =>
        b.file.includes('v_mid') ||
        b.file.includes('v_left') ||
        b.file.includes('v_right')
    );

    expect(
      verticalPlankGlitches,
      'A straight horizontal bridge must not contain vertical bridge tiles when touching a land shore'
    ).toHaveLength(0);
  });
});

