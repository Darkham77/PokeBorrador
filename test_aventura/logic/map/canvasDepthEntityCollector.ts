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

import { CANVAS_RENDERER } from '../../config/canvasRendererConfig.ts';
import { CANVAS_TILE_SIZE } from '../../config/studioConstants.ts';
import type { DirtyTileBounds } from '../../types/map/autotileHealingTypes.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import { clampDirtyBounds } from '../utils/gridGeometryUtils.ts';
import { resolvePoiLandmarksAndBuildings } from './canvasLandmarkRenderer.ts';
import type { BuildMapBlitOptions } from './canvasTileRenderer.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import {
  type WildernessLayerResult,
  WILDERNESS_PROP_TYPES,
  type WildernessPropType
} from './wildernessVegetationEngine.ts';

const ALLOWED_NON_GRASS_PROP_TYPES: ReadonlySet<WildernessPropType> = new Set<WildernessPropType>([
  'boulder',
  'fence_h',
  'fence_v'
]);

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

const STANDING_PROP_TYPES: ReadonlySet<WildernessPropType> = new Set<WildernessPropType>(
  WILDERNESS_PROP_TYPES
);
const POI_LANDMARK_MARGIN_TILES = 20;
const ENTITY_BOUNDS_PAD_MIN_TILES = 2;
const BUILDING_BOUNDS_PAD_TILES = 8;

const FOREST_HASH_MULTIPLIER = 31 as const;
const FOREST_TRUNK_ROWS = 2 as const;
const FOREST_SMALL_BOUND_THRESHOLD = 12 as const;

function hasForestTreeOverlap(
  tx: number,
  ty: number,
  treeW: number,
  occupied: ReadonlySet<string>
): boolean {
  for (let oy = 0; oy < FOREST_TRUNK_ROWS; oy++) {
    for (let ox = 0; ox < treeW; ox++) {
      if (occupied.has(`${tx + ox}_${ty + oy}`)) return true;
    }
  }
  return false;
}

function markForestTreeOccupied(
  tx: number,
  ty: number,
  treeW: number,
  occupied: Set<string>
): void {
  for (let oy = 0; oy < FOREST_TRUNK_ROWS; oy++) {
    for (let ox = 0; ox < treeW; ox++) {
      occupied.add(`${tx + ox}_${ty + oy}`);
    }
  }
}

