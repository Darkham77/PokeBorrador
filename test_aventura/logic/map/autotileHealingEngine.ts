/**
 * test_aventura/logic/map/autotileHealingEngine.ts
 *
 * MODEL-FIRST CANONICAL AUTOTILE HEALING BRUSH ENGINE (v2)
 *
 * Repairs broken tile combinations across all 4 regional domains
 * ('water', 'mountain', 'macro_biome', 'path') by mutating the underlying
 * semantic matrices toward local Lyapunov autotile invariants and re-compiling
 * canonical resolved autotile structures.
 */

import type { DisplayText, IsoDateString } from '@francogp/auditor';

import { DEFAULT_MOUNTAIN_PALETTE } from '../../config/studioConstants.ts';
import {
  HEALING_DOMAINS,
  type AutotileHealingOptions,
  type CoastalTerrainGroup,
  type ContinentHealingSummary,
  type DirtyTileBounds,
  type HealingDomain
} from '../../types/map/autotileHealingTypes.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import {
  buildBuildingProtectionMask,
  buildPoiAnchorMask,
  hasDropped2DInnerCorner,
  isBlockedPathElevationCell,
  isMiniatureOrphanPathBlotch,
  isPathOrBridgeAt,
  isSameWaterGroup as isSameWaterGroupAt,
  scanContinentAutotileDefects,
  toCoastalGroup
} from './autotileDefectScanner.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { ContinentCellDetails } from './geologicalAutotilingEngine.ts';
import { resolveMacroBiomeAutotile } from './macroBiomeAutotileEngine.ts';
import type { MacroBiome, MacroBiomeResult } from './macroBiomeSynthesizer.ts';
import {
  resolveMountainMapGrid,
  stampMountainStairs,
  type MountainPalette,
  type MountainRole,
  type MountainStairLocation,
  type ResolvedMountainCell
} from './mountainAutotileEngine.ts';
import { resolveWaterCoastGrid, type WaterTerrainKind } from './waterAutotileEngine.ts';

