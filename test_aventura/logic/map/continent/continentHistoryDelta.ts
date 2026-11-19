/**
 * test_aventura/logic/map/continent/continentHistoryDelta.ts
 *
 * Pure row Copy-on-Write Undo/Redo `DirtyRectHistoryDelta` builder/applier and
 * bounded defect inspector synchronization helpers for `useRegionalContinentStudioStore`.
 */

import {
  CANOPY_OVERHANG_BUFFER_TILES,
  DEFAULT_BRUSH_RADIUS,
  DIRTY_REBUILD_MARGIN_TILES
} from '../../../config/brushConfig.ts';
import { DEFAULT_MOUNTAIN_PALETTE } from '../../../config/studioConstants.ts';
import {
  type AutotileDefectRecord,
  type ContinentHealingSummary,
  type DirtyTileBounds,
  type HealingDomain
} from '../../../types/map/autotileHealingTypes.ts';
import type {
  DirtyRectHistoryDelta,
  ManualMapCellEditPatch,
  SerializedContinentManualEdits
} from '../../../types/map/continentBrushTypes.ts';
import type { POINode } from '../../../types/map/poiTypes.ts';
import { expandDirtyBounds } from '../../utils/gridGeometryUtils.ts';
import { createCowContinentGrids, rebuildContinentInBounds } from '../autotileHealingEngine.ts';
import type { ContinentMapResult } from '../continentGenerator.ts';
import type { MacroBiome } from '../macroBiomeSynthesizer.ts';
import type { MountainPalette, MountainStairLocation } from '../mountainAutotileEngine.ts';
import type { WaterTerrainKind } from '../waterAutotileEngine.ts';
import type {
  TreePlacement,
  WildernessLayerResult,
  WildernessPropPlacement
} from '../wildernessVegetationEngine.ts';

export interface ContinentEditableState {
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly manualPathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid: readonly (readonly boolean[])[];
  readonly wilderness: WildernessLayerResult | null;
}

export const DEFECT_RESCAN_MARGIN_TILES = DIRTY_REBUILD_MARGIN_TILES + DEFAULT_BRUSH_RADIUS * 2;

export function createEmptyBooleanGrid(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array<boolean>(width).fill(false));
}

function sliceMatrixRect<T>(
  matrix: readonly (readonly T[])[] | undefined,
  bounds: DirtyTileBounds,
  fallback: T
): T[][] {
  if (!matrix || matrix.length === 0) return [];
  const rows: T[][] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    const srcRow = matrix[y];
    const row: T[] = [];
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      row.push(srcRow?.[x] ?? fallback);
    }
    rows.push(row);
  }
  return rows;
}

function patchMatrixRect<T>(
  base: readonly (readonly T[])[] | undefined,
  bounds: DirtyTileBounds,
  rectRows: readonly (readonly T[])[],
  width: number,
  height: number,
  fallback: T
): T[][] {
  const next: T[][] =
    base && base.length === height
      ? base.map((row) => row as T[])
      : Array.from({ length: height }, () => Array<T>(width).fill(fallback));

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    const srcPatch = rectRows[y - bounds.minY];
    if (!srcPatch) continue;
    const rowCopy = next[y] ? [...next[y]!] : Array<T>(width).fill(fallback);
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const val = srcPatch[x - bounds.minX];
      if (val !== undefined) {
        rowCopy[x] = val;
      }
    }
    next[y] = rowCopy;
  }
  return next;
}

function doesTreeTouchBounds(t: TreePlacement, bounds: DirtyTileBounds): boolean {
  const startY = t.y - Math.max(0, t.height - 2);
  const endY = t.y + 1;
  const endX = t.x + t.width - 1;
  return endX >= bounds.minX && t.x <= bounds.maxX && endY >= bounds.minY && startY <= bounds.maxY;
}

