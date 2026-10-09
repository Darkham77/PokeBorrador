/**
 * tests/unit/studio/assetAtlasGrid.spec.ts
 *
 * TIER 1 RED-TO-GREEN TEST: Asset Atlas Grid Snapping and Per-Sheet Layouts
 */

import { describe, it, expect } from 'vitest';
import { useAssetAtlas, MASTER_SHEETS } from '../../composables/studio/useAssetAtlas.ts';

describe('Asset Atlas Grid Layout & Snapping', () => {
  it('should define per-sheet grid configuration for all master sheets', () => {
    const tileset2 = MASTER_SHEETS.find((s) => s.id === 'firered_tileset_2');
    expect(tileset2).toBeDefined();
    expect(tileset2?.grid).toEqual({
      tileSize: 16,
      marginX: 1,
      marginY: 1,
      spacingX: 1,
      spacingY: 1
    });

    const pewter = MASTER_SHEETS.find((s) => s.id === 'firered_pewter_city');
    expect(pewter).toBeDefined();
    expect(pewter?.grid).toEqual({
      tileSize: 16,
      marginX: 8,
      marginY: 24,
      spacingX: 0,
      spacingY: 0
    });
  });

  it('should calculate correct stride and coordinates for 17px tileset_2 without cumulative drift', () => {
    const atlas = useAssetAtlas();
    atlas.selectSheet('firered_tileset_2');

    expect(atlas.currentGrid.value.marginX).toBe(1);
    expect(atlas.currentGrid.value.marginY).toBe(1);
    expect(atlas.currentGrid.value.spacingX).toBe(1);
    expect(atlas.currentGrid.value.spacingY).toBe(1);

    // Col 6, Row 2 (Red flowers) -> x = 1 + 6*17 = 103, y = 1 + 2*17 = 35
    const strideX = atlas.currentGrid.value.tileSize + atlas.currentGrid.value.spacingX;
    const strideY = atlas.currentGrid.value.tileSize + atlas.currentGrid.value.spacingY;

    const col = 6;
    const row = 2;
    const expectedX = atlas.currentGrid.value.marginX + col * strideX;
    const expectedY = atlas.currentGrid.value.marginY + row * strideY;

    expect(expectedX).toBe(103);
    expect(expectedY).toBe(35);
  });

  it('should calculate correct coordinates for Pewter City with 8px margin and 24px header', () => {
    const atlas = useAssetAtlas();
    atlas.selectSheet('firered_pewter_city');

    expect(atlas.currentGrid.value.marginX).toBe(8);
    expect(atlas.currentGrid.value.marginY).toBe(24);
    expect(atlas.currentGrid.value.spacingX).toBe(0);
    expect(atlas.currentGrid.value.spacingY).toBe(0);

    // Col 15, Row 17 (Cobblestone) -> x = 8 + 15*16 = 248, y = 24 + 17*16 = 296
    const strideX = atlas.currentGrid.value.tileSize + atlas.currentGrid.value.spacingX;
    const strideY = atlas.currentGrid.value.tileSize + atlas.currentGrid.value.spacingY;

    const col = 15;
    const row = 17;
    const expectedX = atlas.currentGrid.value.marginX + col * strideX;
    const expectedY = atlas.currentGrid.value.marginY + row * strideY;

    expect(expectedX).toBe(248);
    expect(expectedY).toBe(296);
  });
});
