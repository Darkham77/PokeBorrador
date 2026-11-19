/**
 * test_aventura/logic/map/continentWildernessSync.ts
 *
 * Shared SSoT wilderness overlay synchronization helper for both local brush
 * mutations and background full-map Heal-All worker passes.
 * Keeps `tallGrassGrid`, `trees`, and `props` consistent with underlying
 * terrain, elevation, cliff foot occupancy, paths, bridges, and buildings.
 */

import type { DirtyTileBounds } from '../../types/map/autotileHealingTypes.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import { clampDirtyBounds } from '../utils/gridGeometryUtils.ts';
import { buildBuildingProtectionMask } from './autotileDefectScanner.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import {
  type TreePlacement,
  type WildernessLayerResult,
  type WildernessPropPlacement,
  type WildernessPropType
} from './wildernessVegetationEngine.ts';

const ALLOWED_SAND_PROP_TYPES: ReadonlySet<WildernessPropType> = new Set<WildernessPropType>([
  'boulder',
  'fence_h',
  'fence_v'
]);

export interface WildernessPruneInput {
  readonly wilderness: WildernessLayerResult | null | undefined;
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
  readonly pois?: readonly POINode[];
  readonly bounds?: DirtyTileBounds;
}

export interface WildernessPruneResult {
  readonly wilderness: WildernessLayerResult | null;
  readonly prunedTreeCount: number;
  readonly prunedPropCount: number;
  readonly prunedTallGrassCount: number;
}

function isTreeStillValid(
  t: TreePlacement,
  continent: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid: readonly (readonly boolean[])[] | undefined,
  buildingMask: readonly (readonly boolean[])[],
  tallGrassGrid: readonly (readonly boolean[])[]
): boolean {
  const canopyOverhang = Math.max(0, t.height - 2);
  const startY = t.y - canopyOverhang;
  const endY = t.y + 1;
  const endX = t.x + t.width - 1;

  if (startY < 0 || endY >= continent.height || t.x < 0 || endX >= continent.width) {
    return false;
  }

  for (let cy = startY; cy <= endY; cy++) {
    for (let cx = t.x; cx <= endX; cx++) {
      if (continent.terrainMatrix[cy]?.[cx] !== 'grass') return false;
      if ((continent.heightmap[cy]?.[cx] ?? 0) !== 0) return false;
      if (continent.resolvedMountain.occupiedFootCells[cy]?.[cx]) return false;
      if (buildingMask[cy]?.[cx] || pathGrid[cy]?.[cx] || bridgeGrid?.[cy]?.[cx]) return false;
      if (tallGrassGrid[cy]?.[cx]) return false;
    }
  }
  return true;
}

function isPropStillValid(
  prop: WildernessPropPlacement,
  continent: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid: readonly (readonly boolean[])[] | undefined,
  buildingMask: readonly (readonly boolean[])[]
): boolean {
  const { x, y, type } = prop;
  if (x < 0 || x >= continent.width || y < 0 || y >= continent.height) return false;
  if (buildingMask[y]?.[x] || pathGrid[y]?.[x] || bridgeGrid?.[y]?.[x]) return false;
  if ((continent.heightmap[y]?.[x] ?? 0) !== 0) return false;
  if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return false;

  const terr = continent.terrainMatrix[y]?.[x];
  if (terr === 'grass') return true;
  return terr === 'sand' && ALLOWED_SAND_PROP_TYPES.has(type);
}

function doesTreeOverlapBounds(t: TreePlacement, bounds: DirtyTileBounds): boolean {
  const startY = t.y - Math.max(0, t.height - 2);
  const endY = t.y + 1;
  const endX = t.x + t.width - 1;
  return endX >= bounds.minX && t.x <= bounds.maxX && endY >= bounds.minY && startY <= bounds.maxY;
}

