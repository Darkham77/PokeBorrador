/**
 * src/types/map/continentTypes.ts
 *
 * DOMAIN CONTRACTS & TYPES FOR CONTINENTAL MAP STUDIO
 * Strict Domain-Type-First governance for procedural continental generation,
 * bidirectional SVG routes, and unsupervised sprite pipelines.
 */

import type { AssetUri, DisplayText, HexColor } from '@francogp/auditor';

export const CONTINENT_BIOMES = [
  'ocean',
  'beach',
  'grass',
  'forest',
  'mountain',
  'snow',
  'path'
] as const;

export type ContinentBiomeType = (typeof CONTINENT_BIOMES)[number];

export const CONTINENT_AMENITIES = ['center', 'mart', 'gym', 'lab'] as const;
export type ContinentAmenity = (typeof CONTINENT_AMENITIES)[number];

export const URBAN_SCALES = ['hamlet', 'village', 'town', 'city', 'metropolis'] as const;
export type UrbanScale = (typeof URBAN_SCALES)[number];

export const CONTINENT_RENDER_MODES = ['tiles_only', 'hybrid', 'pokégear'] as const;
export type ContinentRenderMode = (typeof CONTINENT_RENDER_MODES)[number];

export const SPRITE_CATEGORIES = [
  'tree',
  'mountain',
  'water_edge',
  'snow',
  'building',
  'prop',
  'path',
  'decor'
] as const;
export type SpriteCategory = (typeof SPRITE_CATEGORIES)[number];

export const CANONICAL_PRESET_IDS = ['kanto', 'johto', 'archipelago', 'glacial'] as const;
export type CanonicalPresetId = (typeof CANONICAL_PRESET_IDS)[number];

export interface ContinentDimensions {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
}

export interface BiomeDistributionConfig {
  readonly waterPercent: number;
  readonly forestPercent: number;
  readonly mountainPercent: number;
  readonly snowPercent: number;
  readonly beachPercent: number;
}

export const CONTINENT_GENERATION_MODES = ['preset', 'procedural'] as const;
export type ContinentGenerationMode = (typeof CONTINENT_GENERATION_MODES)[number];

export interface ContinentGenConfig {
  readonly seed: number;
  readonly dimensions: ContinentDimensions;
  readonly cityCount: number;
  readonly biomes: BiomeDistributionConfig;
  readonly roadWidth: number;
  readonly presetId?: CanonicalPresetId;
  readonly generationMode?: ContinentGenerationMode;
}

export interface ContinentNode {
  readonly id: DisplayText;
  readonly name: DisplayText;
  readonly x: number;
  readonly y: number;
  readonly scale: UrbanScale;
  readonly amenities: readonly ContinentAmenity[];
}

export type ContinentConnection = readonly [DisplayText, DisplayText];

export interface PlacedCustomSprite {
  readonly id: DisplayText;
  readonly spriteId: DisplayText;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly category: SpriteCategory;
}

export interface ContinentProject {
  readonly id: DisplayText;
  readonly name: DisplayText;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly config: ContinentGenConfig;
  readonly nodes: Record<DisplayText, ContinentNode>;
  readonly connections: readonly ContinentConnection[];
  readonly customTerrain: Record<DisplayText, ContinentBiomeType>;
  readonly placedSprites: readonly PlacedCustomSprite[];
  readonly schemaVersion?: number;
}

export interface SvgImportResult {
  readonly nodes: Record<DisplayText, ContinentNode>;
  readonly connections: readonly ContinentConnection[];
  readonly dimensions?: { readonly width: number; readonly height: number };
}

export interface SlicedSpriteMetadata {
  readonly id: DisplayText;
  readonly name: DisplayText;
  readonly category: SpriteCategory;
  readonly biome?: ContinentBiomeType;
  readonly width: number;
  readonly height: number;
  readonly dataUrl: AssetUri;
  readonly dominantColors: readonly HexColor[];
}
