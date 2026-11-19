/**
 * test_aventura/logic/map/continentPaintEngine.ts
 *
 * CREATIVE MODEL-FIRST CONTINENT PAINT ENGINE (BLOCK B)
 *
 * Implements pure row Copy-on-Write brush mutations across all semantic layers:
 *   - Substrate terrain (`water_deep`, `water`, `sand`, `grass`)
 *   - Macro-biomes (`temperate_meadow`, `mint_highland`, `viridian_forest`, `arid_desert`, `volcanic_plateau`)
 *   - Elevation sculpting (`+1` / `-1`), massif palettes (`brown` / `gray` / `volcanic`), and 2-wide mountain stairs
 *   - Open-field dirt paths (`pathGrid` + editor-only `manualPathGrid` visibility mask) and water-only bridges
 *   - Wilderness vegetation (`tallGrassGrid`, biome-aware trees, roadside props) & safe `eraser_overlay`
 *   - Line (`bresenhamLinePoints`), bounded BFS Flood Fill (`MAX_FLOOD_FILL_CELLS`), and layer-priority Eyedropper
 */

import type { DisplayText } from '@francogp/auditor';

import {
  DIRTY_REBUILD_MARGIN_TILES,
  MAX_BRUSH_ELEVATION_TIER,
  MAX_FLOOD_FILL_CELLS,
  MIN_BRUSH_ELEVATION_TIER
} from '../../config/brushConfig.ts';
import { DEFAULT_MOUNTAIN_PALETTE } from '../../config/studioConstants.ts';
import { OAK_HEIGHT, OAK_WIDTH, PINE_HEIGHT, PINE_WIDTH } from '../../config/wildernessConfig.ts';
import type {
  ContinentHealingSummary,
  DirtyTileBounds,
  HealingDomain
} from '../../types/map/autotileHealingTypes.ts';
import type {
  BrushConfigState,
  ContinentPaintMutationResult,
  ContinentPaintStateInput,
  GridPoint2D,
  MountainHealPolicy,
  PaintSampleResult,
  SerializedContinentManualEdits,
  TerrainPaintTarget
} from '../../types/map/continentBrushTypes.ts';
import {
  bresenhamLinePoints,
  brushSizeToRadius,
  clampDirtyBounds,
  collectBrushKernelOffsets,
  expandDirtyBounds,
  mergeDirtyBounds
} from '../utils/gridGeometryUtils.ts';
import { isBlockedPathElevationCell } from './autotileDefectScanner.ts';
import {
  createCowContinentGrids,
  filterValidMountainStairs,
  rebuildContinentInBounds,
  runDomainsInBounds,
  writeGridBiome,
  writeGridBridge,
  writeGridHeight,
  writeGridManualPath,
  writeGridPalette,
  writeGridPath,
  writeGridTerrain,
  type MutableContinentGrids
} from './autotileHealingEngine.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { MacroBiome } from './macroBiomeSynthesizer.ts';
import type { MountainStairLocation } from './mountainAutotileEngine.ts';
import type { WaterTerrainKind } from './waterAutotileEngine.ts';
import type {
  TreePlacement,
  WildernessLayerResult,
  WildernessPropPlacement
} from './wildernessVegetationEngine.ts';

const WATER_TERRAIN_TARGET_MAP: Partial<Readonly<Record<TerrainPaintTarget, WaterTerrainKind>>> = {
  terrain_water_deep: 'water_deep',
  terrain_water: 'water',
  terrain_sand: 'sand',
  terrain_grass: 'grass'
};

const BIOME_TARGET_MAP: Partial<Readonly<Record<TerrainPaintTarget, MacroBiome>>> = {
  biome_temperate_meadow: 'temperate_meadow',
  biome_mint_highland: 'mint_highland',
  biome_viridian_forest: 'viridian_forest',
  biome_arid_desert: 'arid_desert',
  biome_volcanic_plateau: 'volcanic_plateau'
};

const BIOME_TO_PAINT_TARGET: Readonly<Record<MacroBiome, TerrainPaintTarget>> = {
  temperate_meadow: 'terrain_grass',
  mint_highland: 'biome_mint_highland',
  viridian_forest: 'terrain_grass',
  arid_desert: 'terrain_sand',
  volcanic_plateau: 'biome_volcanic_plateau'
};

const BIOME_SAMPLE_DESCRIPTIONS: Readonly<Record<MacroBiome, DisplayText>> = {
  temperate_meadow: 'Pasto Verde',
  mint_highland: 'Pasto de Sierra',
  viridian_forest: 'Pasto Verde',
  arid_desert: 'Arena / Playa',
  volcanic_plateau: 'Ceniza Volcánica'
};

const TARGET_AUTO_HEAL_DOMAIN: Readonly<Record<TerrainPaintTarget, HealingDomain | null>> = {
  terrain_water_deep: 'water',
  terrain_water: 'water',
  terrain_sand: 'water',
  terrain_grass: 'water',
  biome_temperate_meadow: 'macro_biome',
  biome_mint_highland: 'macro_biome',
  biome_viridian_forest: 'macro_biome',
  biome_arid_desert: 'macro_biome',
  biome_volcanic_plateau: 'macro_biome',
  elevation_raise: 'mountain',
  elevation_lower: 'mountain',
  mountain_palette: null,
  mountain_stair: null,
  path_dirt: 'path',
  bridge_wood: 'path',
  wilderness_tall_grass: null,
  wilderness_tree: null,
  wilderness_prop: null,
  eraser_overlay: 'auto'
};

const CARDINAL_DIRS: readonly GridPoint2D[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 }
];

const BIOME_PROP_SPEC: Readonly<
  Record<MacroBiome, Pick<WildernessPropPlacement, 'type' | 'prefabFile'>>
> = {
  arid_desert: { type: 'boulder', prefabFile: 'poke_rock_boulder_brown_large.png' },
  volcanic_plateau: { type: 'boulder', prefabFile: 'poke_rock_boulder_mossy_1.png' },
  mint_highland: { type: 'bush', prefabFile: 'poke_bush_round.png' },
  viridian_forest: { type: 'bush', prefabFile: 'poke_bush_round.png' },
  temperate_meadow: { type: 'flower', prefabFile: 'poke_flowers_red.png' }
};

