/**
 * src/logic/map/canvasTileRenderer.ts
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
import type { POINode } from '../../types/map/poiTypes.ts';
import type { WildernessLayerResult } from './wildernessVegetationEngine.ts';
import {
  resolvePathGrid,
  sanitizePathGridWidth,
  CANONICAL_STONE_PLAZA_BRUSH
} from './pathAutotileEngine.ts';
import { resolveMacroBiomeAutotile } from './macroBiomeAutotileEngine.ts';
import { resolveCanonicalBridges } from './canonicalBridgeEngine.ts';
import { getCanonicalUrbanRoadTile } from './urbanPavingEngine.ts';
import { resolvePoiLandmarksAndBuildings } from './canvasLandmarkRenderer.ts';
import type { LedgeRun } from './routeLedgeEngine.ts';
import type { ProgressionObstacle } from './progressionObstacleEngine.ts';
import type { MicroVignette } from './microVignetteEngine.ts';
import type { ResolvedRouteNetworkResult } from './routeNetworkEngine.ts';
import {
  resolveTileUrl,
  loadTileImage,
  preloadTileImages,
  getImageCache
} from './canvasImageLoader.ts';

export { resolveTileUrl, loadTileImage, preloadTileImages, getImageCache };

export const CANVAS_TILE_SIZE = 32;

export interface TileBlitInstruction {
  readonly filename: string;
  readonly px: number;
  readonly py: number;
}

export interface BuildMapBlitOptions {
  readonly portDockBridgeKeys?: ReadonlySet<string>;
  readonly ledges?: readonly LedgeRun[];
  readonly progressionObstacles?: readonly ProgressionObstacle[];
  readonly microVignettes?: readonly MicroVignette[];
  readonly routeNetwork?: ResolvedRouteNetworkResult;
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
  // Ensures houses, marts, centers, gyms, and landmarks are never overwritten or cut in half by other layers.
  const buildingFootprintMask: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const reserveArea = (bx: number, by: number, bw: number, bh: number): void => {
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
          const isHoriz = poi.facing === 'east' || poi.facing === 'west' || b.prefabFile.includes('horizontal');
          if (isHoriz) {
            // Horizontal gatehouse (8x5 tiles):
            // Reserve roof on top rows (b.y .. b.y + b.height - 3)
            // Rows b.y + 3 and b.y + 4 are the 2-cell through-transit passage from West door to East door
            reserveArea(b.x, b.y, b.width, b.height - 2);
          } else {
            // Checkpoint gatehouse allows 2-cell path through portal at columns 2 and 3
            // Reserve lateral wings (x..x+1 and x+4..x+5) and top roof (x+2..x+3, y..y+3)
            reserveArea(b.x, b.y, 2, b.height);
            reserveArea(b.x + 4, b.y, 2, b.height);
            reserveArea(b.x + 2, b.y, 2, 4);
          }
        } else if (b.type === 'pokemon_league') {
          // Pokémon League Grand Palace (11x8 tiles, with +16px sub-tile shift)
          // Allows 2-cell ceremonial avenue through central entrance portico (dx=5, 6 on bottom 2 rows dy=6, 7)
          // Reserve top 6 rows (roof and upper facade covering 12 tiles width with +16px shift)
          reserveArea(b.x, b.y, b.width + 1, 6);
          // Reserve left ground wing on bottom 2 rows (dy=6, 7, covers bx+5..bx+9)
          reserveArea(b.x, b.y + 6, 5, 2);
          // Reserve right ground wing on bottom 2 rows (dy=6, 7, covers bx+12..bx+16)
          reserveArea(b.x + 7, b.y + 6, 5, 2);
        } else {
          reserveArea(b.x, b.y, b.width, b.height);
        }
      }
    } else if (poi.type === 'port_dock') {
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
        reserveIfGround(gx + 7, gy + 2, 3, 2);
        reserveIfGround(gx - 3, gy + 2, 2, 1);
      } else if (facing === 'east') {
        reserveIfGround(gx - 3, gy - 2, 3, 2);
        reserveIfGround(gx - 3, gy + 4, 3, 2);
      } else if (facing === 'north') {
        reserveIfGround(gx + 7, gy + poi.footprint.height, 3, 2);
        reserveIfGround(gx - 3, gy + poi.footprint.height, 3, 2);
      }
    } else if (
      poi.type !== 'dungeon_forest' &&
      poi.type !== 'route_gate' &&
      poi.type !== 'cave_entrance'
    ) {
      reserveArea(poi.gridX, poi.gridY, poi.footprint.width, poi.footprint.height);
    }
  }

  // 1. Base Terrain & Water & Coast & Foam
  const macroBiomesResult = continent.resolvedMacroBiomes ?? (
    continent.macroBiomes
      ? resolveMacroBiomeAutotile(continent.macroBiomes.biomeGrid, continent.terrainMatrix, continent.heightmap)
      : null
  );

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const px = c * CANVAS_TILE_SIZE;
      const py = r * CANVAS_TILE_SIZE;

      const isMountain = (continent.heightmap[r]?.[c] ?? 0) > 0;
      const waterCell = continent.resolvedWater.cellDetails[r]?.[c];

      const curTerrain = continent.terrainMatrix[r]?.[c];
      if (isMountain) {
        const mCell = continent.resolvedMountain.cellDetails[r]?.[c];
        const isOuterCorner = Boolean(
          mCell && (mCell.role.includes('corner_outer') || mCell.role === 'peak_isolated')
        );
        const hasElev0Neighbor = (
          (continent.heightmap[r - 1]?.[c] ?? 0) === 0 ||
          (continent.heightmap[r + 1]?.[c] ?? 0) === 0 ||
          (continent.heightmap[r]?.[c - 1] ?? 0) === 0 ||
          (continent.heightmap[r]?.[c + 1] ?? 0) === 0
        );

        if (isOuterCorner && hasElev0Neighbor) {
          const mbCell = macroBiomesResult?.cellDetails[r]?.[c];
          if (mbCell) {
            for (const t of mbCell.layerStack) {
              addBlit(t, px, py);
            }
          } else {
            addBlit('poke_grass_plain.png', px, py);
          }

          // If an adjacent higher cliff face extends laterally behind this transparent corner/edge
          if (r > 0 && c > 0 && (mCell?.role === 'corner_outer_sw_top' || mCell?.role === 'edge_west')) {
            const westNorthMtn = continent.resolvedMountain.cellDetails[r - 1]?.[c - 1];
            if (westNorthMtn?.projectedFoot && !westNorthMtn.projectedFoot.tile.includes('corner')) {
              addBlit(westNorthMtn.projectedFoot.tile, px, py);
            }
          } else if (r > 0 && c < W - 1 && (mCell?.role === 'corner_outer_se_top' || mCell?.role === 'edge_east')) {
            const eastNorthMtn = continent.resolvedMountain.cellDetails[r - 1]?.[c + 1];
            if (eastNorthMtn?.projectedFoot && !eastNorthMtn.projectedFoot.tile.includes('corner')) {
              addBlit(eastNorthMtn.projectedFoot.tile, px, py);
            }
          }
        } else {
          const mtnPal = continent.geologicalClusters?.paletteMatrix?.[r]?.[c] ?? continent.mountainPalette ?? 'brown';
          const plateauBase = mtnPal === 'gray'
            ? 'poke_cliff_gray_plateau_rock.png'
            : 'poke_cliff_brown_plateau_rock.png';
          addBlit(plateauBase, px, py);
        }
      } else if (curTerrain === 'water' || curTerrain === 'water_deep') {
        if (waterCell && (waterCell.terrain === 'water' || waterCell.terrain === 'water_deep')) {
          for (const t of waterCell.layerStack) {
            addBlit(t, px, py);
          }
        } else {
          addBlit(curTerrain === 'water_deep' ? 'poke_water_deep.png' : 'poke_water_ocean_center.png', px, py);
        }
      } else if (curTerrain === 'sand') {
        if (waterCell && waterCell.terrain === 'sand') {
          for (const t of waterCell.layerStack) {
            addBlit(t, px, py);
          }
        } else {
          addBlit('poke_sand_water_center.png', px, py);
        }
      } else {
        const mCell = macroBiomesResult?.cellDetails[r]?.[c];
        if (mCell) {
          for (const t of mCell.layerStack) {
            addBlit(t, px, py);
          }
        } else {
          addBlit('poke_grass_plain.png', px, py);
        }
      }
    }
  }

  // 2. Urban Streets & Paved Sidewalks/Plazas in Settlements (strictly protected against building footprints)
  const urbanRoadSet = new Set<string>();
  const unifiedPathGrid: boolean[][] = Array.from({ length: H }, (_, r) =>
    Array.from({ length: W }, (_, c) => Boolean(pathGrid[r]?.[c]) && !buildingFootprintMask[r]?.[c])
  );
  const plazaGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  // Purge rural paths from inside city/metropolis urban cores to prevent residual 1-cell slivers
  for (const poi of pois) {
    const isDirtSettlement =
      poi.urbanLayout?.roadMaterial === 'dirt' ||
      /island|canela|cinnabar|isla/i.test(poi.id) ||
      /isla|island/i.test(poi.name) ||
      poi.terrainPreference === 'coast_water';

    if ((poi.type === 'city' && !isDirtSettlement) || poi.type === 'metropolis') {
      const minX = poi.gridX;
      const maxX = poi.gridX + poi.footprint.width;
      const minY = poi.gridY;
      const maxY = poi.gridY + poi.footprint.height;
      for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
          if (y >= 0 && y < H && x >= 0 && x < W) {
            const isGateway = poi.gateways?.some((gw) => gw.x === x && gw.y === y);
            if (!isGateway) {
              unifiedPathGrid[y]![x] = false;
            }
          }
        }
      }
    }
  }

  for (const poi of pois) {
    if (poi.urbanLayout) {
      // A. Vehicular Avenues / Dirt Paths
      const isDirtSettlement =
        poi.type === 'town' ||
        poi.type === 'dungeon_forest' ||
        poi.type === 'route_gate' ||
        poi.urbanLayout.roadMaterial === 'dirt' ||
        /island|canela|cinnabar|isla/i.test(poi.id) ||
        /isla|island/i.test(poi.name) ||
        poi.terrainPreference === 'coast_water';

      if (isDirtSettlement) {
        // In towns, island settlements, and dungeon forests, internal trails are canonical dirt paths: participate in unified 8-neighbor autotiling
        for (const cell of poi.urbanLayout.internalStreets) {
          if (buildingFootprintMask[cell.y]?.[cell.x]) continue;
          unifiedPathGrid[cell.y]![cell.x] = true;
        }
      } else if (poi.type === 'metropolis') {
        // In metropolis, internal avenues are pedestrian concourses that seamlessly merge into the cobblestone plaza
        for (const cell of poi.urbanLayout.internalStreets) {
          plazaGrid[cell.y]![cell.x] = true;
          urbanRoadSet.add(`${cell.x}_${cell.y}`);
        }
      } else {
        // In smaller cities, avenues are canonical paved pedestrian walkways
        const roadTile = getCanonicalUrbanRoadTile(poi.type);
        for (const cell of poi.urbanLayout.internalStreets) {
          if (buildingFootprintMask[cell.y]?.[cell.x]) continue;
          urbanRoadSet.add(`${cell.x}_${cell.y}`);
          addBlit(roadTile, cell.x * CANVAS_TILE_SIZE, cell.y * CANVAS_TILE_SIZE);
        }

        // Frame open avenue ends that face open terrain with transverse curbs (strictly outside pedestrian concourses and mountain plateaus)
        if (poi.type !== 'pokemon_league') {
          for (const cell of poi.urbanLayout.internalStreets) {
            if (buildingFootprintMask[cell.y]?.[cell.x]) continue;
            const px = cell.x * CANVAS_TILE_SIZE;
            const py = cell.y * CANVAS_TILE_SIZE;

            const neighbors = [
              { dx: 0, dy: -1, curb: 'poke_curb_n.png' },
              { dx: 0, dy: 1, curb: 'poke_curb_s.png' },
              { dx: -1, dy: 0, curb: 'poke_curb_w.png' },
              { dx: 1, dy: 0, curb: 'poke_curb_e.png' }
            ];

            for (const n of neighbors) {
              const nx = cell.x + n.dx;
              const ny = cell.y + n.dy;
              if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;

              const isAsphaltNeighbor = poi.urbanLayout.internalStreets.some((s) => s.x === nx && s.y === ny);
              const isPlazaNeighbor = poi.urbanLayout.pavedPlazaCells.some((p) => p.x === nx && p.y === ny);
              const isBuildingNeighbor = buildingFootprintMask[ny]?.[nx];
              const hasConnectingPath = unifiedPathGrid[ny]?.[nx];

              if (!isAsphaltNeighbor && !isPlazaNeighbor && !isBuildingNeighbor && !hasConnectingPath) {
                addBlit(n.curb, px, py);
              }
            }
          }
        }
      }

      // B. Paved Sidewalks & Civic Plaza Concourse (Authentic Cobblestone with 13-tile autotiling)
      for (const cell of poi.urbanLayout.pavedPlazaCells) {
        plazaGrid[cell.y]![cell.x] = true;
        urbanRoadSet.add(`${cell.x}_${cell.y}`);
      }

      // In metropolis, ensure the entire urban footprint (including under building footprints)
      // is fully covered in plazaGrid so resolvePathGrid renders continuous, seamless cobblestone
      if (poi.type === 'metropolis' && poi.id === 'celadon_capital') {
        const minX = poi.gridX;
        const maxX = poi.gridX + poi.footprint.width;
        const minY = poi.gridY;
        const maxY = poi.gridY + poi.footprint.height;
        for (let y = minY; y < maxY; y++) {
          for (let x = minX; x < maxX; x++) {
            if (y >= 0 && y < H && x >= 0 && x < W) {
              plazaGrid[y]![x] = true;
              urbanRoadSet.add(`${x}_${y}`);
            }
          }
        }
      }
    }
  }

  // 2b. Autotile Cobblestone Plazas using CANONICAL_STONE_PLAZA_BRUSH
  const plazaAutotile = resolvePathGrid(plazaGrid, undefined, CANONICAL_STONE_PLAZA_BRUSH);
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const plCell = plazaAutotile.pathDetails[r]?.[c];
      if (plCell) {
        addBlit(plCell.primaryTile, c * CANVAS_TILE_SIZE, r * CANVAS_TILE_SIZE);
        if (plCell.overlayTiles) {
          for (const ov of plCell.overlayTiles) {
            addBlit(ov, c * CANVAS_TILE_SIZE, r * CANVAS_TILE_SIZE);
          }
        }
      }
    }
  }

  // 2c. Directional Stone Curbs with Curb Clearance (blitted on top of plaza edges facing street)
  for (const poi of pois) {
    if (poi.type !== 'metropolis' && poi.type !== 'pokemon_league' && poi.urbanLayout?.curbs) {
      for (const curb of poi.urbanLayout.curbs) {
        if (buildingFootprintMask[curb.y]?.[curb.x]) continue;
        addBlit(curb.curbTile, curb.x * CANVAS_TILE_SIZE, curb.y * CANVAS_TILE_SIZE);
      }
    }
  }

  // 3. Dirt Paths & Road Network (skipping building footprints and bridges)
  // In canonical Pokémon games, wild routes across temperate meadows and forests are 100% natural grass.
  // Paved dirt paths are exclusively rendered:
  //   a) Inside settlements and on gateway aprons (within 4 tiles of a settlement entrance).
  //   b) In high mountain passes (elevation >= 1) or rocky/desert biomes.
  // Open countryside meadows and forests maintain pure natural ground with negative-space tree enframing.
  const isPavedSector = (r: number, c: number): boolean => {
    if (urbanRoadSet.has(`${c}_${r}`)) return true;
    const elev = continent.heightmap[r]?.[c] ?? 0;
    if (elev >= 1) return true;
    const mBiome = continent.macroBiomes?.biomeGrid[r]?.[c];
    if (mBiome === 'arid_desert' || mBiome === 'volcanic_plateau') return true;

    for (const poi of pois) {
      if (
        c >= poi.gridX - 4 &&
        c <= poi.gridX + poi.footprint.width + 4 &&
        r >= poi.gridY - 4 &&
        r <= poi.gridY + poi.footprint.height + 4
      ) {
        return true;
      }
    }
    return false;
  };

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (
        continent.terrainMatrix[r]?.[c] === 'sand' ||
        buildingFootprintMask[r]?.[c] ||
        !isPavedSector(r, c)
      ) {
        unifiedPathGrid[r]![c] = false;
      }
    }
  }
  const sanitizedPathGrid = sanitizePathGridWidth(unifiedPathGrid, continent.terrainMatrix);
  const pathAutotile = resolvePathGrid(sanitizedPathGrid, bridgeGrid);
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const pCell = pathAutotile.pathDetails[r]?.[c];
      if (!pCell || pCell.isBridge) continue;
      if (continent.terrainMatrix[r]?.[c] === 'sand') continue;

      const px = c * CANVAS_TILE_SIZE;
      const py = r * CANVAS_TILE_SIZE;

      if (!urbanRoadSet.has(`${c}_${r}`)) {
        addBlit(pCell.primaryTile, px, py);
        if (pCell.overlayTiles) {
          for (const ov of pCell.overlayTiles) {
            addBlit(ov, px, py);
          }
        }
      }
    }
  }

  // 3b. Canonical GBA Boardwalk Bridges & Shore Steps (Engine-driven)
  if (bridgeGrid) {
    const portDockBridgeKeys = options?.portDockBridgeKeys ?? (() => {
      const keys = new Set<string>();
      for (const node of pois) {
        if (node.type === 'port_dock') {
          const facing = node.facing ?? 'south';
          const pierLength = Math.max(8, Math.max(node.footprint.width, node.footprint.height) + 2);
          const isWaterCell = (r: number, c: number): boolean => {
            const t = continent.terrainMatrix[r]?.[c] ?? continent.cells[r]?.[c]?.terrain;
            return t === 'water' || t === 'water_deep';
          };

          if (facing === 'south') {
            const startY = node.gridY + node.footprint.height;
            const px = node.gridX + (node.footprint.width >= 7 ? Math.floor((node.footprint.width - 3) / 2) : 2);
            for (let dy = 0; dy < pierLength; dy++) {
              const py = startY + dy;
              if (py >= 0 && py < H && px >= 0 && px + 2 < W) {
                if (
                  isWaterCell(py, px) &&
                  isWaterCell(py, px + 1) &&
                  isWaterCell(py, px + 2)
                ) {
                  keys.add(`${px}_${py}`);
                  keys.add(`${px + 1}_${py}`);
                  keys.add(`${px + 2}_${py}`);
                } else {
                  break;
                }
              }
            }
          } else if (facing === 'north') {
            const startY = node.gridY - 1;
            const px = node.gridX + (node.footprint.width >= 7 ? Math.floor((node.footprint.width - 3) / 2) : 2);
            let lastPy = startY;
            for (let dy = 0; dy < pierLength; dy++) {
              const py = startY - dy;
              if (py >= 0 && py < H && px >= 0 && px + 2 < W) {
                if (
                  isWaterCell(py, px) &&
                  isWaterCell(py, px + 1) &&
                  isWaterCell(py, px + 2)
                ) {
                  keys.add(`${px}_${py}`);
                  keys.add(`${px + 1}_${py}`);
                  keys.add(`${px + 2}_${py}`);
                  lastPy = py;
                } else {
                  break;
                }
              }
            }
            // T-dock landing pierhead at northern tip
            for (let r = lastPy; r <= Math.min(startY, lastPy + 1); r++) {
              for (let c = px - 2; c <= px + 4; c++) {
                if (c >= 0 && c < W && isWaterCell(r, c)) {
                  keys.add(`${c}_${r}`);
                }
              }
            }
          } else if (facing === 'east') {
            const startX = node.gridX + node.footprint.width;
            const py = node.gridY + 2;
            for (let dx = 0; dx < pierLength; dx++) {
              const px = startX + dx;
              if (px >= 0 && px < W && py >= 0 && py + 2 < H) {
                if (
                  isWaterCell(py, px) &&
                  isWaterCell(py + 1, px) &&
                  isWaterCell(py + 2, px)
                ) {
                  keys.add(`${px}_${py}`);
                  keys.add(`${px}_${py + 1}`);
                  keys.add(`${px}_${py + 2}`);
                } else {
                  break;
                }
              }
            }
          } else if (facing === 'west') {
            const startX = node.gridX - 1;
            const py = node.gridY + 2;
            for (let dx = 0; dx < pierLength; dx++) {
              const px = startX - dx;
              if (px >= 0 && px < W && py >= 0 && py + 2 < H) {
                if (
                  isWaterCell(py, px) &&
                  isWaterCell(py + 1, px) &&
                  isWaterCell(py + 2, px)
                ) {
                  keys.add(`${px}_${py}`);
                  keys.add(`${px}_${py + 1}`);
                  keys.add(`${px}_${py + 2}`);
                } else {
                  break;
                }
              }
            }
          }
        }
      }
      return keys;
    })();

    const isPortDockCell = (cx: number, cy: number): boolean =>
      portDockBridgeKeys.has(`${cx}_${cy}`);
    const bridgeBlits = resolveCanonicalBridges(bridgeGrid, continent.cells, {
      isPortDockCell
    });
    for (const b of bridgeBlits) {
      addBlit(b.file, b.x * CANVAS_TILE_SIZE, b.y * CANVAS_TILE_SIZE);
    }
  }

  // 4. Mountain Cliffs, Stairs, South Feet & Plateau Rock Textures
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (buildingFootprintMask[r]?.[c]) continue;

      const mCell = continent.resolvedMountain.cellDetails[r]?.[c];
      const px = c * CANVAS_TILE_SIZE;
      const py = r * CANVAS_TILE_SIZE;

      if (mCell && mCell.elevation > 0) {
        if (mCell.role === 'floor_center') {
          // Never overwrite urban roads, plazas, or dirt paths with raw mountain plateau textures
          const isRoadOrPlaza = urbanRoadSet.has(`${c}_${r}`) || plazaGrid[r]?.[c] || sanitizedPathGrid[r]?.[c];
          if (!isRoadOrPlaza) {
            const h = Math.sin(c * 17.13 + r * 31.41);
            if (h > 0.65) {
              const mtnPal = continent.geologicalClusters?.paletteMatrix?.[r]?.[c] ?? continent.mountainPalette ?? 'brown';
              const rockFloor = mtnPal === 'gray'
                ? 'poke_cliff_gray_plateau_rock.png'
                : 'poke_cliff_brown_plateau_rock.png';
              addBlit(rockFloor, px, py);
            } else {
              addBlit(mCell.primaryTile, px, py);
            }
          }
        } else {
          addBlit(mCell.primaryTile, px, py);
        }

        if (mCell.overlayTiles) {
          for (const ov of mCell.overlayTiles) {
            addBlit(ov, px, py);
          }
        }
      }

      // Projected foot from north neighbor (ensures continuous vertical cliff faces)
      if (r > 0) {
        const northMtn = continent.resolvedMountain.cellDetails[r - 1]?.[c];
        if (northMtn?.projectedFoot && !buildingFootprintMask[r]?.[c]) {
          addBlit(northMtn.projectedFoot.tile, px, py);
        }
      }
    }
  }

  // 4b. Procedural Jumpable Route Ledges (Phase 4)
  if (options?.ledges) {
    for (const run of options.ledges) {
      for (const t of run.tiles) {
        if (!buildingFootprintMask[t.y]?.[t.x]) {
          addBlit(t.tileFile, t.x * CANVAS_TILE_SIZE, t.y * CANVAS_TILE_SIZE);
        }
      }
    }
  }

  // 5. Tall Grass Encounter Fields (strictly flat grass and non-building)
  if (wilderness?.tallGrassGrid) {
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

  // 6. Unified 2.5D Depth (Y = Z) Standing Entities Pass
  // Unifies all world entities with physical height (wilderness props, mountain boulders,
  // buildings, urban props, and trees) into a single North-to-South Y-depth sorted pipeline.
  // Southern foreground entities always overlap northern background entities.
  interface StampedStandingEntity {
    readonly file: string;
    readonly px: number;
    readonly py: number;
    readonly ySort: number;
    readonly zPriority: number; // 10: trees/nature, 15: wilderness props, 20: buildings, 30: urban props/facades
  }

  const standingEntities: StampedStandingEntity[] = [];

  // 6a. Wilderness Props (roadside flowers, bushes, saplings, boulders, logs, fences)
  if (wilderness?.props) {
    for (const prop of wilderness.props) {
      if (buildingFootprintMask[prop.y]?.[prop.x]) continue;
      if (continent.terrainMatrix[prop.y]?.[prop.x] !== 'grass' && prop.type !== 'boulder') continue;
      if ((continent.heightmap[prop.y]?.[prop.x] ?? 0) !== 0) continue;
      if (continent.resolvedMountain.occupiedFootCells[prop.y]?.[prop.x]) continue;

      const px = prop.x * CANVAS_TILE_SIZE;
      const py = prop.y * CANVAS_TILE_SIZE;

      if (prop.prefabFile.includes('cuttable') || prop.prefabFile.includes('sapling')) {
        standingEntities.push({
          file: prop.prefabFile,
          px,
          py,
          ySort: (prop.y + 1) * CANVAS_TILE_SIZE,
          zPriority: 15
        });
        continue;
      }

      if (prop.prefabFile.startsWith('tree_') || prop.prefabFile.startsWith('poke_tree_')) {
        standingEntities.push({
          file: prop.prefabFile,
          px,
          py,
          ySort: (prop.y + 2) * CANVAS_TILE_SIZE,
          zPriority: 10
        });
        continue;
      }

      if (
        prop.type === 'flower' ||
        prop.type === 'bush' ||
        prop.type === 'sapling' ||
        prop.type === 'boulder' ||
        prop.type === 'fence_h' ||
        prop.type === 'fence_v' ||
        prop.type === 'signpost' ||
        prop.type === 'log'
      ) {
        standingEntities.push({
          file: prop.prefabFile,
          px,
          py,
          ySort: (prop.y + 1) * CANVAS_TILE_SIZE,
          zPriority: 15
        });
      }
    }
  }

  // 6a-2. Progression Obstacles (Cut Trees & Strength Boulders + Flanking Barriers)
  if (options?.progressionObstacles) {
    for (const obs of options.progressionObstacles) {
      if (!buildingFootprintMask[obs.y]?.[obs.x]) {
        standingEntities.push({
          file: obs.prefabFile,
          px: obs.x * CANVAS_TILE_SIZE,
          py: obs.y * CANVAS_TILE_SIZE,
          ySort: (obs.y + 1) * CANVAS_TILE_SIZE,
          zPriority: 15
        });
      }
      if (obs.flankingProps) {
        for (const fp of obs.flankingProps) {
          if (!buildingFootprintMask[fp.y]?.[fp.x]) {
            standingEntities.push({
              file: fp.prefabFile,
              px: fp.x * CANVAS_TILE_SIZE,
              py: fp.y * CANVAS_TILE_SIZE,
              ySort: (fp.y + 1) * CANVAS_TILE_SIZE,
              zPriority: 15
            });
          }
        }
      }
    }
  }

  // 6a-3. Maritime Rock Obstacles (rock channels along surf routes)
  if (options?.routeNetwork?.maritimeRockObstacles) {
    for (const obs of options.routeNetwork.maritimeRockObstacles) {
      standingEntities.push({
        file: obs.prefabFile,
        px: obs.x * CANVAS_TILE_SIZE,
        py: obs.y * CANVAS_TILE_SIZE,
        ySort: (obs.y + 1) * CANVAS_TILE_SIZE,
        zPriority: 12
      });
    }
  }

  // 6a-4. Environmental Micro-Vignettes
  if (options?.microVignettes) {
    for (const vig of options.microVignettes) {
      for (const prop of vig.props) {
        if (!buildingFootprintMask[prop.y]?.[prop.x]) {
          let propH = 1;
          if (prop.prefabFile === 'poke_fountain.png' || prop.prefabFile === 'poke_street_lamp.png') {
            propH = 3;
          } else if (prop.prefabFile === 'poke_port_cargo_crates_stack.png') {
            propH = 2;
          }
          standingEntities.push({
            file: prop.prefabFile,
            px: prop.x * CANVAS_TILE_SIZE,
            py: prop.y * CANVAS_TILE_SIZE,
            ySort: (prop.y + propH) * CANVAS_TILE_SIZE,
            zPriority: 15
          });
        }
      }
    }
  }

  // 6b. Mountain Summit Boulders & Rubble (strictly on wild plateau rock, away from paths and buildings)
  const poiFootprintSet = new Set<string>();
  for (const poi of pois) {
    for (let dy = -1; dy <= poi.footprint.height; dy++) {
      for (let dx = -1; dx <= poi.footprint.width; dx++) {
        poiFootprintSet.add(`${poi.gridX + dx}_${poi.gridY + dy}`);
      }
    }
  }

  for (let r = 2; r < H - 2; r++) {
    for (let c = 2; c < W - 2; c++) {
      if (buildingFootprintMask[r]?.[c] || poiFootprintSet.has(`${c}_${r}`)) continue;
      if (urbanRoadSet.has(`${c}_${r}`) || plazaGrid[r]?.[c] || pathGrid[r]?.[c]) continue;
      const mCell = continent.resolvedMountain.cellDetails[r]?.[c];
      if (mCell && mCell.elevation > 0 && mCell.role === 'floor_center') {
        const px = c * CANVAS_TILE_SIZE;
        const py = r * CANVAS_TILE_SIZE;
        const h = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
        const val = h - Math.floor(h);
        if (val > 0.94) {
          standingEntities.push({
            file: 'poke_rock_boulder.png',
            px: px + 8,
            py: py + 8,
            ySort: (r + 1) * CANVAS_TILE_SIZE,
            zPriority: 15
          });
        } else if (val > 0.86) {
          standingEntities.push({
            file: 'poke_rock_rubble.png',
            px: px + 8,
            py: py + 8,
            ySort: (r + 1) * CANVAS_TILE_SIZE,
            zPriority: 15
          });
        }
      }
    }
  }

  // 6c. Architectural Buildings & Landmarks
  const buildingsToStamp = resolvePoiLandmarksAndBuildings({
    continent,
    pois,
    buildingFootprintMask,
    unifiedPathGrid,
    bridgeGrid,
    tileSize: CANVAS_TILE_SIZE
  });

  for (const b of buildingsToStamp) {
    standingEntities.push({
      file: b.file,
      px: b.px,
      py: b.py,
      ySort: b.ySort,
      zPriority: 20
    });
  }

  // 6d. Urban Props & Architectural Dressing
  for (const poi of pois) {
    if (poi.urbanLayout?.props) {
      for (const prop of poi.urbanLayout.props) {
        if (buildingFootprintMask[prop.y]?.[prop.x]) continue;
        const px = prop.x * CANVAS_TILE_SIZE;
        const py = prop.y * CANVAS_TILE_SIZE;
        let drawPx = px;
        let drawPy = py;
        let ySort = (prop.y + 1) * CANVAS_TILE_SIZE;

        if (prop.type === 'fountain') {
          drawPx = px;
          drawPy = py;
          ySort = (prop.y + 3) * CANVAS_TILE_SIZE;
        } else if (prop.type === 'bench') {
          drawPx = px;
          drawPy = py;
          ySort = (prop.prefabFile.includes('_v') || prop.prefabFile.includes('vertical'))
            ? (prop.y + 2) * CANVAS_TILE_SIZE
            : (prop.y + 1) * CANVAS_TILE_SIZE;
        } else if (prop.type === 'statue') {
          drawPx = px;
          drawPy = py - 32;
          ySort = (prop.y + 2) * CANVAS_TILE_SIZE;
        } else if (prop.type === 'lamp') {
          drawPx = px;
          drawPy = py - 64;
          ySort = (prop.y + 1) * CANVAS_TILE_SIZE;
        } else if (prop.type === 'fence_h' || prop.type === 'fence_v') {
          drawPx = px;
          drawPy = py;
          ySort = (prop.y + 1) * CANVAS_TILE_SIZE;
        } else if (prop.type === 'crates') {
          drawPx = px;
          drawPy = py;
          ySort = prop.prefabFile.includes('stack')
            ? (prop.y + 2) * CANVAS_TILE_SIZE
            : (prop.y + 1) * CANVAS_TILE_SIZE;
        } else if (prop.type === 'mailbox') {
          drawPx = px;
          drawPy = py - 32;
          ySort = (prop.y + 1) * CANVAS_TILE_SIZE;
        } else {
          drawPx = px;
          drawPy = py;
          ySort = (prop.y + 1) * CANVAS_TILE_SIZE;
        }

        standingEntities.push({
          file: prop.prefabFile,
          px: drawPx,
          py: drawPy,
          ySort,
          zPriority: 30
        });
      }
    }
  }

  // 6e. Strict North-to-South Trees (Wilderness + Dungeon Forests)
  if (wilderness?.trees) {
    for (const t of wilderness.trees) {
      let canPlace = true;
      const canopyOverhang = t.height - 2;

      for (let dy = -canopyOverhang; dy <= 1; dy++) {
        for (let dx = 0; dx < t.width; dx++) {
          const cy = t.y + dy;
          const cx = t.x + dx;
          if (
            cy < 0 || cy >= H || cx < 0 || cx >= W ||
            buildingFootprintMask[cy]?.[cx] ||
            wilderness?.tallGrassGrid?.[cy]?.[cx] ||
            continent.terrainMatrix[cy]?.[cx] !== 'grass' ||
            (continent.heightmap[cy]?.[cx] ?? 0) !== 0 ||
            continent.resolvedMountain.occupiedFootCells[cy]?.[cx] ||
            unifiedPathGrid[cy]?.[cx]
          ) {
            canPlace = false;
            break;
          }
        }
        if (!canPlace) break;
      }
      if (canPlace) {
        const drawPy = (t.y - (t.height - 2)) * CANVAS_TILE_SIZE;
        standingEntities.push({
          file: t.prefabFile,
          px: t.x * CANVAS_TILE_SIZE,
          py: drawPy,
          ySort: (t.y + 2) * CANVAS_TILE_SIZE,
          zPriority: 10
        });
      }
    }
  }

  // Dungeon Forest Dense Infill
  for (const poi of pois) {
    if (poi.type === 'dungeon_forest') {
      for (let dy = 0; dy < poi.footprint.height; dy += 2) {
        for (let dx = 0; dx < poi.footprint.width; dx += 2) {
          const tx = poi.gridX + dx;
          const ty = poi.gridY + dy;
          let canPlace = true;
          for (let fdy = -1; fdy <= 1; fdy++) {
            for (let fdx = 0; fdx < 2; fdx++) {
              const cy = ty + fdy;
              const cx = tx + fdx;
              if (
                cy < 0 || cy >= H || cx < 0 || cx >= W ||
                buildingFootprintMask[cy]?.[cx] ||
                wilderness?.tallGrassGrid?.[cy]?.[cx] ||
                continent.terrainMatrix[cy]?.[cx] !== 'grass' ||
                (continent.heightmap[cy]?.[cx] ?? 0) !== 0 ||
                continent.resolvedMountain.occupiedFootCells[cy]?.[cx] ||
                unifiedPathGrid[cy]?.[cx]
              ) {
                canPlace = false;
                break;
              }
            }
            if (!canPlace) break;
          }
          if (canPlace) {
            standingEntities.push({
              file: 'tree_viridian_forest.png',
              px: tx * CANVAS_TILE_SIZE,
              py: (ty - 1) * CANVAS_TILE_SIZE,
              ySort: (ty + 2) * CANVAS_TILE_SIZE,
              zPriority: 10
            });
          }
        }
      }
    }
  }

  // 6f. MASTER 2.5D NORTH-TO-SOUTH Y-DEPTH (Y = Z) SORTING PASS
  // Guarantees all world objects (buildings, trees, urban props, rocks) are rendered
  // strictly based on depth: southern foreground entities always overlap northern background entities.
  // For entities at identical depth, zPriority ensures props on facades draw over buildings.
  standingEntities.sort((a, b) => {
    if (a.ySort !== b.ySort) return a.ySort - b.ySort;
    if (a.zPriority !== b.zPriority) return a.zPriority - b.zPriority;
    return a.px - b.px;
  });

  for (const entity of standingEntities) {
    addBlit(entity.file, entity.px, entity.py);
  }

  return { instructions, uniqueFilenames };
}

export interface VisibleViewportBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Renders the full continent tilemap into the specified HTML5 2D Canvas in native 32x32 resolution.
 */
