/**
 * test_aventura/data/map/canonicalRegionData.ts
 *
 * CANONICAL POKÉMON REGIONAL DATA & BLUEPRINTS (SSoT)
 * Pure tabular datasets for Kanto and Johto: urban settlement blueprints,
 * route graph topology, and architectural dimension presets.
 */

import type { POINode, RouteType, UrbanRoadMaterial } from '../../types/map/poiTypes.ts';

export type CanonicalPresetId = 'kanto' | 'johto';

// ---------------------------------------------------------------------------
// 1. Urban & Structural Node Archetypes (Zero Magic Numbers)
// ---------------------------------------------------------------------------

const URBAN_NODE_ARCHETYPES = {
  METROPOLIS: { width: 28, height: 24, hasGym: true, urbanScale: 'metropolis' as const },
  GYM_CITY_LARGE: { width: 20, height: 16, hasGym: true, urbanScale: 'city' as const },
  GYM_CITY_MEDIUM: { width: 12, height: 10, hasGym: true, urbanScale: 'city' as const },
  RURAL_TOWN: { width: 14, height: 12, hasGym: false, urbanScale: 'town' as const },
  GYM_TOWN: { width: 14, height: 12, hasGym: true, urbanScale: 'town' as const },
  TOWN_SMALL: { width: 8, height: 8, hasGym: false, urbanScale: 'town' as const },
  GYM_TOWN_SMALL: { width: 8, height: 8, hasGym: true, urbanScale: 'town' as const },
  GYM_TOWN_COASTAL: { width: 10, height: 8, hasGym: true, urbanScale: 'town' as const },
  VILLAGE_SMALL: { width: 8, height: 8, hasGym: false, urbanScale: 'village' as const },
  METROPOLIS_JOHTO: { width: 16, height: 14, hasGym: true, urbanScale: 'metropolis' as const },
  DUNGEON_FOREST: { width: 16, height: 16, hasGym: false, urbanScale: 'hamlet' as const },
  POKEMON_LEAGUE_KANTO: { width: 32, height: 20, hasGym: false, elevation: 1, urbanScale: 'city' as const },
  POKEMON_LEAGUE_JOHTO: { width: 22, height: 20, hasGym: false, elevation: 1, urbanScale: 'city' as const },
  CAVE_ENTRANCE_STANDARD: { width: 4, height: 4, hasGym: false, elevation: 0, urbanScale: 'hamlet' as const },
  CAVE_ENTRANCE_ELEVATED: { width: 4, height: 4, hasGym: false, elevation: 1, urbanScale: 'hamlet' as const },
  CAVE_SEAFOAM: { width: 10, height: 8, hasGym: false, elevation: 0, urbanScale: 'hamlet' as const },
  ISOLATED_LANDMARK: { width: 6, height: 6, hasGym: false, urbanScale: 'hamlet' as const },
  WATER_LANDMARK_LAKE: { width: 8, height: 8, hasGym: false, urbanScale: 'hamlet' as const },
  PORT_DOCK_VERMILION: { width: 7, height: 6, hasGym: false, urbanScale: 'hamlet' as const, facing: 'south' as const }
} as const;

// ---------------------------------------------------------------------------
// 2. Blueprint Interfaces
// ---------------------------------------------------------------------------

export interface CanonicalNodeBlueprint {
  readonly id: string; // domain-ok: Adventure node ID
  readonly name: string; // domain-ok: Adventure node name
  readonly type: POINode['type'];
  readonly urbanScale: NonNullable<POINode['urbanScale']>;
  readonly gridX: number;
  readonly gridY: number;
  readonly width: number;
  readonly height: number;
  readonly hasGym: boolean;
  readonly elevation?: number;
  readonly facing?: POINode['facing'];
  readonly buildingFile?: string; // domain-ok: Texture asset path
  readonly roadMaterial?: UrbanRoadMaterial;
}

export interface CanonicalRouteBlueprint {
  readonly id: string; // domain-ok: Adventure route ID
  readonly from: string; // domain-ok: Adventure node ID
  readonly to: string; // domain-ok: Adventure node ID
  readonly routeType: RouteType;
  readonly isWaterCrossing?: boolean;
}

