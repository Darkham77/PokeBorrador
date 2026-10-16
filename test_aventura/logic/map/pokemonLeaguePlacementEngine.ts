/**
 * test_aventura/logic/map/pokemonLeaguePlacementEngine.ts
 *
 * REGIONAL POKÉMON LEAGUE PLACEMENT ENGINE (Meseta Añil)
 *
 * Places the Regional Pokémon League as a northern mountain massif anchor,
 * carved into elevated cliffs with a ceremonial avenue, monumental staircase,
 * and exclusive checkpoint gatehouse.
 */

import type {
  ContinentMapResult,
  MountainStairLocation,
  ResolvedMountainMapResult
} from './continentGenerator.ts';
import type { POINode, POIGateway } from '../../types/map/poiTypes.ts';
import type { POITemplate } from './regionalPoiCatalog.ts';
import type { POIPlacementOptions } from './poiPlacementEngine.ts';
import { generateSettlementLayout, type SettlementTerrainContext } from './cityLayoutEngine.ts';
import { clusterMountainMassifs, type GeologicalClusterResult } from './geologicalClusterEngine.ts';
import { resolveMountainMapGrid } from './mountainAutotileEngine.ts';
import {
  REGIONAL_MIN_SCALE_LEAGUE,
  LEAGUE_SEARCH_MAX_Y_RATIO,
  LEAGUE_SEARCH_CENTER_Y_RATIO,
  LEAGUE_ELEVATION_SCORE_WEIGHT,
  LEAGUE_PLATEAU_HEIGHT_OFFSET,
  LEAGUE_STAIRS_PRUNE_RADIUS,
  LEAGUE_SEARCH_MARGIN
} from '../../config/poiPlacementConfig.ts';

export interface PokemonLeaguePlacementContext {
  readonly continentMap: ContinentMapResult;
  readonly activeCatalog: readonly POITemplate[];
  readonly placedNodes: POINode[];
  readonly options?: POIPlacementOptions;
  readonly isAreaFree: (bx: number, by: number, bw: number, bh: number, buffer?: number) => boolean;
  readonly markAreaOccupied: (bx: number, by: number, bw: number, bh: number) => void;
  readonly getSettlementContext: () => SettlementTerrainContext;
}

/**
 * Places the regional Pokémon League if present in catalog and map scale allows.
 */
