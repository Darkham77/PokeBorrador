/**
 * src/types/map/poiTypes.ts
 *
 * DOMAIN CONTRACTS & TYPES FOR HETEROGENEOUS REGIONAL POIS & ROUTE NETWORKS
 *
 * Enforces strict Domain-Type-First governance:
 *   - Canonical POI types derived from finite const tuples.
 *   - Terrain placement preferences for intelligent geographical anchoring.
 *   - Bidirectional route edge representation compatible with SVG vector graphs.
 */

import type { UrbanScale } from './continentTypes.ts';

export const POI_TYPES = [
  'metropolis',
  'city',
  'town',
  'dungeon_forest',
  'cave_entrance',
  'port_dock',
  'route_gate',
  'water_landmark',
  'pokemon_league'
] as const;
export type POIType = (typeof POI_TYPES)[number];

export const POI_TERRAIN_PREFERENCES = [
  'flat_grass',
  'mountain_wall',
  'mountain_plateau',
  'coast_water',
  'forest_clearing'
] as const;
export type POITerrainPreference = (typeof POI_TERRAIN_PREFERENCES)[number];

export const ROUTE_TYPES = [
  'road',
  'mountain_pass',
  'water_crossing',
  'forest_path',
  'trail',
  'secondary'
] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

export const BRIDGE_STYLES = ['silence_wood', 'golden_wood', 'stone_pier'] as const;
export type BridgeStyle = (typeof BRIDGE_STYLES)[number];

export { URBAN_SCALES, type UrbanScale } from './continentTypes.ts';

/** Primary chain node types that participate in the TSP Hamiltonian path. */
export const PRIMARY_POI_TYPES = [
  'metropolis',
  'city',
  'town',
  'pokemon_league'
] as const satisfies readonly POIType[];
export type PrimaryPOIType = (typeof PRIMARY_POI_TYPES)[number];

const PRIMARY_POI_TYPE_SET: ReadonlySet<string> = new Set(PRIMARY_POI_TYPES); // runtime-set: Estructura o identificador procedural de aventura

/** Returns true if the POI participates in the main route chain (cities, towns, league). */
export function isPrimaryNode(node: Pick<POINode, 'type'>): boolean {
  return PRIMARY_POI_TYPE_SET.has(node.type);
}

export const CARDINAL_DIRECTIONS = ['north', 'south', 'east', 'west'] as const;
export type CardinalDirection = (typeof CARDINAL_DIRECTIONS)[number];

export interface POIFootprint {
  readonly width: number;
  readonly height: number;
}

export interface POIGateway {
  readonly x: number;
  readonly y: number;
  readonly direction: CardinalDirection;
}

export const URBAN_BUILDING_TYPES = [
  'pokecenter',
  'pokemart',
  'gym',
  'house',
  'lab',
  'dept_store',
  'corp_tower',
  'dojo',
  'condo',
  'museum',
  'game_corner',
  'bike_shop',
  'daycare',
  'fan_club',
  'tower',
  'pokemon_league',
  'checkpoint_gate'
] as const;
export type UrbanBuildingType = (typeof URBAN_BUILDING_TYPES)[number];

export interface UrbanBuildingPlacement {
  readonly id: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly type: UrbanBuildingType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly doorX: number;
  readonly doorY: number;
  readonly prefabFile: string; // domain-ok: filename of building prefab sprite
  readonly pixelOffsetX?: number;
  readonly pixelOffsetY?: number;
}

export const URBAN_PROP_TYPES = [
  'lamp',
  'fence_h',
  'fence_v',
  'flower',
  'bush',
  'bench',
  'fountain',
  'statue',
  'mailbox',
  'signpost',
  'rock',
  'tree',
  'crates'
] as const;
export type UrbanPropType = (typeof URBAN_PROP_TYPES)[number];

export const URBAN_ELEMENT_TYPES = ['building', 'prop'] as const;
export type UrbanElementType = (typeof URBAN_ELEMENT_TYPES)[number];

export interface UrbanPropPlacement {
  readonly id?: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly type: UrbanPropType;
  readonly x: number;
  readonly y: number;
  readonly prefabFile: string; // domain-ok: filename of prop prefab sprite
}

export interface SettlementCurbPlacement {
  readonly x: number;
  readonly y: number;
  readonly direction: 'n' | 's' | 'w' | 'e';
  readonly curbTile: string; // domain-ok: filename of curb prefab sprite
}

export const URBAN_ROAD_MATERIALS = ['dirt', 'paved', 'asphalt', 'stone', 'wood', 'brick'] as const;
export type UrbanRoadMaterial = (typeof URBAN_ROAD_MATERIALS)[number];

export interface SettlementLayoutResult {
  readonly nodeId: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly buildings: readonly UrbanBuildingPlacement[];
  readonly props: readonly UrbanPropPlacement[];
  readonly internalStreets: readonly { readonly x: number; readonly y: number }[];
  readonly pavedPlazaCells: readonly { readonly x: number; readonly y: number }[];
  readonly curbs?: readonly SettlementCurbPlacement[];
  readonly roadMaterial?: UrbanRoadMaterial;
}

export interface POINode {
  readonly id: string; // domain-ok: dynamic settlement identifier
  readonly name: string; // domain-ok: human readable settlement name
  readonly type: POIType;
  readonly footprint: POIFootprint;
  readonly terrainPreference: POITerrainPreference;
  gridX: number;
  gridY: number;
  readonly elevation: number;
  readonly facing?: CardinalDirection;
  readonly gateways?: readonly POIGateway[];
  readonly urbanLayout?: SettlementLayoutResult;
  readonly buildingFile?: string; // domain-ok: custom building sprite for specialized POIs (e.g. port docks)
  readonly hasGym?: boolean;
  readonly hasPort?: boolean;
  readonly urbanScale?: UrbanScale;
  readonly roadMaterial?: 'dirt' | 'paved';
  readonly tier?: number;
  readonly progressionIndex?: number;
  readonly transitPairId?: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly isTransitCaveEntry?: boolean;
  readonly isTransitCaveExit?: boolean;
  readonly transitTargetId?: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly urbanTheme?: string; // domain-ok: Identificador o estructura procedural de aventura
}

export interface RouteWaypoint {
  readonly x: number;
  readonly y: number;
}

export interface RouteEdge {
  readonly id: string; // domain-ok: route edge identifier
  readonly fromNodeId: string; // domain-ok: source node id
  readonly toNodeId: string; // domain-ok: destination node id
  readonly routeType: RouteType;
  readonly distance: number;
  readonly waypoints: readonly RouteWaypoint[];
  readonly isWaterCrossing?: boolean;
  readonly routeNumber?: number; // Sequential numbering for primary chain edges (1, 2, 3...)
  readonly isTransitCaveWarp?: boolean;
}

export interface RegionalSettlementNetwork {
  readonly nodes: readonly POINode[];
  readonly edges: readonly RouteEdge[];
}
