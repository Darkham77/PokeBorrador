/**
 * src/types/map/autotileStudioTypes.ts
 *
 * STRICT DOMAIN CONTRACTS FOR AUTOTILE STUDIO & REAL PATCH INSPECTOR
 * Adheres to @/domain-type-first with zero-any and immutable readonly data models.
 */

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

export const REAL_PATCH_CATEGORIES = [
  'all',
  ...CONTINENT_TRANSITION_CATEGORIES
] as const;
export type RealPatchCategory = (typeof REAL_PATCH_CATEGORIES)[number];

export interface CanonicalBitmaskCase {
  readonly bitmask: number;
  readonly category: BitmaskRoleCategory;
  readonly label: string; // domain-ok: human readable case description
  readonly grid3x3: readonly (readonly boolean[])[];
}

export interface ResolvedPatchCell {
  readonly x?: number;
  readonly y?: number;
  readonly filename: string; // domain-ok: primary asset filename on disk
  readonly layerStack: readonly string[]; // domain-ok: ordered composite layer stack
  readonly isCenter: boolean;
  readonly roleName?: string; // domain-ok: descriptive role identifier
  readonly terrainKind?: string; // domain-ok: terrain descriptor
  readonly elevation?: number;
}

export interface ResolvedPatch {
  readonly bitmaskCase: CanonicalBitmaskCase;
  readonly engineId: AutotileEngineId;
  readonly cells: readonly (readonly ResolvedPatchCell[])[];
  readonly centerRole: string; // domain-ok: resolved role identifier
  readonly centerTile: string; // domain-ok: primary tile filename
  readonly centerLayerStack: readonly string[]; // domain-ok: layer stack filenames
}

export interface TileBlitInstruction {
  readonly filename: string; // domain-ok: canonical asset filename
  readonly px: number;
  readonly py: number;
}

export interface RealContinentPatch {
  readonly id: string; // domain-ok: unique patch identifier
  readonly seed: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly category: ContinentTransitionCategory;
  readonly title: string; // domain-ok: human readable patch title
  readonly description: string; // domain-ok: geographic feature description
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
  readonly terrain: string; // domain-ok: base terrain or void
  readonly tile: string; // domain-ok: top tile filename
  readonly elevation?: number;
}

export interface CellNeighborhood {
  readonly cells: readonly (readonly NeighborCellSummary[])[]; // 3x3 grid
  readonly asciiGrid: string; // domain-ok: formatted 3x3 ASCII text block
}

export interface AutotileErrorReport {
  readonly id: string; // domain-ok: composite report id
  readonly seed: number;
  readonly patchCenterX: number;
  readonly patchCenterY: number;
  readonly tileX: number;
  readonly tileY: number;
  readonly category: string; // domain-ok: feature category
  readonly currentTile: string; // domain-ok: current tile filename
  readonly currentRole?: string; // domain-ok: current role identifier
  readonly layerStack: readonly string[]; // domain-ok: current layer stack
  readonly neighborhood?: CellNeighborhood;
  readonly note?: string; // domain-ok: user note describing the bug
  readonly expectedRoleOrTile?: string; // domain-ok: user expected tile or role
  readonly timestamp: string; // domain-ok: ISO 8601 timestamp
}
