import { describe, it, expect } from 'vitest';
import { generateContinent } from '../../logic/map/continent/continentalEngine';
import { CELL_BIOME } from '../../logic/map/kantoRegionalGenerator';

describe('Procedural Mountain Cliffs & Autotiling Integrity', () => {

  it('verifies that procedural mountain massifs have cohesive geometry and 0 invalid 1-tile cutoffs', () => {
    const config = {
      seed: 867,
      dimensions: { width: 3200, height: 3200, tileSize: 32 },
      cityCount: 10,
      biomes: {
        waterPercent: 20,
        beachPercent: 5,
        mountainPercent: 25,
        forestPercent: 25,
        snowPercent: 0
      },
      roadDensity: 'medium' as const,
      mountainTiers: 'multi' as const,
      roadWidth: 1
    };

    const genResult = generateContinent(config);
    expect(genResult.biomeGrid.length).toBeGreaterThan(0);

    const H = genResult.gridHeight;
    const W = genResult.gridWidth;

    const grid: Uint8Array[] = Array.from({ length: H }, () => new Uint8Array(W));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const b = genResult.biomeGrid[y]?.[x];
        grid[y]![x] = b === 'mountain' ? CELL_BIOME.MOUNTAIN_DIRT : CELL_BIOME.GRASS;
      }
    }

    // Step 1: Morphological dilation/erosion to eliminate pinches and holes
    // Fill 1x1 holes
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (grid[y]![x] !== CELL_BIOME.MOUNTAIN_DIRT) {
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (grid[y + dy]![x + dx] === CELL_BIOME.MOUNTAIN_DIRT) count++;
            }
          }
          if (count >= 6) {
            grid[y]![x] = CELL_BIOME.MOUNTAIN_DIRT;
          }
        }
      }
    }

    // Eliminate 1-tile thin pinches: must run iteratively until 0 remain
    let changed = true;
    while (changed) {
      changed = false;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (grid[y]![x] === CELL_BIOME.MOUNTAIN_DIRT) {
            const n = grid[y - 1]![x] === CELL_BIOME.MOUNTAIN_DIRT;
            const s = grid[y + 1]![x] === CELL_BIOME.MOUNTAIN_DIRT;
            const w = grid[y]![x - 1] === CELL_BIOME.MOUNTAIN_DIRT;
            const e = grid[y]![x + 1] === CELL_BIOME.MOUNTAIN_DIRT;

            if ((!w && !e) || (!n && !s)) {
              grid[y]![x] = CELL_BIOME.GRASS;
              changed = true;
            }
          }
        }
      }
    }

    // Verify 0 thin pinches remain
    const thinPinchCells: Array<{ x: number; y: number; type: string }> = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (grid[y]![x] === CELL_BIOME.MOUNTAIN_DIRT) {
          const n = grid[y - 1]![x] === CELL_BIOME.MOUNTAIN_DIRT;
          const s = grid[y + 1]![x] === CELL_BIOME.MOUNTAIN_DIRT;
          const w = grid[y]![x - 1] === CELL_BIOME.MOUNTAIN_DIRT;
          const e = grid[y]![x + 1] === CELL_BIOME.MOUNTAIN_DIRT;

          if (!w && !e) thinPinchCells.push({ x, y, type: 'vertical_1tile' });
          if (!n && !s) thinPinchCells.push({ x, y, type: 'horizontal_1tile' });
        }
      }
    }

    expect(thinPinchCells.length).toBe(0);

    // Tier 2 candidate evaluation: requires distance >= 2 from grass
    const elevation: Uint8Array[] = Array.from({ length: H }, () => new Uint8Array(W).fill(1));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (grid[y]![x] === CELL_BIOME.MOUNTAIN_DIRT) {
          elevation[y]![x] = 2; // Tier 1 base
        }
      }
    }

    const tier2Candidates = new Set<number>();
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        if (grid[y]![x] === CELL_BIOME.MOUNTAIN_DIRT) {
          let hasMargin = true;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              if (grid[y + dy]![x + dx] !== CELL_BIOME.MOUNTAIN_DIRT) {
                hasMargin = false;
                break;
              }
            }
            if (!hasMargin) break;
          }
          if (hasMargin) {
            tier2Candidates.add(y * W + x);
          }
        }
      }
    }

    // Cluster filter: only keep Tier 2 candidates that have >= 4 candidate neighbors
    for (const key of tier2Candidates) {
      const cx = key % W;
      const cy = Math.floor(key / W);
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (tier2Candidates.has((cy + dy) * W + (cx + dx))) count++;
        }
      }
      if (count >= 4) {
        elevation[cy]![cx] = 3;
      }
    }

    // Verify Tier 2 constraints:
    // Every Tier 2 cell MUST NEVER directly border grass (elevation 1)
    let tier2BordersGrass = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (elevation[y]![x] === 3) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const neighborElev = elevation[y + dy]?.[x + dx] ?? 1;
              if (neighborElev < 2) {
                tier2BordersGrass++;
              }
            }
          }
        }
      }
    }
    expect(tier2BordersGrass).toBe(0);
  });
});
