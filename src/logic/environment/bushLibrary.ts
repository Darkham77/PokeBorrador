/**
 * src/logic/environment/bushLibrary.ts
 *
 * DYNAMIC ENVIRONMENTAL COVERAGE LIBRARY (FORMERLY BUSHES)
 *
 * Encapsulates pure biome selection and two-stage dice roll logic
 * using a deterministic PRNG (mulberry32).
 */

import { BUSH_FAMILIES, type BushFamily } from './bushCatalog.ts';
export const BUSH_LAYER_DEPTHS = ['front', 'back'] as const; // domain-ok: Independent layer depth for environmental rendering
export type BushLayerDepth = (typeof BUSH_LAYER_DEPTHS)[number];
import { MAPS_BY_ROUTE_ID } from '../../data/world/maps.ts';
import { isMapRouteId, type MapRouteId } from '@/data/world/map-assets';
import { MAP_BIOME_KEYS, type MapBiomeKey } from '@/logic/constants/encounters';
import { mulberry32 } from '../utils/math.ts';
import {
  BUSH_SEED_MULTIPLIER,
  BUSH_BASE_SCALE,
  BUSH_VAR_SCALE,
  BUSH_ID_SCALE_STEP,
  BUSH_OFFSET_X_RANGE,
  BUSH_OFFSET_X_BIAS,
  DEFAULT_PLAINS_BUSH_WEIGHT,
  DEFAULT_PLAINS_ROCK_WEIGHT,
  FLIP_CHANCE_PERCENT,
  BIOME_WEIGHT_PRESETS
} from '@/logic/constants/visuals';

export { BUSH_FAMILIES, type BushFamily };

export type BushAnimationType = 'bush' | 'tree' | 'none';

export const BUSH_ANIMATION_MAPPING: Partial<Record<BushFamily, BushAnimationType>> = {
  bush: 'bush',
  bushflower: 'bush',
  cactus: 'tree',
  fern: 'tree',
  treebroken: 'tree',
  rock: 'none',
  box: 'none'
};

export function getAnimationTypeForFamily(family: string): BushAnimationType {
  const mapped = isBushFamily(family) ? BUSH_ANIMATION_MAPPING[family] : undefined;
  if (mapped) return mapped;
  const lower = family.toLowerCase(); // text-ok: UI text display localization string
  if (lower.startsWith('rock') || lower.startsWith('box') || lower.startsWith('crystal')) {
    return 'none';
  }
  if (lower.startsWith('tree') || lower.startsWith('fern') || lower.startsWith('cactus')) {
    return 'tree';
  }
  return 'bush';
}

export interface ResolvedBushConfig {
  id: number;
  cls: string;
  assetId: string; // domain-ok: Procedural visual bush asset file identifier
  family: BushFamily; // Dynamically selected family from catalog
  animationType: BushAnimationType; // Animation type
  tintClass: string; // 'tint-desert', 'tint-swamp', 'tint-arctic', 'tint-cave', or ''
  randomScale: number;
  flip: number;
  offsetX: number;
  tx: number;
  ty: number;
  ad: string;
  ay: string;
}

interface BiomeBushWeights {
  weights: Partial<Record<BushFamily, number>>;
  tint?: {
    class: string;
    families?: string[];
  };
}

