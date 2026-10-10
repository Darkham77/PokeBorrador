/**
 * test_aventura/logic/map/forestPlacementEngine.ts
 *
 * REGIONAL DUNGEON FOREST PLACEMENT ENGINE
 *
 * Distributes dense transitable forests (e.g. Viridian Forest) in large
 * flat wilderness grass clearings with internal trails and gateways.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode, POIGateway } from '../../types/map/poiTypes.ts';
import type { RegionalPOITemplate } from './regionalPoiCatalog.ts';
import { generateSettlementLayout, type SettlementTerrainContext } from './cityLayoutEngine.ts';
import {
  COMPACT_MAP_THRESHOLD,
  COMPACT_MIN_FOREST_DIST,
  STANDARD_MIN_FOREST_DIST,
  FOREST_URBAN_LAYOUT_MIN_WIDTH,
  FOREST_URBAN_LAYOUT_MIN_HEIGHT,
  FOREST_CANDIDATE_SIZES_MASSIVE,
  FOREST_CANDIDATE_SIZES_LARGE
} from '../../config/poiPlacementConfig.ts';

const REGIONAL_MASSIVE_DIMENSION = 200 as const;
const REGIONAL_LARGE_DIMENSION = 128 as const;

export interface ForestPlacementContext {
  readonly continentMap: ContinentMapResult;
  readonly activeCatalog: readonly RegionalPOITemplate[];
  readonly placedNodes: POINode[];
  readonly isAreaFree: (x: number, y: number, w: number, h: number, margin?: number) => boolean;
  readonly markAreaOccupied: (x: number, y: number, w: number, h: number) => void;
  readonly getMinDistanceToPlaced: (x: number, y: number) => number;
  readonly computeNodeGateways: (x: number, y: number, w: number, h: number, type: POINode['type']) => POIGateway[];
  readonly getSettlementContext: () => SettlementTerrainContext;
}

interface ForestBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const FOREST_MAP_MARGIN_CELLS = 8 as const;
const FOREST_SEARCH_STEP = 2 as const;

function findBestForestLocation(
  continentMap: ContinentMapResult,
  candidateSizes: readonly { readonly w: number; readonly h: number }[],
  isAreaFree: (x: number, y: number, w: number, h: number, margin?: number) => boolean,
  getMinDistanceToPlaced: (x: number, y: number) => number,
  W: number,
  H: number
): ForestBox | null {
  let candidate: ForestBox | null = null;
  let maxDist = -1;

  for (const size of candidateSizes) {
    const curW = size.w;
    const curH = size.h;

    for (let y = FOREST_MAP_MARGIN_CELLS; y < H - curH - FOREST_MAP_MARGIN_CELLS; y += FOREST_SEARCH_STEP) {
      for (let x = FOREST_MAP_MARGIN_CELLS; x < W - curW - FOREST_MAP_MARGIN_CELLS; x += FOREST_SEARCH_STEP) {
        let valid = true;
        for (let dy = 0; dy < curH; dy++) {
          for (let dx = 0; dx < curW; dx++) {
            const cx = x + dx;
            const cy = y + dy;
            if (
              continentMap.terrainMatrix[cy]?.[cx] !== 'grass' ||
              continentMap.heightmap[cy]?.[cx] !== 0 ||
              continentMap.resolvedMountain.occupiedFootCells[cy]?.[cx]
            ) {
              valid = false;
              break;
            }
          }
          if (!valid) break;
        }

        if (valid && isAreaFree(x, y, curW, curH, 2)) {
          const centerX = x + Math.floor(curW / 2);
          const centerY = y + Math.floor(curH / 2);
          const d = getMinDistanceToPlaced(centerX, centerY);
          const minForestDist = Math.min(W, H) <= COMPACT_MAP_THRESHOLD ? COMPACT_MIN_FOREST_DIST : STANDARD_MIN_FOREST_DIST;
          if (d >= minForestDist && d > maxDist) {
            maxDist = d;
            candidate = { x, y, w: curW, h: curH };
          }
        }
      }
    }
    if (candidate !== null) return candidate;
  }
  return candidate;
}

/**
 * Places dungeon forest POIs into wilderness clearings.
 */
export function placeDungeonForests(ctx: ForestPlacementContext): void {
  const {
    continentMap,
    activeCatalog,
    placedNodes,
    isAreaFree,
    markAreaOccupied,
    getMinDistanceToPlaced,
    computeNodeGateways,
    getSettlementContext
  } = ctx;
  const W = continentMap.width;
  const H = continentMap.height;

  const forestTemplates = activeCatalog.filter((t) => t.type === 'dungeon_forest');
  for (const tmpl of forestTemplates) {
    const candidateSizes = Math.min(W, H) >= REGIONAL_MASSIVE_DIMENSION
      ? [...FOREST_CANDIDATE_SIZES_MASSIVE, { w: tmpl.width, h: tmpl.height }]
      : Math.min(W, H) >= REGIONAL_LARGE_DIMENSION
        ? [...FOREST_CANDIDATE_SIZES_LARGE, { w: tmpl.width, h: tmpl.height }]
        : [{ w: tmpl.width, h: tmpl.height }];

    const bestForest = findBestForestLocation(
      continentMap,
      candidateSizes,
      isAreaFree,
      getMinDistanceToPlaced,
      W,
      H
    );

    if (bestForest) {
      const gateways = computeNodeGateways(bestForest.x, bestForest.y, bestForest.w, bestForest.h, tmpl.type);
      const node: POINode = {
        id: tmpl.id,
        name: tmpl.name,
        type: tmpl.type,
        footprint: { width: bestForest.w, height: bestForest.h },
        terrainPreference: tmpl.preference,
        gridX: bestForest.x,
        gridY: bestForest.y,
        elevation: 0,
        gateways
      };
      if (bestForest.w >= FOREST_URBAN_LAYOUT_MIN_WIDTH && bestForest.h >= FOREST_URBAN_LAYOUT_MIN_HEIGHT) {
        const layout = generateSettlementLayout(node, getSettlementContext());
        (node as { urbanLayout?: typeof layout }).urbanLayout = layout;
      }
      placedNodes.push(node);
      markAreaOccupied(bestForest.x, bestForest.y, bestForest.w, bestForest.h);
    }
  }
}
