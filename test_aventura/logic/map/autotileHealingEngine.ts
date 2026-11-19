/**
 * test_aventura/logic/map/autotileHealingEngine.ts
 *
 * MODEL-FIRST CANONICAL AUTOTILE HEALING BRUSH ENGINE (v3)
 *
 * Repairs broken tile combinations across all 4 regional domains
 * ('water', 'mountain', 'macro_biome', 'path') using row Copy-on-Write matrices,
 * bounded sub-grid autotile recompilation (`rebuildContinentInBounds`),
 * configurable MountainHealPolicy ('erode' | 'fill'), containment buffer sync,
 * and shared wilderness overlay pruning (`pruneWildernessInBounds`).
 */

import type { DisplayText, IsoDateString } from '@francogp/auditor';

import {
  BIOME_BUFFER_MARGIN_TILES,
  CANOPY_OVERHANG_BUFFER_TILES,
  DEFAULT_BRUSH_RADIUS,
  DIRTY_REBUILD_MARGIN_TILES,
  MAX_BRUSH_ELEVATION_TIER
} from '../../config/brushConfig.ts';
import { DEFAULT_MOUNTAIN_PALETTE } from '../../config/studioConstants.ts';
import {
  HEALING_DOMAINS,
  type AutotileHealingOptions,
  type CoastalTerrainGroup,
  type ContinentHealingSummary,
  type DirtyTileBounds,
  type HealingDomain
} from '../../types/map/autotileHealingTypes.ts';
import type { BrushShape, MountainHealPolicy } from '../../types/map/continentBrushTypes.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import {
  clampDirtyBounds,
  collectBrushKernelOffsets,
  expandDirtyBounds
} from '../utils/gridGeometryUtils.ts';
import {
  buildBuildingProtectionMask,
  buildPoiAnchorMask,
  hasDropped2DInnerCorner,
  isBlockedPathElevationCell,
  isMiniatureOrphanPathBlotch,
  isPathOrBridgeAt,
  isPinchedDualBoundarySandCell,
  isSameWaterGroup as isSameWaterGroupAt,
  scanContinentAutotileDefects,
  toCoastalGroup
} from './autotileDefectScanner.ts';
import { isValidFishingBalcony, type BridgeGridLookup } from './canonicalBridgeEngine.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import { pruneWildernessInBounds } from './continentWildernessSync.ts';
import type { ContinentCellDetails } from './geologicalAutotilingEngine.ts';
import {
  resolveMacroBiomeAutotile,
  resolveMacroBiomeAutotileInBounds
} from './macroBiomeAutotileEngine.ts';
import {
  updateContainmentBufferInBounds,
  type MacroBiome,
  type MacroBiomeResult
} from './macroBiomeSynthesizer.ts';
import {
  resolveMountainAutotileCell,
  resolveMountainMapInBounds,
  type MountainPalette,
  type MountainRole,
  type MountainStairLocation,
  type ResolvedMountainCell
} from './mountainAutotileEngine.ts';
import { resolveWaterCoastInBounds, type WaterTerrainKind } from './waterAutotileEngine.ts';
import type { WildernessLayerResult } from './wildernessVegetationEngine.ts';

export interface ContinentHealingMutationResult {
  readonly continent: ContinentMapResult;
  readonly pathGrid: boolean[][];
  readonly manualPathGrid?: boolean[][];
  readonly bridgeGrid?: boolean[][];
  readonly wilderness?: WildernessLayerResult | null;
  readonly summary: ContinentHealingSummary;
}

const VALID_HEALING_DOMAIN_SET: ReadonlySet<string> = new Set<string>(HEALING_DOMAINS);
const COASTAL_OR_WATER_TERRAIN_SET: ReadonlySet<WaterTerrainKind> = new Set<WaterTerrainKind>([
  'water',
  'water_deep',
  'sand'
]);
const BRUSHED_BIOME_SET: ReadonlySet<MacroBiome> = new Set<MacroBiome>([
  'mint_highland',
  'arid_desert',
  'volcanic_plateau'
]);

const MAX_LOCAL_CONVERGENCE_PASSES = 12 as const;
const MAX_FULL_MAP_HEAL_PASSES = 8 as const;

function getBoundsPassLimit(bounds: DirtyTileBounds, multiplier = 1): number {
  const span = Math.max(0, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  return Math.max(MAX_LOCAL_CONVERGENCE_PASSES, span + 4) * multiplier;
}

const EIGHT_NEIGHBOR_OFFSETS: readonly { readonly dx: number; readonly dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: -1, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
  { dx: 1, dy: 1 }
];

export function isValidHealingDomain(value: string): value is HealingDomain {
  return VALID_HEALING_DOMAIN_SET.has(value);
}

function isWaterTerrain(t: WaterTerrainKind | undefined): boolean {
  return t === 'water' || t === 'water_deep';
}

export function inferCellHealingDomain(
  continent: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  x: number,
  y: number,
  options?: AutotileHealingOptions
): HealingDomain {
  const elev = continent.heightmap[y]?.[x] ?? 0;
  if (elev > 0 || continent.resolvedMountain.occupiedFootCells[y]?.[x]) {
    return 'mountain';
  }

  const terrain = continent.terrainMatrix[y]?.[x] ?? 'grass';
  if (COASTAL_OR_WATER_TERRAIN_SET.has(terrain)) {
    return 'water';
  }

  const isBridge = Boolean(options?.bridgeGrid?.[y]?.[x]);
  if (isBridge && !isWaterTerrain(terrain)) {
    return 'path';
  }
  if (pathGrid[y]?.[x] && !isBridge) {
    return 'path';
  }

  const biome = continent.macroBiomes?.biomeGrid[y]?.[x];
  if (biome && BRUSHED_BIOME_SET.has(biome)) {
    return 'macro_biome';
  }

  const localScan = scanContinentAutotileDefects({
    continent,
    pathGrid,
    manualPathGrid: options?.manualPathGrid,
    bridgeGrid: options?.bridgeGrid,
    pois: options?.pois,
    bounds: clampDirtyBounds(
      { minX: x - 2, minY: y - 2, maxX: x + 2, maxY: y + 2 },
      continent.width,
      continent.height
    )
  });

  if (localScan.defects.length > 0) {
    let bestDomain: HealingDomain = localScan.defects[0]!.domain;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const d of localScan.defects) {
      const dist = Math.hypot(d.x - x, d.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        bestDomain = d.domain;
      }
    }
    return bestDomain;
  }

  return 'macro_biome';
}

export interface MutableContinentGrids {
  readonly width: number;
  readonly height: number;
  readonly terrainMatrix: WaterTerrainKind[][];
  readonly heightmap: number[][];
  readonly biomeGrid: MacroBiome[][];
  readonly pathGrid: boolean[][];
  paletteMatrix: MountainPalette[][] | undefined;
  readonly copiedTerrainRows: Set<number>;
  readonly copiedHeightRows: Set<number>;
  readonly copiedBiomeRows: Set<number>;
  readonly copiedPathRows: Set<number>;
  readonly copiedManualPathRows: Set<number>;
  readonly copiedBridgeRows: Set<number>;
  readonly copiedPaletteRows: Set<number>;
  bridgeGrid?: boolean[][];
  manualPathGrid?: boolean[][];
  readonly buildingMask: readonly (readonly boolean[])[];
  readonly poiAnchorMask: readonly (readonly boolean[])[];
  baseStairs?: MountainStairLocation[];
  readonly palette: MountainPalette;
  mutatedTerrain: boolean;
  mutatedHeight: boolean;
  mutatedBiome: boolean;
  mutatedPath: boolean;
  mutatedManualPath: boolean;
  mutatedBridge: boolean;
  mutatedPalette: boolean;
  readonly mutatedBoundsAccumulator: { minX: number; minY: number; maxX: number; maxY: number };
  hasAnyMutation: boolean;
  protectedCells?: ReadonlySet<string>;
  protectedPaintKind?: 'water' | 'path' | 'bridge' | 'macro_biome';
}

function cloneRowOnWrite<T>(rows: T[][], clonedSet: Set<number>, y: number): T[] {
  if (!clonedSet.has(y)) {
    rows[y] = [...rows[y]!];
    clonedSet.add(y);
  }
  return rows[y]!;
}

function recordMutatedCoord(grids: MutableContinentGrids, x: number, y: number): void {
  if (!grids.hasAnyMutation) {
    grids.mutatedBoundsAccumulator.minX = x;
    grids.mutatedBoundsAccumulator.maxX = x;
    grids.mutatedBoundsAccumulator.minY = y;
    grids.mutatedBoundsAccumulator.maxY = y;
    grids.hasAnyMutation = true;
    return;
  }
  if (x < grids.mutatedBoundsAccumulator.minX) grids.mutatedBoundsAccumulator.minX = x;
  if (x > grids.mutatedBoundsAccumulator.maxX) grids.mutatedBoundsAccumulator.maxX = x;
  if (y < grids.mutatedBoundsAccumulator.minY) grids.mutatedBoundsAccumulator.minY = y;
  if (y > grids.mutatedBoundsAccumulator.maxY) grids.mutatedBoundsAccumulator.maxY = y;
}

export function writeGridTerrain(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  value: WaterTerrainKind
): void {
  if (grids.terrainMatrix[y]?.[x] === value) return;
  cloneRowOnWrite(grids.terrainMatrix, grids.copiedTerrainRows, y)[x] = value;
  grids.mutatedTerrain = true;
  recordMutatedCoord(grids, x, y);
}

export function writeGridHeight(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  value: number
): void {
  if (grids.heightmap[y]?.[x] === value) return;
  cloneRowOnWrite(grids.heightmap, grids.copiedHeightRows, y)[x] = value;
  grids.mutatedHeight = true;
  recordMutatedCoord(grids, x, y);
}

export function writeGridBiome(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  value: MacroBiome
): void {
  if (grids.biomeGrid[y]?.[x] === value) return;
  cloneRowOnWrite(grids.biomeGrid, grids.copiedBiomeRows, y)[x] = value;
  grids.mutatedBiome = true;
  recordMutatedCoord(grids, x, y);
}

export function writeGridPath(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  value: boolean
): void {
  if (grids.pathGrid[y]?.[x] === value) return;
  cloneRowOnWrite(grids.pathGrid, grids.copiedPathRows, y)[x] = value;
  grids.mutatedPath = true;
  recordMutatedCoord(grids, x, y);
}

export function writeGridManualPath(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  value: boolean
): void {
  if (!grids.manualPathGrid) {
    if (!value) return;
    grids.manualPathGrid = Array.from({ length: grids.height }, () =>
      Array<boolean>(grids.width).fill(false)
    );
  }
  if (Boolean(grids.manualPathGrid[y]?.[x]) === value) return;
  cloneRowOnWrite(grids.manualPathGrid, grids.copiedManualPathRows, y)[x] = value;
  grids.mutatedManualPath = true;
  recordMutatedCoord(grids, x, y);
}

export function writeGridBridge(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  value: boolean
): void {
  if (!grids.bridgeGrid) {
    if (!value) return;
    grids.bridgeGrid = Array.from({ length: grids.height }, () =>
      Array<boolean>(grids.width).fill(false)
    );
  }
  if (Boolean(grids.bridgeGrid[y]?.[x]) === value) return;
  cloneRowOnWrite(grids.bridgeGrid, grids.copiedBridgeRows, y)[x] = value;
  grids.mutatedBridge = true;
  recordMutatedCoord(grids, x, y);
}

export function writeGridPalette(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  value: MountainPalette
): void {
  if (!grids.paletteMatrix) {
    grids.paletteMatrix = Array.from({ length: grids.height }, () =>
      Array<MountainPalette>(grids.width).fill(grids.palette)
    );
  }
  if (grids.paletteMatrix[y]?.[x] === value) return;
  cloneRowOnWrite(grids.paletteMatrix, grids.copiedPaletteRows, y)[x] = value;
  grids.mutatedPalette = true;
  recordMutatedCoord(grids, x, y);
}

