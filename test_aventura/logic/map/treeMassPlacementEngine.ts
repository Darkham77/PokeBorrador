/**
 * test_aventura/logic/map/treeMassPlacementEngine.ts
 *
 * DENSE WILDERNESS TREE MASS & ENFRAMING PLACEMENT ENGINE
 *
 * Pre-computes Cellular Automata mask (B5678/S45678) to consolidate dense tree masses,
 * places alpine pines and oaks respecting macro-biomes, enforces canopy clearances,
 * species isolation, and roots separation.
 */

import { SimplexNoise } from './noise/simplexNoise.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { TreePlacement } from './wildernessVegetationEngine.ts';
import {
  GROVE_NOISE_SCALE,
  GROVE_THRESHOLD_NEAR_PATH,
  GROVE_THRESHOLD_DEFAULT,
  FOREST_CA_ITERATIONS,
  FOREST_CA_SURVIVE_MIN,
  FOREST_CA_BORN_MIN,
  PINE_WIDTH,
  PINE_HEIGHT,
  OAK_WIDTH,
  OAK_HEIGHT,
  TREE_TRUNK_HEIGHT,
  TREE_SPECIES_ISOLATION_DISTANCE,
  AUTUMN_MACRO_NOISE_SCALE,
  AUTUMN_MACRO_THRESHOLD,
  AUTUMN_BUFFER_THRESHOLD,
  AUTUMN_DENSE_TREE_THRESHOLD,
  SUBTRACTIVE_WILDERNESS_BASE_THRESHOLD,
  SUBTRACTIVE_WILDERNESS_PATH_THRESHOLD
} from '../../config/wildernessConfig.ts';

const ROUTE_FRAME_RADIUS = 3 as const;

export interface TreeMassPlacementContext {
  readonly H: number;
  readonly W: number;
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly transitableGrid?: readonly (readonly boolean[])[];
  readonly treeBlocked: readonly (readonly boolean[])[];
  readonly urbanBlocked: readonly (readonly boolean[])[];
  readonly stairBlocked: readonly (readonly boolean[])[];
  readonly tallGrassGrid: readonly (readonly boolean[])[];
  readonly prng: SimplexNoise;
  readonly rawTrees: TreePlacement[];
}

/**
 * Places organic wilderness tree masses and route enframing canopies.
 */
