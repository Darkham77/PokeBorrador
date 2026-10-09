/**
 * tests/node/map/in_browser_tile_processor.test.ts
 *
 * Unit tests for client-side universal tile and spritesheet processor:
 * - 16x16 slicing and border padding
 * - Discarding empty, chroma-key and solid color tiles
 * - SHA-256 deduplication and in-memory registry integration
 * - Compound structure synthesis and collision mask configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractTilePixels,
  isDiscardableTile,
  computeTileHash,
  encodeRgbaToPngDataUrl,
  processTilesetSheet,
  processCompoundStructure,
  type RawPixelGrid
} from '../../logic/map/inBrowserTileProcessor';
import { TilesRegistryService } from '../../logic/map/tilesRegistry';
import { getStructureTemplate } from '../../config/mapStructures';

describe('In-Browser Tile Processor Pipeline', () => {
  let testRegistry: TilesRegistryService;

  beforeEach(() => {
    testRegistry = new TilesRegistryService();
  });

  function createPatternGrid(width: number, height: number): RawPixelGrid {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = (x * 17) % 255;
        data[idx + 1] = (y * 23) % 255;
        data[idx + 2] = ((x + y) * 31) % 255;
        data[idx + 3] = 255;
      }
    }
    return { width, height, data };
  }

  it('correctly slices an image into 16x16 tiles with boundary padding', () => {
    // 24x20 grid -> ceil(24/16) = 2 cols, ceil(20/16) = 2 rows
    const grid = createPatternGrid(24, 20);

    // Tile at (0, 0) is fully inside
    const tile00 = extractTilePixels(grid, 0, 0);
    expect(tile00.length).toBe(16 * 16 * 4);
    // Upper-left pixel matches grid
    expect(tile00[0]).toBe(grid.data[0]);

    // Tile at (1, 1) has pixels outside grid width (24) and height (20)
    const tile11 = extractTilePixels(grid, 1, 1);
    expect(tile11.length).toBe(16 * 16 * 4);
    // Pixel (x=8, y=4) in tile corresponds to (16+8=24, 16+4=20) which is out of bounds -> transparent
    const outOfBoundsIdx = (4 * 16 + 8) * 4;
    expect(tile11[outOfBoundsIdx + 3]).toBe(0); // alpha = 0
  });

  it('accurately identifies and discards empty, chroma-key, and solid color tiles', () => {
    // 1. Transparent tile
    const transparentTile = new Uint8ClampedArray(16 * 16 * 4); // all 0
    expect(isDiscardableTile(transparentTile)).toBe(true);

    // 2. Magenta Chroma-key tile (GBA)
    const magentaTile = new Uint8ClampedArray(16 * 16 * 4);
    for (let i = 0; i < 256; i++) {
      magentaTile[i * 4] = 255;     // R
      magentaTile[i * 4 + 1] = 0;   // G
      magentaTile[i * 4 + 2] = 255; // B
      magentaTile[i * 4 + 3] = 255; // A
    }
    expect(isDiscardableTile(magentaTile)).toBe(true);

    // 3. Flat solid monochrome tile
    const solidBlue = new Uint8ClampedArray(16 * 16 * 4);
    for (let i = 0; i < 256; i++) {
      solidBlue[i * 4] = 20;
      solidBlue[i * 4 + 1] = 50;
      solidBlue[i * 4 + 2] = 180;
      solidBlue[i * 4 + 3] = 255;
    }
    expect(isDiscardableTile(solidBlue)).toBe(true);

    // 4. Valid patterned tile with variance
    const patternTile = new Uint8ClampedArray(16 * 16 * 4);
    for (let i = 0; i < 256; i++) {
      patternTile[i * 4] = i % 255;
      patternTile[i * 4 + 1] = (i * 2) % 255;
      patternTile[i * 4 + 2] = (i * 3) % 255;
      patternTile[i * 4 + 3] = 255;
    }
    expect(isDiscardableTile(patternTile)).toBe(false);
  });

  it('computes deterministic SHA-256 hashes and encodes valid PNG DataURLs', async () => {
    const sample = new Uint8ClampedArray(16 * 16 * 4);
    for (let i = 0; i < 256; i++) {
      sample[i * 4] = 40;
      sample[i * 4 + 1] = 160;
      sample[i * 4 + 2] = 60;
      sample[i * 4 + 3] = 255;
    }

    const hash1 = await computeTileHash(sample);
    const hash2 = await computeTileHash(sample);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(10);

    const dataUrl = encodeRgbaToPngDataUrl(sample, 16, 16);
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('processes a terrain tileset (Modo A) and deduplicates identical tiles', async () => {
    // 32x16 grid = 2 tiles side-by-side
    // Tile 0 and Tile 1 have identical patterned pixels
    const grid = createPatternGrid(32, 16);
    // Make tile 1 identical to tile 0
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const srcIdx = (y * 32 + x) * 4;
        const destIdx = (y * 32 + (x + 16)) * 4;
        grid.data[destIdx] = grid.data[srcIdx]!;
        grid.data[destIdx + 1] = grid.data[srcIdx + 1]!;
        grid.data[destIdx + 2] = grid.data[srcIdx + 2]!;
        grid.data[destIdx + 3] = grid.data[srcIdx + 3]!;
      }
    }

    const res = await processTilesetSheet(grid, {
      category: 'vegetation',
      registry: testRegistry,
      filterDiscardable: true
    });

    expect(res.totalSliced).toBe(2);
    expect(res.addedCount).toBe(1);
    expect(res.reusedCount).toBe(1);
    expect(res.tiles.length).toBe(2);
    expect(res.tiles[0]?.id).toBe(res.tiles[1]?.id);

    // Verify presence in registry
    const registered = testRegistry.getTileById(res.tiles[0]!.id);
    expect(registered).toBeDefined();
    expect(registered?.category).toBe('vegetation');
  });

  it('synthesizes a compound structure (Modo B) with custom collision mask', async () => {
    // 48x32 sprite = 3 cols x 2 rows = 6 tiles
    const sprite = createPatternGrid(48, 32);

    const customMask = [
      [1, 1, 1] as const,
      [1, 0, 1] as const // door in bottom-center
    ];

    const res = await processCompoundStructure(sprite, {
      id: 'kanto_gym_custom',
      name: 'Gimnasio Personalizado',
      theme: 'firered',
      collisionMask: customMask,
      registry: testRegistry
    });

    expect(res.footprint.width).toBe(3);
    expect(res.footprint.height).toBe(2);
    expect(res.template.id).toBe('kanto_gym_custom');
    expect(res.template.name).toBe('Gimnasio Personalizado');
    expect(res.template.tiles.length).toBe(2);
    expect(res.template.tiles[0]?.length).toBe(3);
    expect(res.template.collisionMask).toEqual(customMask);

    // Check that structure is registered in STRUCTURE_TEMPLATES
    const fetched = getStructureTemplate('kanto_gym_custom');
    expect(fetched).toBeDefined();
    expect(fetched?.footprint.width).toBe(3);
    expect(fetched?.footprint.height).toBe(2);
  });
});
