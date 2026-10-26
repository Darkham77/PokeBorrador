/**
 * test_aventura/types/map/kantoTileEngineTypes.ts
 *
 * CANONICAL TILE ENGINE & CATALOG TYPES (SSoT)
 * Pure domain contracts for tiles, prefabs, sheets, and world render sources.
 */

import type { AssetUri, DisplayText } from '@francogp/auditor';

export interface CatalogPart {
  readonly sheet: AssetUri;
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
  readonly dx: number;
  readonly dy: number;
  readonly layerIndex?: number;
  readonly zIndex?: number;
}

export interface CatalogPrefab {
  readonly id: DisplayText;
  readonly name?: DisplayText;
  readonly width?: number;
  readonly height?: number;
  readonly parts: readonly CatalogPart[];
}

export interface CatalogAutotileLayout {
  readonly pieces: Record<DisplayText, { sx: number; sy: number }>;
}

export interface SemanticTileCatalog {
  readonly version: DisplayText;
  readonly tileSize: number;
  readonly sheets: Record<DisplayText, { file: AssetUri; width: number; height: number }>;
  readonly prefabs?: Record<DisplayText, Record<DisplayText, CatalogPrefab>>;
  readonly autotileLayout?: {
    standardLPC?: CatalogAutotileLayout;
  };
}

export interface PlacedStructure {
  readonly style: DisplayText;
  readonly x: number;
  readonly y: number;
  readonly w?: number;
  readonly h?: number;
}

export interface IRegionalWorldRendererSource {
  readonly grid: Uint8Array[];
  readonly elevation?: Uint8Array[];
  readonly trees: PlacedStructure[];
  readonly buildings: PlacedStructure[];
  readonly bridges: PlacedStructure[];
  readonly props: PlacedStructure[];
  readonly nature: PlacedStructure[];
}
