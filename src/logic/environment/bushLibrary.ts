/**
 * src/logic/environment/bushLibrary.ts
 * 
 * BIBLIOTECA DINÁMICA DE COBERTURAS AMBIENTALES (EX-ARBUSTOS)
 * 
 * Encapsula la lógica pura de selección por bioma y doble tirada de dados
 * utilizando un PRNG determinista (mulberry32).
 */

import { BUSH_FAMILIES, type BushFamily } from './bushCatalog.ts';
export type BushLayerDepth = 'front' | 'back';
import { MAPS_BY_ROUTE_ID } from '../../data/world/maps.ts';
import { isMapRouteId, type MapRouteId } from '@/data/world/map-assets';
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

export const BUSH_ANIMATION_MAPPING: Record<string, BushAnimationType> = {
  bush: 'bush',
  bushflower: 'bush',
  cactus: 'tree',
  fern: 'tree',
  treebroken: 'tree',
  rock: 'none',
  box: 'none'
};

export function getAnimationTypeForFamily(family: string): BushAnimationType {
  const mapped = BUSH_ANIMATION_MAPPING[family];
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
  family: BushFamily; // La familia seleccionada dinámicamente del catálogo
  animationType: BushAnimationType; // Tipo de animación
  tintClass: string;  // 'tint-desert', 'tint-swamp', 'tint-arctic', 'tint-cave', o ''
  randomScale: number;
  flip: number;
  offsetX: number;
  tx: number;
  ty: number;
  ad: string;
  ay: string;
}

interface BiomeBushWeights {
  weights: Record<string, number>;
  tint?: {
    class: string;
    families?: string[];
  };
}

export const BIOME_BUSH_CONFIG: Record<string, BiomeBushWeights> = {
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
  isCave:     { 
    weights: { rock: BIOME_WEIGHT_PRESETS.GUARANTEED }, 
    tint: { class: 'tint-cave', families: ['rock'] } 
  },
  isVolcanic: { weights: { rock: BIOME_WEIGHT_PRESETS.GUARANTEED } },
  isUrban:    { weights: { box: BIOME_WEIGHT_PRESETS.GUARANTEED } },
  isIndoors:  { weights: { box: BIOME_WEIGHT_PRESETS.GUARANTEED } },
  isArctic:   { 
    weights: { rock: BIOME_WEIGHT_PRESETS.DOMINANT, bushsnow: BIOME_WEIGHT_PRESETS.RARE }, 
    tint: { class: 'tint-arctic', families: ['rock'] } 
  },
  isDesert:   { 
    weights: { rock: BIOME_WEIGHT_PRESETS.MAJORITY, cactus: BIOME_WEIGHT_PRESETS.REGULAR, grass: BIOME_WEIGHT_PRESETS.VERY_RARE }, 
    tint: { class: 'tint-desert', families: ['rock'] } 
  },
  isSwamp:    { 
    weights: { bush: BIOME_WEIGHT_PRESETS.MEDIUM, fern: BIOME_WEIGHT_PRESETS.MEDIUM, grass: BIOME_WEIGHT_PRESETS.VERY_RARE, grassflower: BIOME_WEIGHT_PRESETS.OCCASIONAL, treebroken: BIOME_WEIGHT_PRESETS.RARE }, 
    tint: { class: 'tint-swamp' } 
  },
  isMountain: { weights: { rock: BIOME_WEIGHT_PRESETS.HIGH, treebroken: BIOME_WEIGHT_PRESETS.RARE, grass: BIOME_WEIGHT_PRESETS.OCCASIONAL, bush: BIOME_WEIGHT_PRESETS.OCCASIONAL } },
  isCoastal:  { weights: { rock: BIOME_WEIGHT_PRESETS.BALANCED, bush: BIOME_WEIGHT_PRESETS.COMMON, grass: BIOME_WEIGHT_PRESETS.RARE , grassflower: BIOME_WEIGHT_PRESETS.RARE} },
  isForest:   { weights: { bush: BIOME_WEIGHT_PRESETS.MODERATE, bushflower: BIOME_WEIGHT_PRESETS.OCCASIONAL, grassflower: BIOME_WEIGHT_PRESETS.VERY_RARE, grass: BIOME_WEIGHT_PRESETS.RARE, fern: BIOME_WEIGHT_PRESETS.UNCOMMON, rock: BIOME_WEIGHT_PRESETS.RARE, treebroken: BIOME_WEIGHT_PRESETS.RARE } },
};