export function createCowContinentGrids(
  continent: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  pois?: readonly POINode[],
  bridgeGrid?: readonly (readonly boolean[])[],
  manualPathGrid?: readonly (readonly boolean[])[]
): MutableContinentGrids {
  const width = continent.width;
  const height = continent.height;
  return {
    width,
    height,
    terrainMatrix: continent.terrainMatrix.map((row) => row as WaterTerrainKind[]),
    heightmap: continent.heightmap.map((row) => row as number[]),
    biomeGrid: continent.macroBiomes
      ? continent.macroBiomes.biomeGrid.map((row) => row as MacroBiome[])
      : Array.from({ length: height }, () => Array<MacroBiome>(width).fill('temperate_meadow')),
    pathGrid: Array.from({ length: height }, (_, ry) =>
      pathGrid[ry] ? (pathGrid[ry] as boolean[]) : Array<boolean>(width).fill(false)
    ),
    paletteMatrix: continent.geologicalClusters?.paletteMatrix
      ? continent.geologicalClusters.paletteMatrix.map((row) => row as MountainPalette[])
      : undefined,
    copiedTerrainRows: new Set<number>(),
    copiedHeightRows: new Set<number>(),
    copiedBiomeRows: new Set<number>(),
    copiedPathRows: new Set<number>(),
    copiedManualPathRows: new Set<number>(),
    copiedBridgeRows: new Set<number>(),
    copiedPaletteRows: new Set<number>(),
    bridgeGrid: bridgeGrid
      ? Array.from({ length: height }, (_, ry) =>
          bridgeGrid[ry] ? (bridgeGrid[ry] as boolean[]) : Array<boolean>(width).fill(false)
        )
      : undefined,
    manualPathGrid: manualPathGrid
      ? Array.from({ length: height }, (_, ry) =>
          manualPathGrid[ry] ? (manualPathGrid[ry] as boolean[]) : Array<boolean>(width).fill(false)
        )
      : undefined,
    buildingMask: buildBuildingProtectionMask(width, height, pois),
    poiAnchorMask: buildPoiAnchorMask(width, height, pois),
    baseStairs: [...continent.placedStairs],
    palette: continent.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE,
    mutatedTerrain: false,
    mutatedHeight: false,
    mutatedBiome: false,
    mutatedPath: false,
    mutatedManualPath: false,
    mutatedBridge: false,
    mutatedPalette: false,
    mutatedBoundsAccumulator: { minX: 0, minY: 0, maxX: -1, maxY: -1 },
    hasAnyMutation: false
  };
}

function isProtectedTerrainCell(grids: MutableContinentGrids, x: number, y: number): boolean {
  return Boolean(grids.bridgeGrid?.[y]?.[x] || grids.buildingMask[y]?.[x]);
}

function hasNeighborTerrain(
  matrix: readonly (readonly WaterTerrainKind[])[],
  width: number,
  height: number,
  x: number,
  y: number,
  predicate: (t: WaterTerrainKind, nx: number, ny: number) => boolean
): boolean {
  for (const { dx, dy } of EIGHT_NEIGHBOR_OFFSETS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    const nt = matrix[ny]?.[nx];
    if (nt && predicate(nt, nx, ny)) return true;
  }
  return false;
}

function countCardinalGroup(
  matrix: readonly (readonly WaterTerrainKind[])[],
  width: number,
  height: number,
  x: number,
  y: number,
  group: CoastalTerrainGroup
): number {
  let count = 0;
  if (isSameWaterGroupAt(matrix, width, height, x, y - 1, group)) count += 1;
  if (isSameWaterGroupAt(matrix, width, height, x, y + 1, group)) count += 1;
  if (isSameWaterGroupAt(matrix, width, height, x - 1, y, group)) count += 1;
  if (isSameWaterGroupAt(matrix, width, height, x + 1, y, group)) count += 1;
  return count;
}

function isPinchedSandAt(grids: MutableContinentGrids, x: number, y: number): boolean {
  return isPinchedDualBoundarySandCell(
    grids.terrainMatrix,
    grids.bridgeGrid,
    grids.width,
    grids.height,
    x,
    y
  );
}

function collectPinchedSandExpansionAt(
  grids: MutableContinentGrids,
  targetBounds: DirtyTileBounds,
  cx: number,
  cy: number,
  toSand: { x: number; y: number }[],
  allowedMask?: ReadonlySet<string>
): void {
  for (const { dx, dy } of EIGHT_NEIGHBOR_OFFSETS) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (
      nx < targetBounds.minX ||
      nx > targetBounds.maxX ||
      ny < targetBounds.minY ||
      ny > targetBounds.maxY
    ) {
      continue;
    }
    if (allowedMask && !allowedMask.has(`${nx}_${ny}`)) continue;
    if (grids.protectedCells?.has(`${nx}_${ny}`)) continue;
    if (
      grids.terrainMatrix[ny]?.[nx] === 'grass' &&
      (grids.heightmap[ny]?.[nx] ?? 0) === 0 &&
      !isProtectedTerrainCell(grids, nx, ny)
    ) {
      toSand.push({ x: nx, y: ny });
    }
  }
}

function thickenPinchedSandOnce(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  allowedMask?: ReadonlySet<string>
): boolean {
  const targetBounds = allowedMask
    ? bounds
    : expandDirtyBounds(bounds, 1, grids.width, grids.height);
  const toSand: { x: number; y: number }[] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (isPinchedSandAt(grids, x, y)) {
        collectPinchedSandExpansionAt(grids, targetBounds, x, y, toSand, allowedMask);
      }
    }
  }
  for (const pt of toSand) {
    writeGridTerrain(grids, pt.x, pt.y, 'sand');
    writeGridPath(grids, pt.x, pt.y, false);
    writeGridManualPath(grids, pt.x, pt.y, false);
  }
  return toSand.length > 0;
}

function resolve2x2PinchAt(grids: MutableContinentGrids, x: number, y: number): boolean {
  const { terrainMatrix } = grids;
  let changed = false;

  const tlW = isWaterTerrain(terrainMatrix[y]?.[x]);
  const trW = isWaterTerrain(terrainMatrix[y]?.[x + 1]);
  const blW = isWaterTerrain(terrainMatrix[y + 1]?.[x]);
  const brW = isWaterTerrain(terrainMatrix[y + 1]?.[x + 1]);

  if (tlW && brW && !trW && !blW) {
    if (!isProtectedTerrainCell(grids, x, y)) {
      writeGridTerrain(grids, x, y, terrainMatrix[y]![x + 1]!);
      changed = true;
    } else if (!isProtectedTerrainCell(grids, x + 1, y + 1)) {
      writeGridTerrain(grids, x + 1, y + 1, terrainMatrix[y]![x + 1]!);
      changed = true;
    }
  } else if (!tlW && !brW && trW && blW) {
    if (!isProtectedTerrainCell(grids, x + 1, y)) {
      writeGridTerrain(grids, x + 1, y, terrainMatrix[y]![x]!);
      changed = true;
    } else if (!isProtectedTerrainCell(grids, x, y + 1)) {
      writeGridTerrain(grids, x, y + 1, terrainMatrix[y]![x]!);
      changed = true;
    }
  }

  const tlS = terrainMatrix[y]?.[x] === 'sand';
  const trS = terrainMatrix[y]?.[x + 1] === 'sand';
  const blS = terrainMatrix[y + 1]?.[x] === 'sand';
  const brS = terrainMatrix[y + 1]?.[x + 1] === 'sand';

  if (tlS && brS && !trS && !blS) {
    if (!isProtectedTerrainCell(grids, x, y)) {
      writeGridTerrain(grids, x, y, 'grass');
      changed = true;
    } else if (!isProtectedTerrainCell(grids, x + 1, y + 1)) {
      writeGridTerrain(grids, x + 1, y + 1, 'grass');
      changed = true;
    }
  } else if (!tlS && !brS && trS && blS) {
    if (!isProtectedTerrainCell(grids, x + 1, y)) {
      writeGridTerrain(grids, x + 1, y, 'grass');
      changed = true;
    } else if (!isProtectedTerrainCell(grids, x, y + 1)) {
      writeGridTerrain(grids, x, y + 1, 'grass');
      changed = true;
    }
  }

  return changed;
}

function resolve2x2DiagonalPinchesInBounds(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  resolver: (grids: MutableContinentGrids, x: number, y: number) => boolean,
  allowedMask?: ReadonlySet<string>
): boolean {
  let changed = false;
  const minY = Math.max(0, bounds.minY - 1);
  const minX = Math.max(0, bounds.minX - 1);
  const maxY = Math.min(grids.height - 2, bounds.maxY);
  const maxX = Math.min(grids.width - 2, bounds.maxX);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (
        allowedMask &&
        !allowedMask.has(`${x}_${y}`) &&
        !allowedMask.has(`${x + 1}_${y}`) &&
        !allowedMask.has(`${x}_${y + 1}`) &&
        !allowedMask.has(`${x + 1}_${y + 1}`)
      ) {
        continue;
      }
      if (resolver(grids, x, y)) {
        changed = true;
      }
    }
  }
  return changed;
}

function resolveDiagonalWaterAndSandPinches(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds
): boolean {
  return resolve2x2DiagonalPinchesInBounds(grids, bounds, resolve2x2PinchAt);
}

function pickReplacementForSliver(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  currentGroup: CoastalTerrainGroup
): WaterTerrainKind {
  const { terrainMatrix, width, height } = grids;
  const waterCards = countCardinalGroup(terrainMatrix, width, height, x, y, 'water');
  const sandCards = countCardinalGroup(terrainMatrix, width, height, x, y, 'sand');
  const grassCards = countCardinalGroup(terrainMatrix, width, height, x, y, 'grass');

  if (currentGroup === 'water') {
    return sandCards >= 3 && grassCards === 0 ? 'sand' : 'grass';
  }
  return waterCards >= 3 && grassCards === 0 ? 'water' : 'grass';
}

function healSingleWaterOrSandCell(grids: MutableContinentGrids, x: number, y: number): boolean {
  if (isProtectedTerrainCell(grids, x, y)) return false;
  const { terrainMatrix, width, height } = grids;
  let changed = false;

  if (terrainMatrix[y]![x] === 'water_deep') {
    const touchesGrass = hasNeighborTerrain(
      terrainMatrix,
      width,
      height,
      x,
      y,
      (nt, nx, ny) => nt === 'grass' && !grids.bridgeGrid?.[ny]?.[nx]
    );
    if (touchesGrass) {
      writeGridTerrain(grids, x, y, 'water');
      changed = true;
    }
  }

  const cur = terrainMatrix[y]![x]!;
  const group: CoastalTerrainGroup = toCoastalGroup(cur);
  if (group === 'grass') return changed;

  const sameN = isSameWaterGroupAt(terrainMatrix, width, height, x, y - 1, group);
  const sameS = isSameWaterGroupAt(terrainMatrix, width, height, x, y + 1, group);
  const sameW = isSameWaterGroupAt(terrainMatrix, width, height, x - 1, y, group);
  const sameE = isSameWaterGroupAt(terrainMatrix, width, height, x + 1, y, group);

  if ((!sameN && !sameS) || (!sameW && !sameE)) {
    const replacement = pickReplacementForSliver(grids, x, y, group);
    writeGridTerrain(grids, x, y, replacement);
    if (replacement !== 'grass') {
      writeGridHeight(grids, x, y, 0);
      writeGridPath(grids, x, y, false);
      writeGridManualPath(grids, x, y, false);
    }
    return true;
  }

  if (cur === 'sand' && isPinchedSandAt(grids, x, y)) {
    const waterCards = countCardinalGroup(terrainMatrix, width, height, x, y, 'water');
    const grassCards = countCardinalGroup(terrainMatrix, width, height, x, y, 'grass');
    writeGridTerrain(grids, x, y, waterCards >= 3 && grassCards === 0 ? 'water' : 'grass');
    return true;
  }

  return changed;
}

function healWaterSliversPass(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  allowedMask?: ReadonlySet<string>
): { changed: boolean; touchedEdge: boolean } {
  let changed = false;
  let touchedEdge = false;
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (allowedMask && !allowedMask.has(`${x}_${y}`)) continue;
      if (healSingleWaterOrSandCell(grids, x, y)) {
        changed = true;
        touchedEdge = touchedEdge || isOnBoundsBorder(x, y, bounds);
      }
    }
  }
  return { changed, touchedEdge };
}

function canWriteAutoWaterAt(grids: MutableContinentGrids, x: number, y: number): boolean {
  if (x < 0 || x >= grids.width || y < 0 || y >= grids.height) return false;
  return !isProtectedTerrainCell(grids, x, y);
}

function tryAppendWaterOrSand2x2Quadrants(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  fillTerrain: WaterTerrainKind,
  additions: { x: number; y: number; terrain: WaterTerrainKind }[]
): boolean {
  const quadrants: readonly { readonly dx: number; readonly dy: number }[] = [
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: -1 }
  ];
  const isCleanFlatQuadrant = (dx: number, dy: number): boolean =>
    (grids.heightmap[y]?.[x + dx] ?? 0) === 0 &&
    (grids.heightmap[y + dy]?.[x] ?? 0) === 0 &&
    (grids.heightmap[y + dy]?.[x + dx] ?? 0) === 0;

  const chosen =
    quadrants.find(
      ({ dx, dy }) =>
        canWriteAutoWaterAt(grids, x + dx, y) &&
        canWriteAutoWaterAt(grids, x, y + dy) &&
        canWriteAutoWaterAt(grids, x + dx, y + dy) &&
        isCleanFlatQuadrant(dx, dy)
    ) ??
    quadrants.find(
      ({ dx, dy }) =>
        canWriteAutoWaterAt(grids, x + dx, y) &&
        canWriteAutoWaterAt(grids, x, y + dy) &&
        canWriteAutoWaterAt(grids, x + dx, y + dy)
    );

  if (!chosen) return false;
  additions.push(
    { x: x + chosen.dx, y, terrain: fillTerrain },
    { x, y: y + chosen.dy, terrain: fillTerrain },
    { x: x + chosen.dx, y: y + chosen.dy, terrain: fillTerrain }
  );
  return true;
}

