/**
 * src/logic/map/macroBiomeSynthesizer.ts
 *
 * MACRO BIOME SYNTHESIZER (PHASE 1)
 *
 * Synthesizes broad, ecologically coherent macro-regions across continental landmasses:
 *   1. Low-frequency Simplex FBM noise (scale ~0.018) for Temperature and Moisture fields.
 *   2. Classifies 5 canonical macro biomes:
 *      - 'temperate_meadow': Standard green plains (Kanto central lowlands).
 *      - 'mint_highland': Cool alpine meadows (Indigo plateau / Northern slopes).
 *      - 'viridian_forest': Moisture-rich dense woodland (Viridian / Berry Forest).
 *      - 'arid_desert': High temperature, low moisture dunes & sand trails.
 *      - 'volcanic_plateau': Geothermal scorched plateau (Mt. Ember / Tanoby Ruins).
 *   3. Minimum Region Size Enforcement (>= 16 cells) via morphological relaxation,
 *      eradicating small patchwork anomalies.
 *   4. Mandatory Containment Barriers: Desert and Volcanic borders touching flat plains
 *      without mountain/water barriers receive a 2-cell transitional dirt buffer.
 */

import { SimplexNoise, fbm2DNormalized } from './noise/simplexNoise.ts';
import type { WaterTerrainKind } from './waterAutotileEngine.ts';

export const MACRO_BIOMES = [
  'temperate_meadow',
  'mint_highland',
  'viridian_forest',
  'arid_desert',
  'volcanic_plateau'
] as const;

export type MacroBiome = (typeof MACRO_BIOMES)[number];

export interface MacroBiomeSynthesizerOptions {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly terrainMatrix: readonly (readonly WaterTerrainKind[])[];
  readonly heightmap?: readonly (readonly number[])[];
  readonly temperatureScale?: number;
  readonly moistureScale?: number;
}

export interface MacroBiomeResult {
  readonly biomeGrid: readonly (readonly MacroBiome[])[];
  readonly transitionBufferGrid: readonly (readonly boolean[])[];
  readonly temperatureMap: Float32Array;
  readonly moistureMap: Float32Array;
  readonly stats: Readonly<Record<MacroBiome, number>>;
}

const DEFAULT_TEMP_SCALE = 0.018;
const DEFAULT_MOIST_SCALE = 0.018;
const MIN_CLUSTER_SIZE = 16;

/**
 * Classifies raw temperature and moisture values into a macro biome.
 */
function classifyMacroBiome(temperature: number, moisture: number): MacroBiome {
  // Arid Desert: Hot and very dry
  if (temperature > 0.62 && moisture < 0.35) {
    return 'arid_desert';
  }
  // Volcanic Plateau: Very hot, dry-to-moderate
  if (temperature > 0.74 && moisture >= 0.35 && moisture < 0.55) {
    return 'volcanic_plateau';
  }
  // Viridian Forest: High moisture
  if (moisture > 0.62) {
    return 'viridian_forest';
  }
  // Mint Highland: Cool temperature
  if (temperature < 0.38) {
    return 'mint_highland';
  }
  // Default: Temperate Meadow Plains
  return 'temperate_meadow';
}

/**
 * Eradicates small patchwork clusters (< MIN_CLUSTER_SIZE cells) by absorbing them
 * into their most common neighboring biome.
 */
function absorbSmallClusters(
  grid: MacroBiome[][],
  width: number,
  height: number,
  isLand: (x: number, y: number) => boolean
): void {
  const visited: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (visited[y]![x] || !isLand(x, y)) continue;

      const currentBiome = grid[y]![x]!;
      const component: { x: number; y: number }[] = [];
      const queue: { x: number; y: number }[] = [{ x, y }];
      visited[y]![x] = true;

      const neighborBiomeCounts = new Map<MacroBiome, number>();

      while (queue.length > 0) {
        const curr = queue.shift()!;
        component.push(curr);

        const offsets = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 }
        ];

        for (const { dx, dy } of offsets) {
          const nx = curr.x + dx;
          const ny = curr.y + dy;

          if (nx < 0 || nx >= width || ny < 0 || ny >= height || !isLand(nx, ny)) continue;

          const nBiome = grid[ny]![nx]!;
          if (nBiome === currentBiome) {
            if (!visited[ny]![nx]) {
              visited[ny]![nx] = true;
              queue.push({ x: nx, y: ny });
            }
          } else {
            neighborBiomeCounts.set(nBiome, (neighborBiomeCounts.get(nBiome) ?? 0) + 1);
          }
        }
      }

      // If cluster is smaller than MIN_CLUSTER_SIZE, absorb into dominant neighbor
      if (component.length < MIN_CLUSTER_SIZE && neighborBiomeCounts.size > 0) {
        let dominantBiome = currentBiome;
        let maxCount = -1;
        for (const [b, count] of neighborBiomeCounts.entries()) {
          if (count > maxCount) {
            maxCount = count;
            dominantBiome = b;
          }
        }
        for (const cell of component) {
          grid[cell.y]![cell.x] = dominantBiome;
        }
      }
    }
  }
}

