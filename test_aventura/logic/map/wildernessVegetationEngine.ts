/**
 * src/logic/map/wildernessVegetationEngine.ts
 *
 * WILDERNESS, TALL GRASS & ROUTE ENFRAMING VEGETATION ENGINE
 *
 * Enforces canonical GBA environmental storytelling:
 *   1. Route Enframing: Routes maintain a 1-2 cell clear transition buffer.
 *   2. Tall Grass Encounter Fields: 3x3 to 5x5 patches placed in valley clearings adjacent to routes.
 *   3. Roadside Props: Dispersed wooden fences (poke_fence_wood_h.png) and flower clusters (poke_flowers_red.png).
 *   4. Dense Tree Masses: Fills remaining wilderness with multi-cell tree canopies (oaks in valleys, pines near cliffs).
 *   5. Strict Y-Sorting: Tree instances are sorted strictly North-to-South (Y ascending) so lower canopies overlap upper bases correctly.
 */

import { SimplexNoise } from './noise/simplexNoise.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import { sealRouteGateFlankBarriers } from './routeGateBarrierEngine.ts';
import { placeRoadsideProps } from './roadsidePropsEngine.ts';
import { placeTallGrassPatches } from './tallGrassPlacementEngine.ts';
import { placeTreeMasses } from './treeMassPlacementEngine.ts';
import { buildWildernessOccupancyMasks } from './wildernessOccupancyMaskEngine.ts';

export interface TallGrassPatch {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TreePlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly prefabFile: string;
}

export type WildernessPropType = 'flower' | 'fence_h' | 'fence_v' | 'boulder' | 'bush' | 'log' | 'sapling' | 'signpost';

export interface WildernessPropPlacement {
  readonly type: WildernessPropType;
  readonly x: number;
  readonly y: number;
  readonly prefabFile: string;
}

export interface WildernessLayerResult {
  readonly tallGrassGrid: boolean[][];
  readonly tallGrassPatches: readonly TallGrassPatch[];
  readonly trees: readonly TreePlacement[]; // Guaranteed Y-sorted North to South
  readonly props: readonly WildernessPropPlacement[];
}

export interface WildernessOptions {
  readonly seed?: number;
  readonly tallGrassPatchCount?: number;
  readonly transitableGrid?: readonly (readonly boolean[])[];
  readonly reservedEntityCells?: ReadonlySet<string>;
}

import {
  WILDERNESS_DEFAULT_SEED,
  WILDERNESS_PRNG_OFFSET,
  TALL_GRASS_MIN_PATCHES,
  TALL_GRASS_MAX_PATCHES,
  TALL_GRASS_DENSITY_DIVISOR,
} from '../../config/wildernessConfig.ts';

/**
 * Generates wilderness vegetation, tall grass encounter zones, and roadside framing.
 */
export function generateWildernessLayer(
  continent: ContinentMapResult,
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  options?: WildernessOptions
): WildernessLayerResult {
  const W = continent.width;
  const H = continent.height;
  const seed = options?.seed ?? WILDERNESS_DEFAULT_SEED;
  const transitableGrid = options?.transitableGrid;
  const prng = new SimplexNoise(seed + WILDERNESS_PRNG_OFFSET);

  const tallGrassGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const tallGrassPatches: TallGrassPatch[] = [];
  const props: WildernessPropPlacement[] = [];
  const rawTrees: TreePlacement[] = [];

  // 1. Build Clearance & Occupancy Masks
  const { treeBlocked, urbanBlocked, stairBlocked } = buildWildernessOccupancyMasks(
    continent,
    pois,
    pathGrid,
    options
  );

  // 2. Generate Tall Grass Encounter Patches (4x3 to 8x6) in corridors along paths
  const targetPatches = options?.tallGrassPatchCount ?? Math.max(TALL_GRASS_MIN_PATCHES, Math.min(Math.floor((W * H) / TALL_GRASS_DENSITY_DIVISOR), TALL_GRASS_MAX_PATCHES));
  const tallGrassBlocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (const poi of pois) {
    if (poi.type === 'dungeon_forest') {
      for (let dy = 0; dy < poi.footprint.height; dy++) {
        for (let dx = 0; dx < poi.footprint.width; dx++) {
          const cy = poi.gridY + dy;
          const cx = poi.gridX + dx;
          if (cy >= 0 && cy < H && cx >= 0 && cx < W) {
            tallGrassBlocked[cy]![cx] = true;
          }
        }
      }
    }
  }

  placeTallGrassPatches({
    H,
    W,
    continent,
    pathGrid,
    transitableGrid,
    urbanBlocked,
    tallGrassBlocked,
    stairBlocked,
    prng,
    targetPatches,
    pois,
    tallGrassGrid,
    tallGrassPatches,
    treeBlocked
  });

  // 3. Structured Roadside Props & Micro-Vignettes (Continuous Fences, Signposts, Cliff Boulders, Bushes & Flowers)
  placeRoadsideProps({
    pois,
    H,
    W,
    pathGrid,
    tallGrassGrid,
    continent,
    urbanBlocked,
    stairBlocked,
    prng,
    treeBlocked,
    props
  });

  // 4. Dense Tree Enframing in Wilderness Background (Organic Cúmulos & Groves)
  placeTreeMasses({
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
  });

  // 5. Route Gate Flank Sealing & Anti-Bypass Barriers
  // Seal flanks of every route checkpoint with canonical fences, dense trees, and BFS verification
  for (const poi of pois) {
    if (poi.type === 'route_gate') {
      sealRouteGateFlankBarriers({
        continent,
        gate: poi,
        trees: rawTrees,
        props,
        pathGrid,
        blockedMask: treeBlocked
      });
    }
  }

  // 6. Strict Y-Sorting Guarantee:
  // Sort trees by Y ascending so that north trees blit first, and south tree canopies overlap their bases!
  const trees = [...rawTrees].sort((a, b) => a.y - b.y || a.x - b.x);

  return {
    tallGrassGrid,
    tallGrassPatches,
    trees,
    props
  };
}
