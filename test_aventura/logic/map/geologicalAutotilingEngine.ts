/**
 * src/logic/map/geologicalAutotilingEngine.ts
 *
 * UNIFIED GEOLOGICAL AUTOTILING ENGINE
 *
 * Executes the unified autotiling pass across water, mountains, macro-biomes,
 * and cell details on the final, carved terrain and heightmap matrices.
 */

import { DEFAULT_MOUNTAIN_PALETTE } from '../../config/studioConstants.ts';
import type { ProceduralRiverDrainageResult } from './continent/riverHydrographyEngine.ts';
import {
  resolveMacroBiomeAutotile,
  type ResolvedMacroBiomeMapResult
} from './macroBiomeAutotileEngine.ts';
import type { MacroBiomeResult, MacroBiome } from './macroBiomeSynthesizer.ts';
import {
  resolveMountainMapGrid,
  type ResolvedMountainMapResult,
  type ResolvedMountainCell,
  type MountainPalette,
  type MountainStairLocation,
  type MountainRole
} from './mountainAutotileEngine.ts';
import {
  resolveWaterCoastGrid,
  sanitizeWaterTerrainMatrix,
  type WaterTerrainKind,
  type WaterTerrainMatrix,
  type ResolvedWaterMapResult,
  type WaterAutotileRole
} from './waterAutotileEngine.ts';

export interface ContinentCellDetails {
  readonly x: number;
  readonly y: number;
  readonly terrain: WaterTerrainKind;
  readonly elevation: number;
  readonly macroBiome?: MacroBiome;
  readonly mountainPalette?: MountainPalette;
  readonly waterRole?: WaterAutotileRole;
  readonly mountainRole?: MountainRole;
  readonly isStair?: boolean;
  readonly isWalkable: boolean;
  readonly layerStack: readonly string[];
}

export interface GeologicalAutotilingPassOptions {
  readonly seed?: number;
  readonly mountainPalette?: MountainPalette;
  readonly paletteMatrix?: readonly (readonly MountainPalette[])[];
  readonly placedStairs?: readonly MountainStairLocation[];
  readonly riverDrainage?: ProceduralRiverDrainageResult;
}

function applyMountainCellLayers(
  mtnCell: ResolvedMountainCell,
  elev: number,
  layerStack: string[]
): { isWalkable: boolean; isStair: boolean } {
  const isStair = mtnCell.role === 'stairs_l' || mtnCell.role === 'stairs_r';
  if (elev > 0) {
    layerStack.push(mtnCell.primaryTile);
    if (mtnCell.overlayTiles && mtnCell.overlayTiles.length > 0) {
      layerStack.push(...mtnCell.overlayTiles);
    }
  }
  let isWalkable = true;
  if (
    mtnCell.role === 'peak_isolated' ||
    mtnCell.role.startsWith('edge_') ||
    mtnCell.role.startsWith('corner_outer_')
  ) {
    isWalkable = false;
  }
  if (isStair) {
    isWalkable = true;
  }
  return { isWalkable, isStair };
}

function applyNorthCliffFootOverlay(
  northMtn: ResolvedMountainCell | null | undefined,
  isRiverChannel: boolean,
  terrain: WaterTerrainKind,
  layerStack: string[]
): { overrideWalkable?: boolean; overrideStair?: boolean } {
  if (!northMtn?.projectedFoot || isRiverChannel) return {};
  layerStack.push(northMtn.projectedFoot.tile);
  if (northMtn.projectedFoot.occupiesCell && terrain !== 'water') {
    return { overrideWalkable: false };
  }
  if (!northMtn.projectedFoot.occupiesCell) {
    return { overrideWalkable: true, overrideStair: true };
  }
  return {};
}

/**
 * Executes the unified geological autotiling pass across water, mountains, macro-biomes,
 * and cell details on the final, carved terrain and heightmap matrices.
 */
export function compileGeologicalAutotiling(
  terrainMatrix: WaterTerrainMatrix,
  heightmap: readonly (readonly number[])[],
  macroBiomes: MacroBiomeResult,
  options?: GeologicalAutotilingPassOptions
): {
  readonly sanitizedWaterMatrix: WaterTerrainMatrix;
  readonly resolvedWater: ResolvedWaterMapResult;
  readonly resolvedMountain: ResolvedMountainMapResult;
  readonly resolvedMacroBiomes: ResolvedMacroBiomeMapResult;
  readonly cells: readonly (readonly ContinentCellDetails[])[];
} {
  const H = terrainMatrix.length;
  const W = terrainMatrix[0]?.length ?? 0;
  const sanitizedWaterMatrix = sanitizeWaterTerrainMatrix(terrainMatrix);
  const resolvedWater = resolveWaterCoastGrid(sanitizedWaterMatrix);

  const mountainResult = resolveMountainMapGrid(heightmap, {
    palette: options?.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE,
    paletteMatrix: options?.paletteMatrix,
    stairs: options?.placedStairs ? [...options.placedStairs] : []
  });

  const resolvedMacroBiomes = resolveMacroBiomeAutotile(
    macroBiomes.biomeGrid,
    sanitizedWaterMatrix,
    heightmap
  );

  const cells: ContinentCellDetails[][] = Array.from({ length: H }, () => Array(W));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const terrain = sanitizedWaterMatrix[y]![x]!;
      const elev = heightmap[y]![x]!;
      const waterCell = resolvedWater.cellDetails[y]![x];
      const mtnCell = mountainResult.cellDetails[y]?.[x];
      const mBiome = macroBiomes.biomeGrid[y]?.[x];

      const layerStack: string[] = []; // no-domain: Estructura o identificador procedural de aventura
      let isWalkable = terrain !== 'water' && terrain !== 'water_deep';
      let isStair = false;
      let mtnRole: MountainRole | undefined;

      if (waterCell?.primaryTile) layerStack.push(waterCell.primaryTile);
      if (mtnCell) {
        mtnRole = mtnCell.role;
        const mtnStatus = applyMountainCellLayers(mtnCell, elev, layerStack);
        isStair = mtnStatus.isStair;
        if (!mtnStatus.isWalkable) {
          isWalkable = false;
        }
      }

      if (y > 0) {
        const northMtn = mountainResult.cellDetails[y - 1]![x];
        const isRiverChannel = options?.riverDrainage?.riverGrid?.[y]?.[x] ?? false;
        const footStatus = applyNorthCliffFootOverlay(
          northMtn,
          isRiverChannel,
          terrain,
          layerStack
        );
        if (footStatus.overrideWalkable !== undefined) {
          isWalkable = footStatus.overrideWalkable;
        }
        if (footStatus.overrideStair !== undefined) {
          isStair = footStatus.overrideStair;
        }
      }

      cells[y]![x] = {
        x,
        y,
        terrain,
        elevation: elev,
        macroBiome: mBiome,
        mountainPalette: options?.paletteMatrix?.[y]?.[x] ?? options?.mountainPalette ?? 'brown',
        waterRole: waterCell?.role,
        mountainRole: mtnRole,
        isStair,
        isWalkable,
        layerStack
      };
    }
  }

  return {
    sanitizedWaterMatrix,
    resolvedWater,
    resolvedMountain: mountainResult,
    resolvedMacroBiomes,
    cells
  };
}
