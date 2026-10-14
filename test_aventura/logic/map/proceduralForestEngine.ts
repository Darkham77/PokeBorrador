// Procedural Forest Border & Wilderness Canopy Stamping Engine

import type { TileCollision } from './tilesRegistry.ts';
import type { MapCell, MapType } from '../../types/map/proceduralMapTypes.ts';
import type { ThemeBiomePalette } from './proceduralBiomePalettes.ts';
import type { BiomeDistributionResult } from './biomeDistributionEngine.ts';
import { overlapsPath, canStamp, stampMultitile } from './proceduralAutotileEngine.ts';
import { MIN_INTERIOR_TREES_MAP_DIMENSION } from '../../config/proceduralMapConfig.ts';

export interface ForestAndCanopyOptions {
  readonly withVegetation: boolean;
  readonly width: number;
  readonly height: number;
  readonly mapType: MapType;
  readonly withTown: boolean;
  readonly palette: ThemeBiomePalette;
  readonly biomeDist: BiomeDistributionResult;
  readonly isPathCell: readonly (readonly boolean[])[];
  readonly elevationLayer: (MapCell | null)[][];
  readonly objectLayer: (MapCell | null)[][];
  readonly collisionGrid: TileCollision[][];
  readonly makeCell: (tileId: string, collision: TileCollision) => MapCell;
}

export function stampPerimeterForestAndCanopy(options: ForestAndCanopyOptions): void {
  const {
    withVegetation,
    width,
    height,
    mapType,
    withTown,
    palette,
    biomeDist,
    isPathCell,
    elevationLayer,
    objectLayer,
    collisionGrid,
    makeCell
  } = options;

  if (!withVegetation) return;

  const treeTpl = palette.tree2x3;

  // Top perimeter border
  for (let x = 0; x <= width - treeTpl.width; x += treeTpl.width) {
    if (!overlapsPath(x, 0, treeTpl.width, treeTpl.height, isPathCell)) {
      stampMultitile(objectLayer, collisionGrid, treeTpl, x, 0, width, height, makeCell);
    }
  }

  // Bottom perimeter border
  const bottomY = height - treeTpl.height;
  for (let x = 0; x <= width - treeTpl.width; x += treeTpl.width) {
    if (!overlapsPath(x, bottomY, treeTpl.width, treeTpl.height, isPathCell)) {
      stampMultitile(objectLayer, collisionGrid, treeTpl, x, bottomY, width, height, makeCell);
    }
  }

  // Left perimeter border
  for (let y = treeTpl.height; y < bottomY; y += treeTpl.height) {
    if (!overlapsPath(0, y, treeTpl.width, treeTpl.height, isPathCell)) {
      stampMultitile(objectLayer, collisionGrid, treeTpl, 0, y, width, height, makeCell);
    }
  }

  // Right perimeter border
  const rightX = width - treeTpl.width;
  for (let y = treeTpl.height; y < bottomY; y += treeTpl.height) {
    if (!overlapsPath(rightX, y, treeTpl.width, treeTpl.height, isPathCell)) {
      stampMultitile(objectLayer, collisionGrid, treeTpl, rightX, y, width, height, makeCell);
    }
  }

  // In Route mode: fill the entire negative space outside the route corridor with dense interlocking tree walls
  if (mapType === 'route') {
    const corridorRadius = 4;
    const isCorridor: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
    const markCorridorCell = (px: number, py: number, dx: number, dy: number) => {
      const cy = py + dy;
      const cx = px + dx;
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) return;
      if (Math.abs(dx) + Math.abs(dy) <= corridorRadius + 1) {
        isCorridor[cy]![cx] = true;
      }
    };

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        if (!isPathCell[py]![px]) continue;
        for (let dy = -corridorRadius; dy <= corridorRadius; dy++) {
          for (let dx = -corridorRadius; dx <= corridorRadius; dx++) {
            markCorridorCell(px, py, dx, dy);
          }
        }
      }
    }

    // Fill non-corridor wilderness with dense canopy trees in staggered pattern
    for (let y = 1; y <= height - treeTpl.height - 1; y += 2) {
      const xOffset = ((Math.floor(y / 2) % 2) === 1) ? 1 : 0;
      for (let x = 1 + xOffset; x <= width - treeTpl.width - 1; x += 2) {
        let overlapsCorridor = false;
        for (let ty = 0; ty < treeTpl.height && !overlapsCorridor; ty++) {
          for (let tx = 0; tx < treeTpl.width; tx++) {
            if (isCorridor[y + ty]?.[x + tx] || isPathCell[y + ty]?.[x + tx]) {
              overlapsCorridor = true;
              break;
            }
          }
        }

        if (!overlapsCorridor && canStamp(objectLayer, elevationLayer, isPathCell, treeTpl.width, treeTpl.height, x, y)) {
          stampMultitile(objectLayer, collisionGrid, treeTpl, x, y, width, height, makeCell);
        }
      }
    }
  }

  // 7. Interior Standalone Trees governed by Biome Distribution Engine
  if (width >= MIN_INTERIOR_TREES_MAP_DIMENSION && height >= MIN_INTERIOR_TREES_MAP_DIMENSION && !withTown) {
    const standaloneTpl = palette.standaloneTree ?? treeTpl;
    let placedInteriorTrees = 0;
    for (let y = 4; y <= height - standaloneTpl.height - 4; y += 4) {
      for (let x = 4; x <= width - standaloneTpl.width - 4; x += 4) {
        if (!biomeDist.forestMask[y]![x]) continue;
        if (!canStamp(objectLayer, elevationLayer, isPathCell, standaloneTpl.width, standaloneTpl.height, x, y)) continue;

        stampMultitile(objectLayer, collisionGrid, standaloneTpl, x, y, width, height, makeCell);
        placedInteriorTrees++;
        if (placedInteriorTrees >= 3) break;
      }
      if (placedInteriorTrees >= 3) break;
    }
  }
}
