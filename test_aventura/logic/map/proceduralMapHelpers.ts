/**
 * test_aventura/logic/map/proceduralMapHelpers.ts
 *
 * Dedicated helper utilities for procedural map generation.
 * Handles route corridor carving, collision matrix compilation,
 * spawn resolutions, base layer initialization, and path clearances.
 */

import type { TileCollision, TilesRegistryService } from './tilesRegistry.ts';
import type {
  CollisionType,
  MapCell,
  MapSpawn,
  MapType,
  MapWarp,
  ProceduralMapOptions
} from '../../types/map/proceduralMapTypes.ts';
import type { CanonicalThemeSource } from '../../types/map/adventureWorldTypes.ts';
import type { ThemeBiomePalette } from './proceduralBiomePalettes.ts';
import {
  DEFAULT_PROCEDURAL_MAP_MIN_DIMENSION,
  DEFAULT_PROCEDURAL_SEED,
  DEFAULT_TOWN_MIN_DIMENSION,
  DEFAULT_WATER_PERCENT,
  DEFAULT_MOUNTAIN_PERCENT,
  DEFAULT_PROCEDURAL_FOREST_PERCENT,
  GRASS_ACCENT_CHANCE,
  ROUTE_PATH_WIDTH_DIVISOR,
  ROUTE_START_X_BASE_RATIO,
  ROUTE_START_X_VARIANCE_RATIO,
  ROUTE_TURN_NORTH_RATIO,
  ROUTE_TURN_SOUTH_RATIO
} from '../../config/proceduralMapConfig.ts';
import {
  stampStructureInternal,
  registerStructureEntities
} from './structureStamper.ts';

/**
 * Resolves map dimensional bounds and generation flags
 */
export function resolveMapSettings(options: ProceduralMapOptions): {
  width: number;
  height: number;
  seed: number;
  theme: CanonicalThemeSource;
  mapType: MapType;
  withTown: boolean;
  withWater: boolean;
  withHills: boolean;
  withVegetation: boolean;
  waterPercent: number;
  mountainPercent: number;
  forestPercent: number;
} {
  const width = Math.max(DEFAULT_PROCEDURAL_MAP_MIN_DIMENSION, options.width);
  const height = Math.max(DEFAULT_PROCEDURAL_MAP_MIN_DIMENSION, options.height);
  const seed = options.seed ?? DEFAULT_PROCEDURAL_SEED;
  const theme = options.theme ?? 'firered';

  let mapType: MapType = 'town';
  if (options.type) {
    mapType = options.type;
  } else if (options.withTown === false) {
    mapType = 'route';
  } else if (theme === 'firered' && width >= DEFAULT_TOWN_MIN_DIMENSION && height >= DEFAULT_TOWN_MIN_DIMENSION) {
    mapType = 'town';
  }

  const withTown = mapType === 'town' && (options.withTown ?? true);
  const withWater = options.withWater ?? true;
  const withHills = options.withHills ?? true;
  const withVegetation = options.withVegetation ?? true;

  const waterPercent = withWater ? (options.waterPercent ?? DEFAULT_WATER_PERCENT) : 0;
  const mountainPercent = withHills ? (options.mountainPercent ?? DEFAULT_MOUNTAIN_PERCENT) : 0;
  const forestPercent = withVegetation ? (options.forestPercent ?? DEFAULT_PROCEDURAL_FOREST_PERCENT) : 0;

  return {
    width,
    height,
    seed,
    theme,
    mapType,
    withTown,
    withWater,
    withHills,
    withVegetation,
    waterPercent,
    mountainPercent,
    forestPercent
  };
}

/**
 * Allocates and initializes base grass layers and collision grids
 */