function isCoordInsideBounds(x: number, y: number, bounds: DirtyTileBounds): boolean {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

function doesStairTouchBounds(st: MountainStairLocation, bounds: DirtyTileBounds): boolean {
  return (
    st.x + 1 >= bounds.minX && st.x <= bounds.maxX && st.y >= bounds.minY && st.y <= bounds.maxY
  );
}

function replaceTreesInBounds(
  baseTrees: readonly TreePlacement[],
  bounds: DirtyTileBounds,
  targetTrees: readonly TreePlacement[]
): TreePlacement[] {
  const kept = baseTrees.filter((t) => !doesTreeTouchBounds(t, bounds));
  return [...kept, ...targetTrees].sort((a, b) => a.y - b.y || a.x - b.x);
}

function replacePropsInBounds(
  baseProps: readonly WildernessPropPlacement[],
  bounds: DirtyTileBounds,
  targetProps: readonly WildernessPropPlacement[]
): WildernessPropPlacement[] {
  const kept = baseProps.filter((p) => !isCoordInsideBounds(p.x, p.y, bounds));
  return [...kept, ...targetProps];
}

function replaceStairsInBounds(
  baseStairs: readonly MountainStairLocation[],
  bounds: DirtyTileBounds,
  targetStairs: readonly MountainStairLocation[]
): MountainStairLocation[] {
  const kept = baseStairs.filter((s) => !doesStairTouchBounds(s, bounds));
  return [...kept, ...targetStairs];
}

function isEntityListEqualInBounds<T extends GridPointCoord>(
  a: readonly T[],
  b: readonly T[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i]!;
    const itemB = b[i]!;
    if (itemA.x !== itemB.x || itemA.y !== itemB.y || itemA.prefabFile !== itemB.prefabFile) {
      return false;
    }
  }
  return true;
}

interface GridPointCoord {
  readonly x: number;
  readonly y: number;
  readonly prefabFile?: string;
}

/**
 * Counts differing cells and entity overlays between two states inside `bounds`.
 */
export function countEditableDiffInBounds(
  before: ContinentEditableState,
  after: ContinentEditableState,
  bounds: DirtyTileBounds
): number {
  const width = before.continent.width;
  const height = before.continent.height;
  const clamped = expandDirtyBounds(bounds, CANOPY_OVERHANG_BUFFER_TILES, width, height);
  let diff = 0;

  for (let y = clamped.minY; y <= clamped.maxY; y++) {
    for (let x = clamped.minX; x <= clamped.maxX; x++) {
      const cellDiff =
        before.continent.terrainMatrix[y]?.[x] !== after.continent.terrainMatrix[y]?.[x] ||
        (before.continent.heightmap[y]?.[x] ?? 0) !== (after.continent.heightmap[y]?.[x] ?? 0) ||
        before.continent.macroBiomes?.biomeGrid[y]?.[x] !==
          after.continent.macroBiomes?.biomeGrid[y]?.[x] ||
        before.continent.geologicalClusters?.paletteMatrix[y]?.[x] !==
          after.continent.geologicalClusters?.paletteMatrix[y]?.[x] ||
        Boolean(before.pathGrid[y]?.[x]) !== Boolean(after.pathGrid[y]?.[x]) ||
        Boolean(before.manualPathGrid[y]?.[x]) !== Boolean(after.manualPathGrid[y]?.[x]) ||
        Boolean(before.bridgeGrid[y]?.[x]) !== Boolean(after.bridgeGrid[y]?.[x]) ||
        Boolean(before.wilderness?.tallGrassGrid[y]?.[x]) !==
          Boolean(after.wilderness?.tallGrassGrid[y]?.[x]);
      if (cellDiff) diff += 1;
    }
  }

  const beforeStairs = before.continent.placedStairs.filter((s) =>
    doesStairTouchBounds(s, clamped)
  );
  const afterStairs = after.continent.placedStairs.filter((s) => doesStairTouchBounds(s, clamped));
  const beforeTrees = (before.wilderness?.trees ?? []).filter((t) =>
    doesTreeTouchBounds(t, clamped)
  );
  const afterTrees = (after.wilderness?.trees ?? []).filter((t) => doesTreeTouchBounds(t, clamped));
  const beforeProps = (before.wilderness?.props ?? []).filter((p) =>
    isCoordInsideBounds(p.x, p.y, clamped)
  );
  const afterProps = (after.wilderness?.props ?? []).filter((p) =>
    isCoordInsideBounds(p.x, p.y, clamped)
  );

  if (
    !isEntityListEqualInBounds(beforeStairs, afterStairs) ||
    !isEntityListEqualInBounds(beforeTrees, afterTrees) ||
    !isEntityListEqualInBounds(beforeProps, afterProps)
  ) {
    diff += 1;
  }

  return diff;
}