function widenProtectedWaterOrSandDots(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds
): void {
  if (grids.protectedPaintKind !== 'water' || !grids.protectedCells) return;
  const { terrainMatrix, width, height } = grids;
  const additions: { x: number; y: number; terrain: WaterTerrainKind }[] = [];

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (!grids.protectedCells.has(`${x}_${y}`) || isProtectedTerrainCell(grids, x, y)) continue;
      const cur = terrainMatrix[y]?.[x];
      const group = toCoastalGroup(cur);
      if (!cur || group === 'grass') continue;

      const sameN = isSameWaterGroupAt(terrainMatrix, width, height, x, y - 1, group);
      const sameS = isSameWaterGroupAt(terrainMatrix, width, height, x, y + 1, group);
      const sameW = isSameWaterGroupAt(terrainMatrix, width, height, x - 1, y, group);
      const sameE = isSameWaterGroupAt(terrainMatrix, width, height, x + 1, y, group);
      const touchesGrass = hasNeighborTerrain(
        terrainMatrix,
        width,
        height,
        x,
        y,
        (nt) => nt === 'grass'
      );
      const fillTerrain: WaterTerrainKind = cur === 'water_deep' && touchesGrass ? 'water' : cur;

      if ((sameW || sameE) && !sameN && !sameS) {
        if (canWriteAutoWaterAt(grids, x, y + 1))
          additions.push({ x, y: y + 1, terrain: fillTerrain });
        else if (canWriteAutoWaterAt(grids, x, y - 1))
          additions.push({ x, y: y - 1, terrain: fillTerrain });
      } else if ((sameN || sameS) && !sameW && !sameE) {
        if (canWriteAutoWaterAt(grids, x + 1, y))
          additions.push({ x: x + 1, y, terrain: fillTerrain });
        else if (canWriteAutoWaterAt(grids, x - 1, y))
          additions.push({ x: x - 1, y, terrain: fillTerrain });
      } else if (!sameN && !sameS && !sameW && !sameE) {
        tryAppendWaterOrSand2x2Quadrants(grids, x, y, fillTerrain, additions);
      }
    }
  }

  for (const pt of additions) {
    writeGridTerrain(grids, pt.x, pt.y, pt.terrain);
    writeGridHeight(grids, pt.x, pt.y, 0);
    writeGridPath(grids, pt.x, pt.y, false);
    writeGridManualPath(grids, pt.x, pt.y, false);
  }
}

function healWaterDomainInBounds(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  allowedMask?: ReadonlySet<string>
): void {
  let activeBounds = clampDirtyBounds(bounds, grids.width, grids.height);
  if (grids.protectedPaintKind === 'water' && !allowedMask) {
    widenProtectedWaterOrSandDots(grids, activeBounds);
    activeBounds = getCurrentDomainWorkBounds(grids, activeBounds);
  }
  if (thickenPinchedSandOnce(grids, activeBounds, allowedMask) && !allowedMask) {
    activeBounds = expandDirtyBounds(activeBounds, 1, grids.width, grids.height);
  }

  const maxPasses = getBoundsPassLimit(activeBounds, 2);
  for (let pass = 0; pass < maxPasses; pass++) {
    const diagChanged = resolveDiagonalWaterAndSandPinches(grids, activeBounds);
    const sliverRes = healWaterSliversPass(
      grids,
      activeBounds,
      pass === 0 ? allowedMask : undefined
    );
    if (!diagChanged && !sliverRes.changed) break;
    if (sliverRes.touchedEdge || diagChanged) {
      activeBounds = expandDirtyBounds(activeBounds, 1, grids.width, grids.height);
    }
  }
}

function getElev(heightmap: readonly (readonly number[])[], x: number, y: number): number {
  if (y < 0 || y >= heightmap.length) return 0;
  const row = heightmap[y];
  if (!row || x < 0 || x >= row.length) return 0;
  return row[x] ?? 0;
}

function canRaiseMountainCell(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  targetElev: number
): boolean {
  if (x < 0 || x >= grids.width || y < 0 || y >= grids.height) return false;
  if (targetElev <= 0 || targetElev > MAX_BRUSH_ELEVATION_TIER) return false;
  if (grids.terrainMatrix[y]?.[x] !== 'grass') return false;
  if (isProtectedTerrainCell(grids, x, y)) return false;
  if (y + 1 < grids.height && isWaterTerrain(grids.terrainMatrix[y + 1]?.[x])) return false;

  const minCard = Math.min(
    getElev(grids.heightmap, x, y - 1),
    getElev(grids.heightmap, x, y + 1),
    getElev(grids.heightmap, x - 1, y),
    getElev(grids.heightmap, x + 1, y)
  );
  return targetElev <= minCard + 1;
}

function resolveMountainDiagonalPinches(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  policy: MountainHealPolicy
): boolean {
  let changed = false;
  const { heightmap, width, height } = grids;
  const maxY = Math.min(height - 2, bounds.maxY);
  const maxX = Math.min(width - 2, bounds.maxX);

  for (let y = Math.max(0, bounds.minY - 1); y <= maxY; y++) {
    for (let x = Math.max(0, bounds.minX - 1); x <= maxX; x++) {
      const tl = getElev(heightmap, x, y);
      const tr = getElev(heightmap, x + 1, y);
      const bl = getElev(heightmap, x, y + 1);
      const br = getElev(heightmap, x + 1, y + 1);

      const m1 = Math.max(tr, bl);
      if (tl > m1 && br > m1) {
        const fillElev = Math.min(tl, br);
        if (policy === 'fill' && canRaiseMountainCell(grids, x + 1, y, fillElev)) {
          writeGridHeight(grids, x + 1, y, fillElev);
        } else {
          writeGridHeight(grids, x, y, m1);
          writeGridHeight(grids, x + 1, y + 1, m1);
        }
        changed = true;
        continue;
      }

      const m2 = Math.max(tl, br);
      if (tr > m2 && bl > m2) {
        const fillElev = Math.min(tr, bl);
        if (policy === 'fill' && canRaiseMountainCell(grids, x, y, fillElev)) {
          writeGridHeight(grids, x, y, fillElev);
        } else {
          writeGridHeight(grids, x + 1, y, m2);
          writeGridHeight(grids, x, y + 1, m2);
        }
        changed = true;
      }
    }
  }
  return changed;
}

interface MountainFillPromotion {
  readonly x: number;
  readonly y: number;
  readonly elev: number;
  readonly pal: MountainPalette;
}

function canExpandIntoPeak2x2Quadrant(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  dx: number,
  dy: number,
  elev: number
): boolean {
  return (
    canRaiseMountainCell(grids, x + dx, y, elev) &&
    canRaiseMountainCell(grids, x, y + dy, elev) &&
    canRaiseMountainCell(grids, x + dx, y + dy, elev)
  );
}

function hasOuterDiagonalContactAtQuadrant(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  dx: number,
  dy: number,
  elev: number
): boolean {
  const cornerX = x + dx;
  const cornerY = y + dy;
  const nDiagX = cornerX + dx;
  const nDiagY = cornerY + dy;
  return (
    getElev(grids.heightmap, nDiagX, nDiagY) >= elev &&
    getElev(grids.heightmap, cornerX, nDiagY) < elev &&
    getElev(grids.heightmap, nDiagX, cornerY) < elev
  );
}

function tryFillIsolatedMountainPeak2x2(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  elev: number,
  pendingPromotions?: MountainFillPromotion[]
): boolean {
  const pal = grids.paletteMatrix?.[y]?.[x] ?? grids.palette;
  const quadrants: readonly { readonly dx: number; readonly dy: number }[] = [
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: -1 }
  ];
  const chosen =
    quadrants.find(
      ({ dx, dy }) =>
        canExpandIntoPeak2x2Quadrant(grids, x, y, dx, dy, elev) &&
        !hasOuterDiagonalContactAtQuadrant(grids, x, y, dx, dy, elev)
    ) ?? quadrants.find(({ dx, dy }) => canExpandIntoPeak2x2Quadrant(grids, x, y, dx, dy, elev));

  if (!chosen) return false;
  const targets = [
    { x: x + chosen.dx, y },
    { x, y: y + chosen.dy },
    { x: x + chosen.dx, y: y + chosen.dy }
  ];
  for (const t of targets) {
    if (pendingPromotions) {
      pendingPromotions.push({ x: t.x, y: t.y, elev, pal });
    } else {
      writeGridHeight(grids, t.x, t.y, elev);
      writeGridPalette(grids, t.x, t.y, pal);
    }
  }
  return true;
}

function tryFillMountainDefect(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  elev: number,
  flags: {
    readonly hasN: boolean;
    readonly hasS: boolean;
    readonly hasW: boolean;
    readonly hasE: boolean;
    readonly isHorizRidge: boolean;
    readonly isVertRidge: boolean;
    readonly isSingleColSouthJag: boolean;
    readonly isSingleRowSouthJag: boolean;
  },
  pendingPromotions?: MountainFillPromotion[]
): boolean {
  const pal = grids.paletteMatrix?.[y]?.[x] ?? grids.palette;
  const tryPromote = (tx: number, ty: number): boolean => {
    if (!canRaiseMountainCell(grids, tx, ty, elev)) return false;
    if (pendingPromotions) {
      pendingPromotions.push({ x: tx, y: ty, elev, pal });
    } else {
      writeGridHeight(grids, tx, ty, elev);
      writeGridPalette(grids, tx, ty, pal);
    }
    return true;
  };

  if (flags.isHorizRidge) {
    const pS = tryPromote(x, y + 1);
    const pN = tryPromote(x, y - 1);
    return pS || pN;
  }
  if (flags.isVertRidge) {
    const pE = tryPromote(x + 1, y);
    const pW = tryPromote(x - 1, y);
    return pE || pW;
  }
  if (flags.isSingleColSouthJag) return tryPromote(x, y + 1);
  if (flags.isSingleRowSouthJag) {
    if (!flags.hasW && flags.hasN && tryPromote(x - 1, y)) return true;
    if (!flags.hasE && flags.hasN && tryPromote(x + 1, y)) return true;
  }
  return false;
}

function erodeTrailingRidgeTipIfIsolated(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  elev: number,
  flags: {
    readonly isHorizRidge: boolean;
    readonly isVertRidge: boolean;
    readonly hasW: boolean;
    readonly hasE: boolean;
    readonly hasN: boolean;
    readonly hasS: boolean;
  }
): void {
  const { heightmap } = grids;
  if (flags.isHorizRidge && !flags.hasW && flags.hasE && getElev(heightmap, x + 1, y) === elev) {
    if (
      getElev(heightmap, x + 2, y) < elev &&
      getElev(heightmap, x + 1, y - 1) < elev &&
      getElev(heightmap, x + 1, y + 1) < elev
    ) {
      writeGridHeight(grids, x + 1, y, elev - 1);
    }
  }
  if (flags.isVertRidge && !flags.hasN && flags.hasS && getElev(heightmap, x, y + 1) === elev) {
    if (
      getElev(heightmap, x, y + 2) < elev &&
      getElev(heightmap, x - 1, y + 1) < elev &&
      getElev(heightmap, x + 1, y + 1) < elev
    ) {
      writeGridHeight(grids, x, y + 1, elev - 1);
    }
  }
}

