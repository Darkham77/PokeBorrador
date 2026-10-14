// Procedural Map Autotiling & Multitile Stamping Engine

import type { TileCollision } from './tilesRegistry.ts';
import type { MapCell } from '../../types/map/proceduralMapTypes.ts';
import type {
  MultitileTemplate,
  ThemeBiomePalette
} from './proceduralBiomePalettes.ts';

export function overlapsPath(
  sx: number,
  sy: number,
  w: number,
  h: number,
  isPath: readonly (readonly boolean[])[]
): boolean {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = sx + dx;
      const py = sy + dy;
      if (py < isPath.length && px < (isPath[py]?.length ?? 0) && isPath[py]![px]) {
        return true;
      }
    }
  }
  return false;
}

export function canStamp(
  objLayer: readonly (readonly (MapCell | null)[])[],
  elevLayer: readonly (readonly (MapCell | null)[])[],
  isPath: readonly (readonly boolean[])[],
  w: number,
  h: number,
  sx: number,
  sy: number
): boolean {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = sx + dx;
      const py = sy + dy;
      if (
        py >= objLayer.length ||
        px >= (objLayer[py]?.length ?? 0) ||
        objLayer[py]![px] !== null ||
        elevLayer[py]![px] !== null ||
        isPath[py]![px]
      ) {
        return false;
      }
    }
  }
  return true;
}

export function stampMultitile(
  targetLayer: (MapCell | null)[][],
  collisionGrid: TileCollision[][],
  template: MultitileTemplate,
  startX: number,
  startY: number,
  mapWidth: number,
  mapHeight: number,
  makeCell: (tileId: string, collision: TileCollision) => MapCell
): void {
  for (let r = 0; r < template.height; r++) {
    for (let c = 0; c < template.width; c++) {
      const gx = startX + c;
      const gy = startY + r;
      if (gx >= 0 && gx < mapWidth && gy >= 0 && gy < mapHeight) {
        const tileId = template.tiles[r]?.[c];
        if (tileId) {
          const coll = template.collision[r]?.[c] ?? false;
          targetLayer[gy]![gx] = makeCell(tileId, coll);
          collisionGrid[gy]![gx] = coll;
        }
      }
    }
  }
}

export function resolvePathAutotiling(
  isPathCell: boolean[][],
  palette: ThemeBiomePalette,
  baseLayer: (MapCell | null)[][],
  width: number,
  height: number,
  makeCell: (tileId: string, collision: TileCollision) => MapCell
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isPathCell[y]![x]) continue;

      const hasN = y > 0 && isPathCell[y - 1]![x];
      const hasS = y < height - 1 && isPathCell[y + 1]![x];
      const hasW = x > 0 && isPathCell[y]![x - 1];
      const hasE = x < width - 1 && isPathCell[y]![x + 1];

      let pathTileId: string;

      if (!hasN && !hasW && (hasS || hasE)) {
        pathTileId = palette.path.topLeft;
      } else if (!hasN && !hasE && (hasS || hasW)) {
        pathTileId = palette.path.topRight;
      } else if (!hasS && !hasW && (hasN || hasE)) {
        pathTileId = palette.path.bottomLeft;
      } else if (!hasS && !hasE && (hasN || hasW)) {
        pathTileId = palette.path.bottomRight;
      } else if (!hasN && hasS) {
        pathTileId = palette.path.top;
      } else if (!hasS && hasN) {
        pathTileId = palette.path.bottom;
      } else if (!hasW && hasE) {
        pathTileId = palette.path.left;
      } else if (!hasE && hasW) {
        pathTileId = palette.path.right;
      } else {
        pathTileId = palette.path.center;
      }

      baseLayer[y]![x] = makeCell(pathTileId, false);
    }
  }
}
