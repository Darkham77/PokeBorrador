// Topography and Elevation Stamping Engine for Procedural Overworld Maps

import type { TileCollision } from './tilesRegistry.ts';
import type { MapCell } from '../../types/map/proceduralMapTypes.ts';
import type { ThemeBiomePalette } from './proceduralBiomePalettes.ts';
import type { BiomeDistributionResult } from './biomeDistributionEngine.ts';
import { canStamp, stampMultitile } from './proceduralAutotileEngine.ts';
import {
  DEFAULT_PROCEDURAL_MAP_MIN_DIMENSION,
  MOUNTAIN_CONE_CELLS_DIVISOR
} from '../../config/proceduralMapConfig.ts';

export interface OrganicWaterBodiesOptions {
  readonly withWater: boolean;
  readonly width: number;
  readonly height: number;
  readonly biomeDist: BiomeDistributionResult;
  readonly isPathCell: readonly (readonly boolean[])[];
  readonly elevationLayer: (MapCell | null)[][];
  readonly collisionGrid: TileCollision[][];
  readonly palette: ThemeBiomePalette;
  readonly makeCell: (tileId: string, collision: TileCollision) => MapCell;
}

export function stampOrganicWaterBodies(options: OrganicWaterBodiesOptions): void {
  const {
    withWater,
    width,
    height,
    biomeDist,
    isPathCell,
    elevationLayer,
    collisionGrid,
    palette,
    makeCell
  } = options;

  if (!withWater || width < DEFAULT_PROCEDURAL_MAP_MIN_DIMENSION || height < DEFAULT_PROCEDURAL_MAP_MIN_DIMENSION) {
    return;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!biomeDist.waterMask[y]![x] || isPathCell[y]![x] || elevationLayer[y]![x] !== null) continue;

      const hasN = y > 0 && biomeDist.waterMask[y - 1]![x] && !isPathCell[y - 1]![x] && elevationLayer[y - 1]![x] === null;
      const hasS = y < height - 1 && biomeDist.waterMask[y + 1]![x] && !isPathCell[y + 1]![x] && elevationLayer[y + 1]![x] === null;
      const hasW = x > 0 && biomeDist.waterMask[y]![x - 1] && !isPathCell[y]![x - 1] && elevationLayer[y]![x - 1] === null;
      const hasE = x < width - 1 && biomeDist.waterMask[y]![x + 1] && !isPathCell[y]![x + 1] && elevationLayer[y]![x + 1] === null;

      let waterId: string;

      if (!hasN && !hasW) waterId = palette.water.topLeft;
      else if (!hasN && !hasE) waterId = palette.water.topRight;
      else if (!hasS && !hasW) waterId = palette.water.bottomLeft;
      else if (!hasS && !hasE) waterId = palette.water.bottomRight;
      else if (!hasN) waterId = palette.water.top;
      else if (!hasS) waterId = palette.water.bottom;
      else if (!hasW) waterId = palette.water.left;
      else if (!hasE) waterId = palette.water.right;
      else waterId = palette.water.center;

      elevationLayer[y]![x] = makeCell(waterId, 'water');
      collisionGrid[y]![x] = 'water';
    }
  }
}

export interface ElevationCliffsAndConesOptions {
  readonly withHills: boolean;
  readonly withTown: boolean;
  readonly width: number;
  readonly height: number;
  readonly mountainPercent: number;
  readonly biomeDist: BiomeDistributionResult;
  readonly isPathCell: readonly (readonly boolean[])[];
  readonly elevationLayer: (MapCell | null)[][];
  readonly objectLayer: (MapCell | null)[][];
  readonly collisionGrid: TileCollision[][];
  readonly palette: ThemeBiomePalette;
  readonly makeCell: (tileId: string, collision: TileCollision) => MapCell;
}

export function stampElevationCliffsAndCones(options: ElevationCliffsAndConesOptions): void {
  const {
    withHills,
    withTown,
    width,
    height,
    mountainPercent,
    biomeDist,
    isPathCell,
    elevationLayer,
    objectLayer,
    collisionGrid,
    palette,
    makeCell
  } = options;

  if (!withHills || withTown || width < DEFAULT_PROCEDURAL_MAP_MIN_DIMENSION || height < DEFAULT_PROCEDURAL_MAP_MIN_DIMENSION) {
    return;
  }

  if (palette.cliff) {
    const topTile = palette.cliff.top;
    const faceTile = palette.cliff.face;
    const leftTile = palette.cliff.left ?? topTile;
    const rightTile = palette.cliff.right ?? topTile;

    const stampCliffRow = (y: number) => {
      let runStart = -1;
      for (let x = 2; x <= width - 3; x++) {
        const isMountain = biomeDist.mountainMask[y]![x] && biomeDist.mountainMask[y + 1]![x];
        const isClear =
          !isPathCell[y]![x] &&
          !isPathCell[y + 1]![x] &&
          elevationLayer[y]![x] === null &&
          elevationLayer[y + 1]![x] === null &&
          objectLayer[y]![x] === null &&
          objectLayer[y + 1]![x] === null;

        if (isMountain && isClear) {
          if (runStart === -1) runStart = x;
          continue;
        }

        if (runStart !== -1 && x - runStart >= 3) {
          const runEnd = x - 1;
          for (let cx = runStart; cx <= runEnd; cx++) {
            const tId = cx === runStart ? leftTile : cx === runEnd ? rightTile : topTile;
            elevationLayer[y]![cx] = makeCell(tId, true);
            elevationLayer[y + 1]![cx] = makeCell(faceTile, true);
            collisionGrid[y]![cx] = true;
            collisionGrid[y + 1]![cx] = true;
          }
        }
        runStart = -1;
      }
      if (runStart !== -1 && width - 2 - runStart >= 3) {
        for (let cx = runStart; cx < width - 2; cx++) {
          elevationLayer[y]![cx] = makeCell(topTile, true);
          elevationLayer[y + 1]![cx] = makeCell(faceTile, true);
          collisionGrid[y]![cx] = true;
          collisionGrid[y + 1]![cx] = true;
        }
      }
    };

    for (let y = 2; y <= height - 4; y += 3) {
      stampCliffRow(y);
    }
  } else {
    const cone = palette.mountainCone2x3;
    let placedCones = 0;
    const maxCones = Math.min(8, Math.max(2, Math.floor((width * height * (mountainPercent / 100)) / MOUNTAIN_CONE_CELLS_DIVISOR)));

    for (let y = 1; y <= height - cone.height - 1; y += 2) {
      for (let x = 1; x <= width - cone.width - 1; x += 2) {
        if (!biomeDist.mountainMask[y]![x] || isPathCell[y]![x]) continue;
        if (!canStamp(objectLayer, elevationLayer, isPathCell, cone.width, cone.height, x, y)) continue;

        stampMultitile(elevationLayer, collisionGrid, cone, x, y, width, height, makeCell);
        placedCones++;
        if (placedCones >= maxCones) break;
      }
      if (placedCones >= maxCones) break;
    }
  }
}