function healSingleMountainCell(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  policy: MountainHealPolicy,
  pendingPromotions?: MountainFillPromotion[]
): boolean {
  const { heightmap, terrainMatrix, width, height } = grids;
  const elev = getElev(heightmap, x, y);
  if (elev <= 0) return false;

  if (terrainMatrix[y]?.[x] !== 'grass') {
    writeGridHeight(grids, x, y, 0);
    return true;
  }

  if (y + 1 < height && isWaterTerrain(terrainMatrix[y + 1]?.[x])) {
    const southElev = getElev(heightmap, x, y + 1);
    if (southElev < elev) {
      writeGridHeight(grids, x, y, southElev);
      return true;
    }
  }

  let maxAllowed = elev;
  if (y > 0) maxAllowed = Math.min(maxAllowed, getElev(heightmap, x, y - 1) + 1);
  if (y + 1 < height) maxAllowed = Math.min(maxAllowed, getElev(heightmap, x, y + 1) + 1);
  if (x > 0) maxAllowed = Math.min(maxAllowed, getElev(heightmap, x - 1, y) + 1);
  if (x + 1 < width) maxAllowed = Math.min(maxAllowed, getElev(heightmap, x + 1, y) + 1);
  if (maxAllowed < elev) {
    writeGridHeight(grids, x, y, maxAllowed);
    return true;
  }

  const hasN = getElev(heightmap, x, y - 1) >= elev;
  const hasS = getElev(heightmap, x, y + 1) >= elev;
  const hasW = getElev(heightmap, x - 1, y) >= elev;
  const hasE = getElev(heightmap, x + 1, y) >= elev;
  const hasNW = getElev(heightmap, x - 1, y - 1) >= elev;
  const hasNE = getElev(heightmap, x + 1, y - 1) >= elev;
  const hasSE = getElev(heightmap, x + 1, y + 1) >= elev;
  const hasSW = getElev(heightmap, x - 1, y + 1) >= elev;

  const isHorizRidge = !hasN && !hasS && (hasW || hasE);
  const isVertRidge = !hasW && !hasE && (hasN || hasS);
  const isSingleColSouthJag =
    (!hasW && !hasS && hasE && hasSE) || (!hasE && !hasS && hasW && hasSW);
  const isSingleRowSouthJag =
    (!hasW && !hasS && hasN && hasNW) || (!hasE && !hasS && hasN && hasNE);

  if (isHorizRidge || isVertRidge || isSingleColSouthJag || isSingleRowSouthJag) {
    if (
      policy === 'fill' &&
      tryFillMountainDefect(
        grids,
        x,
        y,
        elev,
        {
          hasN,
          hasS,
          hasW,
          hasE,
          isHorizRidge,
          isVertRidge,
          isSingleColSouthJag,
          isSingleRowSouthJag
        },
        pendingPromotions
      )
    ) {
      return true;
    }
    writeGridHeight(grids, x, y, elev - 1);
    erodeTrailingRidgeTipIfIsolated(grids, x, y, elev, {
      isHorizRidge,
      isVertRidge,
      hasW,
      hasE,
      hasN,
      hasS
    });
    return true;
  }

  if (!hasN && !hasS && !hasW && !hasE) {
    if (policy === 'fill' && tryFillIsolatedMountainPeak2x2(grids, x, y, elev, pendingPromotions)) {
      return true;
    }
    writeGridHeight(grids, x, y, elev - 1);
    return true;
  }

  return false;
}

function isOnBoundsBorder(x: number, y: number, bounds: DirtyTileBounds): boolean {
  return x === bounds.minX || x === bounds.maxX || y === bounds.minY || y === bounds.maxY;
}

function healMountainPassInBounds(
  grids: MutableContinentGrids,
  activeBounds: DirtyTileBounds,
  policy: MountainHealPolicy,
  allowedMask?: ReadonlySet<string>
): { changed: boolean; touchedEdge: boolean } {
  let changed = resolveMountainDiagonalPinches(grids, activeBounds, policy);
  let touchedEdge = false;
  const pendingPromotions: MountainFillPromotion[] | undefined = policy === 'fill' ? [] : undefined;

  for (let y = activeBounds.minY; y <= activeBounds.maxY; y++) {
    for (let x = activeBounds.minX; x <= activeBounds.maxX; x++) {
      if (allowedMask && !allowedMask.has(`${x}_${y}`)) continue;
      if (healSingleMountainCell(grids, x, y, policy, pendingPromotions)) {
        changed = true;
        touchedEdge = touchedEdge || isOnBoundsBorder(x, y, activeBounds);
      }
    }
  }

  if (pendingPromotions && pendingPromotions.length > 0) {
    for (const p of pendingPromotions) {
      writeGridHeight(grids, p.x, p.y, p.elev);
      writeGridPalette(grids, p.x, p.y, p.pal);
    }
  }
  return { changed, touchedEdge };
}

function healMountainDomainInBounds(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  policy: MountainHealPolicy,
  allowedMask?: ReadonlySet<string>
): void {
  let activeBounds = clampDirtyBounds(bounds, grids.width, grids.height);
  const totalPasses = getBoundsPassLimit(activeBounds, 2);

  for (let pass = 0; pass < totalPasses; pass++) {
    const activePolicy: MountainHealPolicy = policy === 'fill' && pass > 0 ? 'erode' : policy;
    const res = healMountainPassInBounds(
      grids,
      activeBounds,
      activePolicy,
      pass === 0 ? allowedMask : undefined
    );
    if (!res.changed) break;
    if (res.touchedEdge) {
      activeBounds = expandDirtyBounds(activeBounds, 2, grids.width, grids.height);
    }
  }
}

function isSameMacroAt(
  grids: MutableContinentGrids,
  nx: number,
  ny: number,
  targetBiome: MacroBiome
): boolean {
  if (nx < 0 || nx >= grids.width || ny < 0 || ny >= grids.height) return true;
  return grids.terrainMatrix[ny]?.[nx] === 'grass' && grids.biomeGrid[ny]?.[nx] === targetBiome;
}

function pickNeighborGrassBiome(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  currentBiome: MacroBiome
): MacroBiome {
  for (const { dx, dy } of EIGHT_NEIGHBOR_OFFSETS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= grids.width || ny < 0 || ny >= grids.height) continue;
    if (grids.terrainMatrix[ny]?.[nx] !== 'grass') continue;
    const nb = grids.biomeGrid[ny]?.[nx];
    if (nb && nb !== currentBiome && !BRUSHED_BIOME_SET.has(nb)) {
      return nb;
    }
  }
  return 'temperate_meadow';
}

function healSingleMacroBiomeCell(grids: MutableContinentGrids, x: number, y: number): boolean {
  if (grids.buildingMask[y]?.[x] || grids.terrainMatrix[y]?.[x] !== 'grass') return false;
  const biome = grids.biomeGrid[y]?.[x];
  if (!biome || !BRUSHED_BIOME_SET.has(biome)) return false;

  const sameN = isSameMacroAt(grids, x, y - 1, biome);
  const sameS = isSameMacroAt(grids, x, y + 1, biome);
  const sameW = isSameMacroAt(grids, x - 1, y, biome);
  const sameE = isSameMacroAt(grids, x + 1, y, biome);

  const isSliver = (!sameN && !sameS) || (!sameW && !sameE);
  const sameNW = isSameMacroAt(grids, x - 1, y - 1, biome);
  const sameNE = isSameMacroAt(grids, x + 1, y - 1, biome);
  const sameSW = isSameMacroAt(grids, x - 1, y + 1, biome);
  const sameSE = isSameMacroAt(grids, x + 1, y + 1, biome);

  const sePinch = x + 1 < grids.width && y + 1 < grids.height && sameSE && !sameE && !sameS;
  const swPinch = x > 0 && y + 1 < grids.height && sameSW && !sameW && !sameS;
  const droppedInner = hasDropped2DInnerCorner({
    sameN,
    sameS,
    sameW,
    sameE,
    sameNW,
    sameNE,
    sameSW,
    sameSE
  });

  if (isSliver || sePinch || swPinch || droppedInner) {
    writeGridBiome(grids, x, y, pickNeighborGrassBiome(grids, x, y, biome));
    return true;
  }
  return false;
}

function healMacroBiomePassInBounds(
  grids: MutableContinentGrids,
  activeBounds: DirtyTileBounds,
  allowedMask?: ReadonlySet<string>
): { changed: boolean; touchedEdge: boolean } {
  let changed = false;
  let touchedEdge = false;

  for (let y = activeBounds.minY; y <= activeBounds.maxY; y++) {
    for (let x = activeBounds.minX; x <= activeBounds.maxX; x++) {
      if (allowedMask && !allowedMask.has(`${x}_${y}`)) continue;
      if (healSingleMacroBiomeCell(grids, x, y)) {
        changed = true;
        touchedEdge = touchedEdge || isOnBoundsBorder(x, y, activeBounds);
      }
    }
  }
  return { changed, touchedEdge };
}

function canWriteAutoMacroBiomeAt(grids: MutableContinentGrids, x: number, y: number): boolean {
  if (x < 0 || x >= grids.width || y < 0 || y >= grids.height) return false;
  return !grids.buildingMask[y]?.[x] && grids.terrainMatrix[y]?.[x] === 'grass';
}

function widenProtectedMacroBiomeDots(grids: MutableContinentGrids, bounds: DirtyTileBounds): void {
  if (grids.protectedPaintKind !== 'macro_biome' || !grids.protectedCells) return;
  const additions: { x: number; y: number; biome: MacroBiome }[] = [];
  const quadrants: readonly { readonly dx: number; readonly dy: number }[] = [
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: -1 }
  ];

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (!grids.protectedCells.has(`${x}_${y}`) || !canWriteAutoMacroBiomeAt(grids, x, y)) {
        continue;
      }
      const biome = grids.biomeGrid[y]?.[x];
      if (!biome || !BRUSHED_BIOME_SET.has(biome)) continue;

      const sameN = isSameMacroAt(grids, x, y - 1, biome);
      const sameS = isSameMacroAt(grids, x, y + 1, biome);
      const sameW = isSameMacroAt(grids, x - 1, y, biome);
      const sameE = isSameMacroAt(grids, x + 1, y, biome);

      if ((sameW || sameE) && !sameN && !sameS) {
        if (canWriteAutoMacroBiomeAt(grids, x, y + 1)) additions.push({ x, y: y + 1, biome });
        else if (canWriteAutoMacroBiomeAt(grids, x, y - 1)) additions.push({ x, y: y - 1, biome });
      } else if ((sameN || sameS) && !sameW && !sameE) {
        if (canWriteAutoMacroBiomeAt(grids, x + 1, y)) additions.push({ x: x + 1, y, biome });
        else if (canWriteAutoMacroBiomeAt(grids, x - 1, y)) additions.push({ x: x - 1, y, biome });
      } else if (!sameN && !sameS && !sameW && !sameE) {
        const chosen = quadrants.find(
          ({ dx, dy }) =>
            canWriteAutoMacroBiomeAt(grids, x + dx, y) &&
            canWriteAutoMacroBiomeAt(grids, x, y + dy) &&
            canWriteAutoMacroBiomeAt(grids, x + dx, y + dy)
        );
        if (chosen) {
          additions.push(
            { x: x + chosen.dx, y, biome },
            { x, y: y + chosen.dy, biome },
            { x: x + chosen.dx, y: y + chosen.dy, biome }
          );
        }
      }
    }
  }

  for (const pt of additions) {
    writeGridBiome(grids, pt.x, pt.y, pt.biome);
  }
}

function healMacroBiomeDomainInBounds(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  allowedMask?: ReadonlySet<string>
): void {
  let activeBounds = clampDirtyBounds(bounds, grids.width, grids.height);
  if (grids.protectedPaintKind === 'macro_biome' && !allowedMask) {
    widenProtectedMacroBiomeDots(grids, activeBounds);
    activeBounds = getCurrentDomainWorkBounds(grids, activeBounds);
  }
  const maxPasses = getBoundsPassLimit(activeBounds, 2);

  for (let pass = 0; pass < maxPasses; pass++) {
    const res = healMacroBiomePassInBounds(
      grids,
      activeBounds,
      pass === 0 ? allowedMask : undefined
    );
    if (!res.changed) break;
    if (res.touchedEdge) {
      activeBounds = expandDirtyBounds(activeBounds, 2, grids.width, grids.height);
    }
  }
}

export function filterValidMountainStairs(
  stairs: readonly MountainStairLocation[] | undefined,
  grids: Pick<
    MutableContinentGrids,
    'width' | 'height' | 'heightmap' | 'terrainMatrix' | 'palette' | 'paletteMatrix'
  >
): MountainStairLocation[] {
  if (!stairs || stairs.length === 0) return [];

  const valid: MountainStairLocation[] = [];
  const occupiedTop = new Set<string>();

  for (const st of stairs) {
    if (st.x < 0 || st.x + 1 >= grids.width || st.y < 0 || st.y + 1 >= grids.height) continue;
    const keyL = `${st.x}_${st.y}`;
    const keyR = `${st.x + 1}_${st.y}`;
    if (occupiedTop.has(keyL) || occupiedTop.has(keyR)) continue;

    const palL = grids.paletteMatrix?.[st.y]?.[st.x] ?? grids.palette;
    const palR = grids.paletteMatrix?.[st.y]?.[st.x + 1] ?? grids.palette;
    const cellL = resolveMountainAutotileCell(grids.heightmap, st.x, st.y, palL, 'rock');
    const cellR = resolveMountainAutotileCell(grids.heightmap, st.x + 1, st.y, palR, 'rock');

    if (cellL.role !== 'edge_south_top' || cellR.role !== 'edge_south_top') continue;
    if (cellL.elevation !== cellR.elevation || cellL.elevation <= 0) continue;

    const southElevL = grids.heightmap[st.y + 1]?.[st.x] ?? 0;
    const southElevR = grids.heightmap[st.y + 1]?.[st.x + 1] ?? 0;
    const southTerrainL = grids.terrainMatrix[st.y + 1]?.[st.x];
    const southTerrainR = grids.terrainMatrix[st.y + 1]?.[st.x + 1];

    if (
      cellL.elevation - southElevL === 1 &&
      cellR.elevation - southElevR === 1 &&
      southTerrainL === 'grass' &&
      southTerrainR === 'grass'
    ) {
      valid.push(st);
      occupiedTop.add(keyL);
      occupiedTop.add(keyR);
    }
  }
  return valid;
}