function isPointInsideBounds(x: number, y: number, bounds: DirtyTileBounds): boolean {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

function pruneTallGrassRowsInBounds(
  tallGrassGrid: readonly (readonly boolean[])[],
  continent: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid: readonly (readonly boolean[])[] | undefined,
  buildingMask: readonly (readonly boolean[])[],
  bounds: DirtyTileBounds
): { readonly nextGrid: boolean[][]; readonly prunedCount: number } {
  const nextGrid: boolean[][] = tallGrassGrid.map((row) => row as boolean[]);
  let prunedCount = 0;

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    const srcRow = tallGrassGrid[y];
    if (!srcRow) continue;
    let copiedRow: boolean[] | null = null;

    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (!srcRow[x]) continue;
      const isInvalid =
        continent.terrainMatrix[y]?.[x] !== 'grass' ||
        (continent.heightmap[y]?.[x] ?? 0) !== 0 ||
        Boolean(continent.resolvedMountain.occupiedFootCells[y]?.[x]) ||
        Boolean(buildingMask[y]?.[x]) ||
        Boolean(pathGrid[y]?.[x]) ||
        Boolean(bridgeGrid?.[y]?.[x]);

      if (isInvalid) {
        if (!copiedRow) {
          copiedRow = [...srcRow];
          nextGrid[y] = copiedRow;
        }
        copiedRow[x] = false;
        prunedCount += 1;
      }
    }
  }

  return { nextGrid, prunedCount };
}

/**
 * Prunes invalidated tall grass, trees, and wilderness props inside `bounds`
 * (or across the full map when `bounds` is omitted) using row Copy-on-Write.
 */
export function pruneWildernessInBounds(input: WildernessPruneInput): WildernessPruneResult {
  const { wilderness, continent, pathGrid, bridgeGrid, pois } = input;
  if (!wilderness) {
    return { wilderness: null, prunedTreeCount: 0, prunedPropCount: 0, prunedTallGrassCount: 0 };
  }

  const W = continent.width;
  const H = continent.height;
  const activeBounds: DirtyTileBounds = input.bounds
    ? clampDirtyBounds(input.bounds, W, H)
    : { minX: 0, minY: 0, maxX: Math.max(0, W - 1), maxY: Math.max(0, H - 1) };

  const buildingMask = buildBuildingProtectionMask(W, H, pois);
  const tallGrassRes = pruneTallGrassRowsInBounds(
    wilderness.tallGrassGrid,
    continent,
    pathGrid,
    bridgeGrid,
    buildingMask,
    activeBounds
  );

  let prunedTreeCount = 0;
  const nextTrees = wilderness.trees.filter((t) => {
    if (input.bounds && !doesTreeOverlapBounds(t, activeBounds)) return true;
    const valid = isTreeStillValid(
      t,
      continent,
      pathGrid,
      bridgeGrid,
      buildingMask,
      tallGrassRes.nextGrid
    );
    if (!valid) prunedTreeCount += 1;
    return valid;
  });

  let prunedPropCount = 0;
  const nextProps = wilderness.props.filter((p) => {
    if (input.bounds && !isPointInsideBounds(p.x, p.y, activeBounds)) return true;
    const valid = isPropStillValid(p, continent, pathGrid, bridgeGrid, buildingMask);
    if (!valid) prunedPropCount += 1;
    return valid;
  });

  if (tallGrassRes.prunedCount === 0 && prunedTreeCount === 0 && prunedPropCount === 0) {
    return {
      wilderness,
      prunedTreeCount: 0,
      prunedPropCount: 0,
      prunedTallGrassCount: 0
    };
  }

  return {
    wilderness: {
      tallGrassGrid: tallGrassRes.nextGrid,
      tallGrassPatches: wilderness.tallGrassPatches,
      trees: nextTrees,
      props: nextProps
    },
    prunedTreeCount,
    prunedPropCount,
    prunedTallGrassCount: tallGrassRes.prunedCount
  };
}
