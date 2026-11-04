/**
 * test_aventura/logic/map/autotileDefectScanner.ts
 *
 * CONTINENTAL SEAM & AUTOTILE DEFECT SCANNER ENGINE
 *
 * Scans a generated or edited ContinentMapResult + pathGrid + bridgeGrid + POIs
 * across all 4 terrain domains ('mountain', 'water', 'path', 'macro_biome') and
 * reports every tile whose neighborhood violates canonical GBA autotile invariants.
 */

import type { DisplayText } from '@francogp/auditor';

import {
  AUTOTILE_DEFECT_KINDS,
  HEALING_DOMAINS,
  type AutotileDefectKind,
  type AutotileDefectRecord,
  type CoastalTerrainGroup,
  type ContinentDefectScanReport,
  type DirtyTileBounds,
  type HealingDomain
} from '../../types/map/autotileHealingTypes.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { MacroBiome } from './macroBiomeSynthesizer.ts';
import type { WaterTerrainKind } from './waterAutotileEngine.ts';

export interface DefectScannerInput {
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
  readonly pois?: readonly POINode[];
  readonly bounds?: DirtyTileBounds;
}

const BRUSHED_MACRO_BIOMES: ReadonlySet<MacroBiome> = new Set<MacroBiome>([
  'mint_highland',
  'arid_desert',
  'volcanic_plateau'
]);

const MIN_UNANCHORED_PATH_COMPONENT_CELLS = 8 as const;

export function buildBuildingProtectionMask(
  width: number,
  height: number,
  pois?: readonly POINode[]
): boolean[][] {
  const mask: boolean[][] = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
  if (!pois) return mask;

  for (const poi of pois) {
    const buildings = poi.urbanLayout?.buildings;
    if (!buildings) continue;
    for (const b of buildings) {
      const maxBy = Math.min(height - 1, b.y + b.height - 1);
      const maxBx = Math.min(width - 1, b.x + b.width - 1);
      for (let ry = Math.max(0, b.y); ry <= maxBy; ry++) {
        for (let rx = Math.max(0, b.x); rx <= maxBx; rx++) {
          mask[ry]![rx] = true;
        }
      }
    }
  }
  return mask;
}

export function buildPoiAnchorMask(
  width: number,
  height: number,
  pois?: readonly POINode[]
): boolean[][] {
  const mask: boolean[][] = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
  if (!pois) return mask;

  for (const poi of pois) {
    const minY = Math.max(0, poi.gridY - 1);
    const maxY = Math.min(height - 1, poi.gridY + poi.footprint.height);
    const minX = Math.max(0, poi.gridX - 1);
    const maxX = Math.min(width - 1, poi.gridX + poi.footprint.width);
    for (let ry = minY; ry <= maxY; ry++) {
      for (let rx = minX; rx <= maxX; rx++) {
        mask[ry]![rx] = true;
      }
    }
  }
  return mask;
}

function isWaterTerrain(t: WaterTerrainKind | undefined): boolean {
  return t === 'water' || t === 'water_deep';
}

function createZeroDomainCounts(): Record<HealingDomain, number> {
  return {
    auto: 0,
    path: 0,
    mountain: 0,
    water: 0,
    macro_biome: 0
  };
}

function createZeroKindCounts(): Record<AutotileDefectKind, number> {
  return {
    mountain_water_overlap: 0,
    mountain_south_water_overhang: 0,
    mountain_thin_ridge: 0,
    mountain_diagonal_pinch: 0,
    mountain_steep_drop: 0,
    mountain_invalid_stair: 0,
    water_sliver: 0,
    water_diagonal_pinch: 0,
    sand_dual_boundary_pinch: 0,
    ocean_grass_direct_contact: 0,
    path_sliver_or_orphan: 0,
    macro_biome_sliver: 0,
    macro_biome_diagonal_pinch: 0
  };
}

