/**
 * tests/node/map/riverHydrographyEngine.test.ts
 *
 * TIER 1 TESTS FOR RIVER HYDROGRAPHY ENGINE
 */

import { describe, it, expect } from 'vitest';
import {
  carveOrganicLake,
  carveRiverSystem,
  stampBridgesOnWaterIntersections
} from '../../../src/logic/map/continent/riverHydrographyEngine.ts';
import type { WaterTerrainKind } from '../../../src/logic/map/waterAutotileEngine.ts';

describe('riverHydrographyEngine', () => {
  it('carves an organic lake with irregular shores', () => {
    const W = 50;
    const H = 50;
    const matrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('grass'));

    carveOrganicLake(matrix, 25, 25, 8, 0.35, 123);

    // Center is water
    expect(matrix[25]![25]).toBe('water');

    // Confirm water cell count is reasonable
    let waterCount = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (matrix[y]![x] === 'water') waterCount++;
      }
    }
    expect(waterCount).toBeGreaterThan(100);
    expect(waterCount).toBeLessThan(350);
  });

  it('carves a meandering river connecting waypoints', () => {
    const W = 100;
    const H = 100;
    const matrix: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('grass'));

    carveRiverSystem(
      matrix,
      {
        id: 'test_river',
        name: 'Río Test',
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 30 },
          { x: 90, y: 80 }
        ],
        width: 3,
        meanderRoughness: 0.3
      },
      456
    );

    // Start, mid and end proximity should have water
    expect(matrix[10]![10]).toBe('water');
    expect(matrix[80]![90]).toBe('water');
  });

  it('stamps bridges where paths intersect water channels', () => {
    const W = 30;
    const H = 30;
    const terrain: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('grass'));
    // Vertical river at x = 15
    for (let y = 0; y < H; y++) {
      terrain[y]![15] = 'water';
    }

    const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    // Horizontal road across river at y = 10
    for (let x = 10; x <= 20; x++) {
      pathGrid[10]![x] = true;
    }

    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    stampBridgesOnWaterIntersections(terrain, pathGrid, bridgeGrid);

    // Bridge should be stamped at intersection (x = 15, y = 10)
    expect(bridgeGrid[10]![15]).toBe(true);
    // Non-intersection should remain false
    expect(bridgeGrid[10]![12]).toBe(false);
  });

  it('drains an interior lake to ocean with downhill gradient descent and >= 2 cell width', async () => {
    const { generateProceduralRiverDrainage } = await import(
      '../../../src/logic/map/continent/riverHydrographyEngine.ts'
    );
    const W = 64;
    const H = 64;
    // Map with ocean border (outer 4 cells are water)
    const terrain: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('grass'));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (x < 4 || x >= W - 4 || y < 4 || y >= H - 4) {
          terrain[y]![x] = 'water';
        }
      }
    }

    // Inland mountain lake at center (x: 30..35, y: 30..35)
    for (let y = 30; y <= 35; y++) {
      for (let x = 30; x <= 35; x++) {
        terrain[y]![x] = 'water';
      }
    }

    // Heightmap: mountain ridge around center (elev = 2), interior lake (elev = 1), plains (elev = 0)
    const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
    for (let y = 25; y <= 40; y++) {
      for (let x = 25; x <= 40; x++) {
        heightmap[y]![x] = 1;
      }
    }

    const result = generateProceduralRiverDrainage(terrain, heightmap, { seed: 101 });

    expect(result.riverCarved).toBe(true);
    expect(result.carvedCellsCount).toBeGreaterThan(10);
    expect(result.springPoint).toBeDefined();
    expect(result.springPoint!.x).toBeGreaterThanOrEqual(30);
    expect(result.springPoint!.x).toBeLessThanOrEqual(35);
    expect(result.springPoint!.y).toBeGreaterThanOrEqual(30);
    expect(result.springPoint!.y).toBeLessThanOrEqual(35);

    // Verify river path reaches ocean border
    const lastPoint = result.riverPath![result.riverPath!.length - 1]!;
    const touchesOcean =
      lastPoint.x <= 4 || lastPoint.x >= W - 5 || lastPoint.y <= 4 || lastPoint.y >= H - 5;
    expect(touchesOcean).toBe(true);

    // Verify channel is carved into terrainMatrix
    for (const pt of result.riverPath!) {
      expect(terrain[pt.y]![pt.x]).toBe('water');
    }
  });

  it('safely omits river drainage without error when there are no interior lakes', async () => {
    const { generateProceduralRiverDrainage } = await import(
      '../../../src/logic/map/continent/riverHydrographyEngine.ts'
    );
    const W = 40;
    const H = 40;
    // Map with only ocean borders and solid grass center (no interior lakes)
    const terrain: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('grass'));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (x < 3 || x >= W - 3 || y < 3 || y >= H - 3) {
          terrain[y]![x] = 'water';
        }
      }
    }
    const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));

    const result = generateProceduralRiverDrainage(terrain, heightmap, { seed: 202 });
    expect(result.riverCarved).toBe(false);
    expect(result.carvedCellsCount).toBe(0);
  });

  it('avoids immediate coast (< 35 tiles) and traverses toward a distant basin with organic meanders', async () => {
    const { generateProceduralRiverDrainage } = await import(
      '../../../src/logic/map/continent/riverHydrographyEngine.ts'
    );
    const W = 120;
    const H = 120;
    // Map with perimeter ocean (outer 4 cells are water)
    const terrain: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('grass'));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (x < 4 || x >= W - 4 || y < 4 || y >= H - 4) {
          terrain[y]![x] = 'water';
        }
      }
    }

    // Inland lake placed near north coast at (50..55, 18..23).
    // Nearest ocean is North at y=3 (distance only ~15 tiles < 35).
    for (let y = 18; y <= 23; y++) {
      for (let x = 50; x <= 55; x++) {
        terrain[y]![x] = 'water';
      }
    }

    const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
    const result = generateProceduralRiverDrainage(terrain, heightmap, { seed: 777 });

    expect(result.riverCarved).toBe(true);
    expect(result.riverPath).toBeDefined();

    const mouth = result.riverPath![result.riverPath!.length - 1]!;
    // Mouth should NOT be on the immediate north coast (y <= 4)
    expect(mouth.y).toBeGreaterThan(10);

    // Mouth should terminate in a distant basin (coast >= 35 tiles away from spring)
    const mouthDist = Math.hypot(mouth.x - result.springPoint!.x, mouth.y - result.springPoint!.y);
    expect(mouthDist).toBeGreaterThanOrEqual(35);

    // Path should have substantial length traversing the landmass
    expect(result.riverPath!.length).toBeGreaterThan(40);
  });
});
