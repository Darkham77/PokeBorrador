/**
 * test_aventura/logic/map/waterLandmarkPlacementEngine.ts
 *
 * WATER LANDMARK PLACEMENT & NATURAL ISLET SCULPTING ENGINE
 *
 * Places Shrines in inland freshwater lakes and Lighthouses in coastal bays,
 * naturally sculpting islets with grass/sand layers and re-resolving coastlines.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode, POIGateway } from '../../types/map/poiTypes.ts';
import { resolveWaterCoastGrid, type ResolvedWaterMapResult, type WaterTerrainKind } from './waterAutotileEngine.ts';
import { computeOceanGrid } from './routePathfinding.ts';
import type { RegionalPOITemplate } from './regionalPoiCatalog.ts';
import {
  COMPACT_MAP_THRESHOLD,
  LAKE_SHORE_SEARCH_MAX_RADIUS,
  COASTAL_SHORE_SEARCH_MAX_RADIUS,
  COMPACT_MIN_LANDMARK_DIST,
  STANDARD_MIN_LANDMARK_DIST,
  WATER_LANDMARK_MAX_DIST_CLAMP,
  WATER_LANDMARK_SCORE_BONUS
} from '../../config/poiPlacementConfig.ts';

const MAX_SHORE_SEARCH_RADIUS = 16 as const;

export interface WaterLandmarkPlacementContext {
  readonly continentMap: ContinentMapResult;
  readonly activeCatalog: readonly RegionalPOITemplate[];
  readonly placedNodes: POINode[];
  readonly isAreaFree: (x: number, y: number, w: number, h: number, margin?: number) => boolean;
  readonly markAreaOccupied: (x: number, y: number, w: number, h: number) => void;
  readonly getMinDistanceToPlaced: (x: number, y: number) => number;
}

/**
 * Places water landmarks (Shrines in lakes, Lighthouses in coastal bays).
 */
