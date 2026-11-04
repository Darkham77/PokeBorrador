import type { AssetUri, DisplayText } from '@francogp/auditor';

import type { StructureTemplate } from '../../config/mapStructures.ts';
import type { TileCollision } from '../../logic/map/tilesRegistry.ts';
import type { CanonicalThemeSource, CityGenerationConfig } from './adventureWorldTypes.ts';
import type { SpriteFacingDirection } from './poiTypes.ts';

export type CollisionType = 0 | 1 | 2 | 3; // 0: transitable, 1: colisión, 2: agua, 3: salto hacia abajo (ledge)

export type MapType = 'town' | 'route';

export interface MapWarp {
  readonly x: number;
  readonly y: number;
  readonly targetMapId: DisplayText;
  readonly targetSpawnId: DisplayText;
}

export interface MapSpawn {
  readonly id: DisplayText;
  readonly x: number;
  readonly y: number;
  readonly direction?: SpriteFacingDirection;
}

export interface MapEntities {
  readonly spawns: readonly MapSpawn[];
  readonly warps: readonly MapWarp[];
}

export interface PlacedProceduralStructure {
  readonly template: StructureTemplate;
  readonly x: number;
  readonly y: number;
}

export interface ProceduralMapOptions {
  readonly width: number;
  readonly height: number;
  readonly seed?: number;
  readonly theme?: CanonicalThemeSource;
  readonly type?: MapType;
  readonly withWater?: boolean;
  readonly withHills?: boolean;
  readonly withVegetation?: boolean;
  readonly withTown?: boolean;
  readonly structures?: readonly PlacedProceduralStructure[];
  readonly waterPercent?: number; // 0 to 100
  readonly mountainPercent?: number; // 0 to 100
  readonly forestPercent?: number; // 0 to 100
  readonly propsDensity?: number; // 0 to 100
  readonly includeFences?: boolean;
  readonly cityConfig?: CityGenerationConfig;
}

export interface MapCell {
  readonly tileId: DisplayText;
  readonly filePath: AssetUri;
  readonly collision: TileCollision;
}

export interface ProceduralMapLayers {
  readonly ground: readonly (readonly MapCell[])[];
  readonly elevation: readonly (readonly (MapCell | null)[])[];
  readonly decorations: readonly (readonly (MapCell | null)[])[];
}

export interface GeneratedMap {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  readonly seed: number;
  readonly theme: CanonicalThemeSource;
  readonly type: MapType;
  readonly layers: ProceduralMapLayers;
  readonly collisionMatrix: readonly (readonly CollisionType[])[];
  readonly entities: MapEntities;
  // Layer direct aliases
  readonly ground: readonly (readonly MapCell[])[];
  readonly elevation: readonly (readonly (MapCell | null)[])[];
  readonly decorations: readonly (readonly (MapCell | null)[])[];
  // Backward-compatible fields
  readonly baseLayer: readonly (readonly MapCell[])[];
  readonly elevationLayer: readonly (readonly (MapCell | null)[])[];
  readonly objectLayer: readonly (readonly (MapCell | null)[])[];
  readonly collisionGrid: readonly (readonly TileCollision[])[];
  readonly totalTilesPlaced: number;
}
