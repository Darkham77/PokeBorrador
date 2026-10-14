import type { SpriteFacingDirection } from './poiTypes.ts';
import type { StructureTemplate } from '../../config/mapStructures.ts';
import type { CanonicalThemeSource, CityGenerationConfig } from './adventureWorldTypes.ts';
import type { TileCollision } from '../../logic/map/tilesRegistry.ts';

export type CollisionType = 0 | 1 | 2 | 3; // 0: transitable, 1: colisión, 2: agua, 3: salto hacia abajo (ledge)

export type MapType = 'town' | 'route';

export interface MapWarp {
  readonly x: number;
  readonly y: number;
  readonly targetMapId: string; // domain-ok: Open dynamic map ID
  readonly targetSpawnId: string; // domain-ok: Open dynamic spawn ID
}

export interface MapSpawn {
  readonly id: string; // domain-ok: Open dynamic spawn ID
  readonly x: number;
  readonly y: number;
  readonly direction?: SpriteFacingDirection;
}

export interface MapEntities {
  readonly spawns: readonly MapSpawn[];
  readonly warps: readonly MapWarp[];
}

export interface PlacedStructure {
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
  readonly structures?: readonly PlacedStructure[];
  readonly waterPercent?: number; // 0 to 100
  readonly mountainPercent?: number; // 0 to 100
  readonly forestPercent?: number; // 0 to 100
  readonly propsDensity?: number; // 0 to 100
  readonly includeFences?: boolean;
  readonly cityConfig?: CityGenerationConfig;
}

export interface MapCell {
  readonly tileId: string; // domain-ok: Open dynamic tile ID
  readonly filePath: string; // domain-ok: Asset file path URI
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