export function placeWaterLandmarks(ctx: WaterLandmarkPlacementContext): void {
  const { continentMap, activeCatalog, placedNodes, isAreaFree, markAreaOccupied, getMinDistanceToPlaced } = ctx;
  const W = continentMap.width;
  const H = continentMap.height;

  const isOcean = computeOceanGrid(continentMap);
  const waterTemplates = activeCatalog.filter((t) => t.type === 'water_landmark');

  for (const tmpl of waterTemplates) {
    let bestWater: { x: number; y: number } | null = null;
    let bestDist = -Infinity;
    const isLakeLandmark = tmpl.id === 'lake_shrine' || tmpl.name.toLowerCase().includes('lago');
    const isletMargin = isLakeLandmark ? 1 : 2;

    for (let y = isletMargin + 3; y < H - tmpl.height - isletMargin - 3; y += 1) {
      for (let x = isletMargin + 3; x < W - tmpl.width - isletMargin - 3; x += 1) {
        if (!isAreaFree(x - isletMargin, y - isletMargin, tmpl.width + isletMargin * 2, tmpl.height + isletMargin * 2, 1)) continue;

        let allWater = true;
        for (let dy = -isletMargin; dy < tmpl.height + isletMargin; dy++) {
          for (let dx = -isletMargin; dx < tmpl.width + isletMargin; dx++) {
            if (continentMap.terrainMatrix[y + dy]?.[x + dx] !== 'water') {
              allWater = false;
              break;
            }
          }
          if (!allWater) break;
        }

        if (allWater) {
          const cx = x + Math.floor(tmpl.width / 2);
          const cy = y + Math.floor(tmpl.height / 2);
          const isCandidateOcean = Boolean(isOcean[cy]?.[cx]);
          if (isLakeLandmark && isCandidateOcean) continue;
          if (!isLakeLandmark && !isCandidateOcean) continue;

          // Measure distance from candidate perimeter to nearest continental shore (grass or sand)
          let edgeDistToShore = Infinity;
          for (let dy = -MAX_SHORE_SEARCH_RADIUS; dy <= tmpl.height + MAX_SHORE_SEARCH_RADIUS; dy++) {
            for (let dx = -MAX_SHORE_SEARCH_RADIUS; dx <= tmpl.width + MAX_SHORE_SEARCH_RADIUS; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
                const terr = continentMap.terrainMatrix[ny]![nx]!;
                if (terr === 'grass' || terr === 'sand') {
                  const cdx = nx < x - isletMargin ? (x - isletMargin) - nx : nx > x + tmpl.width - 1 + isletMargin ? nx - (x + tmpl.width - 1 + isletMargin) : 0;
                  const cdy = ny < y - isletMargin ? (y - isletMargin) - ny : ny > y + tmpl.height - 1 + isletMargin ? ny - (y + tmpl.height - 1 + isletMargin) : 0;
                  const dist = Math.hypot(cdx, cdy);
                  if (dist < edgeDistToShore) edgeDistToShore = dist;
                }
              }
            }
          }

          const d = getMinDistanceToPlaced(cx, cy);

          // For lake landmarks: prefer inland freshwater lakes with 1 to 10 cells of water to shore
          const minShoreDist = isLakeLandmark ? 1 : 2;
          const maxShoreDist = isLakeLandmark ? LAKE_SHORE_SEARCH_MAX_RADIUS : COASTAL_SHORE_SEARCH_MAX_RADIUS;
          const idealDist = isLakeLandmark ? 2.0 : 6.0;
          const minLandmarkDist = W <= COMPACT_MAP_THRESHOLD ? COMPACT_MIN_LANDMARK_DIST : STANDARD_MIN_LANDMARK_DIST;

          if (edgeDistToShore >= minShoreDist && edgeDistToShore <= maxShoreDist && d >= minLandmarkDist) {
            let score = -Math.abs(edgeDistToShore - idealDist) * 3.0 + Math.min(d, WATER_LANDMARK_MAX_DIST_CLAMP);
            if (isLakeLandmark && !isCandidateOcean) {
              score += WATER_LANDMARK_SCORE_BONUS;
            } else if (!isLakeLandmark && isCandidateOcean) {
              score += WATER_LANDMARK_SCORE_BONUS;
            }
            if (score > bestDist) {
              bestDist = score;
              bestWater = { x, y };
            }
          }
        }
      }
    }

    if (bestWater) {
      // Sculpt natural grassy/sandy islet (Route 12 guru house / lighthouse canonical style)
      // Lake landmarks in forests/plains: 100% pure grass islet without sand.
      // Coastal/ocean landmarks: central grass lawn surrounded by continuous 2-cell wide sand beach.
      const grassMargin = 1;
      const grassX1 = Math.max(1, bestWater.x - grassMargin);
      const grassX2 = Math.min(W - 2, bestWater.x + tmpl.width + (grassMargin - 1));
      const grassY1 = Math.max(1, bestWater.y - grassMargin);
      const grassY2 = Math.min(H - 2, bestWater.y + tmpl.height + (grassMargin - 1));

      const beachMargin = isLakeLandmark ? 0 : 2;
      const isletX1 = Math.max(1, grassX1 - beachMargin);
      const isletX2 = Math.min(W - 2, grassX2 + beachMargin);
      const isletY1 = Math.max(1, grassY1 - beachMargin);
      const isletY2 = Math.min(H - 2, grassY2 + beachMargin);

      for (let iy = isletY1; iy <= isletY2; iy++) {
        for (let ix = isletX1; ix <= isletX2; ix++) {
          const isOuterCorner =
            (ix === isletX1 && iy === isletY1) ||
            (ix === isletX2 && iy === isletY1) ||
            (ix === isletX1 && iy === isletY2) ||
            (ix === isletX2 && iy === isletY2);

          if (isLakeLandmark) {
            if (isOuterCorner) continue;
          } else {
            // For ocean islets, round outer sand corners so island is naturally curved
            if (isOuterCorner) continue;
          }

          // Round the grass core at corners into sand so no grass cell touches ocean water
          const isGrassCorner =
            !isLakeLandmark &&
            ((ix === grassX1 && iy === grassY1) ||
             (ix === grassX2 && iy === grassY1) ||
             (ix === grassX1 && iy === grassY2) ||
             (ix === grassX2 && iy === grassY2));

          const isGrass = isLakeLandmark || (!isGrassCorner && ix >= grassX1 && ix <= grassX2 && iy >= grassY1 && iy <= grassY2);
          const terr: WaterTerrainKind = isGrass ? 'grass' : 'sand';
          (continentMap.terrainMatrix as WaterTerrainKind[][])[iy]![ix] = terr;
          const cell = continentMap.cells[iy]![ix]!;
          (cell as { terrain: string }).terrain = terr;
          (cell as { isWalkable: boolean }).isWalkable = true;
          (cell as { elevation: number }).elevation = 0;
        }
      }

      // Re-resolve water & coast autotiles so the new islet and surrounding water have canonical shore autotiles
      (continentMap as { resolvedWater: ResolvedWaterMapResult }).resolvedWater = resolveWaterCoastGrid(
        continentMap.terrainMatrix
      );
      for (let iy = Math.max(0, isletY1 - 2); iy <= Math.min(H - 1, isletY2 + 2); iy++) {
        for (let ix = Math.max(0, isletX1 - 2); ix <= Math.min(W - 1, isletX2 + 2); ix++) {
          const cell = continentMap.cells[iy]![ix]!;
          const wCell = continentMap.resolvedWater.cellDetails[iy]?.[ix];
          (cell as { terrain: string }).terrain = continentMap.terrainMatrix[iy]![ix]!;
          (cell as { waterRole: string | undefined }).waterRole = wCell?.role;
        }
      }

      // Directional perimeter gateways:
      // For lake shrines, a single scenic southern gateway prevents artificial 4-way cross bridges
      const midIsletX = Math.floor((isletX1 + isletX2) / 2);
      const midIsletY = Math.floor((isletY1 + isletY2) / 2);
      const isletGateways: POIGateway[] = isLakeLandmark
        ? [{ x: midIsletX, y: isletY2, direction: 'south' }]
        : [
            { x: midIsletX, y: isletY1, direction: 'north' },
            { x: midIsletX, y: isletY2, direction: 'south' },
            { x: isletX2, y: midIsletY, direction: 'east' },
            { x: isletX1, y: midIsletY, direction: 'west' }
          ];

      const buildingFile = isLakeLandmark
        ? 'house_wood_flowers.png'
        : 'poke_port_lighthouse_beacon.png';

      const node: POINode = {
        id: tmpl.id,
        name: tmpl.name,
        type: tmpl.type,
        footprint: { width: tmpl.width, height: tmpl.height },
        terrainPreference: tmpl.preference,
        gridX: bestWater.x,
        gridY: bestWater.y,
        elevation: 0,
        gateways: isletGateways,
        buildingFile
      };
      placedNodes.push(node);
      markAreaOccupied(bestWater.x, bestWater.y, tmpl.width, tmpl.height);
    }
  }
}