function buildStairBottomSet(stairs: readonly MountainStairLocation[]): ReadonlySet<string> {
  const bottomSet = new Set<string>();
  for (const st of stairs) {
    bottomSet.add(`${st.x}_${st.y + 1}`);
    bottomSet.add(`${st.x + 1}_${st.y + 1}`);
  }
  return bottomSet;
}

function canPlaceDirtPathAt(
  grids: MutableContinentGrids,
  stairBottomSet: ReadonlySet<string>,
  x: number,
  y: number
): boolean {
  if (x < 0 || x >= grids.width || y < 0 || y >= grids.height) return false;
  if (grids.buildingMask[y]?.[x] || grids.bridgeGrid?.[y]?.[x]) return false;
  if (grids.terrainMatrix[y]?.[x] !== 'grass') return false;
  return !isBlockedPathElevationCell(grids.heightmap, stairBottomSet, x, y);
}

function isPathConnectedForHeal(grids: MutableContinentGrids, x: number, y: number): boolean {
  return isPathOrBridgeAt(
    grids.pathGrid,
    grids.bridgeGrid,
    grids.buildingMask,
    grids.width,
    grids.height,
    x,
    y
  );
}

function clearBlockedSubstratePaths(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  stairBottomSet: ReadonlySet<string>
): void {
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (grids.pathGrid[y]?.[x] && !canPlaceDirtPathAt(grids, stairBottomSet, x, y)) {
        writeGridPath(grids, x, y, false);
        writeGridManualPath(grids, x, y, false);
      }
    }
  }
}

interface PathAdditionPoint {
  readonly x: number;
  readonly y: number;
  readonly manual: boolean;
}

function canExpandPathFromCell(grids: MutableContinentGrids, x: number, y: number): boolean {
  if (!grids.manualPathGrid?.[y]?.[x]) return true;
  return grids.protectedPaintKind === 'path' && Boolean(grids.protectedCells?.has(`${x}_${y}`));
}

function canWriteAutoPathAt(
  grids: MutableContinentGrids,
  stairBottomSet: ReadonlySet<string>,
  x: number,
  y: number
): boolean {
  if (!canPlaceDirtPathAt(grids, stairBottomSet, x, y)) return false;
  if (grids.protectedPaintKind !== 'path' && grids.protectedCells?.has(`${x}_${y}`)) {
    return false;
  }
  return true;
}

function widenSinglePathCellAt(
  grids: MutableContinentGrids,
  stairBottomSet: ReadonlySet<string>,
  x: number,
  y: number,
  additions: PathAdditionPoint[]
): void {
  const manual = Boolean(grids.manualPathGrid?.[y]?.[x]);
  const pN = isPathConnectedForHeal(grids, x, y - 1);
  const pS = isPathConnectedForHeal(grids, x, y + 1);
  const pW = isPathConnectedForHeal(grids, x - 1, y);
  const pE = isPathConnectedForHeal(grids, x + 1, y);

  if ((pW || pE) && !pN && !pS) {
    if (canWriteAutoPathAt(grids, stairBottomSet, x, y + 1)) {
      additions.push({ x, y: y + 1, manual });
    } else if (canWriteAutoPathAt(grids, stairBottomSet, x, y - 1)) {
      additions.push({ x, y: y - 1, manual });
    }
  } else if ((pN || pS) && !pW && !pE) {
    if (canWriteAutoPathAt(grids, stairBottomSet, x + 1, y)) {
      additions.push({ x: x + 1, y, manual });
    } else if (canWriteAutoPathAt(grids, stairBottomSet, x - 1, y)) {
      additions.push({ x: x - 1, y, manual });
    }
  }
}

function tryAppendIsolatedPath2x2(
  grids: MutableContinentGrids,
  stairBottomSet: ReadonlySet<string>,
  x: number,
  y: number,
  additions: PathAdditionPoint[]
): boolean {
  const quadrants: readonly { readonly dx: number; readonly dy: number }[] = [
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: -1 }
  ];
  for (const { dx, dy } of quadrants) {
    if (
      canWriteAutoPathAt(grids, stairBottomSet, x + dx, y) &&
      canWriteAutoPathAt(grids, stairBottomSet, x, y + dy) &&
      canWriteAutoPathAt(grids, stairBottomSet, x + dx, y + dy)
    ) {
      additions.push(
        { x: x + dx, y, manual: true },
        { x, y: y + dy, manual: true },
        { x: x + dx, y: y + dy, manual: true }
      );
      return true;
    }
  }
  return false;
}

function applyPathAdditionPoints(
  grids: MutableContinentGrids,
  additions: readonly PathAdditionPoint[]
): boolean {
  let changed = false;
  for (const pt of additions) {
    if (!grids.pathGrid[pt.y]?.[pt.x]) changed = true;
    writeGridPath(grids, pt.x, pt.y, true);
    if (pt.manual) {
      writeGridManualPath(grids, pt.x, pt.y, true);
    }
  }
  return changed;
}

function widenIsolatedProtectedPathDots(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  stairBottomSet: ReadonlySet<string>
): void {
  if (grids.protectedPaintKind !== 'path') return;
  const additions: PathAdditionPoint[] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (!grids.pathGrid[y]?.[x] || !grids.protectedCells?.has(`${x}_${y}`)) continue;
      if (!canPlaceDirtPathAt(grids, stairBottomSet, x, y)) continue;
      const hasNeighbor =
        isPathConnectedForHeal(grids, x, y - 1) ||
        isPathConnectedForHeal(grids, x, y + 1) ||
        isPathConnectedForHeal(grids, x - 1, y) ||
        isPathConnectedForHeal(grids, x + 1, y);
      if (!hasNeighbor) {
        tryAppendIsolatedPath2x2(grids, stairBottomSet, x, y, additions);
      }
    }
  }
  applyPathAdditionPoints(grids, additions);
}

function thickenSinglePassPaths(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  stairBottomSet: ReadonlySet<string>
): boolean {
  const additions: PathAdditionPoint[] = [];

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (!grids.pathGrid[y]?.[x] || !canPlaceDirtPathAt(grids, stairBottomSet, x, y)) continue;
      if (!canExpandPathFromCell(grids, x, y)) continue;
      widenSinglePathCellAt(grids, stairBottomSet, x, y, additions);
    }
  }

  return applyPathAdditionPoints(grids, additions);
}

function collectElbowNotchAdditionsAt(
  grids: MutableContinentGrids,
  stairBottomSet: ReadonlySet<string>,
  x: number,
  y: number,
  additions: PathAdditionPoint[]
): void {
  if (!grids.pathGrid[y]?.[x] || !canPlaceDirtPathAt(grids, stairBottomSet, x, y)) return;
  if (!canExpandPathFromCell(grids, x, y)) return;

  const manual = Boolean(grids.manualPathGrid?.[y]?.[x]);
  const pN = isPathConnectedForHeal(grids, x, y - 1);
  const pS = isPathConnectedForHeal(grids, x, y + 1);
  const pW = isPathConnectedForHeal(grids, x - 1, y);
  const pE = isPathConnectedForHeal(grids, x + 1, y);
  const pNW = isPathConnectedForHeal(grids, x - 1, y - 1);
  const pNE = isPathConnectedForHeal(grids, x + 1, y - 1);
  const pSW = isPathConnectedForHeal(grids, x - 1, y + 1);
  const pSE = isPathConnectedForHeal(grids, x + 1, y + 1);

  if (x + 1 < grids.width && y + 1 < grids.height && pSE && !pE && !pS) {
    if (canWriteAutoPathAt(grids, stairBottomSet, x + 1, y)) {
      additions.push({ x: x + 1, y, manual });
    } else if (canWriteAutoPathAt(grids, stairBottomSet, x, y + 1)) {
      additions.push({ x, y: y + 1, manual });
    }
  }
  if (x > 0 && y + 1 < grids.height && pSW && !pW && !pS) {
    if (canWriteAutoPathAt(grids, stairBottomSet, x - 1, y)) {
      additions.push({ x: x - 1, y, manual });
    } else if (canWriteAutoPathAt(grids, stairBottomSet, x, y + 1)) {
      additions.push({ x, y: y + 1, manual });
    }
  }

  if (pN && pS && pW && pE) return;
  if (pN && pW && !pNW && canWriteAutoPathAt(grids, stairBottomSet, x - 1, y - 1)) {
    additions.push({ x: x - 1, y: y - 1, manual });
  }
  if (pN && pE && !pNE && canWriteAutoPathAt(grids, stairBottomSet, x + 1, y - 1)) {
    additions.push({ x: x + 1, y: y - 1, manual });
  }
  if (pS && pW && !pSW && canWriteAutoPathAt(grids, stairBottomSet, x - 1, y + 1)) {
    additions.push({ x: x - 1, y: y + 1, manual });
  }
  if (pS && pE && !pSE && canWriteAutoPathAt(grids, stairBottomSet, x + 1, y + 1)) {
    additions.push({ x: x + 1, y: y + 1, manual });
  }
}

function fillPathElbowNotchesOnce(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  stairBottomSet: ReadonlySet<string>
): boolean {
  const additions: PathAdditionPoint[] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      collectElbowNotchAdditionsAt(grids, stairBottomSet, x, y, additions);
    }
  }
  return applyPathAdditionPoints(grids, additions);
}

function shouldPruneSinglePathCell(
  grids: MutableContinentGrids,
  stairBottomSet: ReadonlySet<string>,
  x: number,
  y: number,
  includeCornerPinches: boolean
): boolean {
  if (!grids.pathGrid[y]?.[x]) return false;
  if (!canPlaceDirtPathAt(grids, stairBottomSet, x, y)) return true;

  const pN = isPathConnectedForHeal(grids, x, y - 1);
  const pS = isPathConnectedForHeal(grids, x, y + 1);
  const pW = isPathConnectedForHeal(grids, x - 1, y);
  const pE = isPathConnectedForHeal(grids, x + 1, y);

  if ((!pN && !pS) || (!pW && !pE)) return true;

  if (
    isMiniatureOrphanPathBlotch(
      {
        pathGrid: grids.pathGrid,
        manualPathGrid: grids.manualPathGrid,
        bridgeGrid: grids.bridgeGrid,
        buildingMask: grids.buildingMask,
        poiAnchorMask: grids.poiAnchorMask,
        width: grids.width,
        height: grids.height
      },
      x,
      y
    )
  ) {
    return true;
  }

  if (!includeCornerPinches) return false;

  const pNW = isPathConnectedForHeal(grids, x - 1, y - 1);
  const pNE = isPathConnectedForHeal(grids, x + 1, y - 1);
  const pSW = isPathConnectedForHeal(grids, x - 1, y + 1);
  const pSE = isPathConnectedForHeal(grids, x + 1, y + 1);

  const sePinch = x + 1 < grids.width && y + 1 < grids.height && pSE && !pE && !pS;
  const swPinch = x > 0 && y + 1 < grids.height && pSW && !pW && !pS;
  const pathDroppedInner = hasDropped2DInnerCorner({
    sameN: pN,
    sameS: pS,
    sameW: pW,
    sameE: pE,
    sameNW: pNW,
    sameNE: pNE,
    sameSW: pSW,
    sameSE: pSE
  });
  return sePinch || swPinch || pathDroppedInner;
}

function pruneInvalidPathCellsPass(
  grids: MutableContinentGrids,
  activeBounds: DirtyTileBounds,
  stairBottomSet: ReadonlySet<string>,
  includeCornerPinches: boolean,
  allowedMask?: ReadonlySet<string>
): { changed: boolean; touchedEdge: boolean } {
  const toPrune: { x: number; y: number }[] = [];
  let touchedEdge = false;

  for (let y = activeBounds.minY; y <= activeBounds.maxY; y++) {
    for (let x = activeBounds.minX; x <= activeBounds.maxX; x++) {
      if (allowedMask && !allowedMask.has(`${x}_${y}`)) continue;
      if (shouldPruneSinglePathCell(grids, stairBottomSet, x, y, includeCornerPinches)) {
        toPrune.push({ x, y });
        touchedEdge = touchedEdge || isOnBoundsBorder(x, y, activeBounds);
      }
    }
  }
  for (const pt of toPrune) {
    writeGridPath(grids, pt.x, pt.y, false);
    writeGridManualPath(grids, pt.x, pt.y, false);
  }
  return { changed: toPrune.length > 0, touchedEdge };
}

