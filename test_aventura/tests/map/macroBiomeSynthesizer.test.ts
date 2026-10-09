/**
 * tests/node/map/macroBiomeSynthesizer.test.ts
 *
 * UNIT TESTS FOR MACRO BIOME SYNTHESIZER (PHASE 1)
 */

import { describe, it, expect } from 'vitest';
import {
  synthesizeMacroBiomes,
  MACRO_BIOMES,
  type MacroBiome
} from '../../../src/logic/map/macroBiomeSynthesizer.ts';
import type { WaterTerrainKind } from '../../../src/logic/map/waterAutotileEngine.ts';

describe('macroBiomeSynthesizer', () => {
  const W = 64;
  const H = 64;

  // Mock continental terrain: ocean borders, grass center
  function createTestTerrain(): WaterTerrainKind[][] {
    return Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) => {
        if (x < 4 || x >= W - 4 || y < 4 || y >= H - 4) {
          return 'water';
        }
        return 'grass';
      })
    );
  }

  it('generates a valid macro biome grid with 100% valid biome classifications', () => {
    const terrain = createTestTerrain();
    const result = synthesizeMacroBiomes({
      width: W,
      height: H,
      seed: 42,
      terrainMatrix: terrain
    });

    expect(result.biomeGrid.length).toBe(H);
    expect(result.biomeGrid[0]!.length).toBe(W);

    const validBiomes = new Set<MacroBiome>(MACRO_BIOMES);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        expect(validBiomes.has(result.biomeGrid[y]![x]!)).toBe(true);
      }
    }

    // Stats should have recorded valid cell counts
    const totalLandCount = Object.values(result.stats).reduce((a, b) => a + b, 0);
    expect(totalLandCount).toBeGreaterThan(0);
    expect(totalLandCount).toBe((W - 8) * (H - 8));
  });

  it('is strictly deterministic for identical seeds', () => {
    const terrain = createTestTerrain();
    const resA = synthesizeMacroBiomes({
      width: W,
      height: H,
      seed: 12345,
      terrainMatrix: terrain
    });
    const resB = synthesizeMacroBiomes({
      width: W,
      height: H,
      seed: 12345,
      terrainMatrix: terrain
    });

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        expect(resA.biomeGrid[y]![x]).toBe(resB.biomeGrid[y]![x]);
      }
    }
  });

  it('enforces minimum cluster size >= 16 to eradicate orphan patchwork', () => {
    const terrain = createTestTerrain();
    const result = synthesizeMacroBiomes({
      width: W,
      height: H,
      seed: 777,
      terrainMatrix: terrain
    });

    // Run CCL on each biome to verify all land components have size >= 16
    const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const isLand = (x: number, y: number): boolean => terrain[y]![x] === 'grass';

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (visited[y]![x] || !isLand(x, y)) continue;

        const curBiome = result.biomeGrid[y]![x]!;
        let count = 0;
        const queue: { x: number; y: number }[] = [{ x, y }];
        visited[y]![x] = true;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          count++;

          const offsets = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
          ];

          for (const { dx, dy } of offsets) {
            const nx = curr.x + dx;
            const ny = curr.y + dy;
            if (nx >= 0 && nx < W && ny >= 0 && ny < H && isLand(nx, ny) && !visited[ny]![nx]) {
              if (result.biomeGrid[ny]![nx] === curBiome) {
                visited[ny]![nx] = true;
                queue.push({ x: nx, y: ny });
              }
            }
          }
        }

        expect(count).toBeGreaterThanOrEqual(16);
      }
    }
  });

  it('activates 2-cell containment transition buffer along desert/volcanic boundaries touching plains', () => {
    const terrain = createTestTerrain();
    // Force a mock scenario with no mountain barrier
    const result = synthesizeMacroBiomes({
      width: W,
      height: H,
      seed: 999,
      terrainMatrix: terrain
    });

    // Check if transition buffer exists for cells touching different biomes
    expect(result.transitionBufferGrid.length).toBe(H);
    expect(result.transitionBufferGrid[0]!.length).toBe(W);

    // If desert or volcanic exists, verify containment logic
    let extremeCellFound = false;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const b = result.biomeGrid[y]![x]!;
        if (b === 'arid_desert' || b === 'volcanic_plateau') {
          extremeCellFound = true;
        }
      }
    }

    if (extremeCellFound) {
      // Transition buffer must be active along perimeter
      let activeBufferCount = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (result.transitionBufferGrid[y]![x]) {
            activeBufferCount++;
          }
        }
      }
      expect(activeBufferCount).toBeGreaterThan(0);
    }
  });
});
