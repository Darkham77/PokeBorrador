/**
 * test_aventura/logic/map/wildernessOccupancyMaskEngine.ts
 *
 * WILDERNESS OCCUPANCY & CLEARANCE MASK ENGINE
 *
 * Pre-computes clearance masks for vegetation, urban layouts, mountain stairs,
 * water/cliff buffers, and route gates to prevent trees and tall grass
 * from encroaching on playable structures and corridors.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import type { WildernessOptions } from './wildernessVegetationEngine.ts';
import {
  PARSE_INT_DECIMAL_RADIX,
  ROUTE_GATE_CORRIDOR_LENGTH,
  ROUTE_GATE_CORRIDOR_HALF_WIDTH
} from '../../config/wildernessConfig.ts';

const CLIFF_SAFETY_VERTICAL_RADIUS = 2 as const;
const STAIR_CORRIDOR_NORTH_BUFFER = 2 as const;

export interface WildernessOccupancyMasks {
  readonly treeBlocked: boolean[][];
  readonly urbanBlocked: boolean[][];
  readonly stairBlocked: boolean[][];
}

interface BlockAreaTargets {
  readonly treeBlocked: boolean[][];
  readonly urbanBlocked: boolean[][];
}

function blockArea(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  height: number,
  targets: BlockAreaTargets
): void {
  const minX = Math.max(0, x1);
  const maxX = Math.min(width - 1, x2);
  const minY = Math.max(0, y1);
  const maxY = Math.min(height - 1, y2);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      targets.treeBlocked[y]![x] = true;
      targets.urbanBlocked[y]![x] = true;
    }
  }
}

function blockPoiLayoutElements(
  poi: POINode,
  width: number,
  height: number,
  targets: BlockAreaTargets
): void {
  if (poi.urbanLayout?.buildings) {
    for (const b of poi.urbanLayout.buildings) {
      blockArea(b.x - 1, b.y - 1, b.x + b.width, b.y + b.height, width, height, targets);
    }
  }
  if (poi.urbanLayout?.internalStreets) {
    for (const pt of poi.urbanLayout.internalStreets) {
      if (pt.y >= 0 && pt.y < height && pt.x >= 0 && pt.x < width) {
        targets.treeBlocked[pt.y]![pt.x] = true;
        targets.urbanBlocked[pt.y]![pt.x] = true;
      }
    }
  }
  if (poi.urbanLayout?.props) {
    for (const p of poi.urbanLayout.props) {
      if (p.y >= 0 && p.y < height && p.x >= 0 && p.x < width) {
        targets.treeBlocked[p.y]![p.x] = true;
        targets.urbanBlocked[p.y]![p.x] = true;
      }
    }
  }
}

/**
 * Builds treeBlocked, urbanBlocked, and stairBlocked clearance matrices.
 */
export function buildWildernessOccupancyMasks(
  continent: ContinentMapResult,
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  options?: WildernessOptions
): WildernessOccupancyMasks {
  const W = continent.width;
  const H = continent.height;

  const treeBlocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const urbanBlocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const stairBlocked: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  // 1.1 Water, Sand, Mountain Plateaus & Barren Biomes
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const isNotGrass = continent.terrainMatrix[y]![x] !== 'grass';
      const isElevated = (continent.heightmap[y]?.[x] ?? 0) > 0;
      const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x];
      const isBarrenBiome = mBiome === 'arid_desert' || mBiome === 'volcanic_plateau';

      if (isNotGrass || isElevated || isBarrenBiome) {
        treeBlocked[y]![x] = true;
      }
    }
  }

  // 1.2 Mountain cliffs & safety buffer
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const mCell = continent.resolvedMountain.cellDetails[y]?.[x];
      const isFoot = continent.resolvedMountain.occupiedFootCells[y]?.[x];
      const isCliffEdge = mCell && mCell.role !== 'floor_center';

      if (isFoot || isCliffEdge) {
        for (let dy = -CLIFF_SAFETY_VERTICAL_RADIUS; dy <= CLIFF_SAFETY_VERTICAL_RADIUS; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
              treeBlocked[ny]![nx] = true;
            }
          }
        }
      }
    }
  }

  // 1.3 Settlement Footprints & Individual Building Clearance
  if (options?.reservedEntityCells) {
    for (const key of options.reservedEntityCells) {
      const commaIdx = key.indexOf(',');
      if (commaIdx !== -1) {
        const cx = parseInt(key.slice(0, commaIdx), PARSE_INT_DECIMAL_RADIX);
        const cy = parseInt(key.slice(commaIdx + 1), PARSE_INT_DECIMAL_RADIX);
        if (cx >= 0 && cx < W && cy >= 0 && cy < H) {
          treeBlocked[cy]![cx] = true;
          urbanBlocked[cy]![cx] = true;
        }
      }
    }
  }

  const targetMasks: BlockAreaTargets = { treeBlocked, urbanBlocked };

  for (const poi of pois) {
    blockPoiLayoutElements(poi, W, H, targetMasks);

    if (poi.type === 'route_gate') {
      const isHoriz = poi.facing === 'east' || poi.facing === 'west';
      const b = poi.urbanLayout?.buildings[0];
      if (isHoriz) {
        const doorY = b ? b.y + b.height - 1 : poi.gridY + 6;
        const gateMinX = b ? b.x : poi.gridX + 1;
        const gateMaxX = b ? b.x + b.width : poi.gridX + 9;
        blockArea(
          gateMinX - ROUTE_GATE_CORRIDOR_LENGTH,
          doorY - ROUTE_GATE_CORRIDOR_HALF_WIDTH,
          gateMaxX + ROUTE_GATE_CORRIDOR_LENGTH,
          doorY + ROUTE_GATE_CORRIDOR_HALF_WIDTH,
          W,
          H,
          targetMasks
        );
      } else {
        const midX = b ? Math.floor(b.x + b.width / 2) : poi.gridX + 5;
        const gateMinY = b ? b.y : poi.gridY + 1;
        const gateMaxY = b ? b.y + b.height : poi.gridY + 8;
        blockArea(
          midX - ROUTE_GATE_CORRIDOR_HALF_WIDTH,
          gateMinY - ROUTE_GATE_CORRIDOR_LENGTH,
          midX + 1,
          gateMaxY + ROUTE_GATE_CORRIDOR_LENGTH,
          W,
          H,
          targetMasks
        );
      }
      continue;
    }

    if (poi.type === 'dungeon_forest') {
      continue;
    }

    blockArea(
      poi.gridX - 2,
      poi.gridY - 2,
      poi.gridX + poi.footprint.width + 1,
      poi.gridY + poi.footprint.height + 1,
      W,
      H,
      targetMasks
    );
  }

  // 1.4 Path Corridors
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pathGrid[y]![x]) {
        treeBlocked[y]![x] = true;
      }
    }
  }

  // 1.5 Mountain Stairs Corridors
  if (continent.placedStairs) {
    for (const stair of continent.placedStairs) {
      for (let dy = -STAIR_CORRIDOR_NORTH_BUFFER; dy <= 3; dy++) {
        for (let dx = -1; dx <= 2; dx++) {
          const sy = stair.y + dy;
          const sx = stair.x + dx;
          if (sy >= 0 && sy < H && sx >= 0 && sx < W) {
            treeBlocked[sy]![sx] = true;
            urbanBlocked[sy]![sx] = true;
            stairBlocked[sy]![sx] = true;
          }
        }
      }
    }
  }

  return { treeBlocked, urbanBlocked, stairBlocked };
}