function prunePathSliversToFixpoint(
  grids: MutableContinentGrids,
  initialBounds: DirtyTileBounds,
  stairBottomSet: ReadonlySet<string>,
  initialMask?: ReadonlySet<string>
): DirtyTileBounds {
  let activeBounds = initialBounds;
  const maxPasses = getBoundsPassLimit(activeBounds, 2);
  for (let pass = 0; pass < maxPasses; pass++) {
    const res = pruneInvalidPathCellsPass(
      grids,
      activeBounds,
      stairBottomSet,
      false,
      pass === 0 ? initialMask : undefined
    );
    if (!res.changed) break;
    if (res.touchedEdge) {
      activeBounds = expandDirtyBounds(activeBounds, 2, grids.width, grids.height);
    }
  }
  return activeBounds;
}

function healPathDomainInBounds(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  allowedMask?: ReadonlySet<string>
): void {
  const validStairs = filterValidMountainStairs(grids.baseStairs, grids);
  const stairBottomSet = buildStairBottomSet(validStairs);

  let activeBounds = expandDirtyBounds(bounds, 2, grids.width, grids.height);
  clearBlockedSubstratePaths(grids, activeBounds, stairBottomSet);
  for (let pass = 0; pass < 2; pass++) {
    if (!thickenSinglePassPaths(grids, bounds, stairBottomSet)) break;
  }
  widenIsolatedProtectedPathDots(grids, bounds, stairBottomSet);
  for (let pass = 0; pass < 2; pass++) {
    if (!fillPathElbowNotchesOnce(grids, activeBounds, stairBottomSet)) break;
  }

  const maxPathPasses = getBoundsPassLimit(activeBounds, 2);
  for (let pass = 0; pass < maxPathPasses; pass++) {
    activeBounds = prunePathSliversToFixpoint(
      grids,
      activeBounds,
      stairBottomSet,
      pass === 0 ? allowedMask : undefined
    );
    const cornerRes = pruneInvalidPathCellsPass(
      grids,
      activeBounds,
      stairBottomSet,
      true,
      pass === 0 ? allowedMask : undefined
    );
    if (!cornerRes.changed) break;
    if (cornerRes.touchedEdge) {
      activeBounds = expandDirtyBounds(activeBounds, 2, grids.width, grids.height);
    }
  }
}

function createEditableBridgeLookup(grids: MutableContinentGrids): BridgeGridLookup {
  return {
    isBridge: (bx, by) =>
      bx >= 0 &&
      bx < grids.width &&
      by >= 0 &&
      by < grids.height &&
      Boolean(grids.bridgeGrid?.[by]?.[bx]),
    isWater: (wx, wy) =>
      wx < 0 ||
      wx >= grids.width ||
      wy < 0 ||
      wy >= grids.height ||
      isWaterTerrain(grids.terrainMatrix[wy]?.[wx])
  };
}

function canWriteAutoBridgeAt(grids: MutableContinentGrids, x: number, y: number): boolean {
  if (x < 0 || x >= grids.width || y < 0 || y >= grids.height) return false;
  if (grids.buildingMask[y]?.[x]) return false;
  return isWaterTerrain(grids.terrainMatrix[y]?.[x]);
}

function tryAppendIsolatedBridge2x2(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  additions: { x: number; y: number }[]
): boolean {
  const quadrants: readonly { readonly dx: number; readonly dy: number }[] = [
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: -1 }
  ];
  for (const { dx, dy } of quadrants) {
    if (
      canWriteAutoBridgeAt(grids, x + dx, y) &&
      canWriteAutoBridgeAt(grids, x, y + dy) &&
      canWriteAutoBridgeAt(grids, x + dx, y + dy)
    ) {
      additions.push({ x: x + dx, y }, { x, y: y + dy }, { x: x + dx, y: y + dy });
      return true;
    }
  }
  return false;
}

function widenProtectedBridgeCellAt(
  grids: MutableContinentGrids,
  x: number,
  y: number,
  additions: { x: number; y: number }[]
): void {
  const bridgeGrid = grids.bridgeGrid!;
  const bN = y > 0 && Boolean(bridgeGrid[y - 1]?.[x]);
  const bS = y + 1 < grids.height && Boolean(bridgeGrid[y + 1]?.[x]);
  const bW = x > 0 && Boolean(bridgeGrid[y]?.[x - 1]);
  const bE = x + 1 < grids.width && Boolean(bridgeGrid[y]?.[x + 1]);

  if ((bW || bE) && !bN && !bS) {
    const oy = canWriteAutoBridgeAt(grids, x, y + 1)
      ? 1
      : canWriteAutoBridgeAt(grids, x, y - 1)
        ? -1
        : 0;
    if (oy !== 0) {
      additions.push({ x, y: y + oy });
      if (bW && !bridgeGrid[y + oy]?.[x - 1] && canWriteAutoBridgeAt(grids, x - 1, y + oy)) {
        additions.push({ x: x - 1, y: y + oy });
      } else if (bE && !bridgeGrid[y + oy]?.[x + 1] && canWriteAutoBridgeAt(grids, x + 1, y + oy)) {
        additions.push({ x: x + 1, y: y + oy });
      }
    }
  } else if ((bN || bS) && !bW && !bE) {
    const ox = canWriteAutoBridgeAt(grids, x + 1, y)
      ? 1
      : canWriteAutoBridgeAt(grids, x - 1, y)
        ? -1
        : 0;
    if (ox !== 0) {
      additions.push({ x: x + ox, y });
      if (bN && !bridgeGrid[y - 1]?.[x + ox] && canWriteAutoBridgeAt(grids, x + ox, y - 1)) {
        additions.push({ x: x + ox, y: y - 1 });
      } else if (bS && !bridgeGrid[y + 1]?.[x + ox] && canWriteAutoBridgeAt(grids, x + ox, y + 1)) {
        additions.push({ x: x + ox, y: y + 1 });
      }
    }
  } else if (!bN && !bS && !bW && !bE) {
    tryAppendIsolatedBridge2x2(grids, x, y, additions);
  }
}

function widenProtectedBridgesOnce(grids: MutableContinentGrids, bounds: DirtyTileBounds): boolean {
  if (!grids.bridgeGrid || grids.protectedPaintKind !== 'bridge') return false;
  const additions: { x: number; y: number }[] = [];

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (!grids.bridgeGrid[y]?.[x]) continue;
      if (grids.protectedCells && !grids.protectedCells.has(`${x}_${y}`)) continue;
      if (!canWriteAutoBridgeAt(grids, x, y)) continue;
      widenProtectedBridgeCellAt(grids, x, y, additions);
    }
  }

  for (const pt of additions) {
    writeGridBridge(grids, pt.x, pt.y, true);
  }
  return additions.length > 0;
}

function resolve2x2BridgePinchAt(grids: MutableContinentGrids, x: number, y: number): boolean {
  const bridgeGrid = grids.bridgeGrid;
  if (!bridgeGrid) return false;
  const matrix = grids.terrainMatrix;

  const tl = Boolean(bridgeGrid[y]?.[x]);
  const tr = Boolean(bridgeGrid[y]?.[x + 1]);
  const bl = Boolean(bridgeGrid[y + 1]?.[x]);
  const br = Boolean(bridgeGrid[y + 1]?.[x + 1]);

  if (
    tl &&
    br &&
    !tr &&
    !bl &&
    (isWaterTerrain(matrix[y]?.[x]) || isWaterTerrain(matrix[y + 1]?.[x + 1]))
  ) {
    if (grids.protectedPaintKind === 'bridge') {
      if (canWriteAutoBridgeAt(grids, x + 1, y)) {
        writeGridBridge(grids, x + 1, y, true);
        return true;
      }
      if (canWriteAutoBridgeAt(grids, x, y + 1)) {
        writeGridBridge(grids, x, y + 1, true);
        return true;
      }
    }
    if (!grids.buildingMask[y]?.[x]) {
      writeGridBridge(grids, x, y, false);
      return true;
    }
    if (!grids.buildingMask[y + 1]?.[x + 1]) {
      writeGridBridge(grids, x + 1, y + 1, false);
      return true;
    }
  }

  if (
    tr &&
    bl &&
    !tl &&
    !br &&
    (isWaterTerrain(matrix[y]?.[x + 1]) || isWaterTerrain(matrix[y + 1]?.[x]))
  ) {
    if (grids.protectedPaintKind === 'bridge') {
      if (canWriteAutoBridgeAt(grids, x, y)) {
        writeGridBridge(grids, x, y, true);
        return true;
      }
      if (canWriteAutoBridgeAt(grids, x + 1, y + 1)) {
        writeGridBridge(grids, x + 1, y + 1, true);
        return true;
      }
    }
    if (!grids.buildingMask[y]?.[x + 1]) {
      writeGridBridge(grids, x + 1, y, false);
      return true;
    }
    if (!grids.buildingMask[y + 1]?.[x]) {
      writeGridBridge(grids, x, y + 1, false);
      return true;
    }
  }

  return false;
}

function resolveBridgeDiagonalPinchesInBounds(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  allowedMask?: ReadonlySet<string>
): boolean {
  return resolve2x2DiagonalPinchesInBounds(grids, bounds, resolve2x2BridgePinchAt, allowedMask);
}

function shouldPruneSingleBridgeCell(
  grids: MutableContinentGrids,
  lookup: BridgeGridLookup,
  x: number,
  y: number
): boolean {
  const bridgeGrid = grids.bridgeGrid;
  if (!bridgeGrid?.[y]?.[x] || grids.buildingMask[y]?.[x]) return false;

  const bN = y > 0 && Boolean(bridgeGrid[y - 1]?.[x]);
  const bS = y + 1 < grids.height && Boolean(bridgeGrid[y + 1]?.[x]);
  const bW = x > 0 && Boolean(bridgeGrid[y]?.[x - 1]);
  const bE = x + 1 < grids.width && Boolean(bridgeGrid[y]?.[x + 1]);

  if (!isWaterTerrain(grids.terrainMatrix[y]?.[x])) {
    const hasWaterBridgeNeighbor =
      (bN && isWaterTerrain(grids.terrainMatrix[y - 1]?.[x])) ||
      (bS && isWaterTerrain(grids.terrainMatrix[y + 1]?.[x])) ||
      (bW && isWaterTerrain(grids.terrainMatrix[y]?.[x - 1])) ||
      (bE && isWaterTerrain(grids.terrainMatrix[y]?.[x + 1]));
    return !hasWaterBridgeNeighbor;
  }

  if ((!bN && !bS) || (!bW && !bE)) {
    return !isValidFishingBalcony(lookup, x, y);
  }
  return false;
}

function pruneInvalidBridgeCellsPass(
  grids: MutableContinentGrids,
  activeBounds: DirtyTileBounds,
  lookup: BridgeGridLookup,
  allowedMask?: ReadonlySet<string>
): { changed: boolean; touchedEdge: boolean } {
  const toPrune: { x: number; y: number }[] = [];
  let touchedEdge = false;

  for (let y = activeBounds.minY; y <= activeBounds.maxY; y++) {
    for (let x = activeBounds.minX; x <= activeBounds.maxX; x++) {
      if (allowedMask && !allowedMask.has(`${x}_${y}`)) continue;
      if (shouldPruneSingleBridgeCell(grids, lookup, x, y)) {
        toPrune.push({ x, y });
        touchedEdge = touchedEdge || isOnBoundsBorder(x, y, activeBounds);
      }
    }
  }
  for (const pt of toPrune) {
    writeGridBridge(grids, pt.x, pt.y, false);
  }
  return { changed: toPrune.length > 0, touchedEdge };
}

function healBridgeDomainInBounds(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  allowedMask?: ReadonlySet<string>
): void {
  if (!grids.bridgeGrid) return;

  let activeBounds = expandDirtyBounds(bounds, 2, grids.width, grids.height);
  if (grids.protectedPaintKind === 'bridge' && !allowedMask) {
    for (let pass = 0; pass < 2; pass++) {
      if (!widenProtectedBridgesOnce(grids, bounds)) break;
    }
  }

  const lookup = createEditableBridgeLookup(grids);
  const maxBridgePasses = getBoundsPassLimit(activeBounds, 2);
  for (let pass = 0; pass < maxBridgePasses; pass++) {
    const stepMask = pass === 0 ? allowedMask : undefined;
    const diagChanged = resolveBridgeDiagonalPinchesInBounds(grids, activeBounds, stepMask);
    const pruneRes = pruneInvalidBridgeCellsPass(grids, activeBounds, lookup, stepMask);
    if (!diagChanged && !pruneRes.changed) break;
    if (diagChanged || pruneRes.touchedEdge) {
      activeBounds = expandDirtyBounds(activeBounds, 2, grids.width, grids.height);
    }
  }
}

