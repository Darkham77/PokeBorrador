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

import { CANVAS_RENDERER } from '../../config/canvasRendererConfig.ts';
import { CANVAS_TILE_SIZE } from '../../config/studioConstants.ts';
import type { DirtyTileBounds } from '../../types/map/autotileHealingTypes.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import { clampDirtyBounds, expandDirtyBounds } from '../utils/gridGeometryUtils.ts';
import { CARDINAL_DELTAS, hasDropped2DInnerCorner } from './autotileDefectScanner.ts';
import { resolveCanonicalBridges } from './canonicalBridgeEngine.ts';
import type { BuildMapBlitOptions } from './canvasTileRenderer.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import { resolveMacroBiomeAutotile } from './macroBiomeAutotileEngine.ts';
import {
  resolvePathGrid,
  sanitizePathGridWidth,
  CANONICAL_STONE_PLAZA_BRUSH
} from './pathAutotileEngine.ts';
import { getCanonicalUrbanRoadTile } from './urbanPavingEngine.ts';

const DIRT_SETTLEMENT_TYPE_LIST = ['town', 'dungeon_forest', 'route_gate'] as const;
type DirtSettlementType = (typeof DIRT_SETTLEMENT_TYPE_LIST)[number];
const DIRT_SETTLEMENT_TYPES: ReadonlySet<DirtSettlementType> = new Set<DirtSettlementType>(
  DIRT_SETTLEMENT_TYPE_LIST
);

export interface TerrainPathBlitContext {
  readonly continent: ContinentMapResult;
  readonly pois: readonly POINode[];
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
  readonly buildingFootprintMask: readonly (readonly boolean[])[];
  readonly addBlit: (filename: string, px: number, py: number) => void;
  readonly options?: BuildMapBlitOptions;
}

function blitTileWithOverlays(
  primaryTile: string,
  overlayTiles: readonly string[] | undefined,
  px: number,
  py: number,
  addBlit: (filename: string, px: number, py: number) => void
): void {
  addBlit(primaryTile, px, py);
  if (overlayTiles) {
    for (const ov of overlayTiles) {
      addBlit(ov, px, py);
    }
  }
}

const MAX_CLIP_POLISH_ITERS = 16;
const MIN_CLIPPED_SNIPPET_CELLS = 12;
const PATH_POLISH_MARGIN_TILES = 24;

