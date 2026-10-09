/**
 * src/logic/map/biomeDistributionEngine.ts
 *
 * MATHEMATICAL BIOME DISTRIBUTION ENGINE (SSoT)
 * Quantile-based organic distribution governed strictly by real user percentages.
 * Employs Simplex Noise 2D (FBM), quantile thresholding (histogram equalization),
 * and 2-pass cellular automata relaxation to eliminate 1x1 orphan tiles.
 */

import { SimplexNoise, fbm2DNormalized } from './noise/simplexNoise.ts';

export interface BiomeDistributionOptions {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly waterPercent: number; // 0 to 100
  readonly mountainPercent: number; // 0 to 100
  readonly forestPercent: number; // 0 to 100
  readonly centerExclusion?: {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
  };
  readonly noiseScale?: number; // default: 0.08
  readonly moistureScale?: number; // default: 0.06
}

export interface BiomeStats {
  readonly totalCells: number;
  readonly waterCount: number;
  readonly waterPercentActual: number;
  readonly mountainCount: number;
  readonly mountainPercentActual: number;
  readonly forestCount: number;
  readonly forestPercentActual: number;
}

export interface BiomeDistributionResult {
  readonly waterMask: boolean[][];
  readonly mountainMask: boolean[][];
  readonly forestMask: boolean[][];
  readonly rawHeightmap: Float32Array;
  readonly rawMoisturemap: Float32Array;
  readonly stats: BiomeStats;
}

/**
 * Counts the number of active 8-connected neighbors for grid[y][x].
 */
function count8Neighbors(grid: boolean[][], x: number, y: number, w: number, h: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        if (grid[ny]![nx]) {
          count++;
        }
      }
    }
  }
  return count;
}

/**
 * Executes a single relaxation pass of cellular automata (4-5 rule).
 * Eliminates isolated 1x1 orphan spikes and fills 1x1 holes.
 */
function relaxCellularMask(
  input: boolean[][],
  w: number,
  h: number,
  birthThreshold = 5,
  deathThreshold = 2
): boolean[][] {
  const output: boolean[][] = Array.from({ length: h }, () => Array(w).fill(false));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const neighbors = count8Neighbors(input, x, y, w, h);
      const isAlive = input[y]![x];

      if (isAlive) {
        // Starvation: dies if fewer than deathThreshold neighbors
        output[y]![x] = neighbors >= deathThreshold;
      } else {
        // Birth: becomes alive if at least birthThreshold neighbors
        output[y]![x] = neighbors >= birthThreshold;
      }
    }
  }

  return output;
}

/**
 * Eradicates any remaining 1x1 orphan tile with 0 neighbors.
 */
function removeOrphanIslands(grid: boolean[][], w: number, h: number): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y]![x] && count8Neighbors(grid, x, y, w, h) === 0) {
        grid[y]![x] = false;
      }
    }
  }
}

/**
 * Computes organic, percentage-governed biome masks with Simplex Noise FBM
 * and quantile thresholding.
 */