export interface ContinentHealingMutationResult {
  readonly continent: ContinentMapResult;
  readonly pathGrid: boolean[][];
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

const DEFAULT_BRUSH_RADIUS = 5 as const;
const DIRTY_RECT_MARGIN_TILES = 4 as const;
const MAX_LOCAL_CONVERGENCE_PASSES = 12 as const;
const MAX_FULL_MAP_HEAL_PASSES = 8 as const;

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

function clampBounds(bounds: DirtyTileBounds, width: number, height: number): DirtyTileBounds {
  return {
    minX: Math.max(0, bounds.minX),
    minY: Math.max(0, bounds.minY),
    maxX: Math.min(Math.max(0, width - 1), bounds.maxX),
    maxY: Math.min(Math.max(0, height - 1), bounds.maxY)
  };
}

function expandBounds(
  bounds: DirtyTileBounds,
  margin: number,
  width: number,
  height: number
): DirtyTileBounds {
  return clampBounds(
    {
      minX: bounds.minX - margin,
      minY: bounds.minY - margin,
      maxX: bounds.maxX + margin,
      maxY: bounds.maxY + margin
    },
    width,
    height
  );
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
    bridgeGrid: options?.bridgeGrid,
    pois: options?.pois,
    bounds: clampBounds(
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

interface MutableContinentGrids {
  readonly width: number;
  readonly height: number;
  readonly terrainMatrix: WaterTerrainKind[][];
  readonly heightmap: number[][];
  readonly biomeGrid: MacroBiome[][];
  readonly pathGrid: boolean[][];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
  readonly buildingMask: readonly (readonly boolean[])[];
  readonly poiAnchorMask: readonly (readonly boolean[])[];
  readonly baseStairs?: readonly MountainStairLocation[];
  readonly palette: MountainPalette;
  readonly paletteMatrix?: readonly (readonly MountainPalette[])[];
}

function cloneContinentGrids(
  continent: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  pois?: readonly POINode[],
  bridgeGrid?: readonly (readonly boolean[])[]
): MutableContinentGrids {
  const width = continent.width;
  const height = continent.height;
  return {
    width,
    height,
    terrainMatrix: continent.terrainMatrix.map((row) => [...row]),
    heightmap: continent.heightmap.map((row) => [...row]),
    biomeGrid: continent.macroBiomes
      ? continent.macroBiomes.biomeGrid.map((row) => [...row])
      : Array.from({ length: height }, () => Array<MacroBiome>(width).fill('temperate_meadow')),
    pathGrid: Array.from({ length: height }, (_, ry) =>
      Array.from({ length: width }, (__, rx) => Boolean(pathGrid[ry]?.[rx]))
    ),
    bridgeGrid,
    buildingMask: buildBuildingProtectionMask(width, height, pois),
    poiAnchorMask: buildPoiAnchorMask(width, height, pois),
    baseStairs: continent.placedStairs,
    palette: continent.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE,
    paletteMatrix: continent.geologicalClusters?.paletteMatrix
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
  if (grids.terrainMatrix[y]?.[x] !== 'sand') return false;
  const touchesWater = hasNeighborTerrain(
    grids.terrainMatrix,
    grids.width,
    grids.height,
    x,
    y,
    (nt, nx, ny) => isWaterTerrain(nt) && !grids.bridgeGrid?.[ny]?.[nx]
  );
  const touchesGrass = hasNeighborTerrain(
    grids.terrainMatrix,
    grids.width,
    grids.height,
    x,
    y,
    (nt) => nt === 'grass'
  );
  return touchesWater && touchesGrass;
}

function collectPinchedSandExpansionAt(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  cx: number,
  cy: number,
  toSand: { x: number; y: number }[]
): void {
  for (const { dx, dy } of EIGHT_NEIGHBOR_OFFSETS) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (nx < bounds.minX || nx > bounds.maxX || ny < bounds.minY || ny > bounds.maxY) continue;
    if (
      grids.terrainMatrix[ny]?.[nx] === 'grass' &&
      (grids.heightmap[ny]?.[nx] ?? 0) === 0 &&
      !isProtectedTerrainCell(grids, nx, ny)
    ) {
      toSand.push({ x: nx, y: ny });
    }
  }
}

function thickenPinchedSandOnce(grids: MutableContinentGrids, bounds: DirtyTileBounds): void {
  const toSand: { x: number; y: number }[] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (isPinchedSandAt(grids, x, y)) {
        collectPinchedSandExpansionAt(grids, bounds, x, y, toSand);
      }
    }
  }
  for (const pt of toSand) {
    grids.terrainMatrix[pt.y]![pt.x] = 'sand';
    grids.pathGrid[pt.y]![pt.x] = false;
  }
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
      terrainMatrix[y]![x] = terrainMatrix[y]![x + 1]!;
      changed = true;
    } else if (!isProtectedTerrainCell(grids, x + 1, y + 1)) {
      terrainMatrix[y + 1]![x + 1] = terrainMatrix[y]![x + 1]!;
      changed = true;
    }
  } else if (!tlW && !brW && trW && blW) {
    if (!isProtectedTerrainCell(grids, x + 1, y)) {
      terrainMatrix[y]![x + 1] = terrainMatrix[y]![x]!;
      changed = true;
    } else if (!isProtectedTerrainCell(grids, x, y + 1)) {
      terrainMatrix[y + 1]![x] = terrainMatrix[y]![x]!;
      changed = true;
    }
  }

  const tlS = terrainMatrix[y]?.[x] === 'sand';
  const trS = terrainMatrix[y]?.[x + 1] === 'sand';
  const blS = terrainMatrix[y + 1]?.[x] === 'sand';
  const brS = terrainMatrix[y + 1]?.[x + 1] === 'sand';

  if (tlS && brS && !trS && !blS) {
    if (!isProtectedTerrainCell(grids, x, y)) {
      terrainMatrix[y]![x] = 'grass';
      changed = true;
    } else if (!isProtectedTerrainCell(grids, x + 1, y + 1)) {
      terrainMatrix[y + 1]![x + 1] = 'grass';
      changed = true;
    }
  } else if (!tlS && !brS && trS && blS) {
    if (!isProtectedTerrainCell(grids, x + 1, y)) {
      terrainMatrix[y]![x + 1] = 'grass';
      changed = true;
    } else if (!isProtectedTerrainCell(grids, x, y + 1)) {
      terrainMatrix[y + 1]![x] = 'grass';
      changed = true;
    }
  }

  return changed;
}

