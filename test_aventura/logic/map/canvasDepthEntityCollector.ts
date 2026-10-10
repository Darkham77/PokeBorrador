/**
 * test_aventura/logic/map/canvasDepthEntityCollector.ts
 *
 * UNIFIED 2.5D DEPTH (Y = Z) STANDING ENTITIES COLLECTOR
 *
 * Collects and sorts all world entities with physical height:
 *   6a: Wilderness Props & Roadside Furnishing
 *   6a-2: Progression Obstacles
 *   6a-3: Maritime Rock Obstacles
 *   6a-4: Environmental Micro-Vignettes
 *   6b: Mountain Summit Boulders & Rubble
 *   6c: Architectural Buildings & Landmarks
 *   6d: Urban Props & Architectural Dressing
 *   6e: Strict North-to-South Trees (Wilderness + Dungeon Forests)
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import type { WildernessLayerResult } from './wildernessVegetationEngine.ts';
import type { BuildMapBlitOptions } from './canvasTileRenderer.ts';
import { resolvePoiLandmarksAndBuildings } from './canvasLandmarkRenderer.ts';
import { CANVAS_RENDERER } from '../../config/canvasRendererConfig.ts';
import { CANVAS_TILE_SIZE } from '../../config/studioConstants.ts';

export interface StampedStandingEntity {
  readonly file: string;
  readonly px: number;
  readonly py: number;
  readonly ySort: number;
  readonly zPriority: number; // 10: trees/nature, 15: wilderness props, 20: buildings, 30: urban props/facades
}

export interface DepthEntityCollectorContext {
  readonly continent: ContinentMapResult;
  readonly pois: readonly POINode[];
  readonly buildingFootprintMask: readonly (readonly boolean[])[];
  readonly unifiedPathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
  readonly wilderness?: WildernessLayerResult | null;
  readonly options?: BuildMapBlitOptions;
}

/**
 * Collects and returns Y-sorted standing entities.
 */