interface ScanCellContext {
  readonly width: number;
  readonly height: number;
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
  readonly buildingMask: readonly (readonly boolean[])[];
  readonly poiAnchorMask: readonly (readonly boolean[])[];
  readonly stairSet: ReadonlySet<string>;
  readonly stairBottomSet: ReadonlySet<string>;
  readonly pushDefect: (
    x: number,
    y: number,
    domain: HealingDomain,
    kind: AutotileDefectKind,
    description: DisplayText
  ) => void;
}

function getElevAt(heightmap: readonly (readonly number[])[], x: number, y: number): number {
  if (y < 0 || y >= heightmap.length) return 0;
  const row = heightmap[y];
  if (!row || x < 0 || x >= row.length) return 0;
  return row[x] ?? 0;
}

export function isBlockedPathElevationCell(
  heightmap: readonly (readonly number[])[],
  stairBottomSet: ReadonlySet<string>,
  x: number,
  y: number
): boolean {
  const elev = getElevAt(heightmap, x, y);
  if (elev > 0) {
    const rimDrop =
      getElevAt(heightmap, x, y - 1) < elev ||
      getElevAt(heightmap, x, y + 1) < elev ||
      getElevAt(heightmap, x - 1, y) < elev ||
      getElevAt(heightmap, x + 1, y) < elev;
    if (rimDrop) return true;
  }

  if (y > 0 && getElevAt(heightmap, x, y - 1) > elev && !stairBottomSet.has(`${x}_${y}`)) {
    return true;
  }
  return false;
}

function hasSteepCardinalDrop(
  heightmap: readonly (readonly number[])[],
  width: number,
  height: number,
  x: number,
  y: number,
  elev: number
): boolean {
  if (elev <= 1) return false;
  if (y > 0 && elev - getElevAt(heightmap, x, y - 1) > 1) return true;
  if (y + 1 < height && elev - getElevAt(heightmap, x, y + 1) > 1) return true;
  if (x > 0 && elev - getElevAt(heightmap, x - 1, y) > 1) return true;
  if (x + 1 < width && elev - getElevAt(heightmap, x + 1, y) > 1) return true;
  return false;
}

function isInvalidIsolatedPeak(
  heightmap: readonly (readonly number[])[],
  x: number,
  y: number,
  elev: number
): boolean {
  if (elev > 1) return true;
  const nw = getElevAt(heightmap, x - 1, y - 1);
  const ne = getElevAt(heightmap, x + 1, y - 1);
  const sw = getElevAt(heightmap, x - 1, y + 1);
  const se = getElevAt(heightmap, x + 1, y + 1);
  return nw >= elev || ne >= elev || sw >= elev || se >= elev;
}

