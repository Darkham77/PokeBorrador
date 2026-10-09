/**
 * src/logic/map/coastalHarborPlacementEngine.ts
 *
 * COASTAL HARBOR & PORT DOCK PLACEMENT ENGINE
 *
 * Places authentic GBA coastal port docks and ferry piers on the coastline:
 *   1. Anchored at the sand beach-to-ocean interface with elevation 0.
 *   2. Directly facing open water with >= 8 to 14 tiles of ocean depth for ferry navigation.
 *   3. Assigned authentic GBA port structures (e.g. Vermilion Harbor Cottage, Long House).
 *   4. Zero open-ocean wooden bridges: maritime travel connects via Ferry service.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode, CardinalDirection, POIGateway } from '../../types/map/poiTypes.ts';
import { resolvePortGateAsset } from './canvasLandmarkRenderer.ts';

export interface PortBuildingOption {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Authentic GBA port buildings randomly assigned to coastal harbor docks
 */
export const PORT_DOCK_BUILDINGS: readonly PortBuildingOption[] = [
  { file: 'house_wood_brown.png', width: 4, height: 4 },
  { file: 'house_purple.png', width: 5, height: 4 },
  { file: 'house_blue.png', width: 6, height: 4 }
] as const;

export interface HarborPlacementContext {
  readonly continentMap: ContinentMapResult;
  readonly placedNodes: POINode[];
  readonly isAreaFree: (x: number, y: number, w: number, h: number, margin?: number) => boolean;
  readonly markAreaOccupied: (x: number, y: number, w: number, h: number) => void;
  readonly getMinDistanceToPlaced: (x: number, y: number) => number;
  readonly nextRng: () => number;
}

/**
 * Places coastal harbor port docks with ferry piers facing open ocean waters.
 */