export function initBaseLayers(
  width: number,
  height: number,
  palette: ThemeBiomePalette,
  prng: () => number,
  makeCell: (tileId: string, collision: TileCollision) => MapCell
): {
  baseLayer: MapCell[][];
  elevationLayer: (MapCell | null)[][];
  objectLayer: (MapCell | null)[][];
  collisionGrid: TileCollision[][];
} {
  const baseLayer: MapCell[][] = [];
  const elevationLayer: (MapCell | null)[][] = [];
  const objectLayer: (MapCell | null)[][] = [];
  const collisionGrid: TileCollision[][] = [];

  for (let y = 0; y < height; y++) {
    baseLayer[y] = [];
    elevationLayer[y] = [];
    objectLayer[y] = [];
    collisionGrid[y] = [];
    for (let x = 0; x < width; x++) {
      const isAccent = prng() < GRASS_ACCENT_CHANCE && palette.grassAccents.length > 0;
      const grassId = isAccent ? palette.grassAccents[0]! : palette.grass;
      baseLayer[y]![x] = makeCell(grassId, false);
      elevationLayer[y]![x] = null;
      objectLayer[y]![x] = null;
      collisionGrid[y]![x] = false;
    }
  }

  return { baseLayer, elevationLayer, objectLayer, collisionGrid };
}

/**
 * Clears water and mountain biome masks over paths and structures
 */
export function clearBiomeMaskPaths(
  biomeDist: { waterMask: boolean[][]; mountainMask: boolean[][] },
  isPathCell: boolean[][],
  elevationLayer: (MapCell | null)[][],
  width: number,
  height: number
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isPathCell[y]![x] || elevationLayer[y]![x] !== null) {
        biomeDist.waterMask[y]![x] = false;
        biomeDist.mountainMask[y]![x] = false;
      }
    }
  }
}

/**
 * Stamps custom predefined structures onto layers
 */
export function stampCustomStructures(options: {
  structures?: ProceduralMapOptions['structures'];
  elevationLayer: (MapCell | null)[][];
  collisionGrid: TileCollision[][];
  objectLayer: (MapCell | null)[][];
  width: number;
  height: number;
  registry: TilesRegistryService;
  warps: MapWarp[];
  spawns: MapSpawn[];
}): void {
  const { structures, elevationLayer, collisionGrid, objectLayer, width, height, registry, warps, spawns } = options;
  if (!structures || structures.length === 0) return;

  for (const item of structures) {
    stampStructureInternal(
      elevationLayer,
      collisionGrid,
      objectLayer,
      item.template,
      item.x,
      item.y,
      width,
      height,
      registry
    );
    registerStructureEntities(warps, spawns, item.template, item.x, item.y, height);
  }
}

/**
 * Carves orthogonal route corridors for GBA-style routes
 */
export function carveRouteCorridors(
  width: number,
  height: number,
  prng: () => number,
  isPathCell: boolean[][]
): void {
  const pathWidth = Math.min(3, Math.max(2, Math.floor(width / ROUTE_PATH_WIDTH_DIVISOR)));
  const startX = Math.max(
    pathWidth + 3,
    Math.min(width - pathWidth - 4, Math.floor(width * (ROUTE_START_X_BASE_RATIO + (prng() - 0.5) * ROUTE_START_X_VARIANCE_RATIO)))
  );
  const endX = Math.max(
    pathWidth + 3,
    Math.min(width - pathWidth - 4, Math.floor(width * (0.5 + (prng() - 0.5) * 0.3)))
  );

  const turnY1 = Math.floor(height * ROUTE_TURN_NORTH_RATIO);
  const turnY2 = Math.floor(height * ROUTE_TURN_SOUTH_RATIO);
  const midX = Math.max(
    pathWidth + 3,
    Math.min(width - pathWidth - 4, Math.floor((startX + endX) / 2 + (prng() - 0.5) * 6))
  );

  const stampRect = (x0: number, y0: number, x1: number, y1: number) => {
    const minX = Math.max(2, Math.min(x0, x1));
    const maxX = Math.min(width - 3, Math.max(x0, x1));
    const minY = Math.max(0, Math.min(y0, y1));
    const maxY = Math.min(height - 1, Math.max(y0, y1));
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        isPathCell[py]![px] = true;
      }
    }
  };

  // 1. South vertical leg: from bottom (height - 1) up to turnY1
  stampRect(startX - Math.floor(pathWidth / 2), turnY1, startX + Math.ceil(pathWidth / 2) - 1, height - 1);

  // 2. Horizontal connector between turnY1 and middle leg
  stampRect(
    Math.min(startX, midX) - Math.floor(pathWidth / 2),
    turnY1 - Math.floor(pathWidth / 2),
    Math.max(startX, midX) + Math.ceil(pathWidth / 2) - 1,
    turnY1 + Math.ceil(pathWidth / 2) - 1
  );

  // 3. Middle vertical leg: from turnY1 to turnY2
  stampRect(midX - Math.floor(pathWidth / 2), turnY2, midX + Math.ceil(pathWidth / 2) - 1, turnY1);

  // 4. Horizontal connector to endX at turnY2
  stampRect(
    Math.min(midX, endX) - Math.floor(pathWidth / 2),
    turnY2 - Math.floor(pathWidth / 2),
    Math.max(midX, endX) + Math.ceil(pathWidth / 2) - 1,
    turnY2 + Math.ceil(pathWidth / 2) - 1
  );

  // 5. North vertical leg: from turnY2 up to top (0)
  stampRect(endX - Math.floor(pathWidth / 2), 0, endX + Math.ceil(pathWidth / 2) - 1, turnY2);
}

