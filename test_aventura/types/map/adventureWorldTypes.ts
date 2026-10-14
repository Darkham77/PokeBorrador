import type { CellBiomeType } from './kantoGridModel.ts';
import type { PlacedStructure } from './kantoTileEngineTypes.ts';
import type { GeneratedMap } from './proceduralMapTypes.ts';
export type { GeneratedMap };
import type { TileMetadata } from '../../logic/map/tilesRegistry.ts';
import type { StructureTemplate } from '../../config/mapStructures.ts';
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
  id: string; // domain-ok: Identificador o estructura procedural de aventura
  name: string; // domain-ok: Identificador o estructura procedural de aventura
  type: string; // domain-ok: Identificador o estructura procedural de aventura
  x: number;
  y: number;
  hasCenter?: boolean;
  farm?: { t: number; w: number; m: number; f: number };
  requiresMO?: string; // domain-ok: Identificador o estructura procedural de aventura
  blockMsg?: string; // domain-ok: Identificador o estructura procedural de aventura
  hasEvent?: boolean;
  weather?: string; // domain-ok: Identificador o estructura procedural de aventura
  urbanScale?: UrbanScale;
  localMap?: GeneratedMap;
  cityConfig?: CityGenerationConfig;
}

export type MapNode = AdventureProjectNode;

export interface ContinentalRoutesExportBundle {
  readonly version: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly archetype: RegionArchetype;
  readonly seed: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly nodes: Record<string, AdventureProjectNode>; // open-record: Estructura o identificador procedural de aventura
  readonly connections: [string, string][];
  readonly svgPathData: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly exportedAt: string; // domain-ok: Identificador o estructura procedural de aventura
}

export interface AdventureProject {
  id: string; // domain-ok: Identificador o estructura procedural de aventura
  name: string; // domain-ok: Identificador o estructura procedural de aventura
  archetype: RegionArchetype;
  seed: number;
  config: ProceduralGenerationConfig;
  nodes: Record<string, AdventureProjectNode>; // open-record: Estructura o identificador procedural de aventura
  connections: [string, string][];
  customTerrain?: Record<string, CellBiomeType>; // open-record: Estructura o identificador procedural de aventura - sparse tile key `${gx}_${gy}`
  customBuildings?: PlacedStructure[];
  customProps?: PlacedStructure[];
  customTiles?: readonly TileMetadata[];
  customStructures?: readonly StructureTemplate[];
  updatedAt: string; // domain-ok: Identificador o estructura procedural de aventura
}

export type PrefabCategory = 'buildings' | 'vegetation' | 'props' | 'elevation' | 'infrastructure';

export interface StampingPrefabDefinition {
  id: string; // domain-ok: Identificador o estructura procedural de aventura
  name: string; // domain-ok: Identificador o estructura procedural de aventura
  category: PrefabCategory;
  style: string; // domain-ok: Identificador o estructura procedural de aventura
  width: number;
  height: number;
  file_path?: string; // domain-ok: Identificador o estructura procedural de aventura
}
