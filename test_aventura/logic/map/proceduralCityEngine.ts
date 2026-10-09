/**
 * src/logic/map/proceduralCityEngine.ts
 *
 * PROCEDURAL URBAN PLANNER & CITY GRAMMAR ENGINE
 *
 * Architectural gateway for procedural settlement layouts. Delegates layout
 * synthesis to the Organic City Engine while maintaining backward-compatible
 * contracts, urban archetypes, and roof palette constants.
 */

import type {
  POINode,
  UrbanBuildingType,
  SettlementLayoutResult,
  SettlementCurbPlacement
} from '../../types/map/poiTypes.ts';
import type { SettlementTerrainContext } from './cityLayoutEngine.ts';
import type { BuildingPrefabMeta } from './canonicalAssetsRegistry.ts';
import {
  generateOrganicCityLayout,
  connectDoorsToStreets,
  RESIDENTIAL_ROOF_PALETTES
} from './organicCityEngine.ts';

export type { BuildingPrefabMeta, SettlementCurbPlacement };
export { connectDoorsToStreets, RESIDENTIAL_ROOF_PALETTES };

/**
 * 7 Coherent GBA Urban Archetypes for Medium Cities with distinct landmarks and styling
 */
export interface UrbanArchetype {
  readonly id: string;
  readonly name: string;
  readonly landmarkPrefab: string;
  readonly landmarkType: UrbanBuildingType;
  readonly landmarkDimensions: { readonly w: number; readonly h: number };
  readonly roofPalettes: readonly string[];
  readonly dominantPropType: 'bench' | 'flower' | 'lamp' | 'fence' | 'statue' | 'signpost';
  readonly specialPropPrefab: string;
}

export const URBAN_ARCHETYPES: readonly UrbanArchetype[] = [
  {
    id: 'bike_commerce',
    name: 'Ciclismo y Comercio',
    landmarkPrefab: 'poke_bike_shop',
    landmarkType: 'bike_shop',
    landmarkDimensions: { w: 4, h: 6 },
    roofPalettes: ['house_cerulean_orange', 'house_orange', 'house_pallet_red'],
    dominantPropType: 'signpost',
    specialPropPrefab: 'poke_sign_blue_metal'
  },
  {
    id: 'dojo_combat',
    name: 'Dojo y Disciplina Marcial',
    landmarkPrefab: 'poke_dojo',
    landmarkType: 'dojo',
    landmarkDimensions: { w: 6, h: 4 },
    roofPalettes: ['house_gray_small', 'house_wood_brown', 'house_celadon_condo'],
    dominantPropType: 'statue',
    specialPropPrefab: 'poke_statue_gym'
  },
  {
    id: 'fan_club_residential',
    name: 'Club de Fans y Distrito Residencial',
    landmarkPrefab: 'poke_fan_club',
    landmarkType: 'fan_club',
    landmarkDimensions: { w: 5, h: 4 },
    roofPalettes: ['house_pallet_blue', 'house_blue', 'house_green_plain'],
    dominantPropType: 'flower',
    specialPropPrefab: 'poke_flower_pot_circular'
  },
  {
    id: 'ranch_coastal',
    name: 'Rancho y Paseo Marítimo',
    landmarkPrefab: 'house_vermilion_ranch',
    landmarkType: 'house',
    landmarkDimensions: { w: 6, h: 4 },
    roofPalettes: ['house_wood_brown', 'house_wood_flowers', 'house_orange'],
    dominantPropType: 'fence',
    specialPropPrefab: 'poke_fence_wood_h'
  },
  {
    id: 'geology_quarry',
    name: 'Geología y Cantera de Piedra',
    landmarkPrefab: 'house_gray_small',
    landmarkType: 'house',
    landmarkDimensions: { w: 4, h: 4 },
    roofPalettes: ['house_gray_small', 'house_celadon_condo', 'house_wood_brown'],
    dominantPropType: 'flower',
    specialPropPrefab: 'poke_cave_boulder_rock'
  },
  {
    id: 'safari_botanical',
    name: 'Jardín Botánico y Safari',
    landmarkPrefab: 'house_wood_flowers',
    landmarkType: 'house',
    landmarkDimensions: { w: 5, h: 4 },
    roofPalettes: ['house_wood_flowers', 'house_green_plain', 'house_pallet_red'],
    dominantPropType: 'flower',
    specialPropPrefab: 'poke_bush_round'
  },
  {
    id: 'condo_district',
    name: 'Condominios y Residencias Cívicas',
    landmarkPrefab: 'house_celadon_condo',
    landmarkType: 'condo',
    landmarkDimensions: { w: 4, h: 5 },
    roofPalettes: ['house_cerulean_orange', 'house_pallet_blue', 'house_wood_brown'],
    dominantPropType: 'lamp',
    specialPropPrefab: 'poke_flower_pot_circular'
  }
] as const;

/**
 * Generates a fully procedural urban layout for any settlement node (Metropolis, City, Town).
 */
export function generateProceduralCityLayout(
  node: POINode,
  rngSeed = 1337,
  context?: SettlementTerrainContext
): SettlementLayoutResult {
  return generateOrganicCityLayout(node, rngSeed, context);
}
