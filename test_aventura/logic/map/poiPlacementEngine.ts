/**
 * src/logic/map/poiPlacementEngine.ts
 *
 * INTELLIGENT REGIONAL POI & SETTLEMENT PLACEMENT ENGINE
 *
 * Distributes 15 to 22+ heterogeneous Points of Interest across procedural regional maps:
 *   - 'metropolis': Major commercial hubs on vast flat plains (8x8 to 10x10).
 *   - 'city': Gym cities on strategic plains or plateaus (6x6 to 7x7).
 *   - 'town': Smaller hamlets, starting towns, or villages (4x4 to 5x5).
 *   - 'dungeon_forest': Dense transitable forests with clearings (10x10 to 14x14).
 *   - 'cave_entrance': Anchored strictly on south-facing mountain cliff walls.
 *   - 'port_dock': Anchored at the sand beach-to-ocean interface.
 *   - 'route_gate': Border checkpoints and valley choke points.
 *   - 'water_landmark': Shrines or lighthouses on lakes or coastal lagoons.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode, POIGateway } from '../../types/map/poiTypes.ts';
import type { SettlementTerrainContext } from './cityLayoutEngine.ts';
import { placePokemonLeague } from './pokemonLeaguePlacementEngine.ts';
import { placeCoastalHarborDocks } from './coastalHarborPlacementEngine.ts';
import { placeWaterLandmarks } from './waterLandmarkPlacementEngine.ts';
import { placeDungeonForests } from './forestPlacementEngine.ts';
import { placeCaveEntrances } from './cavePlacementEngine.ts';
import {
  placePlainSettlements,
  placeRouteGateCheckpoints
} from './settlementPlainPlacementEngine.ts';

export interface POIPlacementOptions {
  readonly seed?: number;
  readonly targetCount?: number; // default: 18
  readonly minSettlementDistance?: number; // default: 8
  readonly generationMode?: 'preset' | 'procedural'; // default: 'preset'
  readonly targetUrbanSettlements?: number;
}

import { REGIONAL_POI_CATALOG, generateProceduralPOICatalog } from './regionalPoiCatalog.ts';

import {
  DEFAULT_POI_TARGET_COUNT,
  DEFAULT_POI_SEED,
  POI_LCG_MULTIPLIER,
  POI_LCG_INCREMENT,
  POI_LCG_DIVISOR,
  METROPOLIS_GATEWAY_OFFSET,
  CITY_GATEWAY_X,
  CITY_GATEWAY_Y,
  DEFAULT_MIN_SETTLEMENT_DISTANCE
} from '../../config/poiPlacementConfig.ts';

/**
 * Places heterogeneous POIs onto the continent map respecting strict terrain and clearance constraints.
 */
