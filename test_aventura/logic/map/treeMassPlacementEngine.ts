/**
 * test_aventura/logic/map/treeMassPlacementEngine.ts
 *
 * DENSE WILDERNESS TREE MASS & ENFRAMING PLACEMENT ENGINE
 *
 * Pre-computes Cellular Automata mask (B5678/S45678) to consolidate dense tree masses,
 * places alpine pines and oaks respecting macro-biomes, enforces canopy clearances,
 * species isolation, and roots separation.
 */

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
  AUTUMN_DETAIL_NOISE_SCALE,
  AUTUMN_DETAIL_WARP_AMP,
  AUTUMN_MACRO_THRESHOLD,
  AUTUMN_BUFFER_THRESHOLD,
  AUTUMN_DENSE_TREE_THRESHOLD,
  GROVE_CLEARING_NOISE_SCALE,
  GROVE_PRIMARY_WEIGHT,
  GROVE_CLEARING_WEIGHT,
  FOREST_LATTICE_BREAK_SCALE,
  FOREST_LATTICE_BREAK_THRESHOLD,
  SUBTRACTIVE_WILDERNESS_BASE_THRESHOLD,
  SUBTRACTIVE_WILDERNESS_PATH_THRESHOLD
} from '../../config/wildernessConfig.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import { type SimplexNoise } from './noise/simplexNoise.ts';
import type { TreePlacement } from './wildernessVegetationEngine.ts';

const ROUTE_FRAME_RADIUS = 4 as const;
const DEEP_FOREST_CLEARANCE_RADIUS = 5 as const;
const PINE_GLADE_BREAK_NOISE_SCALE = 0.21 as const;
const PINE_GLADE_BREAK_THRESHOLD = 0.72 as const;
const BIOME_SEAM_TRANSITION_BUFFER = 1 as const;

function hasForeignBiomeWithinRadius(
  continent: ContinentMapResult,
  cx: number,
  cy: number,
  localBiome: string,
  radius: number
): boolean {
  const biomeGrid = continent.macroBiomes?.biomeGrid;
  if (!biomeGrid) return false;
  for (let dy = -radius; dy <= radius; dy++) {
    const row = biomeGrid[cy + dy];
    if (!row) continue;
    for (let dx = -radius; dx <= radius; dx++) {
      const nbBiome = row[cx + dx];
      if (nbBiome && nbBiome !== localBiome) return true;
    }
  }
  return false;
}

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

function isCellNearRouteCorridor(
  x: number,
  y: number,
  radius: number,
  pathGrid: readonly (readonly boolean[])[]
): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
      if (pathGrid[y + dy]?.[x + dx]) {
        return true;
      }
    }
  }
  return false;
}

function countForestMaskNeighbors(
  forestMask: readonly (readonly boolean[])[],
  x: number,
  y: number
): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (forestMask[y + dy]?.[x + dx]) count++;
    }
  }
  return count;
}

export interface ForestCASurvivalContext {
  readonly isForest: boolean;
  readonly neighbors: number;
  readonly isBlocked: boolean;
}

function evaluateForestCASurvival(context: ForestCASurvivalContext): boolean {
  const { isForest, neighbors, isBlocked } = context;
  if (isForest) {
    return neighbors >= FOREST_CA_SURVIVE_MIN;
  }
  return neighbors >= FOREST_CA_BORN_MIN && !isBlocked;
}

function isNearPathFrame(
  x: number,
  y: number,
  radius: number,
  pathGrid: readonly (readonly boolean[])[]
): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
      if (pathGrid[y + dy]?.[x + dx]) {
        return true;
      }
    }
  }
  return false;
}

function hasWaterClearanceForTree(
  x: number,
  y: number,
  treeWidth: number,
  canopyOverhang: number,
  W: number,
  H: number,
  continent: ContinentMapResult
): boolean {
  for (let dy = -canopyOverhang - 1; dy <= 2; dy++) {
    for (let dx = -1; dx <= treeWidth; dx++) {
      const cy = y + dy;
      const cx = x + dx;
      if (cy < 0 || cy >= H || cx < 0 || cx >= W) return false;
      const t = continent.terrainMatrix[cy]?.[cx];
      if (t === 'water' || t === 'water_deep') return false;
    }
  }
  return true;
}

function hasGroundFootprintClearance(
  x: number,
  y: number,
  treeWidth: number,
  trunkHeight: number,
  treeBlocked: readonly (readonly boolean[])[],
  treeOccupied: readonly (readonly boolean[])[],
  continent: ContinentMapResult
): boolean {
  for (let dy = 0; dy < trunkHeight; dy++) {
    for (let dx = 0; dx < treeWidth; dx++) {
      const cy = y + dy;
      const cx = x + dx;
      if (treeBlocked[cy]?.[cx] || treeOccupied[cy]?.[cx]) return false;
      if (
        continent.terrainMatrix[cy]?.[cx] !== 'grass' ||
        (continent.heightmap[cy]?.[cx] ?? 0) !== 0
      ) {
        return false;
      }
    }
  }
  return true;
}

