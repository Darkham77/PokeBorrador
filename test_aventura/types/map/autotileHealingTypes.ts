/**
 * test_aventura/types/map/autotileHealingTypes.ts
 *
 * STRICT DOMAIN CONTRACTS FOR AUTOTILE DEFECT SCANNER & HEALING BRUSH ENGINE
 * Adheres strictly to @/domain-type-first with zero-any and immutable readonly data models.
 */

import type { DisplayText, IsoDateString } from '@francogp/auditor';

import type { WaterTerrainKind } from '../../logic/map/waterAutotileEngine.ts';
import type { POINode } from './poiTypes.ts';

export const HEALING_DOMAINS = ['auto', 'path', 'mountain', 'water', 'macro_biome'] as const;
export type HealingDomain = (typeof HEALING_DOMAINS)[number];

export type CoastalTerrainGroup = Exclude<WaterTerrainKind, 'water_deep'>;

export const AUTOTILE_DEFECT_KINDS = [
  'mountain_water_overlap',
  'mountain_south_water_overhang',
  'mountain_thin_ridge',
  'mountain_diagonal_pinch',
  'mountain_steep_drop',
  'mountain_invalid_stair',
  'water_sliver',
  'water_diagonal_pinch',
  'sand_dual_boundary_pinch',
  'ocean_grass_direct_contact',
  'path_sliver_or_orphan',
  'macro_biome_sliver',
  'macro_biome_diagonal_pinch'
] as const;
export type AutotileDefectKind = (typeof AUTOTILE_DEFECT_KINDS)[number];

export interface DirtyTileBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface AutotileDefectRecord {
  readonly x: number;
  readonly y: number;
  readonly domain: HealingDomain;
  readonly kind: AutotileDefectKind;
  readonly description: DisplayText;
}

export interface ContinentDefectScanReport {
  readonly width: number;
  readonly height: number;
  readonly totalDefects: number;
  readonly defects: readonly AutotileDefectRecord[];
  readonly countsByDomain: Readonly<Record<HealingDomain, number>>;
  readonly countsByKind: Readonly<Record<AutotileDefectKind, number>>;
}

export interface AutotileHealingOptions {
  readonly domain?: HealingDomain;
  readonly radius?: number;
  readonly pois?: readonly POINode[];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
}

export interface ContinentHealingSummary {
  readonly targetX: number;
  readonly targetY: number;
  readonly detectedDomain: HealingDomain;
  readonly targetRole: DisplayText;
  readonly dirtyBounds: DirtyTileBounds;
  readonly defectsBefore: number;
  readonly defectsAfter: number;
  readonly repairedCount: number;
  readonly timestamp: IsoDateString;
}
