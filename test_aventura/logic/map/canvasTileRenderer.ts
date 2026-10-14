/**
 * test_aventura/logic/map/canvasTileRenderer.ts
 *
 * FULL 2D CANVAS GBA TILEMAP RENDERER (32x32 NATIVE RESOLUTION)
 *
 * Renders authentic GBA FireRed/Emerald regional maps with 32x32 tiles:
 *   Layer 1: Base Terrain (Ocean, Beaches, Coastlines, Inland Lakes, Grass Plains)
 *   Layer 2: Paved Stone Plazas in Settlements
 *   Layer 3: Autotiled Dirt Paths & Boardwalk Bridges (8-neighbor bitmask)
 *   Layer 4: 2.5D Mountain Cliffs, Stairs, South Feet & Plateau Rock Textures
 *   Layer 5: Tall Grass Encounter Fields
 *   Layer 6: Roadside Props & Urban Furnishing (Lamps, Fences, Flowers, Boulders)
 *   Layer 7: Architectural Buildings (Civic Centers, Pokecenters, Marts, Houses, Caves)
 *   Layer 8: Strict North-to-South Y-Sorted Trees (Wilderness & Dungeon Forests)
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode, SettlementBuilding } from '../../types/map/poiTypes.ts';
import type { WildernessLayerResult } from './wildernessVegetationEngine.ts';
import { renderBaseTerrainAndCliffs } from './canvasTerrainPathBlitter.ts';
import { collectStandingDepthEntities } from './canvasDepthEntityCollector.ts';
import type { ProgressionObstacle } from './progressionObstacleEngine.ts';
import type { MicroVignette } from './microVignetteEngine.ts';
import type { ResolvedRouteNetworkResult } from './routeNetworkEngine.ts';
import type { LedgeRun } from './routeLedgeEngine.ts';

import { CANVAS_RENDERER } from '../../config/canvasRendererConfig.ts';
import { CANVAS_TILE_SIZE } from '../../config/studioConstants.ts';
export { CANVAS_TILE_SIZE };
import type { TileBlitInstruction } from '../../types/map/autotileStudioTypes.ts';

export interface BuildMapBlitOptions {
  readonly portDockBridgeKeys?: ReadonlySet<string>;
  readonly ledges?: readonly LedgeRun[];
  readonly progressionObstacles?: readonly ProgressionObstacle[];
  readonly microVignettes?: readonly MicroVignette[];
  readonly routeNetwork?: ResolvedRouteNetworkResult;
}

type AreaReservationFn = (bx: number, by: number, bw: number, bh: number) => void;

function reserveGatehouseBuilding(
  b: SettlementBuilding,
  poi: POINode,
  reserveArea: AreaReservationFn
): void {
  const isHoriz = poi.facing === 'east' || poi.facing === 'west' || b.prefabFile.includes('horizontal');
  if (isHoriz) {
    reserveArea(b.x, b.y, b.width, b.height - 2);
  } else {
    reserveArea(b.x, b.y, 2, b.height);
    reserveArea(b.x + 4, b.y, 2, b.height);
    reserveArea(b.x + 2, b.y, 2, 4);
  }
}

function reserveLeagueBuilding(
  b: SettlementBuilding,
  reserveArea: AreaReservationFn
): void {
  reserveArea(b.x, b.y, b.width + 1, CANVAS_RENDERER.LEAGUE_RESERVE_TOP_ROWS);
  reserveArea(b.x, b.y + CANVAS_RENDERER.LEAGUE_RESERVE_BOTTOM_OFFSET_Y, 5, 2);
  reserveArea(b.x + CANVAS_RENDERER.LEAGUE_RESERVE_RIGHT_WING_OFFSET_X, b.y + CANVAS_RENDERER.LEAGUE_RESERVE_BOTTOM_OFFSET_Y, 5, 2);
}

function reservePortDockBuilding(
  poi: POINode,
  continent: ContinentMapResult,
  reserveArea: AreaReservationFn,
  buildingFootprintMask: boolean[][],
  H: number,
  W: number
): void {
  const gx = poi.gridX;
  const gy = poi.gridY;
  const facing = poi.facing ?? 'south';
  reserveArea(gx, gy, poi.footprint.width, poi.footprint.height);

  const reserveIfGround = (rx: number, ry: number, rw: number, rh: number): void => {
    for (let dy = 0; dy < rh; dy++) {
      for (let dx = 0; dx < rw; dx++) {
        const cx = rx + dx;
        const cy = ry + dy;
        if (cy >= 0 && cy < H && cx >= 0 && cx < W) {
          if ((continent.heightmap[cy]?.[cx] ?? 0) === 0) {
            buildingFootprintMask[cy]![cx] = true;
          }
        }
      }
    }
  };

  if (facing === 'west') {
    reserveIfGround(gx + poi.footprint.width, gy - 2, 3, 2);
    reserveIfGround(gx + poi.footprint.width, gy + 4, 3, 2);
  } else if (facing === 'south') {
    reserveIfGround(gx + CANVAS_RENDERER.PORT_DOCK_RESERVE_OFFSET_X, gy + 2, 3, 2);
    reserveIfGround(gx - 3, gy + 2, 2, 1);
  } else if (facing === 'east') {
    reserveIfGround(gx - 3, gy - 2, 3, 2);
    reserveIfGround(gx - 3, gy + 4, 3, 2);
  } else if (facing === 'north') {
    reserveIfGround(gx + CANVAS_RENDERER.PORT_DOCK_RESERVE_OFFSET_X, gy + poi.footprint.height, 3, 2);
    reserveIfGround(gx - 3, gy + poi.footprint.height, 3, 2);
  }
}

function buildBuildingReservationMask(
  continent: ContinentMapResult,
  pois: readonly POINode[],
  H: number,
  W: number
): boolean[][] {
  const buildingFootprintMask: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const reserveArea: AreaReservationFn = (bx: number, by: number, bw: number, bh: number): void => {
    for (let dy = 0; dy < bh; dy++) {
      for (let dx = 0; dx < bw; dx++) {
        const gy = by + dy;
        const gx = bx + dx;
        if (gy >= 0 && gy < H && gx >= 0 && gx < W) {
          buildingFootprintMask[gy]![gx] = true;
        }
      }
    }
  };

  for (const poi of pois) {
    if (poi.urbanLayout && poi.urbanLayout.buildings.length > 0) {
      for (const b of poi.urbanLayout.buildings) {
        if (b.type === 'checkpoint_gate') {
          reserveGatehouseBuilding(b, poi, reserveArea);
        } else if (b.type === 'pokemon_league') {
          reserveLeagueBuilding(b, reserveArea);
        } else {
          reserveArea(b.x, b.y, b.width, b.height);
        }
      }
    } else if (poi.type === 'port_dock') {
      reservePortDockBuilding(poi, continent, reserveArea, buildingFootprintMask, H, W);
    } else if (
      poi.type !== 'dungeon_forest' &&
      poi.type !== 'route_gate' &&
      poi.type !== 'cave_entrance'
    ) {
      reserveArea(poi.gridX, poi.gridY, poi.footprint.width, poi.footprint.height);
    }
  }

  return buildingFootprintMask;
}

function renderTallGrassLayer(
  continent: ContinentMapResult,
  buildingFootprintMask: readonly (readonly boolean[])[],
  wilderness: WildernessLayerResult | null | undefined,
  addBlit: (filename: string, px: number, py: number) => void,
  H: number,
  W: number
): void {
  if (!wilderness?.tallGrassGrid) return;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (buildingFootprintMask[r]?.[c]) continue;
      if (continent.terrainMatrix[r]?.[c] !== 'grass' || (continent.heightmap[r]?.[c] ?? 0) !== 0) continue;
      if (wilderness.tallGrassGrid[r]?.[c]) {
        addBlit('poke_tall_grass.png', c * CANVAS_TILE_SIZE, r * CANVAS_TILE_SIZE);
      }
    }
  }
}

/**
 * Compiles all placement instructions across the 8 non-destructive map layers.
 */