export function placeTreeMasses(ctx: TreeMassPlacementContext): void {
  const {
    H,
    W,
    continent,
    pathGrid,
    transitableGrid,
    treeBlocked,
    urbanBlocked,
    stairBlocked,
    tallGrassGrid,
    prng,
    rawTrees
  } = ctx;

  let forestMask: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (treeBlocked[y]?.[x]) continue;
      if (continent.terrainMatrix[y]?.[x] !== 'grass') continue;
      if ((continent.heightmap[y]?.[x] ?? 0) !== 0) continue;
      const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow';
      if (mBiome === 'arid_desert' || mBiome === 'volcanic_plateau') continue;

      const isNonTransitable = transitableGrid && !transitableGrid[y]?.[x];
      const groveNoise = prng.noise2D(x * GROVE_NOISE_SCALE, y * GROVE_NOISE_SCALE);

      let nearCorridor = false;
      for (let dy = -ROUTE_FRAME_RADIUS; dy <= ROUTE_FRAME_RADIUS && !nearCorridor; dy++) {
        for (let dx = -ROUTE_FRAME_RADIUS; dx <= ROUTE_FRAME_RADIUS; dx++) {
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
          if (pathGrid[y + dy]?.[x + dx]) {
            nearCorridor = true;
            break;
          }
        }
      }

      const threshold = nearCorridor ? GROVE_THRESHOLD_NEAR_PATH : GROVE_THRESHOLD_DEFAULT;
      if (isNonTransitable || groveNoise >= threshold) {
        forestMask[y]![x] = true;
      }
    }
  }

  for (let iter = 0; iter < FOREST_CA_ITERATIONS; iter++) {
    const nextMask = forestMask.map((row) => [...row]);
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        if (treeBlocked[y]?.[x] || continent.terrainMatrix[y]?.[x] !== 'grass') {
          nextMask[y]![x] = false;
          continue;
        }

        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (forestMask[y + dy]?.[x + dx]) neighbors++;
          }
        }

        if (forestMask[y]![x]) {
          if (neighbors < FOREST_CA_SURVIVE_MIN) {
            nextMask[y]![x] = false;
          }
        } else {
          if (neighbors >= FOREST_CA_BORN_MIN && !treeBlocked[y]?.[x]) {
            nextMask[y]![x] = true;
          }
        }
      }
    }
    forestMask = nextMask;
  }

  // Iterate strictly from North to South (Y ascending), then West to East
  const treeOccupied: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const treeSpeciesGrid: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));

  for (let y = 3; y < H - 4; y += 1) {
    for (let x = 2; x < W - 4; x += 1) {
      let forceDenseTree = false;
      if (transitableGrid && !transitableGrid[y]?.[x] && continent.terrainMatrix[y]?.[x] === 'grass' && (continent.heightmap[y]?.[x] ?? 0) === 0) {
        forceDenseTree = true;
      }

      if (!forceDenseTree && !forestMask[y]![x]) continue;

      const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow';
      let prefabFile: string;
      let treeWidth: number;
      let treeHeight: number;

      if (mBiome === 'mint_highland') {
        prefabFile = 'poke_tree_pine_small.png';
        treeWidth = PINE_WIDTH;
        treeHeight = PINE_HEIGHT;
      } else if (mBiome === 'viridian_forest') {
        prefabFile = 'poke_tree_oak_clean.png';
        treeWidth = OAK_WIDTH;
        treeHeight = OAK_HEIGHT;
      } else {
        const autumnNoise = prng.noise2D(x * AUTUMN_MACRO_NOISE_SCALE, y * AUTUMN_MACRO_NOISE_SCALE);
        if (forceDenseTree) {
          prefabFile = autumnNoise > AUTUMN_DENSE_TREE_THRESHOLD ? 'poke_tree_oak_yellow.png' : 'poke_tree_oak_clean.png';
          treeWidth = OAK_WIDTH;
          treeHeight = OAK_HEIGHT;
        } else if (autumnNoise > AUTUMN_MACRO_THRESHOLD) {
          prefabFile = 'poke_tree_oak_yellow.png';
          treeWidth = OAK_WIDTH;
          treeHeight = OAK_HEIGHT;
        } else if (autumnNoise <= AUTUMN_BUFFER_THRESHOLD) {
          prefabFile = 'poke_tree_oak_clean.png';
          treeWidth = OAK_WIDTH;
          treeHeight = OAK_HEIGHT;
        } else {
          continue;
        }
      }

      let nearPath = false;
      for (let dy = -ROUTE_FRAME_RADIUS; dy <= ROUTE_FRAME_RADIUS; dy++) {
        for (let dx = -ROUTE_FRAME_RADIUS; dx <= ROUTE_FRAME_RADIUS; dx++) {
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
          if (pathGrid[y + dy]?.[x + dx]) {
            nearPath = true;
            break;
          }
        }
        if (nearPath) break;
      }

      const baseThreshold = SUBTRACTIVE_WILDERNESS_BASE_THRESHOLD;
      const threshold = nearPath ? SUBTRACTIVE_WILDERNESS_PATH_THRESHOLD : baseThreshold;
      const groveNoise = prng.noise2D(x * GROVE_NOISE_SCALE, y * GROVE_NOISE_SCALE);

      if (!forceDenseTree && groveNoise < threshold) continue;

      const canopyOverhang = treeHeight - TREE_TRUNK_HEIGHT;
      let fits = true;

      // 1. Water clearance
      for (let dy = -canopyOverhang - 1; dy <= 2; dy++) {
        for (let dx = -1; dx <= treeWidth; dx++) {
          const cy = y + dy;
          const cx = x + dx;
          if (cy < 0 || cy >= H || cx < 0 || cx >= W) {
            fits = false;
            break;
          }
          const t = continent.terrainMatrix[cy]?.[cx];
          if (t === 'water' || t === 'water_deep') {
            fits = false;
            break;
          }
        }
        if (!fits) break;
      }
      if (!fits) continue;

      // 2. Ground footprint clearance
      for (let dy = 0; dy < TREE_TRUNK_HEIGHT; dy++) {
        for (let dx = 0; dx < treeWidth; dx++) {
          const cy = y + dy;
          const cx = x + dx;
          if (treeBlocked[cy]?.[cx] || treeOccupied[cy]?.[cx]) {
            fits = false;
            break;
          }
          if (continent.terrainMatrix[cy]?.[cx] !== 'grass' || (continent.heightmap[cy]?.[cx] ?? 0) !== 0) {
            fits = false;
            break;
          }
        }
        if (!fits) break;
      }
      if (!fits) continue;

      // 2b. Strict Tall Grass Canopy & Footprint Clearance
      for (let dy = -canopyOverhang; dy <= 1; dy++) {
        for (let dx = 0; dx < treeWidth; dx++) {
          const cy = y + dy;
          const cx = x + dx;
          if (tallGrassGrid[cy]?.[cx]) {
            fits = false;
            break;
          }
        }
        if (!fits) break;
      }
      if (!fits) continue;

      // Enforce strict root clearance
      let overlapsRoots = false;
      for (let i = rawTrees.length - 1; i >= 0; i--) {
        const other = rawTrees[i]!;
        if (y - other.y >= TREE_TRUNK_HEIGHT) break;
        const reqDx = forceDenseTree ? Math.min(treeWidth, other.width) : Math.max(treeWidth, other.width);
        if (Math.abs(x - other.x) < reqDx) {
          overlapsRoots = true;
          break;
        }
      }
      if (overlapsRoots) continue;

      // 3. Canopy overhead clearance
      for (let dy = -canopyOverhang; dy < 0; dy++) {
        for (let dx = 0; dx < treeWidth; dx++) {
          const cy = y + dy;
          const cx = x + dx;
          if (
            cy < 0 || cy >= H || cx < 0 || cx >= W ||
            urbanBlocked[cy]?.[cx] ||
            stairBlocked[cy]?.[cx] ||
            (continent.heightmap[cy]?.[cx] ?? 0) !== 0 ||
            continent.resolvedMountain.occupiedFootCells[cy]?.[cx]
          ) {
            fits = false;
            break;
          }
        }
        if (!fits) break;
      }
      if (!fits) continue;

      // Check species isolation
      if (!forceDenseTree && (prefabFile === 'poke_tree_oak_yellow.png' || prefabFile === 'poke_tree_oak_clean.png')) {
        const opposingSpecies = prefabFile === 'poke_tree_oak_yellow.png'
          ? 'poke_tree_oak_clean.png'
          : 'poke_tree_oak_yellow.png';
        let tooClose = false;
        for (let dy = -TREE_SPECIES_ISOLATION_DISTANCE; dy <= TREE_SPECIES_ISOLATION_DISTANCE; dy++) {
          const cy = y + dy;
          if (cy < 0 || cy >= H) continue;
          for (let dx = -TREE_SPECIES_ISOLATION_DISTANCE; dx <= TREE_SPECIES_ISOLATION_DISTANCE; dx++) {
            const cx = x + dx;
            if (cx < 0 || cx >= W) continue;
            if (treeSpeciesGrid[cy]![cx] === opposingSpecies && Math.hypot(dx, dy) < TREE_SPECIES_ISOLATION_DISTANCE) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) break;
        }
        if (tooClose) continue;
      }

      rawTrees.push({
        x,
        y,
        width: treeWidth,
        height: treeHeight,
        prefabFile
      });

      for (let dy = 0; dy < TREE_TRUNK_HEIGHT; dy++) {
        for (let dx = 0; dx < treeWidth; dx++) {
          treeOccupied[y + dy]![x + dx] = true;
          treeSpeciesGrid[y + dy]![x + dx] = prefabFile;
        }
      }
    }
  }
}