function resolveDiagonalWaterAndSandPinches(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds
): boolean {
  let changed = false;
  const minY = Math.max(0, bounds.minY - 1);
  const minX = Math.max(0, bounds.minX - 1);
  const maxY = Math.min(grids.height - 2, bounds.maxY);
  const maxX = Math.min(grids.width - 2, bounds.maxX);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (resolve2x2PinchAt(grids, x, y)) {
        changed = true;
      }
    }
  }
  return changed;
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
      terrainMatrix[y]![x] = 'water';
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
    terrainMatrix[y]![x] = replacement;
    if (replacement !== 'grass') {
      grids.heightmap[y]![x] = 0;
      grids.pathGrid[y]![x] = false;
    }
    return true;
  }

  if (cur === 'sand' && isPinchedSandAt(grids, x, y)) {
    const waterCards = countCardinalGroup(terrainMatrix, width, height, x, y, 'water');
    const grassCards = countCardinalGroup(terrainMatrix, width, height, x, y, 'grass');
    terrainMatrix[y]![x] = waterCards >= 3 && grassCards === 0 ? 'water' : 'grass';
    return true;
  }

  return changed;
}

function healWaterSliversPass(grids: MutableContinentGrids, bounds: DirtyTileBounds): boolean {
  let changed = false;
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (healSingleWaterOrSandCell(grids, x, y)) {
        changed = true;
      }
    }
  }
  return changed;
}

function healWaterDomainInBounds(grids: MutableContinentGrids, bounds: DirtyTileBounds): void {
  let activeBounds = clampBounds(bounds, grids.width, grids.height);
  thickenPinchedSandOnce(grids, activeBounds);

  for (let pass = 0; pass < MAX_LOCAL_CONVERGENCE_PASSES; pass++) {
    const diagChanged = resolveDiagonalWaterAndSandPinches(grids, activeBounds);
    const sliverChanged = healWaterSliversPass(grids, activeBounds);
    if (!diagChanged && !sliverChanged) break;
    activeBounds = expandBounds(activeBounds, 1, grids.width, grids.height);
  }
}

function getElev(heightmap: readonly (readonly number[])[], x: number, y: number): number {
  if (y < 0 || y >= heightmap.length) return 0;
  const row = heightmap[y];
  if (!row || x < 0 || x >= row.length) return 0;
  return row[x] ?? 0;
}

function demoteMountainDiagonalPinches(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds
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
        heightmap[y]![x] = m1;
        heightmap[y + 1]![x + 1] = m1;
        changed = true;
        continue;
      }

      const m2 = Math.max(tl, br);
      if (tr > m2 && bl > m2) {
        heightmap[y]![x + 1] = m2;
        heightmap[y + 1]![x] = m2;
        changed = true;
      }
    }
  }
  return changed;
}