interface WorkingWildernessState {
  readonly tallGrassGrid: boolean[][];
  readonly copiedTallGrassRows: Set<number>;
  tallGrassPatches: WildernessLayerResult['tallGrassPatches'];
  trees: TreePlacement[];
  props: WildernessPropPlacement[];
  mutated: boolean;
  treesChanged: boolean;
  propsChanged: boolean;
}

interface PaintExecutionContext {
  readonly grids: MutableContinentGrids;
  readonly baseContinent: ContinentMapResult;
  readonly wilderness: WorkingWildernessState;
  readonly config: BrushConfigState;
  readonly stairBottomSet: ReadonlySet<string>;
  readonly paintedCells: Set<string>;
  stairsChanged: boolean;
  bounds: DirtyTileBounds | null;
}

function isWaterTile(t: WaterTerrainKind | undefined): boolean {
  return t === 'water' || t === 'water_deep';
}

function createWorkingWilderness(
  source: WildernessLayerResult | null,
  width: number,
  height: number
): WorkingWildernessState {
  return {
    tallGrassGrid: source
      ? source.tallGrassGrid.map((row) => row)
      : Array.from({ length: height }, () => Array<boolean>(width).fill(false)),
    copiedTallGrassRows: new Set<number>(),
    tallGrassPatches: source ? source.tallGrassPatches : [],
    trees: source ? [...source.trees] : [],
    props: source ? [...source.props] : [],
    mutated: false,
    treesChanged: false,
    propsChanged: false
  };
}

function writeWildernessTallGrass(
  wilderness: WorkingWildernessState,
  x: number,
  y: number,
  value: boolean
): void {
  if (Boolean(wilderness.tallGrassGrid[y]?.[x]) === value) return;
  if (!wilderness.copiedTallGrassRows.has(y)) {
    wilderness.tallGrassGrid[y] = [...(wilderness.tallGrassGrid[y] ?? [])];
    wilderness.copiedTallGrassRows.add(y);
  }
  wilderness.tallGrassGrid[y]![x] = value;
  wilderness.mutated = true;
}

function toWildernessResult(
  baseWilderness: WildernessLayerResult | null,
  working: WorkingWildernessState
): WildernessLayerResult | null {
  if (!working.mutated && !working.treesChanged && !working.propsChanged) {
    return baseWilderness;
  }
  if (working.treesChanged) {
    working.trees.sort((a, b) => a.y - b.y || a.x - b.x);
  }
  return {
    tallGrassGrid: working.tallGrassGrid,
    tallGrassPatches: working.tallGrassPatches,
    trees: working.trees,
    props: working.props
  };
}

function recordTouchPoint(ctx: PaintExecutionContext, x: number, y: number): void {
  const next: DirtyTileBounds = { minX: x, minY: y, maxX: x, maxY: y };
  ctx.paintedCells.add(`${x}_${y}`);
  ctx.bounds = mergeDirtyBounds(ctx.bounds, next);
}

function buildStairBottomSet(
  stairs: readonly MountainStairLocation[] | undefined
): ReadonlySet<string> {
  const bottomSet = new Set<string>();
  if (!stairs) return bottomSet;
  for (const st of stairs) {
    bottomSet.add(`${st.x}_${st.y + 1}`);
    bottomSet.add(`${st.x + 1}_${st.y + 1}`);
  }
  return bottomSet;
}

function canPlaceManualPathCell(
  grids: MutableContinentGrids,
  stairBottomSet: ReadonlySet<string>,
  x: number,
  y: number
): boolean {
  if (grids.buildingMask[y]?.[x] || grids.bridgeGrid?.[y]?.[x]) return false;
  if (grids.terrainMatrix[y]?.[x] !== 'grass') return false;
  return !isBlockedPathElevationCell(grids.heightmap, stairBottomSet, x, y);
}

function applyWaterTerrainAt(
  ctx: PaintExecutionContext,
  x: number,
  y: number,
  terrain: WaterTerrainKind
): void {
  const { grids, wilderness } = ctx;
  if (grids.buildingMask[y]?.[x]) return;
  writeGridTerrain(grids, x, y, terrain);

  if (terrain === 'grass') {
    writeGridBiome(grids, x, y, 'temperate_meadow');
  } else {
    writeGridHeight(grids, x, y, 0);
    writeGridPath(grids, x, y, false);
    writeGridManualPath(grids, x, y, false);
    writeWildernessTallGrass(wilderness, x, y, false);
  }
  if (terrain === 'grass' || terrain === 'sand') {
    writeGridBridge(grids, x, y, false);
  }
  recordTouchPoint(ctx, x, y);
}

function applyBiomeAt(ctx: PaintExecutionContext, x: number, y: number, biome: MacroBiome): void {
  if (ctx.grids.buildingMask[y]?.[x]) return;
  if (ctx.grids.terrainMatrix[y]?.[x] !== 'grass') {
    writeGridTerrain(ctx.grids, x, y, 'grass');
    writeGridBridge(ctx.grids, x, y, false);
  }
  writeGridBiome(ctx.grids, x, y, biome);
  if (biome === 'viridian_forest' && x % 2 === 0 && y % 2 === 0) {
    tryPlantTreeAt(ctx, x, y);
  } else if (biome === 'arid_desert' || biome === 'volcanic_plateau') {
    writeWildernessTallGrass(ctx.wilderness, x, y, false);
    const nextTrees = ctx.wilderness.trees.filter((t) => !isInsideTreeBox(t, x, y));
    if (nextTrees.length !== ctx.wilderness.trees.length) {
      ctx.wilderness.trees = nextTrees;
      ctx.wilderness.treesChanged = true;
      ctx.wilderness.mutated = true;
    }
  }
  recordTouchPoint(ctx, x, y);
}

