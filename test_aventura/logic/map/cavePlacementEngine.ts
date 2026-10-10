/**
 * test_aventura/logic/map/cavePlacementEngine.ts
 *
 * REGIONAL CAVE ENTRANCE PLACEMENT ENGINE
 *
 * Anchors mountain cave entrances strictly on south cliff wall faces
 * with flat walkable grass approaches, lateral wall flanks, and deep massif backings.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import type { RegionalPOITemplate } from './regionalPoiCatalog.ts';
import {
  COMPACT_MAP_THRESHOLD,
  COMPACT_MIN_CAVE_DIST,
  STANDARD_MIN_CAVE_DIST,
  CAVE_SEARCH_MARGIN_BOTTOM_RIGHT
} from '../../config/poiPlacementConfig.ts';

export interface CavePlacementContext {
  readonly continentMap: ContinentMapResult;
  readonly activeCatalog: readonly RegionalPOITemplate[];
  readonly placedNodes: POINode[];
  readonly isAreaFree: (x: number, y: number, w: number, h: number, margin?: number) => boolean;
  readonly markAreaOccupied: (x: number, y: number, w: number, h: number) => void;
  readonly getMinDistanceToPlaced: (x: number, y: number) => number;
}

/**
 * Places cave entrances onto valid south cliff wall faces.
 */
export function placeCaveEntrances(ctx: CavePlacementContext): void {
  const { continentMap, activeCatalog, placedNodes, isAreaFree, markAreaOccupied, getMinDistanceToPlaced } = ctx;
  const W = continentMap.width;
  const H = continentMap.height;

  const caveTemplates = activeCatalog.filter((t) => t.type === 'cave_entrance');
  const caveCandidates: { x: number; y: number; elev: number }[] = [];

  for (let y = 4; y < H - CAVE_SEARCH_MARGIN_BOTTOM_RIGHT; y++) {
    for (let x = 4; x < W - CAVE_SEARCH_MARGIN_BOTTOM_RIGHT; x++) {
      const cell = continentMap.resolvedMountain.cellDetails[y]?.[x];

      if (
        cell &&
        cell.role === 'edge_south_top' &&
        cell.elevation >= 1 &&
        !cell.projectedFoot?.occupiesCell === false && // Not stairs
        isAreaFree(x, y, 1, 2, 2)
      ) {
        // Landing tile at y + 1 must be on flat walkable ground grass (elevation 0)
        const leftCell = continentMap.resolvedMountain.cellDetails[y]?.[x - 1];
        const rightCell = continentMap.resolvedMountain.cellDetails[y]?.[x + 1];
        const hasFlanks = leftCell?.role === 'edge_south_top' && rightCell?.role === 'edge_south_top';

        // Ground across foot and flanks must be flat grass at elevation 0
        let flatFoot = true;
        for (let dx = -1; dx <= 1; dx++) {
          if (continentMap.terrainMatrix[y + 1]?.[x + dx] !== 'grass') flatFoot = false;
          if ((continentMap.heightmap[y + 1]?.[x + dx] ?? 0) !== 0) flatFoot = false;
        }

        // Avoid placing caves right next to a jutting south cliff corner (x +- 2)
        const noJuttingCorner =
          (continentMap.heightmap[y + 1]?.[x - 2] ?? 0) === 0 &&
          (continentMap.heightmap[y + 1]?.[x + 2] ?? 0) === 0;

        // Deep solid mountain backing behind entrance (depth >= 3 tiles into massif)
        let hasDeepBacking = true;
        for (let dy = 1; dy <= 3; dy++) {
          if ((continentMap.heightmap[y - dy]?.[x] ?? 0) < cell.elevation) {
            hasDeepBacking = false;
            break;
          }
        }

        if (flatFoot && hasFlanks && noJuttingCorner && hasDeepBacking) {
          caveCandidates.push({ x, y, elev: cell.elevation });
        }
      }
    }
  }

  for (const tmpl of caveTemplates) {
    let bestCand: { x: number; y: number; elev: number } | null = null;
    let bestDist = -1;

    for (const cand of caveCandidates) {
      if (!isAreaFree(cand.x, cand.y, 1, 2, 2)) continue;
      const d = getMinDistanceToPlaced(cand.x, cand.y);
      const minCaveDist = Math.min(W, H) <= COMPACT_MAP_THRESHOLD ? COMPACT_MIN_CAVE_DIST : STANDARD_MIN_CAVE_DIST;
      if (d >= minCaveDist && d > bestDist) {
        bestDist = d;
        bestCand = cand;
      }
    }

    if (bestCand) {
      const node: POINode = {
        id: tmpl.id,
        name: tmpl.name,
        type: tmpl.type,
        footprint: { width: tmpl.width, height: tmpl.height },
        terrainPreference: tmpl.preference,
        gridX: bestCand.x,
        gridY: bestCand.y,
        elevation: bestCand.elev,
        facing: 'south',
        gateways: [{ x: bestCand.x, y: bestCand.y + 1, direction: 'south' }]
      };
      placedNodes.push(node);
      markAreaOccupied(bestCand.x, bestCand.y, 1, 2);
    }
  }
}
