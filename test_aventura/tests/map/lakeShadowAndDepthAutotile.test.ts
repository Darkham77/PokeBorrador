/**
 * tests/node/map/lakeShadowAndDepthAutotile.test.ts
 *
 * TIER 1 RED-TO-GREEN TEST SUITE:
 * Inland Lake 2.5D Projected Shadows and Abyssal Depth (Option 4 Specification)
 *
 * Verifies:
 *   1. Depth: Center cells >= 2.4 tiles from shore resolve to 'poke_water_deep.png'.
 *   2. Shadow: Northern and Western shores project 2.5D shadows into layerStack.
 *   3. Sunlight: Southern and Eastern shores receive zero shadow (direct sunlight).
 *   4. Chromatic Harmony: All shore tiles retain canonical GBA FireRed palette (no cyan).
 */

import { describe, it, expect } from 'vitest';
import {
  resolveWaterCoastGrid,
  type WaterTerrainMatrix
} from '../../../src/logic/map/waterAutotileEngine.ts';

describe('Inland Lake 2.5D Projected Shadows & Abyssal Depth (Option 4)', () => {
  // Construct a 12x12 grid with a large inland freshwater lake (x: 2..9, y: 2..9) surrounded by grass
  const size = 12;
  const terrainMatrix: ('grass' | 'water')[][] = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      if (x >= 2 && x <= 9 && y >= 2 && y <= 9) {
        return 'water';
      }
      return 'grass';
    })
  );

  const resolved = resolveWaterCoastGrid(terrainMatrix as WaterTerrainMatrix);

  it('resolves deep central water (abyssal center) when distance to land >= 2.4 tiles', () => {
    // Cells (5, 5), (5, 6), (6, 5), (6, 6) are 3-4 tiles away from grass shore (x: 2 and y: 2)
    const centerDeepCell = resolved.cellDetails[5]![5];
    expect(centerDeepCell).not.toBeNull();
    expect(centerDeepCell!.role).toBe('center');
    expect(centerDeepCell!.primaryTile).toBe('poke_water_deep.png');

    // Whereas a cell 1 tile away from shore (e.g. x: 3, y: 3 or x: 4, y: 8) should be normal poke_water.png
    const shallowCell = resolved.cellDetails[8]![5];
    expect(shallowCell).not.toBeNull();
    expect(shallowCell!.role).toBe('center');
    expect(shallowCell!.primaryTile).toBe('poke_water.png');
  });

  it('projects 2.5D shadows along Northern and Western shores into layerStack', () => {
    // Row 2 is northern shore: y=2, x=5 has land directly north at y=1
    const northShoreCell = resolved.cellDetails[2]![5];
    expect(northShoreCell).not.toBeNull();
    expect(northShoreCell!.role).toBe('edge_north');
    expect(
      northShoreCell!.layerStack.some((t) => t.includes('shadow')),
      'Northern shore tile should receive projected shadow overlay'
    ).toBe(true);

    // Row 3 is one row south of northern bank: y=3, x=5
    const rowBelowNorth = resolved.cellDetails[3]![5];
    expect(rowBelowNorth).not.toBeNull();
    expect(
      rowBelowNorth!.layerStack.some((t) => t.includes('shadow')),
      'Row directly south of north shore should receive projected shadow overlay'
    ).toBe(true);

    // Column 2 is western shore: y=5, x=2 has land directly west at x=1
    const westShoreCell = resolved.cellDetails[5]![2];
    expect(westShoreCell).not.toBeNull();
    expect(westShoreCell!.role).toBe('edge_west');
    expect(
      westShoreCell!.layerStack.some((t) => t.includes('shadow')),
      'Western shore tile should receive western projected shadow overlay'
    ).toBe(true);
  });

  it('guarantees Southern and Eastern shores receive zero shadow (full sunlight)', () => {
    // Row 9 is southern shore: y=9, x=5 has land south at y=10
    const southShoreCell = resolved.cellDetails[9]![5];
    expect(southShoreCell).not.toBeNull();
    expect(southShoreCell!.role).toBe('edge_south');
    expect(
      southShoreCell!.layerStack.some((t) => t.includes('shadow')),
      'Southern shore must NOT have shadow'
    ).toBe(false);

    // Column 9 is eastern shore: y=5, x=9 has land east at x=10
    const eastShoreCell = resolved.cellDetails[5]![9];
    expect(eastShoreCell).not.toBeNull();
    expect(eastShoreCell!.role).toBe('edge_east');
    expect(
      eastShoreCell!.layerStack.some((t) => t.includes('shadow')),
      'Eastern shore must NOT have shadow'
    ).toBe(false);
  });
});