export function placeCoastalHarborDocks(ctx: HarborPlacementContext): void {
  const { continentMap, placedNodes, isAreaFree, markAreaOccupied, getMinDistanceToPlaced } = ctx;
  const W = continentMap.width;
  const H = continentMap.height;

  const portCount = 1;

  for (let pIdx = 0; pIdx < portCount; pIdx++) {
    const portId = 'vermilion_port';
    const portName = 'Puerto Carmín';

    let bestPort: { x: number; y: number; facing: CardinalDirection } | null = null;
    let bestScore = -Infinity;

    const testDirs: readonly CardinalDirection[] = ['south', 'east', 'west', 'north'];
    for (let y = 3; y < H - 10; y += 1) {
      for (let x = 3; x < W - 10; x += 1) {
        for (const dir of testDirs) {
          const candW = dir === 'west' || dir === 'east' ? 6 : 7;
          const candH = dir === 'west' || dir === 'east' ? 7 : 6;
          if (x + candW >= W - 3 || y + candH >= H - 3) continue;
          if (!isAreaFree(x, y, candW, candH, 1)) continue;

          // Exclude offshore archipelago islands to guarantee mainland port placement
          if (continentMap.archipelagoIslands && continentMap.archipelagoIslands.length > 0) {
            let onIsland = false;
            for (const island of continentMap.archipelagoIslands) {
              if (
                x + candW >= island.bounds.minX - 2 &&
                x <= island.bounds.maxX + 2 &&
                y + candH >= island.bounds.minY - 2 &&
                y <= island.bounds.maxY + 2
              ) {
                onIsland = true;
                break;
              }
            }
            if (onIsland) continue;
          }

          // 1. Entire building footprint MUST sit on flat land (sand or grass)
          let allLand = true;
          let touchesCoast = false;
          for (let dy = 0; dy < candH; dy++) {
            for (let dx = 0; dx < candW; dx++) {
              const terr = continentMap.terrainMatrix[y + dy]?.[x + dx];
              const elev = continentMap.heightmap[y + dy]?.[x + dx] ?? 0;
              if ((terr !== 'sand' && terr !== 'grass') || elev !== 0) {
                allLand = false;
                break;
              }
              if (terr === 'sand') {
                touchesCoast = true;
              }
            }
            if (!allLand) break;
          }
          if (!allLand || !touchesCoast) continue;

          // 2. Check open water depth in dir (require at least 6 tiles of open ocean)
          let depth = 0;
          if (dir === 'south') {
            for (let dy = 1; dy <= 14; dy++) {
              const py = y + candH - 1 + dy;
              if (py >= H) break;
              let allW = true;
              for (let dx = 0; dx < candW; dx++) {
                if (continentMap.terrainMatrix[py]?.[x + dx] !== 'water') {
                  allW = false;
                  break;
                }
              }
              if (!allW) break;
              depth++;
            }
          } else if (dir === 'north') {
            for (let dy = 1; dy <= 14; dy++) {
              const py = y - dy;
              if (py < 0) break;
              let allW = true;
              for (let dx = 0; dx < candW; dx++) {
                if (continentMap.terrainMatrix[py]?.[x + dx] !== 'water') {
                  allW = false;
                  break;
                }
              }
              if (!allW) break;
              depth++;
            }
          } else if (dir === 'east') {
            for (let dx = 1; dx <= 14; dx++) {
              const px = x + candW - 1 + dx;
              if (px >= W) break;
              let allW = true;
              for (let dy = 0; dy < candH; dy++) {
                if (continentMap.terrainMatrix[y + dy]?.[px] !== 'water') {
                  allW = false;
                  break;
                }
              }
              if (!allW) break;
              depth++;
            }
          } else if (dir === 'west') {
            for (let dx = 1; dx <= 14; dx++) {
              const px = x - dx;
              if (px < 0) break;
              let allW = true;
              for (let dy = 0; dy < candH; dy++) {
                if (continentMap.terrainMatrix[y + dy]?.[px] !== 'water') {
                  allW = false;
                  break;
                }
              }
              if (!allW) break;
              depth++;
            }
          }

          if (depth < 6) continue;

          // 3. Check doorway clearance inland
          let gwX = x;
          let gwY = y;
          if (dir === 'south') {
            gwX = x + Math.floor(candW / 2);
            gwY = y - 1;
          } else if (dir === 'north') {
            gwX = x + Math.floor(candW / 2);
            gwY = y + candH;
          } else if (dir === 'east') {
            gwX = x - 1;
            gwY = y + Math.floor(candH / 2);
          } else if (dir === 'west') {
            gwX = x + candW;
            gwY = y + Math.floor(candH / 2);
          }

          if (gwX < 0 || gwX >= W || gwY < 0 || gwY >= H) continue;
          const cell = continentMap.cells[gwY]?.[gwX];
          if (!cell || !cell.isWalkable || cell.elevation !== 0 || continentMap.resolvedMountain.occupiedFootCells[gwY]?.[gwX] || continentMap.terrainMatrix[gwY]?.[gwX] === 'water') {
            continue;
          }

          // 4. Count inland clear cells
          let inlandCount = 0;
          if (dir === 'south') {
            const cy = y - 1;
            if (cy >= 0) {
              for (let dx = 0; dx < candW; dx++) {
                const c = continentMap.cells[cy]?.[x + dx];
                if (c && c.isWalkable && c.elevation === 0 && !continentMap.resolvedMountain.occupiedFootCells[cy]?.[x + dx] && continentMap.terrainMatrix[cy]?.[x + dx] !== 'water') inlandCount++;
              }
            }
          } else if (dir === 'north') {
            const cy = y + candH;
            if (cy < H) {
              for (let dx = 0; dx < candW; dx++) {
                const c = continentMap.cells[cy]?.[x + dx];
                if (c && c.isWalkable && c.elevation === 0 && !continentMap.resolvedMountain.occupiedFootCells[cy]?.[x + dx] && continentMap.terrainMatrix[cy]?.[x + dx] !== 'water') inlandCount++;
              }
            }
          } else if (dir === 'east') {
            const cx = x - 1;
            if (cx >= 0) {
              for (let dy = 0; dy < candH; dy++) {
                const c = continentMap.cells[y + dy]?.[cx];
                if (c && c.isWalkable && c.elevation === 0 && !continentMap.resolvedMountain.occupiedFootCells[y + dy]?.[cx] && continentMap.terrainMatrix[y + dy]?.[cx] !== 'water') inlandCount++;
              }
            }
          } else if (dir === 'west') {
            const cx = x + candW;
            if (cx < W) {
              for (let dy = 0; dy < candH; dy++) {
                const c = continentMap.cells[y + dy]?.[cx];
                if (c && c.isWalkable && c.elevation === 0 && !continentMap.resolvedMountain.occupiedFootCells[y + dy]?.[cx] && continentMap.terrainMatrix[y + dy]?.[cx] !== 'water') inlandCount++;
              }
            }
          }

          const d = getMinDistanceToPlaced(x, y);
          const totalScore = d + (dir === 'south' ? 6 : 0) + depth + inlandCount * 3;
          const minPortDist = Math.min(W, H) <= 128 ? 6 : 8;
          if (d >= minPortDist && totalScore > bestScore) {
            bestScore = totalScore;
            bestPort = { x, y, facing: dir };
          }
        }
      }
    }

    if (bestPort) {
      const portWidth = bestPort.facing === 'west' || bestPort.facing === 'east' ? 6 : 7;
      const portHeight = bestPort.facing === 'west' || bestPort.facing === 'east' ? 7 : 6;
      const portBuildingFile = resolvePortGateAsset(bestPort.facing);

      const inlandGateway: POIGateway =
        bestPort.facing === 'south'
          ? { x: bestPort.x + Math.floor(portWidth / 2), y: Math.max(0, bestPort.y - 1), direction: 'north' }
          : bestPort.facing === 'north'
            ? { x: bestPort.x + Math.floor(portWidth / 2), y: Math.min(H - 1, bestPort.y + portHeight), direction: 'south' }
            : bestPort.facing === 'east'
              ? { x: Math.max(0, bestPort.x - 1), y: bestPort.y + Math.floor(portHeight / 2), direction: 'west' }
              : { x: Math.min(W - 1, bestPort.x + portWidth), y: bestPort.y + Math.floor(portHeight / 2), direction: 'east' };

      const node: POINode = {
        id: portId,
        name: portName,
        type: 'port_dock',
        footprint: { width: portWidth, height: portHeight },
        terrainPreference: 'coast_water',
        gridX: bestPort.x,
        gridY: bestPort.y,
        elevation: 0,
        facing: bestPort.facing,
        buildingFile: portBuildingFile,
        gateways: [inlandGateway],
        hasGym: false
      };
      placedNodes.push(node);
      markAreaOccupied(bestPort.x, bestPort.y, portWidth, portHeight);
    }
  }
}