function hasTallGrassCanopyClearance(
  x: number,
  y: number,
  treeWidth: number,
  canopyOverhang: number,
  tallGrassGrid: readonly (readonly boolean[])[]
): boolean {
  for (let dy = -canopyOverhang; dy <= 1; dy++) {
    for (let dx = 0; dx < treeWidth; dx++) {
      const cy = y + dy;
      const cx = x + dx;
      if (tallGrassGrid[cy]?.[cx]) return false;
    }
  }
  return true;
}

function hasCanopyOverheadClearance(
  x: number,
  y: number,
  treeWidth: number,
  canopyOverhang: number,
  W: number,
  H: number,
  urbanBlocked: readonly (readonly boolean[])[],
  stairBlocked: readonly (readonly boolean[])[],
  continent: ContinentMapResult,
  allowMountainShadow = false
): boolean {
  for (let dy = -canopyOverhang; dy < 0; dy++) {
    for (let dx = 0; dx < treeWidth; dx++) {
      const cy = y + dy;
      const cx = x + dx;
      if (
        cy < 0 ||
        cy >= H ||
        cx < 0 ||
        cx >= W ||
        urbanBlocked[cy]?.[cx] ||
        stairBlocked[cy]?.[cx]
      ) {
        return false;
      }
      if (
        !allowMountainShadow &&
        ((continent.heightmap[cy]?.[cx] ?? 0) !== 0 ||
          continent.resolvedMountain.occupiedFootCells[cy]?.[cx])
      ) {
        return false;
      }
    }
  }
  return true;
}