function collectOrganicForestTreesForPoi(
  poi: POINode,
  scanBounds: DirtyTileBounds | null,
  treeCtx: TreePlacementCheckContext,
  standingEntities: StampedStandingEntity[]
): void {
  let idHash = 0;
  for (let i = 0; i < poi.id.length; i++) {
    idHash = Math.trunc(idHash * FOREST_HASH_MULTIPLIER + poi.id.charCodeAt(i));
  }
  const halfW = Math.max(1, poi.footprint.width / 2);
  const halfH = Math.max(1, poi.footprint.height / 2);
  const centerX = poi.gridX + halfW;
  const centerY = poi.gridY + halfH;
  const isCompactForest =
    Math.min(poi.footprint.width, poi.footprint.height) <= FOREST_SMALL_BOUND_THRESHOLD;
  const compactBonus = isCompactForest ? 0.85 : 0;
  const forestOccupied = new Set<string>();

  for (let dy = 0; dy < poi.footprint.height; dy += isCompactForest ? 1 : 2) {
    for (let dx = 0; dx < poi.footprint.width; dx += isCompactForest ? 1 : 2) {
      const jx = !isCompactForest && Math.abs(idHash + dy * 7 + dx * 13) % 3 === 0 ? 1 : 0;
      const baseTx = Math.min(poi.gridX + poi.footprint.width - 2, poi.gridX + dx + jx);
      const ty = poi.gridY + dy;

      const normX = (baseTx + 1 - centerX) / halfW;
      const normY = (ty + 1 - centerY) / halfH;
      const angle = Math.atan2(normY, normX);
      const organicLimit =
        1.06 +
        compactBonus +
        0.14 * Math.sin(angle * 3 + idHash) +
        0.08 * Math.cos(angle * 5 - idHash * 0.5);
      if (Math.hypot(normX, normY) > organicLimit) continue;

      const tx = Math.max(poi.gridX, Math.min(poi.gridX + poi.footprint.width - 2, baseTx));
      const speciesRoll = Math.abs(idHash + tx * 19 + ty * 37) % 10;
      const tryOak =
        !isCompactForest && speciesRoll >= 8 && tx + 3 <= poi.gridX + poi.footprint.width;
      let treeW = tryOak ? 3 : 2;
      let overhang = tryOak ? 2 : 1;
      let drawY = ty - overhang;
      let file = tryOak ? 'poke_tree_oak_clean.png' : 'tree_viridian_forest.png';

      let fits =
        !hasForestTreeOverlap(tx, ty, treeW, forestOccupied) &&
        canPlaceTreeFootprint(tx, ty, treeW, isCompactForest ? 0 : overhang, treeCtx);

      if (!fits && tryOak) {
        treeW = 2;
        overhang = 1;
        drawY = ty - overhang;
        file = 'tree_viridian_forest.png';
        fits =
          !hasForestTreeOverlap(tx, ty, treeW, forestOccupied) &&
          canPlaceTreeFootprint(tx, ty, treeW, overhang, treeCtx);
      }
      if (!fits) continue;

      markForestTreeOccupied(tx, ty, treeW, forestOccupied);
      if (isPointWithinMargin(tx, drawY, scanBounds, treeW, overhang, treeW, 1)) {
        standingEntities.push({
          file,
          px: tx * CANVAS_TILE_SIZE,
          py: drawY * CANVAS_TILE_SIZE,
          ySort: (ty + 2) * CANVAS_TILE_SIZE,
          zPriority: CANVAS_RENDERER.Z_PRIORITY_LOWEST
        });
      }
    }
  }
}

function isPointWithinMargin(
  x: number,
  y: number,
  bounds: DirtyTileBounds | null,
  padMinX = ENTITY_BOUNDS_PAD_MIN_TILES,
  padMaxX = ENTITY_BOUNDS_PAD_MIN_TILES,
  padMinY = ENTITY_BOUNDS_PAD_MIN_TILES,
  padMaxY = ENTITY_BOUNDS_PAD_MIN_TILES
): boolean {
  if (!bounds) return true;
  return (
    x >= bounds.minX - padMinX &&
    x <= bounds.maxX + padMaxX &&
    y >= bounds.minY - padMinY &&
    y <= bounds.maxY + padMaxY
  );
}

function isPoiNearBounds(poi: POINode, bounds: DirtyTileBounds | null, margin: number): boolean {
  if (!bounds) return true;
  const maxPoiX = poi.gridX + poi.footprint.width + margin;
  const maxPoiY = poi.gridY + poi.footprint.height + margin;
  return (
    maxPoiX >= bounds.minX &&
    poi.gridX - margin <= bounds.maxX &&
    maxPoiY >= bounds.minY &&
    poi.gridY - margin <= bounds.maxY
  );
}

function resolveVignettePropHeight(prefabFile: string): number {
  if (prefabFile === 'poke_fountain.png' || prefabFile === 'poke_street_lamp.png') {
    return CANVAS_RENDERER.HEIGHT_SPAN_FOUNTAIN;
  }
  if (prefabFile === 'poke_port_cargo_crates_stack.png') {
    return CANVAS_RENDERER.HEIGHT_SPAN_CARGO;
  }
  return 1;
}

interface TreePlacementCheckContext {
  readonly W: number;
  readonly H: number;
  readonly buildingFootprintMask: readonly (readonly boolean[])[];
  readonly propBlockedSet: ReadonlySet<string>;
  readonly wilderness?: WildernessLayerResult | null;
  readonly continent: ContinentMapResult;
  readonly unifiedPathGrid: readonly (readonly boolean[])[];
}