/**
 * Captures a compact bounded `DirtyRectHistoryDelta` covering modified matrices,
 * containment buffers, palettes, stairs, and pruned/painted wilderness layers.
 */
export function captureDirtyRectHistoryDelta(
  before: ContinentEditableState,
  after: ContinentEditableState,
  rawBounds: DirtyTileBounds,
  summary: ContinentHealingSummary
): DirtyRectHistoryDelta {
  const width = after.continent.width;
  const height = after.continent.height;
  const bounds = expandDirtyBounds(rawBounds, CANOPY_OVERHANG_BUFFER_TILES, width, height);
  const defPalette = after.continent.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE;

  return {
    bounds,
    beforeTerrainRows: sliceMatrixRect<WaterTerrainKind>(
      before.continent.terrainMatrix,
      bounds,
      'grass'
    ),
    afterTerrainRows: sliceMatrixRect<WaterTerrainKind>(
      after.continent.terrainMatrix,
      bounds,
      'grass'
    ),
    beforeHeightRows: sliceMatrixRect<number>(before.continent.heightmap, bounds, 0),
    afterHeightRows: sliceMatrixRect<number>(after.continent.heightmap, bounds, 0),
    beforeBiomeRows: sliceMatrixRect<MacroBiome>(
      before.continent.macroBiomes?.biomeGrid,
      bounds,
      'temperate_meadow'
    ),
    afterBiomeRows: sliceMatrixRect<MacroBiome>(
      after.continent.macroBiomes?.biomeGrid,
      bounds,
      'temperate_meadow'
    ),
    beforeBufferRows: sliceMatrixRect<boolean>(
      before.continent.macroBiomes?.transitionBufferGrid,
      bounds,
      false
    ),
    afterBufferRows: sliceMatrixRect<boolean>(
      after.continent.macroBiomes?.transitionBufferGrid,
      bounds,
      false
    ),
    beforePaletteRows: sliceMatrixRect<MountainPalette>(
      before.continent.geologicalClusters?.paletteMatrix,
      bounds,
      defPalette
    ),
    afterPaletteRows: sliceMatrixRect<MountainPalette>(
      after.continent.geologicalClusters?.paletteMatrix,
      bounds,
      defPalette
    ),
    beforePathRows: sliceMatrixRect<boolean>(before.pathGrid, bounds, false),
    afterPathRows: sliceMatrixRect<boolean>(after.pathGrid, bounds, false),
    beforeManualPathRows: sliceMatrixRect<boolean>(before.manualPathGrid, bounds, false),
    afterManualPathRows: sliceMatrixRect<boolean>(after.manualPathGrid, bounds, false),
    beforeBridgeRows: sliceMatrixRect<boolean>(before.bridgeGrid, bounds, false),
    afterBridgeRows: sliceMatrixRect<boolean>(after.bridgeGrid, bounds, false),
    beforeTallGrassRows: sliceMatrixRect<boolean>(before.wilderness?.tallGrassGrid, bounds, false),
    afterTallGrassRows: sliceMatrixRect<boolean>(after.wilderness?.tallGrassGrid, bounds, false),
    beforeStairs: before.continent.placedStairs.filter((s) => doesStairTouchBounds(s, bounds)),
    afterStairs: after.continent.placedStairs.filter((s) => doesStairTouchBounds(s, bounds)),
    beforeTrees: (before.wilderness?.trees ?? []).filter((t) => doesTreeTouchBounds(t, bounds)),
    afterTrees: (after.wilderness?.trees ?? []).filter((t) => doesTreeTouchBounds(t, bounds)),
    beforeProps: (before.wilderness?.props ?? []).filter((p) =>
      isCoordInsideBounds(p.x, p.y, bounds)
    ),
    afterProps: (after.wilderness?.props ?? []).filter((p) =>
      isCoordInsideBounds(p.x, p.y, bounds)
    ),
    summary
  };
}