export function placeRegionalPOIs(
  continentMap: ContinentMapResult,
  options?: POIPlacementOptions
): readonly POINode[] {
  const generationMode = options?.generationMode ?? 'preset';
  const targetCount = options?.targetCount ?? DEFAULT_POI_TARGET_COUNT;
  const activeCatalog =
    generationMode === 'procedural'
      ? generateProceduralPOICatalog(targetCount)
      : REGIONAL_POI_CATALOG;
  const W = continentMap.width;
  const H = continentMap.height;
  const baseMinSettlementDist = options?.minSettlementDistance ?? DEFAULT_MIN_SETTLEMENT_DISTANCE;
  const placedNodes: POINode[] = [];

  let lcgSeed = options?.seed ?? DEFAULT_POI_SEED;
  const nextRng = (): number => {
    lcgSeed = (lcgSeed * POI_LCG_MULTIPLIER + POI_LCG_INCREMENT) | 0;
    return (lcgSeed >>> 0) / POI_LCG_DIVISOR;
  };

  // Reserved occupancy grid to prevent POI footprints from overlapping
  const occupied = Array.from({ length: H }, () => Array(W).fill(false));

  // Helper to check if a bounding box is free of existing POIs
  const isAreaFree = (bx: number, by: number, bw: number, bh: number, buffer = 2): boolean => {
    const minX = Math.max(0, bx - buffer);
    const maxX = Math.min(W - 1, bx + bw - 1 + buffer);
    const minY = Math.max(0, by - buffer);
    const maxY = Math.min(H - 1, by + bh - 1 + buffer);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (occupied[y]![x]) return false;
      }
    }
    return true;
  };

  // Helper to mark a bounding box as occupied
  const markAreaOccupied = (bx: number, by: number, bw: number, bh: number): void => {
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        if (y >= 0 && y < H && x >= 0 && x < W) {
          occupied[y]![x] = true;
        }
      }
    }
  };

  // Helper to find minimum distance to all previously placed settlements (center-to-center)
  const getMinDistanceToPlaced = (x: number, y: number): number => {
    if (placedNodes.length === 0) return Infinity;
    let minD = Infinity;
    for (const node of placedNodes) {
      const nodeCx = node.gridX + Math.floor(node.footprint.width / 2);
      const nodeCy = node.gridY + Math.floor(node.footprint.height / 2);
      const d = Math.hypot(nodeCx - x, nodeCy - y);
      if (d < minD) minD = d;
    }
    return minD;
  };

  const getSettlementContext = (): SettlementTerrainContext => ({
    heightmap: continentMap.heightmap,
    terrainMatrix: continentMap.terrainMatrix,
    occupiedFootCells: continentMap.resolvedMountain.occupiedFootCells,
    width: W,
    height: H
  });

  // Helper to compute perimeter gateways for a settlement aligned with internal avenues
  const computeNodeGateways = (
    gx: number,
    gy: number,
    w: number,
    h: number,
    type?: string
  ): POIGateway[] => {
    let northX = gx + Math.floor(w / 2);
    let southX = gx + Math.floor(w / 2);
    let westY = gy + Math.floor(h / 2);
    let eastY = gy + Math.floor(h / 2);

    if (type === 'metropolis') {
      northX = gx + METROPOLIS_GATEWAY_OFFSET;
      southX = gx + METROPOLIS_GATEWAY_OFFSET;
      westY = gy + METROPOLIS_GATEWAY_OFFSET;
      eastY = gy + METROPOLIS_GATEWAY_OFFSET;
    } else if (type === 'city') {
      northX = gx + CITY_GATEWAY_X;
      southX = gx + CITY_GATEWAY_X;
      westY = gy + CITY_GATEWAY_Y;
      eastY = gy + CITY_GATEWAY_Y;
    } else if (type === 'town') {
      const midAvenueX = gx + Math.floor(w / 2) - 1;
      const midAvenueY = gy + Math.floor(h / 2);
      northX = midAvenueX;
      southX = midAvenueX;
      westY = midAvenueY;
      eastY = midAvenueY;
    } else if (type === 'dungeon_forest') {
      const midX = gx + Math.floor(w / 2);
      return [
        { x: midX, y: gy, direction: 'north' },
        { x: midX, y: gy + h - 1, direction: 'south' }
      ];
    } else if (type === 'route_gate') {
      const midX = gx + Math.floor(w / 2);
      return [
        { x: midX, y: gy, direction: 'north' },
        { x: midX, y: gy + h - 1, direction: 'south' }
      ];
    }

    return [
      { x: northX, y: gy, direction: 'north' },
      { x: southX, y: gy + h - 1, direction: 'south' },
      { x: gx + w - 1, y: eastY, direction: 'east' },
      { x: gx, y: westY, direction: 'west' }
    ];
  };

  // 0. PLACE REGIONAL POKÉMON LEAGUE (Meseta Añil) FIRST (Northern Mountain Massif Anchor)
  placePokemonLeague({
    continentMap,
    activeCatalog,
    placedNodes,
    options,
    isAreaFree,
    markAreaOccupied,
    getSettlementContext
  });

  // 1. PLACE METROPOLIS, CITIES & TOWNS (Primary Regional Anchors)
  placePlainSettlements({
    continentMap,
    activeCatalog,
    placedNodes,
    isAreaFree,
    markAreaOccupied,
    getMinDistanceToPlaced,
    computeNodeGateways,
    getSettlementContext,
    baseMinSettlementDist
  });

  // 1.5 PLACE ROUTE GATE CHECKPOINTS (Dedicated active route checkpoints)
  placeRouteGateCheckpoints({
    continentMap,
    activeCatalog,
    placedNodes,
    isAreaFree,
    markAreaOccupied,
    getMinDistanceToPlaced,
    computeNodeGateways,
    getSettlementContext,
    baseMinSettlementDist
  });

  // 2. PLACE DUNGEON FORESTS (needs large flat grass plain in wilderness clearings)
  placeDungeonForests({
    continentMap,
    activeCatalog,
    placedNodes,
    isAreaFree,
    markAreaOccupied,
    getMinDistanceToPlaced,
    computeNodeGateways,
    getSettlementContext
  });

  // 3. PLACE CAVE ENTRANCES (must anchor strictly on south cliff wall faces)
  placeCaveEntrances({
    continentMap,
    activeCatalog,
    placedNodes,
    isAreaFree,
    markAreaOccupied,
    getMinDistanceToPlaced
  });

  // 4. PLACE COASTAL HARBOR DOCKS & FERRY PIERS
  placeCoastalHarborDocks({
    continentMap,
    placedNodes,
    isAreaFree,
    markAreaOccupied,
    getMinDistanceToPlaced,
    nextRng
  });

  // 5. PLACE WATER LANDMARKS (Shrines in lakes, Lighthouses in coastal bays)
  placeWaterLandmarks({
    continentMap,
    activeCatalog,
    placedNodes,
    isAreaFree,
    markAreaOccupied,
    getMinDistanceToPlaced
  });

  return placedNodes;
}