function demoteSingleMountainCellIfInvalid(
  grids: MutableContinentGrids,
  x: number,
  y: number
): boolean {
  const { heightmap, terrainMatrix, width, height } = grids;
  const elev = getElev(heightmap, x, y);
  if (elev <= 0) return false;

  if (terrainMatrix[y]?.[x] !== 'grass') {
    heightmap[y]![x] = 0;
    return true;
  }

  if (y + 1 < height && isWaterTerrain(terrainMatrix[y + 1]?.[x])) {
    const southElev = getElev(heightmap, x, y + 1);
    if (southElev < elev) {
      heightmap[y]![x] = southElev;
      return true;
    }
  }

  let maxAllowed = elev;
  if (y > 0) maxAllowed = Math.min(maxAllowed, getElev(heightmap, x, y - 1) + 1);
  if (y + 1 < height) maxAllowed = Math.min(maxAllowed, getElev(heightmap, x, y + 1) + 1);
  if (x > 0) maxAllowed = Math.min(maxAllowed, getElev(heightmap, x - 1, y) + 1);
  if (x + 1 < width) maxAllowed = Math.min(maxAllowed, getElev(heightmap, x + 1, y) + 1);
  if (maxAllowed < elev) {
    heightmap[y]![x] = maxAllowed;
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

  const isRidge = (!hasN && !hasS && (hasW || hasE)) || (!hasW && !hasE && (hasN || hasS));
  const isSingleColSouthJag =
    (!hasW && !hasS && hasE && hasSE) || (!hasE && !hasS && hasW && hasSW);
  const isSingleRowSouthJag =
    (!hasW && !hasS && hasN && hasNW) || (!hasE && !hasS && hasN && hasNE);
  if (isRidge || isSingleColSouthJag || isSingleRowSouthJag) {
    heightmap[y]![x] = elev - 1;
    return true;
  }

  if (!hasN && !hasS && !hasW && !hasE) {
    const hasDiag =
      getElev(heightmap, x - 1, y - 1) >= elev ||
      getElev(heightmap, x + 1, y - 1) >= elev ||
      getElev(heightmap, x - 1, y + 1) >= elev ||
      getElev(heightmap, x + 1, y + 1) >= elev;
    if (elev > 1 || hasDiag) {
      heightmap[y]![x] = elev - 1;
      return true;
    }
  }

  return false;
}

function isOnBoundsBorder(x: number, y: number, bounds: DirtyTileBounds): boolean {
  return x === bounds.minX || x === bounds.maxX || y === bounds.minY || y === bounds.maxY;
}

function healMountainPassInBounds(
  grids: MutableContinentGrids,
  activeBounds: DirtyTileBounds
): { changed: boolean; touchedEdge: boolean } {
  let changed = demoteMountainDiagonalPinches(grids, activeBounds);
  let touchedEdge = false;

  for (let y = activeBounds.minY; y <= activeBounds.maxY; y++) {
    for (let x = activeBounds.minX; x <= activeBounds.maxX; x++) {
      if (demoteSingleMountainCellIfInvalid(grids, x, y)) {
        changed = true;
        touchedEdge = touchedEdge || isOnBoundsBorder(x, y, activeBounds);
      }
    }
  }
  return { changed, touchedEdge };
}

function healMountainDomainInBounds(grids: MutableContinentGrids, bounds: DirtyTileBounds): void {
  let activeBounds = clampBounds(bounds, grids.width, grids.height);

  for (let pass = 0; pass < MAX_LOCAL_CONVERGENCE_PASSES * 2; pass++) {
    const res = healMountainPassInBounds(grids, activeBounds);
    if (!res.changed) break;
    if (res.touchedEdge) {
      activeBounds = expandBounds(activeBounds, 2, grids.width, grids.height);
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
    grids.biomeGrid[y]![x] = pickNeighborGrassBiome(grids, x, y, biome);
    return true;
  }
  return false;
}

function healMacroBiomePassInBounds(
  grids: MutableContinentGrids,
  activeBounds: DirtyTileBounds
): { changed: boolean; touchedEdge: boolean } {
  let changed = false;
  let touchedEdge = false;

  for (let y = activeBounds.minY; y <= activeBounds.maxY; y++) {
    for (let x = activeBounds.minX; x <= activeBounds.maxX; x++) {
      if (healSingleMacroBiomeCell(grids, x, y)) {
        changed = true;
        touchedEdge = touchedEdge || isOnBoundsBorder(x, y, activeBounds);
      }
    }
  }
  return { changed, touchedEdge };
}

function healMacroBiomeDomainInBounds(grids: MutableContinentGrids, bounds: DirtyTileBounds): void {
  let activeBounds = clampBounds(bounds, grids.width, grids.height);

  for (let pass = 0; pass < MAX_LOCAL_CONVERGENCE_PASSES; pass++) {
    const res = healMacroBiomePassInBounds(grids, activeBounds);
    if (!res.changed) break;
    if (res.touchedEdge) {
      activeBounds = expandBounds(activeBounds, 2, grids.width, grids.height);
    }
  }
}

function filterValidMountainStairs(
  stairs: readonly MountainStairLocation[] | undefined,
  grids: MutableContinentGrids,
  palette: MountainPalette,
  paletteMatrix?: readonly (readonly MountainPalette[])[]
): MountainStairLocation[] {
  if (!stairs || stairs.length === 0) return [];

  const baseMountain = resolveMountainMapGrid(grids.heightmap, {
    palette,
    paletteMatrix
  });

  const valid: MountainStairLocation[] = [];
  const occupiedTop = new Set<string>();

  for (const st of stairs) {
    if (st.x < 0 || st.x + 1 >= grids.width || st.y < 0 || st.y + 1 >= grids.height) continue;
    const keyL = `${st.x}_${st.y}`;
    const keyR = `${st.x + 1}_${st.y}`;
    if (occupiedTop.has(keyL) || occupiedTop.has(keyR)) continue;

    const cellL = baseMountain.cellDetails[st.y]?.[st.x];
    const cellR = baseMountain.cellDetails[st.y]?.[st.x + 1];
    if (!cellL || !cellR) continue;
    if (cellL.role !== 'edge_south_top' || cellR.role !== 'edge_south_top') continue;
    if (cellL.elevation !== cellR.elevation) continue;

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
        grids.pathGrid[y]![x] = false;
      }
    }
  }
}