function applyElevationStepAt(
  ctx: PaintExecutionContext,
  x: number,
  y: number,
  delta: 1 | -1
): void {
  const { grids, wilderness } = ctx;
  if (grids.buildingMask[y]?.[x] || grids.terrainMatrix[y]?.[x] !== 'grass') return;

  const curElev = grids.heightmap[y]?.[x] ?? 0;
  const nextElev = Math.max(
    MIN_BRUSH_ELEVATION_TIER,
    Math.min(MAX_BRUSH_ELEVATION_TIER, curElev + delta)
  );
  if (nextElev === curElev) return;

  writeGridHeight(grids, x, y, nextElev);
  if (nextElev > 0) {
    writeGridPalette(grids, x, y, ctx.config.mountainPalette);
    writeWildernessTallGrass(wilderness, x, y, false);
  }
  recordTouchPoint(ctx, x, y);
}

function applyPaletteAt(ctx: PaintExecutionContext, x: number, y: number): void {
  if (ctx.grids.buildingMask[y]?.[x]) return;
  writeGridPalette(ctx.grids, x, y, ctx.config.mountainPalette);
  recordTouchPoint(ctx, x, y);
}

function tryPlaceStairAt(ctx: PaintExecutionContext, x: number, y: number): void {
  const { grids } = ctx;
  const stairs = grids.baseStairs ?? [];
  const candidateRows = [y, y - 1];
  const candidateCols = [x, x - 1];

  for (const sy of candidateRows) {
    if (sy < 0 || sy + 1 >= grids.height) continue;
    for (const sx of candidateCols) {
      if (sx < 0 || sx + 1 >= grids.width) continue;
      if (stairs.some((s) => s.x === sx && s.y === sy)) return;
      const overlaps = stairs.some((s) => s.y === sy && (s.x === sx - 1 || s.x === sx + 1));
      if (overlaps) continue;
      if (
        grids.buildingMask[sy]?.[sx] ||
        grids.buildingMask[sy]?.[sx + 1] ||
        grids.buildingMask[sy + 1]?.[sx] ||
        grids.buildingMask[sy + 1]?.[sx + 1]
      ) {
        continue;
      }
      const valid = filterValidMountainStairs([{ x: sx, y: sy }], grids);
      if (valid.length === 0) continue;

      grids.baseStairs = [...stairs, valid[0]!];
      grids.mutatedHeight = true;
      ctx.stairsChanged = true;
      ctx.bounds = mergeDirtyBounds(ctx.bounds, {
        minX: sx,
        minY: sy,
        maxX: sx + 1,
        maxY: sy + 1
      });
      return;
    }
  }
}

function isInsideTreeBox(t: TreePlacement, x: number, y: number): boolean {
  const topY = t.y - Math.max(0, t.height - 2);
  return x >= t.x && x < t.x + t.width && y >= topY && y <= t.y + 1;
}

function doesTreeOverlapExistingTrunk(
  trees: readonly TreePlacement[],
  nx: number,
  ny: number,
  nw: number
): boolean {
  for (const t of trees) {
    const xOverlap = nx <= t.x + t.width - 1 && nx + nw - 1 >= t.x;
    const yOverlap = ny <= t.y + 1 && ny + 1 >= t.y;
    if (xOverlap && yOverlap) return true;
  }
  return false;
}

function canPlantTreeAt(
  ctx: PaintExecutionContext,
  tx: number,
  ty: number,
  width: number,
  height: number
): boolean {
  const { grids, baseContinent, wilderness } = ctx;
  const startY = ty - Math.max(0, height - 2);
  const endY = ty + 1;
  const endX = tx + width - 1;
  if (startY < 0 || endY >= grids.height || tx < 0 || endX >= grids.width) return false;
  if (doesTreeOverlapExistingTrunk(wilderness.trees, tx, ty, width)) return false;

  for (let cy = startY; cy <= endY; cy++) {
    for (let cx = tx; cx <= endX; cx++) {
      if (grids.terrainMatrix[cy]?.[cx] !== 'grass') return false;
      if ((grids.heightmap[cy]?.[cx] ?? 0) !== 0) return false;
      if (baseContinent.resolvedMountain.occupiedFootCells[cy]?.[cx]) return false;
      if (
        grids.buildingMask[cy]?.[cx] ||
        grids.pathGrid[cy]?.[cx] ||
        grids.bridgeGrid?.[cy]?.[cx]
      ) {
        return false;
      }
      if (wilderness.tallGrassGrid[cy]?.[cx]) return false;
    }
  }
  return true;
}

function tryPlantTreeAt(ctx: PaintExecutionContext, x: number, y: number): void {
  const biome = ctx.grids.biomeGrid[y]?.[x] ?? 'temperate_meadow';
  const isPine = biome === 'mint_highland';
  const width = isPine ? PINE_WIDTH : OAK_WIDTH;
  const height = isPine ? PINE_HEIGHT : OAK_HEIGHT;
  const prefabFile = isPine ? 'poke_tree_pine_small.png' : 'poke_tree_oak_clean.png';

  if (!canPlantTreeAt(ctx, x, y, width, height)) return;

  ctx.wilderness.trees.push({ x, y, width, height, prefabFile });
  ctx.wilderness.treesChanged = true;
  ctx.wilderness.mutated = true;

  const remainingProps = ctx.wilderness.props.filter(
    (p) => !(p.x >= x && p.x < x + width && p.y >= y && p.y <= y + 1)
  );
  if (remainingProps.length !== ctx.wilderness.props.length) {
    ctx.wilderness.props = remainingProps;
    ctx.wilderness.propsChanged = true;
  }

  ctx.bounds = mergeDirtyBounds(ctx.bounds, {
    minX: x,
    minY: y - Math.max(0, height - 2),
    maxX: x + width - 1,
    maxY: y + 1
  });
}

function canPlacePropAt(ctx: PaintExecutionContext, x: number, y: number): boolean {
  const { grids, baseContinent, wilderness } = ctx;
  if (grids.buildingMask[y]?.[x] || grids.pathGrid[y]?.[x] || grids.bridgeGrid?.[y]?.[x]) {
    return false;
  }
  if ((grids.heightmap[y]?.[x] ?? 0) !== 0) return false;
  if (baseContinent.resolvedMountain.occupiedFootCells[y]?.[x]) return false;
  for (const t of wilderness.trees) {
    if (x >= t.x && x < t.x + t.width && y >= t.y && y <= t.y + 1) return false;
  }
  const terrain = grids.terrainMatrix[y]?.[x];
  const biome = grids.biomeGrid[y]?.[x] ?? 'temperate_meadow';
  const spec = BIOME_PROP_SPEC[biome];
  if (terrain === 'grass') return true;
  return terrain === 'sand' && spec.type === 'boulder';
}