function scanMountainCell(ctx: ScanCellContext, x: number, y: number): void {
  const { continent, width, height, pushDefect } = ctx;
  const heightmap = continent.heightmap;
  const terrain = continent.terrainMatrix[y]?.[x] ?? 'grass';
  const elev = getElevAt(heightmap, x, y);

  if (x + 1 < width && y + 1 < height) {
    const tl = elev;
    const tr = getElevAt(heightmap, x + 1, y);
    const bl = getElevAt(heightmap, x, y + 1);
    const br = getElevAt(heightmap, x + 1, y + 1);
    const maxOff1 = Math.max(tr, bl);
    const maxOff2 = Math.max(tl, br);
    if ((tl > maxOff1 && br > maxOff1) || (tr > maxOff2 && bl > maxOff2)) {
      pushDefect(x, y, 'mountain', 'mountain_diagonal_pinch', '2x2 diagonal elevation pinch');
    }
  }

  if (elev <= 0) return;

  if (terrain !== 'grass') {
    pushDefect(x, y, 'mountain', 'mountain_water_overlap', 'Elevated cliff over non-grass cell');
    return;
  }

  if (y + 1 < height) {
    const southElev = getElevAt(heightmap, x, y + 1);
    const southTerrain = continent.terrainMatrix[y + 1]?.[x];
    if (southElev < elev && isWaterTerrain(southTerrain)) {
      pushDefect(
        x,
        y,
        'mountain',
        'mountain_south_water_overhang',
        'South cliff face projects directly onto water'
      );
    }
  }

  if (hasSteepCardinalDrop(heightmap, width, height, x, y, elev)) {
    pushDefect(x, y, 'mountain', 'mountain_steep_drop', 'Cardinal elevation drop exceeds 1 tier');
  }

  const hasN = getElevAt(heightmap, x, y - 1) >= elev;
  const hasS = getElevAt(heightmap, x, y + 1) >= elev;
  const hasW = getElevAt(heightmap, x - 1, y) >= elev;
  const hasE = getElevAt(heightmap, x + 1, y) >= elev;
  const hasNW = getElevAt(heightmap, x - 1, y - 1) >= elev;
  const hasNE = getElevAt(heightmap, x + 1, y - 1) >= elev;
  const hasSE = getElevAt(heightmap, x + 1, y + 1) >= elev;
  const hasSW = getElevAt(heightmap, x - 1, y + 1) >= elev;

  const isOneTileRidge = (!hasN && !hasS && (hasW || hasE)) || (!hasW && !hasE && (hasN || hasS));
  const isSingleColSouthJag =
    (!hasW && !hasS && hasE && hasSE) || (!hasE && !hasS && hasW && hasSW);
  const isSingleRowSouthJag =
    (!hasW && !hasS && hasN && hasNW) || (!hasE && !hasS && hasN && hasNE);
  const isBrokenPeak =
    !hasN && !hasS && !hasW && !hasE && isInvalidIsolatedPeak(heightmap, x, y, elev);
  if (isOneTileRidge || isSingleColSouthJag || isSingleRowSouthJag || isBrokenPeak) {
    pushDefect(
      x,
      y,
      'mountain',
      'mountain_thin_ridge',
      '1-tile thin mountain ridge or invalid spur'
    );
  }

  scanMountainStairCell(ctx, x, y, elev);
}

function scanMountainStairCell(ctx: ScanCellContext, x: number, y: number, elev: number): void {
  const { continent, height, stairSet, pushDefect } = ctx;
  const mCell = continent.resolvedMountain.cellDetails[y]?.[x];
  const isPlacedStairLeft = stairSet.has(`${x}_${y}`);
  if (!mCell) return;

  if (mCell.role === 'stairs_l' || isPlacedStairLeft) {
    const rightCell = continent.resolvedMountain.cellDetails[y]?.[x + 1];
    const southElev = getElevAt(continent.heightmap, x, y + 1);
    const southRightElev = getElevAt(continent.heightmap, x + 1, y + 1);
    const southTerrain = continent.terrainMatrix[y + 1]?.[x];
    const southRightTerrain = continent.terrainMatrix[y + 1]?.[x + 1];
    const validPartner = mCell.role === 'stairs_l' && rightCell?.role === 'stairs_r';
    const validLanding =
      y + 1 < height &&
      elev - southElev === 1 &&
      rightCell?.elevation === elev &&
      elev - southRightElev === 1 &&
      southTerrain === 'grass' &&
      southRightTerrain === 'grass';
    if (!validPartner || !validLanding) {
      pushDefect(
        x,
        y,
        'mountain',
        'mountain_invalid_stair',
        'Unpaired or obstructed mountain stair'
      );
    }
  } else if (mCell.role === 'stairs_r') {
    const leftCell = continent.resolvedMountain.cellDetails[y]?.[x - 1];
    if (leftCell?.role !== 'stairs_l') {
      pushDefect(x, y, 'mountain', 'mountain_invalid_stair', 'Orphan right mountain stair tile');
    }
  }
}

function hasNeighborMatch(
  matrix: readonly (readonly WaterTerrainKind[])[],
  width: number,
  height: number,
  x: number,
  y: number,
  predicate: (t: WaterTerrainKind, nx: number, ny: number) => boolean
): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nt = matrix[ny]?.[nx];
      if (nt && predicate(nt, nx, ny)) return true;
    }
  }
  return false;
}

export function toCoastalGroup(t: WaterTerrainKind | undefined): CoastalTerrainGroup {
  if (isWaterTerrain(t)) return 'water';
  return t === 'sand' ? 'sand' : 'grass';
}

