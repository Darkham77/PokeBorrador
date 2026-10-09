import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { autoDetectGridLayout } from '../../scripts/map/universal_tileset_extractor';
import { CANONICAL_TILE_MANIFEST } from '../../scripts/map/canonical_tileset_manifest';
import { UniversalAutotiler, DynamicCatalogLoader } from '../../logic/map/kantoTileEngine';
import { CELL_BIOME } from '../../logic/map/kantoRegionalGenerator';

describe('Universal Tileset Extractor & Canonical Metatiles Integrity', () => {
  const rootDir = process.cwd();
  const rawSheet2 = path.resolve(rootDir, 'public/assets/raw/firered_leafgreen/firered_tileset_2.png');
  const tilesDir = path.resolve(rootDir, 'public/assets/tiles');

  it('correctly auto-detects the 17px grid layout on firered_tileset_2.png', async () => {
    expect(fs.existsSync(rawSheet2)).toBe(true);
    const layout = await autoDetectGridLayout(rawSheet2);
    expect(layout.tileSize).toBe(16);
    expect(layout.marginX).toBe(1);
    expect(layout.marginY).toBe(1);
    expect(layout.spacingX).toBe(1);
    expect(layout.spacingY).toBe(1);
    expect(layout.cols).toBe(28);
    expect(layout.rows).toBe(47);
  });

  it('verifies all declared canonical metatiles exist on disk at 32x32 px with alpha', async () => {
    expect(CANONICAL_TILE_MANIFEST.length).toBeGreaterThan(30);

    for (const def of CANONICAL_TILE_MANIFEST) {
      const filePath = path.join(tilesDir, def.category, def.filename);
      expect(fs.existsSync(filePath), `Missing tile: ${filePath}`).toBe(true);

      const meta = await sharp(filePath).metadata();
      const expectedW = (def.widthTiles ?? 1) * 32;
      const expectedH = (def.heightTiles ?? 1) * 32;
      expect(meta.width).toBe(expectedW);
      expect(meta.height).toBe(expectedH);
      expect(meta.hasAlpha).toBe(true);
    }
  });

  it('verifies that UniversalAutotiler resolves mountain tiles with 100% uniform palette and valid 2.5D edges', () => {
    const loader = new DynamicCatalogLoader();
    const autotiler = new UniversalAutotiler(loader);

    // Create synthetic 6x6 grid with a 4x4 mountain plateau in the center:
    // (x: 1..4, y: 1..4) is MOUNTAIN_DIRT, perimeter is GRASS
    const H = 6;
    const W = 6;
    const grid: Uint8Array[] = Array.from({ length: H }, () => new Uint8Array(W).fill(CELL_BIOME.GRASS));

    for (let y = 1; y <= 4; y++) {
      for (let x = 1; x <= 4; x++) {
        grid[y]![x] = CELL_BIOME.MOUNTAIN_DIRT;
      }
    }

    // Resolve palette for the massif
    const pal = autotiler.getMassifPalette(grid, 2, 2);
    expect(['brown', 'gray']).toContain(pal);

    // 1. Top-Left Outer Corner at (1, 1)
    const tl = autotiler.resolveMountainTile(grid, 1, 1);
    expect(tl.pal).toBe(pal);
    expect(tl.primaryImage).toBe(`poke_cliff_${pal}_corner_tl.png`);

    // 2. Top Rim at (2, 1) and (3, 1)
    const topTile = autotiler.resolveMountainTile(grid, 2, 1);
    expect(topTile.pal).toBe(pal);
    expect(topTile.primaryImage).toBe(`poke_cliff_${pal}_top.png`);

    // 3. Top-Right Outer Corner at (4, 1)
    const tr = autotiler.resolveMountainTile(grid, 4, 1);
    expect(tr.pal).toBe(pal);
    expect(tr.primaryImage).toBe(`poke_cliff_${pal}_corner_tr.png`);

    // 4. Left Edge at (1, 2)
    const leftTile = autotiler.resolveMountainTile(grid, 1, 2);
    expect(leftTile.pal).toBe(pal);
    expect(leftTile.primaryImage).toBe(`poke_cliff_${pal}_left.png`);

    // 5. Right Edge at (4, 2)
    const rightTile = autotiler.resolveMountainTile(grid, 4, 2);
    expect(rightTile.pal).toBe(pal);
    expect(rightTile.primaryImage).toBe(`poke_cliff_${pal}_right.png`);

    // 6. Bottom-Left Corner at (1, 4)
    const bl = autotiler.resolveMountainTile(grid, 1, 4);
    expect(bl.pal).toBe(pal);
    expect(bl.primaryImage).toBe(`poke_cliff_${pal}_corner_bl.png`);

    // 7. South Vertical Face at (2, 4)
    const face = autotiler.resolveMountainTile(grid, 2, 4);
    expect(face.pal).toBe(pal);
    expect(face.primaryImage).toBe(`poke_cliff_${pal}_face.png`);

    // 8. Bottom-Right Corner at (4, 4)
    const br = autotiler.resolveMountainTile(grid, 4, 4);
    expect(br.pal).toBe(pal);
    expect(br.primaryImage).toBe(`poke_cliff_${pal}_corner_br.png`);

    // 9. Interior Plateau Rock at (2, 2)
    const center = autotiler.resolveMountainTile(grid, 2, 2);
    expect(center.pal).toBe(pal);
    expect(center.primaryImage).toBe(`poke_cliff_${pal}_plateau.png`);
  });
});