export async function renderRegionalContinentTilemap(
  canvas: HTMLCanvasElement,
  continent: ContinentMapResult,
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid?: readonly (readonly boolean[])[],
  wilderness?: WildernessLayerResult | null,
  visibleBounds?: VisibleViewportBounds
): Promise<void> {
  const widthPx = continent.width * CANVAS_TILE_SIZE;
  const heightPx = continent.height * CANVAS_TILE_SIZE;

  if (canvas.width !== widthPx || canvas.height !== heightPx) {
    canvas.width = widthPx;
    canvas.height = heightPx;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Enforce pixel-sharp rendering without bilinear interpolation
  ctx.imageSmoothingEnabled = false;

  // Background deep ocean
  ctx.fillStyle = '#0a1428';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Compile instructions and preload any missing images
  const { instructions, uniqueFilenames } = buildMapBlitInstructions(
    continent,
    pois,
    pathGrid,
    bridgeGrid,
    wilderness
  );

  await preloadTileImages(uniqueFilenames);

  // Blit each instruction in layer order with optional viewport culling
  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i]!;

    if (visibleBounds) {
      if (
        inst.px + 128 < visibleBounds.minX ||
        inst.px > visibleBounds.maxX ||
        inst.py + 128 < visibleBounds.minY ||
        inst.py > visibleBounds.maxY
      ) {
        continue;
      }
    }

    const img = getImageCache().get(inst.filename);
    if (img) {
      ctx.drawImage(img, inst.px, inst.py);
    }
  }
}