export function isSameWaterGroup(
  matrix: readonly (readonly WaterTerrainKind[])[],
  width: number,
  height: number,
  nx: number,
  ny: number,
  group: CoastalTerrainGroup
): boolean {
  if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
  return toCoastalGroup(matrix[ny]?.[nx]) === group;
}

function isProtectedScannerCell(ctx: ScanCellContext, x: number, y: number): boolean {
  return Boolean(ctx.bridgeGrid?.[y]?.[x] || ctx.buildingMask[y]?.[x]);
}

function scan2x2CoastalPinches(ctx: ScanCellContext, x: number, y: number): void {
  const { continent, width, height, pushDefect } = ctx;
  if (x + 1 >= width || y + 1 >= height) return;

  const matrix = continent.terrainMatrix;
  const tlW = isWaterTerrain(matrix[y]?.[x]);
  const trW = isWaterTerrain(matrix[y]?.[x + 1]);
  const blW = isWaterTerrain(matrix[y + 1]?.[x]);
  const brW = isWaterTerrain(matrix[y + 1]?.[x + 1]);

  const wPinch1 =
    tlW &&
    brW &&
    !trW &&
    !blW &&
    (!isProtectedScannerCell(ctx, x, y) || !isProtectedScannerCell(ctx, x + 1, y + 1));
  const wPinch2 =
    !tlW &&
    !brW &&
    trW &&
    blW &&
    (!isProtectedScannerCell(ctx, x + 1, y) || !isProtectedScannerCell(ctx, x, y + 1));
  if (wPinch1 || wPinch2) {
    pushDefect(x, y, 'water', 'water_diagonal_pinch', '2x2 diagonal water coastline pinch');
  }

  const tlS = matrix[y]?.[x] === 'sand';
  const trS = matrix[y]?.[x + 1] === 'sand';
  const blS = matrix[y + 1]?.[x] === 'sand';
  const brS = matrix[y + 1]?.[x + 1] === 'sand';

  const sPinch1 =
    tlS &&
    brS &&
    !trS &&
    !blS &&
    (!isProtectedScannerCell(ctx, x, y) || !isProtectedScannerCell(ctx, x + 1, y + 1));
  const sPinch2 =
    !tlS &&
    !brS &&
    trS &&
    blS &&
    (!isProtectedScannerCell(ctx, x + 1, y) || !isProtectedScannerCell(ctx, x, y + 1));
  if (sPinch1 || sPinch2) {
    pushDefect(x, y, 'water', 'water_diagonal_pinch', '2x2 diagonal coastal sand pinch');
  }
}

function scanWaterAndSandCell(ctx: ScanCellContext, x: number, y: number): void {
  const { continent, width, height, bridgeGrid, pushDefect } = ctx;
  scan2x2CoastalPinches(ctx, x, y);

  if (isProtectedScannerCell(ctx, x, y)) return;

  const matrix = continent.terrainMatrix;
  const terrain = matrix[y]?.[x] ?? 'grass';

  if (terrain === 'water_deep') {
    const touchesGrass = hasNeighborMatch(
      matrix,
      width,
      height,
      x,
      y,
      (nt, nx, ny) => nt === 'grass' && !bridgeGrid?.[ny]?.[nx]
    );
    if (touchesGrass) {
      pushDefect(
        x,
        y,
        'water',
        'ocean_grass_direct_contact',
        'Abyssal deep water contacts grass directly without transition'
      );
    }
  }

  if (terrain === 'sand') {
    const touchesWater = hasNeighborMatch(
      matrix,
      width,
      height,
      x,
      y,
      (nt, nx, ny) => isWaterTerrain(nt) && !bridgeGrid?.[ny]?.[nx]
    );
    const touchesGrass = hasNeighborMatch(matrix, width, height, x, y, (nt) => nt === 'grass');
    if (touchesWater && touchesGrass) {
      pushDefect(
        x,
        y,
        'water',
        'sand_dual_boundary_pinch',
        '1-tile pinched sand borders both water and grass simultaneously'
      );
    }
  }

  const group: CoastalTerrainGroup = toCoastalGroup(terrain);
  if (group === 'grass') return;

  const sameN = isSameWaterGroup(matrix, width, height, x, y - 1, group);
  const sameS = isSameWaterGroup(matrix, width, height, x, y + 1, group);
  const sameW = isSameWaterGroup(matrix, width, height, x - 1, y, group);
  const sameE = isSameWaterGroup(matrix, width, height, x + 1, y, group);

  if ((!sameN && !sameS) || (!sameW && !sameE)) {
    pushDefect(x, y, 'water', 'water_sliver', `1-tile ${group} sliver breaks 2D shore autotiling`);
  }
}