export function placePokemonLeague(ctx: PokemonLeaguePlacementContext): void {
  const {
    continentMap,
    activeCatalog,
    placedNodes,
    options,
    isAreaFree,
    markAreaOccupied,
    getSettlementContext
  } = ctx;
  const W = continentMap.width;
  const H = continentMap.height;

  const leagueTemplate = activeCatalog.find((t) => t.type === 'pokemon_league');
  if (!leagueTemplate || Math.min(W, H) < REGIONAL_MIN_SCALE_LEAGUE) {
    return;
  }

  let bestLeagueX = -1;
  let bestLeagueY = -1;
  let bestLeagueElev = 1;
  let bestScore = -Infinity;

  const lW = leagueTemplate.width;
  const lH = leagueTemplate.height;

  // Search strictly in the northern sector (y <= LEAGUE_SEARCH_MAX_Y_RATIO * H)
  const maxLeagueY = Math.round(H * LEAGUE_SEARCH_MAX_Y_RATIO) - lH;
  for (let y = LEAGUE_SEARCH_MARGIN; y <= maxLeagueY; y += 2) {
    for (let x = LEAGUE_SEARCH_MARGIN; x < W - lW - LEAGUE_SEARCH_MARGIN; x += 2) {
      if (!isAreaFree(x, y, lW, lH, 2)) continue;

      // Check mountain plateau clearance
      let totalElev = 0;
      let validPlateau = true;
      for (let dy = 0; dy < lH; dy++) {
        for (let dx = 0; dx < lW; dx++) {
          const elev = continentMap.heightmap[y + dy]?.[x + dx] ?? 0;
          const terr = continentMap.terrainMatrix[y + dy]?.[x + dx];
          if (terr === 'water' || terr === 'sand') {
            validPlateau = false;
            break;
          }
          totalElev += elev;
        }
        if (!validPlateau) break;
      }

      if (validPlateau) {
        // Score prioritizes higher elevation and central northern location
        const distToNorthCenter = Math.hypot(
          x + lW / 2 - W / 2,
          y + lH / 2 - H * LEAGUE_SEARCH_CENTER_Y_RATIO
        );
        const score = totalElev * LEAGUE_ELEVATION_SCORE_WEIGHT - distToNorthCenter;
        if (score > bestScore) {
          bestScore = score;
          bestLeagueX = x;
          bestLeagueY = y;
          bestLeagueElev = Math.max(1, continentMap.heightmap[y]![x] ?? 1);
        }
      }
    }
  }

  if (bestLeagueX === -1) {
    return;
  }

  const midAvenueX = bestLeagueX + Math.floor(lW / 2);
  const plateauH = lH - LEAGUE_PLATEAU_HEIGHT_OFFSET;
  for (let dy = 0; dy < lH; dy++) {
    for (let dx = 0; dx < lW; dx++) {
      const elev = dy < plateauH ? bestLeagueElev : 0;
      (continentMap.heightmap as number[][])[bestLeagueY + dy]![bestLeagueX + dx] = elev;
      const c = continentMap.cells[bestLeagueY + dy]?.[bestLeagueX + dx];
      if (c) (c as { elevation: number }).elevation = elev;
    }
  }

  // Monumental central staircase linking elevation 1 plateau to elevation 0 plain
  const stairX = midAvenueX - 1;
  const stairY = bestLeagueY + plateauH - 1;

  const currentStairs = (continentMap.placedStairs as MountainStairLocation[]).filter(
    (s) => Math.hypot(s.x - midAvenueX, s.y - (bestLeagueY + plateauH)) > LEAGUE_STAIRS_PRUNE_RADIUS
  );
  currentStairs.push({ x: stairX, y: stairY });
  (continentMap as { placedStairs: readonly MountainStairLocation[] }).placedStairs = currentStairs;

  // Re-run geological clustering so the entire contiguous League massif shares a single homogeneous palette
  const updatedClusters = clusterMountainMassifs({
    elevationMatrix: continentMap.heightmap,
    seed: options?.seed,
    defaultPalette: continentMap.mountainPalette
  });
  (continentMap as { geologicalClusters: GeologicalClusterResult }).geologicalClusters =
    updatedClusters;

  const mapH = continentMap.height;
  const mapW = continentMap.width;
  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      const c = continentMap.cells[y]?.[x];
      if (c) {
        (c as { mountainPalette?: string }).mountainPalette = updatedClusters.paletteMatrix[y]![x]!;
      }
    }
  }

  // Re-resolve mountain autotile grid so the entire League massif forms a solid unscalable cliff face
  const pal =
    updatedClusters.paletteMatrix[bestLeagueY]?.[bestLeagueX] ??
    continentMap.mountainPalette ??
    'brown';
  (continentMap as { resolvedMountain: ResolvedMountainMapResult }).resolvedMountain =
    resolveMountainMapGrid(continentMap.heightmap, {
      palette: pal,
      paletteMatrix: updatedClusters.paletteMatrix,
      stairs: currentStairs
    });

  const leagueGateways: POIGateway[] = [
    { x: midAvenueX, y: bestLeagueY + lH - 1, direction: 'south' }
  ];

  const node: POINode = {
    id: leagueTemplate.id,
    name: leagueTemplate.name,
    type: leagueTemplate.type,
    footprint: { width: lW, height: lH },
    terrainPreference: leagueTemplate.preference,
    gridX: bestLeagueX,
    gridY: bestLeagueY,
    elevation: bestLeagueElev,
    facing: 'south',
    gateways: leagueGateways,
    hasGym: false
  };

  const layout = generateSettlementLayout(node, getSettlementContext());
  (node as { urbanLayout?: typeof layout }).urbanLayout = layout;

  placedNodes.push(node);
  markAreaOccupied(bestLeagueX, bestLeagueY, lW, lH);
}