function tryPlacePropAt(ctx: PaintExecutionContext, x: number, y: number): void {
  if (!canPlacePropAt(ctx, x, y)) return;
  const biome = ctx.grids.biomeGrid[y]?.[x] ?? 'temperate_meadow';
  const spec = BIOME_PROP_SPEC[biome];

  const existingIdx = ctx.wilderness.props.findIndex((p) => p.x === x && p.y === y);
  if (existingIdx >= 0) {
    const existing = ctx.wilderness.props[existingIdx]!;
    if (existing.type === spec.type && existing.prefabFile === spec.prefabFile) return;
    ctx.wilderness.props[existingIdx] = { type: spec.type, x, y, prefabFile: spec.prefabFile };
  } else {
    ctx.wilderness.props.push({ type: spec.type, x, y, prefabFile: spec.prefabFile });
  }
  ctx.wilderness.propsChanged = true;
  ctx.wilderness.mutated = true;
  recordTouchPoint(ctx, x, y);
}

function eraseOverlaysAt(ctx: PaintExecutionContext, x: number, y: number): void {
  const { grids, wilderness } = ctx;
  if (grids.buildingMask[y]?.[x]) return;

  let touched = false;
  if (grids.pathGrid[y]?.[x] || grids.manualPathGrid?.[y]?.[x]) {
    writeGridPath(grids, x, y, false);
    writeGridManualPath(grids, x, y, false);
    touched = true;
  }
  if (grids.bridgeGrid?.[y]?.[x]) {
    writeGridBridge(grids, x, y, false);
    touched = true;
  }
  if (wilderness.tallGrassGrid[y]?.[x]) {
    writeWildernessTallGrass(wilderness, x, y, false);
    touched = true;
  }

  const nextTrees = wilderness.trees.filter((t) => !isInsideTreeBox(t, x, y));
  if (nextTrees.length !== wilderness.trees.length) {
    wilderness.trees = nextTrees;
    wilderness.treesChanged = true;
    wilderness.mutated = true;
    touched = true;
  }

  const nextProps = wilderness.props.filter((p) => !(p.x === x && p.y === y));
  if (nextProps.length !== wilderness.props.length) {
    wilderness.props = nextProps;
    wilderness.propsChanged = true;
    wilderness.mutated = true;
    touched = true;
  }

  if (grids.baseStairs && grids.baseStairs.length > 0) {
    const nextStairs = grids.baseStairs.filter(
      (s) => !((x === s.x || x === s.x + 1) && (y === s.y || y === s.y + 1))
    );
    if (nextStairs.length !== grids.baseStairs.length) {
      grids.baseStairs = nextStairs;
      grids.mutatedHeight = true;
      ctx.stairsChanged = true;
      touched = true;
    }
  }

  if (touched) {
    recordTouchPoint(ctx, x, y);
  }
}

function applySingleCellPaint(ctx: PaintExecutionContext, x: number, y: number): void {
  const target = ctx.config.paintTarget;
  const waterTarget = WATER_TERRAIN_TARGET_MAP[target];
  if (waterTarget) {
    applyWaterTerrainAt(ctx, x, y, waterTarget);
    return;
  }

  const biomeTarget = BIOME_TARGET_MAP[target];
  if (biomeTarget) {
    applyBiomeAt(ctx, x, y, biomeTarget);
    return;
  }

  if (target === 'elevation_raise') applyElevationStepAt(ctx, x, y, 1);
  else if (target === 'elevation_lower') applyElevationStepAt(ctx, x, y, -1);
  else if (target === 'mountain_palette') applyPaletteAt(ctx, x, y);
  else if (target === 'mountain_stair') tryPlaceStairAt(ctx, x, y);
  else if (target === 'path_dirt') {
    if (!canPlaceManualPathCell(ctx.grids, ctx.stairBottomSet, x, y)) return;
    writeGridPath(ctx.grids, x, y, true);
    writeGridManualPath(ctx.grids, x, y, true);
    writeWildernessTallGrass(ctx.wilderness, x, y, false);
    recordTouchPoint(ctx, x, y);
  } else if (target === 'bridge_wood') {
    if (ctx.grids.buildingMask[y]?.[x] || !isWaterTile(ctx.grids.terrainMatrix[y]?.[x])) return;
    writeGridBridge(ctx.grids, x, y, true);
    recordTouchPoint(ctx, x, y);
  } else if (target === 'wilderness_tall_grass') {
    if (
      ctx.grids.buildingMask[y]?.[x] ||
      ctx.grids.terrainMatrix[y]?.[x] !== 'grass' ||
      (ctx.grids.heightmap[y]?.[x] ?? 0) !== 0 ||
      ctx.baseContinent.resolvedMountain.occupiedFootCells[y]?.[x] ||
      ctx.grids.pathGrid[y]?.[x] ||
      ctx.grids.bridgeGrid?.[y]?.[x]
    ) {
      return;
    }
    writeWildernessTallGrass(ctx.wilderness, x, y, true);
    recordTouchPoint(ctx, x, y);
  } else if (target === 'wilderness_tree') {
    tryPlantTreeAt(ctx, x, y);
  } else if (target === 'wilderness_prop') {
    tryPlacePropAt(ctx, x, y);
  } else if (target === 'eraser_overlay') {
    eraseOverlaysAt(ctx, x, y);
  }
}

function collectExpandedStrokePoints(
  points: readonly GridPoint2D[],
  config: BrushConfigState,
  width: number,
  height: number
): GridPoint2D[] {
  const radius = brushSizeToRadius(config.size);
  const offsets = collectBrushKernelOffsets(radius, config.shape);
  const visited = new Set<number>();
  const unique: GridPoint2D[] = [];

  for (const pt of points) {
    for (const off of offsets) {
      const gx = pt.x + off.x;
      const gy = pt.y + off.y;
      if (gx < 0 || gx >= width || gy < 0 || gy >= height) continue;
      const idx = gy * width + gx;
      if (visited.has(idx)) continue;
      visited.add(idx);
      unique.push({ x: gx, y: gy });
    }
  }
  return unique;
}