function isCoordInsideBounds(x: number, y: number, b: DirtyTileBounds): boolean {
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

interface ClippedPathPolishContext {
  readonly pathGrid: boolean[][];
  readonly continent: ContinentMapResult;
  readonly pois: readonly POINode[];
  readonly bridgeGrid: readonly (readonly boolean[])[] | undefined;
  readonly buildingFootprintMask: readonly (readonly boolean[])[];
  readonly urbanRoadSet: ReadonlySet<string>;
  readonly plazaGrid: readonly (readonly boolean[])[];
  readonly isPavedSector: (r: number, c: number) => boolean;
  readonly subBounds: DirtyTileBounds;
  readonly isBoundedMode: boolean;
  readonly manualPathGrid?: readonly (readonly boolean[])[];
}

function hasClippedEffectivePath(ctx: ClippedPathPolishContext, x: number, y: number): boolean {
  const { continent, pathGrid, bridgeGrid } = ctx;
  if (x < 0 || x >= continent.width || y < 0 || y >= continent.height) return true;
  return Boolean(pathGrid[y]?.[x] || bridgeGrid?.[y]?.[x]);
}

function canFillClippedPathCell(ctx: ClippedPathPolishContext, x: number, y: number): boolean {
  const { continent, buildingFootprintMask, isPavedSector } = ctx;
  if (x < 0 || x >= continent.width || y < 0 || y >= continent.height) return false;
  if (continent.terrainMatrix[y]?.[x] !== 'grass') return false;
  if (buildingFootprintMask[y]?.[x] || continent.resolvedMountain.occupiedFootCells[y]?.[x]) {
    return false;
  }
  return isPavedSector(y, x);
}

function collectCellClippedElbows(
  ctx: ClippedPathPolishContext,
  x: number,
  y: number,
  additions: { x: number; y: number }[]
): void {
  const pN = hasClippedEffectivePath(ctx, x, y - 1);
  const pS = hasClippedEffectivePath(ctx, x, y + 1);
  const pW = hasClippedEffectivePath(ctx, x - 1, y);
  const pE = hasClippedEffectivePath(ctx, x + 1, y);
  if (
    pN &&
    pW &&
    !hasClippedEffectivePath(ctx, x - 1, y - 1) &&
    canFillClippedPathCell(ctx, x - 1, y - 1)
  ) {
    additions.push({ x: x - 1, y: y - 1 });
  }
  if (
    pN &&
    pE &&
    !hasClippedEffectivePath(ctx, x + 1, y - 1) &&
    canFillClippedPathCell(ctx, x + 1, y - 1)
  ) {
    additions.push({ x: x + 1, y: y - 1 });
  }
  if (
    pS &&
    pW &&
    !hasClippedEffectivePath(ctx, x - 1, y + 1) &&
    canFillClippedPathCell(ctx, x - 1, y + 1)
  ) {
    additions.push({ x: x - 1, y: y + 1 });
  }
  if (
    pS &&
    pE &&
    !hasClippedEffectivePath(ctx, x + 1, y + 1) &&
    canFillClippedPathCell(ctx, x + 1, y + 1)
  ) {
    additions.push({ x: x + 1, y: y + 1 });
  }
}

function fillClippedPathElbowsOnce(ctx: ClippedPathPolishContext): void {
  const additions: { x: number; y: number }[] = [];
  for (let y = ctx.subBounds.minY; y <= ctx.subBounds.maxY; y++) {
    for (let x = ctx.subBounds.minX; x <= ctx.subBounds.maxX; x++) {
      if (ctx.pathGrid[y]?.[x]) {
        collectCellClippedElbows(ctx, x, y, additions);
      }
    }
  }
  for (const pt of additions) {
    const row = ctx.pathGrid[pt.y];
    if (row) row[pt.x] = true;
  }
}

function isInvalidClippedPathCell(ctx: ClippedPathPolishContext, x: number, y: number): boolean {
  if (!ctx.pathGrid[y]?.[x] || ctx.bridgeGrid?.[y]?.[x] || ctx.manualPathGrid?.[y]?.[x]) {
    return false;
  }
  const pN = hasClippedEffectivePath(ctx, x, y - 1);
  const pS = hasClippedEffectivePath(ctx, x, y + 1);
  const pW = hasClippedEffectivePath(ctx, x - 1, y);
  const pE = hasClippedEffectivePath(ctx, x + 1, y);
  if ((!pN && !pS) || (!pW && !pE)) return true;
  return hasDropped2DInnerCorner({
    sameN: pN,
    sameS: pS,
    sameW: pW,
    sameE: pE,
    sameNW: hasClippedEffectivePath(ctx, x - 1, y - 1),
    sameNE: hasClippedEffectivePath(ctx, x + 1, y - 1),
    sameSW: hasClippedEffectivePath(ctx, x - 1, y + 1),
    sameSE: hasClippedEffectivePath(ctx, x + 1, y + 1)
  });
}

function clearClippedPair(
  ctx: ClippedPathPolishContext,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  let cleared = false;
  const row1 = ctx.pathGrid[y1];
  if (row1?.[x1] && !ctx.bridgeGrid?.[y1]?.[x1] && !ctx.manualPathGrid?.[y1]?.[x1]) {
    row1[x1] = false;
    cleared = true;
  }
  const row2 = ctx.pathGrid[y2];
  if (row2?.[x2] && !ctx.bridgeGrid?.[y2]?.[x2] && !ctx.manualPathGrid?.[y2]?.[x2]) {
    row2[x2] = false;
    cleared = true;
  }
  return cleared;
}

function pruneClippedQuadPinchesPass(ctx: ClippedPathPolishContext): boolean {
  let changed = false;
  const maxY = Math.min(ctx.continent.height - 2, ctx.subBounds.maxY);
  const maxX = Math.min(ctx.continent.width - 2, ctx.subBounds.maxX);
  for (let y = ctx.subBounds.minY; y <= maxY; y++) {
    for (let x = ctx.subBounds.minX; x <= maxX; x++) {
      const tl = hasClippedEffectivePath(ctx, x, y);
      const tr = hasClippedEffectivePath(ctx, x + 1, y);
      const bl = hasClippedEffectivePath(ctx, x, y + 1);
      const br = hasClippedEffectivePath(ctx, x + 1, y + 1);
      if (tl && br && !tr && !bl && clearClippedPair(ctx, x, y, x + 1, y + 1)) {
        changed = true;
      } else if (tr && bl && !tl && !br && clearClippedPair(ctx, x + 1, y, x, y + 1)) {
        changed = true;
      }
    }
  }
  return changed;
}

function pruneClippedSliversPass(ctx: ClippedPathPolishContext): boolean {
  const removals: { x: number; y: number }[] = [];
  for (let y = ctx.subBounds.minY; y <= ctx.subBounds.maxY; y++) {
    for (let x = ctx.subBounds.minX; x <= ctx.subBounds.maxX; x++) {
      if (isInvalidClippedPathCell(ctx, x, y)) {
        removals.push({ x, y });
      }
    }
  }
  for (const pt of removals) {
    ctx.pathGrid[pt.y]![pt.x] = false;
  }
  return removals.length > 0;
}

function pruneInvalidClippedPathCells(ctx: ClippedPathPolishContext): void {
  for (let iter = 0; iter < MAX_CLIP_POLISH_ITERS; iter++) {
    const pinchChanged = pruneClippedQuadPinchesPass(ctx);
    const sliverChanged = pruneClippedSliversPass(ctx);
    if (!pinchChanged && !sliverChanged) break;
  }
}

function addRectAnchorKeys(
  anchorKeys: Set<string>,
  startX: number,
  startY: number,
  width: number,
  height: number
): void {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      anchorKeys.add(`${startX + dx}_${startY + dy}`);
    }
  }
}