// ---------------------------------------------------------------------------
// 3. Canonical POI Node Blueprints
// ---------------------------------------------------------------------------

export const KANTO_BLUEPRINTS: readonly CanonicalNodeBlueprint[] = [
  { id: 'pallet', name: 'Pueblo Paleta', type: 'town', gridX: 67, gridY: 166, ...URBAN_NODE_ARCHETYPES.RURAL_TOWN },
  { id: 'viridian', name: 'Ciudad Verde', type: 'city', gridX: 64, gridY: 120, ...URBAN_NODE_ARCHETYPES.GYM_CITY_LARGE },
  { id: 'viridianforest', name: 'Bosque Verde', type: 'dungeon_forest', gridX: 66, gridY: 78, ...URBAN_NODE_ARCHETYPES.DUNGEON_FOREST },
  { id: 'pewter', name: 'Ciudad Plateada', type: 'city', gridX: 64, gridY: 36, ...URBAN_NODE_ARCHETYPES.GYM_CITY_LARGE },
  { id: 'indigo', name: 'Meseta Añil (Liga Pokémon)', type: 'pokemon_league', gridX: 26, gridY: 22, ...URBAN_NODE_ARCHETYPES.POKEMON_LEAGUE_KANTO },
  { id: 'victory_road_entrance', name: 'Calle Victoria (Entrada Sur)', type: 'cave_entrance', gridX: 42, gridY: 54, ...URBAN_NODE_ARCHETYPES.CAVE_ENTRANCE_STANDARD },
  { id: 'victory_road_exit', name: 'Calle Victoria (Salida Norte)', type: 'cave_entrance', gridX: 36, gridY: 40, ...URBAN_NODE_ARCHETYPES.CAVE_ENTRANCE_ELEVATED },
  { id: 'mtmoon_west', name: 'Monte Moon (Oeste)', type: 'cave_entrance', gridX: 100, gridY: 44, ...URBAN_NODE_ARCHETYPES.CAVE_ENTRANCE_STANDARD },
  { id: 'mtmoon_east', name: 'Monte Moon (Este)', type: 'cave_entrance', gridX: 134, gridY: 44, ...URBAN_NODE_ARCHETYPES.CAVE_ENTRANCE_STANDARD },
  { id: 'cerulean', name: 'Ciudad Celeste', type: 'city', gridX: 156, gridY: 46, ...URBAN_NODE_ARCHETYPES.GYM_CITY_LARGE },
  { id: 'billshouse', name: 'Casa de Bill (Cabo Celeste)', type: 'town', gridX: 196, gridY: 26, buildingFile: 'house_wood_brown.png', ...URBAN_NODE_ARCHETYPES.ISOLATED_LANDMARK },
  { id: 'rocktunnel_north', name: 'Túnel Roca (Norte)', type: 'cave_entrance', gridX: 194, gridY: 55, ...URBAN_NODE_ARCHETYPES.CAVE_ENTRANCE_STANDARD },
  { id: 'rocktunnel_south', name: 'Túnel Roca (Sur)', type: 'cave_entrance', gridX: 204, gridY: 90, ...URBAN_NODE_ARCHETYPES.CAVE_ENTRANCE_STANDARD },
  { id: 'powerplant', name: 'Central Energía', type: 'town', gridX: 224, gridY: 72, buildingFile: 'house_celadon_brick_2story.png', ...URBAN_NODE_ARCHETYPES.ISOLATED_LANDMARK },
  { id: 'lavender', name: 'Pueblo Lavanda', type: 'town', gridX: 202, gridY: 108, ...URBAN_NODE_ARCHETYPES.RURAL_TOWN },
  { id: 'celadon', name: 'Ciudad Azulona', type: 'metropolis', gridX: 104, gridY: 102, ...URBAN_NODE_ARCHETYPES.METROPOLIS },
  { id: 'saffron', name: 'Ciudad Azafrán', type: 'metropolis', gridX: 152, gridY: 102, ...URBAN_NODE_ARCHETYPES.METROPOLIS },
  { id: 'vermilion', name: 'Ciudad Carmín', type: 'city', gridX: 156, gridY: 152, ...URBAN_NODE_ARCHETYPES.GYM_CITY_LARGE },
  { id: 'diglettcave', name: 'Cueva Diglett', type: 'cave_entrance', gridX: 126, gridY: 153, ...URBAN_NODE_ARCHETYPES.CAVE_ENTRANCE_STANDARD },
  { id: 'fuchsia', name: 'Ciudad Fucsia', type: 'city', gridX: 168, gridY: 196, ...URBAN_NODE_ARCHETYPES.GYM_CITY_LARGE },
  { id: 'seafoam', name: 'Islas Espuma', type: 'cave_entrance', gridX: 114, gridY: 216, ...URBAN_NODE_ARCHETYPES.CAVE_SEAFOAM },
  { id: 'cinnabar', name: 'Isla Canela', type: 'town', gridX: 48, gridY: 216, roadMaterial: 'dirt', ...URBAN_NODE_ARCHETYPES.GYM_TOWN },
  { id: 'vermilion_port', name: 'Puerto Carmín', type: 'port_dock', gridX: 160, gridY: 166, buildingFile: 'poke_port_vermilion_gate.png', ...URBAN_NODE_ARCHETYPES.PORT_DOCK_VERMILION }
];

