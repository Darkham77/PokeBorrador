/**
 * test_aventura/logic/map/continent/corridorSignatureFeatures.ts
 *
 * Active terrain signature stamping driven by `RouteDesignSignature` (Phase 8D):
 *   - `wetland_puddle_marsh` (Route 120 style): stamps organic 2x2 / 3x2 shallow rain puddles
 *     into clear flat grass pockets flanking the route corridor.
 *   - `highland_river_gorge` (Route 119 style): stamps small freshwater spring pools beside
 *     highland route clearings away from cliffs, stairs, paths, and settlements.
 *
 * Strictly preserves route transitability, building footprints, cliff buffers, and autotile safety
 * (runs immediately before Phase 8b `healAllContinentDefects`).
 */

import type { POINode } from '../../../types/map/poiTypes.ts';
import type {
  EmbeddedCorridor,
  EnrichedCorridorProperties
} from '../../../types/map/pokemonGraphTypes.ts';
import type { ContinentMapResult } from '../continentGenerator.ts';
import type { WaterTerrainKind } from '../waterAutotileEngine.ts';

export interface CorridorSignatureFeatureInput {
  readonly continent: ContinentMapResult;
  readonly corridors: readonly EmbeddedCorridor[];
  readonly corridorProperties: readonly EnrichedCorridorProperties[];
  readonly pois: readonly POINode[];
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid: readonly (readonly boolean[])[];
  readonly seed: number;
}

const PUDDLE_MIN_PATH_CLEARANCE = 2 as const;
const PUDDLE_MIN_WATER_CLEARANCE = 2 as const;
const PUDDLE_MIN_POI_CLEARANCE = 3 as const;
const PUDDLE_CLUSTER_SEPARATION = 9 as const;
const MAX_PUDDLES_PER_MARSH_CORRIDOR = 3 as const;
const MAX_PUDDLES_PER_GORGE_CORRIDOR = 1 as const;
const PUDDLE_LATERAL_OFFSETS = [3, -3, 4, -4, 5, -5] as const;
const PUDDLE_STEP_STRIDE = 4 as const;
const PUDDLE_EDGE_SKIP = 3 as const;
const PUDDLE_MAP_BORDER_MARGIN = 6 as const;

function buildPoiBufferMask(pois: readonly POINode[], W: number, H: number): boolean[][] {
  const mask: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (const poi of pois) {
    const minX = Math.max(0, poi.gridX - PUDDLE_MIN_POI_CLEARANCE);
    const maxX = Math.min(W - 1, poi.gridX + poi.footprint.width + PUDDLE_MIN_POI_CLEARANCE);
    const minY = Math.max(0, poi.gridY - PUDDLE_MIN_POI_CLEARANCE);
    const maxY = Math.min(H - 1, poi.gridY + poi.footprint.height + PUDDLE_MIN_POI_CLEARANCE);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        mask[y]![x] = true;
      }
    }
  }
  return mask;
}

function isPuddleFootprintValid(
  ox: number,
  oy: number,
  pw: number,
  ph: number,
  continent: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid: readonly (readonly boolean[])[],
  poiMask: readonly (readonly boolean[])[]
): boolean {
  const W = continent.width;
  const H = continent.height;
  if (
    ox < PUDDLE_MAP_BORDER_MARGIN ||
    oy < PUDDLE_MAP_BORDER_MARGIN ||
    ox + pw >= W - PUDDLE_MAP_BORDER_MARGIN ||
    oy + ph >= H - PUDDLE_MAP_BORDER_MARGIN
  ) {
    return false;
  }

  for (let y = oy - PUDDLE_MIN_WATER_CLEARANCE; y < oy + ph + PUDDLE_MIN_WATER_CLEARANCE; y++) {
    for (let x = ox - PUDDLE_MIN_WATER_CLEARANCE; x < ox + pw + PUDDLE_MIN_WATER_CLEARANCE; x++) {
      if (x < 1 || x >= W - 1 || y < 1 || y >= H - 1) return false;
      const terr = continent.terrainMatrix[y]?.[x];
      const insideFootprint = x >= ox && x < ox + pw && y >= oy && y < oy + ph;
      const insidePathBuffer =
        x >= ox - PUDDLE_MIN_PATH_CLEARANCE &&
        x < ox + pw + PUDDLE_MIN_PATH_CLEARANCE &&
        y >= oy - PUDDLE_MIN_PATH_CLEARANCE &&
        y < oy + ph + PUDDLE_MIN_PATH_CLEARANCE;

      if (terr === 'water' || terr === 'water_deep') return false;
      if (insidePathBuffer) {
        if (terr !== 'grass') return false;
        if ((continent.heightmap[y]?.[x] ?? 0) > 0) return false;
        if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return false;
        if (pathGrid[y]?.[x] || bridgeGrid[y]?.[x] || poiMask[y]?.[x]) return false;
      }
      if (insideFootprint) {
        const biome = continent.macroBiomes?.biomeGrid[y]?.[x];
        if (biome === 'arid_desert' || biome === 'volcanic_plateau') return false;
      }
    }
  }
  return true;
}