function addPoiCoreAnchors(poi: POINode, anchorKeys: Set<string>): void {
  if (poi.gateways) {
    for (const gw of poi.gateways) {
      anchorKeys.add(`${gw.x}_${gw.y}`);
    }
  }
  if (poi.urbanLayout) {
    for (const st of poi.urbanLayout.internalStreets) {
      anchorKeys.add(`${st.x}_${st.y}`);
    }
    for (const b of poi.urbanLayout.buildings) {
      addRectAnchorKeys(anchorKeys, b.x, b.y, b.width, b.height);
    }
    return;
  }
  addRectAnchorKeys(anchorKeys, poi.gridX, poi.gridY, poi.footprint.width, poi.footprint.height);
}

function buildClippedPathAnchorSet(ctx: ClippedPathPolishContext): ReadonlySet<string> {
  const anchorKeys = new Set<string>(ctx.urbanRoadSet);
  for (const poi of ctx.pois) {
    addPoiCoreAnchors(poi, anchorKeys);
  }
  return anchorKeys;
}

function isNeighborCellAnchor(
  ctx: ClippedPathPolishContext,
  anchorKeys: ReadonlySet<string>,
  nx: number,
  ny: number
): boolean {
  const { continent, bridgeGrid, plazaGrid } = ctx;
  if (nx < 0 || nx >= continent.width || ny < 0 || ny >= continent.height) return true;
  if (anchorKeys.has(`${nx}_${ny}`) || bridgeGrid?.[ny]?.[nx] || plazaGrid[ny]?.[nx]) return true;
  const mRole = continent.resolvedMountain.cellDetails[ny]?.[nx]?.role;
  return mRole === 'stairs_l' || mRole === 'stairs_r';
}

function isClippedCellAnchored(
  ctx: ClippedPathPolishContext,
  anchorKeys: ReadonlySet<string>,
  x: number,
  y: number
): boolean {
  if (ctx.manualPathGrid?.[y]?.[x]) return true;
  if (
    ctx.isBoundedMode &&
    ((x === ctx.subBounds.minX && x > 0) ||
      (x === ctx.subBounds.maxX && x < ctx.continent.width - 1) ||
      (y === ctx.subBounds.minY && y > 0) ||
      (y === ctx.subBounds.maxY && y < ctx.continent.height - 1))
  ) {
    return true;
  }
  const { continent } = ctx;
  if ((continent.heightmap[y]?.[x] ?? 0) >= 1) return true;
  const biome = continent.macroBiomes?.biomeGrid[y]?.[x];
  if (biome === 'arid_desert' || biome === 'volcanic_plateau') return true;
  if (isNeighborCellAnchor(ctx, anchorKeys, x, y)) return true;
  for (const d of CARDINAL_DELTAS) {
    if (isNeighborCellAnchor(ctx, anchorKeys, x + d.dx, y + d.dy)) return true;
  }
  return false;
}

function collectClippedComponent(
  ctx: ClippedPathPolishContext,
  startX: number,
  startY: number,
  visited: Set<string>,
  anchorKeys: ReadonlySet<string>
): { cells: { x: number; y: number }[]; anchored: boolean } {
  const cells: { x: number; y: number }[] = [{ x: startX, y: startY }];
  visited.add(`${startX}_${startY}`);
  let anchored = false;
  let head = 0;

  while (head < cells.length) {
    const cur = cells[head++]!;
    if (!anchored && isClippedCellAnchored(ctx, anchorKeys, cur.x, cur.y)) {
      anchored = true;
    }
    for (const d of CARDINAL_DELTAS) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      if (!isCoordInsideBounds(nx, ny, ctx.subBounds)) continue;
      const key = `${nx}_${ny}`;
      if (ctx.pathGrid[ny]?.[nx] && !visited.has(key)) {
        visited.add(key);
        cells.push({ x: nx, y: ny });
      }
    }
  }

  return { cells, anchored };
}

function pruneUnanchoredClippedSnippets(ctx: ClippedPathPolishContext): void {
  const anchorKeys = buildClippedPathAnchorSet(ctx);
  const visited = new Set<string>();
  for (let y = ctx.subBounds.minY; y <= ctx.subBounds.maxY; y++) {
    for (let x = ctx.subBounds.minX; x <= ctx.subBounds.maxX; x++) {
      if (!ctx.pathGrid[y]?.[x] || visited.has(`${x}_${y}`)) continue;
      const comp = collectClippedComponent(ctx, x, y, visited, anchorKeys);
      if (!comp.anchored && comp.cells.length < MIN_CLIPPED_SNIPPET_CELLS) {
        for (const pt of comp.cells) {
          ctx.pathGrid[pt.y]![pt.x] = false;
        }
      }
    }
  }
}

function polishClippedPathGrid(ctx: ClippedPathPolishContext): void {
  fillClippedPathElbowsOnce(ctx);
  pruneInvalidClippedPathCells(ctx);
  pruneUnanchoredClippedSnippets(ctx);
}