interface AssembleCellDetailInput {
  readonly x: number;
  readonly y: number;
  readonly terrain: WaterTerrainKind;
  readonly elev: number;
  readonly macroBiome: MacroBiome | undefined;
  readonly mountainPalette: MountainPalette;
  readonly waterPrimaryTile: string | undefined;
  readonly waterOverlayTiles?: readonly string[];
  readonly waterRole: ContinentCellDetails['waterRole'];
  readonly mtnCell: ResolvedMountainCell | null | undefined;
  readonly northMtn: ResolvedMountainCell | null | undefined;
  readonly isRiverChannel: boolean;
}

function assembleCellDetail(input: AssembleCellDetailInput): ContinentCellDetails {
  const {
    x,
    y,
    terrain,
    elev,
    macroBiome,
    mountainPalette,
    waterPrimaryTile,
    waterOverlayTiles,
    waterRole,
    mtnCell,
    northMtn,
    isRiverChannel
  } = input;
  const layerStack: string[] = [];
  let isWalkable = terrain !== 'water' && terrain !== 'water_deep';
  let isStair = false;
  let mtnRole: MountainRole | undefined;

  if (waterPrimaryTile) layerStack.push(waterPrimaryTile);
  if (waterOverlayTiles && waterOverlayTiles.length > 0) {
    layerStack.push(...waterOverlayTiles);
  }

  if (mtnCell) {
    mtnRole = mtnCell.role;
    isStair = mtnCell.role === 'stairs_l' || mtnCell.role === 'stairs_r';
    if (elev > 0) {
      layerStack.push(mtnCell.primaryTile);
      if (mtnCell.overlayTiles && mtnCell.overlayTiles.length > 0) {
        layerStack.push(...mtnCell.overlayTiles);
      }
    }
    if (
      !isStair &&
      (mtnCell.role === 'peak_isolated' ||
        mtnCell.role.startsWith('edge_') ||
        mtnCell.role.startsWith('corner_outer_'))
    ) {
      isWalkable = false;
    }
    if (isStair) isWalkable = true;
  }

  if (northMtn?.projectedFoot && !isRiverChannel) {
    layerStack.push(northMtn.projectedFoot.tile);
    if (northMtn.projectedFoot.occupiesCell && !isWaterTerrain(terrain)) {
      isWalkable = false;
    } else if (!northMtn.projectedFoot.occupiesCell) {
      isWalkable = true;
      isStair = true;
    }
  }

  return {
    x,
    y,
    terrain,
    elevation: elev,
    macroBiome,
    mountainPalette,
    waterRole,
    mountainRole: mtnRole,
    isStair,
    isWalkable,
    layerStack
  };
}

function updateBiomeStatsFromCopiedRows(
  baseStats: Readonly<Record<MacroBiome, number>>,
  baseGrid: readonly (readonly MacroBiome[])[],
  nextGrid: readonly (readonly MacroBiome[])[],
  copiedRows: ReadonlySet<number>
): Record<MacroBiome, number> {
  const stats: Record<MacroBiome, number> = { ...baseStats };
  for (const y of copiedRows) {
    const oldRow = baseGrid[y];
    const newRow = nextGrid[y];
    if (!oldRow || !newRow) continue;
    for (let x = 0; x < newRow.length; x++) {
      const oldB = oldRow[x];
      const newB = newRow[x];
      if (oldB && newB && oldB !== newB) {
        stats[oldB] = Math.max(0, (stats[oldB] ?? 0) - 1);
        stats[newB] = (stats[newB] ?? 0) + 1;
      }
    }
  }
  return stats;
}

export interface RebuildContinentInBoundsOptions {
  readonly pois?: readonly POINode[];
  readonly wilderness?: WildernessLayerResult | null;
  readonly forceWaterRebuild?: boolean;
  readonly forceMountainRebuild?: boolean;
  readonly forceBiomeBufferRebuild?: boolean;
  readonly skipWildernessPrune?: boolean;
  readonly skipTransitionBuffer?: boolean;
  readonly skipStairValidation?: boolean;
}

/**
 * Incrementally rebuilds water, mountain, macro-biome autotiles, containment buffer,
 * cell details, and wilderness layers strictly around `bounds` via row Copy-on-Write.
 */
export function rebuildContinentInBounds(
  baseContinent: ContinentMapResult,
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  options?: RebuildContinentInBoundsOptions
): {
  readonly continent: ContinentMapResult;
  readonly wilderness: WildernessLayerResult | null;
  readonly prunedTreeCount: number;
  readonly prunedPropCount: number;
} {
  const { width, height, palette, paletteMatrix } = grids;
  const rebuildBounds = clampDirtyBounds(bounds, width, height);

  const baseStairList = grids.baseStairs ?? baseContinent.placedStairs;
  const validStairs = options?.skipStairValidation
    ? baseStairList
    : grids.mutatedHeight || grids.mutatedTerrain || options?.forceMountainRebuild
      ? filterValidMountainStairs(baseStairList, grids)
      : baseContinent.placedStairs;
  const stairsChanged = (validStairs?.length ?? 0) !== (baseStairList?.length ?? 0);

  const resolvedWater =
    grids.mutatedTerrain || grids.mutatedBridge || options?.forceWaterRebuild
      ? resolveWaterCoastInBounds(
          baseContinent.resolvedWater,
          grids.terrainMatrix,
          rebuildBounds,
          grids.bridgeGrid
        )
      : baseContinent.resolvedWater;

  const resolvedMountain =
    grids.mutatedHeight || grids.mutatedPalette || stairsChanged || options?.forceMountainRebuild
      ? resolveMountainMapInBounds(baseContinent.resolvedMountain, grids.heightmap, rebuildBounds, {
          palette,
          paletteMatrix,
          stairs: validStairs
        })
      : baseContinent.resolvedMountain;

  const bufferBounds = expandDirtyBounds(rebuildBounds, BIOME_BUFFER_MARGIN_TILES, width, height);
  const shouldUpdateBuffer =
    !options?.skipTransitionBuffer &&
    (grids.mutatedBiome ||
      grids.mutatedTerrain ||
      grids.mutatedHeight ||
      options?.forceBiomeBufferRebuild);

  const baseTransitionBuffer =
    baseContinent.macroBiomes?.transitionBufferGrid ??
    Array.from({ length: height }, () => Array<boolean>(width).fill(false));

  const nextTransitionBuffer = shouldUpdateBuffer
    ? updateContainmentBufferInBounds(
        baseTransitionBuffer,
        grids.biomeGrid,
        grids.terrainMatrix,
        bufferBounds,
        grids.heightmap
      )
    : baseTransitionBuffer;

  const nextStats = baseContinent.macroBiomes
    ? updateBiomeStatsFromCopiedRows(
        baseContinent.macroBiomes.stats,
        baseContinent.macroBiomes.biomeGrid,
        grids.biomeGrid,
        grids.copiedBiomeRows
      )
    : {
        temperate_meadow: width * height,
        mint_highland: 0,
        viridian_forest: 0,
        arid_desert: 0,
        volcanic_plateau: 0
      };

  const nextMacroBiomes: MacroBiomeResult = baseContinent.macroBiomes
    ? {
        ...baseContinent.macroBiomes,
        biomeGrid: grids.biomeGrid,
        transitionBufferGrid: nextTransitionBuffer,
        stats: nextStats
      }
    : {
        biomeGrid: grids.biomeGrid,
        transitionBufferGrid: nextTransitionBuffer,
        temperatureMap: new Float32Array(width * height),
        moistureMap: new Float32Array(width * height),
        stats: nextStats
      };

  const resolvedMacroBiomes =
    grids.mutatedBiome || grids.mutatedTerrain || grids.mutatedHeight
      ? baseContinent.resolvedMacroBiomes
        ? resolveMacroBiomeAutotileInBounds(
            baseContinent.resolvedMacroBiomes,
            grids.biomeGrid,
            grids.terrainMatrix,
            rebuildBounds,
            grids.heightmap
          )
        : resolveMacroBiomeAutotile(grids.biomeGrid, grids.terrainMatrix, grids.heightmap)
      : baseContinent.resolvedMacroBiomes;

  const cellsBounds = clampDirtyBounds(
    {
      minX: rebuildBounds.minX,
      minY: rebuildBounds.minY,
      maxX: rebuildBounds.maxX,
      maxY: rebuildBounds.maxY + 1
    },
    width,
    height
  );

  const nextCells: ContinentCellDetails[][] = baseContinent.cells.map(
    (row) => row as ContinentCellDetails[]
  );
  for (let y = cellsBounds.minY; y <= cellsBounds.maxY; y++) {
    const cellRow = [...(nextCells[y] ?? [])];
    for (let x = cellsBounds.minX; x <= cellsBounds.maxX; x++) {
      const terrain = grids.terrainMatrix[y]![x]!;
      const elev = grids.heightmap[y]![x]!;
      const wCell = resolvedWater.cellDetails[y]?.[x];
      const mCell = resolvedMountain.cellDetails[y]?.[x];
      const northMtn = y > 0 ? resolvedMountain.cellDetails[y - 1]?.[x] : null;
      const isRiverChannel = Boolean(baseContinent.riverDrainage?.riverGrid?.[y]?.[x]);
      const cellPal = paletteMatrix?.[y]?.[x] ?? palette;

      cellRow[x] = assembleCellDetail({
        x,
        y,
        terrain,
        elev,
        macroBiome: grids.biomeGrid[y]?.[x],
        mountainPalette: cellPal,
        waterPrimaryTile: wCell?.primaryTile,
        waterOverlayTiles: wCell?.overlayTiles,
        waterRole: wCell?.role,
        mtnCell: mCell,
        northMtn,
        isRiverChannel
      });
    }
    nextCells[y] = cellRow;
  }

  const nextClusters =
    grids.mutatedPalette && grids.paletteMatrix
      ? baseContinent.geologicalClusters
        ? { ...baseContinent.geologicalClusters, paletteMatrix: grids.paletteMatrix }
        : {
            massifs: [],
            paletteMatrix: grids.paletteMatrix,
            massifIdMatrix: Array.from({ length: height }, () =>
              Array<string | null>(width).fill(null)
            )
          }
      : baseContinent.geologicalClusters;

  const nextContinent: ContinentMapResult = {
    ...baseContinent,
    terrainMatrix: grids.terrainMatrix,
    heightmap: grids.heightmap,
    macroBiomes: nextMacroBiomes,
    resolvedWater,
    resolvedMountain,
    resolvedMacroBiomes,
    geologicalClusters: nextClusters,
    cells: nextCells,
    placedStairs: validStairs
  };

  if (options?.skipWildernessPrune) {
    return {
      continent: nextContinent,
      wilderness: options.wilderness ?? null,
      prunedTreeCount: 0,
      prunedPropCount: 0
    };
  }

  const wildernessBounds = expandDirtyBounds(
    rebuildBounds,
    CANOPY_OVERHANG_BUFFER_TILES,
    width,
    height
  );
  const prunedWilderness = pruneWildernessInBounds({
    wilderness: options?.wilderness,
    continent: nextContinent,
    pathGrid: grids.pathGrid,
    bridgeGrid: grids.bridgeGrid,
    pois: options?.pois,
    bounds: wildernessBounds
  });

  return {
    continent: nextContinent,
    wilderness: prunedWilderness.wilderness,
    prunedTreeCount: prunedWilderness.prunedTreeCount,
    prunedPropCount: prunedWilderness.prunedPropCount
  };
}

function buildBrushAllowedMask(
  centerX: number,
  centerY: number,
  radius: number,
  shape: BrushShape | undefined,
  width: number,
  height: number
): ReadonlySet<string> | undefined {
  if (shape !== 'circle' && radius > 0) return undefined;
  const offsets = collectBrushKernelOffsets(radius, shape ?? 'square');
  const set = new Set<string>();
  for (const offset of offsets) {
    const gx = centerX + offset.x;
    const gy = centerY + offset.y;
    if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
      set.add(`${gx}_${gy}`);
    }
  }
  return set;
}

