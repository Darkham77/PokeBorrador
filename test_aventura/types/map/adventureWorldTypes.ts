import type { AssetUri, DisplayText, IsoDateString } from '@francogp/auditor';

import type { CellBiomeType } from './kantoGridModel.ts';
import type { PlacedStructure } from './kantoTileEngineTypes.ts';
import type { GeneratedMap } from './proceduralMapTypes.ts';
export type { GeneratedMap };
import type { StructureTemplate } from '../../config/mapStructures.ts';
import type { TileMetadata } from '../../logic/map/tilesRegistry.ts';
import type { UrbanScale } from './continentTypes.ts';
export type { UrbanScale };

export type RegionArchetype = 'kanto' | 'johto' | 'blank' | 'agnostic';
export type StudioMode = 'graph' | 'terrain' | 'structures' | 'tile';
export type BrushSize = 1 | 2 | 4 | 8;
export type PlazaType = 'none' | 'fountain' | 'park';

export interface CityGenerationConfig {
  scale: UrbanScale;
  buildingDensity: number; // 1 to 10 (regulates lot occupancy)
  includeGym?: boolean;
  includeLab?: boolean;
  plazaType?: PlazaType;
  propsDensity?: number; // 0 to 100 (percentage of urban furniture and props, default: 50)
  includeFences?: boolean; // default: true
}

export const CANONICAL_THEME_SOURCES = ['firered', 'emerald', 'ruby_sapphire'] as const;
export type CanonicalThemeSource = (typeof CANONICAL_THEME_SOURCES)[number];

export interface ProceduralGenerationConfig {
  themeSource?: CanonicalThemeSource; // default: 'firered'
  treeDensity: number; // 0.1 to 1.0 (default: 0.7)
  roadWidth: number; // 1 to 3 tiles (default: 2)
  autoOcean: boolean; // default: true
  autoBuildings: boolean; // default: true
  waterPercent?: number; // 0 to 100 (default: 14)
  mountainPercent?: number; // 0 to 100 (default: 10)
  forestPercent?: number; // 0 to 100 (default: 25)
  propsDensity?: number; // 0 to 100 (default: 50)
  includeFences?: boolean; // default: true
  cityConfig?: CityGenerationConfig;
}

export interface AdventureProjectNode {
  id: DisplayText;
  name: DisplayText;
  type: DisplayText;
  x: number;
  y: number;
  hasCenter?: boolean;
  farm?: { t: number; w: number; m: number; f: number };
  requiresMO?: DisplayText;
  blockMsg?: DisplayText;
  hasEvent?: boolean;
  weather?: DisplayText;
  urbanScale?: UrbanScale;
  localMap?: GeneratedMap;
  cityConfig?: CityGenerationConfig;
}

export type MapNode = AdventureProjectNode;

export interface ContinentalRoutesExportBundle {
  readonly version: DisplayText;
  readonly archetype: RegionArchetype;
  readonly seed: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly nodes: Record<DisplayText, AdventureProjectNode>;
  readonly connections: [DisplayText, DisplayText][];
  readonly svgPathData: DisplayText;
  readonly exportedAt: IsoDateString;
}

export interface AdventureProject {
  id: DisplayText;
  name: DisplayText;
  archetype: RegionArchetype;
  seed: number;
  config: ProceduralGenerationConfig;
  nodes: Record<DisplayText, AdventureProjectNode>;
  connections: [DisplayText, DisplayText][];
  customTerrain?: Record<DisplayText, CellBiomeType>;
  customBuildings?: PlacedStructure[];
  customProps?: PlacedStructure[];
  customTiles?: readonly TileMetadata[];
  customStructures?: readonly StructureTemplate[];
  updatedAt: IsoDateString;
}

export type PrefabCategory = 'buildings' | 'vegetation' | 'props' | 'elevation' | 'infrastructure';

export interface StampingPrefabDefinition {
  id: DisplayText;
  name: DisplayText;
  category: PrefabCategory;
  style: DisplayText;
  width: number;
  height: number;
  file_path?: AssetUri;
}