interface SelectedDeltaSide {
  readonly terrainRows: readonly (readonly WaterTerrainKind[])[];
  readonly heightRows: readonly (readonly number[])[];
  readonly biomeRows: readonly (readonly MacroBiome[])[];
  readonly bufferRows: readonly (readonly boolean[])[];
  readonly paletteRows: readonly (readonly MountainPalette[])[];
  readonly pathRows: readonly (readonly boolean[])[];
  readonly manualPathRows: readonly (readonly boolean[])[];
  readonly bridgeRows: readonly (readonly boolean[])[];
  readonly tallGrassRows: readonly (readonly boolean[])[];
  readonly targetStairs: readonly MountainStairLocation[];
  readonly targetTrees: readonly TreePlacement[];
  readonly targetProps: readonly WildernessPropPlacement[];
}

function selectDeltaSide(
  delta: DirtyRectHistoryDelta,
  direction: 'undo' | 'redo'
): SelectedDeltaSide {
  const isUndo = direction === 'undo';
  return {
    terrainRows: isUndo ? delta.beforeTerrainRows : delta.afterTerrainRows,
    heightRows: isUndo ? delta.beforeHeightRows : delta.afterHeightRows,
    biomeRows: isUndo ? delta.beforeBiomeRows : delta.afterBiomeRows,
    bufferRows: isUndo ? delta.beforeBufferRows : delta.afterBufferRows,
    paletteRows: isUndo ? delta.beforePaletteRows : delta.afterPaletteRows,
    pathRows: isUndo ? delta.beforePathRows : delta.afterPathRows,
    manualPathRows: isUndo ? delta.beforeManualPathRows : delta.afterManualPathRows,
    bridgeRows: isUndo ? delta.beforeBridgeRows : delta.afterBridgeRows,
    tallGrassRows: isUndo ? delta.beforeTallGrassRows : delta.afterTallGrassRows,
    targetStairs: isUndo ? delta.beforeStairs : delta.afterStairs,
    targetTrees: isUndo ? delta.beforeTrees : delta.afterTrees,
    targetProps: isUndo ? delta.beforeProps : delta.afterProps
  };
}

/**
 * Applies either the `'undo'` or `'redo'` side of a `DirtyRectHistoryDelta` via row CoW
 * and recompiles autotile cell visuals strictly inside `delta.bounds`.
 */
