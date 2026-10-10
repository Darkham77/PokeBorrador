/**
 * test_aventura/logic/map/canvasTerrainPathBlitter.ts
 *
 * BASE TERRAIN, WATER, BIOMES, URBAN ROADS, BRIDGES & CLIFFS BLITTER
 *
 * Compiles and blits the 2D flat ground layers:
 *   Layer 1: Base Terrain (Ocean, Beaches, Coastlines, Inland Lakes, Grass Plains)
 *   Layer 2: Urban Streets & Paved Sidewalks/Plazas in Settlements
 *   Layer 3: Autotiled Dirt Paths & Boardwalk Bridges (8-neighbor bitmask)
 *   Layer 4: 2.5D Mountain Cliffs, Stairs, South Feet & Plateau Rock Textures
 *   Layer 4b: Procedural Jumpable Route Ledges
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import {
  resolvePathGrid,
  sanitizePathGridWidth,
  CANONICAL_STONE_PLAZA_BRUSH
} from './pathAutotileEngine.ts';
import { resolveMacroBiomeAutotile } from './macroBiomeAutotileEngine.ts';
import { resolveCanonicalBridges } from './canonicalBridgeEngine.ts';
import { getCanonicalUrbanRoadTile } from './urbanPavingEngine.ts';
import { CANVAS_RENDERER } from '../../config/canvasRendererConfig.ts';
import { CANVAS_TILE_SIZE } from '../../config/studioConstants.ts';
import type { BuildMapBlitOptions } from './canvasTileRenderer.ts';

export interface TerrainPathBlitContext {
  readonly continent: ContinentMapResult;
  readonly pois: readonly POINode[];
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
  readonly buildingFootprintMask: readonly (readonly boolean[])[];
  readonly addBlit: (filename: string, px: number, py: number) => void;
  readonly options?: BuildMapBlitOptions;
}

/**
 * Renders base terrain, water, urban avenues, plazas, paths, bridges, and mountain cliffs.
 */
export function renderBaseTerrainAndCliffs(ctx: TerrainPathBlitContext): void {
  const {
    continent,
    pois,
    pathGrid,
    bridgeGrid,
    buildingFootprintMask,
    addBlit,
    options
  } = ctx;

  const H = continent.height;
  const W = continent.width;

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

  // 2. Urban Streets & Paved Sidewalks/Plazas in Settlements
  const urbanRoadSet = new Set<string>();
  const unifiedPathGrid: boolean[][] = Array.from({ length: H }, (_, r) =>
    Array.from({ length: W }, (_, c) => Boolean(pathGrid[r]?.[c]) && !buildingFootprintMask[r]?.[c])
  );
  const plazaGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

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
      const isDirtSettlement =
        poi.type === 'town' ||
        poi.type === 'dungeon_forest' ||
        poi.type === 'route_gate' ||
        poi.urbanLayout.roadMaterial === 'dirt' ||
        /island|canela|cinnabar|isla/i.test(poi.id) ||
        /isla|island/i.test(poi.name) ||
        poi.terrainPreference === 'coast_water';

      if (isDirtSettlement) {
        for (const cell of poi.urbanLayout.internalStreets) {
          if (buildingFootprintMask[cell.y]?.[cell.x]) continue;
          unifiedPathGrid[cell.y]![cell.x] = true;
        }
      } else if (poi.type === 'metropolis') {
        for (const cell of poi.urbanLayout.internalStreets) {
          plazaGrid[cell.y]![cell.x] = true;
          urbanRoadSet.add(`${cell.x}_${cell.y}`);
        }
      } else {
        const roadTile = getCanonicalUrbanRoadTile(poi.type);
        for (const cell of poi.urbanLayout.internalStreets) {
          if (buildingFootprintMask[cell.y]?.[cell.x]) continue;
          urbanRoadSet.add(`${cell.x}_${cell.y}`);
          addBlit(roadTile, cell.x * CANVAS_TILE_SIZE, cell.y * CANVAS_TILE_SIZE);
        }

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

      for (const cell of poi.urbanLayout.pavedPlazaCells) {
        plazaGrid[cell.y]![cell.x] = true;
        urbanRoadSet.add(`${cell.x}_${cell.y}`);
      }

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

  // 2c. Directional Stone Curbs with Curb Clearance
  for (const poi of pois) {
    if (poi.type !== 'metropolis' && poi.type !== 'pokemon_league' && poi.urbanLayout?.curbs) {
      for (const curb of poi.urbanLayout.curbs) {
        if (buildingFootprintMask[curb.y]?.[curb.x]) continue;
        addBlit(curb.curbTile, curb.x * CANVAS_TILE_SIZE, curb.y * CANVAS_TILE_SIZE);
      }
    }
  }

  // 3. Dirt Paths & Road Network
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

  // 3b. Canonical GBA Boardwalk Bridges & Shore Steps
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
          const isRoadOrPlaza = urbanRoadSet.has(`${c}_${r}`) || plazaGrid[r]?.[c] || sanitizedPathGrid[r]?.[c];
          if (!isRoadOrPlaza) {
            const h = Math.sin(c * CANVAS_RENDERER.PLATEAU_HASH_X + r * CANVAS_RENDERER.PLATEAU_HASH_Y);
            if (h > CANVAS_RENDERER.PLATEAU_ROCK_THRESHOLD) {
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

      if (r > 0) {
        const northMtn = continent.resolvedMountain.cellDetails[r - 1]?.[c];
        if (northMtn?.projectedFoot && !buildingFootprintMask[r]?.[c]) {
          addBlit(northMtn.projectedFoot.tile, px, py);
        }
      }
    }
  }

  // 4b. Procedural Jumpable Route Ledges
  if (options?.ledges) {
    for (const run of options.ledges) {
      for (const t of run.tiles) {
        if (!buildingFootprintMask[t.y]?.[t.x]) {
          addBlit(t.tileFile, t.x * CANVAS_TILE_SIZE, t.y * CANVAS_TILE_SIZE);
        }
      }
    }
  }
}