function countPaintedCellDiffs(
  state: ContinentPaintStateInput,
  ctx: PaintExecutionContext,
  bounds: DirtyTileBounds,
  finalWilderness: WildernessLayerResult | null
): number {
  const { grids, baseContinent } = ctx;
  let diff = 0;

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const cellDiff =
        baseContinent.terrainMatrix[y]?.[x] !== grids.terrainMatrix[y]?.[x] ||
        (baseContinent.heightmap[y]?.[x] ?? 0) !== (grids.heightmap[y]?.[x] ?? 0) ||
        baseContinent.macroBiomes?.biomeGrid[y]?.[x] !== grids.biomeGrid[y]?.[x] ||
        baseContinent.geologicalClusters?.paletteMatrix[y]?.[x] !== grids.paletteMatrix?.[y]?.[x] ||
        Boolean(state.pathGrid[y]?.[x]) !== Boolean(grids.pathGrid[y]?.[x]) ||
        Boolean(state.manualPathGrid[y]?.[x]) !== Boolean(grids.manualPathGrid?.[y]?.[x]) ||
        Boolean(state.bridgeGrid[y]?.[x]) !== Boolean(grids.bridgeGrid?.[y]?.[x]) ||
        Boolean(state.wilderness?.tallGrassGrid[y]?.[x]) !==
          Boolean(finalWilderness?.tallGrassGrid[y]?.[x]);
      if (cellDiff) diff += 1;
    }
  }

  if (
    diff === 0 &&
    (ctx.stairsChanged || ctx.wilderness.treesChanged || ctx.wilderness.propsChanged)
  ) {
    return 1;
  }
  return diff;
}

function buildPaintSummary(
  target: TerrainPaintTarget,
  anchor: GridPoint2D,
  bounds: DirtyTileBounds,
  changedCellCount: number,
  prunedTreeCount: number,
  prunedPropCount: number
): ContinentHealingSummary {
  const healDomain = TARGET_AUTO_HEAL_DOMAIN[target] ?? 'auto';
  return {
    targetX: anchor.x,
    targetY: anchor.y,
    detectedDomain: healDomain,
    targetRole: target,
    dirtyBounds: bounds,
    defectsBefore: 0,
    defectsAfter: 0,
    repairedCount: changedCellCount,
    changedCellCount,
    prunedTreeCount,
    prunedPropCount,
    timestamp: Temporal.Now.instant().toString()
  };
}

function finalizePaintMutation(
  state: ContinentPaintStateInput,
  ctx: PaintExecutionContext,
  anchor: GridPoint2D,
  floodCapReached?: boolean
): ContinentPaintMutationResult {
  const { grids, config } = ctx;
  const width = grids.width;
  const height = grids.height;

  const ctxBounds = ctx.bounds;
  if (!ctxBounds) {
    return {
      continent: state.continent,
      pathGrid: grids.pathGrid,
      manualPathGrid: grids.manualPathGrid ?? createEmptyMatrix(width, height),
      bridgeGrid: grids.bridgeGrid ?? createEmptyMatrix(width, height),
      wilderness: state.wilderness,
      summary: buildPaintSummary(
        config.paintTarget,
        anchor,
        clampDirtyBounds(
          { minX: anchor.x, minY: anchor.y, maxX: anchor.x, maxY: anchor.y },
          width,
          height
        ),
        0,
        0,
        0
      ),
      changedCellCount: 0,
      ...(floodCapReached !== undefined ? { floodCapReached } : {})
    };
  }

  const healDomain = TARGET_AUTO_HEAL_DOMAIN[config.paintTarget];
  const healWorkBounds = expandDirtyBounds(ctxBounds, 1, width, height);
  if (config.autoHealOnPaint && healDomain) {
    const isFloodFill = floodCapReached !== undefined;
    const isExplicitSingleDot = config.size === 1 && !isFloodFill;
    const isWaterOrSandTarget =
      config.paintTarget === 'terrain_water' ||
      config.paintTarget === 'terrain_water_deep' ||
      config.paintTarget === 'terrain_sand';
    const mappedBiome = BIOME_TARGET_MAP[config.paintTarget];
    const isBrushedBiomeTarget =
      mappedBiome === 'mint_highland' ||
      mappedBiome === 'arid_desert' ||
      mappedBiome === 'volcanic_plateau';
    const needsPathOrBridgeWidening =
      config.paintTarget === 'path_dirt' || config.paintTarget === 'bridge_wood';
    const shouldProtectForWidening =
      needsPathOrBridgeWidening ||
      (isExplicitSingleDot && (isWaterOrSandTarget || isBrushedBiomeTarget));

    grids.protectedCells = shouldProtectForWidening ? ctx.paintedCells : undefined;
    grids.protectedPaintKind =
      config.paintTarget === 'path_dirt'
        ? 'path'
        : config.paintTarget === 'bridge_wood'
          ? 'bridge'
          : isExplicitSingleDot && isWaterOrSandTarget
            ? 'water'
            : isExplicitSingleDot && isBrushedBiomeTarget
              ? 'macro_biome'
              : undefined;
    const effectiveMountainPolicy: MountainHealPolicy =
      config.paintTarget === 'elevation_raise' && isExplicitSingleDot
        ? 'fill'
        : config.mountainPolicy;
    runDomainsInBounds(grids, healWorkBounds, healDomain, effectiveMountainPolicy);
    grids.protectedCells = undefined;
    grids.protectedPaintKind = undefined;
  }

  const mutatedBounds = grids.hasAnyMutation
    ? (mergeDirtyBounds(ctxBounds, grids.mutatedBoundsAccumulator) ?? ctxBounds)
    : ctxBounds;
  const rebuildBounds = expandDirtyBounds(mutatedBounds, DIRTY_REBUILD_MARGIN_TILES, width, height);

  const wildernessInput = toWildernessResult(state.wilderness, ctx.wilderness);
  const rebuilt = rebuildContinentInBounds(state.continent, grids, rebuildBounds, {
    pois: state.pois,
    wilderness: wildernessInput,
    forceWaterRebuild: grids.mutatedBridge,
    forceMountainRebuild: grids.mutatedPalette || ctx.stairsChanged,
    forceBiomeBufferRebuild: grids.mutatedBiome
  });

  const finalPathGrid = grids.pathGrid;
  const finalManualPathGrid = grids.manualPathGrid ?? createEmptyMatrix(width, height);
  const finalBridgeGrid = grids.bridgeGrid ?? createEmptyMatrix(width, height);
  const changedCellCount = countPaintedCellDiffs(state, ctx, rebuildBounds, rebuilt.wilderness);

  return {
    continent: rebuilt.continent,
    pathGrid: finalPathGrid,
    manualPathGrid: finalManualPathGrid,
    bridgeGrid: finalBridgeGrid,
    wilderness: rebuilt.wilderness,
    summary: buildPaintSummary(
      config.paintTarget,
      anchor,
      rebuildBounds,
      changedCellCount,
      rebuilt.prunedTreeCount,
      rebuilt.prunedPropCount
    ),
    changedCellCount,
    ...(floodCapReached !== undefined ? { floodCapReached } : {})
  };
}