export function buildMapBlitInstructions(
  continent: ContinentMapResult,
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid?: readonly (readonly boolean[])[],
  wilderness?: WildernessLayerResult | null,
  options?: BuildMapBlitOptions
): {
  readonly instructions: readonly TileBlitInstruction[];
  readonly uniqueFilenames: ReadonlySet<string>;
} {
  const instructions: TileBlitInstruction[] = [];
  const uniqueFilenames = new Set<string>();

  const addBlit = (filename: string, px: number, py: number): void => {
    instructions.push({ filename, px, py });
    uniqueFilenames.add(filename);
  };

  const H = continent.height;
  const W = continent.width;

  // 0. Build Strict Building Reservation Matrix (buildingFootprintMask)
  const buildingFootprintMask = buildBuildingReservationMask(continent, pois, H, W);

  // 1-4. Base Terrain, Urban Roads, Plazas, Paths, Bridges, Cliffs & Ledges
  renderBaseTerrainAndCliffs({
    continent,
    pois,
    pathGrid,
    bridgeGrid,
    buildingFootprintMask,
    addBlit,
    options
  });

  // 5. Tall Grass Encounter Fields
  renderTallGrassLayer(continent, buildingFootprintMask, wilderness, addBlit, H, W);

  // 6. Unified 2.5D Depth (Y = Z) Standing Entities Pass
  const unifiedPathGrid: boolean[][] = Array.from({ length: H }, (_, r) =>
    Array.from({ length: W }, (_, c) => Boolean(pathGrid[r]?.[c]) && !buildingFootprintMask[r]?.[c])
  );

  const standingEntities = collectStandingDepthEntities({
    continent,
    pois,
    buildingFootprintMask,
    unifiedPathGrid,
    bridgeGrid,
    wilderness,
    options
  });

  for (const entity of standingEntities) {
    addBlit(entity.file, entity.px, entity.py);
  }

  return { instructions, uniqueFilenames };
}