function isTreeCellClear(cx: number, cy: number, ctx: TreePlacementCheckContext): boolean {
  if (cx < 0 || cx >= ctx.W || cy < 0 || cy >= ctx.H) return false;
  if (ctx.buildingFootprintMask[cy]?.[cx]) return false;
  if (ctx.propBlockedSet.has(`${cx}_${cy}`)) return false;
  if (ctx.wilderness?.tallGrassGrid?.[cy]?.[cx]) return false;
  if (ctx.continent.terrainMatrix[cy]?.[cx] !== 'grass') return false;
  if ((ctx.continent.heightmap[cy]?.[cx] ?? 0) !== 0) return false;
  if (ctx.continent.resolvedMountain.occupiedFootCells[cy]?.[cx]) return false;
  if (ctx.unifiedPathGrid[cy]?.[cx]) return false;
  return true;
}

function canPlaceTreeFootprint(
  tx: number,
  ty: number,
  width: number,
  canopyOverhang: number,
  ctx: TreePlacementCheckContext
): boolean {
  for (let dy = -canopyOverhang; dy <= 1; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (!isTreeCellClear(tx + dx, ty + dy, ctx)) {
        return false;
      }
    }
  }
  return true;
}

function computeSummitRockScore(c: number, r: number): number {
  const h =
    Math.sin(c * CANVAS_RENDERER.RUBBLE_HASH_X + r * CANVAS_RENDERER.RUBBLE_HASH_Y) *
    CANVAS_RENDERER.RUBBLE_HASH_MULT;
  return h - Math.floor(h);
}

interface SummitRockEligibilityContext {
  readonly W: number;
  readonly H: number;
  readonly continent: ContinentMapResult;
  readonly buildingFootprintMask: readonly (readonly boolean[])[];
  readonly poiFootprintSet: ReadonlySet<string>;
  readonly unifiedPathGrid: readonly (readonly boolean[])[];
}

function getEligibleSummitRockScore(
  ctx: SummitRockEligibilityContext,
  c: number,
  r: number
): number | null {
  if (c < 2 || c > ctx.W - 3 || r < 2 || r > ctx.H - 3) return null;
  if (ctx.buildingFootprintMask[r]?.[c] || ctx.poiFootprintSet.has(`${c}_${r}`)) return null;
  if (ctx.unifiedPathGrid[r]?.[c]) return null;
  const mCell = ctx.continent.resolvedMountain.cellDetails[r]?.[c];
  if (!mCell || mCell.elevation <= 0 || mCell.role !== 'floor_center') return null;

  const val = computeSummitRockScore(c, r);
  return val > CANVAS_RENDERER.RUBBLE_THRESHOLD ? val : null;
}