function createEmptyMatrix(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array<boolean>(width).fill(false));
}

function createPaintContext(
  state: ContinentPaintStateInput,
  config: BrushConfigState
): PaintExecutionContext {
  const { width, height } = state.continent;
  const grids = createCowContinentGrids(
    state.continent,
    state.pathGrid,
    state.pois,
    state.bridgeGrid,
    state.manualPathGrid
  );
  return {
    grids,
    baseContinent: state.continent,
    wilderness: createWorkingWilderness(state.wilderness, width, height),
    config,
    stairBottomSet: buildStairBottomSet(state.continent.placedStairs),
    paintedCells: new Set<string>(),
    stairsChanged: false,
    bounds: null
  };
}

export interface PaintContinentCellsOptions {
  readonly skipFlatIndices?: ReadonlySet<number>;
  readonly visitedFlatIndicesOut?: Set<number>;
}

/**
 * Applies a creative model-first brush stamp across explicit center points using
 * `config.size`, `config.shape`, `config.paintTarget`, and optional local auto-healing.
 */
export function paintContinentCells(
  state: ContinentPaintStateInput,
  centers: readonly GridPoint2D[],
  config: BrushConfigState,
  options?: PaintContinentCellsOptions
): ContinentPaintMutationResult {
  const ctx = createPaintContext(state, config);
  const anchor = centers[0] ?? { x: 0, y: 0 };

  if (config.paintTarget === 'mountain_stair') {
    for (const pt of centers) {
      if (pt.x >= 0 && pt.x < ctx.grids.width && pt.y >= 0 && pt.y < ctx.grids.height) {
        tryPlaceStairAt(ctx, pt.x, pt.y);
      }
    }
    return finalizePaintMutation(state, ctx, anchor);
  }

  const width = ctx.grids.width;
  const expanded = collectExpandedStrokePoints(centers, config, width, ctx.grids.height);
  for (const pt of expanded) {
    const flatIdx = pt.y * width + pt.x;
    if (options?.skipFlatIndices?.has(flatIdx)) continue;
    applySingleCellPaint(ctx, pt.x, pt.y);
    options?.visitedFlatIndicesOut?.add(flatIdx);
  }
  return finalizePaintMutation(state, ctx, anchor);
}

function buildFourConnectedLinePoints(from: GridPoint2D, to: GridPoint2D): readonly GridPoint2D[] {
  const raw = bresenhamLinePoints(from.x, from.y, to.x, to.y);
  if (raw.length <= 1) return raw;
  const connected: GridPoint2D[] = [raw[0]!];
  for (let i = 1; i < raw.length; i++) {
    const prev = raw[i - 1]!;
    const curr = raw[i]!;
    if (prev.x !== curr.x && prev.y !== curr.y) {
      connected.push({ x: curr.x, y: prev.y }, { x: prev.x, y: curr.y });
    }
    connected.push(curr);
  }
  return connected;
}

/**
 * Connects two grid coordinates via 4-connected integer Bresenham interpolation and paints the
 * deduplicated kernel footprint in a single bounded pass.
 */
export function paintContinentLine(
  state: ContinentPaintStateInput,
  from: GridPoint2D,
  to: GridPoint2D,
  config: BrushConfigState
): ContinentPaintMutationResult {
  const linePoints = buildFourConnectedLinePoints(from, to);
  const needsMinimumMassWidth =
    config.autoHealOnPaint &&
    config.size === 1 &&
    Boolean(
      WATER_TERRAIN_TARGET_MAP[config.paintTarget] ||
      BIOME_TARGET_MAP[config.paintTarget] ||
      config.paintTarget === 'elevation_raise' ||
      config.paintTarget === 'elevation_lower'
    );
  const effectiveConfig: BrushConfigState = {
    ...config,
    size: needsMinimumMassWidth ? 3 : config.size,
    mountainPolicy: config.paintTarget === 'elevation_raise' ? 'fill' : config.mountainPolicy
  };
  return paintContinentCells(state, linePoints, effectiveConfig);
}