/**
 * Computes a 2-cell transition buffer along boundaries where desert or volcanic biomes
 * directly contact flat meadow/highland plains without natural mountain or water barriers.
 */
function computeContainmentBuffer(
  grid: readonly (readonly MacroBiome[])[],
  width: number,
  height: number,
  isBarrier: (x: number, y: number) => boolean,
  isLand: (x: number, y: number) => boolean
): boolean[][] {
  const buffer: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isLand(x, y)) continue;

      const current = grid[y]![x]!;
      const isExtreme = current === 'arid_desert' || current === 'volcanic_plateau';
      if (!isExtreme) continue;

      // Check Chebyshev distance <= 2 for flat plains contact without barriers
      let touchesPlain = false;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (!isLand(nx, ny)) continue;
          if (isBarrier(nx, ny)) continue;

          const nBiome = grid[ny]![nx]!;
          if (nBiome === 'temperate_meadow' || nBiome === 'mint_highland') {
            touchesPlain = true;
            break;
          }
        }
        if (touchesPlain) break;
      }

      if (touchesPlain) {
        buffer[y]![x] = true;
      }
    }
  }

  return buffer;
}

/**
 * Master synthesizer generating macro-region biomes across continental terrain.
 */
export function synthesizeMacroBiomes(
  options: MacroBiomeSynthesizerOptions
): MacroBiomeResult {
  const { width, height, seed, terrainMatrix, heightmap } = options;
  const tempScale = options.temperatureScale ?? DEFAULT_TEMP_SCALE;
  const moistScale = options.moistureScale ?? DEFAULT_MOIST_SCALE;

  const tempNoise = new SimplexNoise(seed + 512);
  const moistNoise = new SimplexNoise(seed + 1024);

  const totalCells = width * height;
  const temperatureMap = new Float32Array(totalCells);
  const moistureMap = new Float32Array(totalCells);

  const isLand = (x: number, y: number): boolean => {
    const t = terrainMatrix[y]?.[x];
    return t !== 'water' && t !== 'water_deep';
  };

  const isBarrier = (x: number, y: number): boolean => {
    const t = terrainMatrix[y]?.[x];
    if (t === 'water' || t === 'water_deep') return true;
    const elev = heightmap?.[y]?.[x] ?? 0;
    return elev >= 1; // Mountains act as natural barriers
  };

  const rawBiomeGrid: MacroBiome[][] = Array.from({ length: height }, () =>
    Array<MacroBiome>(width).fill('temperate_meadow')
  );

  // 1. Compute Temperature & Moisture fields with latitude gradient
  for (let y = 0; y < height; y++) {
    // Latitude gradient: north is cooler (0.0), south is warmer (1.0)
    const latitudeGrad = y / Math.max(1, height - 1);

    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      const tFbm = fbm2DNormalized(tempNoise, x, y, {
        scale: tempScale,
        octaves: 3,
        lacunarity: 2.0,
        persistence: 0.5
      });
      const mFbm = fbm2DNormalized(moistNoise, x, y, {
        scale: moistScale,
        octaves: 3,
        lacunarity: 2.0,
        persistence: 0.5
      });

      // Composite temperature: 65% noise + 35% global latitude
      const effectiveTemp = Math.max(0.0, Math.min(1.0, tFbm * 0.65 + latitudeGrad * 0.35));
      const effectiveMoist = Math.max(0.0, Math.min(1.0, mFbm));

      temperatureMap[idx] = effectiveTemp;
      moistureMap[idx] = effectiveMoist;

      rawBiomeGrid[y]![x] = classifyMacroBiome(effectiveTemp, effectiveMoist);
    }
  }

  // 2. Eradicate small patchwork clusters (< 16 cells)
  absorbSmallClusters(rawBiomeGrid, width, height, isLand);

  // 3. Compute 2-cell containment buffers for desert/volcanic borders touching plains
  const transitionBufferGrid = computeContainmentBuffer(
    rawBiomeGrid,
    width,
    height,
    isBarrier,
    isLand
  );

  // 4. Compute biome stats
  const stats: Record<MacroBiome, number> = {
    temperate_meadow: 0,
    mint_highland: 0,
    viridian_forest: 0,
    arid_desert: 0,
    volcanic_plateau: 0
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isLand(x, y)) {
        stats[rawBiomeGrid[y]![x]!] = (stats[rawBiomeGrid[y]![x]!] ?? 0) + 1;
      }
    }
  }

  return {
    biomeGrid: rawBiomeGrid,
    transitionBufferGrid,
    temperatureMap,
    moistureMap,
    stats
  };
}