function getCurrentDomainWorkBounds(
  grids: MutableContinentGrids,
  baseBounds: DirtyTileBounds
): DirtyTileBounds {
  if (!grids.hasAnyMutation) return baseBounds;
  const acc = grids.mutatedBoundsAccumulator;
  if (
    acc.minX >= baseBounds.minX &&
    acc.minY >= baseBounds.minY &&
    acc.maxX <= baseBounds.maxX &&
    acc.maxY <= baseBounds.maxY
  ) {
    return baseBounds;
  }
  return expandDirtyBounds(
    {
      minX: Math.min(baseBounds.minX, acc.minX),
      minY: Math.min(baseBounds.minY, acc.minY),
      maxX: Math.max(baseBounds.maxX, acc.maxX),
      maxY: Math.max(baseBounds.maxY, acc.maxY)
    },
    1,
    grids.width,
    grids.height
  );
}

function promoteFloodedRoutePathsToBridges(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds
): void {
  if (grids.protectedPaintKind !== 'bridge') return;
  const clamped = clampDirtyBounds(bounds, grids.width, grids.height);
  for (let y = clamped.minY; y <= clamped.maxY; y++) {
    for (let x = clamped.minX; x <= clamped.maxX; x++) {
      if (
        grids.pathGrid[y]?.[x] &&
        isWaterTerrain(grids.terrainMatrix[y]?.[x]) &&
        !grids.bridgeGrid?.[y]?.[x] &&
        !grids.buildingMask[y]?.[x]
      ) {
        writeGridBridge(grids, x, y, true);
      }
    }
  }
}

export function runDomainsInBounds(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  domain: HealingDomain,
  mountainPolicy: MountainHealPolicy = 'erode',
  allowedMask?: ReadonlySet<string>
): void {
  if (domain === 'auto' || domain === 'water') {
    healWaterDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
    healMountainDomainInBounds(
      grids,
      getCurrentDomainWorkBounds(grids, bounds),
      mountainPolicy,
      allowedMask
    );
    healMacroBiomeDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
    promoteFloodedRoutePathsToBridges(grids, getCurrentDomainWorkBounds(grids, bounds));
    healBridgeDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
    if (grids.mutatedBridge) {
      healWaterDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
      healMacroBiomeDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
    }
    healPathDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
    return;
  }

  if (domain === 'mountain') {
    healMountainDomainInBounds(
      grids,
      getCurrentDomainWorkBounds(grids, bounds),
      mountainPolicy,
      allowedMask
    );
    healPathDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
  } else if (domain === 'macro_biome') {
    if (grids.mutatedTerrain) {
      healWaterDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
      healMountainDomainInBounds(
        grids,
        getCurrentDomainWorkBounds(grids, bounds),
        mountainPolicy,
        allowedMask
      );
      healBridgeDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
      if (grids.mutatedBridge) {
        healWaterDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
      }
      healPathDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
    }
    healMacroBiomeDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
  } else if (domain === 'path') {
    healBridgeDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
    if (grids.mutatedBridge) {
      healWaterDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
      healMacroBiomeDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
    }
    healPathDomainInBounds(grids, getCurrentDomainWorkBounds(grids, bounds), allowedMask);
  }
}

function countModifiedCellsInBounds(
  baseContinent: ContinentMapResult,
  basePathGrid: readonly (readonly boolean[])[],
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  baseBridgeGrid?: readonly (readonly boolean[])[]
): number {
  const clamped = clampDirtyBounds(bounds, grids.width, grids.height);
  let count = 0;
  for (let y = clamped.minY; y <= clamped.maxY; y++) {
    for (let x = clamped.minX; x <= clamped.maxX; x++) {
      const changed =
        baseContinent.terrainMatrix[y]?.[x] !== grids.terrainMatrix[y]?.[x] ||
        (baseContinent.heightmap[y]?.[x] ?? 0) !== (grids.heightmap[y]?.[x] ?? 0) ||
        baseContinent.macroBiomes?.biomeGrid[y]?.[x] !== grids.biomeGrid[y]?.[x] ||
        Boolean(basePathGrid[y]?.[x]) !== Boolean(grids.pathGrid[y]?.[x]) ||
        Boolean(baseBridgeGrid?.[y]?.[x]) !== Boolean(grids.bridgeGrid?.[y]?.[x]);
      if (changed) count += 1;
    }
  }
  return count;
}

function describeCellTargetRole(
  continent: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  x: number,
  y: number,
  domain: HealingDomain
): DisplayText {
  if (domain === 'mountain') {
    const mRole = continent.resolvedMountain.cellDetails[y]?.[x]?.role;
    if (mRole) return mRole;
    const northFoot =
      y > 0 ? continent.resolvedMountain.cellDetails[y - 1]?.[x]?.projectedFoot : null;
    if (northFoot) return 'south_cliff_foot';
    return 'flat_ground';
  }
  if (domain === 'water') {
    const wCell = continent.resolvedWater.cellDetails[y]?.[x];
    return wCell ? `${wCell.terrain}:${wCell.role}` : 'grass';
  }
  if (domain === 'path') {
    return pathGrid[y]?.[x] ? 'dirt_corridor_2x2' : 'pruned_path';
  }
  return continent.macroBiomes?.biomeGrid[y]?.[x] ?? 'temperate_meadow';
}

function nowIsoString(): IsoDateString {
  return Temporal.Now.instant().toString();
}

export function healContinentAt(
  continent: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  x: number,
  y: number,
  options?: AutotileHealingOptions
): ContinentHealingMutationResult {
  const width = continent.width;
  const height = continent.height;
  const clampedX = Math.max(0, Math.min(width - 1, x));
  const clampedY = Math.max(0, Math.min(height - 1, y));

  const requestedDomain = options?.domain ?? 'auto';
  const detectedDomain =
    requestedDomain === 'auto'
      ? inferCellHealingDomain(continent, pathGrid, clampedX, clampedY, options)
      : requestedDomain;

  const radius =
    options?.radius !== undefined ? Math.max(0, Math.floor(options.radius)) : DEFAULT_BRUSH_RADIUS;
  const workBounds = clampDirtyBounds(
    {
      minX: clampedX - radius,
      minY: clampedY - radius,
      maxX: clampedX + radius,
      maxY: clampedY + radius
    },
    width,
    height
  );
  const dirtyBounds = expandDirtyBounds(workBounds, DIRTY_REBUILD_MARGIN_TILES, width, height);

  const beforeScan = scanContinentAutotileDefects({
    continent,
    pathGrid,
    manualPathGrid: options?.manualPathGrid,
    bridgeGrid: options?.bridgeGrid,
    pois: options?.pois,
    bounds: dirtyBounds
  });

  const grids = createCowContinentGrids(
    continent,
    pathGrid,
    options?.pois,
    options?.bridgeGrid,
    options?.manualPathGrid
  );
  if (options?.preserveRouteBridges) {
    grids.protectedPaintKind = 'bridge';
  }
  const allowedMask = buildBrushAllowedMask(
    clampedX,
    clampedY,
    radius,
    options?.shape,
    width,
    height
  );
  const policy = options?.mountainPolicy ?? 'erode';
  runDomainsInBounds(grids, workBounds, requestedDomain, policy, allowedMask);

  const rebuildBounds = grids.hasAnyMutation
    ? expandDirtyBounds(grids.mutatedBoundsAccumulator, DIRTY_REBUILD_MARGIN_TILES, width, height)
    : dirtyBounds;

  const rebuilt = rebuildContinentInBounds(continent, grids, rebuildBounds, {
    pois: options?.pois,
    wilderness: options?.wilderness,
    forceBiomeBufferRebuild: requestedDomain === 'macro_biome' || requestedDomain === 'auto'
  });

  const changedCellCount = countModifiedCellsInBounds(
    continent,
    pathGrid,
    grids,
    rebuildBounds,
    options?.bridgeGrid
  );
  const afterScan = scanContinentAutotileDefects({
    continent: rebuilt.continent,
    pathGrid: grids.pathGrid,
    manualPathGrid: grids.manualPathGrid ?? options?.manualPathGrid,
    bridgeGrid: grids.bridgeGrid ?? options?.bridgeGrid,
    pois: options?.pois,
    bounds: dirtyBounds
  });

  return {
    continent: rebuilt.continent,
    pathGrid: grids.pathGrid,
    manualPathGrid: grids.manualPathGrid,
    bridgeGrid: grids.bridgeGrid,
    wilderness: rebuilt.wilderness,
    summary: {
      targetX: clampedX,
      targetY: clampedY,
      detectedDomain,
      targetRole: describeCellTargetRole(
        rebuilt.continent,
        grids.pathGrid,
        clampedX,
        clampedY,
        detectedDomain
      ),
      dirtyBounds: rebuildBounds,
      defectsBefore: beforeScan.totalDefects,
      defectsAfter: afterScan.totalDefects,
      repairedCount: Math.max(0, beforeScan.totalDefects - afterScan.totalDefects),
      changedCellCount,
      prunedTreeCount: rebuilt.prunedTreeCount,
      prunedPropCount: rebuilt.prunedPropCount,
      timestamp: nowIsoString()
    }
  };
}

export function healAllContinentDefects(
  continent: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  options?: AutotileHealingOptions
): ContinentHealingMutationResult {
  const width = continent.width;
  const height = continent.height;
  const fullBounds: DirtyTileBounds = {
    minX: 0,
    minY: 0,
    maxX: Math.max(0, width - 1),
    maxY: Math.max(0, height - 1)
  };

  const initialScan = scanContinentAutotileDefects({
    continent,
    pathGrid,
    manualPathGrid: options?.manualPathGrid,
    bridgeGrid: options?.bridgeGrid,
    pois: options?.pois
  });

  const grids = createCowContinentGrids(
    continent,
    pathGrid,
    options?.pois,
    options?.bridgeGrid,
    options?.manualPathGrid
  );
  if (options?.preserveRouteBridges) {
    grids.protectedPaintKind = 'bridge';
  }
  let workingContinent = continent;
  let workingWilderness = options?.wilderness ?? null;
  let totalPrunedTrees = 0;
  let totalPrunedProps = 0;
  const requestedDomain = options?.domain ?? 'auto';
  const policy = options?.mountainPolicy ?? 'erode';

  for (let pass = 0; pass < MAX_FULL_MAP_HEAL_PASSES; pass++) {
    runDomainsInBounds(grids, fullBounds, requestedDomain, policy);
    const rebuilt = rebuildContinentInBounds(workingContinent, grids, fullBounds, {
      pois: options?.pois,
      wilderness: workingWilderness,
      forceBiomeBufferRebuild: true
    });
    workingContinent = rebuilt.continent;
    workingWilderness = rebuilt.wilderness;
    totalPrunedTrees += rebuilt.prunedTreeCount;
    totalPrunedProps += rebuilt.prunedPropCount;

    const checkScan = scanContinentAutotileDefects({
      continent: workingContinent,
      pathGrid: grids.pathGrid,
      manualPathGrid: grids.manualPathGrid ?? options?.manualPathGrid,
      bridgeGrid: grids.bridgeGrid ?? options?.bridgeGrid,
      pois: options?.pois
    });
    if (checkScan.totalDefects === 0) {
      return {
        continent: workingContinent,
        pathGrid: grids.pathGrid,
        manualPathGrid: grids.manualPathGrid,
        bridgeGrid: grids.bridgeGrid,
        wilderness: workingWilderness,
        summary: {
          targetX: Math.floor(width / 2),
          targetY: Math.floor(height / 2),
          detectedDomain: requestedDomain,
          targetRole: 'full_map_healed',
          dirtyBounds: fullBounds,
          defectsBefore: initialScan.totalDefects,
          defectsAfter: 0,
          repairedCount: initialScan.totalDefects,
          prunedTreeCount: totalPrunedTrees,
          prunedPropCount: totalPrunedProps,
          timestamp: nowIsoString()
        }
      };
    }
  }

  const finalScan = scanContinentAutotileDefects({
    continent: workingContinent,
    pathGrid: grids.pathGrid,
    manualPathGrid: grids.manualPathGrid ?? options?.manualPathGrid,
    bridgeGrid: grids.bridgeGrid ?? options?.bridgeGrid,
    pois: options?.pois
  });

  return {
    continent: workingContinent,
    pathGrid: grids.pathGrid,
    manualPathGrid: grids.manualPathGrid,
    bridgeGrid: grids.bridgeGrid,
    wilderness: workingWilderness,
    summary: {
      targetX: Math.floor(width / 2),
      targetY: Math.floor(height / 2),
      detectedDomain: requestedDomain,
      targetRole: 'full_map_healed',
      dirtyBounds: fullBounds,
      defectsBefore: initialScan.totalDefects,
      defectsAfter: finalScan.totalDefects,
      repairedCount: Math.max(0, initialScan.totalDefects - finalScan.totalDefects),
      prunedTreeCount: totalPrunedTrees,
      prunedPropCount: totalPrunedProps,
      timestamp: nowIsoString()
    }
  };
}