export const BIOME_BUSH_CONFIG: Partial<Record<MapBiomeKey, BiomeBushWeights>> = {
  isCrystalCave: {
    weights: {
      rock: BIOME_WEIGHT_PRESETS.DOMINANT,
      crystalblack: BIOME_WEIGHT_PRESETS.TRACE,
      crystalblue: BIOME_WEIGHT_PRESETS.TRACE,
      crystaldarkred: BIOME_WEIGHT_PRESETS.TRACE,
      crystalgreen: BIOME_WEIGHT_PRESETS.TRACE,
      crystalpink: BIOME_WEIGHT_PRESETS.TRACE,
      crystalred: BIOME_WEIGHT_PRESETS.TRACE,
      crystalviolet: BIOME_WEIGHT_PRESETS.TRACE,
      crystalwhite: BIOME_WEIGHT_PRESETS.TRACE,
      crystalyellow: BIOME_WEIGHT_PRESETS.TRACE,
      crystalyellowgreen: BIOME_WEIGHT_PRESETS.TRACE
    },
    tint: { class: 'tint-cave', families: ['rock'] }
  },
  isCave: {
    weights: { rock: BIOME_WEIGHT_PRESETS.GUARANTEED },
    tint: { class: 'tint-cave', families: ['rock'] }
  },
  isVolcanic: { weights: { rock: BIOME_WEIGHT_PRESETS.GUARANTEED } },
  isUrban: { weights: { box: BIOME_WEIGHT_PRESETS.GUARANTEED } },
  isIndoors: { weights: { box: BIOME_WEIGHT_PRESETS.GUARANTEED } },
  isArctic: {
    weights: { rock: BIOME_WEIGHT_PRESETS.DOMINANT, bushsnow: BIOME_WEIGHT_PRESETS.RARE },
    tint: { class: 'tint-arctic', families: ['rock'] }
  },
  isDesert: {
    weights: {
      rock: BIOME_WEIGHT_PRESETS.MAJORITY,
      cactus: BIOME_WEIGHT_PRESETS.REGULAR,
      grass: BIOME_WEIGHT_PRESETS.VERY_RARE
    },
    tint: { class: 'tint-desert', families: ['rock'] }
  },
  isSwamp: {
    weights: {
      bush: BIOME_WEIGHT_PRESETS.MEDIUM,
      fern: BIOME_WEIGHT_PRESETS.MEDIUM,
      grass: BIOME_WEIGHT_PRESETS.VERY_RARE,
      grassflower: BIOME_WEIGHT_PRESETS.OCCASIONAL,
      treebroken: BIOME_WEIGHT_PRESETS.RARE
    },
    tint: { class: 'tint-swamp' }
  },
  isMountain: {
    weights: {
      rock: BIOME_WEIGHT_PRESETS.HIGH,
      treebroken: BIOME_WEIGHT_PRESETS.RARE,
      grass: BIOME_WEIGHT_PRESETS.OCCASIONAL,
      bush: BIOME_WEIGHT_PRESETS.OCCASIONAL
    }
  },
  isCoastal: {
    weights: {
      rock: BIOME_WEIGHT_PRESETS.BALANCED,
      bush: BIOME_WEIGHT_PRESETS.COMMON,
      grass: BIOME_WEIGHT_PRESETS.RARE,
      grassflower: BIOME_WEIGHT_PRESETS.RARE
    }
  },
  isForest: {
    weights: {
      bush: BIOME_WEIGHT_PRESETS.MODERATE,
      bushflower: BIOME_WEIGHT_PRESETS.OCCASIONAL,
      grassflower: BIOME_WEIGHT_PRESETS.VERY_RARE,
      grass: BIOME_WEIGHT_PRESETS.RARE,
      fern: BIOME_WEIGHT_PRESETS.UNCOMMON,
      rock: BIOME_WEIGHT_PRESETS.RARE,
      treebroken: BIOME_WEIGHT_PRESETS.RARE
    }
  }
};

export function isBushFamily(val: string): val is BushFamily {
  return Object.hasOwn(BUSH_FAMILIES, val);
}

export function getBiomeConfigForMap(locationId: MapRouteId): BiomeBushWeights {
  const map = isMapRouteId(locationId) ? MAPS_BY_ROUTE_ID[locationId] : undefined;
  let activeBiomeKey: MapBiomeKey = 'isPlains';

  if (map) {
    for (const key of MAP_BIOME_KEYS) {
      if (map[key]) {
        activeBiomeKey = key;
        break;
      }
    }
  }

  const defaultWeights: BiomeBushWeights = {
    weights: { bush: DEFAULT_PLAINS_BUSH_WEIGHT, rock: DEFAULT_PLAINS_ROCK_WEIGHT }
  };
  return BIOME_BUSH_CONFIG[activeBiomeKey] ?? BIOME_BUSH_CONFIG['isPlains'] ?? defaultWeights;
}