import { MAP_BIOME_KEYS } from '@/logic/constants/encounters'

export function isBushFamily(val: string): val is BushFamily {
  return (Object.keys(BUSH_FAMILIES) as readonly string[]).includes(val); // domain-ok: Open dynamic text or non-domain string payload
}

export function getBiomeConfigForMap(locationId: MapRouteId): BiomeBushWeights {
  const map = isMapRouteId(locationId) ? MAPS_BY_ROUTE_ID[locationId] : undefined;
  let activeBiomeKey = 'isPlains';

  if (map) {
    for (const key of MAP_BIOME_KEYS) {
      if (map[key]) {
        activeBiomeKey = key;
        break;
      }
    }
  }

  const defaultWeights: BiomeBushWeights = { weights: { bush: DEFAULT_PLAINS_BUSH_WEIGHT, rock: DEFAULT_PLAINS_ROCK_WEIGHT } };
  return BIOME_BUSH_CONFIG[activeBiomeKey] ?? BIOME_BUSH_CONFIG['isPlains'] ?? defaultWeights;
}

/** Seed offset applied to front layer PRNG calculations. */
export const FRONT_LAYER_SEED_OFFSET = 1000;

/** Seed offset applied to back layer PRNG calculations. */
export const BACK_LAYER_SEED_OFFSET = 2000;

/**
 * Normaliza las propiedades de un arbusto aplicando la doble tirada de dados
 * determinista basada en sessionSeed y layer.
 */
export function resolveBushesForLayer(
  baseBushes: Array<{ id: number; cls: string; tx: number; ty: number; ad: string; ay: string }>,
  sessionSeed: number,
  layer: BushLayerDepth,
  mapId: MapRouteId
): ResolvedBushConfig[] {
  const biomeConfig = getBiomeConfigForMap(mapId);

  // 2. Iterar sobre los arbustos base y realizar la doble tirada de dados
  return baseBushes.map(b => {
    // Semilla combinada única por arbusto y capa
    const layerOffset = layer === 'front' ? FRONT_LAYER_SEED_OFFSET : BACK_LAYER_SEED_OFFSET;
    const prng = mulberry32(sessionSeed ^ (b.id * BUSH_SEED_MULTIPLIER) ^ layerOffset);

    // Tirada 1: Elegir familia dinámica según los pesos del bioma actual
    const activeWeights = biomeConfig.weights;
    const availableFamilies = Object.keys(activeWeights).filter(isBushFamily);

    let selectedFamily: BushFamily = 'bush'; // Fallback por defecto

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
      // Fallback: Elegir cualquier familia que exista en el catálogo
      const allFamilies = Object.keys(BUSH_FAMILIES).filter(isBushFamily);
      selectedFamily = allFamilies[Math.floor(prng() * allFamilies.length)] ?? 'bush';
    }

    // Tirada 2: Elegir un asset específico dentro de la familia elegida
    const assets = BUSH_FAMILIES[selectedFamily];
    const roll2 = Math.floor(prng() * assets.length);
    const assetId = assets[roll2] ?? assets[0] ?? 'grass-1';

    // Tinte aplicable según configuración del bioma y familia de la cobertura
    let tintClass = '';
    if (biomeConfig.tint) {
      const tintConf = biomeConfig.tint;
      if (!tintConf.families || tintConf.families.includes(selectedFamily)) {
        tintClass = tintConf.class;
      }
    }

    // Transformaciones aleatorias deterministas
    const scaleFactor = BUSH_BASE_SCALE + (prng() * BUSH_VAR_SCALE) + (b.id * BUSH_ID_SCALE_STEP);
    const flip = prng() < (FLIP_CHANCE_PERCENT / 100) ? -1 : 1;
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
  baseBushes: Array<{ id: number; cls: string; scale?: number; tx?: number; ty?: number; ad?: string; ay?: string }>
): ResolvedBushConfig[] {
  return resolveBushesForLayer(baseBushes as Array<{ id: number; cls: string; tx: number; ty: number; ad: string; ay: string }>, sessionSeed, layer, locationId);
}