function doesCellMatchFloodSeed(
  ctx: PaintExecutionContext,
  seedX: number,
  seedY: number,
  nx: number,
  ny: number
): boolean {
  const { grids, stairBottomSet } = ctx;
  if (grids.buildingMask[ny]?.[nx]) return false;

  const target = ctx.config.paintTarget;
  const seedTerrain = grids.terrainMatrix[seedY]?.[seedX] ?? 'grass';
  const curTerrain = grids.terrainMatrix[ny]?.[nx] ?? 'grass';
  const seedElev = grids.heightmap[seedY]?.[seedX] ?? 0;
  const curElev = grids.heightmap[ny]?.[nx] ?? 0;

  if (WATER_TERRAIN_TARGET_MAP[target]) {
    if (target === 'terrain_grass' && seedTerrain === 'grass') {
      return (
        curTerrain === 'grass' &&
        curElev === seedElev &&
        grids.biomeGrid[ny]?.[nx] === grids.biomeGrid[seedY]?.[seedX]
      );
    }
    return curTerrain === seedTerrain && curElev === seedElev;
  }
  if (BIOME_TARGET_MAP[target]) {
    return (
      curTerrain === seedTerrain &&
      curElev === seedElev &&
      grids.biomeGrid[ny]?.[nx] === grids.biomeGrid[seedY]?.[seedX]
    );
  }
  if (
    target === 'elevation_raise' ||
    target === 'elevation_lower' ||
    target === 'mountain_palette'
  ) {
    return curTerrain === 'grass' && curElev === seedElev;
  }
  if (target === 'path_dirt') {
    return (
      Boolean(grids.pathGrid[ny]?.[nx]) === Boolean(grids.pathGrid[seedY]?.[seedX]) &&
      canPlaceManualPathCell(grids, stairBottomSet, nx, ny)
    );
  }
  if (target === 'bridge_wood') {
    return (
      isWaterTile(curTerrain) &&
      Boolean(grids.bridgeGrid?.[ny]?.[nx]) === Boolean(grids.bridgeGrid?.[seedY]?.[seedX])
    );
  }
  return curTerrain === seedTerrain && curElev === seedElev;
}

function isFloodSeedAlreadyTarget(
  ctx: PaintExecutionContext,
  seedX: number,
  seedY: number
): boolean {
  const { grids } = ctx;
  const target = ctx.config.paintTarget;
  const waterTarget = WATER_TERRAIN_TARGET_MAP[target];
  if (waterTarget) {
    if (waterTarget === 'grass') {
      return (
        grids.terrainMatrix[seedY]?.[seedX] === 'grass' &&
        grids.biomeGrid[seedY]?.[seedX] === 'temperate_meadow'
      );
    }
    return grids.terrainMatrix[seedY]?.[seedX] === waterTarget;
  }
  const biomeTarget = BIOME_TARGET_MAP[target];
  if (biomeTarget) {
    return (
      grids.terrainMatrix[seedY]?.[seedX] === 'grass' &&
      grids.biomeGrid[seedY]?.[seedX] === biomeTarget
    );
  }
  if (target === 'mountain_palette') {
    return grids.paletteMatrix?.[seedY]?.[seedX] === ctx.config.mountainPalette;
  }
  if (target === 'path_dirt') return Boolean(grids.pathGrid[seedY]?.[seedX]);
  if (target === 'bridge_wood') return Boolean(grids.bridgeGrid?.[seedY]?.[seedX]);
  return false;
}

/**
 * Bounded BFS flood fill (`<= MAX_FLOOD_FILL_CELLS`) over orthogonal contiguous cells
 * sharing the seed cell's semantic equivalence class.
 */
export function floodFillContinentAt(
  state: ContinentPaintStateInput,
  startX: number,
  startY: number,
  config: BrushConfigState
): ContinentPaintMutationResult {
  const { width, height } = state.continent;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return paintContinentCells(state, [], config);
  }

  if (
    config.paintTarget === 'mountain_stair' ||
    config.paintTarget === 'wilderness_tree' ||
    config.paintTarget === 'wilderness_prop'
  ) {
    return paintContinentCells(state, [{ x: startX, y: startY }], config);
  }

  const ctx = createPaintContext(state, config);
  if (ctx.grids.buildingMask[startY]?.[startX] || isFloodSeedAlreadyTarget(ctx, startX, startY)) {
    return finalizePaintMutation(state, ctx, { x: startX, y: startY }, false);
  }

  if (
    config.paintTarget === 'path_dirt' &&
    !canPlaceManualPathCell(ctx.grids, ctx.stairBottomSet, startX, startY)
  ) {
    return finalizePaintMutation(state, ctx, { x: startX, y: startY }, false);
  }
  if (
    config.paintTarget === 'bridge_wood' &&
    !isWaterTile(ctx.grids.terrainMatrix[startY]?.[startX])
  ) {
    return finalizePaintMutation(state, ctx, { x: startX, y: startY }, false);
  }

  const visited = new Uint8Array(width * height);
  const collected: GridPoint2D[] = [{ x: startX, y: startY }];
  visited[startY * width + startX] = 1;
  let head = 0;
  let floodCapReached = false;

  while (head < collected.length) {
    const cur = collected[head++]!;
    for (const dir of CARDINAL_DIRS) {
      const nx = cur.x + dir.x;
      const ny = cur.y + dir.y;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const flatIdx = ny * width + nx;
      if (visited[flatIdx] !== 0) continue;
      if (!doesCellMatchFloodSeed(ctx, startX, startY, nx, ny)) continue;

      if (collected.length >= MAX_FLOOD_FILL_CELLS) {
        floodCapReached = true;
        break;
      }
      visited[flatIdx] = 1;
      collected.push({ x: nx, y: ny });
    }
    if (floodCapReached) break;
  }

  for (const pt of collected) {
    applySingleCellPaint(ctx, pt.x, pt.y);
  }
  return finalizePaintMutation(state, ctx, { x: startX, y: startY }, floodCapReached);
}

/**
 * Inspects a map cell with priority:
 *   bridge > path > stair > mountain > wilderness > water/sand > macroBiome
 */
