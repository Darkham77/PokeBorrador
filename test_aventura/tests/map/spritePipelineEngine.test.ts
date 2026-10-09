/**
 * tests/node/map/spritePipelineEngine.test.ts
 *
 * TIER 1 ISOLATED UNIT TEST: UNSUPERVISED SPRITE PIPELINE ENGINE
 * Verifies adaptive chroma-key background stripping, connected-component
 * bounding box extraction, and heuristic classification.
 */

import { describe, it, expect } from 'vitest';
import {
  stripBackground,
  sliceConnectedSprites,
  classifySprite,
  processSpriteSheet,
  type RawImageBuffer
} from '../../logic/map/continent/spritePipelineEngine';

describe('spritePipelineEngine', () => {
  /**
   * Helper to create a blank RGBA buffer
   */
  function createBuffer(width: number, height: number, fillColor: [number, number, number, number]): RawImageBuffer {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fillColor[0];
      data[i + 1] = fillColor[1];
      data[i + 2] = fillColor[2];
      data[i + 3] = fillColor[3];
    }
    return { width, height, data };
  }

  /**
   * Helper to draw a filled rectangle on a buffer
   */
  function drawRect(
    buf: RawImageBuffer,
    x: number,
    y: number,
    w: number,
    h: number,
    color: [number, number, number, number]
  ): void {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < buf.width && py >= 0 && py < buf.height) {
          const idx = (py * buf.width + px) * 4;
          buf.data[idx] = color[0];
          buf.data[idx + 1] = color[1];
          buf.data[idx + 2] = color[2];
          buf.data[idx + 3] = color[3];
        }
      }
    }
  }

  it('strips uniform solid color backgrounds via adaptive chroma-key', () => {
    // 64x64 buffer with magenta background (#FF00FF, alpha 255)
    const buf = createBuffer(64, 64, [255, 0, 255, 255]);
    // Draw a green sprite in the center (16x16)
    drawRect(buf, 20, 20, 16, 16, [34, 197, 94, 255]);

    const stripped = stripBackground(buf);

    // Corner pixel should now be transparent
    expect(stripped.data[3]).toBe(0);

    // Center pixel of the green rectangle should remain opaque green
    const centerIdx = (28 * 64 + 28) * 4;
    expect(stripped.data[centerIdx]).toBe(34);
    expect(stripped.data[centerIdx + 1]).toBe(197);
    expect(stripped.data[centerIdx + 2]).toBe(94);
    expect(stripped.data[centerIdx + 3]).toBe(255);
  });

  it('detects connected sprite components and computes tight bounding boxes', () => {
    // 100x100 transparent buffer
    const buf = createBuffer(100, 100, [0, 0, 0, 0]);

    // Sprite 1: 16x32 (Tree-like) at (10, 10)
    drawRect(buf, 10, 10, 16, 32, [34, 197, 94, 255]);

    // Sprite 2: 32x16 (Rock-like) at (60, 50)
    drawRect(buf, 60, 50, 32, 16, [120, 113, 108, 255]);

    const boxes = sliceConnectedSprites(buf);

    expect(boxes.length).toBe(2);

    const b1 = boxes.find((b) => b.minX === 10 && b.minY === 10);
    expect(b1).toBeDefined();
    expect(b1?.width).toBe(16);
    expect(b1?.height).toBe(32);

    const b2 = boxes.find((b) => b.minX === 60 && b.minY === 50);
    expect(b2).toBeDefined();
    expect(b2?.width).toBe(32);
    expect(b2?.height).toBe(16);
  });

  it('heuristically classifies sliced sprites by aspect ratio and dominant color palette', () => {
    // Tree: Tall green rectangle
    const treeBuf = createBuffer(32, 48, [0, 0, 0, 0]);
    drawRect(treeBuf, 0, 0, 32, 48, [34, 197, 94, 255]);
    const treeClass = classifySprite({ minX: 0, minY: 0, maxX: 31, maxY: 47, width: 32, height: 48 }, treeBuf);
    expect(treeClass.category).toBe('tree');
    expect(treeClass.biome).toBe('forest');

    // Mountain: Brown/Gray rectangle
    const mtnBuf = createBuffer(48, 48, [0, 0, 0, 0]);
    drawRect(mtnBuf, 0, 0, 48, 48, [120, 80, 50, 255]);
    const mtnClass = classifySprite({ minX: 0, minY: 0, maxX: 47, maxY: 47, width: 48, height: 48 }, mtnBuf);
    expect(mtnClass.category).toBe('mountain');
    expect(mtnClass.biome).toBe('mountain');

    // Snow: White/pale cyan rectangle
    const snowBuf = createBuffer(32, 32, [0, 0, 0, 0]);
    drawRect(snowBuf, 0, 0, 32, 32, [240, 248, 255, 255]);
    const snowClass = classifySprite({ minX: 0, minY: 0, maxX: 31, maxY: 31, width: 32, height: 32 }, snowBuf);
    expect(snowClass.category).toBe('snow');
    expect(snowClass.biome).toBe('snow');

    // Water: Deep blue rectangle
    const waterBuf = createBuffer(32, 32, [0, 0, 0, 0]);
    drawRect(waterBuf, 0, 0, 32, 32, [14, 116, 144, 255]);
    const waterClass = classifySprite({ minX: 0, minY: 0, maxX: 31, maxY: 31, width: 32, height: 32 }, waterBuf);
    expect(waterClass.category).toBe('water_edge');
    expect(waterClass.biome).toBe('ocean');

    // Building: Large structure (64x64)
    const bldBuf = createBuffer(64, 64, [0, 0, 0, 0]);
    drawRect(bldBuf, 0, 0, 64, 64, [220, 38, 38, 255]);
    const bldClass = classifySprite({ minX: 0, minY: 0, maxX: 63, maxY: 63, width: 64, height: 64 }, bldBuf);
    expect(bldClass.category).toBe('building');

    // Prop: Small red flower (16x16)
    const flowerBuf = createBuffer(16, 16, [0, 0, 0, 0]);
    drawRect(flowerBuf, 0, 0, 16, 16, [239, 68, 68, 255]);
    const flowerClass = classifySprite({ minX: 0, minY: 0, maxX: 15, maxY: 15, width: 16, height: 16 }, flowerBuf);
    expect(flowerClass.category).toBe('prop');
  });

  it('executes full unsupervised spritesheet processing pipeline end-to-end', () => {
    // 128x128 sheet with white background (#FFFFFF)
    const sheet = createBuffer(128, 128, [255, 255, 255, 255]);

    // Add a tree (24x40)
    drawRect(sheet, 10, 10, 24, 40, [22, 163, 74, 255]);

    // Add a small prop (16x16)
    drawRect(sheet, 80, 80, 16, 16, [234, 179, 8, 255]);

    const results = processSpriteSheet(sheet, { sourceName: 'test_sheet' });

    expect(results.length).toBe(2);
    expect(results.some((s) => s.category === 'tree')).toBe(true);
    expect(results.some((s) => s.category === 'prop')).toBe(true);

    for (const item of results) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    }
  });
});