export function applyDirtyRectHistoryDelta(
  current: ContinentEditableState,
  delta: DirtyRectHistoryDelta,
  direction: 'undo' | 'redo',
  pois: readonly POINode[]
): ContinentEditableState {
  const { bounds } = delta;
  const { width, height } = current.continent;
  const defPalette = current.continent.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE;
  const side = selectDeltaSide(delta, direction);

  const nextTerrain = patchMatrixRect<WaterTerrainKind>(
    current.continent.terrainMatrix,
    bounds,
    side.terrainRows,
    width,
    height,
    'grass'
  );
  const nextHeight = patchMatrixRect<number>(
    current.continent.heightmap,
    bounds,
    side.heightRows,
    width,
    height,
    0
  );
  const nextBiomeGrid =
    current.continent.macroBiomes && side.biomeRows.length > 0
      ? patchMatrixRect<MacroBiome>(
          current.continent.macroBiomes.biomeGrid,
          bounds,
          side.biomeRows,
          width,
          height,
          'temperate_meadow'
        )
      : current.continent.macroBiomes?.biomeGrid;
  const nextBufferGrid =
    current.continent.macroBiomes && side.bufferRows.length > 0
      ? patchMatrixRect<boolean>(
          current.continent.macroBiomes.transitionBufferGrid,
          bounds,
          side.bufferRows,
          width,
          height,
          false
        )
      : current.continent.macroBiomes?.transitionBufferGrid;
  const nextPaletteMatrix =
    current.continent.geologicalClusters && side.paletteRows.length > 0
      ? patchMatrixRect<MountainPalette>(
          current.continent.geologicalClusters.paletteMatrix,
          bounds,
          side.paletteRows,
          width,
          height,
          defPalette
        )
      : current.continent.geologicalClusters?.paletteMatrix;

  const nextPathGrid = patchMatrixRect<boolean>(
    current.pathGrid,
    bounds,
    side.pathRows,
    width,
    height,
    false
  );
  const nextManualPathGrid = patchMatrixRect<boolean>(
    current.manualPathGrid,
    bounds,
    side.manualPathRows,
    width,
    height,
    false
  );
  const nextBridgeGrid = patchMatrixRect<boolean>(
    current.bridgeGrid,
    bounds,
    side.bridgeRows,
    width,
    height,
    false
  );

  const nextWilderness: WildernessLayerResult | null = current.wilderness
    ? {
        tallGrassGrid:
          side.tallGrassRows.length > 0
            ? patchMatrixRect<boolean>(
                current.wilderness.tallGrassGrid,
                bounds,
                side.tallGrassRows,
                width,
                height,
                false
              )
            : current.wilderness.tallGrassGrid,
        tallGrassPatches: current.wilderness.tallGrassPatches,
        trees: replaceTreesInBounds(current.wilderness.trees, bounds, side.targetTrees),
        props: replacePropsInBounds(current.wilderness.props, bounds, side.targetProps)
      }
    : null;

  const nextStairs = replaceStairsInBounds(
    current.continent.placedStairs,
    bounds,
    side.targetStairs
  );
  const preRebuildContinent: ContinentMapResult = {
    ...current.continent,
    terrainMatrix: nextTerrain,
    heightmap: nextHeight,
    macroBiomes:
      current.continent.macroBiomes && nextBiomeGrid && nextBufferGrid
        ? {
            ...current.continent.macroBiomes,
            biomeGrid: nextBiomeGrid,
            transitionBufferGrid: nextBufferGrid
          }
        : current.continent.macroBiomes,
    geologicalClusters:
      current.continent.geologicalClusters && nextPaletteMatrix
        ? {
            ...current.continent.geologicalClusters,
            paletteMatrix: nextPaletteMatrix
          }
        : current.continent.geologicalClusters,
    placedStairs: nextStairs
  };

  const grids = createCowContinentGrids(
    preRebuildContinent,
    nextPathGrid,
    pois,
    nextBridgeGrid,
    nextManualPathGrid
  );
  grids.mutatedTerrain = true;
  grids.mutatedHeight = true;
  grids.mutatedBiome = Boolean(nextBiomeGrid);
  grids.mutatedPath = true;
  grids.mutatedPalette = Boolean(nextPaletteMatrix);

  const rebuilt = rebuildContinentInBounds(preRebuildContinent, grids, bounds, {
    pois,
    wilderness: nextWilderness,
    forceWaterRebuild: true,
    forceMountainRebuild: true,
    skipWildernessPrune: true,
    skipTransitionBuffer: true,
    skipStairValidation: true
  });

  return {
    continent: rebuilt.continent,
    pathGrid: nextPathGrid,
    manualPathGrid: nextManualPathGrid,
    bridgeGrid: nextBridgeGrid,
    wilderness: nextWilderness
  };
}

/**
 * Counts autotile defect records grouped by `HealingDomain`, storing total count under `'auto'`.
 */
export function countDefectsByDomain(
  defects: readonly AutotileDefectRecord[]
): Readonly<Record<HealingDomain, number>> {
  const counts: Record<HealingDomain, number> = {
    auto: defects.length,
    path: 0,
    mountain: 0,
    water: 0,
    macro_biome: 0
  };
  for (const d of defects) {
    if (d.domain !== 'auto') {
      counts[d.domain] += 1;
    }
  }
  return counts;
}

/**
 * Replaces defect records inside `scanBounds` with freshly scanned records in that region.
 */
export function mergeDefectRecordsInBounds(
  existing: readonly AutotileDefectRecord[],
  scanBounds: DirtyTileBounds,
  freshInBounds: readonly AutotileDefectRecord[]
): readonly AutotileDefectRecord[] {
  const kept = existing.filter((d) => !isCoordInsideBounds(d.x, d.y, scanBounds));
  const merged = [...kept, ...freshInBounds];
  merged.sort((a, b) => a.y - b.y || a.x - b.x || a.kind.localeCompare(b.kind));
  return merged;
}

interface CellBaselineSnapshot {
  readonly terrain: WaterTerrainKind;
  readonly elevation: number;
  readonly biome: MacroBiome;
  readonly mountainPalette: MountainPalette;
  readonly path: boolean;
  readonly manualPath: boolean;
  readonly bridge: boolean;
  readonly tallGrass: boolean;
}

