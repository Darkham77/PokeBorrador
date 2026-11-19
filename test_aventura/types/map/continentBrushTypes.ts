/**
 * test_aventura/types/map/continentBrushTypes.ts
 *
 * STRICT DOMAIN CONTRACTS FOR THE CONTINENT MAP CREATIVE BRUSH,
 * DELTA UNDO HISTORY, EYEDROPPER SAMPLING, AND SPARSE MANUAL EDIT PERSISTENCE.
 */

import type { DisplayText } from '@francogp/auditor';

import type { ContinentMapResult } from '../../logic/map/continentGenerator.ts';
import type { MacroBiome } from '../../logic/map/macroBiomeSynthesizer.ts';
import type {
  MountainPalette,
  MountainStairLocation
} from '../../logic/map/mountainAutotileEngine.ts';
import type { WaterTerrainKind } from '../../logic/map/waterAutotileEngine.ts';
import type {
  TreePlacement,
  WildernessLayerResult,
  WildernessPropPlacement
} from '../../logic/map/wildernessVegetationEngine.ts';
import type { ContinentHealingSummary, DirtyTileBounds } from './autotileHealingTypes.ts';
import type { POINode } from './poiTypes.ts';

const BRUSH_MODES = ['heal', 'paint', 'line', 'fill', 'eyedropper'] as const;
export type BrushMode = (typeof BRUSH_MODES)[number];

const BRUSH_SHAPES = ['square', 'circle'] as const;
export type BrushShape = (typeof BRUSH_SHAPES)[number];

export const BRUSH_SIZE_OPTIONS = [1, 3, 5, 9, 15] as const;
export type BrushSizeOption = (typeof BRUSH_SIZE_OPTIONS)[number];

const MOUNTAIN_HEAL_POLICIES = ['erode', 'fill'] as const;
export type MountainHealPolicy = (typeof MOUNTAIN_HEAL_POLICIES)[number];

const BRUSH_TARGET_CATEGORIES = ['terrain', 'mountain', 'biome', 'route', 'wilderness'] as const;
export type BrushTargetCategory = (typeof BRUSH_TARGET_CATEGORIES)[number];

const TERRAIN_PAINT_TARGETS = [
  'terrain_water_deep',
  'terrain_water',
  'terrain_sand',
  'terrain_grass',
  'biome_temperate_meadow',
  'biome_mint_highland',
  'biome_viridian_forest',
  'biome_arid_desert',
  'biome_volcanic_plateau',
  'elevation_raise',
  'elevation_lower',
  'mountain_palette',
  'mountain_stair',
  'path_dirt',
  'bridge_wood',
  'wilderness_tall_grass',
  'wilderness_tree',
  'wilderness_prop',
  'eraser_overlay'
] as const;
export type TerrainPaintTarget = (typeof TERRAIN_PAINT_TARGETS)[number];

export interface GridPoint2D {
  readonly x: number;
  readonly y: number;
}

export interface BrushConfigState {
  readonly mode: BrushMode;
  readonly shape: BrushShape;
  readonly size: BrushSizeOption;
  readonly paintTarget: TerrainPaintTarget;
  readonly mountainPalette: MountainPalette;
  readonly mountainPolicy: MountainHealPolicy;
  readonly autoHealOnPaint: boolean;
}

export interface DirtyRectHistoryDelta {
  readonly bounds: DirtyTileBounds;
  readonly beforeTerrainRows: readonly (readonly WaterTerrainKind[])[];
  readonly afterTerrainRows: readonly (readonly WaterTerrainKind[])[];
  readonly beforeHeightRows: readonly (readonly number[])[];
  readonly afterHeightRows: readonly (readonly number[])[];
  readonly beforeBiomeRows: readonly (readonly MacroBiome[])[];
  readonly afterBiomeRows: readonly (readonly MacroBiome[])[];
  readonly beforeBufferRows: readonly (readonly boolean[])[];
  readonly afterBufferRows: readonly (readonly boolean[])[];
  readonly beforePaletteRows: readonly (readonly MountainPalette[])[];
  readonly afterPaletteRows: readonly (readonly MountainPalette[])[];
  readonly beforePathRows: readonly (readonly boolean[])[];
  readonly afterPathRows: readonly (readonly boolean[])[];
  readonly beforeManualPathRows: readonly (readonly boolean[])[];
  readonly afterManualPathRows: readonly (readonly boolean[])[];
  readonly beforeBridgeRows: readonly (readonly boolean[])[];
  readonly afterBridgeRows: readonly (readonly boolean[])[];
  readonly beforeTallGrassRows: readonly (readonly boolean[])[];
  readonly afterTallGrassRows: readonly (readonly boolean[])[];
  readonly beforeStairs: readonly MountainStairLocation[];
  readonly afterStairs: readonly MountainStairLocation[];
  readonly beforeTrees: readonly TreePlacement[];
  readonly afterTrees: readonly TreePlacement[];
  readonly beforeProps: readonly WildernessPropPlacement[];
  readonly afterProps: readonly WildernessPropPlacement[];
  readonly summary: ContinentHealingSummary;
}

export interface PaintSampleResult {
  readonly x: number;
  readonly y: number;
  readonly recommendedTarget: TerrainPaintTarget;
  readonly recommendedPalette: MountainPalette;
  readonly terrain: WaterTerrainKind;
  readonly elevation: number;
  readonly biome: MacroBiome;
  readonly hasPath: boolean;
  readonly hasBridge: boolean;
  readonly description: DisplayText;
}

export interface ContinentPaintStateInput {
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly manualPathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid: readonly (readonly boolean[])[];
  readonly wilderness: WildernessLayerResult | null;
  readonly pois: readonly POINode[];
}

export interface ContinentPaintMutationResult {
  readonly continent: ContinentMapResult;
  readonly pathGrid: boolean[][];
  readonly manualPathGrid: boolean[][];
  readonly bridgeGrid: boolean[][];
  readonly wilderness: WildernessLayerResult | null;
  readonly summary: ContinentHealingSummary;
  readonly changedCellCount: number;
  readonly floodCapReached?: boolean;
}

export interface ManualMapCellEditPatch {
  readonly x: number;
  readonly y: number;
  readonly terrain?: WaterTerrainKind;
  readonly elevation?: number;
  readonly biome?: MacroBiome;
  readonly mountainPalette?: MountainPalette;
  readonly path?: boolean;
  readonly manualPath?: boolean;
  readonly bridge?: boolean;
  readonly tallGrass?: boolean;
}

export interface SerializedContinentManualEdits {
  readonly cells: readonly ManualMapCellEditPatch[];
  readonly stairs?: readonly MountainStairLocation[];
  readonly trees?: readonly TreePlacement[];
  readonly props?: readonly WildernessPropPlacement[];
}

export interface CameraFocusRequest {
  readonly requestId: number;
  readonly gridX: number;
  readonly gridY: number;
  readonly minZoom: number;
}