function thickenSinglePassPaths(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  stairBottomSet: ReadonlySet<string>
): void {
  const additions: { x: number; y: number }[] = [];

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (!grids.pathGrid[y]?.[x] || !canPlaceDirtPathAt(grids, stairBottomSet, x, y)) continue;

      const pN = isPathConnectedForHeal(grids, x, y - 1);
      const pS = isPathConnectedForHeal(grids, x, y + 1);
      const pW = isPathConnectedForHeal(grids, x - 1, y);
      const pE = isPathConnectedForHeal(grids, x + 1, y);

      if ((pW || pE) && !pN && !pS) {
        if (canPlaceDirtPathAt(grids, stairBottomSet, x, y + 1)) additions.push({ x, y: y + 1 });
        else if (canPlaceDirtPathAt(grids, stairBottomSet, x, y - 1)) {
          additions.push({ x, y: y - 1 });
        }
      } else if ((pN || pS) && !pW && !pE) {
        if (canPlaceDirtPathAt(grids, stairBottomSet, x + 1, y)) additions.push({ x: x + 1, y });
        else if (canPlaceDirtPathAt(grids, stairBottomSet, x - 1, y)) {
          additions.push({ x: x - 1, y });
        }
      }
    }
  }

  for (const pt of additions) {
    grids.pathGrid[pt.y]![pt.x] = true;
  }
}

function collectElbowNotchAdditionsAt(
  grids: MutableContinentGrids,
  stairBottomSet: ReadonlySet<string>,
  x: number,
  y: number,
  additions: { x: number; y: number }[]
): void {
  if (!grids.pathGrid[y]?.[x] || !canPlaceDirtPathAt(grids, stairBottomSet, x, y)) return;

  const pN = isPathConnectedForHeal(grids, x, y - 1);
  const pS = isPathConnectedForHeal(grids, x, y + 1);
  const pW = isPathConnectedForHeal(grids, x - 1, y);
  const pE = isPathConnectedForHeal(grids, x + 1, y);
  const pNW = isPathConnectedForHeal(grids, x - 1, y - 1);
  const pNE = isPathConnectedForHeal(grids, x + 1, y - 1);
  const pSW = isPathConnectedForHeal(grids, x - 1, y + 1);
  const pSE = isPathConnectedForHeal(grids, x + 1, y + 1);

  if (x + 1 < grids.width && y + 1 < grids.height && pSE && !pE && !pS) {
    if (canPlaceDirtPathAt(grids, stairBottomSet, x + 1, y)) additions.push({ x: x + 1, y });
    else if (canPlaceDirtPathAt(grids, stairBottomSet, x, y + 1)) additions.push({ x, y: y + 1 });
  }
  if (x > 0 && y + 1 < grids.height && pSW && !pW && !pS) {
    if (canPlaceDirtPathAt(grids, stairBottomSet, x - 1, y)) additions.push({ x: x - 1, y });
    else if (canPlaceDirtPathAt(grids, stairBottomSet, x, y + 1)) additions.push({ x, y: y + 1 });
  }

  if (pN && pS && pW && pE) return;
  if (pN && pW && !pNW && canPlaceDirtPathAt(grids, stairBottomSet, x - 1, y - 1)) {
    additions.push({ x: x - 1, y: y - 1 });
  }
  if (pN && pE && !pNE && canPlaceDirtPathAt(grids, stairBottomSet, x + 1, y - 1)) {
    additions.push({ x: x + 1, y: y - 1 });
  }
  if (pS && pW && !pSW && canPlaceDirtPathAt(grids, stairBottomSet, x - 1, y + 1)) {
    additions.push({ x: x - 1, y: y + 1 });
  }
  if (pS && pE && !pSE && canPlaceDirtPathAt(grids, stairBottomSet, x + 1, y + 1)) {
    additions.push({ x: x + 1, y: y + 1 });
  }
}

