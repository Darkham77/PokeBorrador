/**
 * test_aventura/types/map/kantoTileEngineTypes.ts
 *
 * CANONICAL TILE ENGINE & CATALOG TYPES (SSoT)
 * Pure domain contracts for tiles, prefabs, sheets, and world render sources.
 */

export interface CatalogPart {
  readonly sheet: string; // domain-ok: dynamic spritesheet filename or identifier
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
  readonly id: string; // domain-ok: dynamic prefab identifier
  readonly name?: string; // domain-ok: human readable prefab name
  readonly width?: number;
  readonly height?: number;
  readonly parts: readonly CatalogPart[];
}

export interface CatalogAutotileLayout {
  readonly pieces: Record<string, { sx: number; sy: number }>; // domain-ok: dynamic autotile piece key mapping
}

export interface SemanticTileCatalog {
  readonly version: string; // domain-ok: semver catalog version string
  readonly tileSize: number;
  readonly sheets: Record<string, { file: string; width: number; height: number }>; // domain-ok: dynamic sheet key mapping
  readonly prefabs?: Record<string, Record<string, CatalogPrefab>>; // domain-ok: dynamic category and prefab hierarchy
  readonly autotileLayout?: {
    standardLPC?: CatalogAutotileLayout;
  };
}

export interface PlacedStructure {
  readonly style: string; // domain-ok: dynamic structure prefab style name
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