export function isPathOrBridgeAt(
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid: readonly (readonly boolean[])[] | undefined,
  buildingMask: readonly (readonly boolean[])[],
  width: number,
  height: number,
  x: number,
  y: number
): boolean {
  if (x < 0 || x >= width || y < 0 || y >= height) return true;
  if (bridgeGrid?.[y]?.[x]) return true;
  if (buildingMask[y]?.[x]) return false;
  return Boolean(pathGrid[y]?.[x]);
}

interface PathComponentQueryInput {
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
  readonly buildingMask: readonly (readonly boolean[])[];
  readonly poiAnchorMask: readonly (readonly boolean[])[];
  readonly width: number;
  readonly height: number;
}

export const CARDINAL_DELTAS: readonly { readonly dx: number; readonly dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 }
];

function enqueuePathCardinalNeighbors(
  input: PathComponentQueryInput,
  curX: number,
  curY: number,
  visited: Set<string>,
  queue: { x: number; y: number }[]
): boolean {
  const { pathGrid, bridgeGrid, buildingMask, width, height } = input;
  for (const { dx, dy } of CARDINAL_DELTAS) {
    const nx = curX + dx;
    const ny = curY + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
    if (bridgeGrid?.[ny]?.[nx]) return true;
    if (buildingMask[ny]?.[nx] || !pathGrid[ny]?.[nx]) continue;
    const key = `${nx}_${ny}`;
    if (!visited.has(key)) {
      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return false;
}

export function isMiniatureOrphanPathBlotch(
  input: PathComponentQueryInput,
  startX: number,
  startY: number
): boolean {
  const { poiAnchorMask, bridgeGrid, width, height } = input;
  const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
  const visited = new Set<string>([`${startX}_${startY}`]);
  let head = 0;

  while (head < queue.length) {
    const cur = queue[head++]!;
    if (poiAnchorMask[cur.y]?.[cur.x] || bridgeGrid?.[cur.y]?.[cur.x]) return false;
    if (cur.x === 0 || cur.x === width - 1 || cur.y === 0 || cur.y === height - 1) return false;
    if (enqueuePathCardinalNeighbors(input, cur.x, cur.y, visited, queue)) return false;
    if (queue.length >= MIN_UNANCHORED_PATH_COMPONENT_CELLS) return false;
  }

  return true;
}

interface Neighbor2DSameFlags {
  readonly sameN: boolean;
  readonly sameS: boolean;
  readonly sameW: boolean;
  readonly sameE: boolean;
  readonly sameNW: boolean;
  readonly sameNE: boolean;
  readonly sameSW: boolean;
  readonly sameSE: boolean;
}

export function hasDropped2DInnerCorner(flags: Neighbor2DSameFlags): boolean {
  const { sameN, sameS, sameW, sameE, sameNW, sameNE, sameSW, sameSE } = flags;
  if (sameN && sameS && sameW && sameE) return false;
  return (
    (sameN && sameW && !sameNW) ||
    (sameN && sameE && !sameNE) ||
    (sameS && sameW && !sameSW) ||
    (sameS && sameE && !sameSE)
  );
}

function scanPathCell(ctx: ScanCellContext, x: number, y: number): void {
  const {
    continent,
    pathGrid,
    bridgeGrid,
    buildingMask,
    poiAnchorMask,
    stairBottomSet,
    width,
    height,
    pushDefect
  } = ctx;
  if (!pathGrid[y]?.[x] || bridgeGrid?.[y]?.[x] || buildingMask[y]?.[x]) return;

  const terrain = continent.terrainMatrix[y]?.[x] ?? 'grass';
  if (
    terrain !== 'grass' ||
    isBlockedPathElevationCell(continent.heightmap, stairBottomSet, x, y)
  ) {
    pushDefect(
      x,
      y,
      'path',
      'path_sliver_or_orphan',
      'Dirt path placed on non-grass terrain or impassable cliff wall/rim'
    );
    return;
  }

  const pN = isPathOrBridgeAt(pathGrid, bridgeGrid, buildingMask, width, height, x, y - 1);
  const pS = isPathOrBridgeAt(pathGrid, bridgeGrid, buildingMask, width, height, x, y + 1);
  const pW = isPathOrBridgeAt(pathGrid, bridgeGrid, buildingMask, width, height, x - 1, y);
  const pE = isPathOrBridgeAt(pathGrid, bridgeGrid, buildingMask, width, height, x + 1, y);

  if ((!pN && !pS) || (!pW && !pE)) {
    pushDefect(
      x,
      y,
      'path',
      'path_sliver_or_orphan',
      '1-cell thin dirt path sliver or isolated path orphan'
    );
    return;
  }

  const pNW = isPathOrBridgeAt(pathGrid, bridgeGrid, buildingMask, width, height, x - 1, y - 1);
  const pNE = isPathOrBridgeAt(pathGrid, bridgeGrid, buildingMask, width, height, x + 1, y - 1);
  const pSW = isPathOrBridgeAt(pathGrid, bridgeGrid, buildingMask, width, height, x - 1, y + 1);
  const pSE = isPathOrBridgeAt(pathGrid, bridgeGrid, buildingMask, width, height, x + 1, y + 1);

  const sePinch = x + 1 < width && y + 1 < height && pSE && !pE && !pS;
  const swPinch = x > 0 && y + 1 < height && pSW && !pW && !pS;
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
    pushDefect(
      x,
      y,
      'path',
      'path_sliver_or_orphan',
      '2x2 diagonal dirt path pinch or S-bend dropped inner corner'
    );
    return;
  }

  if (
    isMiniatureOrphanPathBlotch(
      { pathGrid, bridgeGrid, buildingMask, poiAnchorMask, width, height },
      x,
      y
    )
  ) {
    pushDefect(
      x,
      y,
      'path',
      'path_sliver_or_orphan',
      'Disconnected miniature dirt path blotch (< 8 cells)'
    );
  }
}

function isSameMacroBiomeCell(
  terrainMatrix: readonly (readonly WaterTerrainKind[])[],
  biomeGrid: readonly (readonly MacroBiome[])[],
  width: number,
  height: number,
  nx: number,
  ny: number,
  targetBiome: MacroBiome
): boolean {
  if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
  return terrainMatrix[ny]?.[nx] === 'grass' && biomeGrid[ny]?.[nx] === targetBiome;
}

function scanMacroBiomeCell(ctx: ScanCellContext, x: number, y: number): void {
  const { continent, width, height, buildingMask, pushDefect } = ctx;
  const biomeGrid = continent.macroBiomes?.biomeGrid;
  if (!biomeGrid || buildingMask[y]?.[x]) return;

  const terrainMatrix = continent.terrainMatrix;
  if (terrainMatrix[y]?.[x] !== 'grass') return;

  const biome = biomeGrid[y]?.[x];
  if (!biome || !BRUSHED_MACRO_BIOMES.has(biome)) return;

  const sameN = isSameMacroBiomeCell(terrainMatrix, biomeGrid, width, height, x, y - 1, biome);
  const sameS = isSameMacroBiomeCell(terrainMatrix, biomeGrid, width, height, x, y + 1, biome);
  const sameW = isSameMacroBiomeCell(terrainMatrix, biomeGrid, width, height, x - 1, y, biome);
  const sameE = isSameMacroBiomeCell(terrainMatrix, biomeGrid, width, height, x + 1, y, biome);

  if ((!sameN && !sameS) || (!sameW && !sameE)) {
    pushDefect(
      x,
      y,
      'macro_biome',
      'macro_biome_sliver',
      `1-tile ${biome} macro-biome sliver produces flat 90-degree grass seam`
    );
    return;
  }

  const sameNW = isSameMacroBiomeCell(terrainMatrix, biomeGrid, width, height, x - 1, y - 1, biome);
  const sameNE = isSameMacroBiomeCell(terrainMatrix, biomeGrid, width, height, x + 1, y - 1, biome);
  const sameSW = isSameMacroBiomeCell(terrainMatrix, biomeGrid, width, height, x - 1, y + 1, biome);
  const sameSE = isSameMacroBiomeCell(terrainMatrix, biomeGrid, width, height, x + 1, y + 1, biome);

  const sePinch = x + 1 < width && y + 1 < height && sameSE && !sameE && !sameS;
  const swPinch = x > 0 && y + 1 < height && sameSW && !sameW && !sameS;

  if (
    sePinch ||
    swPinch ||
    hasDropped2DInnerCorner({ sameN, sameS, sameW, sameE, sameNW, sameNE, sameSW, sameSE })
  ) {
    pushDefect(
      x,
      y,
      'macro_biome',
      'macro_biome_diagonal_pinch',
      `2x2 diagonal or S-bend ${biome} macro-biome pinch`
    );
  }
}

export function scanContinentAutotileDefects(input: DefectScannerInput): ContinentDefectScanReport {
  const { continent, pathGrid, bridgeGrid, pois, bounds } = input;
  const width = continent.width;
  const height = continent.height;

  const countsByDomain = createZeroDomainCounts();
  const countsByKind = createZeroKindCounts();
  for (const d of HEALING_DOMAINS) countsByDomain[d] = 0;
  for (const k of AUTOTILE_DEFECT_KINDS) countsByKind[k] = 0;

  if (width <= 0 || height <= 0) {
    return {
      width,
      height,
      totalDefects: 0,
      defects: [],
      countsByDomain,
      countsByKind
    };
  }

  const buildingMask = buildBuildingProtectionMask(width, height, pois);
  const poiAnchorMask = buildPoiAnchorMask(width, height, pois);
  const stairSet = new Set<string>();
  const stairBottomSet = new Set<string>();
  if (continent.placedStairs) {
    for (const st of continent.placedStairs) {
      stairSet.add(`${st.x}_${st.y}`);
      const cellL = continent.resolvedMountain.cellDetails[st.y]?.[st.x];
      const cellR = continent.resolvedMountain.cellDetails[st.y]?.[st.x + 1];
      if (cellL?.role === 'stairs_l' && cellR?.role === 'stairs_r') {
        stairBottomSet.add(`${st.x}_${st.y + 1}`);
        stairBottomSet.add(`${st.x + 1}_${st.y + 1}`);
      }
    }
  }

  const defects: AutotileDefectRecord[] = [];
  const seenCellKinds = new Set<string>();

  const pushDefect = (
    x: number,
    y: number,
    domain: HealingDomain,
    kind: AutotileDefectKind,
    description: DisplayText
  ): void => {
    const dedupeKey = `${x}_${y}_${kind}`;
    if (seenCellKinds.has(dedupeKey)) return;
    seenCellKinds.add(dedupeKey);
    defects.push({ x, y, domain, kind, description });
    countsByDomain[domain] += 1;
    countsByKind[kind] += 1;
  };

  const ctx: ScanCellContext = {
    width,
    height,
    continent,
    pathGrid,
    bridgeGrid,
    buildingMask,
    poiAnchorMask,
    stairSet,
    stairBottomSet,
    pushDefect
  };

  const minX = Math.max(0, bounds?.minX ?? 0);
  const minY = Math.max(0, bounds?.minY ?? 0);
  const maxX = Math.min(width - 1, bounds?.maxX ?? width - 1);
  const maxY = Math.min(height - 1, bounds?.maxY ?? height - 1);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      scanMountainCell(ctx, x, y);
      scanWaterAndSandCell(ctx, x, y);
      scanPathCell(ctx, x, y);
      scanMacroBiomeCell(ctx, x, y);
    }
  }

  return {
    width,
    height,
    totalDefects: defects.length,
    defects,
    countsByDomain,
    countsByKind
  };
}