export interface ManualEditTracker {
  readonly baselineCellsByKey: Map<number, CellBaselineSnapshot>;
  readonly editedCellsByKey: Map<number, ManualMapCellEditPatch>;
  baselineStairs: readonly MountainStairLocation[] | null;
  baselineTrees: readonly TreePlacement[] | null;
  baselineProps: readonly WildernessPropPlacement[] | null;
  stairsModified: boolean;
  treesModified: boolean;
  propsModified: boolean;
}

export function createManualEditTracker(): ManualEditTracker {
  return {
    baselineCellsByKey: new Map<number, CellBaselineSnapshot>(),
    editedCellsByKey: new Map<number, ManualMapCellEditPatch>(),
    baselineStairs: null,
    baselineTrees: null,
    baselineProps: null,
    stairsModified: false,
    treesModified: false,
    propsModified: false
  };
}

export function resetManualEditTracker(tracker: ManualEditTracker): void {
  tracker.baselineCellsByKey.clear();
  tracker.editedCellsByKey.clear();
  tracker.baselineStairs = null;
  tracker.baselineTrees = null;
  tracker.baselineProps = null;
  tracker.stairsModified = false;
  tracker.treesModified = false;
  tracker.propsModified = false;
}

function extractCellSnapshot(
  state: ContinentEditableState,
  x: number,
  y: number
): CellBaselineSnapshot {
  const defPalette = state.continent.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE;
  return {
    terrain: state.continent.terrainMatrix[y]?.[x] ?? 'grass',
    elevation: state.continent.heightmap[y]?.[x] ?? 0,
    biome: state.continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow',
    mountainPalette: state.continent.geologicalClusters?.paletteMatrix[y]?.[x] ?? defPalette,
    path: Boolean(state.pathGrid[y]?.[x]),
    manualPath: Boolean(state.manualPathGrid[y]?.[x]),
    bridge: Boolean(state.bridgeGrid[y]?.[x]),
    tallGrass: Boolean(state.wilderness?.tallGrassGrid[y]?.[x])
  };
}

function areCellSnapshotsEqual(a: CellBaselineSnapshot, b: CellBaselineSnapshot): boolean {
  return (
    a.terrain === b.terrain &&
    a.elevation === b.elevation &&
    a.biome === b.biome &&
    a.mountainPalette === b.mountainPalette &&
    a.path === b.path &&
    a.manualPath === b.manualPath &&
    a.bridge === b.bridge &&
    a.tallGrass === b.tallGrass
  );
}

function buildCellPatchFromBaseline(
  x: number,
  y: number,
  baseline: CellBaselineSnapshot,
  cur: CellBaselineSnapshot
): ManualMapCellEditPatch | null {
  if (areCellSnapshotsEqual(baseline, cur)) return null;
  return {
    x,
    y,
    ...(cur.terrain !== baseline.terrain ? { terrain: cur.terrain } : {}),
    ...(cur.elevation !== baseline.elevation ? { elevation: cur.elevation } : {}),
    ...(cur.biome !== baseline.biome ? { biome: cur.biome } : {}),
    ...(cur.mountainPalette !== baseline.mountainPalette
      ? { mountainPalette: cur.mountainPalette }
      : {}),
    ...(cur.path !== baseline.path ? { path: cur.path } : {}),
    ...(cur.manualPath !== baseline.manualPath ? { manualPath: cur.manualPath } : {}),
    ...(cur.bridge !== baseline.bridge ? { bridge: cur.bridge } : {}),
    ...(cur.tallGrass !== baseline.tallGrass ? { tallGrass: cur.tallGrass } : {})
  };
}

function arePropListsEqual(
  a: readonly WildernessPropPlacement[],
  b: readonly WildernessPropPlacement[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i]!;
    const itemB = b[i]!;
    if (
      itemA.x !== itemB.x ||
      itemA.y !== itemB.y ||
      itemA.type !== itemB.type ||
      itemA.prefabFile !== itemB.prefabFile
    ) {
      return false;
    }
  }
  return true;
}