export const JOHTO_BLUEPRINTS: readonly CanonicalNodeBlueprint[] = [
  { id: 'newbark', name: 'Pueblo Primavera', type: 'town', gridX: 106, gridY: 88, ...URBAN_NODE_ARCHETYPES.VILLAGE_SMALL },
  { id: 'cherrygrove', name: 'Ciudad Cerezo', type: 'town', gridX: 88, gridY: 88, ...URBAN_NODE_ARCHETYPES.TOWN_SMALL },
  { id: 'violet', name: 'Ciudad Malvalona', type: 'city', gridX: 72, gridY: 64, ...URBAN_NODE_ARCHETYPES.GYM_CITY_MEDIUM },
  { id: 'azalea', name: 'Pueblo Azalea', type: 'town', gridX: 56, gridY: 106, ...URBAN_NODE_ARCHETYPES.GYM_TOWN_SMALL },
  { id: 'goldenrod', name: 'Ciudad Trigal', type: 'metropolis', gridX: 38, gridY: 76, ...URBAN_NODE_ARCHETYPES.METROPOLIS_JOHTO },
  { id: 'ecruteak', name: 'Ciudad Iris', type: 'city', gridX: 56, gridY: 44, ...URBAN_NODE_ARCHETYPES.GYM_CITY_MEDIUM },
  { id: 'olivine', name: 'Ciudad Olivo', type: 'city', gridX: 32, gridY: 48, ...URBAN_NODE_ARCHETYPES.GYM_CITY_MEDIUM },
  { id: 'cianwood', name: 'Ciudad Orquídea', type: 'town', gridX: 14, gridY: 86, ...URBAN_NODE_ARCHETYPES.GYM_TOWN_COASTAL },
  { id: 'mahogany', name: 'Pueblo Caoba', type: 'town', gridX: 84, gridY: 44, ...URBAN_NODE_ARCHETYPES.GYM_TOWN_SMALL },
  { id: 'lakeofrage', name: 'Lago de la Furia', type: 'water_landmark', gridX: 84, gridY: 24, ...URBAN_NODE_ARCHETYPES.WATER_LANDMARK_LAKE },
  { id: 'blackthorn', name: 'Ciudad Endrino', type: 'city', gridX: 108, gridY: 44, ...URBAN_NODE_ARCHETYPES.GYM_CITY_MEDIUM },
  { id: 'mtsilver', name: 'Monte Plateado', type: 'pokemon_league', gridX: 104, gridY: 58, ...URBAN_NODE_ARCHETYPES.POKEMON_LEAGUE_JOHTO }
];

// ---------------------------------------------------------------------------
// 4. Canonical Route Edge Blueprints
// ---------------------------------------------------------------------------

