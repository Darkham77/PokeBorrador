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

import type { MountainPalette, ElevationMatrix } from './mountainAutotileEngine.ts';
import type { MacroBiome } from './macroBiomeSynthesizer.ts';

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

/**
 * Clusters mountain elevation cells (Z >= 1) into discrete massifs using 8-connected CCL,
 * and assigns a single continuous geological palette to each massif.
 */
export function clusterMountainMassifs(
  options: GeologicalClusterOptions
): GeologicalClusterResult {
  const matrix = options.elevationMatrix;
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;
  const defaultPal = options.defaultPalette ?? 'brown';

  const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const massifIdMatrix: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
  const paletteMatrix: MountainPalette[][] = Array.from({ length: H }, () => Array(W).fill(defaultPal));

  const massifs: MountainMassif[] = [];
  const massifById = new Map<string, MountainMassif>();

  let massifIndex = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const elev = matrix[y]?.[x] ?? 0;
      if (elev <= 0 || visited[y]![x]) continue;

      // 8-Connected Component Flood Fill
      const cells: { x: number; y: number }[] = [];
      const queue: { x: number; y: number }[] = [{ x, y }];
      visited[y]![x] = true;

      let sumX = 0;
      let sumY = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        cells.push(curr);
        sumX += curr.x;
        sumY += curr.y;

        if (curr.x < minX) minX = curr.x;
        if (curr.x > maxX) maxX = curr.x;
        if (curr.y < minY) minY = curr.y;
        if (curr.y > maxY) maxY = curr.y;

        // 8-neighborhood
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
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
      }

      const count = cells.length;
      const centroidX = Math.round(sumX / count);
      const centroidY = Math.round(sumY / count);

      // Determine single geological palette for the entire massif
      let palette: MountainPalette;
      if (options.defaultPalette) {
        // Explicitly passed palette overrides automatic geographic splitting
        palette = options.defaultPalette;
      } else {
        // Automatic geographical / ecological resolution
        let volcanicCellCount = 0;
        let desertCellCount = 0;
        for (const cell of cells) {
          if (options.macroBiomeGrid) {
            const mb = options.macroBiomeGrid[cell.y]?.[cell.x];
            if (mb === 'volcanic_plateau') volcanicCellCount++;
            else if (mb === 'arid_desert') desertCellCount++;
          }
        }

        if (volcanicCellCount > count * 0.25) {
          palette = 'volcanic';
        } else if (desertCellCount > count * 0.25) {
          palette = 'brown';
        } else {
          // Western ridges -> brown (Mt. Moon), Eastern ridges -> gray (Granite Highland)
          palette = centroidX < W * 0.5 ? 'brown' : 'gray';
        }
      }

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
export function getMassifPaletteAt(
  clusterResult: GeologicalClusterResult,
  x: number,
  y: number,
  defaultPal: MountainPalette = 'brown'
): MountainPalette {
  return clusterResult.paletteMatrix[y]?.[x] ?? defaultPal;
}
