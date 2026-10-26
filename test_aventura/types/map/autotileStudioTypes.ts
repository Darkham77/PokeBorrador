/**
 * src/types/map/autotileStudioTypes.ts
 *
 * STRICT DOMAIN CONTRACTS FOR AUTOTILE STUDIO & REAL PATCH INSPECTOR
 * Adheres to @/domain-type-first with zero-any and immutable readonly data models.
 */

import type { AssetUri, DisplayText, IsoDateString } from '@francogp/auditor';

export const AUTOTILE_ENGINE_IDS = ['water', 'path', 'macro_biome', 'mountain'] as const;
export type AutotileEngineId = (typeof AUTOTILE_ENGINE_IDS)[number];

export const BITMASK_ROLE_CATEGORIES = [
  'all',
  'edge',
  'outer_corner',
  'inner_corner',
  't_junction',
  'isolated',
  'center'
] as const;
export type BitmaskRoleCategory = (typeof BITMASK_ROLE_CATEGORIES)[number];

export const CONTINENT_TRANSITION_CATEGORIES = [
  'water_coast',
  'mountain_cliff',
  'path',
  'macro_biome'
] as const;
export type ContinentTransitionCategory = (typeof CONTINENT_TRANSITION_CATEGORIES)[number];

export const MOUNTAIN_PATCH_SUBTYPES = [
  'all',
  'multi_tier',
  'stairs',
  'south_wall',
  'corners',
  'base_cliff'
] as const;
export type MountainPatchSubtype = (typeof MOUNTAIN_PATCH_SUBTYPES)[number];

export const REAL_PATCH_CATEGORIES = ['all', ...CONTINENT_TRANSITION_CATEGORIES] as const;
export type RealPatchCategory = (typeof REAL_PATCH_CATEGORIES)[number];

export interface CanonicalBitmaskCase {
  readonly bitmask: number;
  readonly category: BitmaskRoleCategory;
  readonly label: DisplayText;
  readonly grid3x3: readonly (readonly boolean[])[];
}

export interface ResolvedPatchCell {
  readonly x?: number;
  readonly y?: number;
  readonly filename: AssetUri;
  readonly layerStack: readonly AssetUri[];
  readonly isCenter: boolean;
  readonly roleName?: DisplayText;
  readonly terrainKind?: DisplayText;
  readonly elevation?: number;
}

export interface ResolvedPatch {
  readonly bitmaskCase: CanonicalBitmaskCase;
  readonly engineId: AutotileEngineId;
  readonly cells: readonly (readonly ResolvedPatchCell[])[];
  readonly centerRole: DisplayText;
  readonly centerTile: AssetUri;
  readonly centerLayerStack: readonly AssetUri[];
}

export interface TileBlitInstruction {
  readonly filename: AssetUri;
  readonly px: number;
  readonly py: number;
}

export interface RealContinentPatch {
  readonly id: DisplayText;
  readonly seed: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly category: ContinentTransitionCategory;
  readonly title: DisplayText;
  readonly description: DisplayText;
  readonly cells: readonly (readonly ResolvedPatchCell[])[];
  readonly centerCell: ResolvedPatchCell;
  readonly radius: number;
  readonly instructions: readonly TileBlitInstruction[];
  readonly mountainSubtype?: MountainPatchSubtype;
  readonly maxElevationInPatch?: number;
  readonly minElevationInPatch?: number;
}

export const NEIGHBOR_DIRECTIONS = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'] as const;
export type NeighborDirection = (typeof NEIGHBOR_DIRECTIONS)[number];

export interface NeighborCellSummary {
  readonly dir: NeighborDirection;
  readonly x: number;
  readonly y: number;
  readonly terrain: DisplayText;
  readonly tile: AssetUri;
  readonly elevation?: number;
}

export interface CellNeighborhood {
  readonly cells: readonly (readonly NeighborCellSummary[])[]; // 3x3 grid
  readonly asciiGrid: DisplayText;
}

export interface AutotileErrorReport {
  readonly id: DisplayText;
  readonly seed: number;
  readonly patchCenterX: number;
  readonly patchCenterY: number;
  readonly tileX: number;
  readonly tileY: number;
  readonly category: DisplayText;
  readonly currentTile: AssetUri;
  readonly currentRole?: DisplayText;
  readonly layerStack: readonly AssetUri[];
  readonly neighborhood?: CellNeighborhood;
  readonly note?: DisplayText;
  readonly expectedRoleOrTile?: DisplayText;
  readonly timestamp: IsoDateString;
}