export function sampleContinentCellAt(
  state: ContinentPaintStateInput,
  x: number,
  y: number
): PaintSampleResult {
  const { continent, pathGrid, manualPathGrid, bridgeGrid, wilderness } = state;
  const cx = Math.max(0, Math.min(continent.width - 1, x));
  const cy = Math.max(0, Math.min(continent.height - 1, y));

  const terrain = continent.terrainMatrix[cy]?.[cx] ?? 'grass';
  const elevation = continent.heightmap[cy]?.[cx] ?? 0;
  const biome = continent.macroBiomes?.biomeGrid[cy]?.[cx] ?? 'temperate_meadow';
  const rawPalette =
    continent.geologicalClusters?.paletteMatrix[cy]?.[cx] ??
    continent.mountainPalette ??
    DEFAULT_MOUNTAIN_PALETTE;
  const recommendedPalette = rawPalette === 'gray' ? 'gray' : 'brown';
  const hasPath = Boolean(pathGrid[cy]?.[cx] || manualPathGrid[cy]?.[cx]);
  const hasBridge = Boolean(bridgeGrid[cy]?.[cx]);

  let recommendedTarget: TerrainPaintTarget = BIOME_TO_PAINT_TARGET[biome];
  let description: DisplayText = BIOME_SAMPLE_DESCRIPTIONS[biome];

  if (hasBridge) {
    recommendedTarget = 'bridge_wood';
    description = 'Puente de Madera';
  } else if (hasPath) {
    recommendedTarget = 'path_dirt';
    description = 'Camino de Tierra';
  } else if (
    continent.placedStairs.some(
      (s) => (cx === s.x || cx === s.x + 1) && (cy === s.y || cy === s.y + 1)
    )
  ) {
    recommendedTarget = 'mountain_stair';
    description = 'Escalera de Montaña';
  } else if (elevation > 0) {
    recommendedTarget = 'elevation_raise';
    description = `Montaña Nv.${elevation} (${recommendedPalette === 'gray' ? 'Granito' : 'Café'})`;
  } else if (wilderness?.tallGrassGrid[cy]?.[cx]) {
    recommendedTarget = 'wilderness_tall_grass';
    description = 'Hierba Salvaje';
  } else if (wilderness?.trees.some((t) => isInsideTreeBox(t, cx, cy))) {
    recommendedTarget = 'wilderness_tree';
    description = 'Árbol';
  } else if (wilderness?.props.some((p) => p.x === cx && p.y === cy)) {
    recommendedTarget = 'wilderness_prop';
    description = 'Adorno Natural';
  } else if (terrain === 'water_deep') {
    recommendedTarget = 'terrain_water_deep';
    description = 'Océano Profundo';
  } else if (terrain === 'water') {
    recommendedTarget = 'terrain_water';
    description = 'Agua Costera';
  } else if (terrain === 'sand') {
    recommendedTarget = 'terrain_sand';
    description = 'Arena / Playa';
  }

  return {
    x: cx,
    y: cy,
    recommendedTarget,
    recommendedPalette,
    terrain,
    elevation,
    biome,
    hasPath,
    hasBridge,
    description
  };
}

/**
 * Rehydrates sparse `SerializedContinentManualEdits` onto a freshly generated regional map
 * in a single bounded rebuild pass.
 */
export function applySerializedManualEditsToState(
  state: ContinentPaintStateInput,
  edits: SerializedContinentManualEdits
): ContinentPaintMutationResult & { readonly dirtyBounds: DirtyTileBounds } {
  const { width, height } = state.continent;
  const grids = createCowContinentGrids(
    state.continent,
    state.pathGrid,
    state.pois,
    state.bridgeGrid,
    state.manualPathGrid
  );
  const workingWilderness = createWorkingWilderness(state.wilderness, width, height);
  let editBounds: DirtyTileBounds | null = null;

  for (const patch of edits.cells) {
    const px = Math.floor(patch.x);
    const py = Math.floor(patch.y);
    if (px < 0 || px >= width || py < 0 || py >= height) continue;

    if (patch.terrain !== undefined) writeGridTerrain(grids, px, py, patch.terrain);
    if (patch.elevation !== undefined) writeGridHeight(grids, px, py, patch.elevation);
    if (patch.biome !== undefined) writeGridBiome(grids, px, py, patch.biome);
    if (patch.mountainPalette !== undefined) writeGridPalette(grids, px, py, patch.mountainPalette);
    if (patch.path !== undefined) writeGridPath(grids, px, py, patch.path);
    if (patch.manualPath !== undefined) writeGridManualPath(grids, px, py, patch.manualPath);
    if (patch.bridge !== undefined) writeGridBridge(grids, px, py, patch.bridge);
    if (patch.tallGrass !== undefined)
      writeWildernessTallGrass(workingWilderness, px, py, patch.tallGrass);

    editBounds = mergeDirtyBounds(editBounds, { minX: px, minY: py, maxX: px, maxY: py });
  }

  if (edits.stairs) {
    grids.baseStairs = [...edits.stairs];
    grids.mutatedHeight = true;
    for (const st of edits.stairs) {
      editBounds = mergeDirtyBounds(editBounds, {
        minX: st.x,
        minY: st.y,
        maxX: st.x + 1,
        maxY: st.y + 1
      });
    }
  }
  if (edits.trees) {
    workingWilderness.trees = [...edits.trees];
    workingWilderness.treesChanged = true;
    workingWilderness.mutated = true;
  }
  if (edits.props) {
    workingWilderness.props = [...edits.props];
    workingWilderness.propsChanged = true;
    workingWilderness.mutated = true;
  }

  const fallbackBounds: DirtyTileBounds = {
    minX: 0,
    minY: 0,
    maxX: Math.max(0, width - 1),
    maxY: Math.max(0, height - 1)
  };
  const rebuildBounds = editBounds
    ? expandDirtyBounds(editBounds, DIRTY_REBUILD_MARGIN_TILES, width, height)
    : fallbackBounds;

  const rebuilt = rebuildContinentInBounds(state.continent, grids, rebuildBounds, {
    pois: state.pois,
    wilderness: toWildernessResult(state.wilderness, workingWilderness),
    forceWaterRebuild: true,
    forceMountainRebuild: true,
    forceBiomeBufferRebuild: true,
    skipWildernessPrune: true,
    skipStairValidation: Boolean(edits.stairs)
  });

  return {
    continent: rebuilt.continent,
    pathGrid: grids.pathGrid,
    manualPathGrid: grids.manualPathGrid ?? createEmptyMatrix(width, height),
    bridgeGrid: grids.bridgeGrid ?? createEmptyMatrix(width, height),
    wilderness: rebuilt.wilderness,
    dirtyBounds: rebuildBounds,
    changedCellCount: edits.cells.length,
    summary: buildPaintSummary(
      'eraser_overlay',
      { x: rebuildBounds.minX, y: rebuildBounds.minY },
      rebuildBounds,
      edits.cells.length,
      rebuilt.prunedTreeCount,
      rebuilt.prunedPropCount
    )
  };
}