function syncCollectionBaselines(
  tracker: ManualEditTracker,
  before: ContinentEditableState,
  after: ContinentEditableState
): void {
  if (
    !tracker.baselineStairs &&
    !isEntityListEqualInBounds(before.continent.placedStairs, after.continent.placedStairs)
  ) {
    tracker.baselineStairs = [...before.continent.placedStairs];
  }
  if (tracker.baselineStairs) {
    tracker.stairsModified = !isEntityListEqualInBounds(
      tracker.baselineStairs,
      after.continent.placedStairs
    );
    if (!tracker.stairsModified) tracker.baselineStairs = null;
  }

  const beforeTrees = before.wilderness?.trees ?? [];
  const afterTrees = after.wilderness?.trees ?? [];
  if (!tracker.baselineTrees && !isEntityListEqualInBounds(beforeTrees, afterTrees)) {
    tracker.baselineTrees = [...beforeTrees];
  }
  if (tracker.baselineTrees) {
    tracker.treesModified = !isEntityListEqualInBounds(tracker.baselineTrees, afterTrees);
    if (!tracker.treesModified) tracker.baselineTrees = null;
  }

  const beforeProps = before.wilderness?.props ?? [];
  const afterProps = after.wilderness?.props ?? [];
  if (!tracker.baselineProps && !arePropListsEqual(beforeProps, afterProps)) {
    tracker.baselineProps = [...beforeProps];
  }
  if (tracker.baselineProps) {
    tracker.propsModified = !arePropListsEqual(tracker.baselineProps, afterProps);
    if (!tracker.propsModified) tracker.baselineProps = null;
  }
}

/**
 * Records sparse cell and entity edits between `before` and `after` inside `rawBounds`,
 * preserving initial map baselines so full Undo leaves zero manual edit patches.
 */
export function recordManualEditDiff(
  tracker: ManualEditTracker,
  before: ContinentEditableState,
  after: ContinentEditableState,
  rawBounds: DirtyTileBounds
): void {
  const width = after.continent.width;
  const height = after.continent.height;
  const clamped = expandDirtyBounds(rawBounds, CANOPY_OVERHANG_BUFFER_TILES, width, height);

  for (let y = clamped.minY; y <= clamped.maxY; y++) {
    for (let x = clamped.minX; x <= clamped.maxX; x++) {
      const flatIdx = y * width + x;
      const beforeSnap = extractCellSnapshot(before, x, y);
      const afterSnap = extractCellSnapshot(after, x, y);
      const hasExisting = tracker.editedCellsByKey.has(flatIdx);
      if (!hasExisting && areCellSnapshotsEqual(beforeSnap, afterSnap)) continue;

      const baseline = tracker.baselineCellsByKey.get(flatIdx) ?? beforeSnap;
      if (!tracker.baselineCellsByKey.has(flatIdx)) {
        tracker.baselineCellsByKey.set(flatIdx, baseline);
      }

      const patch = buildCellPatchFromBaseline(x, y, baseline, afterSnap);
      if (patch) {
        tracker.editedCellsByKey.set(flatIdx, patch);
      } else {
        tracker.editedCellsByKey.delete(flatIdx);
        tracker.baselineCellsByKey.delete(flatIdx);
      }
    }
  }

  syncCollectionBaselines(tracker, before, after);
}

/**
 * Produces sparse serialized manual edits for JSON/LocalStorage persistence,
 * returning `undefined` when no manual modifications exist against baseline.
 */
export function buildSerializedManualEdits(
  tracker: ManualEditTracker,
  current: ContinentEditableState | null
): SerializedContinentManualEdits | undefined {
  if (!current) return undefined;
  const hasAny =
    tracker.editedCellsByKey.size > 0 ||
    tracker.stairsModified ||
    tracker.treesModified ||
    tracker.propsModified;
  if (!hasAny) return undefined;

  return {
    cells: Array.from(tracker.editedCellsByKey.values()),
    ...(tracker.stairsModified ? { stairs: current.continent.placedStairs } : {}),
    ...(tracker.treesModified && current.wilderness ? { trees: current.wilderness.trees } : {}),
    ...(tracker.propsModified && current.wilderness ? { props: current.wilderness.props } : {})
  };
}