function fillPathElbowNotchesOnce(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  stairBottomSet: ReadonlySet<string>
): void {
  const additions: { x: number; y: number }[] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      collectElbowNotchAdditionsAt(grids, stairBottomSet, x, y, additions);
    }
  }
  for (const pt of additions) {
    grids.pathGrid[pt.y]![pt.x] = true;
  }
}

function shouldPruneSinglePathCell(
  grids: MutableContinentGrids,
  stairBottomSet: ReadonlySet<string>,
  x: number,
  y: number
): boolean {
  if (!grids.pathGrid[y]?.[x]) return false;
  if (!canPlaceDirtPathAt(grids, stairBottomSet, x, y)) return true;

  const pN = isPathConnectedForHeal(grids, x, y - 1);
  const pS = isPathConnectedForHeal(grids, x, y + 1);
  const pW = isPathConnectedForHeal(grids, x - 1, y);
  const pE = isPathConnectedForHeal(grids, x + 1, y);

  if ((!pN && !pS) || (!pW && !pE)) return true;

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
  if (sePinch || swPinch || pathDroppedInner) {
    return true;
  }

  return isMiniatureOrphanPathBlotch(
    {
      pathGrid: grids.pathGrid,
      bridgeGrid: grids.bridgeGrid,
      buildingMask: grids.buildingMask,
      poiAnchorMask: grids.poiAnchorMask,
      width: grids.width,
      height: grids.height
    },
    x,
    y
  );
}

function pruneInvalidPathCellsPass(
  grids: MutableContinentGrids,
  activeBounds: DirtyTileBounds,
  stairBottomSet: ReadonlySet<string>
): { changed: boolean; touchedEdge: boolean } {
  let changed = false;
  let touchedEdge = false;

  for (let y = activeBounds.minY; y <= activeBounds.maxY; y++) {
    for (let x = activeBounds.minX; x <= activeBounds.maxX; x++) {
      if (shouldPruneSinglePathCell(grids, stairBottomSet, x, y)) {
        grids.pathGrid[y]![x] = false;
        changed = true;
        touchedEdge = touchedEdge || isOnBoundsBorder(x, y, activeBounds);
      }
    }
  }
  return { changed, touchedEdge };
}