export function collectStandingDepthEntities(
  ctx: DepthEntityCollectorContext
): readonly StampedStandingEntity[] {
  const {
    continent,
    pois,
    buildingFootprintMask,
    unifiedPathGrid,
    bridgeGrid,
    wilderness,
    options
  } = ctx;

  const H = continent.height;
  const W = continent.width;
  const standingEntities: StampedStandingEntity[] = [];

  // 6a. Wilderness Props
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
          zPriority: CANVAS_RENDERER.Z_PRIORITY_OBSTACLES
        });
        continue;
      }

      if (prop.prefabFile.startsWith('tree_') || prop.prefabFile.startsWith('poke_tree_')) {
        standingEntities.push({
          file: prop.prefabFile,
          px,
          py,
          ySort: (prop.y + CANVAS_RENDERER.HEIGHT_SPAN_TREE) * CANVAS_TILE_SIZE,
          zPriority: CANVAS_RENDERER.Z_PRIORITY_LOWEST
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
          zPriority: CANVAS_RENDERER.Z_PRIORITY_OBSTACLES
        });
      }
    }
  }

  // 6a-2. Progression Obstacles
  if (options?.progressionObstacles) {
    for (const obs of options.progressionObstacles) {
      if (!buildingFootprintMask[obs.y]?.[obs.x]) {
        standingEntities.push({
          file: obs.prefabFile,
          px: obs.x * CANVAS_TILE_SIZE,
          py: obs.y * CANVAS_TILE_SIZE,
          ySort: (obs.y + 1) * CANVAS_TILE_SIZE,
          zPriority: CANVAS_RENDERER.Z_PRIORITY_OBSTACLES
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
              zPriority: CANVAS_RENDERER.Z_PRIORITY_OBSTACLES
            });
          }
        }
      }
    }
  }

  // 6a-3. Maritime Rock Obstacles
  if (options?.routeNetwork?.maritimeRockObstacles) {
    for (const obs of options.routeNetwork.maritimeRockObstacles) {
      standingEntities.push({
        file: obs.prefabFile,
        px: obs.x * CANVAS_TILE_SIZE,
        py: obs.y * CANVAS_TILE_SIZE,
        ySort: (obs.y + 1) * CANVAS_TILE_SIZE,
        zPriority: CANVAS_RENDERER.Z_PRIORITY_MARITIME
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
            propH = CANVAS_RENDERER.HEIGHT_SPAN_FOUNTAIN;
          } else if (prop.prefabFile === 'poke_port_cargo_crates_stack.png') {
            propH = CANVAS_RENDERER.HEIGHT_SPAN_CARGO;
          }
          standingEntities.push({
            file: prop.prefabFile,
            px: prop.x * CANVAS_TILE_SIZE,
            py: prop.y * CANVAS_TILE_SIZE,
            ySort: (prop.y + propH) * CANVAS_TILE_SIZE,
            zPriority: CANVAS_RENDERER.Z_PRIORITY_OBSTACLES
          });
        }
      }
    }
  }

  // 6b. Mountain Summit Boulders & Rubble
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
      if (unifiedPathGrid[r]?.[c]) continue;
      const mCell = continent.resolvedMountain.cellDetails[r]?.[c];
      if (mCell && mCell.elevation > 0 && mCell.role === 'floor_center') {
        const px = c * CANVAS_TILE_SIZE;
        const py = r * CANVAS_TILE_SIZE;
        const h = Math.sin(c * CANVAS_RENDERER.RUBBLE_HASH_X + r * CANVAS_RENDERER.RUBBLE_HASH_Y) * CANVAS_RENDERER.RUBBLE_HASH_MULT;
        const val = h - Math.floor(h);
        if (val > CANVAS_RENDERER.BOULDER_THRESHOLD) {
          standingEntities.push({
            file: 'poke_rock_boulder.png',
            px: px + CANVAS_RENDERER.RUBBLE_CENTER_OFFSET_PX,
            py: py + CANVAS_RENDERER.RUBBLE_CENTER_OFFSET_PX,
            ySort: (r + 1) * CANVAS_TILE_SIZE,
            zPriority: CANVAS_RENDERER.Z_PRIORITY_OBSTACLES
          });
        } else if (val > CANVAS_RENDERER.RUBBLE_THRESHOLD) {
          standingEntities.push({
            file: 'poke_rock_rubble.png',
            px: px + CANVAS_RENDERER.RUBBLE_CENTER_OFFSET_PX,
            py: py + CANVAS_RENDERER.RUBBLE_CENTER_OFFSET_PX,
            ySort: (r + 1) * CANVAS_TILE_SIZE,
            zPriority: CANVAS_RENDERER.Z_PRIORITY_OBSTACLES
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
      zPriority: CANVAS_RENDERER.Z_PRIORITY_BUILDINGS
    });
  }

  // 6d. Urban Props & Architectural Dressing
  for (const poi of pois) {
    if (poi.urbanLayout?.props) {
      for (const prop of poi.urbanLayout.props) {
        if (buildingFootprintMask[prop.y]?.[prop.x]) continue;
        const px = prop.x * CANVAS_TILE_SIZE;
        const py = prop.y * CANVAS_TILE_SIZE;
        const drawPx = px;
        let drawPy = py;
        let ySort = (prop.y + 1) * CANVAS_TILE_SIZE;

        if (prop.type === 'fountain') {
          ySort = (prop.y + CANVAS_RENDERER.HEIGHT_SPAN_FOUNTAIN) * CANVAS_TILE_SIZE;
        } else if (prop.type === 'bench') {
          ySort = (prop.prefabFile.includes('_v') || prop.prefabFile.includes('vertical'))
            ? (prop.y + 2) * CANVAS_TILE_SIZE
            : (prop.y + 1) * CANVAS_TILE_SIZE;
        } else if (prop.type === 'statue') {
          drawPy = py - CANVAS_RENDERER.STATUE_Y_OFFSET_PX;
          ySort = (prop.y + 2) * CANVAS_TILE_SIZE;
        } else if (prop.type === 'lamp') {
          drawPy = py - CANVAS_RENDERER.LAMP_Y_OFFSET_PX;
        } else if (prop.type === 'crates') {
          ySort = prop.prefabFile.includes('stack')
            ? (prop.y + 2) * CANVAS_TILE_SIZE
            : (prop.y + 1) * CANVAS_TILE_SIZE;
        } else if (prop.type === 'mailbox') {
          drawPy = py - CANVAS_RENDERER.MAILBOX_Y_OFFSET_PX;
        }

        standingEntities.push({
          file: prop.prefabFile,
          px: drawPx,
          py: drawPy,
          ySort,
          zPriority: CANVAS_RENDERER.Z_PRIORITY_URBAN_PROPS
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
          zPriority: CANVAS_RENDERER.Z_PRIORITY_LOWEST
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
              zPriority: CANVAS_RENDERER.Z_PRIORITY_LOWEST
            });
          }
        }
      }
    }
  }

  // 6f. Master 2.5D North-to-South Y-depth sort
  standingEntities.sort((a, b) => {
    if (a.ySort !== b.ySort) return a.ySort - b.ySort;
    if (a.zPriority !== b.zPriority) return a.zPriority - b.zPriority;
    return a.px - b.px;
  });

  return standingEntities;
}