/**
 * Enforces path clearance invariant: paths must be transitable and devoid of obstacles
 */
export function enforcePathClearance(
  isPathCell: boolean[][],
  objectLayer: (MapCell | null)[][],
  elevationLayer: (MapCell | null)[][],
  collisionGrid: TileCollision[][],
  width: number,
  height: number
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isPathCell[y]![x]) {
        objectLayer[y]![x] = null;
        if (elevationLayer[y]![x]?.collision === true) {
          elevationLayer[y]![x] = null;
        }
        collisionGrid[y]![x] = false;
      }
    }
  }

  // Explicit solid corners for topology consistency
  collisionGrid[0]![0] = true;
  collisionGrid[0]![width - 1] = true;
  collisionGrid[height - 1]![0] = true;
  collisionGrid[height - 1]![width - 1] = true;
}

/**
 * Converts internal TileCollision grid into numeric collision matrix
 * 0: transitable, 1: obstacle, 2: water, 3: ledge
 */
export function buildCollisionMatrix(
  collisionGrid: TileCollision[][],
  width: number,
  height: number
): CollisionType[][] {
  const collisionMatrix: CollisionType[][] = [];
  for (let y = 0; y < height; y++) {
    collisionMatrix[y] = [];
    for (let x = 0; x < width; x++) {
      const col = collisionGrid[y]![x];
      if (col === 'water') {
        collisionMatrix[y]![x] = 2;
      } else if (col === 'ledge') {
        collisionMatrix[y]![x] = 3;
      } else if (col === true) {
        collisionMatrix[y]![x] = 1;
      } else {
        collisionMatrix[y]![x] = 0;
      }
    }
  }
  return collisionMatrix;
}

/**
 * Resolves player and navigation spawn points for routes and towns
 */
export function resolveMapSpawns(options: {
  mapType: MapType;
  withTown: boolean;
  width: number;
  height: number;
  branchX: number;
  midY: number;
  isPathCell: boolean[][];
  spawns: MapSpawn[];
}): void {
  const { mapType, withTown, width, height, branchX, midY, isPathCell, spawns } = options;

  if (mapType === 'town') {
    if (!withTown) {
      spawns.unshift({
        id: 'player_start',
        x: branchX,
        y: midY,
        direction: 'down'
      });
      spawns.push({
        id: 'town_exit_south',
        x: branchX,
        y: height - 2,
        direction: 'up'
      });
    }
    return;
  }

  let southX = Math.floor(width * 0.5);
  for (let x = 0; x < width; x++) {
    if (isPathCell[height - 2]?.[x]) {
      southX = x;
      break;
    }
  }
  spawns.push({
    id: 'player_start',
    x: southX,
    y: height - 2,
    direction: 'up'
  });

  let northX = Math.floor(width * 0.5);
  for (let x = 0; x < width; x++) {
    if (isPathCell[1]?.[x]) {
      northX = x;
      break;
    }
  }
  spawns.push({
    id: 'route_exit_north',
    x: northX,
    y: 1,
    direction: 'down'
  });
}

/**
 * Counts total placed tiles across all layers
 */
export function countTotalTilesPlaced(
  elevationLayer: (MapCell | null)[][],
  objectLayer: (MapCell | null)[][],
  width: number,
  height: number
): number {
  let totalPlaced = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      totalPlaced++;
      if (elevationLayer[y]![x]) totalPlaced++;
      if (objectLayer[y]![x]) totalPlaced++;
    }
  }
  return totalPlaced;
}
