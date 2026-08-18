/**
 * tests/node/assets/test_asset_bound_analyzer.test.ts
 *
 * Unit tests for assetBoundAnalyzer helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  findFeetPointsFromBuffer,
  analyzeImageBufferBounds,
  DEFAULT_FEET_Y,
  DEFAULT_FEET_X,
  DEFAULT_BODY_H,
  DEFAULT_BODY_W
} from '../../../scripts/assets/helpers/assetBoundAnalyzer.ts';

describe('assetBoundAnalyzer', () => {
  it('returns default feet points when buffer has fewer than 4 channels', () => {
    const rawBuffer = Buffer.alloc(100);
    const result = findFeetPointsFromBuffer(rawBuffer, 10, 10, 3);
    expect(result.feetY).toBe(DEFAULT_FEET_Y);
    expect(result.feetX).toBe(DEFAULT_FEET_X);
  });

  it('returns default feet points when image is fully transparent', () => {
    const rawBuffer = Buffer.alloc(16 * 16 * 4, 0);
    const result = findFeetPointsFromBuffer(rawBuffer, 16, 16, 4);
    expect(result.feetY).toBe(DEFAULT_FEET_Y);
    expect(result.feetX).toBe(DEFAULT_FEET_X);
  });

  it('calculates feet points accurately for a centered opaque box', () => {
    const size = 10;
    const buf = Buffer.alloc(size * size * 4, 0);

    // Place an opaque 4x4 box from y=4..7, x=3..6
    for (let y = 4; y <= 7; y++) {
      for (let x = 3; x <= 6; x++) {
        const idx = (y * size + x) * 4;
        buf[idx + 3] = 255; // fully opaque
      }
    }

    const result = findFeetPointsFromBuffer(buf, size, size, 4);
    // lowest opaque y is 7 -> feetY = 7/10 = 0.7
    // minX = 3, maxX = 6 -> center = 4.5 -> feetX = 4.5/10 = 0.45
    expect(result.feetY).toBe(0.7);
    expect(result.feetX).toBe(0.45);
  });

  it('analyzes image bounds and returns body metrics', () => {
    const size = 20;
    const buf = Buffer.alloc(size * size * 4, 0);

    // Place opaque pixels from y=10..19, x=5..14 (h=10, w=10)
    for (let y = 10; y <= 19; y++) {
      for (let x = 5; x <= 14; x++) {
        const idx = (y * size + x) * 4;
        buf[idx + 3] = 255;
      }
    }

    const bounds = analyzeImageBufferBounds(buf, size, 4);
    expect(bounds.feetY).toBe(0.95);
    expect(bounds.feetX).toBe(0.475);
    expect(bounds.bodyH).toBe(0.5); // 10/20
    expect(bounds.bodyW).toBe(0.5); // 10/20
    expect(bounds.bodyRadius).toBe(0.25);
  });

  it('returns default bounds when analyzeImageBufferBounds encounters fully transparent buffer', () => {
    const size = 10;
    const buf = Buffer.alloc(size * size * 4, 0);
    const bounds = analyzeImageBufferBounds(buf, size, 4);
    expect(bounds.feetY).toBe(DEFAULT_FEET_Y);
    expect(bounds.feetX).toBe(DEFAULT_FEET_X);
    expect(bounds.bodyH).toBe(DEFAULT_BODY_H);
    expect(bounds.bodyW).toBe(DEFAULT_BODY_W);
  });
});
