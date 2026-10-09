/**
 * src/logic/map/nodeLocalMapGenerator.ts
 *
 * PROCEDURAL LOCAL MAP GENERATOR FOR GRAPH NODES
 * Synthesizes coherent 40x30 GBA-style local tile maps for adventure graph stops:
 * - Towns & Cities: urban layouts with Pokémon Center, Mart, and houses.
 * - Water routes & Lakes: water-dominant biomes with banks and shore autotiling.
 * - POIs (Caves, Mountains, Towers): elevated hills and rock formations.
 * - Terrestrial routes: roads, vegetation, tall grass, and perimeter trees.
 */

import {
  generateProceduralMap,
  type GeneratedMap,
  type MapType
} from './proceduralMapGenerator';
import type { MapNode } from '../adventure/mapData';
import type { CityGenerationConfig, UrbanScale, CanonicalThemeSource } from '../../types/map/adventureWorldTypes';

export interface NodeLocalMapOptions {
  readonly width?: number;
  readonly height?: number;
  readonly theme?: CanonicalThemeSource;
  readonly waterPercent?: number;
  readonly mountainPercent?: number;
  readonly forestPercent?: number;
  readonly cityConfig?: CityGenerationConfig;
}

export const SCALE_DIMENSIONS: Record<UrbanScale, { width: number; height: number }> = {
  hamlet: { width: 36, height: 28 },
  village: { width: 40, height: 30 },
  town: { width: 48, height: 36 },
  city: { width: 58, height: 42 },
  metropolis: { width: 70, height: 50 }
};

const DEFAULT_MAP_WIDTH = 40;
const DEFAULT_MAP_HEIGHT = 30;

/**
 * Infers canonical city scale and features from node ID or geographical name.
 */
export function inferCanonicalCityConfig(node: MapNode & { id?: string; cityConfig?: CityGenerationConfig }): CityGenerationConfig {
  if (node.cityConfig) return node.cityConfig;

  const name = node.name.toLowerCase();
  const id = (node.id ?? '').toLowerCase();

  if (id === 'pallet' || id === 'newbark' || /paleta|primavera|pallet|newbark/i.test(name)) {
    return {
      scale: 'hamlet',
      buildingDensity: 4,
      includeLab: true,
      includeGym: false,
      plazaType: 'none'
    };
  }

  if (id === 'lavender' || id === 'cherrygrove' || id === 'azalea' || /lavanda|cerezo|azalea|lavender/i.test(name)) {
    return {
      scale: 'village',
      buildingDensity: 5,
      includeLab: false,
      includeGym: false,
      plazaType: 'none'
    };
  }

  if (id === 'saffron' || /azafr[aá]n|saffron/i.test(name)) {
    return {
      scale: 'metropolis',
      buildingDensity: 9,
      includeGym: true,
      includeLab: false,
      plazaType: 'fountain'
    };
  }

  if (id === 'celadon' || id === 'fuchsia' || id === 'goldenrod' || /azulona|fucsia|trigal|celadon|fuchsia/i.test(name)) {
    return {
      scale: 'city',
      buildingDensity: 8,
      includeGym: true,
      includeLab: false,
      plazaType: 'park'
    };
  }

  return {
    scale: 'town',
    buildingDensity: 7,
    includeGym: true,
    includeLab: false,
    plazaType: 'fountain'
  };
}

/**
 * Generates a deterministic, coherent local tile map tailored to an adventure graph node.
 */
export function generateLocalMapForNode(
  node: MapNode & { id?: string; cityConfig?: CityGenerationConfig },
  baseSeed = 42,
  options?: NodeLocalMapOptions
): GeneratedMap {
  const isCity = node.type === 'city' || node.type === 'league';
  const cityConfig = options?.cityConfig ?? (isCity ? inferCanonicalCityConfig(node) : undefined);

  const defaultDims = cityConfig ? SCALE_DIMENSIONS[cityConfig.scale] : { width: DEFAULT_MAP_WIDTH, height: DEFAULT_MAP_HEIGHT };
  const width = options?.width ?? defaultDims.width;
  const height = options?.height ?? defaultDims.height;
  const theme: CanonicalThemeSource = options?.theme ?? 'firered';

  // Deterministic seed derivation from graph coordinates and node attributes
  const nodeSeed = (baseSeed + Math.abs(node.x * 31 + node.y * 17) + (node.hasCenter ? 101 : 0)) % 1000000;

  const nodeNameLower = node.name.toLowerCase();
  const isWaterRoute = node.type === 'route_water';
  const isPoi = node.type === 'poi';

  // Semantic attribute detection based on canonical Pokémon geography
  const hasCoastalWater = /celeste|carm[ií]n|olivo|orqu[ií]dea|canela|vermilion|cerulean|olivine|cianwood|cinnabar/i.test(nodeNameLower);
  const hasLakeWater = /lago|pozo|mar|lake|well/i.test(nodeNameLower);
  const hasHills = isPoi || /plateada|pewter|endrino|blackthorn|moon|t[uú]nel|roca|silver|victoria/i.test(nodeNameLower);
  const isForest = /bosque|forest/i.test(nodeNameLower);

  const mapType: MapType = isCity ? 'town' : 'route';
  const withTown = isCity;
  const withWater = isWaterRoute || hasCoastalWater || hasLakeWater;
  const withHills = !isWaterRoute && hasHills;
  const withVegetation = isForest || (!isWaterRoute && !hasHills) || isCity;

  return generateProceduralMap({
    width,
    height,
    seed: nodeSeed,
    theme,
    type: mapType,
    withTown,
    withWater,
    withHills,
    withVegetation,
    waterPercent: options?.waterPercent,
    mountainPercent: options?.mountainPercent,
    forestPercent: options?.forestPercent,
    cityConfig
  });
}
