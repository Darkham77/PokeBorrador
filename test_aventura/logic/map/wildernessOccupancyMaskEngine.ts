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

  for (const poi of pois) {
    if (poi.type === 'dungeon_forest' || poi.type === 'route_gate') {
      if (poi.urbanLayout?.buildings) {
        for (const b of poi.urbanLayout.buildings) {
          for (let dy = -1; dy <= b.height; dy++) {
            for (let dx = -1; dx <= b.width; dx++) {
              const ny = b.y + dy;
              const nx = b.x + dx;
              if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
                treeBlocked[ny]![nx] = true;
                urbanBlocked[ny]![nx] = true;
              }
            }
          }
        }
      }
      if (poi.urbanLayout?.internalStreets) {
        for (const pt of poi.urbanLayout.internalStreets) {
          if (pt.y >= 0 && pt.y < H && pt.x >= 0 && pt.x < W) {
            treeBlocked[pt.y]![pt.x] = true;
            urbanBlocked[pt.y]![pt.x] = true;
          }
        }
      }
      if (poi.urbanLayout?.props) {
        for (const p of poi.urbanLayout.props) {
          if (p.y >= 0 && p.y < H && p.x >= 0 && p.x < W) {
            treeBlocked[p.y]![p.x] = true;
            urbanBlocked[p.y]![p.x] = true;
          }
        }
      }

      if (poi.type === 'route_gate') {
        const isHoriz = poi.facing === 'east' || poi.facing === 'west';
        const b = poi.urbanLayout?.buildings[0];
        if (isHoriz) {
          const doorY = b ? b.y + b.height - 1 : poi.gridY + 6;
          const gateMinX = b ? b.x : poi.gridX + 1;
          const gateMaxX = b ? b.x + b.width : poi.gridX + 9;
          for (let x = Math.max(0, gateMinX - ROUTE_GATE_CORRIDOR_LENGTH); x <= Math.min(W - 1, gateMaxX + ROUTE_GATE_CORRIDOR_LENGTH); x++) {
            for (let y = Math.max(0, doorY - ROUTE_GATE_CORRIDOR_HALF_WIDTH); y <= Math.min(H - 1, doorY + ROUTE_GATE_CORRIDOR_HALF_WIDTH); y++) {
              treeBlocked[y]![x] = true;
              urbanBlocked[y]![x] = true;
            }
          }
        } else {
          const midX = b ? Math.floor(b.x + b.width / 2) : poi.gridX + 5;
          const gateMinY = b ? b.y : poi.gridY + 1;
          const gateMaxY = b ? b.y + b.height : poi.gridY + 8;
          for (let y = Math.max(0, gateMinY - ROUTE_GATE_CORRIDOR_LENGTH); y <= Math.min(H - 1, gateMaxY + ROUTE_GATE_CORRIDOR_LENGTH); y++) {
            for (let x = Math.max(0, midX - ROUTE_GATE_CORRIDOR_HALF_WIDTH); x <= Math.min(W - 1, midX + 1); x++) {
              treeBlocked[y]![x] = true;
              urbanBlocked[y]![x] = true;
            }
          }
        }
      }

      continue;
    }

    if (poi.urbanLayout?.buildings) {
      for (const b of poi.urbanLayout.buildings) {
        for (let dy = -1; dy <= b.height; dy++) {
          for (let dx = -1; dx <= b.width; dx++) {
            const ny = b.y + dy;
            const nx = b.x + dx;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
              treeBlocked[ny]![nx] = true;
              urbanBlocked[ny]![nx] = true;
            }
          }
        }
      }
    }

    const minX = Math.max(0, poi.gridX - 2);
    const maxX = Math.min(W - 1, poi.gridX + poi.footprint.width + 1);
    const minY = Math.max(0, poi.gridY - 2);
    const maxY = Math.min(H - 1, poi.gridY + poi.footprint.height + 1);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        treeBlocked[y]![x] = true;
        urbanBlocked[y]![x] = true;
      }
    }
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