export function computeBiomeDistribution(options: BiomeDistributionOptions): BiomeDistributionResult {
  const width = Math.max(8, Math.floor(options.width));
  const height = Math.max(8, Math.floor(options.height));
  const totalCells = width * height;
  const seed = options.seed ?? 42;

  const waterPct = Math.max(0, Math.min(100, options.waterPercent));
  const mountainPct = Math.max(0, Math.min(100, options.mountainPercent));
  const forestPct = Math.max(0, Math.min(100, options.forestPercent));

  const noiseScale = options.noiseScale ?? 0.08;
  const moistureScale = options.moistureScale ?? 0.06;

  const heightNoise = new SimplexNoise(seed);
  const moistureNoise = new SimplexNoise(seed + 1337);

  const rawHeightmap = new Float32Array(totalCells);
  const rawMoisturemap = new Float32Array(totalCells);

  // 1. Sample Heightmap and apply town center exclusion modulation
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      let hVal = fbm2DNormalized(heightNoise, x, y, {
        octaves: 4,
        lacunarity: 2.0,
        persistence: 0.5,
        scale: noiseScale
      });

      // If center exclusion is defined (town), smoothly blend elevation towards safe median (0.5)
      if (options.centerExclusion) {
        const dx = x - options.centerExclusion.x;
        const dy = y - options.centerExclusion.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < options.centerExclusion.radius) {
          const factor = 1.0 - dist / options.centerExclusion.radius;
          hVal = hVal * (1.0 - factor) + 0.5 * factor;
        }
      }

      rawHeightmap[idx] = hVal;

      // Sample moisturemap for vegetation
      rawMoisturemap[idx] = fbm2DNormalized(moistureNoise, x, y, {
        octaves: 3,
        lacunarity: 2.0,
        persistence: 0.5,
        scale: moistureScale
      });
    }
  }

  // 2. Quantile Thresholding for Water and Mountain
  // Create indexed array to sort by sampled height
  const cellIndices = new Uint32Array(totalCells);
  for (let i = 0; i < totalCells; i++) {
    cellIndices[i] = i;
  }
  cellIndices.sort((a, b) => rawHeightmap[a]! - rawHeightmap[b]!);

  let waterGrid: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  let mountainGrid: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

  const targetWaterCount = Math.round(totalCells * (waterPct / 100));
  const targetMountainCount = Math.round(totalCells * (mountainPct / 100));

  // Lowest heights become water
  for (let i = 0; i < targetWaterCount; i++) {
    const idx = cellIndices[i]!;
    const cy = Math.floor(idx / width);
    const cx = idx % width;
    waterGrid[cy]![cx] = true;
  }

  // Highest heights become mountain (from end of sorted array)
  for (let i = totalCells - 1; i >= totalCells - targetMountainCount && i >= targetWaterCount; i--) {
    const idx = cellIndices[i]!;
    const cy = Math.floor(idx / width);
    const cx = idx % width;
    mountainGrid[cy]![cx] = true;
  }

  // 3. Cellular Automata Relaxation (2 passes for water and mountain)
  if (waterPct > 0) {
    waterGrid = relaxCellularMask(waterGrid, width, height, 5, 2);
    waterGrid = relaxCellularMask(waterGrid, width, height, 5, 2);
    removeOrphanIslands(waterGrid, width, height);
  } else {
    for (let y = 0; y < height; y++) {
      waterGrid[y]!.fill(false);
    }
  }

  if (mountainPct > 0) {
    mountainGrid = relaxCellularMask(mountainGrid, width, height, 5, 2);
    mountainGrid = relaxCellularMask(mountainGrid, width, height, 5, 2);
    removeOrphanIslands(mountainGrid, width, height);
  } else {
    for (let y = 0; y < height; y++) {
      mountainGrid[y]!.fill(false);
    }
  }

  // 4. Enforce Center Exclusion: Town center must strictly be dry and flat
  if (options.centerExclusion) {
    const rSq = options.centerExclusion.radius * options.centerExclusion.radius;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - options.centerExclusion.x;
        const dy = y - options.centerExclusion.y;
        if (dx * dx + dy * dy <= rSq) {
          waterGrid[y]![x] = false;
          mountainGrid[y]![x] = false;
        }
      }
    }
  }

  // 5. Quantile Forest Distribution on remaining open land
  let forestGrid: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  if (forestPct > 0) {
    const availableLandIndices: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!waterGrid[y]![x] && !mountainGrid[y]![x]) {
          availableLandIndices.push(y * width + x);
        }
      }
    }

    availableLandIndices.sort((a, b) => rawMoisturemap[b]! - rawMoisturemap[a]!);
    const targetForestCount = Math.round(availableLandIndices.length * (forestPct / 100));

    for (let i = 0; i < targetForestCount; i++) {
      const idx = availableLandIndices[i]!;
      const cy = Math.floor(idx / width);
      const cx = idx % width;
      forestGrid[cy]![cx] = true;
    }

    // Smooth forest clusters
    forestGrid = relaxCellularMask(forestGrid, width, height, 5, 2);
    forestGrid = relaxCellularMask(forestGrid, width, height, 5, 2);
    removeOrphanIslands(forestGrid, width, height);
  }

  // 6. Compute exact final statistics
  let finalWaterCount = 0;
  let finalMountainCount = 0;
  let finalForestCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (waterGrid[y]![x]) finalWaterCount++;
      if (mountainGrid[y]![x]) finalMountainCount++;
      if (forestGrid[y]![x]) finalForestCount++;
    }
  }

  const stats: BiomeStats = {
    totalCells,
    waterCount: finalWaterCount,
    waterPercentActual: Number(((finalWaterCount / totalCells) * 100).toFixed(1)),
    mountainCount: finalMountainCount,
    mountainPercentActual: Number(((finalMountainCount / totalCells) * 100).toFixed(1)),
    forestCount: finalForestCount,
    forestPercentActual: Number(((finalForestCount / totalCells) * 100).toFixed(1))
  };

  return {
    waterMask: waterGrid,
    mountainMask: mountainGrid,
    forestMask: forestGrid,
    rawHeightmap,
    rawMoisturemap,
    stats
  };
}