/**
 * Renders base terrain, water, urban avenues, plazas, paths, bridges, and mountain cliffs.
 */
function markMetropolisCapitalPlazaRect(
  poi: POINode,
  allocBounds: DirtyTileBounds,
  plazaGrid: boolean[][],
  urbanRoadSet: Set<string>
): void {
  const minX = Math.max(allocBounds.minX, poi.gridX);
  const maxX = Math.min(allocBounds.maxX + 1, poi.gridX + poi.footprint.width);
  const minY = Math.max(allocBounds.minY, poi.gridY);
  const maxY = Math.min(allocBounds.maxY + 1, poi.gridY + poi.footprint.height);
  for (let y = minY; y < maxY; y++) {
    const plazaRow = plazaGrid[y];
    for (let x = minX; x < maxX; x++) {
      if (plazaRow) plazaRow[x] = true;
      urbanRoadSet.add(`${x}_${y}`);
    }
  }
}

export function renderBaseTerrainAndCliffs(ctx: TerrainPathBlitContext): void {
  const { continent, pois, pathGrid, bridgeGrid, buildingFootprintMask, addBlit, options } = ctx;

  const H = continent.height;
  const W = continent.width;
  if (H === 0 || W === 0) return;

  const isBoundedMode = options?.bounds !== undefined;
  const renderBounds = options?.bounds
    ? clampDirtyBounds(options.bounds, W, H)
    : { minX: 0, minY: 0, maxX: W - 1, maxY: H - 1 };
  if (renderBounds.minX > renderBounds.maxX || renderBounds.minY > renderBounds.maxY) return;

  const subBounds = isBoundedMode
    ? expandDirtyBounds(renderBounds, PATH_POLISH_MARGIN_TILES, W, H)
    : renderBounds;
  const allocBounds = isBoundedMode ? expandDirtyBounds(subBounds, 1, W, H) : renderBounds;

  // 1. Base Terrain & Water & Coast & Foam
  const macroBiomesResult =
    continent.resolvedMacroBiomes ??
    (continent.macroBiomes
      ? resolveMacroBiomeAutotile(
          continent.macroBiomes.biomeGrid,
          continent.terrainMatrix,
          continent.heightmap
        )
      : null);

  const renderCellBaseTerrain = (r: number, c: number): void => {
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
      const hasElev0Neighbor =
        (continent.heightmap[r - 1]?.[c] ?? 0) === 0 ||
        (continent.heightmap[r + 1]?.[c] ?? 0) === 0 ||
        (continent.heightmap[r]?.[c - 1] ?? 0) === 0 ||
        (continent.heightmap[r]?.[c + 1] ?? 0) === 0;

      if (isOuterCorner && hasElev0Neighbor) {
        const mbCell = macroBiomesResult?.cellDetails[r]?.[c];
        if (mbCell) {
          for (const t of mbCell.layerStack) {
            addBlit(t, px, py);
          }
        } else {
          addBlit('poke_grass_plain.png', px, py);
        }

        if (
          r > 0 &&
          c > 0 &&
          (mCell?.role === 'corner_outer_sw_top' || mCell?.role === 'edge_west')
        ) {
          const westNorthMtn = continent.resolvedMountain.cellDetails[r - 1]?.[c - 1];
          if (westNorthMtn?.projectedFoot && !westNorthMtn.projectedFoot.tile.includes('corner')) {
            addBlit(westNorthMtn.projectedFoot.tile, px, py);
          }
        } else if (
          r > 0 &&
          c < W - 1 &&
          (mCell?.role === 'corner_outer_se_top' || mCell?.role === 'edge_east')
        ) {
          const eastNorthMtn = continent.resolvedMountain.cellDetails[r - 1]?.[c + 1];
          if (eastNorthMtn?.projectedFoot && !eastNorthMtn.projectedFoot.tile.includes('corner')) {
            addBlit(eastNorthMtn.projectedFoot.tile, px, py);
          }
        }
      } else {
        const mtnPal =
          continent.geologicalClusters?.paletteMatrix?.[r]?.[c] ??
          continent.mountainPalette ??
          'brown';
        const plateauBase =
          mtnPal === 'gray'
            ? 'poke_cliff_gray_plateau_rock.png'
            : 'poke_cliff_brown_plateau_rock.png';
        addBlit(plateauBase, px, py);

        // Side cliff edges immediately adjacent to protruding higher south cliff faces need face underlay beneath the wall
        if (r > 0 && c > 0 && mCell?.role === 'edge_west') {
          const westNorthMtn = continent.resolvedMountain.cellDetails[r - 1]?.[c - 1];
          if (westNorthMtn?.projectedFoot && !westNorthMtn.projectedFoot.tile.includes('corner')) {
            addBlit(westNorthMtn.projectedFoot.tile, px, py);
          }
        } else if (r > 0 && c < W - 1 && mCell?.role === 'edge_east') {
          const eastNorthMtn = continent.resolvedMountain.cellDetails[r - 1]?.[c + 1];
          if (eastNorthMtn?.projectedFoot && !eastNorthMtn.projectedFoot.tile.includes('corner')) {
            addBlit(eastNorthMtn.projectedFoot.tile, px, py);
          }
        }
      }
      return;
    }

    if (curTerrain === 'water' || curTerrain === 'water_deep') {
      if (waterCell && (waterCell.terrain === 'water' || waterCell.terrain === 'water_deep')) {
        for (const t of waterCell.layerStack) {
          addBlit(t, px, py);
        }
      } else {
        addBlit(
          curTerrain === 'water_deep' ? 'poke_water_deep.png' : 'poke_water_ocean_center.png',
          px,
          py
        );
      }
      return;
    }

    if (curTerrain === 'sand') {
      if (waterCell && waterCell.terrain === 'sand') {
        for (const t of waterCell.layerStack) {
          addBlit(t, px, py);
        }
      } else {
        addBlit('poke_sand_water_center.png', px, py);
      }
      return;
    }

    const mCell = macroBiomesResult?.cellDetails[r]?.[c];
    if (mCell) {
      for (const t of mCell.layerStack) {
        addBlit(t, px, py);
      }
    } else {
      addBlit('poke_grass_plain.png', px, py);
    }
  };

  for (let r = renderBounds.minY; r <= renderBounds.maxY; r++) {
    for (let c = renderBounds.minX; c <= renderBounds.maxX; c++) {
      renderCellBaseTerrain(r, c);
    }
  }

  // 2. Urban Streets & Paved Sidewalks/Plazas in Settlements
  const urbanRoadSet = new Set<string>();
  const unifiedPathGrid: boolean[][] = Array.from({ length: H }, (): boolean[] => []);
  const plazaGrid: boolean[][] = Array.from({ length: H }, (): boolean[] => []);
  for (let r = allocBounds.minY; r <= allocBounds.maxY; r++) {
    const pRow = pathGrid[r];
    const bRow = buildingFootprintMask[r];
    const uRow = Array<boolean>(W).fill(false);
    for (let c = allocBounds.minX; c <= allocBounds.maxX; c++) {
      uRow[c] = Boolean(pRow?.[c]) && !bRow?.[c];
    }
    unifiedPathGrid[r] = uRow;
    plazaGrid[r] = Array<boolean>(W).fill(false);
  }

  for (const poi of pois) {
    const isDirtSettlement =
      poi.urbanLayout?.roadMaterial === 'dirt' ||
      /island|canela|cinnabar|isla/i.test(poi.id) ||
      /isla|island/i.test(poi.name) ||
      poi.terrainPreference === 'coast_water';

    if ((poi.type !== 'city' || isDirtSettlement) && poi.type !== 'metropolis') continue;

    const minX = Math.max(allocBounds.minX, poi.gridX);
    const maxX = Math.min(allocBounds.maxX + 1, poi.gridX + poi.footprint.width);
    const minY = Math.max(allocBounds.minY, poi.gridY);
    const maxY = Math.min(allocBounds.maxY + 1, poi.gridY + poi.footprint.height);
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const isGateway = poi.gateways?.some((gw) => gw.x === x && gw.y === y);
        if (!isGateway && unifiedPathGrid[y]) {
          unifiedPathGrid[y]![x] = false;
        }
      }
    }
  }

  const renderUrbanCurbs = (poi: POINode): void => {
    if (!poi.urbanLayout || poi.type === 'pokemon_league') return;
    const internalStreets = poi.urbanLayout.internalStreets;
    const pavedPlazaCells = poi.urbanLayout.pavedPlazaCells;
    const neighbors = [
      { dx: 0, dy: -1, curb: 'poke_curb_n.png' },
      { dx: 0, dy: 1, curb: 'poke_curb_s.png' },
      { dx: -1, dy: 0, curb: 'poke_curb_w.png' },
      { dx: 1, dy: 0, curb: 'poke_curb_e.png' }
    ];

    for (const cell of internalStreets) {
      if (!isCoordInsideBounds(cell.x, cell.y, renderBounds)) continue;
      if (buildingFootprintMask[cell.y]?.[cell.x]) continue;
      const px = cell.x * CANVAS_TILE_SIZE;
      const py = cell.y * CANVAS_TILE_SIZE;

      for (const n of neighbors) {
        const nx = cell.x + n.dx;
        const ny = cell.y + n.dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;

        const isAsphaltNeighbor = internalStreets.some((s) => s.x === nx && s.y === ny);
        const isPlazaNeighbor = pavedPlazaCells.some((p) => p.x === nx && p.y === ny);
        const isBuildingNeighbor = buildingFootprintMask[ny]?.[nx];
        const hasConnectingPath = unifiedPathGrid[ny]?.[nx];

        if (!isAsphaltNeighbor && !isPlazaNeighbor && !isBuildingNeighbor && !hasConnectingPath) {
          addBlit(n.curb, px, py);
        }
      }
    }
  };

  for (const poi of pois) {
    if (!poi.urbanLayout) continue;

    const isDirtSettlement =
      DIRT_SETTLEMENT_TYPES.has(poi.type as DirtSettlementType) ||
      poi.urbanLayout.roadMaterial === 'dirt' ||
      /island|canela|cinnabar|isla/i.test(poi.id) ||
      /isla|island/i.test(poi.name) ||
      poi.terrainPreference === 'coast_water';

    if (isDirtSettlement) {
      for (const cell of poi.urbanLayout.internalStreets) {
        if (!isCoordInsideBounds(cell.x, cell.y, allocBounds)) continue;
        if (buildingFootprintMask[cell.y]?.[cell.x]) continue;
        if (unifiedPathGrid[cell.y]) unifiedPathGrid[cell.y]![cell.x] = true;
      }
    } else if (poi.type === 'metropolis') {
      for (const cell of poi.urbanLayout.internalStreets) {
        if (!isCoordInsideBounds(cell.x, cell.y, allocBounds)) continue;
        if (plazaGrid[cell.y]) plazaGrid[cell.y]![cell.x] = true;
        urbanRoadSet.add(`${cell.x}_${cell.y}`);
      }
    } else {
      const roadTile = getCanonicalUrbanRoadTile(poi.type);
      for (const cell of poi.urbanLayout.internalStreets) {
        if (!isCoordInsideBounds(cell.x, cell.y, allocBounds)) continue;
        if (buildingFootprintMask[cell.y]?.[cell.x]) continue;
        urbanRoadSet.add(`${cell.x}_${cell.y}`);
        if (isCoordInsideBounds(cell.x, cell.y, renderBounds)) {
          addBlit(roadTile, cell.x * CANVAS_TILE_SIZE, cell.y * CANVAS_TILE_SIZE);
        }
      }
      renderUrbanCurbs(poi);
    }

    for (const cell of poi.urbanLayout.pavedPlazaCells) {
      if (!isCoordInsideBounds(cell.x, cell.y, allocBounds)) continue;
      if (plazaGrid[cell.y]) plazaGrid[cell.y]![cell.x] = true;
      urbanRoadSet.add(`${cell.x}_${cell.y}`);
    }

    if (poi.type === 'metropolis' && poi.id === 'celadon_capital') {
      markMetropolisCapitalPlazaRect(poi, allocBounds, plazaGrid, urbanRoadSet);
    }
  }

  // 2b. Autotile Cobblestone Plazas using CANONICAL_STONE_PLAZA_BRUSH
  const plazaAutotile = resolvePathGrid(
    plazaGrid,
    undefined,
    CANONICAL_STONE_PLAZA_BRUSH,
    renderBounds
  );
  for (let r = renderBounds.minY; r <= renderBounds.maxY; r++) {
    for (let c = renderBounds.minX; c <= renderBounds.maxX; c++) {
      const plCell = plazaAutotile.pathDetails[r]?.[c];
      if (plCell) {
        blitTileWithOverlays(
          plCell.primaryTile,
          plCell.overlayTiles,
          c * CANVAS_TILE_SIZE,
          r * CANVAS_TILE_SIZE,
          addBlit
        );
      }
    }
  }

  // 2c. Directional Stone Curbs with Curb Clearance
  for (const poi of pois) {
    if (poi.type !== 'metropolis' && poi.type !== 'pokemon_league' && poi.urbanLayout?.curbs) {
      for (const curb of poi.urbanLayout.curbs) {
        if (!isCoordInsideBounds(curb.x, curb.y, renderBounds)) continue;
        if (buildingFootprintMask[curb.y]?.[curb.x]) continue;
        addBlit(curb.curbTile, curb.x * CANVAS_TILE_SIZE, curb.y * CANVAS_TILE_SIZE);
      }
    }
  }

  // 3. Dirt Paths & Road Network (preserve POI-connected interurban trails & manual paths; prune detached/severed stubs)
  const poiReachablePathKeys = new Set<string>();
  const pathSeedQueue: { readonly x: number; readonly y: number }[] = [];
  for (const poi of pois) {
    const minPx = Math.max(allocBounds.minX, poi.gridX - 1);
    const maxPx = Math.min(allocBounds.maxX, poi.gridX + poi.footprint.width);
    const minPy = Math.max(allocBounds.minY, poi.gridY - 1);
    const maxPy = Math.min(allocBounds.maxY, poi.gridY + poi.footprint.height);
    for (let pr = minPy; pr <= maxPy; pr++) {
      for (let pc = minPx; pc <= maxPx; pc++) {
        if (!unifiedPathGrid[pr]?.[pc] && !bridgeGrid?.[pr]?.[pc]) continue;
        const key = `${pc}_${pr}`;
        if (poiReachablePathKeys.has(key)) continue;
        poiReachablePathKeys.add(key);
        pathSeedQueue.push({ x: pc, y: pr });
      }
    }
  }
  for (let qi = 0; qi < pathSeedQueue.length; qi++) {
    const cur = pathSeedQueue[qi]!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (
        nx < allocBounds.minX ||
        nx > allocBounds.maxX ||
        ny < allocBounds.minY ||
        ny > allocBounds.maxY
      ) {
        continue;
      }
      if (!unifiedPathGrid[ny]?.[nx] && !bridgeGrid?.[ny]?.[nx]) continue;
      const key = `${nx}_${ny}`;
      if (poiReachablePathKeys.has(key)) continue;
      poiReachablePathKeys.add(key);
      pathSeedQueue.push({ x: nx, y: ny });
    }
  }

  const isPavedSector = (r: number, c: number): boolean => {
    if (urbanRoadSet.has(`${c}_${r}`)) return true;
    if (options?.manualPathGrid?.[r]?.[c]) return true;
    return poiReachablePathKeys.has(`${c}_${r}`);
  };

  for (let r = allocBounds.minY; r <= allocBounds.maxY; r++) {
    for (let c = allocBounds.minX; c <= allocBounds.maxX; c++) {
      if (
        (continent.terrainMatrix[r]?.[c] !== 'grass' &&
          continent.terrainMatrix[r]?.[c] !== 'sand') ||
        buildingFootprintMask[r]?.[c] ||
        continent.resolvedMountain.occupiedFootCells[r]?.[c] ||
        !isPavedSector(r, c)
      ) {
        if (unifiedPathGrid[r]) unifiedPathGrid[r]![c] = false;
      }
    }
  }
  const sanitizedPathGrid = sanitizePathGridWidth(
    unifiedPathGrid,
    continent.terrainMatrix,
    options?.manualPathGrid,
    subBounds
  );
  polishClippedPathGrid({
    pathGrid: sanitizedPathGrid,
    continent,
    pois,
    bridgeGrid,
    buildingFootprintMask,
    urbanRoadSet,
    plazaGrid,
    isPavedSector,
    subBounds,
    isBoundedMode,
    manualPathGrid: options?.manualPathGrid
  });
  const pathAutotile = resolvePathGrid(sanitizedPathGrid, bridgeGrid, undefined, renderBounds);
  for (let r = renderBounds.minY; r <= renderBounds.maxY; r++) {
    for (let c = renderBounds.minX; c <= renderBounds.maxX; c++) {
      const pCell = pathAutotile.pathDetails[r]?.[c];
      if (!pCell || pCell.isBridge) continue;
      if (continent.terrainMatrix[r]?.[c] !== 'grass') continue;
      // Sand deserts use CANONICAL_SAND_BEACH_BRUSH directly; blitting dirt-path borders over sand leaves artificial outline rings inside sand.
      if (continent.macroBiomes?.biomeGrid[r]?.[c] === 'arid_desert') continue;

      const px = c * CANVAS_TILE_SIZE;
      const py = r * CANVAS_TILE_SIZE;

      if (!urbanRoadSet.has(`${c}_${r}`)) {
        blitTileWithOverlays(pCell.primaryTile, pCell.overlayTiles, px, py, addBlit);
      }
    }
  }

  // 3b. Canonical GBA Boardwalk Bridges & Shore Steps
  if (bridgeGrid) {
    const portDockBridgeKeys =
      options?.portDockBridgeKeys ??
      (() => {
        const keys = new Set<string>();
        const isWaterCell = (r: number, c: number): boolean => {
          const t = continent.terrainMatrix[r]?.[c] ?? continent.cells[r]?.[c]?.terrain;
          return t === 'water' || t === 'water_deep';
        };

        const collectSouthPier = (node: POINode, pierLen: number): void => {
          const startY = node.gridY + node.footprint.height;
          const px =
            node.gridX +
            (node.footprint.width >= 7 ? Math.floor((node.footprint.width - 3) / 2) : 2);
          for (let dy = 0; dy < pierLen; dy++) {
            const py = startY + dy;
            if (py < 0 || py >= H || px < 0 || px + 2 >= W) break;
            if (!isWaterCell(py, px) || !isWaterCell(py, px + 1) || !isWaterCell(py, px + 2)) break;
            keys.add(`${px}_${py}`);
            keys.add(`${px + 1}_${py}`);
            keys.add(`${px + 2}_${py}`);
          }
        };

        const collectNorthPier = (node: POINode, pierLen: number): void => {
          const startY = node.gridY - 1;
          const px =
            node.gridX +
            (node.footprint.width >= 7 ? Math.floor((node.footprint.width - 3) / 2) : 2);
          let lastPy = startY;
          for (let dy = 0; dy < pierLen; dy++) {
            const py = startY - dy;
            if (py < 0 || py >= H || px < 0 || px + 2 >= W) break;
            if (!isWaterCell(py, px) || !isWaterCell(py, px + 1) || !isWaterCell(py, px + 2)) break;
            keys.add(`${px}_${py}`);
            keys.add(`${px + 1}_${py}`);
            keys.add(`${px + 2}_${py}`);
            lastPy = py;
          }
          for (let r = lastPy; r <= Math.min(startY, lastPy + 1); r++) {
            for (let c = px - 2; c <= px + 4; c++) {
              if (c >= 0 && c < W && isWaterCell(r, c)) {
                keys.add(`${c}_${r}`);
              }
            }
          }
        };

        const collectEastPier = (node: POINode, pierLen: number): void => {
          const startX = node.gridX + node.footprint.width;
          const py = node.gridY + 2;
          for (let dx = 0; dx < pierLen; dx++) {
            const px = startX + dx;
            if (px < 0 || px >= W || py < 0 || py + 2 >= H) break;
            if (!isWaterCell(py, px) || !isWaterCell(py + 1, px) || !isWaterCell(py + 2, px)) break;
            keys.add(`${px}_${py}`);
            keys.add(`${px}_${py + 1}`);
            keys.add(`${px}_${py + 2}`);
          }
        };

        const collectWestPier = (node: POINode, pierLen: number): void => {
          const startX = node.gridX - 1;
          const py = node.gridY + 2;
          for (let dx = 0; dx < pierLen; dx++) {
            const px = startX - dx;
            if (px < 0 || px >= W || py < 0 || py + 2 >= H) break;
            if (!isWaterCell(py, px) || !isWaterCell(py + 1, px) || !isWaterCell(py + 2, px)) break;
            keys.add(`${px}_${py}`);
            keys.add(`${px}_${py + 1}`);
            keys.add(`${px}_${py + 2}`);
          }
        };

        for (const node of pois) {
          if (node.type !== 'port_dock') continue;
          const facing = node.facing ?? 'south';
          const pierLength = Math.max(8, Math.max(node.footprint.width, node.footprint.height) + 2);
          if (facing === 'south') collectSouthPier(node, pierLength);
          else if (facing === 'north') collectNorthPier(node, pierLength);
          else if (facing === 'east') collectEastPier(node, pierLength);
          else if (facing === 'west') collectWestPier(node, pierLength);
        }
        return keys;
      })();

    const isPortDockCell = (cx: number, cy: number): boolean =>
      portDockBridgeKeys.has(`${cx}_${cy}`);
    const bridgeBlits = resolveCanonicalBridges(bridgeGrid, continent.cells, {
      isPortDockCell,
      bounds: renderBounds
    });
    for (const b of bridgeBlits) {
      addBlit(b.file, b.x * CANVAS_TILE_SIZE, b.y * CANVAS_TILE_SIZE);
    }
  }

  // 4. Mountain Cliffs, Stairs, South Feet & Plateau Rock Textures
  const renderOwnCellCliff = (r: number, c: number, px: number, py: number): void => {
    const mCell = continent.resolvedMountain.cellDetails[r]?.[c];
    if (!mCell || mCell.elevation <= 0) return;

    if (mCell.role === 'floor_center') {
      const isRoadOrPlaza =
        urbanRoadSet.has(`${c}_${r}`) || plazaGrid[r]?.[c] || sanitizedPathGrid[r]?.[c];
      if (!isRoadOrPlaza) {
        const h = Math.sin(c * CANVAS_RENDERER.PLATEAU_HASH_X + r * CANVAS_RENDERER.PLATEAU_HASH_Y);
        const mtnPal =
          continent.geologicalClusters?.paletteMatrix?.[r]?.[c] ??
          continent.mountainPalette ??
          'brown';
        const rockFloor =
          mtnPal === 'gray'
            ? 'poke_cliff_gray_plateau_rock.png'
            : 'poke_cliff_brown_plateau_rock.png';
        addBlit(h > CANVAS_RENDERER.PLATEAU_ROCK_THRESHOLD ? rockFloor : mCell.primaryTile, px, py);
      }
    } else {
      addBlit(mCell.primaryTile, px, py);
    }

    if (mCell.overlayTiles) {
      for (const ov of mCell.overlayTiles) {
        addBlit(ov, px, py);
      }
    }
  };

  const renderCellCliffs = (r: number, c: number): void => {
    if (buildingFootprintMask[r]?.[c]) return;

    const px = c * CANVAS_TILE_SIZE;
    const py = r * CANVAS_TILE_SIZE;

    renderOwnCellCliff(r, c, px, py);

    if (r > 0 && !bridgeGrid?.[r]?.[c]) {
      const northMtn = continent.resolvedMountain.cellDetails[r - 1]?.[c];
      if (northMtn?.projectedFoot) {
        addBlit(northMtn.projectedFoot.tile, px, py);
      }
    }
  };

  for (let r = renderBounds.minY; r <= renderBounds.maxY; r++) {
    for (let c = renderBounds.minX; c <= renderBounds.maxX; c++) {
      renderCellCliffs(r, c);
    }
  }

  // 4b. Procedural Jumpable Route Ledges
  if (options?.ledges) {
    for (const run of options.ledges) {
      for (const t of run.tiles) {
        if (isCoordInsideBounds(t.x, t.y, renderBounds) && !buildingFootprintMask[t.y]?.[t.x]) {
          addBlit(t.tileFile, t.x * CANVAS_TILE_SIZE, t.y * CANVAS_TILE_SIZE);
        }
      }
    }
  }
}