export const KANTO_ROUTES: readonly CanonicalRouteBlueprint[] = [
  { id: 'kanto_r1', from: 'pallet', to: 'viridian', routeType: 'road' },
  { id: 'kanto_r2_s', from: 'viridian', to: 'viridianforest', routeType: 'road' },
  { id: 'kanto_r2_n', from: 'viridianforest', to: 'pewter', routeType: 'forest_path' },
  { id: 'kanto_r22_23', from: 'viridian', to: 'victory_road_entrance', routeType: 'mountain_pass' },
  { id: 'kanto_victory_road', from: 'victory_road_entrance', to: 'victory_road_exit', routeType: 'mountain_pass' },
  { id: 'kanto_indigo_avenue', from: 'victory_road_exit', to: 'indigo', routeType: 'road' },
  { id: 'kanto_r3', from: 'pewter', to: 'mtmoon_west', routeType: 'mountain_pass' },
  { id: 'kanto_r4', from: 'mtmoon_east', to: 'cerulean', routeType: 'mountain_pass' },
  { id: 'kanto_r24_25', from: 'cerulean', to: 'billshouse', routeType: 'road' },
  { id: 'kanto_r5', from: 'cerulean', to: 'saffron', routeType: 'road' },
  { id: 'kanto_r7', from: 'celadon', to: 'saffron', routeType: 'road' },
  { id: 'kanto_r8', from: 'saffron', to: 'lavender', routeType: 'road' },
  { id: 'kanto_r9_10', from: 'cerulean', to: 'rocktunnel_north', routeType: 'road' },
  { id: 'kanto_r10_powerplant', from: 'rocktunnel_north', to: 'powerplant', routeType: 'road' },
  { id: 'kanto_r10_s', from: 'rocktunnel_south', to: 'lavender', routeType: 'mountain_pass' },
  { id: 'kanto_r6', from: 'saffron', to: 'vermilion', routeType: 'road' },
  { id: 'kanto_diglett', from: 'vermilion', to: 'diglettcave', routeType: 'mountain_pass' },
  { id: 'kanto_r11_15', from: 'vermilion', to: 'fuchsia', routeType: 'road' },
  { id: 'kanto_r12', from: 'lavender', to: 'fuchsia', routeType: 'road' },
  { id: 'kanto_r16_18', from: 'celadon', to: 'fuchsia', routeType: 'road' },
  { id: 'kanto_r19', from: 'fuchsia', to: 'seafoam', routeType: 'water_crossing', isWaterCrossing: true },
  { id: 'kanto_r20', from: 'seafoam', to: 'cinnabar', routeType: 'water_crossing', isWaterCrossing: true },
  { id: 'kanto_r21', from: 'cinnabar', to: 'pallet', routeType: 'water_crossing', isWaterCrossing: true },
  { id: 'kanto_vermilion_port', from: 'vermilion', to: 'vermilion_port', routeType: 'road' }
];

export const JOHTO_ROUTES: readonly CanonicalRouteBlueprint[] = [
  { id: 'johto_r29', from: 'newbark', to: 'cherrygrove', routeType: 'road' },
  { id: 'johto_r30_31', from: 'cherrygrove', to: 'violet', routeType: 'road' },
  { id: 'johto_r32_33', from: 'violet', to: 'azalea', routeType: 'road' },
  { id: 'johto_r34', from: 'azalea', to: 'goldenrod', routeType: 'forest_path' },
  { id: 'johto_r35_37', from: 'goldenrod', to: 'ecruteak', routeType: 'road' },
  { id: 'johto_r36', from: 'violet', to: 'ecruteak', routeType: 'road' },
  { id: 'johto_r38_39', from: 'ecruteak', to: 'olivine', routeType: 'road' },
  { id: 'johto_r40_41', from: 'olivine', to: 'cianwood', routeType: 'water_crossing', isWaterCrossing: true },
  { id: 'johto_r42', from: 'ecruteak', to: 'mahogany', routeType: 'mountain_pass' },
  { id: 'johto_r43', from: 'mahogany', to: 'lakeofrage', routeType: 'road' },
  { id: 'johto_r44', from: 'mahogany', to: 'blackthorn', routeType: 'mountain_pass' },
  { id: 'johto_r45_46', from: 'blackthorn', to: 'newbark', routeType: 'mountain_pass' },
  { id: 'johto_r27_28', from: 'newbark', to: 'mtsilver', routeType: 'mountain_pass' }
];