/** Seed offset applied to front layer PRNG calculations. */
export const FRONT_LAYER_SEED_OFFSET = 1000;

/** Seed offset applied to back layer PRNG calculations. */
export const BACK_LAYER_SEED_OFFSET = 2000;

/**
 * Normalizes bush properties applying deterministic two-stage dice roll
 * based on sessionSeed and layer.
 */
export function resolveBushesForLayer(
  baseBushes: Array<{ id: number; cls: string; tx: number; ty: number; ad: string; ay: string }>,
  sessionSeed: number,
  layer: BushLayerDepth,
  mapId: MapRouteId
): ResolvedBushConfig[] {
  const biomeConfig = getBiomeConfigForMap(mapId);

  // 2. Iterate over base bushes and perform two-stage dice roll
  return baseBushes.map((b) => {
    // Combined unique seed per bush and layer
    const layerOffset = layer === 'front' ? FRONT_LAYER_SEED_OFFSET : BACK_LAYER_SEED_OFFSET;
    const prng = mulberry32(sessionSeed ^ (b.id * BUSH_SEED_MULTIPLIER) ^ layerOffset);

    // Roll 1: Pick dynamic family according to current biome weights
    const activeWeights = biomeConfig.weights;
    const availableFamilies = Object.keys(activeWeights).filter(isBushFamily);

    let selectedFamily: BushFamily = 'bush'; // Default fallback

    let totalWeight = 0;
    for (const fam of availableFamilies) {
      totalWeight += activeWeights[fam] || 0;
    }

    if (totalWeight > 0) {
      const roll = prng() * totalWeight;
      let sum = 0;
      for (const fam of availableFamilies) {
        sum += activeWeights[fam] || 0;
        if (roll < sum) {
          selectedFamily = fam;
          break;
        }
      }
    } else {
      // Fallback: Pick any family existing in catalog
      const allFamilies = Object.keys(BUSH_FAMILIES).filter(isBushFamily);
      selectedFamily = allFamilies[Math.floor(prng() * allFamilies.length)] ?? 'bush';
    }

    // Roll 2: Pick specific asset within selected family
    const assets = BUSH_FAMILIES[selectedFamily];
    const roll2 = Math.floor(prng() * assets.length);
    const assetId = assets[roll2] ?? assets[0] ?? 'grass-1';

    // Applicable tint according to biome configuration and coverage family
    let tintClass = '';
    if (biomeConfig.tint) {
      const tintConf = biomeConfig.tint;
      if (!tintConf.families || tintConf.families.includes(selectedFamily)) {
        tintClass = tintConf.class;
      }
    }

    // Deterministic random transformations
    const scaleFactor = BUSH_BASE_SCALE + prng() * BUSH_VAR_SCALE + b.id * BUSH_ID_SCALE_STEP;
    const flip = prng() < FLIP_CHANCE_PERCENT / 100 ? -1 : 1;
    const offsetX = Math.floor(prng() * BUSH_OFFSET_X_RANGE) - BUSH_OFFSET_X_BIAS;

    return {
      ...b,
      assetId,
      family: selectedFamily,
      animationType: getAnimationTypeForFamily(selectedFamily),
      tintClass,
      randomScale: scaleFactor,
      flip,
      offsetX
    };
  });
}

export function getActiveBushesForMap(
  locationId: MapRouteId,
  layer: BushLayerDepth,
  sessionSeed: number,
  baseBushes: Array<{
    id: number;
    cls: string;
    scale?: number;
    tx?: number;
    ty?: number;
    ad?: string;
    ay?: string;
  }>
): ResolvedBushConfig[] {
  return resolveBushesForLayer(
    baseBushes as Array<{
      id: number;
      cls: string;
      tx: number;
      ty: number;
      ad: string;
      ay: string;
    }>,
    sessionSeed,
    layer,
    locationId
  );
}
