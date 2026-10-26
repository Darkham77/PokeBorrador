/**
 * src/logic/map/geologicalClusterEngine.ts
 *
 * GEOLOGICAL CLUSTERER & MASSIF HOMOGENEITY ENGINE (PHASE 2)
 *
 * Enforces the Geological Coherence by Mountain Massif invariant:
 *   1. Identifies discrete mountain formations via 8-connected Connected Component Labeling (CCL).
 *   2. Assigns a SINGLE, unbroken geological palette per massif:
 *      - 'brown': Mt. Moon canyon & western ridges.
 *      - 'gray': Cerulean cave granite & eastern highlands.
 *      - 'volcanic': Tanoby ruins / Mt. Ember basaltic formations.
 *   3. Guarantees 0 mixed palettes on any contiguous cliff face or massif.
 */

import type { MacroBiome } from './macroBiomeSynthesizer.ts';
import type { MountainPalette, ElevationMatrix } from './mountainAutotileEngine.ts';

export interface MountainMassif {
  readonly id: string;
  readonly index: number;
  readonly palette: MountainPalette;
  readonly cellCount: number;
  readonly centroidX: number;
  readonly centroidY: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly cells: readonly { readonly x: number; readonly y: number }[];
}

export interface GeologicalClusterOptions {
  readonly elevationMatrix: ElevationMatrix;
  readonly macroBiomeGrid?: readonly (readonly MacroBiome[])[];
  readonly seed?: number;
  readonly defaultPalette?: MountainPalette;
}

export interface GeologicalClusterResult {
  readonly massifs: readonly MountainMassif[];
  readonly paletteMatrix: readonly (readonly MountainPalette[])[];
  readonly massifIdMatrix: readonly (readonly (string | null)[])[];
}

function resolveMassifPalette(
  options: GeologicalClusterOptions,
  cells: readonly { x: number; y: number }[],
  count: number,
  centroidX: number,
  worldWidth: number
): MountainPalette {
  if (options.defaultPalette) {
    return options.defaultPalette;
  }
  let volcanicCellCount = 0;
  let desertCellCount = 0;
  if (options.macroBiomeGrid) {
    for (const cell of cells) {
      const mb = options.macroBiomeGrid[cell.y]?.[cell.x];
      if (mb === 'volcanic_plateau') volcanicCellCount++;
      else if (mb === 'arid_desert') desertCellCount++;
    }
  }

  const DOMINANT_BIOME_PALETTE_THRESHOLD_RATIO = 0.25 as const;
  if (volcanicCellCount > count * DOMINANT_BIOME_PALETTE_THRESHOLD_RATIO) {
    return 'volcanic';
  }
  if (desertCellCount > count * DOMINANT_BIOME_PALETTE_THRESHOLD_RATIO) {
    return 'brown';
  }
  return centroidX < worldWidth * 0.5 ? 'brown' : 'gray';
}

const EIGHT_WAY_NEIGHBOR_OFFSETS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
];

interface FloodFilledMassif {
  readonly cells: readonly { readonly x: number; readonly y: number }[];
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly centroidX: number;
  readonly centroidY: number;
  readonly count: number;
}

function floodFillMassifComponent(
  startX: number,
  startY: number,
  W: number,
  H: number,
  matrix: ElevationMatrix,
  visited: boolean[][]
): FloodFilledMassif {
  const cells: { x: number; y: number }[] = [];
  const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
  visited[startY]![startX] = true;

  let sumX = 0;
  let sumY = 0;
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    cells.push(curr);
    sumX += curr.x;
    sumY += curr.y;

    if (curr.x < minX) minX = curr.x;
    if (curr.x > maxX) maxX = curr.x;
    if (curr.y < minY) minY = curr.y;
    if (curr.y > maxY) maxY = curr.y;

    for (const [dx, dy] of EIGHT_WAY_NEIGHBOR_OFFSETS) {
      const nx = curr.x + dx;
      const ny = curr.y + dy;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        const nElev = matrix[ny]?.[nx] ?? 0;
        if (nElev > 0 && !visited[ny]![nx]) {
          visited[ny]![nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  const count = cells.length;
  const centroidX = Math.round(sumX / count);
  const centroidY = Math.round(sumY / count);

  return { cells, minX, maxX, minY, maxY, centroidX, centroidY, count };
}

/**
 * Clusters mountain elevation cells (Z >= 1) into discrete massifs using 8-connected CCL,
 * and assigns a single continuous geological palette to each massif.
 */
export function clusterMountainMassifs(options: GeologicalClusterOptions): GeologicalClusterResult {
  const matrix = options.elevationMatrix;
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;
  const defaultPal = options.defaultPalette ?? 'brown';

  const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const massifIdMatrix: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
  const paletteMatrix: MountainPalette[][] = Array.from({ length: H }, () =>
    Array(W).fill(defaultPal)
  );

  const massifs: MountainMassif[] = [];
  const massifById = new Map<string, MountainMassif>();

  let massifIndex = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const elev = matrix[y]?.[x] ?? 0;
      if (elev <= 0 || visited[y]![x]) continue;

      const { cells, minX, maxX, minY, maxY, centroidX, centroidY, count } =
        floodFillMassifComponent(x, y, W, H, matrix, visited);

      // Determine single geological palette for the entire massif
      const palette = resolveMassifPalette(options, cells, count, centroidX, W);

      const id = `massif_${massifIndex}`;
      const massif: MountainMassif = {
        id,
        index: massifIndex,
        palette,
        cellCount: count,
        centroidX,
        centroidY,
        minX,
        maxX,
        minY,
        maxY,
        cells
      };

      massifs.push(massif);
      massifById.set(id, massif);

      // Stamp massif identity and homogeneous palette to 100% of its cells
      for (const cell of cells) {
        massifIdMatrix[cell.y]![cell.x] = id;
        paletteMatrix[cell.y]![cell.x] = palette;
      }

      massifIndex++;
    }
  }

  return {
    massifs,
    paletteMatrix,
    massifIdMatrix
  };
}

/**
 * Returns the assigned geological palette for cell (x, y) from a cluster result.
 */
// fallow-ignore-next-line unused-export
export function getMassifPaletteAt(
  clusterResult: GeologicalClusterResult,
  x: number,
  y: number,
  defaultPal: MountainPalette = 'brown'
): MountainPalette {
  return clusterResult.paletteMatrix[y]?.[x] ?? defaultPal;
}