function isSpeciesTooClose(
  x: number,
  y: number,
  opposingSpecies: string,
  W: number,
  H: number,
  treeSpeciesGrid: readonly (readonly (string | null)[])[]
): boolean {
  for (let dy = -TREE_SPECIES_ISOLATION_DISTANCE; dy <= TREE_SPECIES_ISOLATION_DISTANCE; dy++) {
    const cy = y + dy;
    if (cy < 0 || cy >= H) continue;
    for (let dx = -TREE_SPECIES_ISOLATION_DISTANCE; dx <= TREE_SPECIES_ISOLATION_DISTANCE; dx++) {
      const cx = x + dx;
      if (cx < 0 || cx >= W) continue;
      if (
        treeSpeciesGrid[cy]![cx] === opposingSpecies &&
        Math.hypot(dx, dy) < TREE_SPECIES_ISOLATION_DISTANCE
      ) {
        return true;
      }
    }
  }
  return false;
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

      const nearCorridor = isCellNearRouteCorridor(x, y, ROUTE_FRAME_RADIUS, pathGrid);

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

        const neighbors = countForestMaskNeighbors(forestMask, x, y);
        const isBlocked = Boolean(treeBlocked[y]?.[x]);
        nextMask[y]![x] = evaluateForestCASurvival({
          isForest: Boolean(forestMask[y]![x]),
          neighbors,
          isBlocked
        });
      }
    }
    forestMask = nextMask;
  }

  // Iterate strictly from North to South (Y ascending), then West to East
  const treeOccupied: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const treeSpeciesGrid: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));

  for (let y = 3; y < H - 4; y += 1) {
    // Brick-stagger alternating trunk bands so conifers interlock naturally instead of forming vertical lanes
    const bandParity = (Math.floor(y / TREE_TRUNK_HEIGHT) + Math.abs(continent.seed)) % 2;
    const xStart = 2 + bandParity;
    for (let x = xStart; x < W - 4; x += 1) {
      let forceDenseTree = false;
      if (
        transitableGrid &&
        !transitableGrid[y]?.[x] &&
        continent.terrainMatrix[y]?.[x] === 'grass' &&
        (continent.heightmap[y]?.[x] ?? 0) === 0
      ) {
        forceDenseTree = true;
      }

      if (!forceDenseTree && !forestMask[y]![x]) continue;

      const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow';
      if (
        !forceDenseTree &&
        mBiome === 'mint_highland' &&
        hasForeignBiomeWithinRadius(continent, x, y, mBiome, BIOME_SEAM_TRANSITION_BUFFER)
      ) {
        continue;
      }
      let prefabFile: string;
      let treeWidth: number;
      let treeHeight: number;

      if (mBiome === 'mint_highland') {
        const nearBorderWall = isCellNearRouteCorridor(
          x,
          y,
          DEEP_FOREST_CLEARANCE_RADIUS,
          pathGrid
        );
        const pineGladeBreak = prng.noise2D(
          x * PINE_GLADE_BREAK_NOISE_SCALE,
          y * PINE_GLADE_BREAK_NOISE_SCALE
        );
        if (!forceDenseTree && !nearBorderWall && pineGladeBreak > PINE_GLADE_BREAK_THRESHOLD) {
          continue;
        }
        prefabFile = 'poke_tree_pine_small.png';
        treeWidth = PINE_WIDTH;
        treeHeight = PINE_HEIGHT;
      } else if (mBiome === 'viridian_forest') {
        prefabFile = 'poke_tree_oak_clean.png';
        treeWidth = OAK_WIDTH;
        treeHeight = OAK_HEIGHT;
      } else {
        const autumnMacroNoise = prng.noise2D(
          x * AUTUMN_MACRO_NOISE_SCALE,
          y * AUTUMN_MACRO_NOISE_SCALE
        );
        const autumnDetailNoise = prng.noise2D(
          x * AUTUMN_DETAIL_NOISE_SCALE,
          y * AUTUMN_DETAIL_NOISE_SCALE
        );
        const autumnNoise = autumnMacroNoise + autumnDetailNoise * AUTUMN_DETAIL_WARP_AMP;
        if (forceDenseTree) {
          prefabFile =
            autumnNoise > AUTUMN_DENSE_TREE_THRESHOLD
              ? 'poke_tree_oak_yellow.png'
              : 'poke_tree_oak_clean.png';
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

      const nearPath = isNearPathFrame(x, y, ROUTE_FRAME_RADIUS, pathGrid);

      const baseThreshold = SUBTRACTIVE_WILDERNESS_BASE_THRESHOLD;
      const threshold = nearPath ? SUBTRACTIVE_WILDERNESS_PATH_THRESHOLD : baseThreshold;
      const groveNoise = prng.noise2D(x * GROVE_NOISE_SCALE, y * GROVE_NOISE_SCALE);
      const clearingNoise = prng.noise2D(
        x * GROVE_CLEARING_NOISE_SCALE,
        y * GROVE_CLEARING_NOISE_SCALE
      );
      const organicGroveScore =
        groveNoise * GROVE_PRIMARY_WEIGHT + clearingNoise * GROVE_CLEARING_WEIGHT;

      if (!forceDenseTree && organicGroveScore < threshold) continue;
      if (
        !forceDenseTree &&
        !nearPath &&
        !isNearPathFrame(x, y, DEEP_FOREST_CLEARANCE_RADIUS, pathGrid)
      ) {
        const latticeBreakNoise = prng.noise2D(
          x * FOREST_LATTICE_BREAK_SCALE,
          y * FOREST_LATTICE_BREAK_SCALE
        );
        if (latticeBreakNoise > FOREST_LATTICE_BREAK_THRESHOLD) continue;
      }

      const canTryTreeCandidate = (w: number, h: number): boolean => {
        const oh = h - TREE_TRUNK_HEIGHT;
        if (!hasWaterClearanceForTree(x, y, w, oh, W, H, continent)) return false;
        if (
          !hasGroundFootprintClearance(
            x,
            y,
            w,
            TREE_TRUNK_HEIGHT,
            treeBlocked,
            treeOccupied,
            continent
          )
        ) {
          return false;
        }
        if (!hasTallGrassCanopyClearance(x, y, w, oh, tallGrassGrid)) return false;

        for (let i = rawTrees.length - 1; i >= 0; i--) {
          const other = rawTrees[i]!;
          if (y - other.y >= TREE_TRUNK_HEIGHT) break;
          const reqDx = forceDenseTree ? Math.min(w, other.width) : Math.max(w, other.width);
          if (Math.abs(x - other.x) < reqDx) return false;
        }

        return hasCanopyOverheadClearance(x, y, w, oh, W, H, urbanBlocked, stairBlocked, continent);
      };

      if (!canTryTreeCandidate(treeWidth, treeHeight)) {
        // Fill 2-tile-wide dense corridor gaps in temperate meadows with compact green forest trees
        if (
          forceDenseTree &&
          mBiome === 'temperate_meadow' &&
          prefabFile === 'poke_tree_oak_clean.png' &&
          canTryTreeCandidate(PINE_WIDTH, PINE_HEIGHT)
        ) {
          prefabFile = 'tree_viridian_forest.png';
          treeWidth = PINE_WIDTH;
          treeHeight = PINE_HEIGHT;
        } else {
          continue;
        }
      }

      // Check species isolation
      if (
        !forceDenseTree &&
        (prefabFile === 'poke_tree_oak_yellow.png' || prefabFile === 'poke_tree_oak_clean.png')
      ) {
        const opposingSpecies =
          prefabFile === 'poke_tree_oak_yellow.png'
            ? 'poke_tree_oak_clean.png'
            : 'poke_tree_oak_yellow.png';
        if (isSpeciesTooClose(x, y, opposingSpecies, W, H, treeSpeciesGrid)) {
          continue;
        }
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