function healPathDomainInBounds(grids: MutableContinentGrids, bounds: DirtyTileBounds): void {
  const validStairs = filterValidMountainStairs(
    grids.baseStairs,
    grids,
    grids.palette,
    grids.paletteMatrix
  );
  const stairBottomSet = buildStairBottomSet(validStairs);

  let activeBounds = expandBounds(bounds, 2, grids.width, grids.height);
  clearBlockedSubstratePaths(grids, activeBounds, stairBottomSet);
  thickenSinglePassPaths(grids, bounds, stairBottomSet);
  fillPathElbowNotchesOnce(grids, activeBounds, stairBottomSet);

  for (let pass = 0; pass < MAX_LOCAL_CONVERGENCE_PASSES * 2; pass++) {
    const res = pruneInvalidPathCellsPass(grids, activeBounds, stairBottomSet);
    if (!res.changed) break;
    if (res.touchedEdge) {
      activeBounds = expandBounds(activeBounds, 2, grids.width, grids.height);
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

function computeMacroBiomeStats(
  biomeGrid: readonly (readonly MacroBiome[])[]
): Record<MacroBiome, number> {
  const stats: Record<MacroBiome, number> = {
    temperate_meadow: 0,
    mint_highland: 0,
    viridian_forest: 0,
    arid_desert: 0,
    volcanic_plateau: 0
  };
  for (const row of biomeGrid) {
    for (const b of row) {
      stats[b] += 1;
    }
  }
  return stats;
}

function rebuildResolvedContinent(
  baseContinent: ContinentMapResult,
  grids: MutableContinentGrids
): ContinentMapResult {
  const { width, height, palette, paletteMatrix } = grids;

  const validStairs = filterValidMountainStairs(
    baseContinent.placedStairs,
    grids,
    palette,
    paletteMatrix
  );

  const resolvedWater = resolveWaterCoastGrid(grids.terrainMatrix, grids.bridgeGrid);
  let resolvedMountain = resolveMountainMapGrid(grids.heightmap, {
    palette,
    paletteMatrix
  });
  for (const st of validStairs) {
    const stPal = paletteMatrix?.[st.y]?.[st.x] ?? palette;
    resolvedMountain = stampMountainStairs(resolvedMountain, st.x, st.y, stPal, 'rock');
  }

  const nextStats = computeMacroBiomeStats(grids.biomeGrid);
  const nextMacroBiomes: MacroBiomeResult = baseContinent.macroBiomes
    ? {
        ...baseContinent.macroBiomes,
        biomeGrid: grids.biomeGrid,
        stats: nextStats
      }
    : {
        biomeGrid: grids.biomeGrid,
        transitionBufferGrid: Array.from({ length: height }, () =>
          Array<boolean>(width).fill(false)
        ),
        temperatureMap: new Float32Array(width * height),
        moistureMap: new Float32Array(width * height),
        stats: nextStats
      };

  const resolvedMacroBiomes = resolveMacroBiomeAutotile(
    grids.biomeGrid,
    grids.terrainMatrix,
    grids.heightmap
  );

  const cells: ContinentCellDetails[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (__, x) => {
      const terrain = grids.terrainMatrix[y]![x]!;
      const elev = grids.heightmap[y]![x]!;
      const wCell = resolvedWater.cellDetails[y]?.[x];
      const mCell = resolvedMountain.cellDetails[y]?.[x];
      const northMtn = y > 0 ? resolvedMountain.cellDetails[y - 1]?.[x] : null;
      const isRiverChannel = Boolean(baseContinent.riverDrainage?.riverGrid?.[y]?.[x]);
      const cellPal = paletteMatrix?.[y]?.[x] ?? palette;

      return assembleCellDetail({
        x,
        y,
        terrain,
        elev,
        macroBiome: grids.biomeGrid[y]?.[x],
        mountainPalette: cellPal,
        waterPrimaryTile: wCell?.primaryTile,
        waterRole: wCell?.role,
        mtnCell: mCell,
        northMtn,
        isRiverChannel
      });
    })
  );

  return {
    ...baseContinent,
    terrainMatrix: grids.terrainMatrix,
    heightmap: grids.heightmap,
    macroBiomes: nextMacroBiomes,
    resolvedWater,
    resolvedMountain,
    resolvedMacroBiomes,
    cells,
    placedStairs: validStairs
  };
}

function runDomainsInBounds(
  grids: MutableContinentGrids,
  bounds: DirtyTileBounds,
  domain: HealingDomain
): void {
  if (domain === 'auto') {
    healWaterDomainInBounds(grids, bounds);
    healMountainDomainInBounds(grids, bounds);
    healMacroBiomeDomainInBounds(grids, bounds);
    healPathDomainInBounds(grids, bounds);
    return;
  }

  if (domain === 'water') {
    healWaterDomainInBounds(grids, bounds);
    healMountainDomainInBounds(grids, bounds);
    healPathDomainInBounds(grids, bounds);
  } else if (domain === 'mountain') {
    healMountainDomainInBounds(grids, bounds);
    healPathDomainInBounds(grids, bounds);
  } else if (domain === 'macro_biome') {
    healMacroBiomeDomainInBounds(grids, bounds);
  } else if (domain === 'path') {
    healPathDomainInBounds(grids, bounds);
  }
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

  const radius = Math.max(2, options?.radius ?? DEFAULT_BRUSH_RADIUS);
  const workBounds = clampBounds(
    {
      minX: clampedX - radius,
      minY: clampedY - radius,
      maxX: clampedX + radius,
      maxY: clampedY + radius
    },
    width,
    height
  );
  const dirtyBounds = expandBounds(workBounds, DIRTY_RECT_MARGIN_TILES, width, height);

  const beforeScan = scanContinentAutotileDefects({
    continent,
    pathGrid,
    bridgeGrid: options?.bridgeGrid,
    pois: options?.pois,
    bounds: dirtyBounds
  });

  const grids = cloneContinentGrids(continent, pathGrid, options?.pois, options?.bridgeGrid);
  runDomainsInBounds(grids, workBounds, requestedDomain);

  const nextContinent = rebuildResolvedContinent(continent, grids);
  const afterScan = scanContinentAutotileDefects({
    continent: nextContinent,
    pathGrid: grids.pathGrid,
    bridgeGrid: options?.bridgeGrid,
    pois: options?.pois,
    bounds: dirtyBounds
  });

  const targetRole = describeCellTargetRole(
    nextContinent,
    grids.pathGrid,
    clampedX,
    clampedY,
    detectedDomain
  );

  return {
    continent: nextContinent,
    pathGrid: grids.pathGrid,
    summary: {
      targetX: clampedX,
      targetY: clampedY,
      detectedDomain,
      targetRole,
      dirtyBounds,
      defectsBefore: beforeScan.totalDefects,
      defectsAfter: afterScan.totalDefects,
      repairedCount: Math.max(0, beforeScan.totalDefects - afterScan.totalDefects),
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
    bridgeGrid: options?.bridgeGrid,
    pois: options?.pois
  });

  const grids = cloneContinentGrids(continent, pathGrid, options?.pois, options?.bridgeGrid);
  let workingContinent = continent;
  const requestedDomain = options?.domain ?? 'auto';

  for (let pass = 0; pass < MAX_FULL_MAP_HEAL_PASSES; pass++) {
    runDomainsInBounds(grids, fullBounds, requestedDomain);
    workingContinent = rebuildResolvedContinent(workingContinent, grids);

    const checkScan = scanContinentAutotileDefects({
      continent: workingContinent,
      pathGrid: grids.pathGrid,
      bridgeGrid: options?.bridgeGrid,
      pois: options?.pois
    });
    if (checkScan.totalDefects === 0) {
      return {
        continent: workingContinent,
        pathGrid: grids.pathGrid,
        summary: {
          targetX: Math.floor(width / 2),
          targetY: Math.floor(height / 2),
          detectedDomain: requestedDomain,
          targetRole: 'full_map_healed',
          dirtyBounds: fullBounds,
          defectsBefore: initialScan.totalDefects,
          defectsAfter: 0,
          repairedCount: initialScan.totalDefects,
          timestamp: nowIsoString()
        }
      };
    }
  }

  const finalScan = scanContinentAutotileDefects({
    continent: workingContinent,
    pathGrid: grids.pathGrid,
    bridgeGrid: options?.bridgeGrid,
    pois: options?.pois
  });

  return {
    continent: workingContinent,
    pathGrid: grids.pathGrid,
    summary: {
      targetX: Math.floor(width / 2),
      targetY: Math.floor(height / 2),
      detectedDomain: requestedDomain,
      targetRole: 'full_map_healed',
      dirtyBounds: fullBounds,
      defectsBefore: initialScan.totalDefects,
      defectsAfter: finalScan.totalDefects,
      repairedCount: Math.max(0, initialScan.totalDefects - finalScan.totalDefects),
      timestamp: nowIsoString()
    }
  };
}