interface PuddleStampRect {
  readonly ox: number;
  readonly oy: number;
  readonly pw: number;
  readonly ph: number;
}

function stampPuddleWaterCells(nextMatrix: WaterTerrainKind[][], rect: PuddleStampRect): void {
  for (let dy = 0; dy < rect.ph; dy++) {
    for (let dx = 0; dx < rect.pw; dx++) {
      nextMatrix[rect.oy + dy]![rect.ox + dx] = 'water';
    }
  }
}

/**
 * Stamps shallow organic rain puddles (`3x2` / `3x3` water pockets) flanking corridors whose
 * `RouteDesignSignature` is `wetland_puddle_marsh` or `highland_river_gorge`.
 * Returns a new `ContinentMapResult` with cloned `terrainMatrix` when puddles are stamped.
 */
export function stampCorridorSignatureTerrainFeatures(
  input: CorridorSignatureFeatureInput
): ContinentMapResult {
  const { continent, corridors, corridorProperties, pois, pathGrid, bridgeGrid, seed } = input;
  const W = continent.width;
  const H = continent.height;
  const sigByEdge = new Map(corridorProperties.map((p) => [p.corridorId, p.designSignature]));
  const poiMask = buildPoiBufferMask(pois, W, H);
  const nextMatrix: WaterTerrainKind[][] = continent.terrainMatrix.map((row) => [...row]);
  const workingContinent: ContinentMapResult = {
    ...continent,
    terrainMatrix: nextMatrix
  };
  const placedCenters: { readonly x: number; readonly y: number }[] = [];
  let stampedTotal = 0;

  for (const corridor of corridors) {
    if (corridor.kind === 'surf_route' || corridor.kind === 'wormhole_tunnel') continue;
    const sig = sigByEdge.get(corridor.id);
    if (sig !== 'wetland_puddle_marsh' && sig !== 'highland_river_gorge') continue;
    const maxForCorridor =
      sig === 'wetland_puddle_marsh'
        ? MAX_PUDDLES_PER_MARSH_CORRIDOR
        : MAX_PUDDLES_PER_GORGE_CORRIDOR;

    let placedForCorridor = 0;
    for (
      let i = PUDDLE_EDGE_SKIP;
      i < corridor.pathCells.length - PUDDLE_EDGE_SKIP && placedForCorridor < maxForCorridor;
      i += PUDDLE_STEP_STRIDE
    ) {
      const prev = corridor.pathCells[i - 1]!;
      const curr = corridor.pathCells[i]!;
      const isHoriz = Math.abs(curr.x - prev.x) >= Math.abs(curr.y - prev.y);
      const wide = ((seed + i + curr.x) & 1) === 0;
      const pw = 3;
      const ph = wide ? 3 : 2;

      for (const lat of PUDDLE_LATERAL_OFFSETS) {
        const ox = isHoriz ? curr.x - 1 : curr.x + lat;
        const oy = isHoriz ? curr.y + lat : curr.y - 1;
        const tooClose = placedCenters.some(
          (c) => Math.hypot(c.x - ox, c.y - oy) < PUDDLE_CLUSTER_SEPARATION
        );
        if (tooClose) continue;
        if (
          !isPuddleFootprintValid(ox, oy, pw, ph, workingContinent, pathGrid, bridgeGrid, poiMask)
        ) {
          continue;
        }
        stampPuddleWaterCells(nextMatrix, { ox, oy, pw, ph });
        placedCenters.push({ x: ox, y: oy });
        placedForCorridor++;
        stampedTotal++;
        break;
      }
    }
  }

  return stampedTotal > 0 ? workingContinent : continent;
}