function isSummitRockLocalPeak(
  ctx: SummitRockEligibilityContext,
  c: number,
  r: number,
  centerVal: number
): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dc === 0 && dr === 0) continue;
      const nc = c + dc;
      const nr = r + dr;
      const nVal = getEligibleSummitRockScore(ctx, nc, nr);
      if (nVal === null) continue;
      if (nVal > centerVal || (nVal === centerVal && (nr < r || (nr === r && nc < c)))) {
        return false;
      }
    }
  }
  return true;
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
  const scanBounds = options?.bounds ? clampDirtyBounds(options.bounds, W, H) : null;
  const standingEntities: StampedStandingEntity[] = [];

  // 6a. Wilderness Props
  if (wilderness?.props) {
    for (const prop of wilderness.props) {
      if (!isPointWithinMargin(prop.x, prop.y, scanBounds, 1, 1, 1, 1)) continue;
      if (buildingFootprintMask[prop.y]?.[prop.x]) continue;
      const terr = continent.terrainMatrix[prop.y]?.[prop.x];
      const isAllowedTerrain =
        terr === 'grass' || terr === 'sand' || ALLOWED_NON_GRASS_PROP_TYPES.has(prop.type);
      if (!isAllowedTerrain) continue;
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

      if (STANDING_PROP_TYPES.has(prop.type)) {
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
      if (
        isPointWithinMargin(obs.x, obs.y, scanBounds, 1, 1, 2, 2) &&
        !buildingFootprintMask[obs.y]?.[obs.x]
      ) {
        standingEntities.push({
          file: obs.prefabFile,
          px: obs.x * CANVAS_TILE_SIZE,
          py: obs.y * CANVAS_TILE_SIZE,
          ySort: (obs.y + 1) * CANVAS_TILE_SIZE,
          zPriority: CANVAS_RENDERER.Z_PRIORITY_OBSTACLES
        });
      }
      if (!obs.flankingProps) continue;
      for (const fp of obs.flankingProps) {
        if (!isPointWithinMargin(fp.x, fp.y, scanBounds, 1, 1, 2, 2)) continue;
        if (buildingFootprintMask[fp.y]?.[fp.x]) continue;
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

  // 6a-3. Maritime Rock Obstacles
  if (options?.routeNetwork?.maritimeRockObstacles) {
    for (const obs of options.routeNetwork.maritimeRockObstacles) {
      if (!isPointWithinMargin(obs.x, obs.y, scanBounds, 1, 1, 1, 1)) continue;
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
        if (!isPointWithinMargin(prop.x, prop.y, scanBounds, 1, 1, 2, 2)) continue;
        if (!buildingFootprintMask[prop.y]?.[prop.x]) {
          const propH = resolveVignettePropHeight(prop.prefabFile);
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
  const nearbyPois = scanBounds
    ? pois.filter((p) => isPoiNearBounds(p, scanBounds, POI_LANDMARK_MARGIN_TILES))
    : pois;

  for (const poi of nearbyPois) {
    for (let dy = -1; dy <= poi.footprint.height; dy++) {
      for (let dx = -1; dx <= poi.footprint.width; dx++) {
        poiFootprintSet.add(`${poi.gridX + dx}_${poi.gridY + dy}`);
      }
    }
  }

  const boulderMinR = scanBounds ? Math.max(2, scanBounds.minY - 1) : 2;
  const boulderMaxR = scanBounds ? Math.min(H - 3, scanBounds.maxY + 1) : H - 3;
  const boulderMinC = scanBounds ? Math.max(2, scanBounds.minX - 1) : 2;
  const boulderMaxC = scanBounds ? Math.min(W - 3, scanBounds.maxX + 1) : W - 3;

  const summitRockCtx: SummitRockEligibilityContext = {
    W,
    H,
    continent,
    buildingFootprintMask,
    poiFootprintSet,
    unifiedPathGrid
  };

  for (let r = boulderMinR; r <= boulderMaxR; r++) {
    for (let c = boulderMinC; c <= boulderMaxC; c++) {
      const val = getEligibleSummitRockScore(summitRockCtx, c, r);
      if (val === null || !isSummitRockLocalPeak(summitRockCtx, c, r, val)) continue;

      const px = c * CANVAS_TILE_SIZE;
      const py = r * CANVAS_TILE_SIZE;
      const rockFile =
        val > CANVAS_RENDERER.BOULDER_THRESHOLD ? 'poke_rock_boulder.png' : 'poke_rock_rubble.png';
      standingEntities.push({
        file: rockFile,
        px: px + CANVAS_RENDERER.RUBBLE_CENTER_OFFSET_PX,
        py: py + CANVAS_RENDERER.RUBBLE_CENTER_OFFSET_PX,
        ySort: (r + 1) * CANVAS_TILE_SIZE,
        zPriority: CANVAS_RENDERER.Z_PRIORITY_OBSTACLES
      });
    }
  }

  // 6c. Architectural Buildings & Landmarks
  const buildingsToStamp = resolvePoiLandmarksAndBuildings({
    continent,
    pois: nearbyPois,
    buildingFootprintMask,
    unifiedPathGrid,
    bridgeGrid,
    tileSize: CANVAS_TILE_SIZE
  });

  for (const b of buildingsToStamp) {
    if (
      scanBounds &&
      (b.px < (scanBounds.minX - BUILDING_BOUNDS_PAD_TILES) * CANVAS_TILE_SIZE ||
        b.px > (scanBounds.maxX + 2) * CANVAS_TILE_SIZE ||
        b.py < (scanBounds.minY - BUILDING_BOUNDS_PAD_TILES) * CANVAS_TILE_SIZE ||
        b.py > (scanBounds.maxY + 2) * CANVAS_TILE_SIZE)
    ) {
      continue;
    }
    standingEntities.push({
      file: b.file,
      px: b.px,
      py: b.py,
      ySort: b.ySort,
      zPriority: CANVAS_RENDERER.Z_PRIORITY_BUILDINGS
    });
  }

  // 6d. Urban Props & Architectural Dressing
  for (const poi of nearbyPois) {
    if (poi.urbanLayout?.props) {
      for (const prop of poi.urbanLayout.props) {
        if (!isPointWithinMargin(prop.x, prop.y, scanBounds, 1, 1, 1, 3)) continue;
        if (buildingFootprintMask[prop.y]?.[prop.x]) continue;
        const px = prop.x * CANVAS_TILE_SIZE;
        const py = prop.y * CANVAS_TILE_SIZE;
        const drawPx = px;
        let drawPy = py;
        let ySort = (prop.y + 1) * CANVAS_TILE_SIZE;

        if (prop.type === 'fountain') {
          ySort = (prop.y + CANVAS_RENDERER.HEIGHT_SPAN_FOUNTAIN) * CANVAS_TILE_SIZE;
        } else if (prop.type === 'bench') {
          ySort =
            prop.prefabFile.includes('_v') || prop.prefabFile.includes('vertical')
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

  const propBlockedSet = new Set<string>();
  for (const poi of nearbyPois) {
    if (!poi.urbanLayout?.props) continue;
    for (const p of poi.urbanLayout.props) {
      propBlockedSet.add(`${p.x}_${p.y}`);
    }
  }
  if (wilderness?.props) {
    for (const prop of wilderness.props) {
      if (!isPointWithinMargin(prop.x, prop.y, scanBounds, 4, 4, 4, 4)) continue;
      if (!prop.prefabFile.startsWith('tree_') && !prop.prefabFile.startsWith('poke_tree_')) {
        propBlockedSet.add(`${prop.x}_${prop.y}`);
      }
    }
  }

  const treeCtx: TreePlacementCheckContext = {
    W,
    H,
    buildingFootprintMask,
    propBlockedSet,
    wilderness,
    continent,
    unifiedPathGrid
  };

  // 6e. Strict North-to-South Trees (Wilderness + Dungeon Forests)
  if (wilderness?.trees) {
    for (const t of wilderness.trees) {
      const drawY = t.y - (t.height - 2);
      if (!isPointWithinMargin(t.x, drawY, scanBounds, 2, 1, 2, 1)) continue;
      const canopyOverhang = t.height - 2;
      if (canPlaceTreeFootprint(t.x, t.y, t.width, canopyOverhang, treeCtx)) {
        const drawPy = drawY * CANVAS_TILE_SIZE;
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

  // Dungeon Forest Organic Infill: irregular silhouette + varied species without rigid rectangular lattice
  for (const poi of nearbyPois) {
    if (poi.type !== 'dungeon_forest') continue;
    collectOrganicForestTreesForPoi(poi, scanBounds, treeCtx, standingEntities);
  }

  // 6f. Master 2.5D North-to-South Y-depth sort
  standingEntities.sort((a, b) => {
    if (a.ySort !== b.ySort) return a.ySort - b.ySort;
    if (a.zPriority !== b.zPriority) return a.zPriority - b.zPriority;
    return a.px - b.px;
  });

  return standingEntities;
}
